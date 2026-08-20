import crypto from "node:crypto";

/** 長さが違うと timingSafeEqual が例外を投げるので、先に長さを見る */
export function safeEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a, "utf8");
  const bufB = Buffer.from(b, "utf8");
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}

export interface GateResult {
  ok: boolean;
  status: number;
  error: string;
}

/**
 * 共有シークレットによる簡易ゲート。
 * 日次投稿は本物のLINEメッセージを送り、手動取り込みは本番と同じテーブルに書くので、
 * どちらも同じ x-cron-secret ヘッダで守る。
 */
export function verifySharedSecret(request: Request): GateResult {
  const expected = process.env.CRON_SECRET;
  if (!expected) {
    return { ok: false, status: 500, error: "CRON_SECRET が設定されていません" };
  }
  const provided = request.headers.get("x-cron-secret") ?? "";
  if (!provided || !safeEqual(provided, expected)) {
    return { ok: false, status: 401, error: "認証に失敗しました" };
  }
  return { ok: true, status: 200, error: "" };
}
