import type { FastifyPluginAsync } from "fastify";
import { authPreHandler } from "../auth/middleware.js";
import { prisma } from "../../prisma.js";

export const walletRoutes: FastifyPluginAsync = async (app) => {
  app.get("/balance", { preHandler: [authPreHandler] }, async (req) => {
    const tgId = req.auth!.user.tgId;

    await prisma.user.upsert({
      where: { id: tgId },
      create: {
        id: tgId,
        username: req.auth!.user.username ?? undefined,
        firstName: req.auth!.user.firstName ?? undefined,
        lastName: req.auth!.user.lastName ?? undefined,
        photoUrl: req.auth!.user.photoUrl ?? undefined,
        languageCode: req.auth!.user.languageCode ?? undefined,
        isPremium: req.auth!.user.isPremium,
        isBot: req.auth!.user.isBot
      },
      update: {
        username: req.auth!.user.username ?? undefined,
        firstName: req.auth!.user.firstName ?? undefined,
        lastName: req.auth!.user.lastName ?? undefined,
        photoUrl: req.auth!.user.photoUrl ?? undefined,
        languageCode: req.auth!.user.languageCode ?? undefined,
        isPremium: req.auth!.user.isPremium,
        isBot: req.auth!.user.isBot
      }
    });

    const wallet = await prisma.wallet.upsert({
      where: { userId: tgId },
      create: { userId: tgId, balance: 0 },
      update: {}
    });

    return { balance: wallet.balance };
  });

  app.post("/adjust", { preHandler: [authPreHandler] }, async (req, reply) => {
    const body = (req.body ?? {}) as { delta?: number; reason?: string };
    const delta = Math.trunc(Number(body.delta));
    if (!Number.isFinite(delta) || delta === 0) {
      return reply.code(400).send({ error: "DELTA_INVALID" });
    }

    const tgId = req.auth!.user.tgId;

    const wallet = await prisma.wallet.upsert({
      where: { userId: tgId },
      create: { userId: tgId, balance: 0 },
      update: {}
    });

    const updated = await prisma.wallet.update({
      where: { userId: tgId },
      data: { balance: wallet.balance + delta }
    });

    return { ok: true, balance: updated.balance };
  });
};
