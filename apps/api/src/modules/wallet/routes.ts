// apps/api/src/modules/wallet/routes.ts
import { FastifyPluginAsync } from "fastify";
import { prisma } from "../../prisma.js";
import { verifyInitData } from "../auth/telegram.js";
import { parseTelegramUser } from "../auth/parse-user.js";

/**
 * GET /wallet
 * - Requires Telegram initData (header: X-Telegram-Init-Data)
 * - Verifies signature per Telegram WebApp spec
 * - Upserts User + Wallet, then returns current balances
 *
 * Docs:
 * https://core.telegram.org/bots/webapps#validating-data-received-via-the-mini-app
 */
export const walletRoutes: FastifyPluginAsync = async (app) => {
  app.get("/", async (req, reply) => {
    const initData =
      (req.headers["x-telegram-init-data"] as string | undefined) ||
      (req.query as any)?.initData;

    if (!initData) {
      return reply.code(401).send({ error: "Missing initData" });
    }
    if (!process.env.BOT_TOKEN) {
      // Senior guardrail: make misconfiguration obvious
      return reply
        .code(500)
        .send({ error: "Server misconfigured: BOT_TOKEN is not set" });
    }

    const ok = verifyInitData(initData, process.env.BOT_TOKEN);
    if (!ok) {
      return reply.code(401).send({ error: "Invalid Telegram signature" });
    }

    const tg = parseTelegramUser(initData);
    if (!tg?.id) {
      return reply.code(400).send({ error: "Invalid Telegram user payload" });
    }

    // Upsert user by Telegram ID
    const user = await prisma.user.upsert({
      where: { tgUserId: BigInt(tg.id) },
      update: {
        name: tg.name ?? null,
        locale: tg.locale ?? null,
      },
      create: {
        tgUserId: BigInt(tg.id),
        name: tg.name ?? null,
        locale: tg.locale ?? null,
      },
      select: { id: true, tgUserId: true },
    });

    // Ensure wallet exists (1:1 primary-key upsert)
    await prisma.wallet.upsert({
      where: { userId: user.id },
      update: {},
      create: { userId: user.id, points: 0, xp: 0, level: 1 },
    });

    const wallet = await prisma.wallet.findUnique({
      where: { userId: user.id },
      select: { points: true, xp: true, level: true },
    });

    return {
      userId: Number(user.id),
      tgUserId: Number(user.tgUserId),
      wallet,
    };
  });
};
