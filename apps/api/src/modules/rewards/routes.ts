import { FastifyPluginAsync } from "fastify";
import { authPreHandler } from "../auth/middleware.js";
import { prisma } from "../../prisma.js";

/**
 * Seed the rewards catalog once if the table is empty.
 * Idempotent: runs fast and only inserts when needed.
 */
async function ensureCatalogSeeded() {
  const count = await prisma.reward.count();
  if (count > 0) return;

  await prisma.reward.createMany({
    data: [
      // Digital (Stars) – Telegram policy: digital goods via Stars
      { 
        kind: "digital", 
        title: "Extra Life", 
        description: "Get an additional life for the game",
        costStars: 150, 
        costPoints: null, 
        payload: {} 
      },
      { 
        kind: "digital", 
        title: "Power-Up Pack", 
        description: "Unlock special power-ups for your games",
        costStars: 200, 
        costPoints: null, 
        payload: {} 
      },
      { 
        kind: "digital", 
        title: "Avatar Frame", 
        description: "Exclusive avatar frame for your profile",
        costStars: 300, 
        costPoints: null, 
        payload: {} 
      },

      // In-store (Points)
      { 
        kind: "irl", 
        title: "Free Delivery", 
        description: "Free delivery on your next order",
        costPoints: 300, 
        costStars: null, 
        payload: {} 
      },
      { 
        kind: "irl", 
        title: "10% Discount", 
        description: "Get 10% off your next purchase",
        costPoints: 500, 
        costStars: null, 
        payload: {} 
      },
      { 
        kind: "irl", 
        title: "Buy 2 Get 1", 
        description: "Buy 2 items and get 1 free",
        costPoints: 800, 
        costStars: null, 
        payload: {} 
      },
      { 
        kind: "irl", 
        title: "Limited Flavor Voucher", 
        description: "Access to exclusive limited flavors",
        costPoints: 1000, 
        costStars: null, 
        payload: {} 
      }
    ]
  });
}

export const rewardsRoutes: FastifyPluginAsync = async (app) => {
  // GET /rewards/catalog
  app.get("/catalog", async () => {
    await ensureCatalogSeeded();

    const rewards = await prisma.reward.findMany({
      where: { active: true },
      orderBy: { createdAt: "asc" },
      select: {
        id: true,
        kind: true,
        title: true,
        description: true,
        costPoints: true,
        costStars: true
      }
    });

    const digital = rewards.filter((r) => r.kind === "digital");
    const irl = rewards.filter((r) => r.kind === "irl");

    return { digital, irl };
  });

  // GET /rewards/history - Get user's claimed rewards
  app.get("/history", { preHandler: [authPreHandler] }, async (req) => {
    const tgId = req.auth!.user.tgId;

    const userRewards = await prisma.userReward.findMany({
      where: { userId: tgId },
      include: {
        reward: {
          select: {
            id: true,
            kind: true,
            title: true,
            description: true
          }
        }
      },
      orderBy: { createdAt: "desc" }
    });

    return { rewards: userRewards };
  });

  // POST /rewards/claim - Claim a reward
  app.post("/claim", { preHandler: [authPreHandler] }, async (req, reply) => {
    const tgId = req.auth!.user.tgId;
    const body = (req.body ?? {}) as { rewardId?: string };

    if (!body.rewardId) {
      return reply.code(400).send({ error: "REWARD_ID_REQUIRED" });
    }

    const reward = await prisma.reward.findUnique({
      where: { id: body.rewardId, active: true }
    });

    if (!reward) {
      return reply.code(404).send({ error: "REWARD_NOT_FOUND" });
    }

    // Check if user has enough currency
    if (reward.costPoints) {
      const wallet = await prisma.wallet.findUnique({
        where: { userId: tgId }
      });

      if (!wallet || wallet.balance < reward.costPoints) {
        return reply.code(400).send({ error: "INSUFFICIENT_POINTS" });
      }

      // Deduct points and claim reward
      await prisma.$transaction([
        prisma.wallet.update({
          where: { userId: tgId },
          data: { balance: wallet.balance - reward.costPoints }
        }),
        prisma.userReward.create({
          data: {
            userId: tgId,
            rewardId: body.rewardId,
            points: reward.costPoints
          }
        })
      ]);
    } else if (reward.costStars) {
      // For Stars, we'd integrate with Telegram Payments API
      // For now, just claim the reward
      await prisma.userReward.create({
        data: {
          userId: tgId,
          rewardId: body.rewardId,
          points: 0
        }
      });
    } else {
      return reply.code(400).send({ error: "INVALID_REWARD_COST" });
    }

    return { ok: true, reward };
  });
};
