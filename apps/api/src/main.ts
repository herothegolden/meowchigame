import Fastify from "fastify";
import cors from "@fastify/cors";
import helmet from "@fastify/helmet";
import rateLimit from "@fastify/rate-limit";
import formbody from "@fastify/formbody";
import { verifyInitData } from "./modules/auth/telegram.js";
import { gameRoutes } from "./modules/game/routes.js";
import { rewardsRoutes } from "./modules/rewards/routes.js";

const app = Fastify({ logger: true });

await app.register(cors, { origin: true });
await app.register(helmet);
await app.register(formbody);
await app.register(rateLimit, { max: 100, timeWindow: "1 minute" });

// Health
app.get("/health", async () => ({ ok: true }));

// Auth preHandler: verify Telegram initData for state-changing routes
app.addHook("preHandler", async (req, reply) => {
  if (req.method === "GET") return;
  // Force type so TS doesn't complain about body shape
  const body: any = req.body;
  const initData = (req.headers["x-telegram-init-data"] || body?.initData || "") as string;
  const ok = verifyInitData(initData, process.env.BOT_TOKEN || "");
  if (!ok) {
    reply.code(401).send({ error: "Unauthorized" });
  }
});

app.register(gameRoutes, { prefix: "/game" });
app.register(rewardsRoutes, { prefix: "/rewards" });

const port = Number(process.env.PORT || 8080);
app.listen({ port, host: "0.0.0.0" }).then(() => {
  app.log.info(`API listening on :${port}`);
});
