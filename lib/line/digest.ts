import sql from "@/lib/db";
import type { PushOutcome } from "@/lib/line/messaging";
import { formatJstDateTime, formatJstMonthDay } from "@/lib/line/time";
import type { LineRequestView } from "@/lib/line/types";

const SEPARATOR = "━━━━━━━━━━━━━━━";

function oneLine(body: string, max = 60): string {
  const flat = body.replace(/\s+/g, " ").trim();
  return flat.length > max ? `${flat.slice(0, max)}…` : flat;
}

function mark(item: LineRequestView): string {
  if (item.overdue && item.deadline) return `⚠ 期限切れ(${formatJstMonthDay(new Date(item.deadline))}) `;
  if (item.stalled) return `⚠ ${item.stalledDays}日動きなし `;
  return "";
}

function detailLine(item: LineRequestView): string {
  const deadline = item.deadline ? `期限 ${formatJstMonthDay(new Date(item.deadline))}` : "期限なし";
  return `   ${item.status} / ${deadline} / ${item.requester}`;
}

/** スマホで読める体裁に。何もないときも「Botは生きている」と分かる1行を返す。 */
export function formatDigest(items: LineRequestView[], now: Date): string {
  const stamp = formatJstDateTime(now);

  if (items.length === 0) {
    return [`✅ 未完了の依頼はありません。（${stamp}）`, "今日はおつかれさまでした。"].join("\n");
  }

  const stalledCount = items.filter((i) => i.stalled).length;
  const lines = [`📋 未完了の依頼 ${items.length}件（${stamp}）`, SEPARATOR];

  items.forEach((item, index) => {
    lines.push(`${index + 1}. ${mark(item)}${oneLine(item.body)}`);
    lines.push(detailLine(item));
  });

  lines.push(SEPARATOR);
  if (stalledCount > 0) {
    lines.push(`⚠ のついた ${stalledCount}件 は止まっています。`);
  }
  lines.push("終わったものはこのトークで「◯◯終わった」と返信してください。");

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
