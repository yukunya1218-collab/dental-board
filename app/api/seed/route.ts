import { NextResponse } from "next/server";
import sql from "@/lib/db";
import { INITIAL_PROBLEMS } from "@/lib/data";

export async function POST() {
  try {
    // テーブル作成
    await sql`
      CREATE TABLE IF NOT EXISTS problems (
        id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
        title          VARCHAR(500) NOT NULL,
        description    TEXT         NOT NULL DEFAULT '',
        category       VARCHAR(50)  NOT NULL,
        status         VARCHAR(20)  NOT NULL DEFAULT '未対応',
        priority       VARCHAR(10)  NOT NULL DEFAULT '通常',
        assignee       VARCHAR(100),
        reported_by    VARCHAR(100) NOT NULL,
        reported_by_role VARCHAR(20) NOT NULL,
        created_at     TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
        deadline       DATE,
        images         TEXT[]       NOT NULL DEFAULT '{}'
      )
    `;

    await sql`
      CREATE TABLE IF NOT EXISTS comments (
        id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
        problem_id  UUID        NOT NULL REFERENCES problems(id) ON DELETE CASCADE,
        author      VARCHAR(100) NOT NULL,
        role        VARCHAR(20)  NOT NULL,
        text        TEXT         NOT NULL,
        created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
      )
    `;

    // 既にデータがあれば何もしない
    const [{ count }] = await sql`SELECT COUNT(*)::int AS count FROM problems`;
    if (count > 0) {
      return NextResponse.json({ message: `既に ${count} 件のデータがあります。スキップしました。` });
    }

    // 初期データを投入
    for (const p of INITIAL_PROBLEMS) {
      const [inserted] = await sql`
        INSERT INTO problems (
          title, description, category, status, priority,
          assignee, reported_by, reported_by_role, created_at, deadline, images
        ) VALUES (
          ${p.title},
          ${p.description},
          ${p.category},
          ${p.status},
          ${p.priority},
          ${p.assignee ?? null},
          ${p.reportedBy},
          ${p.reportedByRole},
          ${p.createdAt},
          ${p.deadline ?? null},
          ${p.images}
        )
        RETURNING id
      `;

      for (const c of p.comments) {
        await sql`
          INSERT INTO comments (problem_id, author, role, text, created_at)
          VALUES (
            ${inserted.id},
            ${c.author},
            ${c.role},
            ${c.text},
            ${c.createdAt}
          )
        `;
      }
    }

    return NextResponse.json({ message: `初期データを ${INITIAL_PROBLEMS.length} 件投入しました。` });
  } catch (err) {
    console.error("[POST /api/seed]", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
