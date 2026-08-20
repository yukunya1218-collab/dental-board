import { NextResponse } from "next/server";
import sql from "@/lib/db";

// 経営連絡ボード用のテーブルを作る。problems / comments と同じく、
// エンドポイントを叩けば何度でも安全に実行できる形にしてある。

const COLUMN_COMMENTS: [string, string][] = [
  ["line_requests.body", "依頼の本文（LINEの発言そのまま）"],
  ["line_requests.requester", "依頼した人の表示名"],
  ["line_requests.deadline", "期限。AIが本文から読み取った日のJST終業時刻。なければNULL"],
  ["line_requests.status", "依頼済 → 受領 → 完了 の3状態のみ。「忘れた」は自己申告できないので持たない"],
  ["line_requests.dismissed", "「これは依頼じゃない」と副院長が取り消した印"],
  ["line_requests.confidence", "AIの確度（0〜1）。低くても依頼として登録する方針"],
  ["line_requests.ai_reason", "AIがそう判定した理由。なぜ拾われたか本人が確認できるようにする"],
  ["line_requests.source_message_id", "元になった line_messages.line_message_id"],
  ["line_requests.entered_manually", "画面から手動で貼り付けて取り込んだ行かどうか"],
  ["line_messages.line_message_id", "LINEのメッセージID。Webhook再送に対する冪等キー"],
  ["line_messages.sender_id", "LINEのユーザーID。手動取り込みは manual:表示名"],
  ["line_messages.sender_name", "発言者の表示名"],
  ["line_messages.ai_verdict", "AI判定（依頼 / 完了報告 / 受領 / 無関係 / 未分類）"],
  ["line_messages.linked_request_id", "この発言が作った、または動かした依頼"],
  ["line_messages.entered_manually", "画面から手動で貼り付けて取り込んだ行かどうか"],
  ["digest_logs.ran_at", "日次投稿を試みた時刻"],
  ["digest_logs.item_count", "投稿した未完了件数"],
  ["digest_logs.message_body", "実際にLINEへ送った本文"],
  ["digest_logs.succeeded", "LINEへの送信が成功したか"],
  ["digest_logs.line_status_code", "LINE Messaging API が返したHTTPステータス"],
  ["digest_logs.error_detail", "失敗時の詳細。静かに失敗するBotを見つけるため"],
  ["app_settings.key", "設定キー（line_group_id / role_requester / role_director）"],
  ["app_settings.value", "設定値。グループIDは最初のグループイベントから実行時に保存する"],
];

export async function POST() {
  try {
    await sql`
      CREATE TABLE IF NOT EXISTS line_requests (
        id                UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
        body              TEXT         NOT NULL,
        requester         VARCHAR(100) NOT NULL,
        deadline          TIMESTAMPTZ,
        status            VARCHAR(10)  NOT NULL DEFAULT '依頼済',
        dismissed         BOOLEAN      NOT NULL DEFAULT FALSE,
        confidence        NUMERIC(3,2),
        ai_reason         TEXT         NOT NULL DEFAULT '',
        source_message_id VARCHAR(200),
        entered_manually  BOOLEAN      NOT NULL DEFAULT FALSE,
        created_at        TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
        updated_at        TIMESTAMPTZ  NOT NULL DEFAULT NOW()
      )
    `;

    await sql`
      CREATE TABLE IF NOT EXISTS line_messages (
        id                UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
        line_message_id   VARCHAR(200) NOT NULL UNIQUE,
        sender_id         VARCHAR(200) NOT NULL DEFAULT '',
        sender_name       VARCHAR(100) NOT NULL DEFAULT '',
        body              TEXT         NOT NULL DEFAULT '',
        ai_verdict        VARCHAR(20),
        linked_request_id UUID         REFERENCES line_requests(id) ON DELETE SET NULL,
        entered_manually  BOOLEAN      NOT NULL DEFAULT FALSE,
        received_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW()
      )
    `;

    await sql`
      CREATE TABLE IF NOT EXISTS digest_logs (
        id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
        ran_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        item_count       INTEGER     NOT NULL DEFAULT 0,
        message_body     TEXT        NOT NULL DEFAULT '',
        succeeded        BOOLEAN     NOT NULL DEFAULT FALSE,
        line_status_code INTEGER,
        error_detail     TEXT
      )
    `;

    await sql`
      CREATE TABLE IF NOT EXISTS app_settings (
        key        VARCHAR(100) PRIMARY KEY,
        value      TEXT         NOT NULL DEFAULT '',
        updated_at TIMESTAMPTZ  NOT NULL DEFAULT NOW()
      )
    `;

    // 先に古い形で作られていた場合でも追いつけるようにしておく
    await sql`ALTER TABLE line_requests ADD COLUMN IF NOT EXISTS entered_manually BOOLEAN NOT NULL DEFAULT FALSE`;
    await sql`ALTER TABLE line_messages ADD COLUMN IF NOT EXISTS entered_manually BOOLEAN NOT NULL DEFAULT FALSE`;

    await sql`CREATE INDEX IF NOT EXISTS line_requests_open_idx ON line_requests (dismissed, status, created_at DESC)`;
    await sql`CREATE INDEX IF NOT EXISTS digest_logs_ran_at_idx ON digest_logs (ran_at DESC)`;

    for (const [target, comment] of COLUMN_COMMENTS) {
      await sql.query(`COMMENT ON COLUMN ${target} IS '${comment.replace(/'/g, "''")}'`, []);
    }

    return NextResponse.json({ message: "経営連絡ボードのテーブルを作成しました。" });
  } catch (err) {
    console.error("[POST /api/line/seed]", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
