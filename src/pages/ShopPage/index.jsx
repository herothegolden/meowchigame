import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import ShopHeader from "./ShopHeader";
import CategorySection from "./CategorySection";

export default function ShopPage() {
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);
  const [items, setItems] = useState([]);
  const [justPurchased, setJustPurchased] = useState(null);

  useEffect(() => {
    const cachedProfile = sessionStorage.getItem("profileData");
    const cachedItems = sessionStorage.getItem("shopItems");
    if (cachedProfile && cachedItems) {
      setProfile(JSON.parse(cachedProfile));
      setItems(JSON.parse(cachedItems));
      return;
    }

    fetch("/api/get-profile-complete")
      .then((res) => res.json())
      .then((data) => {
        setProfile(data.profile);
        const categorizedItems = data.items.map((item) => {
          if (item.id <= 3) item.category = "Time Boosters";
          else if (item.id <= 6) item.category = "Cookie Bombs";
          else item.category = "Point Multipliers";
          return item;
        });
        setItems(categorizedItems);
        sessionStorage.setItem("profileData", JSON.stringify(data.profile));
        sessionStorage.setItem("shopItems", JSON.stringify(categorizedItems));
      });
  }, []);

  const handlePurchase = async (itemId) => {
    setJustPurchased(itemId);
    const res = await fetch("/api/shop/purchase", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ itemId }),
    });
    const data = await res.json();
    if (data.success) {
      const updatedProfile = { ...profile, points: data.points };
      setProfile(updatedProfile);
      sessionStorage.setItem("profileData", JSON.stringify(updatedProfile));
    }
    setTimeout(() => setJustPurchased(null), 1500);
  };

  const groupedItems = {
    "Time Boosters": items.filter((item) => item.category === "Time Boosters" && item.id !== 2),
    "Cookie Bombs": items.filter((item) => item.category === "Cookie Bombs"),
    "Point Multipliers": items.filter((item) => item.category === "Point Multipliers"),
  };

  return (
    <div className="min-h-screen bg-black text-white pb-24">
      <ShopHeader points={profile?.points || 0} />

      {/* Header video */}
      <motion.div
        initial={{ opacity: 0, y: 40 }}
        whileInView={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
        viewport={{ once: true }}
        className="p-6 rounded-2xl bg-white/5 backdrop-blur-lg border border-white/10 shadow-xl mb-6"
      >
        <video
          src="https://ik.imagekit.io/59r2kpz8r/G3.webm/ik-video.mp4?updatedAt=1759691005917"
          autoPlay
          loop
          muted
          playsInline
          preload="auto"
          className="w-full h-auto rounded-xl mb-4"
        />
      </motion.div>

      {/* 🍪 Cookie Pack Card */}
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        viewport={{ once: true }}
        className="mx-4 mb-6 p-4 rounded-xl bg-white/5 border border-white/10 shadow-md"
      >
        <h3 className="text-lg font-semibold mb-2 flex items-center">
          <span className="text-2xl mr-2">🍪</span>Купи настоящие Meowchi 쫀득 куки!
        </h3>
        <p className="text-gray-300 text-sm leading-relaxed mb-3">
          Получи не только сладость, но и силы Meowchiverse:
          <br />⏰ Time Booster ×3
          <br />💣 Cookie Bomb ×3
          <br />✨ Point Multiplier ×3
          <br />
          <br />
          Ешь. Наслаждайся. Получай бонусы. 쫀득 — вкус и польза в одном.
        </p>
        <div className="flex justify-end">
          <button
            onClick={() => navigate("/order")}
            className="bg-yellow-400 hover:bg-yellow-300 text-black font-semibold px-4 py-2 rounded-lg transition-colors"
          >
            Заказать
          </button>
        </div>
      </motion.div>

      {/* Categories */}
      <div className="space-y-6">
        <CategorySection
          title="Time Boosters"
          items={groupedItems["Time Boosters"]}
          profile={profile}
          handlePurchase={handlePurchase}
          justPurchased={justPurchased}
        />
        <CategorySection
          title="Cookie Bombs"
          items={groupedItems["Cookie Bombs"]}
          profile={profile}
          handlePurchase={handlePurchase}
          justPurchased={justPurchased}
        />
        <CategorySection
          title="Point Multipliers"
          items={groupedItems["Point Multipliers"]}
          profile={profile}
          handlePurchase={handlePurchase}
          justPurchased={justPurchased}
        />
      </div>
    </div>
  );
}
