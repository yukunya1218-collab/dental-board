import type { OpenRequestSummary, RoleName } from "@/lib/line/types";
import { STATUS_LABELS } from "@/lib/line/types";
import { jstDateKey, jstTodayLabel } from "@/lib/line/time";

// ここはロジックを含まないプロンプト置き場です。
// 文言だけを直せばAIの振る舞いを調整できます（コードは触らなくて大丈夫です）。
export const CLASSIFY_PROMPT_TEMPLATE = `あなたは歯科医院の「経営連絡」LINEグループを見ているアシスタントです。
このグループには副院長（依頼する側）と院長（依頼を受ける側）だけがいます。
副院長の頭の中から「まだ終わっていない依頼」を追い出すことが目的です。

## 今日の日付
{{TODAY}}（JST）

## 登場人物
{{ROLES}}

## いま開いている依頼
{{OPEN_REQUESTS}}

## 判定するメッセージ
発言者: {{SENDER}}
本文:
"""
{{BODY}}
"""

## 判定のしかた

「種別」を次の4つから1つ選んでください。

- 依頼 … 副院長が院長に何かをしてほしいと伝えているもの。お願い、確認依頼、「〜しておいて」「〜見てもらえる?」「〜どうなってる?」などを含む。
- 受領 … 院長が依頼に反応したが、終わったとは言っていないもの。「了解」「わかった」「あとでやる」「見てみる」など。
- 完了報告 … 院長が依頼を終えたと言っているもの。「送っておいた」「電話した」「終わった」「済んでる」など。
- 無関係 … 上のどれでもない雑談・共有・スタンプ・あいさつなど。

### もっとも重要な指示：迷ったら「依頼」にしてください

依頼を取りこぼすと、副院長の頭の中に「まだ覚えておかなければいけないこと」が戻ってしまいます。
これがこの仕組みで解こうとしている問題そのものです。
一方、依頼でないものを拾ってしまっても、副院長が1タップで消すだけです。コストは比べものになりません。

したがって **再現率（取りこぼさないこと）を精度より優先** してください。
副院長の発言が依頼かどうか自信がないときは、確度を低くしたうえで「依頼」と判定してください。
はっきり雑談・報告・感想だと言えるときにだけ「無関係」にしてください。

### 対象依頼ID

「受領」「完了報告」の場合、上の一覧のどれを指しているかを「対象依頼ID」に入れてください。
一覧のIDをそのまま書き写してください。
複数あるときは、**直前の会話の流れからいちばん新しい依頼**を優先してください。
どうしても分からないときだけ null にしてください（null の場合は、システムがいちばん新しい未完了に当てはめます）。
「依頼」「無関係」の場合は null にしてください。

### 期限

本文に期限の手がかりがあれば「期限」に YYYY-MM-DD 形式で入れてください（今日の日付から計算する）。
例: 「今日中に」→ 今日、「明日の朝までに」→ 明日、「週明けまでに」→ 次の月曜、「今週中に」→ 今週の金曜。
期限に触れていなければ null にしてください。勝手に期限を作らないでください。

## 出力形式

次のキーだけを持つJSONオブジェクトを1つだけ出力してください。前後に説明文やコードフェンスを付けないでください。

{
  "種別": "依頼" | "完了報告" | "受領" | "無関係",
  "対象依頼ID": "一覧のID" または null,
  "期限": "YYYY-MM-DD" または null,
  "確度": 0.0〜1.0 の数値,
  "理由": "そう判断した理由を日本語1文で"
}
`;

function renderRoles(
  senderRole: RoleName | null,
  requesterName: string | null,
  directorName: string | null
): string {
  const lines: string[] = [];
  lines.push(requesterName ? `- 副院長（依頼する側）: ${requesterName}` : "- 副院長（依頼する側）: 未確定");
  lines.push(directorName ? `- 院長（依頼を受ける側）: ${directorName}` : "- 院長（依頼を受ける側）: 未確定");
  if (senderRole) {
    lines.push(`- このメッセージの発言者は「${senderRole}」です。`);
  } else {
    lines.push(
      "- このメッセージの発言者の役割はまだ確定していません。表示名と本文の内容から、依頼する側か受ける側かを推測してください。"
    );
  }
  return lines.join("\n");
}

function renderOpenRequests(openRequests: OpenRequestSummary[]): string {
  if (openRequests.length === 0) return "（いまは開いている依頼はありません）";
  return openRequests
    .map((r) => {
      const deadline = r.deadline ? jstDateKey(new Date(r.deadline)) : "期限なし";
      return `- ID: ${r.shortId} / 状態: ${STATUS_LABELS[r.status]} / 期限: ${deadline} / 内容: ${r.body.replace(/\s+/g, " ").slice(0, 120)}`;
    })
    .join("\n");
}

export interface PromptInput {
  body: string;
  senderName: string;
  senderRole: RoleName | null;
  requesterName: string | null;
  directorName: string | null;
  openRequests: OpenRequestSummary[];
  now: Date;
}

export function buildClassifyPrompt(input: PromptInput): string {
  return CLASSIFY_PROMPT_TEMPLATE.replace("{{TODAY}}", jstTodayLabel(input.now))
    .replace("{{ROLES}}", renderRoles(input.senderRole, input.requesterName, input.directorName))
    .replace("{{OPEN_REQUESTS}}", renderOpenRequests(input.openRequests))
    .replace("{{SENDER}}", `${input.senderName}${input.senderRole ? `（${input.senderRole}）` : ""}`)
    .replace("{{BODY}}", input.body);
}
