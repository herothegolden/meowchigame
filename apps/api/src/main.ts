// apps/api/src/main.ts
import Fastify from "fastify";
import cors from "@fastify/cors";
import helmet from "@fastify/helmet";
import rateLimit from "@fastify/rate-limit";
import formbody from "@fastify/formbody";

import { verifyInitData } from "./modules/auth/telegram.js";
import { gameRoutes } from "./modules/game/routes.js";
import { rewardsRoutes } from "./modules/rewards/routes.js";
import { walletRoutes } from "./modules/wallet/routes.js";
import { prisma } from "./prisma.js";

async function start() {
  const app = Fastify({ logger: true });

  // Core plugins (Fastify v4 line)
  await app.register(cors, { origin: true });
  await app.register(helmet);
  await app.register(formbody);
  await app.register(rateLimit, { max: 100, timeWindow: "1 minute" });

  // Friendly root + health
  app.get("/", async () => ({ ok: true, service: "meowchi-api" }));
  app.get("/health", async () => ({ ok: true }));

  // Verify Telegram WebApp initData on mutating routes
  app.addHook("preHandler", async (req, reply) => {
    if (req.method === "GET" || req.method === "HEAD" || req.method === "OPTIONS") return;

    const body: any = req.body;
    const headerInit = req.headers["x-telegram-init-data"] as string | undefined;
    const initData = headerInit || body?.initData;

    if (!initData) {
      reply.code(401).send({ error: "Missing initData" });
      return;
    }
    if (!process.env.BOT_TOKEN) {
      reply.code(500).send({ error: "Server misconfigured: BOT_TOKEN is not set" });
      return;
    }
    const ok = verifyInitData(initData, process.env.BOT_TOKEN);
    if (!ok) {
      reply.code(401).send({ error: "Invalid Telegram signature" });
      return;
    }
  });

  // --- Route plugins
  app.register(gameRoutes, { prefix: "/game" });
  app.register(rewardsRoutes, { prefix: "/rewards" });
  app.register(walletRoutes, { prefix: "/wallet" });

  // --- Safety fallback: keep /rewards/catalog alive even if plugin fails to mount
  app.get("/rewards/catalog", async () => {
    const count = await prisma.reward.count();
    if (count === 0) {
      await prisma.reward.createMany({
        data: [
          { kind: "digital", title: "Extra Life",       costStars: 150, costPoints: null, payload: {} },
          { kind: "digital", title: "Power-Up Pack",    costStars: 200, costPoints: null, payload: {} },
          { kind: "digital", title: "Avatar Frame",     costStars: 300, costPoints: null, payload: {} },
          { kind: "irl",     title: "Free Delivery",           costPoints: 300,  costStars: null, payload: {} },
          { kind: "irl",     title: "10% Discount",            costPoints: 500,  costStars: null, payload: {} },
          { kind: "irl",     title: "Buy 2 Get 1",             costPoints: 800,  costStars: null, payload: {} },
          { kind: "irl",     title: "Limited Flavor Voucher",  costPoints: 1000, costStars: null, payload: {} }
        ]
      });
    }

    const rewards = await prisma.reward.findMany({
      where: { active: true },
      orderBy: { id: "asc" },
      select: { id: true, kind: true, title: true, costPoints: true, costStars: true }
    });

    const digital = rewards.filter((r) => r.kind === "digital");
    const irl     = rewards.filter((r) => r.kind === "irl");
    return { digital, irl };
  });

  // Start server
  const port = Number(process.env.PORT || 8080);
  try {
    await app.listen({ port, host: "0.0.0.0" });
    app.log.info(`API listening on :${port}`);
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
}

start();
