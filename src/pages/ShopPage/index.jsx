// Path: frontend/src/pages/ShopPage/index.jsx
// v9 — Instant paint (no black loading screen):
// - Removed full-screen loading return; render page shell immediately.
// - Added lightweight inline skeleton for header while data hydrates.
// - Kept session cache + background refetch; no unrelated logic changed.

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { apiCall, showError } from "../../utils/api";
import { ErrorState } from "../../components/ErrorState";
// NOTE: LoadingState import removed (unused)

import ShopHeader from "./ShopHeader";
import CategorySection from "./CategorySection";

const getCategoryFromItem = (item) => {
  if (item.name.includes("Time") || item.name.includes("time")) return "time";
  if (item.name.includes("Bomb") || item.name.includes("bomb")) return "bomb";
  if (
    item.name.includes("Points") ||
    item.name.includes("Double") ||
    item.name.includes("Booster")
  )
    return "multiplier";
  return "other";
};

const ShopPage = () => {
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [purchasing, setPurchasing] = useState(null);
  const [justPurchased, setJustPurchased] = useState(null);

  useEffect(() => {
    const cached = sessionStorage.getItem("shopData");
    if (cached) {
      try {
        const parsed = JSON.parse(cached);
        setData(parsed);
        setLoading(false); // instant paint with cached data
      } catch {
        sessionStorage.removeItem("shopData");
      }
    }
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchData = async () => {
    try {
      setError(null);
      setLoading((prev) => (data ? prev : true));

      const response = await apiCall("/api/get-profile-complete");
      const result = response.shopData;

      const processedItems = (result.items || [])
        .filter((item) => item.id !== 2)
        .map((item) => ({
          ...item,
          category: getCategoryFromItem(item),
        }));

      const nextData = {
        items: processedItems,
        userPoints: result.userPoints || 0,
        inventory: result.inventory || [],
        ownedBadges: [],
      };

      setData(nextData);
      sessionStorage.setItem("shopData", JSON.stringify(nextData));
    } catch (err) {
      console.error("Failed to load shop data:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const updateInventory = (inventory, itemId) => {
    const existingItem = inventory.find((inv) => inv.item_id === itemId);
    if (existingItem) {
      return inventory.map((inv) =>
        inv.item_id === itemId
          ? { ...inv, quantity: inv.quantity + 1 }
          : inv
      );
    } else {
      return [...inventory, { item_id: itemId, quantity: 1 }];
    }
  };

  const updateBadges = (badges) => badges;

  const handlePurchase = useCallback(
    async (itemId) => {
      if (purchasing !== null) return;
      const item = data?.items.find((i) => i.id === itemId);
      if (!item) return;

      setPurchasing(itemId);

      try {
        const result = await apiCall("/api/shop/purchase", { itemId });

        setData((prev) => {
          if (!prev) return prev;

          const updated = {
            ...prev,
            userPoints: result.newPoints,
            inventory: updateInventory(prev.inventory, itemId),
            ownedBadges: updateBadges(prev.ownedBadges, itemId, prev.items),
          };

          sessionStorage.setItem("shopData", JSON.stringify(updated));
          return updated;
        });
      } catch (err) {
        console.error("Purchase error for item:", itemId, err);
        showError(err.message);
      } finally {
        setPurchasing(null);
        setJustPurchased(null);
      }
    },
    [purchasing, data?.items]
  );

  const itemsByCategory = useMemo(() => {
    if (!data?.items) {
      return { time: [], bomb: [], multiplier: [] };
    }
    return {
      time: data.items.filter((item) => item.category === "time"),
      bomb: data.items.filter((item) => item.category === "bomb"),
      multiplier: data.items.filter((item) => item.category === "multiplier"),
    };
  }, [data?.items]);

  // Keep error as a page-level state (rare, explicit failure)
  if (error) return <ErrorState error={error} onRetry={fetchData} />;

  return (
    <div className="p-4 space-y-6 bg-background text-primary">
      {/* Header — skeleton while loading, otherwise real header */}
      {loading && !data ? (
        <div className="rounded-xl border border-white/10 bg-[#1b1b1b] p-4 animate-pulse max-w-md">
          <div className="h-6 w-40 bg-white/10 rounded mb-3" />
          <div className="h-4 w-64 bg-white/10 rounded" />
        </div>
      ) : (
        <ShopHeader points={data?.userPoints || 0} />
      )}

      {/* 🍪 Meowchi WebM Header Section (kept for visual parity; does not block) */}
      <div className="text-center space-y-4 mb-10">
        <video
          src="https://ik.imagekit.io/59r2kpz8r/G3.webm/ik-video.mp4?updatedAt=1759691005917"
          autoPlay
          loop
          muted
          playsInline
          preload="auto"
          className="w-full max-w-md mx-auto rounded-2xl shadow-[0_0_25px_rgba(255,255,255,0.15)] border border-white/10"
        />
      </div>

      {/* 🍪 Cookie Pack Card (Game-style, fixed emoji alignment) */}
      <div className="max-w-md mx-auto p-4 rounded-2xl bg-white/5 border border-white/10 shadow-lg space-y-3 mb-10 text-left">
        <h3 className="text-lg font-semibold flex items-center">
          <span className="text-2xl mr-2">🍪</span>Купи Meowchi 쫀득 куки!
        </h3>

        <p className="text-gray-400 text-sm leading-relaxed">
          Получи бонусы Meowchiverse:
        </p>

        {/* 3-column grid ensures perfect vertical alignment */}
        <div className="grid grid-cols-[1fr_auto_1fr] gap-x-4 text-sm text-gray-300 font-medium text-center">
          <div>⏰ Booster ×3</div>
          <div className="opacity-40">|</div>
          <div>💣 Bomb ×3</div>

          <div>✨ Multiplier ×3</div>
          <div className="opacity-40">|</div>
          <div>👑 VIP +1</div>
        </div>

        <p className="text-gray-300 text-sm mt-2">
          Ешь. Наслаждайся. 쫀득 — вкус и сила в одном.
        </p>

        <div className="flex justify-end pt-2">
          <button
            onClick={() => navigate("/order")}
            className="bg-yellow-400 hover:bg-yellow-300 text-black font-semibold px-4 py-2 rounded-lg transition-colors"
          >
            Заказать
          </button>
        </div>
      </div>

      {/* Shop Categories — always render; hydrate with data when ready */}
      {["time", "bomb", "multiplier"].map((category) => (
        <CategorySection
          key={category}
          category={category}
          items={itemsByCategory[category]}
          userPoints={data?.userPoints || 0}
          inventory={data?.inventory || []}
          ownedBadges={[]}
          onPurchase={handlePurchase}
          purchasing={purchasing}
          justPurchased={justPurchased}
        />
      ))}
    </div>
  );
};

export default ShopPage;
