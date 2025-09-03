import Fastify from "fastify";
import type { FastifyServerOptions } from "fastify";
import fastifyCors from "@fastify/cors";

import { authPreHandler } from "./modules/auth/middleware";
import gameRoutes from "./modules/game/routes";
import rewardsRoutes from "./modules/rewards/routes";
import walletRoutes from "./modules/wallet/routes";

const build = (opts: FastifyServerOptions = {}) => {
  const app = Fastify({
    logger: true,
    ...opts,
  });

  // CORS (Mini Apps often make cross-origin XHRs)
  app.register(fastifyCors, { origin: true });

  // Health (no auth)
  app.get("/health", async () => ({ ok: true }));

  // Auth-protected identity endpoint
  app.get("/me", { preHandler: [authPreHandler] }, async (req) => {
    return { user: req.auth!.user };
  });

  // Feature routes
  app.register(gameRoutes, { prefix: "/game" });
  app.register(rewardsRoutes, { prefix: "/rewards" });
  app.register(walletRoutes, { prefix: "/wallet" });

  return app;
};

const server = build();
const PORT = Number(process.env.PORT || 8080);

server
  .listen({ port: PORT, host: "0.0.0.0" })
  .then(() => server.log.info(`API listening on :${PORT}`))
  .catch((err) => {
    server.log.error(err, "Failed to start server");
    process.exit(1);
  });

export default build;
