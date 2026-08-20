import { NextResponse } from "next/server";
import { verifySharedSecret } from "@/lib/line/auth";
import { ingestMessages } from "@/lib/line/ingest";
import { parsePastedConversation } from "@/lib/line/paste";
import { loadRoles } from "@/lib/line/settings";

// LINEに貼られた会話をそのまま流し込む入口。
// Webhookと同じ ingestMessages を通すので、判定と状態遷移のルールは1本しかない。
// 本番と同じテーブルに書くため、日次投稿と同じ共有シークレットで守る。

export async function POST(request: Request) {
  const gate = verifySharedSecret(request);
  if (!gate.ok) {
    return NextResponse.json({ error: gate.error }, { status: gate.status });
  }

  try {
    const body: { text?: string } = await request.json();
    const text = body.text ?? "";
    if (!text.trim()) {
      return NextResponse.json({ error: "会話の本文が必要です" }, { status: 400 });
    }

    const roles = await loadRoles();
    const knownNames = [roles.requester?.name, roles.director?.name].filter(
      (n): n is string => Boolean(n)
    );

    const { messages, lines } = parsePastedConversation(text, knownNames);
    if (messages.length === 0) {
      return NextResponse.json({ parsedCount: 0, lines, results: [] });
    }

    const results = await ingestMessages(messages);

    return NextResponse.json({ parsedCount: messages.length, lines, results });
  } catch (err) {
    console.error("[POST /api/line/import]", err);
    return NextResponse.json({ error: "会話の取り込みに失敗しました" }, { status: 500 });
  }
}
