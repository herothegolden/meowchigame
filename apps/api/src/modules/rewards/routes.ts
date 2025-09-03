import { FastifyPluginAsync } from "fastify";

export const rewardsRoutes: FastifyPluginAsync = async (app) => {
  app.get("/catalog", async (req, reply) => {
    return {
      digital: [
        { id: "life", title: "Extra Life", costStars: 150 },
        { id: "powerups", title: "Power-Up Pack", costStars: 200 },
        { id: "avatarframe", title: "Avatar Frame", costStars: 300 }
      ],
      irl: [
        { id: "free-delivery", title: "Free Delivery", costPoints: 300 },
        { id: "discount-10", title: "10% Discount", costPoints: 500 },
        { id: "b2g1", title: "Buy 2 Get 1", costPoints: 800 },
        { id: "limited-flavor", title: "Limited Flavor Voucher", costPoints: 1000 }
      ]
    };
  });

  app.post("/redeem", async (req, reply) => {
    // TODO: check balance, deduct, create voucher if IRL
    return { ok: true, voucher: { code: "MEOW-ABCD-1234", expiresAt: new Date(Date.now() + 7*864e5) } };
  });

  app.get("/history", async (req, reply) => {
    return { items: [{ id: "discount-10", status: "redeemed" }] };
  });
};
