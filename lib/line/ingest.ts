import sql from "@/lib/db";
import { classifyWithGemini } from "@/lib/line/gemini";
import { buildClassifyPrompt } from "@/lib/line/prompt";
import { fetchOpenRequestSummaries, resolveTarget } from "@/lib/line/requests";
import { learnRole, loadRoles, roleOf } from "@/lib/line/settings";
import { jstEndOfDay } from "@/lib/line/time";
import {
  UNCLASSIFIED,
  type Classification,
  type IncomingMessage,
  type IngestAction,
  type IngestResult,
  type OpenRequestSummary,
} from "@/lib/line/types";

// Webhook と 手動貼り付け の両方がこの1本を通る。
// 判定と状態遷移のルールを2箇所に分けて書かないためのモジュール。

/** line_messages に先に行を作って冪等性を確保する。既にあれば false（LINEの再送） */
async function claimMessage(msg: IncomingMessage): Promise<string | null> {
  const rows = await sql`
    INSERT INTO line_messages (
      line_message_id, sender_id, sender_name, body, entered_manually, received_at
    ) VALUES (
      ${msg.externalId},
      ${msg.senderId},
      ${msg.senderName},
      ${msg.body},
      ${msg.manual},
      ${msg.receivedAt.toISOString()}
    )
    ON CONFLICT (line_message_id) DO NOTHING
    RETURNING id
  `;
  return rows.length > 0 ? (rows[0].id as string) : null;
}

async function finishMessage(
  messageRowId: string,
  verdict: string,
  linkedRequestId: string | null
): Promise<void> {
  await sql`
    UPDATE line_messages
    SET ai_verdict = ${verdict}, linked_request_id = ${linkedRequestId}
    WHERE id = ${messageRowId}
  `;
}

async function insertRequest(
  msg: IncomingMessage,
  classification: Classification
): Promise<{ id: string; body: string }> {
  const deadline = classification.deadline ? jstEndOfDay(classification.deadline) : null;
  const [row] = await sql`
    INSERT INTO line_requests (
      body, requester, deadline, status, confidence, ai_reason,
      source_message_id, entered_manually, created_at, updated_at
    ) VALUES (
      ${msg.body},
      ${msg.senderName},
      ${deadline ? deadline.toISOString() : null},
      '依頼済',
      ${classification.confidence},
      ${classification.reason},
      ${msg.externalId},
      ${msg.manual},
      ${msg.receivedAt.toISOString()},
      ${msg.receivedAt.toISOString()}
    )
    RETURNING id, body
  `;
  return { id: row.id as string, body: row.body as string };
}

async function moveStatus(id: string, status: "受領" | "完了", at: Date): Promise<void> {
  await sql`
    UPDATE line_requests
    SET status = ${status}, updated_at = ${at.toISOString()}
    WHERE id = ${id}
  `;
}

/**
 * AIが対象IDを返さないときの推測。
 * LINEは時系列なので、直前の依頼を指していることが多い。
 * 完了報告は誤って消すと元の問題に戻るので、いちばん新しい未完了を選ぶ。
 */
function fallbackTarget(
  classification: Classification,
  openRequests: OpenRequestSummary[]
): OpenRequestSummary | null {
  if (openRequests.length === 0) return null;

  if (classification.verdict === "受領") {
    return openRequests.find((r) => r.status === "依頼済") ?? null;
  }
  if (classification.verdict === "完了報告") {
    return openRequests[0] ?? null;
  }
  return null;
}

export async function ingestMessage(msg: IncomingMessage): Promise<IngestResult> {
  const base = { externalId: msg.externalId, senderName: msg.senderName, body: msg.body };

  const messageRowId = await claimMessage(msg);
  if (!messageRowId) {
    return {
      ...base,
      action: "重複スキップ" as IngestAction,
      verdict: UNCLASSIFIED,
      reason: "同じメッセージIDが既に処理済みです",
      confidence: null,
      requestId: null,
      requestBody: null,
    };
  }

  const [openRequests, roles] = await Promise.all([fetchOpenRequestSummaries(), loadRoles()]);
  const senderRole = roleOf(msg.senderId, msg.senderName, roles);

  const prompt = buildClassifyPrompt({
    body: msg.body,
    senderName: msg.senderName,
    senderRole,
    requesterName: roles.requester?.name ?? null,
    directorName: roles.director?.name ?? null,
    openRequests,
    now: msg.receivedAt,
  });

  const outcome = await classifyWithGemini(prompt);
  if (!outcome.classification) {
    const reason = `AI分類に失敗: ${outcome.error ?? "原因不明"}`;
    console.error("[ingest]", reason, msg.externalId);
    await finishMessage(messageRowId, UNCLASSIFIED, null);
    return {
      ...base,
      action: "分類できず",
      verdict: UNCLASSIFIED,
      reason,
      confidence: null,
      requestId: null,
      requestBody: null,
    };
  }

  const classification = outcome.classification;
  let action: IngestAction = "変更なし";
  let requestId: string | null = null;
  let requestBody: string | null = null;

  if (classification.verdict === "依頼") {
    const created = await insertRequest(msg, classification);
    requestId = created.id;
    requestBody = created.body;
    action = "依頼を登録";
    await learnRole("副院長", msg.senderId, msg.senderName, roles);
  } else if (classification.verdict === "受領" || classification.verdict === "完了報告") {
    const target =
      resolveTarget(classification.targetShortId, openRequests) ??
      fallbackTarget(classification, openRequests);

    if (target) {
      const next = classification.verdict === "完了報告" ? "完了" : "受領";
      // 受領は前に進めるときだけ。完了済みを受領に戻さない。
      if (next === "完了" || target.status === "依頼済") {
        await moveStatus(target.id, next, msg.receivedAt);
        action = next === "完了" ? "完了に更新" : "受領に更新";
      }
      requestId = target.id;
      requestBody = target.body;
    }
    await learnRole("院長", msg.senderId, msg.senderName, roles);
  }

  await finishMessage(messageRowId, classification.verdict, requestId);

  return {
    ...base,
    action,
    verdict: classification.verdict,
    reason: classification.reason,
    confidence: classification.confidence,
    requestId,
    requestBody,
  };
}

/** 会話は順番に意味があるので必ず直列に流す */
export async function ingestMessages(messages: IncomingMessage[]): Promise<IngestResult[]> {
  const results: IngestResult[] = [];
  for (const msg of messages) {
    try {
      results.push(await ingestMessage(msg));
    } catch (err) {
      console.error("[ingestMessages]", msg.externalId, err);
      results.push({
        externalId: msg.externalId,
        senderName: msg.senderName,
        body: msg.body,
        action: "分類できず",
        verdict: UNCLASSIFIED,
        reason: `処理中にエラーが発生しました: ${err instanceof Error ? err.message : String(err)}`,
        confidence: null,
        requestId: null,
        requestBody: null,
      });
    }
  }
  return results;
}
