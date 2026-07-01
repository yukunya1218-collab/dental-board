import { NextResponse } from "next/server";
import sql from "@/lib/db";
import { Status } from "@/lib/data";

interface PatchBody {
  status?: Status;
  assignee?: string | null;
  deadline?: string | null;
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body: PatchBody = await request.json();

    const updates: string[] = [];
    const values: (string | null)[] = [];
    let idx = 1;

    if ("status" in body) {
      updates.push(`status = $${idx++}`);
      values.push(body.status ?? null);
    }
    if ("assignee" in body) {
      updates.push(`assignee = $${idx++}`);
      values.push(body.assignee ?? null);
    }
    if ("deadline" in body) {
      updates.push(`deadline = $${idx++}`);
      values.push(body.deadline ?? null);
    }

    if (updates.length === 0) {
      return NextResponse.json({ error: "更新するフィールドがありません" }, { status: 400 });
    }

    values.push(id);
    const query = `UPDATE problems SET ${updates.join(", ")} WHERE id = $${idx} RETURNING id`;
    const rows = await sql.query(query, values);

    if (rows.length === 0) {
      return NextResponse.json({ error: "問題が見つかりません" }, { status: 404 });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[PATCH /api/problems/[id]]", err);
    return NextResponse.json({ error: "更新に失敗しました" }, { status: 500 });
  }
}
