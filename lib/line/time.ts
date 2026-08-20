// JST（UTC+9）固定の日付ユーティリティ。
// 日次投稿・滞留判定は必ず JST の暦日で数えるため、サーバのTZに依存しないよう
// UTCミリ秒に +9時間してから文字列化する方式で統一している。

const JST_OFFSET_MS = 9 * 60 * 60 * 1000;

/** その瞬間が JST で何月何日か（"YYYY-MM-DD"） */
export function jstDateKey(d: Date): string {
  return new Date(d.getTime() + JST_OFFSET_MS).toISOString().slice(0, 10);
}

/** JSTの暦日で from → to が何日進んだか */
export function jstDayDiff(from: Date, to: Date): number {
  const a = Date.parse(`${jstDateKey(from)}T00:00:00Z`);
  const b = Date.parse(`${jstDateKey(to)}T00:00:00Z`);
  return Math.round((b - a) / 86400000);
}

/** "YYYY-MM-DD" を JST のその日の終わり（23:59:59+09:00）として解釈する */
export function jstEndOfDay(dateKey: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateKey.trim());
  if (!m) return null;
  const d = new Date(`${m[1]}-${m[2]}-${m[3]}T23:59:59+09:00`);
  return Number.isNaN(d.getTime()) ? null : d;
}

/** "YYYY-MM-DD" を JST のその日の始まり（00:00:00+09:00）として解釈する */
export function jstStartOfDay(dateKey: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateKey.trim());
  if (!m) return null;
  const d = new Date(`${m[1]}-${m[2]}-${m[3]}T00:00:00+09:00`);
  return Number.isNaN(d.getTime()) ? null : d;
}

/** LINEに出す短い日付表記（"8/20"） */
export function formatJstMonthDay(d: Date): string {
  const key = jstDateKey(d);
  return `${Number(key.slice(5, 7))}/${Number(key.slice(8, 10))}`;
}

/** LINEに出す日時表記（"8/20 21:30"） */
export function formatJstDateTime(d: Date): string {
  const shifted = new Date(d.getTime() + JST_OFFSET_MS);
  const hh = String(shifted.getUTCHours()).padStart(2, "0");
  const mm = String(shifted.getUTCMinutes()).padStart(2, "0");
  return `${formatJstMonthDay(d)} ${hh}:${mm}`;
}

const WEEKDAYS = ["日", "月", "火", "水", "木", "金", "土"];

/** プロンプトに渡す今日の日付（"2026-08-20（木）"） */
export function jstTodayLabel(d: Date): string {
  const key = jstDateKey(d);
  const weekday = WEEKDAYS[new Date(`${key}T00:00:00Z`).getUTCDay()];
  return `${key}（${weekday}）`;
}
