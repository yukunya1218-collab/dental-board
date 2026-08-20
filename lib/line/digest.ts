import sql from "@/lib/db";
import type { PushOutcome } from "@/lib/line/messaging";
import { formatJstDateTime, formatJstMonthDay } from "@/lib/line/time";
import { STATUS_LABELS } from "@/lib/line/types";
import type { LineRequestView } from "@/lib/line/types";

const SEPARATOR = "━━━━━━━━━━━━━━━";

/** LINEの狭い画面向け。句読点優先で折り返し、1行を短く保つ */
function wrapBody(body: string, maxChars = 18): string[] {
  const flat = body.replace(/\s+/g, " ").trim();
  if (!flat) return ["（内容なし）"];

  const chunks: string[] = [];
  let rest = flat;

  while (rest.length > maxChars) {
    const window = rest.slice(0, maxChars + 1);
    const breakAt = Math.max(
      window.lastIndexOf("、"),
      window.lastIndexOf("。"),
      window.lastIndexOf("！"),
      window.lastIndexOf("？"),
      window.lastIndexOf("・"),
      window.lastIndexOf(" "),
      window.lastIndexOf("　")
    );
    const cut = breakAt >= Math.floor(maxChars * 0.4) ? breakAt + 1 : maxChars;
    chunks.push(rest.slice(0, cut).trimEnd());
    rest = rest.slice(cut).trimStart();
  }
  if (rest) chunks.push(rest);
  return chunks;
}

function alertLine(item: LineRequestView): string | null {
  if (item.overdue && item.deadline) {
    return `⚠ 期限切れ（${formatJstMonthDay(new Date(item.deadline))}）`;
  }
  if (item.stalled) {
    return `⚠ ${item.stalledDays}日動きなし`;
  }
  return null;
}

/** スマホで一目で拾える体裁。1件ごとに空行を入れ、情報は1行1つにする。 */
export function formatDigest(items: LineRequestView[], now: Date): string {
  const stamp = formatJstDateTime(now);

  if (items.length === 0) {
    return [
      "✅ 未完了の依頼はありません",
      `（${stamp}）`,
      "",
      "今日はおつかれさまでした。",
    ].join("\n");
  }

  const stalledCount = items.filter((i) => i.stalled || i.overdue).length;
  const lines: string[] = [
    `📋 未完了の依頼 ${items.length}件`,
    `（${stamp}）`,
    SEPARATOR,
  ];

  items.forEach((item, index) => {
    lines.push("");
    lines.push(`【${index + 1}】`);

    const alert = alertLine(item);
    if (alert) lines.push(alert);

    for (const chunk of wrapBody(item.body)) {
      lines.push(chunk);
    }

    lines.push("");
    lines.push(`状態：${STATUS_LABELS[item.status]}`);
    lines.push(
      item.deadline
        ? `期限：${formatJstMonthDay(new Date(item.deadline))}`
        : "期限：なし"
    );
    lines.push(`依頼：${item.requester}`);
  });

  lines.push("");
  lines.push(SEPARATOR);
  if (stalledCount > 0) {
    lines.push(`⚠ がついた ${stalledCount}件 は止まっています`);
    lines.push("");
  }
  lines.push("終わったものは");
  lines.push("「◯◯終わった」と返信してください");

  return lines.join("\n");
}

/** 成功でも失敗でも必ず記録する。静かに失敗するBotは「依頼がなかった」と見分けが付かない。 */
export async function recordDigestLog(params: {
  itemCount: number;
  messageBody: string;
  outcome: PushOutcome;
  ranAt: Date;
}): Promise<void> {
  await sql`
    INSERT INTO digest_logs (
      ran_at, item_count, message_body, succeeded, line_status_code, error_detail
    ) VALUES (
      ${params.ranAt.toISOString()},
      ${params.itemCount},
      ${params.messageBody},
      ${params.outcome.succeeded},
      ${params.outcome.statusCode},
      ${params.outcome.errorDetail}
    )
  `;
}
