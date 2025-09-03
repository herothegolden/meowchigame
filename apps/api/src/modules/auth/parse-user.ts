import { URLSearchParams } from "url";

/**
 * Extract Telegram user from initData (after verifyInitData succeeds).
 * Returns { id, name?, locale? } or null if invalid.
 */
export function parseTelegramUser(initData: string | undefined) {
  if (!initData) return null;
  const params = new URLSearchParams(initData);
  const userStr = params.get("user");
  if (!userStr) return null;

  try {
    const obj = JSON.parse(userStr);
    if (!obj?.id) return null;
    return {
      id: Number(obj.id),
      name: [obj.first_name, obj.last_name].filter(Boolean).join(" ") || undefined,
      locale: obj.language_code || undefined
    };
  } catch {
    return null;
  }
}
