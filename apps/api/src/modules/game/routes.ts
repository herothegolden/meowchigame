import { FastifyPluginAsync } from "fastify";
import crypto from "crypto";

export const gameRoutes: FastifyPluginAsync = async (app) => {
  // Issue a seeded level (MVP: static difficulty)
  app.get("/level", async (req, reply) => {
    const seed = crypto.randomBytes(8).toString("hex");
    return { levelId: 1, seed, livesLeft: 5 };
  });

  // Receive moves, verify against seed (MVP: dummy verification)
  app.post("/session", async (req, reply) => {
    // TODO: parse body { levelId, moves }
    // TODO: replay server-side and compute score
    return { score: 12345, stars: 2, rewardsDelta: { points: 25, xp: 20 } };
  });
};
