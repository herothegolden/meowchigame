import crypto from "crypto";
import { URLSearchParams } from "url";

/**
 * Telegram WebApp verification (WebAppData method)
 * Spec: https://core.telegram.org/bots/webapps#validating-data-received-via-the-mini-app
 *
 * secretKey = HMAC_SHA256(BOT_TOKEN, key="WebAppData")
 * data_check_string = "\n".join(sorted(["key=value" for key != 'hash']))
 * computed_hash = HMAC_SHA256(data_check_string, secretKey).hex
 */
export function verifyInitData(
  initData: string,
  botToken: string
): { ok: true; parsed: Record<string, string> } | { ok: false; reason: string } {
  if (!botToken) return { ok: false, reason: "bot_token_missing" };

  const params = new URLSearchParams(initData);
  const receivedHash = params.get("hash") || "";
  if (!receivedHash) return { ok: false, reason: "missing_hash" };

  const keys = Array.from(params.keys())
    .filter((k) => k !== "hash")
    .sort();

  const dataCheckString = keys
    .map((k) => {
      const v = params.get(k);
      return `${k}=${v}`;
    })
    .join("\n");

  const secretKey = crypto.createHmac("sha256", "WebAppData").update(botToken).digest();
  const computedHash = crypto.createHmac("sha256", secretKey).update(dataCheckString).digest("hex");

  const match =
    receivedHash.length === computedHash.length &&
    crypto.timingSafeEqual(Buffer.from(receivedHash, "utf8"), Buffer.from(computedHash, "utf8"));

  if (!match) return { ok: false, reason: "bad_signature" };

  const parsed: Record<string, string> = {};
  for (const [k, v] of params.entries()) parsed[k] = v;

  return { ok: true, parsed };
}
