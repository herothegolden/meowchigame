import crypto from "crypto";
import type { Request, Response, NextFunction } from "express";
import { URLSearchParams } from "url";
import { parseUser } from "./parse-user";

// ---- Config ----
const BOT_TOKEN = process.env.BOT_TOKEN || "";
if (!BOT_TOKEN) {
  // Fail fast on boot so we don't run insecurely
  // (You can relax this to a runtime error if needed.)
  throw new Error("BOT_TOKEN is not set. Add it in Railway → API service → Variables.");
}

/**
 * Telegram verification per spec:
 * 1) secret_key = SHA256(BOT_TOKEN)
 * 2) data_check_string is "\n"-joined "key=value" for all keys except 'hash', sorted by key asc
 * 3) computed_hash = HMAC_SHA256(data_check_string, secret_key), hex
 * 4) timing-safe compare with received 'hash'
 */
function verifyTelegramInitData(initData: string): { ok: boolean; reason?: string; parsed?: Record<string, string> } {
  // Accept raw initData (e.g., "query_id=...&user=...&auth_date=...&hash=...")
  const params = new URLSearchParams(initData);
  const receivedHash = params.get("hash") || "";

  if (!receivedHash) return { ok: false, reason: "missing_hash" };

  // Build data_check_string
  const kvPairs: string[] = [];
  // Sort keys ASC and exclude 'hash'
  const keys = Array.from(params.keys()).filter((k) => k !== "hash").sort();
  for (const k of keys) {
    const v = params.get(k);
    if (v !== null) kvPairs.push(`${k}=${v}`);
  }
  const dataCheckString = kvPairs.join("\n");

  // Secret = SHA256(BOT_TOKEN)
  const secretKey = crypto.createHash("sha256").update(BOT_TOKEN).digest();
  const computedHash = crypto.createHmac("sha256", secretKey).update(dataCheckString).digest("hex");

  // Timing-safe compare
  const ok =
    receivedHash.length === computedHash.length &&
    crypto.timingSafeEqual(Buffer.from(receivedHash, "utf8"), Buffer.from(computedHash, "utf8"));

  if (!ok) return { ok: false, reason: "bad_signature" };

  // Convert to object for downstream use
  const parsed: Record<string, string> = {};
  for (const [k, v] of params.entries()) parsed[k] = v;

  // Basic replay guard using auth_date
  const authDateStr = parsed["auth_date"];
  if (!authDateStr) return { ok: false, reason: "missing_auth_date" };

  const authDate = Number(authDateStr);
  if (!Number.isFinite(authDate)) return { ok: false, reason: "invalid_auth_date" };

  // Allow 24h by default (tweak if you want stricter)
  const MAX_AGE_SECONDS = 24 * 60 * 60;
  const now = Math.floor(Date.now() / 1000);
  if (now - authDate > MAX_AGE_SECONDS) return { ok: false, reason: "expired_auth_date" };

  return { ok: true, parsed };
}

/**
 * Extract initData string from:
 *  - Header: 'x-telegram-init-data'
 *  - Fallback: query param 'initData' (GET) or body.initData (POST with urlencoded/json)
 */
function extractInitData(req: Request): string | null {
  const fromHeader = req.header("x-telegram-init-data");
  if (fromHeader && typeof fromHeader === "string" && fromHeader.trim()) return fromHeader;

  // Fallbacks (keep only during early integration; remove later)
  if (typeof req.query?.initData === "string" && req.query.initData.trim()) return req.query.initData;

  if (req.body && typeof (req.body as any).initData === "string" && (req.body as any).initData.trim()) {
    return (req.body as any).initData;
  }

  return null;
}

// Extend Express typing locally (without a global .d.ts yet)
declare module "express-serve-static-core" {
  interface Request {
    auth?: {
      user: ReturnType<typeof parseUser>["user"];
      raw: Record<string, string>;
    };
  }
}

/**
 * Middleware:
 *  - Verifies Telegram Mini App initData signature
 *  - Parses user payload (using parseUser)
 *  - Attaches req.auth = { user, raw }
 */
export function telegramAuth(): (req: Request, res: Response, next: NextFunction) {
  return (req, res, next) => {
    const initData = extractInitData(req);
    if (!initData) {
      return res.status(400).json({ error: "INIT_DATA_MISSING", message: "Provide X-Telegram-Init-Data header." });
    }

    const result = verifyTelegramInitData(initData);
    if (!result.ok || !result.parsed) {
      const reason = result.reason || "verification_failed";
      const status = reason === "bad_signature" ? 401 : 400;
      return res.status(status).json({ error: "INIT_DATA_INVALID", reason });
    }

    // Telegram sends user JSON inside 'user'
    let userJson = result.parsed["user"];
    if (!userJson) {
      return res.status(400).json({ error: "USER_MISSING", message: "No 'user' field in initData." });
    }

    try {
      const userObj = JSON.parse(userJson);
      const parsed = parseUser(userObj); // your existing helper returns { user, ... }
      req.auth = { user: parsed.user, raw: result.parsed };
      return next();
    } catch (err: any) {
      return res.status(400).json({ error: "USER_PARSE_FAILED", message: err?.message || "Invalid user JSON" });
    }
  };
}
import crypto from "crypto";
import type { Request, Response, NextFunction } from "express";
import { URLSearchParams } from "url";
import { parseUser } from "./parse-user";

// ---- Config ----
const BOT_TOKEN = process.env.BOT_TOKEN || "";
if (!BOT_TOKEN) {
  // Fail fast on boot so we don't run insecurely
  // (You can relax this to a runtime error if needed.)
  throw new Error("BOT_TOKEN is not set. Add it in Railway → API service → Variables.");
}

/**
 * Telegram verification per spec:
 * 1) secret_key = SHA256(BOT_TOKEN)
 * 2) data_check_string is "\n"-joined "key=value" for all keys except 'hash', sorted by key asc
 * 3) computed_hash = HMAC_SHA256(data_check_string, secret_key), hex
 * 4) timing-safe compare with received 'hash'
 */
function verifyTelegramInitData(initData: string): { ok: boolean; reason?: string; parsed?: Record<string, string> } {
  // Accept raw initData (e.g., "query_id=...&user=...&auth_date=...&hash=...")
  const params = new URLSearchParams(initData);
  const receivedHash = params.get("hash") || "";

  if (!receivedHash) return { ok: false, reason: "missing_hash" };

  // Build data_check_string
  const kvPairs: string[] = [];
  // Sort keys ASC and exclude 'hash'
  const keys = Array.from(params.keys()).filter((k) => k !== "hash").sort();
  for (const k of keys) {
    const v = params.get(k);
    if (v !== null) kvPairs.push(`${k}=${v}`);
  }
  const dataCheckString = kvPairs.join("\n");

  // Secret = SHA256(BOT_TOKEN)
  const secretKey = crypto.createHash("sha256").update(BOT_TOKEN).digest();
  const computedHash = crypto.createHmac("sha256", secretKey).update(dataCheckString).digest("hex");

  // Timing-safe compare
  const ok =
    receivedHash.length === computedHash.length &&
    crypto.timingSafeEqual(Buffer.from(receivedHash, "utf8"), Buffer.from(computedHash, "utf8"));

  if (!ok) return { ok: false, reason: "bad_signature" };

  // Convert to object for downstream use
  const parsed: Record<string, string> = {};
  for (const [k, v] of params.entries()) parsed[k] = v;

  // Basic replay guard using auth_date
  const authDateStr = parsed["auth_date"];
  if (!authDateStr) return { ok: false, reason: "missing_auth_date" };

  const authDate = Number(authDateStr);
  if (!Number.isFinite(authDate)) return { ok: false, reason: "invalid_auth_date" };

  // Allow 24h by default (tweak if you want stricter)
  const MAX_AGE_SECONDS = 24 * 60 * 60;
  const now = Math.floor(Date.now() / 1000);
  if (now - authDate > MAX_AGE_SECONDS) return { ok: false, reason: "expired_auth_date" };

  return { ok: true, parsed };
}

/**
 * Extract initData string from:
 *  - Header: 'x-telegram-init-data'
 *  - Fallback: query param 'initData' (GET) or body.initData (POST with urlencoded/json)
 */
function extractInitData(req: Request): string | null {
  const fromHeader = req.header("x-telegram-init-data");
  if (fromHeader && typeof fromHeader === "string" && fromHeader.trim()) return fromHeader;

  // Fallbacks (keep only during early integration; remove later)
  if (typeof req.query?.initData === "string" && req.query.initData.trim()) return req.query.initData;

  if (req.body && typeof (req.body as any).initData === "string" && (req.body as any).initData.trim()) {
    return (req.body as any).initData;
  }

  return null;
}

// Extend Express typing locally (without a global .d.ts yet)
declare module "express-serve-static-core" {
  interface Request {
    auth?: {
      user: ReturnType<typeof parseUser>["user"];
      raw: Record<string, string>;
    };
  }
}

/**
 * Middleware:
 *  - Verifies Telegram Mini App initData signature
 *  - Parses user payload (using parseUser)
 *  - Attaches req.auth = { user, raw }
 */
export function telegramAuth(): (req: Request, res: Response, next: NextFunction) {
  return (req, res, next) => {
    const initData = extractInitData(req);
    if (!initData) {
      return res.status(400).json({ error: "INIT_DATA_MISSING", message: "Provide X-Telegram-Init-Data header." });
    }

    const result = verifyTelegramInitData(initData);
    if (!result.ok || !result.parsed) {
      const reason = result.reason || "verification_failed";
      const status = reason === "bad_signature" ? 401 : 400;
      return res.status(status).json({ error: "INIT_DATA_INVALID", reason });
    }

    // Telegram sends user JSON inside 'user'
    let userJson = result.parsed["user"];
    if (!userJson) {
      return res.status(400).json({ error: "USER_MISSING", message: "No 'user' field in initData." });
    }

    try {
      const userObj = JSON.parse(userJson);
      const parsed = parseUser(userObj); // your existing helper returns { user, ... }
      req.auth = { user: parsed.user, raw: result.parsed };
      return next();
    } catch (err: any) {
      return res.status(400).json({ error: "USER_PARSE_FAILED", message: err?.message || "Invalid user JSON" });
    }
  };
}
