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
    const verification = verifyInitData(initData, process.env.BOT_TOKEN);
    if (!verification.ok) {
      reply.code(401).send({ error: "Invalid Telegram signature" });
      return;
    }
  });

  // --- Route plugins
  await app.register(gameRoutes, { prefix: "/game" });
  await app.register(rewardsRoutes, { prefix: "/rewards" });
  await app.register(walletRoutes, { prefix: "/wallet" });

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

start().catch((err) => {
  console.error("Failed to start server:", err);
  process.exit(1);
});
