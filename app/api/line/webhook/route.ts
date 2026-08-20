import crypto from "node:crypto";
import { NextResponse } from "next/server";
import { safeEqual } from "@/lib/line/auth";
import { ingestMessage } from "@/lib/line/ingest";
import { fetchMemberDisplayName } from "@/lib/line/messaging";
import { loadRoles, rememberGroupId } from "@/lib/line/settings";
import type { IncomingMessage } from "@/lib/line/types";

// LINEからのWebhook受け口。
// 署名は「受け取った生のバイト列」で検証する必要があるため、JSONとして読む前に
// arrayBuffer() で取り出し、そのバッファから改めて JSON.parse する。
// 署名が正しいリクエストには、内部で何が起きても必ず 200 を返す（LINEは非2xxで再送してくる）。

interface LineSource {
  type?: string;
  userId?: string;
  groupId?: string;
}

interface LineEvent {
  type?: string;
  timestamp?: number;
  source?: LineSource;
  message?: { id?: string; type?: string; text?: string };
}

function verifySignature(rawBody: Buffer, signature: string | null): boolean {
  const secret = process.env.LINE_CHANNEL_SECRET;
  if (!secret || !signature) return false;
  const expected = crypto.createHmac("sha256", secret).update(rawBody).digest("base64");
  return safeEqual(signature, expected);
}

async function resolveSenderName(groupId: string, userId: string): Promise<string> {
  const roles = await loadRoles();
  const known = [roles.requester, roles.director].find((r) => r?.userId && r.userId === userId);
  if (known) return known.name;
  return (await fetchMemberDisplayName(groupId, userId)) ?? `メンバー(${userId.slice(-6)})`;
}

async function handleEvent(event: LineEvent): Promise<void> {
  const source = event.source ?? {};

  if (source.type === "group" && source.groupId) {
    await rememberGroupId(source.groupId);
  }

  if (event.type !== "message" || event.message?.type !== "text") return;

  const text = event.message.text?.trim();
  const messageId = event.message.id;
  if (!text || !messageId) return;

  const userId = source.userId ?? "";
  const message: IncomingMessage = {
    externalId: messageId,
    senderId: userId,
    senderName: userId ? await resolveSenderName(source.groupId ?? "", userId) : "不明な送信者",
    body: text,
    receivedAt: event.timestamp ? new Date(event.timestamp) : new Date(),
    manual: false,
  };

  await ingestMessage(message);
}

export async function POST(request: Request) {
  const rawBody = Buffer.from(await request.arrayBuffer());

  if (!verifySignature(rawBody, request.headers.get("x-line-signature"))) {
    console.error("[POST /api/line/webhook] 署名が一致しませんでした");
    return NextResponse.json({ error: "署名が不正です" }, { status: 401 });
  }

  try {
    const payload = JSON.parse(rawBody.toString("utf8")) as { events?: LineEvent[] };
    for (const event of payload.events ?? []) {
      try {
        await handleEvent(event);
      } catch (err) {
        // 1件の失敗で残りを止めない。LINEへは必ず200を返す。
        console.error("[POST /api/line/webhook] イベント処理に失敗しました", err);
      }
    }
  } catch (err) {
    console.error("[POST /api/line/webhook] 本文の解析に失敗しました", err);
  }

  return NextResponse.json({ ok: true });
}
