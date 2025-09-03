import type { FastifyPluginAsync } from "fastify";
import { authPreHandler } from "../auth/middleware.js";

const gameRoutes: FastifyPluginAsync = async (app) => {
  app.get("/ping", async () => ({ ok: true, module: "game" }));

  app.post("/state", { preHandler: [authPreHandler] }, async (req) => {
    return {
      ok: true,
      user: req.auth!.user
    };
  });
};

export default gameRoutes;
