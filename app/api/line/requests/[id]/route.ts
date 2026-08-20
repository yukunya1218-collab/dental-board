import { NextResponse } from "next/server";
import sql from "@/lib/db";
import { jstEndOfDay } from "@/lib/line/time";
import { REQUEST_STATUSES, RequestStatus } from "@/lib/line/types";

interface PatchBody {
  status?: RequestStatus;
  dismissed?: boolean;
  /** "YYYY-MM-DD"。null で期限なしに戻す */
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
    const values: (string | boolean | null)[] = [];
    let idx = 1;

    if ("status" in body) {
      if (!body.status || !REQUEST_STATUSES.includes(body.status)) {
        return NextResponse.json({ error: "状態の値が不正です" }, { status: 400 });
      }
      updates.push(`status = $${idx++}`);
      values.push(body.status);
      // 状態が動いたときだけ滞留の起点を更新する（期限の手直しでは動かさない）
      updates.push("updated_at = NOW()");
    }
    if ("dismissed" in body) {
      updates.push(`dismissed = $${idx++}`);
      values.push(Boolean(body.dismissed));
    }
    if ("deadline" in body) {
      const parsed = body.deadline ? jstEndOfDay(body.deadline) : null;
      if (body.deadline && !parsed) {
        return NextResponse.json({ error: "期限は YYYY-MM-DD 形式で指定してください" }, { status: 400 });
      }
      updates.push(`deadline = $${idx++}`);
      values.push(parsed ? parsed.toISOString() : null);
    }

    if (updates.length === 0) {
      return NextResponse.json({ error: "更新するフィールドがありません" }, { status: 400 });
    }

    values.push(id);
    const query = `UPDATE line_requests SET ${updates.join(", ")} WHERE id = $${idx} RETURNING id`;
    const rows = await sql.query(query, values);

    if (rows.length === 0) {
      return NextResponse.json({ error: "依頼が見つかりません" }, { status: 404 });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[PATCH /api/line/requests/[id]]", err);
    return NextResponse.json({ error: "更新に失敗しました" }, { status: 500 });
  }
}
