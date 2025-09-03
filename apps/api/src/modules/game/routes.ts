import type { FastifyPluginAsync } from "fastify";
import { authPreHandler } from "../auth/middleware.js";
import { prisma } from "../../prisma.js";
import { generateBoard, simulate, scoreToPoints, scoreToXp, type LevelSpec, type Move } from "./engine.js";

function makeLevelSpec(userId: string): LevelSpec {
  // Level seed is deterministic per user+day to discourage replay farming.
  const day = new Date();
  const key = `${userId}:${day.getUTCFullYear()}-${day.getUTCMonth()+1}-${day.getUTCDate()}`;
  const seed = Buffer.from(key).toString("base64").slice(0, 24);
  const levelId = seed; // keep equal for v1; can switch to cuid() later
  return { levelId, seed, rows: 6, cols: 6, colors: 5 };
}

const gameRoutes: FastifyPluginAsync = async (app) => {
  // Liveness
  app.get("/ping", async () => ({ ok: true, module: "game" }));

  // Server issues the level spec/seed
  app.get("/level", { preHandler: [authPreHandler] }, async (req) => {
    const tgId = req.auth!.user.tgId;
    const spec = makeLevelSpec(tgId);
    // We do NOT send the initial board to client; only dimensions + seed metadata.
    return {
      levelId: spec.levelId,
      seed: spec.seed,
      rows: spec.rows,
      cols: spec.cols,
      colors: spec.colors,
      maxMoves: 30
    };
  });

  // Client submits moves to be verified server-side
  app.post("/session", { preHandler: [authPreHandler] }, async (req, reply) => {
    const tgId = req.auth!.user.tgId;
    const body = (req.body ?? {}) as { levelId?: string; seed?: string; moves?: Move[] };

    if (!body || typeof body !== "object") return reply.code(400).send({ error: "BAD_REQUEST" });

    // Validate level spec matches what server would issue
    const expected = makeLevelSpec(tgId);
    if (body.levelId !== expected.levelId || body.seed !== expected.seed) {
      return reply.code(400).send({ error: "LEVEL_MISMATCH" });
    }

    const moves = Array.isArray(body.moves) ? body.moves : [];
    const spec: LevelSpec = { ...expected };

    // Simulate deterministically on the server
    const result = simulate(spec, moves, 30);
    const xpDelta = scoreToXp(result.score);
    const pointsDelta = scoreToPoints(result.score);

    // Upsert user (sync latest profile fields)
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
        xp: 0,
        level: 1
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

    // Persist session
    await prisma.gameSession.create({
      data: {
        userId: tgId,
        levelId: spec.levelId,
        seed: spec.seed,
        moves: result.movesApplied,
        score: result.score
      }
    });

    // Update XP + Level (linear XP, simple level curve)
    const user = await prisma.user.update({
      where: { id: tgId },
      data: {
        xp: { increment: xpDelta }
      }
    });

    // Simple level up: 100 XP per level (v1)
    const nextLevel = Math.max(1, Math.floor((user.xp ?? 0) / 100) + 1);
    if (nextLevel !== user.level) {
      await prisma.user.update({
        where: { id: tgId },
        data: { level: nextLevel }
      });
    }

    // Wallet points
    if (pointsDelta > 0) {
      const wallet = await prisma.wallet.upsert({
        where: { userId: tgId },
        create: { userId: tgId, balance: 0 },
        update: {}
      });
      await prisma.wallet.update({
        where: { userId: tgId },
        data: { balance: wallet.balance + pointsDelta }
      });
    }

    return {
      ok: true,
      score: result.score,
      xpDelta,
      pointsDelta,
      movesApplied: result.movesApplied,
      combos: result.totalCombos
    };
  });
};

export default gameRoutes;
