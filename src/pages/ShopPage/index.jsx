// src/pages/ShopPage/index.jsx
// v4 — No Animations, Mechanics-Safe

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { apiCall, showError } from "../../utils/api";
import { ErrorState } from "../../components/ErrorState";
import { LoadingState } from "../../components/LoadingState";
import ShopHeader from "./ShopHeader";
import CategorySection from "./CategorySection";

// --- Category detection (badges removed) ---
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
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [purchasing, setPurchasing] = useState(null);
  const [justPurchased, setJustPurchased] = useState(null);

  // --- Session cache for perceived speed (non-animated) ---
  useEffect(() => {
    const cached = sessionStorage.getItem("shopData");
    if (cached) {
      try {
        const parsed = JSON.parse(cached);
        setData(parsed);
        setLoading(false);
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

  // --- Inventory update (unchanged) ---
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

  // --- Badges removed completely ---
  const updateBadges = (badges) => badges;

  // --- Purchase flow (no animations after purchase) ---
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
        setJustPurchased(null); // ensure no animation trigger
      }
    },
    [purchasing, data?.items]
  );

  // --- Memoized categories (badges removed) ---
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

  // --- Static loading/error states (no shimmer or motion) ---
  if (loading && !data)
    return (
      <div className="flex flex-col items-center justify-center h-screen text-gray-400">
        <div className="rounded-2xl w-64 h-64 bg-white/10 mb-4" />
        <p className="text-sm opacity-75">Loading shop...</p>
      </div>
    );

  if (error) return <ErrorState error={error} onRetry={fetchData} />;
  if (!data)
    return <ErrorState error="No data available" onRetry={fetchData} />;

  // --- Render (no animations anywhere) ---
  return (
    <div className="p-4 space-y-6 bg-background text-primary">
      <ShopHeader points={data.userPoints} />
      {["time", "bomb", "multiplier"].map((category) => (
        <CategorySection
          key={category}
          category={category}
          items={itemsByCategory[category]}
          userPoints={data.userPoints}
          inventory={data.inventory}
          ownedBadges={[]} // keep prop to avoid child errors
          onPurchase={handlePurchase}
          purchasing={purchasing}
          justPurchased={null} // ensure no animation trigger
        />
      ))}
    </div>
  );
};

export default ShopPage;
