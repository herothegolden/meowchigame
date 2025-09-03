import crypto from "crypto";
import { URLSearchParams } from "url";

/**
 * Verify Telegram initData per https://core.telegram.org/bots/webapps#validating-data-received-via-the-mini-app
 */
export function verifyInitData(initData: string, botToken: string): boolean {
  try {
    if (!initData || !botToken) return false;
    const secret = crypto.createHmac("sha256", "WebAppData").update(botToken).digest();
    const url = new URLSearchParams(initData);
    const hash = url.get("hash");
    url.delete("hash");

    const dataCheckString = Array.from(url.entries())
      .sort(([a],[b]) => a.localeCompare(b))
      .map(([k, v]) => `${k}=${v}`)
      .join("\n");

    const computed = crypto.createHmac("sha256", secret).update(dataCheckString).digest("hex");
    return crypto.timingSafeEqual(Buffer.from(computed), Buffer.from(hash || ""));
  } catch {
    return false;
  }
}
