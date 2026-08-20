import sql from "@/lib/db";
import { jstDayDiff } from "@/lib/line/time";
import {
  STALL_DAYS,
  type DigestLogView,
  type LineRequestView,
  type OpenRequestSummary,
  type RequestStatus,
} from "@/lib/line/types";

interface RequestRow {
  id: string;
  body: string;
  requester: string;
  deadline: Date | string | null;
  status: RequestStatus;
  dismissed: boolean;
  confidence: number | null;
  aiReason: string | null;
  enteredManually: boolean;
  createdAt: Date | string;
  updatedAt: Date | string;
}

/**
 * ドライバは TIMESTAMPTZ を Date で返すことがあるので、境界でISO文字列に揃える。
 * ここを揃えないと並べ替えの localeCompare が実行時に落ちる。
 */
function toIso(value: Date | string | null | undefined): string | null {
  if (value === null || value === undefined) return null;
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value.toISOString();
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
}

const SELECT_COLUMNS = `
  id,
  body,
  requester,
  deadline,
  status,
  dismissed,
  confidence::float8   AS "confidence",
  ai_reason            AS "aiReason",
  entered_manually     AS "enteredManually",
  created_at           AS "createdAt",
  updated_at           AS "updatedAt"
`;

/**
 * 「滞留」の判定。期限切れか、期限がないまま JST の暦日で STALL_DAYS 日以上動いていないもの。
 * 「忘れられた」という状態は本人が自己申告できないので持たず、経過時間だけから導く。
 */
export function evaluateStall(
  row: { status: RequestStatus; deadline: string | null; updatedAt: string },
  now: Date
): { stalled: boolean; stalledDays: number; overdue: boolean } {
  if (row.status === "完了") return { stalled: false, stalledDays: 0, overdue: false };

  const days = jstDayDiff(new Date(row.updatedAt), now);
  const overdue = row.deadline ? new Date(row.deadline).getTime() < now.getTime() : false;
  const idle = !row.deadline && days >= STALL_DAYS;

  return { stalled: overdue || idle, stalledDays: Math.max(days, 0), overdue };
}

function toView(row: RequestRow, now: Date): LineRequestView {
  const createdAt = toIso(row.createdAt) ?? new Date(0).toISOString();
  const updatedAt = toIso(row.updatedAt) ?? createdAt;
  const deadline = toIso(row.deadline);

  return {
    id: row.id,
    body: row.body,
    requester: row.requester,
    deadline,
    status: row.status,
    dismissed: row.dismissed,
    confidence: row.confidence,
    aiReason: row.aiReason ?? "",
    enteredManually: row.enteredManually,
    createdAt,
    updatedAt,
    ...evaluateStall({ status: row.status, deadline, updatedAt }, now),
  };
}

/** 滞留を先頭に、次に期限が近い順、最後に登録が新しい順 */
function sortForDisplay(a: LineRequestView, b: LineRequestView): number {
  if (a.stalled !== b.stalled) return a.stalled ? -1 : 1;
  if (a.deadline && b.deadline) return a.deadline.localeCompare(b.deadline);
  if (a.deadline) return -1;
  if (b.deadline) return 1;
  return b.createdAt.localeCompare(a.createdAt);
}

export async function fetchAllRequestViews(now: Date): Promise<LineRequestView[]> {
  const rows = (await sql.query(
    `SELECT ${SELECT_COLUMNS} FROM line_requests ORDER BY created_at DESC`,
    []
  )) as unknown as RequestRow[];

  const open = rows.filter((r) => !r.dismissed && r.status !== "完了").map((r) => toView(r, now));
  const rest = rows.filter((r) => r.dismissed || r.status === "完了").map((r) => toView(r, now));
  open.sort(sortForDisplay);
  return [...open, ...rest];
}

/** 日次投稿に載せる対象：完了でも除外済みでもないもの。滞留が先頭。 */
export async function fetchOutstandingRequestViews(now: Date): Promise<LineRequestView[]> {
  const rows = (await sql.query(
    `SELECT ${SELECT_COLUMNS} FROM line_requests
     WHERE dismissed = FALSE AND status <> '完了'
     ORDER BY created_at DESC`,
    []
  )) as unknown as RequestRow[];

  return rows.map((r) => toView(r, now)).sort(sortForDisplay);
}

/** AIに渡す一覧。IDは書き写しやすいよう先頭8文字に短縮する。 */
export async function fetchOpenRequestSummaries(limit = 30): Promise<OpenRequestSummary[]> {
  const rows = await sql`
    SELECT id, body, status, deadline
    FROM line_requests
    WHERE dismissed = FALSE AND status <> '完了'
    ORDER BY created_at DESC
    LIMIT ${limit}
  `;

  return rows.map((r) => ({
    id: r.id as string,
    shortId: (r.id as string).slice(0, 8),
    body: r.body as string,
    status: r.status as RequestStatus,
    deadline: toIso(r.deadline as Date | string | null),
  }));
}

/** AIが返したIDを開いている依頼に突き合わせる（短縮ID・完全UUIDの両方を許容） */
export function resolveTarget(
  shortId: string | null,
  openRequests: OpenRequestSummary[]
): OpenRequestSummary | null {
  if (!shortId) return null;
  const needle = shortId.trim().toLowerCase();
  if (!needle) return null;
  return (
    openRequests.find((r) => r.id.toLowerCase() === needle) ??
    openRequests.find((r) => r.shortId.toLowerCase() === needle) ??
    openRequests.find((r) => needle.length >= 4 && r.id.toLowerCase().startsWith(needle)) ??
    null
  );
}

export async function fetchDigestLogs(limit = 10): Promise<DigestLogView[]> {
  const rows = await sql`
    SELECT
      id,
      ran_at           AS "ranAt",
      item_count       AS "itemCount",
      message_body     AS "messageBody",
      succeeded,
      line_status_code AS "lineStatusCode",
      error_detail     AS "errorDetail"
    FROM digest_logs
    ORDER BY ran_at DESC
    LIMIT ${limit}
  `;

  return rows.map((r) => ({
    id: r.id as string,
    ranAt: toIso(r.ranAt as Date | string) ?? new Date(0).toISOString(),
    itemCount: Number(r.itemCount ?? 0),
    messageBody: (r.messageBody as string) ?? "",
    succeeded: Boolean(r.succeeded),
    lineStatusCode: r.lineStatusCode === null ? null : Number(r.lineStatusCode),
    errorDetail: (r.errorDetail as string | null) ?? null,
  }));
}
