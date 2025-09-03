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

async function start() {
  const app = Fastify({ logger: true });

  // Core security & DX plugins (Fastify v4 line)
  await app.register(cors, { origin: true });
  await app.register(helmet);
  await app.register(formbody);
  await app.register(rateLimit, { max: 100, timeWindow: "1 minute" });

  // Friendly root (avoids confusion when opening API base URL)
  app.get("/", async () => ({ ok: true, service: "meowchi-api" }));

  // Strict auth on mutations: verify Telegram WebApp initData for POST/PUT/PATCH/DELETE
  app.addHook("preHandler", async (req, reply) => {
    // Allow safe methods without signature (GET/HEAD/OPTIONS)
    if (req.method === "GET" || req.method === "HEAD" || req.method === "OPTIONS") return;

    // Body is unknown shape to TS by default; treat as any for header fallback
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

  // Routes
  app.register(gameRoutes, { prefix: "/game" });
  app.register(rewardsRoutes, { prefix: "/rewards" });
  app.register(walletRoutes, { prefix: "/wallet" });

  // Health check
  app.get("/health", async () => ({ ok: true }));

  // Listen
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
