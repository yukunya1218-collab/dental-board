import { randomUUID } from "node:crypto";
import type { IncomingMessage, PasteLineReport } from "@/lib/line/types";
import { jstDateKey, jstStartOfDay } from "@/lib/line/time";

// LINEからコピーした本文は書式がばらばら（時刻・日付見出し・空行・スタンプの代替文字）なので、
// 読めた行だけ拾って、読めなかった行は理由付きで報告する。バッチ全体を落とさない。

export interface PasteParseResult {
  messages: IncomingMessage[];
  lines: PasteLineReport[];
}

const DATE_HEADER = /^(\d{4})[/\-.](\d{1,2})[/\-.](\d{1,2})/;
const JP_DATE_HEADER = /^(\d{1,2})月(\d{1,2})日/;
const TIME_PREFIXED = /^(\d{1,2}):(\d{2})[\t\s]+(.+)$/;
const COLON_FORM = /^([^\s:：]{1,20})\s*[:：]\s*(.+)$/;
const TAB_FORM = /^([^\t]{1,20})\t+(.+)$/;

/**
 * 画像・スタンプの代替文字。本文から取り除くだけにする。
 * 行ごと捨ててしまうと「[写真] これ確認して」のような依頼を落としてしまう。
 */
const MEDIA_TOKENS = [
  "[写真]",
  "[画像]",
  "[動画]",
  "[スタンプ]",
  "[ファイル]",
  "[アルバム]",
  "[ボイスメッセージ]",
  "[連絡先]",
  "[位置情報]",
  "[LINE]",
  "写真を送信しました",
];

/** 本文のないシステム表示。これで始まる行は捨てる。 */
const SYSTEM_NOTICES = [
  "メッセージの送信を取り消しました",
  "通話時間",
  "不在着信",
  "通話をキャンセルしました",
  "が参加しました",
  "が退出しました",
];

/** 名前と間違えやすい短い返事。名前候補から除く。 */
const NOT_NAMES = new Set([
  "了解",
  "りょうかい",
  "了解です",
  "わかった",
  "わかりました",
  "承知",
  "はい",
  "うん",
  "ok",
  "OK",
  "完了",
  "ありがとう",
  "ありがと",
  "おはよう",
  "おつかれ",
  "おつかれさま",
  "すみません",
  "ごめん",
]);

/** 代替文字を落として本文だけ残す。何も残らなければ空文字。 */
function cleanBody(text: string): string {
  let out = text;
  for (const token of MEDIA_TOKENS) out = out.split(token).join(" ");
  out = out.replace(/\s+/g, " ").trim();
  if (SYSTEM_NOTICES.some((n) => out.includes(n))) return "";
  return out;
}

function looksLikeNameCandidate(line: string): boolean {
  if (line.length === 0 || line.length > 12) return false;
  if (/\s/.test(line)) return false;
  if (NOT_NAMES.has(line)) return false;
  if (/[。、！？!?…～]$/.test(line)) return false;
  if (/^\d/.test(line)) return false;
  if (cleanBody(line) === "") return false;
  return true;
}

interface Draft {
  senderName: string;
  bodyLines: string[];
  receivedAt: Date;
  /** コロン形式は1行1メッセージなので、後続行を続きとして連結しない */
  allowContinuation: boolean;
}

function splitNameAndBody(rest: string): { name: string; body: string } | null {
  const tabbed = rest.split("\t").filter((s) => s.length > 0);
  if (tabbed.length >= 2) {
    return { name: tabbed[0].trim(), body: tabbed.slice(1).join(" ").trim() };
  }
  const spaced = /^(\S{1,20})\s+(.+)$/.exec(rest);
  if (spaced) return { name: spaced[1].trim(), body: spaced[2].trim() };
  return null;
}

/** 区切り文字のある行から表示名を集める。名前だけの行を安定して見分けるための下準備。 */
function collectNames(rawLines: string[], knownNames: string[]): Set<string> {
  const names = new Set(knownNames.filter((n) => n));
  const standaloneCounts = new Map<string, number>();

  for (const raw of rawLines) {
    const line = raw.trim();
    if (!line) continue;

    const timed = TIME_PREFIXED.exec(line);
    const rest = timed ? timed[3].trim() : line;

    if (timed) {
      const split = splitNameAndBody(rest);
      if (split) {
        names.add(split.name);
        continue;
      }
    }
    const colon = COLON_FORM.exec(rest);
    if (colon) {
      names.add(colon[1].trim());
      continue;
    }
    const tab = TAB_FORM.exec(rest);
    if (tab) {
      names.add(tab[1].trim());
      continue;
    }
    if (looksLikeNameCandidate(line)) {
      standaloneCounts.set(line, (standaloneCounts.get(line) ?? 0) + 1);
    }
  }

  // 区切り文字なしの「名前だけの行 → 本文」形式。2回以上出てくる短い行を名前と見なす。
  for (const [candidate, count] of standaloneCounts) {
    if (count >= 2) names.add(candidate);
  }

  return names;
}

/**
 * 貼り付けテキストを解析する。knownNames には app_settings に学習済みの表示名を渡す。
 * 送信者IDが取れないので、役割は表示名で引き当てる。
 */
export function parsePastedConversation(text: string, knownNames: string[] = []): PasteParseResult {
  const rawLines = text.replace(/\r\n?/g, "\n").split("\n");
  const names = collectNames(rawLines, knownNames);

  const lines: PasteLineReport[] = [];
  const drafts: Draft[] = [];
  let currentDateKey = jstDateKey(new Date());

  const timestampFor = (hh?: string, mm?: string): Date => {
    const base = jstStartOfDay(currentDateKey) ?? new Date();
    if (hh === undefined || mm === undefined) return base;
    return new Date(base.getTime() + (Number(hh) * 60 + Number(mm)) * 60000);
  };

  for (let index = 0; index < rawLines.length; index++) {
    const lineNumber = index + 1;
    const line = rawLines[index].trim();
    const current: Draft | undefined = drafts[drafts.length - 1];

    if (!line) continue; // 空行は報告しない（数が多くて読みづらいだけ）

    const dateHeader = DATE_HEADER.exec(line);
    if (dateHeader && line.replace(DATE_HEADER, "").trim().length <= 4) {
      currentDateKey = `${dateHeader[1]}-${dateHeader[2].padStart(2, "0")}-${dateHeader[3].padStart(2, "0")}`;
      lines.push({ lineNumber, raw: line, status: "スキップ", reason: `日付の見出し（${currentDateKey}）` });
      continue;
    }

    const jpDate = JP_DATE_HEADER.exec(line);
    if (jpDate && line.length <= 12) {
      currentDateKey = `${currentDateKey.slice(0, 4)}-${jpDate[1].padStart(2, "0")}-${jpDate[2].padStart(2, "0")}`;
      lines.push({ lineNumber, raw: line, status: "スキップ", reason: `日付の見出し（${currentDateKey}）` });
      continue;
    }

    const timed = TIME_PREFIXED.exec(line);
    const rest = timed ? timed[3].trim() : line;
    const at = timestampFor(timed?.[1], timed?.[2]);

    const mediaOnly = () =>
      lines.push({ lineNumber, raw: line, status: "スキップ" as const, reason: "画像・スタンプなど本文のない行" });

    const start = (name: string, rawBody: string, allowContinuation: boolean): boolean => {
      const body = cleanBody(rawBody);
      if (!body) {
        mediaOnly();
        return true;
      }
      drafts.push({ senderName: name, bodyLines: [body], receivedAt: at, allowContinuation });
      lines.push({ lineNumber, raw: line, status: "取り込み", reason: `${name} の発言として解析` });
      return true;
    };

    if (timed) {
      const split = splitNameAndBody(rest);
      if (split && split.body) {
        start(split.name, split.body, true);
        continue;
      }
    }

    const colon = COLON_FORM.exec(rest);
    if (colon && names.has(colon[1].trim())) {
      start(colon[1].trim(), colon[2], false);
      continue;
    }

    const tab = TAB_FORM.exec(rest);
    if (tab && names.has(tab[1].trim())) {
      start(tab[1].trim(), tab[2], false);
      continue;
    }

    if (names.has(rest)) {
      drafts.push({ senderName: rest, bodyLines: [], receivedAt: at, allowContinuation: true });
      lines.push({ lineNumber, raw: line, status: "取り込み", reason: `${rest} の発言の始まりとして解析` });
      continue;
    }

    const continued = cleanBody(rest);
    if (!continued) {
      mediaOnly();
      continue;
    }

    if (current && current.allowContinuation) {
      current.bodyLines.push(continued);
      lines.push({ lineNumber, raw: line, status: "続きとして連結", reason: `${current.senderName} の発言の続き` });
      continue;
    }

    lines.push({
      lineNumber,
      raw: line,
      status: "スキップ",
      reason: "発言者が判定できませんでした（「名前: 本文」の形にすると読めます）",
    });
  }

  const messages: IncomingMessage[] = drafts
    .map((d) => ({ draft: d, body: d.bodyLines.join("\n").trim() }))
    .filter((d) => d.body.length > 0)
    .map(({ draft, body }) => ({
      externalId: `manual:${randomUUID()}`,
      senderId: `manual:${draft.senderName}`,
      senderName: draft.senderName,
      body,
      receivedAt: draft.receivedAt,
      manual: true,
    }));

  return { messages, lines };
}
