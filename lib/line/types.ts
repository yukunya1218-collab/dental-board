// 経営連絡ボード（LINE依頼トラッカー）で共通に使う型と定数

export type RequestStatus = "依頼済" | "受領" | "完了";

export type Verdict = "依頼" | "完了報告" | "受領" | "無関係";

export const REQUEST_STATUSES: RequestStatus[] = ["依頼済", "受領", "完了"];

/** 画面・LINE投稿用の短い表示名（DBの status 値は変えない） */
export const STATUS_LABELS: Record<RequestStatus, string> = {
  "依頼済": "返事待ち",
  "受領": "やると言った",
  "完了": "終わった",
};

/** バッジの下に出す、もう一段平易な説明 */
export const STATUS_HINTS: Record<RequestStatus, string> = {
  "依頼済": "院長からまだ返事がない",
  "受領": "了解は来た。終わったかは不明",
  "完了": "終わったと報告あり",
};

export const VERDICTS: Verdict[] = ["依頼", "完了報告", "受領", "無関係"];

/** AI分類に失敗したメッセージに立てる印 */
export const UNCLASSIFIED = "未分類";

/** 期限が明示されていない依頼が「滞留」と見なされるまでの日数（JSTの暦日で数える） */
export const STALL_DAYS = 3;

/** app_settings のキー */
export const SETTING_KEYS = {
  groupId: "line_group_id",
  requester: "role_requester",
  director: "role_director",
} as const;

export type RoleName = "副院長" | "院長";

export interface RoleAssignment {
  userId: string | null;
  name: string;
}

export interface Roles {
  requester: RoleAssignment | null;
  director: RoleAssignment | null;
}

/** AIに渡す「いま開いている依頼」の要約 */
export interface OpenRequestSummary {
  id: string;
  shortId: string;
  body: string;
  status: RequestStatus;
  deadline: string | null;
}

/** Geminiが返すJSONを正規化したもの */
export interface Classification {
  verdict: Verdict;
  targetShortId: string | null;
  deadline: string | null;
  confidence: number;
  reason: string;
}

/** パイプラインに投入するメッセージ（Webhook / 手動貼り付け 共通） */
export interface IncomingMessage {
  /** line_messages.line_message_id。手動投入は "manual:<uuid>" */
  externalId: string;
  senderId: string;
  senderName: string;
  body: string;
  receivedAt: Date;
  manual: boolean;
}

export type IngestAction =
  | "依頼を登録"
  | "受領に更新"
  | "完了に更新"
  | "変更なし"
  | "重複スキップ"
  | "分類できず";

export interface IngestResult {
  externalId: string;
  senderName: string;
  body: string;
  action: IngestAction;
  verdict: Verdict | typeof UNCLASSIFIED;
  reason: string;
  confidence: number | null;
  requestId: string | null;
  requestBody: string | null;
}

/** 貼り付けテキストの1行ごとの解析結果。読めなかった行も理由付きで返す。 */
export interface PasteLineReport {
  lineNumber: number;
  raw: string;
  status: "取り込み" | "続きとして連結" | "スキップ";
  reason: string;
}

export interface LineRequestView {
  id: string;
  body: string;
  requester: string;
  deadline: string | null;
  status: RequestStatus;
  dismissed: boolean;
  confidence: number | null;
  aiReason: string;
  enteredManually: boolean;
  createdAt: string;
  updatedAt: string;
  /** 期限切れ、または期限なしで STALL_DAYS 日以上動きがない */
  stalled: boolean;
  stalledDays: number;
  overdue: boolean;
}

export interface DigestLogView {
  id: string;
  ranAt: string;
  itemCount: number;
  messageBody: string;
  succeeded: boolean;
  lineStatusCode: number | null;
  errorDetail: string | null;
}
