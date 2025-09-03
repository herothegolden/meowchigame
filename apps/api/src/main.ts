import Fastify from "fastify";
import type { FastifyServerOptions } from "fastify";
import fastifyCors from "@fastify/cors";

import { authPreHandler } from "./modules/auth/middleware.js";
import gameRoutes from "./modules/game/routes.js";
import rewardsRoutes from "./modules/rewards/routes.js";
import walletRoutes from "./modules/wallet/routes.js";

const build = (opts: FastifyServerOptions = {}) => {
  const app = Fastify({
    logger: true,
    ...opts,
  });

  app.register(fastifyCors, { origin: true });

  app.get("/health", async () => ({ ok: true }));

  app.get("/me", { preHandler: [authPreHandler] }, async (req) => {
    return { user: req.auth!.user };
  });

  app.register(gameRoutes, { prefix: "/game" });
  app.register(rewardsRoutes, { prefix: "/rewards" });
  app.register(walletRoutes, { prefix: "/wallet" });

  return app;
};

const server = build();
const PORT = Number(process.env.PORT || 8080);

server.listen({ port: PORT, host: "0.0.0.0" })
  .then(() => server.log.info(`API listening on :${PORT}`))
  .catch((err) => {
    console.error("FATAL: could not start server", err);
    process.exit(1);
  });

export default build;
