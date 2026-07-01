import { NextResponse } from "next/server";
import sql from "@/lib/db";
import { Comment } from "@/lib/data";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: problemId } = await params;
    const body: { text: string; author?: string; role?: string } = await request.json();

    if (!body.text?.trim()) {
      return NextResponse.json({ error: "コメント本文が必要です" }, { status: 400 });
    }

    const [row] = await sql`
      INSERT INTO comments (problem_id, author, role, text)
      VALUES (
        ${problemId},
        ${body.author ?? "あなた"},
        ${body.role   ?? "スタッフ"},
        ${body.text.trim()}
      )
      RETURNING
        id,
        author,
        role,
        text,
        created_at AS "createdAt"
    `;

    return NextResponse.json(row as Comment, { status: 201 });
  } catch (err) {
    console.error("[POST /api/problems/[id]/comments]", err);
    return NextResponse.json({ error: "コメントの追加に失敗しました" }, { status: 500 });
  }
}
