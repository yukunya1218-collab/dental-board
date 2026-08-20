import { NextResponse } from "next/server";
import { formatDigest } from "@/lib/line/digest";
import { fetchAllRequestViews, fetchDigestLogs } from "@/lib/line/requests";

export async function GET() {
  try {
    const now = new Date();
    const [requests, digestLogs] = await Promise.all([fetchAllRequestViews(now), fetchDigestLogs()]);
    const outstanding = requests.filter((r) => !r.dismissed && r.status !== "完了");

    return NextResponse.json({
      requests,
      digestLogs,
      // いま21:30になったら何が送られるかを画面で確認できるようにする
      digestPreview: formatDigest(outstanding, now),
    });
  } catch (err) {
    console.error("[GET /api/line/requests]", err);
    return NextResponse.json({ error: "依頼の取得に失敗しました" }, { status: 500 });
  }
}
