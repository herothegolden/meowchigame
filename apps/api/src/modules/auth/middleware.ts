import type { FastifyReply, FastifyRequest } from "fastify";
import { verifyInitData } from "./telegram.js";
import { parseUser } from "./parse-user.js";

const MAX_AGE_SECONDS = 24 * 60 * 60;

function extractInitData(req: FastifyRequest): string | null {
  const headerVal = req.headers["x-telegram-init-data"];
  if (typeof headerVal === "string" && headerVal.trim()) return headerVal;
  if (Array.isArray(headerVal) && headerVal[0] && headerVal[0].trim()) return headerVal[0];

  const q = (req.query ?? {}) as Record<string, unknown>;
  if (typeof q.initData === "string" && q.initData.trim()) return q.initData;

  const b = (req.body ?? {}) as Record<string, unknown>;
  if (typeof b.initData === "string" && b.initData.trim()) return b.initData;

  return null;
}

declare module "fastify" {
  interface FastifyRequest {
    auth?: {
      user: ReturnType<typeof parseUser>["user"];
      raw: Record<string, string>;
    };
  }
}

export async function authPreHandler(req: FastifyRequest, reply: FastifyReply) {
  const BOT_TOKEN = process.env.BOT_TOKEN || "";
  if (!BOT_TOKEN) {
    req.log.error("BOT_TOKEN is not set");
    return reply.code(500).send({ error: "CONFIG_ERROR", message: "BOT_TOKEN missing" });
  }

  const initData = extractInitData(req);
  if (!initData) {
    return reply
      .code(400)
      .send({ error: "INIT_DATA_MISSING", message: "Provide X-Telegram-Init-Data header." });
  }

  const verified = verifyInitData(initData, BOT_TOKEN);
  if (!verified.ok) {
    const status = verified.reason === "bad_signature" ? 401 : 400;
    return reply.code(status).send({ error: "INIT_DATA_INVALID", reason: verified.reason });
  }

  const parsed = verified.parsed;
  const authDateStr = parsed["auth_date"];
  if (!authDateStr) return reply.code(400).send({ error: "MISSING_AUTH_DATE" });

  const authDate = Number(authDateStr);
  if (!Number.isFinite(authDate)) return reply.code(400).send({ error: "INVALID_AUTH_DATE" });

  const now = Math.floor(Date.now() / 1000);
  if (now - authDate > MAX_AGE_SECONDS) {
    return reply.code(401).send({ error: "AUTH_EXPIRED" });
  }

  const userJson = parsed["user"];
  if (!userJson) return reply.code(400).send({ error: "USER_MISSING" });

  let userPayload: any;
  try {
    userPayload = JSON.parse(userJson);
  } catch (e: any) {
    return reply.code(400).send({ error: "USER_PARSE_FAILED", message: String(e?.message || e) });
  }

  const { user } = parseUser(userPayload);
  req.auth = { user, raw: parsed };
}
