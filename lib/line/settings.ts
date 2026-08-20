import sql from "@/lib/db";
import { SETTING_KEYS, type RoleAssignment, type RoleName, type Roles } from "@/lib/line/types";

export async function getSetting(key: string): Promise<string | null> {
  const rows = await sql`SELECT value FROM app_settings WHERE key = ${key}`;
  return rows.length > 0 ? (rows[0].value as string) : null;
}

export async function setSetting(key: string, value: string): Promise<void> {
  await sql`
    INSERT INTO app_settings (key, value)
    VALUES (${key}, ${value})
    ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW()
  `;
}

/** 既に入っている値は上書きしない（グループIDや役割の初回学習用） */
export async function setSettingIfAbsent(key: string, value: string): Promise<boolean> {
  const rows = await sql`
    INSERT INTO app_settings (key, value)
    VALUES (${key}, ${value})
    ON CONFLICT (key) DO NOTHING
    RETURNING key
  `;
  return rows.length > 0;
}

export async function getGroupId(): Promise<string | null> {
  return getSetting(SETTING_KEYS.groupId);
}

export async function rememberGroupId(groupId: string): Promise<void> {
  await setSettingIfAbsent(SETTING_KEYS.groupId, groupId);
}

function parseRole(raw: string | null): RoleAssignment | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Partial<RoleAssignment>;
    if (!parsed || typeof parsed.name !== "string" || !parsed.name) return null;
    return { userId: typeof parsed.userId === "string" ? parsed.userId : null, name: parsed.name };
  } catch {
    return null;
  }
}

export async function loadRoles(): Promise<Roles> {
  const [requester, director] = await Promise.all([
    getSetting(SETTING_KEYS.requester),
    getSetting(SETTING_KEYS.director),
  ]);
  return { requester: parseRole(requester), director: parseRole(director) };
}

function matches(assignment: RoleAssignment | null, senderId: string, senderName: string): boolean {
  if (!assignment) return false;
  if (assignment.userId && senderId && assignment.userId === senderId) return true;
  return assignment.name === senderName;
}

/** 保存済みの割り当てから発言者の役割を引く。未学習なら null */
export function roleOf(senderId: string, senderName: string, roles: Roles): RoleName | null {
  if (matches(roles.requester, senderId, senderName)) return "副院長";
  if (matches(roles.director, senderId, senderName)) return "院長";
  return null;
}

/**
 * 役割は実行時に学習する。LINEのユーザーIDはコードに埋め込まない。
 * 依頼を出した人 = 副院長、受領/完了報告をした人 = 院長 として最初の1回だけ記録する。
 */
export async function learnRole(
  role: RoleName,
  senderId: string,
  senderName: string,
  roles: Roles
): Promise<void> {
  const key = role === "副院長" ? SETTING_KEYS.requester : SETTING_KEYS.director;
  const current = role === "副院長" ? roles.requester : roles.director;
  if (current) return;
  const value: RoleAssignment = { userId: senderId || null, name: senderName };
  await setSettingIfAbsent(key, JSON.stringify(value));
}
