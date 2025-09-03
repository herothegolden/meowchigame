import type { FastifyPluginAsync } from "fastify";
import { authPreHandler } from "../auth/middleware";
import { prisma } from "../../prisma";

const rewardsRoutes: FastifyPluginAsync = async (app) => {
  // List recent rewards for current user
  app.get("/", { preHandler: [authPreHandler] }, async (req) => {
    const tgId = req.auth!.user.tgId;

    // Ensure user exists in DB
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
        isBot: req.auth!.user.isBot,
      },
      update: {
        username: req.auth!.user.username ?? undefined,
        firstName: req.auth!.user.firstName ?? undefined,
        lastName: req.auth!.user.lastName ?? undefined,
        photoUrl: req.auth!.user.photoUrl ?? undefined,
        languageCode: req.auth!.user.languageCode ?? undefined,
        isPremium: req.auth!.user.isPremium,
        isBot: req.auth!.user.isBot,
      },
    });

    const rewards = await prisma.reward.findMany({
      where: { userId: tgId },
      orderBy: { createdAt: "desc" },
      take: 50,
    });

    return { rewards };
  });

  // Grant a reward to current user (e.g., daily login, invite, etc.)
  app.post("/grant", { preHandler: [authPreHandler] }, async (req, reply) => {
    const body = (req.body ?? {}) as { type?: string; points?: number };
    const type = (body.type || "generic").trim();
    const points = Number.isFinite(body.points) ? Number(body.points) : 0;

    if (!type) return reply.code(400).send({ error: "TYPE_REQUIRED" });
    if (points <= 0) return reply.code(400).send({ error: "POINTS_MUST_BE_POSITIVE" });

    const tgId = req.auth!.user.tgId;

    // Ensure user & wallet exist
    await prisma.user.upsert({
      where: { id: tgId },
      create: { id: tgId },
      update: {},
    });

    const wallet = await prisma.wallet.upsert({
      where: { userId: tgId },
      create: { userId: tgId, balance: 0 },
      update: {},
    });

    const reward = await prisma.reward.create({
      data: { userId: tgId, type, points },
    });

    const updated = await prisma.wallet.update({
      where: { userId: tgId },
      data: { balance: wallet.balance + points },
    });

    return { reward, wallet: updated };
  });
};

export default rewardsRoutes;
