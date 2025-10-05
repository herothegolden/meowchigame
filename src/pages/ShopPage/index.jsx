// index.jsx v2 — Speed-Optimized, Mechanics-Safe
import React, { useEffect, useState, useMemo, Suspense } from "react";
import { motion } from "framer-motion";
import ShopHeader from "./ShopHeader.jsx";
const CategorySection = React.lazy(() => import("./CategorySection.jsx"));
import apiCall from "../../utils/apiCall.js";

export default function ShopPage() {
  const [shopData, setShopData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // --- SESSION CACHE --------------------------------------------------
  useEffect(() => {
    const cached = sessionStorage.getItem("shopData");
    if (cached) {
      try {
        const parsed = JSON.parse(cached);
        setShopData(parsed);
        setLoading(false); // render instantly from cache
      } catch {
        sessionStorage.removeItem("shopData");
      }
    }
    fetchData(); // always refresh in background
  }, []);

  // --- PARALLEL FETCH -------------------------------------------------
  async function fetchData() {
    try {
      setLoading(true);
      const [profileRes, itemsRes] = await Promise.all([
        apiCall("/api/get-profile-complete"),
        apiCall("/api/get-shop-items"),
      ]);

      const mergedData = {
        ...profileRes.shopData,
        items: itemsRes.items || profileRes.shopData.items,
      };

      setShopData(mergedData);
      sessionStorage.setItem("shopData", JSON.stringify(mergedData));
    } catch (err) {
      console.error("Shop load error:", err);
      setError("Failed to load shop data.");
    } finally {
      setLoading(false);
    }
  }

  // --- MEMOIZED DERIVED DATA ------------------------------------------
  const categories = useMemo(() => {
    if (!shopData?.items) return [];
    const catMap = {};
    for (const item of shopData.items) {
      const key =
        item.category ||
        (item.name.toLowerCase().includes("boost")
          ? "Boosters"
          : item.name.toLowerCase().includes("badge")
          ? "Badges"
          : "Other");
      if (!catMap[key]) catMap[key] = [];
      catMap[key].push(item);
    }
    return Object.entries(catMap);
  }, [shopData]);

  // --- LOADING PLACEHOLDER (SKELETON) --------------------------------
  if (loading && !shopData) {
    return (
      <div className="flex flex-col items-center justify-center h-screen text-gray-300">
        <motion.div
          animate={{ opacity: [0.4, 1, 0.4] }}
          transition={{ repeat: Infinity, duration: 1.2 }}
          className="rounded-2xl w-64 h-64 bg-white/5 mb-4"
        />
        <p className="text-sm opacity-75">Loading your Meowchi Shop…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center mt-20 text-red-400">
        <p>{error}</p>
      </div>
    );
  }

  if (!shopData) return null;

  // --- PAGE RENDER ----------------------------------------------------
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.4 }}
      className="min-h-screen pb-24"
    >
      <ShopHeader points={shopData.userPoints} />

      <div className="p-4 space-y-10">
        <Suspense
          fallback={
            <div className="animate-pulse text-gray-500 text-center">
              Preparing items…
            </div>
          }
        >
          {categories.map(([category, items]) => (
            <CategorySection
              key={category}
              title={category}
              items={items}
              ownedBadges={shopData.ownedBadges}
              inventory={shopData.inventory}
            />
          ))}
        </Suspense>
      </div>
    </motion.div>
  );
}
