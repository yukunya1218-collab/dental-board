import { NextResponse } from "next/server";
import { verifySharedSecret } from "@/lib/line/auth";
import { formatDigest, recordDigestLog } from "@/lib/line/digest";
import { pushToGroup, type PushOutcome } from "@/lib/line/messaging";
import { fetchOutstandingRequestViews } from "@/lib/line/requests";
import { getGroupId } from "@/lib/line/settings";

// 毎日21:30 JST に GitHub Actions から叩かれる。本物のLINEメッセージを送るので
// 共有シークレット必須。成功・失敗どちらでも digest_logs に必ず1行残す。

export async function POST(request: Request) {
  const gate = verifySharedSecret(request);
  if (!gate.ok) {
    return NextResponse.json({ error: gate.error }, { status: gate.status });
  }

  const ranAt = new Date();

  try {
    const items = await fetchOutstandingRequestViews(ranAt);
    const messageBody = formatDigest(items, ranAt);
    const groupId = await getGroupId();

    const outcome: PushOutcome = groupId
      ? await pushToGroup(groupId, messageBody)
      : {
          succeeded: false,
          statusCode: null,
          errorDetail: "グループIDが未登録です。Botをグループに招待して1度発言してください。",
        };

    await recordDigestLog({ itemCount: items.length, messageBody, outcome, ranAt });

    if (!outcome.succeeded) {
      return NextResponse.json(
        {
          error: "LINEへの送信に失敗しました",
          detail: outcome.errorDetail,
          lineStatusCode: outcome.statusCode,
          itemCount: items.length,
        },
        { status: 502 }
      );
    }

    return NextResponse.json({
      ok: true,
      itemCount: items.length,
      lineStatusCode: outcome.statusCode,
      messageBody,
    });
  } catch (err) {
    console.error("[POST /api/digest]", err);
    try {
      await recordDigestLog({
        itemCount: 0,
        messageBody: "",
        outcome: {
          succeeded: false,
          statusCode: null,
          errorDetail: err instanceof Error ? err.message : String(err),
        },
        ranAt,
      });
    } catch (logErr) {
      console.error("[POST /api/digest] ログの記録にも失敗しました", logErr);
    }
    return NextResponse.json({ error: "日次投稿に失敗しました" }, { status: 500 });
  }
}
