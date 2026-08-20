"use client";

import { useEffect, useState } from "react";
import { ChevronDown, ClipboardPaste } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { IngestResult, PasteLineReport } from "@/lib/line/types";

const SECRET_STORAGE_KEY = "line-board-secret";

const PLACEHOLDER = `副院長: 来週の面談資料、金曜までにお願い
院長: 了解
副院長: 保険の更新書類、今週中に提出して
院長: 送っておいた`;

interface ImportResponse {
  parsedCount?: number;
  lines?: PasteLineReport[];
  results?: IngestResult[];
  error?: string;
}

const ACTION_LABELS: Record<string, string> = {
  "依頼を登録": "依頼を登録",
  "受領に更新": "「やると言った」に更新",
  "完了に更新": "「終わった」に更新",
  "変更なし": "変更なし",
  "重複スキップ": "重複スキップ",
  "分類できず": "分類できず",
};

const ACTION_STYLES: Record<string, string> = {
  "依頼を登録": "bg-red-100 text-red-700 border-red-200",
  "受領に更新": "bg-yellow-100 text-yellow-700 border-yellow-200",
  "完了に更新": "bg-green-100 text-green-700 border-green-200",
  "変更なし": "bg-slate-100 text-slate-500 border-slate-200",
  "重複スキップ": "bg-slate-100 text-slate-500 border-slate-200",
  "分類できず": "bg-amber-100 text-amber-800 border-amber-300",
};

interface LineImportPanelProps {
  onImported: () => void;
}

export function LineImportPanel({ onImported }: LineImportPanelProps) {
  const [open, setOpen] = useState(false);
  const [secret, setSecret] = useState("");
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [response, setResponse] = useState<ImportResponse | null>(null);

  // sessionStorage はマウント後にしか読めないため、初期値の復元はここで行う
  useEffect(() => {
    setSecret(sessionStorage.getItem(SECRET_STORAGE_KEY) ?? "");  // eslint-disable-line react-hooks/set-state-in-effect
  }, []);

  const handleSubmit = async () => {
    if (!text.trim()) return;
    setSending(true);
    setError(null);
    setResponse(null);
    sessionStorage.setItem(SECRET_STORAGE_KEY, secret);

    try {
      const res = await fetch("/api/line/import", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-cron-secret": secret },
        body: JSON.stringify({ text }),
      });
      const data: ImportResponse = await res.json();
      if (!res.ok) {
        setError(data.error ?? "取り込みに失敗しました");
        return;
      }
      setResponse(data);
      onImported();
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (err) {
      console.error("会話の取り込みに失敗しました", err);
      setError("通信に失敗しました");
    } finally {
      setSending(false);
    }
  };

  const skipped = (response?.lines ?? []).filter((l) => l.status === "スキップ");

  return (
    <section className="rounded-xl border border-slate-200 bg-white">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center gap-2 px-4 py-3 text-left"
      >
        <ClipboardPaste className="w-4 h-4 text-slate-500 shrink-0" />
        <span className="flex-1">
          <span className="block text-sm font-semibold text-slate-900">LINEの会話を貼り付けて取り込む</span>
          <span className="block text-xs text-slate-500">
            LINEに繋がっていなくても、同じ判定ロジックで依頼を登録できます
          </span>
        </span>
        <ChevronDown className={cn("w-4 h-4 text-slate-400 transition-transform", open && "rotate-180")} />
      </button>

      {open && (
        <div className="px-4 pb-4 border-t border-slate-200 pt-3 space-y-3">
          <label className="block">
            <span className="block text-xs text-slate-500 mb-1">共有シークレット（CRON_SECRET）</span>
            <input
              type="password"
              value={secret}
              onChange={(e) => setSecret(e.target.value)}
              placeholder="環境変数に設定した文字列"
              className="w-full text-sm border border-slate-200 rounded-md px-3 py-2 bg-white"
            />
          </label>

          <label className="block">
            <span className="block text-xs text-slate-500 mb-1">
              会話（「名前: 本文」を1行ずつ。日付の見出し行（2026/08/15 など）を入れるとその日の発言として扱います）
            </span>
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              rows={8}
              placeholder={PLACEHOLDER}
              className="w-full text-sm border border-slate-200 rounded-md px-3 py-2 bg-white font-mono leading-relaxed"
            />
          </label>

          <Button
            size="lg"
            disabled={sending || !text.trim()}
            onClick={handleSubmit}
            className="bg-slate-700 hover:bg-slate-800 text-white"
          >
            {sending ? "AIが判定中..." : "取り込む"}
          </Button>

          {error && (
            <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-md px-3 py-2">{error}</p>
          )}

          {response && (
            <div className="space-y-3">
              <p className="text-xs text-slate-500">
                {response.parsedCount ?? 0}件のメッセージとして解析しました
                {skipped.length > 0 && `（読めなかった行 ${skipped.length}件）`}
              </p>

              <div className="space-y-2">
                {(response.results ?? []).map((r) => (
                  <div key={r.externalId} className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span
                        className={cn(
                          "text-xs px-2 py-0.5 rounded-full border font-medium",
                          ACTION_STYLES[r.action] ?? "bg-slate-100 text-slate-500 border-slate-200"
                        )}
                      >
                        {ACTION_LABELS[r.action] ?? r.action}
                      </span>
                      <span className="text-xs text-slate-500">AI判定: {r.verdict}</span>
                      {r.confidence !== null && (
                        <span className="text-xs text-slate-400">確度 {Math.round(r.confidence * 100)}%</span>
                      )}
                    </div>
                    <p className="text-sm text-slate-800 break-words">
                      <span className="text-slate-500">{r.senderName}：</span>
                      {r.body}
                    </p>
                    {r.reason && <p className="mt-1 text-xs text-slate-600">理由: {r.reason}</p>}
                    {r.requestBody && (
                      <p className="mt-1 text-xs text-slate-500 break-words">対象の依頼: {r.requestBody}</p>
                    )}
                  </div>
                ))}
              </div>

              {skipped.length > 0 && (
                <div className="rounded-lg border border-slate-200 bg-white p-3">
                  <p className="text-xs font-semibold text-slate-500 mb-1">読めなかった行</p>
                  <ul className="space-y-0.5">
                    {skipped.map((l) => (
                      <li key={l.lineNumber} className="text-xs text-slate-500 break-words">
                        {l.lineNumber}行目: {l.raw}（{l.reason}）
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </section>
  );
}
