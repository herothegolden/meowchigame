import { FastifyPluginAsync } from "fastify";
import { prisma } from "../../prisma.js";

async function ensureCatalogSeeded() {
  const count = await prisma.reward.count();
  if (count > 0) return;

  await prisma.reward.createMany({
    data: [
      { kind: "digital", title: "Extra Life", costStars: 150, costPoints: null, payload: {} },
      { kind: "digital", title: "Power-Up Pack", costStars: 200, costPoints: null, payload: {} },
      { kind: "digital", title: "Avatar Frame", costStars: 300, costPoints: null, payload: {} },
      { kind: "irl", title: "Free Delivery", costPoints: 300, costStars: null, payload: {} },
      { kind: "irl", title: "10% Discount", costPoints: 500, costStars: null, payload: {} },
      { kind: "irl", title: "Buy 2 Get 1", costPoints: 800, costStars: null, payload: {} },
      { kind: "irl", title: "Limited Flavor Voucher", costPoints: 1000, costStars: null, payload: {} }
    ]
  });
}

export const rewardsRoutes: FastifyPluginAsync = async (app) => {
  app.get("/catalog", async () => {
    await ensureCatalogSeeded();

    const rewards = await prisma.reward.findMany({
      where: { active: true },
      orderBy: { id: "asc" },
      select: { id: true, kind: true, title: true, costPoints: true, costStars: true }
    });

    type RewardRow = {
      id: bigint;
      kind: string;
      title: string;
      costPoints: number | null;
      costStars: number | null;
    };

    const digital = rewards.filter((r: RewardRow) => r.kind === "digital");
    const irl = rewards.filter((r: RewardRow) => r.kind === "irl");
    return { digital, irl };
  });
};
