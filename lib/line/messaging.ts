// LINE Messaging API への送信・問い合わせ。トークンは環境変数からのみ読む。

const PUSH_ENDPOINT = "https://api.line.me/v2/bot/message/push";
const GROUP_MEMBER_ENDPOINT = "https://api.line.me/v2/bot/group";

export interface PushOutcome {
  succeeded: boolean;
  statusCode: number | null;
  errorDetail: string | null;
}

export async function pushToGroup(groupId: string, text: string): Promise<PushOutcome> {
  const token = process.env.LINE_CHANNEL_ACCESS_TOKEN;
  if (!token) {
    return { succeeded: false, statusCode: null, errorDetail: "LINE_CHANNEL_ACCESS_TOKEN が未設定です" };
  }

  try {
    const res = await fetch(PUSH_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ to: groupId, messages: [{ type: "text", text }] }),
    });

    if (!res.ok) {
      const detail = (await res.text()).slice(0, 500);
      return { succeeded: false, statusCode: res.status, errorDetail: detail || "LINE APIがエラーを返しました" };
    }
    return { succeeded: true, statusCode: res.status, errorDetail: null };
  } catch (err) {
    return {
      succeeded: false,
      statusCode: null,
      errorDetail: err instanceof Error ? err.message : String(err),
    };
  }
}

/** Webhookのペイロードには表示名が入らないので取りに行く。失敗しても処理は止めない。 */
export async function fetchMemberDisplayName(groupId: string, userId: string): Promise<string | null> {
  const token = process.env.LINE_CHANNEL_ACCESS_TOKEN;
  if (!token || !groupId || !userId) return null;

  try {
    const res = await fetch(`${GROUP_MEMBER_ENDPOINT}/${groupId}/member/${userId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { displayName?: string };
    return data.displayName?.trim() || null;
  } catch {
    return null;
  }
}
