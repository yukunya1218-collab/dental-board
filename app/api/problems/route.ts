import { NextResponse } from "next/server";
import sql from "@/lib/db";
import { Problem } from "@/lib/data";

export async function GET() {
  try {
    const problems = await sql`
      SELECT
        p.id,
        p.title,
        p.description,
        p.category,
        p.status,
        p.priority,
        p.assignee,
        p.reported_by   AS "reportedBy",
        p.reported_by_role AS "reportedByRole",
        p.created_at    AS "createdAt",
        p.deadline,
        p.images,
        COALESCE(
          json_agg(
            json_build_object(
              'id',        c.id,
              'author',    c.author,
              'role',      c.role,
              'text',      c.text,
              'createdAt', c.created_at
            ) ORDER BY c.created_at ASC
          ) FILTER (WHERE c.id IS NOT NULL),
          '[]'
        ) AS comments
      FROM problems p
      LEFT JOIN comments c ON c.problem_id = p.id
      GROUP BY p.id
      ORDER BY
        CASE p.priority WHEN '緊急' THEN 0 ELSE 1 END,
        p.created_at DESC
    `;

    return NextResponse.json(problems);
  } catch (err) {
    console.error("[GET /api/problems]", err);
    return NextResponse.json({ error: "データの取得に失敗しました" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body: Omit<Problem, "id" | "comments" | "createdAt"> = await request.json();

    const [row] = await sql`
      INSERT INTO problems (
        title, description, category, status, priority,
        assignee, reported_by, reported_by_role, deadline, images
      ) VALUES (
        ${body.title},
        ${body.description ?? ""},
        ${body.category},
        ${body.status},
        ${body.priority},
        ${body.assignee ?? null},
        ${body.reportedBy},
        ${body.reportedByRole},
        ${body.deadline ?? null},
        ${body.images ?? []}
      )
      RETURNING
        id,
        title,
        description,
        category,
        status,
        priority,
        assignee,
        reported_by   AS "reportedBy",
        reported_by_role AS "reportedByRole",
        created_at    AS "createdAt",
        deadline,
        images
    `;

    const newProblem: Problem = { ...(row as Omit<Problem, "comments">), comments: [] };
    return NextResponse.json(newProblem, { status: 201 });
  } catch (err) {
    console.error("[POST /api/problems]", err);
    return NextResponse.json({ error: "問題の登録に失敗しました" }, { status: 500 });
  }
}
