// v11 — SAFE SHOP PAGE PERF FIXES (Fixes 1, 2, 5)
// - FIX 1: Show Header Immediately (remove skeleton gate; always render ShopHeader with cached fallback).
// - FIX 2: Extend Session Cache for userPoints (read/write separate key; instant header paint).
// - FIX 5: Add Category Skeleton Cards while !data (match final layout scaffolding).
//
// Notes:
// * No backend changes.
// * No risky modifications.
// * All original mechanics preserved.

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { apiCall, showError } from "../../utils/api";
import { ErrorState } from "../../components/ErrorState";

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

  // Detect Telegram Mini App environment
  const isTMA =
    typeof window !== "undefined" && !!window.Telegram?.WebApp?.initData;

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [purchasing, setPurchasing] = useState(null);
  const [justPurchased, setJustPurchased] = useState(null);

  // SAFE FIX 2: cache/fallback for points shown in header immediately
  const [cachedUserPoints, setCachedUserPoints] = useState(() => {
    try {
      const raw = sessionStorage.getItem("userPoints");
      return raw ? parseInt(raw, 10) || 0 : 0;
    } catch {
      return 0;
    }
  });

  useEffect(() => {
    // Read from session cache for instant paint
    const cached = sessionStorage.getItem("shopData");
    if (cached) {
      try {
        const parsed = JSON.parse(cached);
        setData(parsed);
        // Ensure separate points cache stays in sync for header-first paint
        if (typeof parsed?.userPoints === "number") {
          setCachedUserPoints(parsed.userPoints);
          sessionStorage.setItem("userPoints", String(parsed.userPoints));
        }
        setLoading(false);
      } catch {
        sessionStorage.removeItem("shopData");
      }
    }

    // In a normal browser, do not call the backend at all.
    if (!isTMA) {
      // Ensure we don't show a spinner forever if there was no cache.
      setLoading(false);
      return;
    }

    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isTMA]);

  const fetchData = async () => {
    if (!isTMA) return; // safety — never call API outside Telegram
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

      // SAFE FIX 2: keep separate points cache for instant header on next visits
      sessionStorage.setItem("shopData", JSON.stringify(nextData));
      sessionStorage.setItem("userPoints", String(nextData.userPoints));
      setCachedUserPoints(nextData.userPoints);
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
      const item = data?.items?.find((i) => i.id === itemId);
      if (!item) return;

      // Block purchase outside Telegram
      if (!isTMA) {
        showError("Откройте мини-приложение в Telegram, чтобы совершать покупки.");
        return;
      }

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

          // Keep caches in sync for instant header paint after purchase or revisit
          sessionStorage.setItem("shopData", JSON.stringify(updated));
          sessionStorage.setItem("userPoints", String(result.newPoints));
          setCachedUserPoints(result.newPoints);

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
    [purchasing, data?.items, isTMA]
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

  // Helper for the new CTA navigation
  const handleRealCookieCTA = useCallback(() => {
    if (!isTMA) {
      showError("Откройте мини-приложение в Telegram, чтобы оформить заказ.");
      return;
    }
    navigate("/order");
  }, [isTMA, navigate]);

  // If a genuine fetch error occurred inside Telegram, show the explicit error state
  if (error) return <ErrorState error={error} onRetry={fetchData} />;

  // -------- Non-Telegram rendering (browser deep link) --------
  if (!isTMA) {
    return (
      <div className="p-4 space-y-6 bg-background text-primary">
        <div className="rounded-xl border border-yellow-500/30 bg-yellow-500/10 text-yellow-100 px-3 py-2 text-sm">
          Этот магазин работает только внутри мини-приложения Telegram.
          <div className="opacity-80 mt-1">
            Откройте бота и перейдите в «Магазин», чтобы увидеть товары и цены.
          </div>
        </div>

        {/* Header placeholder for visual consistency */}
        <div className="rounded-xl border border-white/10 bg-[#1b1b1b] p-4 max-w-md">
          <div className="text-white font-semibold mb-1">Магазин</div>
          <div className="text-secondary text-sm">
            Авторизация происходит через Telegram внутри мини-приложения.
          </div>
        </div>

        {/* Decorative video kept; does not require backend */}
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

        {/* ===================== */}
        {/* 🎁 Section Header    */}
        {/* ===================== */}
        <div className="max-w-md mx-auto">
          <div className="text-2xl font-semibold text-white mb-3 flex items-center gap-2">
            <span className="text-2xl leading-none">🎁</span>
            <span>쫀득 Real Cookie Power-Up</span>
          </div>
        </div>

        {/* Card (title removed; ownership removed) */}
        <div className="max-w-md mx-auto -mt-2">
          <div className="rounded-2xl border border-white/10 bg-[#1b1b1b] p-4">
            <div className="flex items-start gap-3">
              <div className="flex-1">
                <div className="text-secondary text-sm mt-1 space-y-1">
                  <p>Закажи настоящее печенье Meowchi и получи игровые бусты!</p>
                  <p>
                    Виртуальные 쫀득-вайбы не enough? Попробуй настоящую bouncy текстуру +<br />
                    Time Booster ×3<br />
                    Cookie Bomb ×3<br />
                    Point Multipliers ×3
                  </p>
                </div>
                <div className="flex items-center justify-end mt-4">
                  <button
                    type="button"
                    onClick={handleRealCookieCTA}
                    className="px-4 py-2 rounded-xl bg-yellow-400 text-black font-semibold shadow hover:brightness-95 active:brightness-90 transition inline-flex items-center gap-2"
                  >
                    <span className="text-black/90">⭐</span>
                    <span>Заказать</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Static categories placeholders (empty lists) to keep layout stable */}
        {["time", "bomb", "multiplier"].map((category) => (
          <CategorySection
            key={category}
            category={category}
            items={[]}
            userPoints={0}
            inventory={[]}
            ownedBadges={[]}
            onPurchase={() =>
              showError("Откройте мини-приложение в Telegram, чтобы покупать.")
            }
            purchasing={null}
            justPurchased={null}
          />
        ))}
      </div>
    );
  }

  // -------- Telegram rendering --------
  return (
    <div className="p-4 space-y-6 bg-background text-primary">
      {/* SAFE FIX 1: Always render header immediately with cached fallback */}
      <ShopHeader points={data?.userPoints ?? cachedUserPoints ?? 0} />

      {/* 🍪 Meowchi WebM Header Section (visual only; does not block) */}
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

      {/* ===================== */}
      {/* 🎁 Section Header    */}
      {/* ===================== */}
      <div className="max-w-md mx-auto">
        <div className="text-2xl font-semibold text-white mb-3 flex items-center gap-2">
          <span className="text-2xl leading-none">🎁</span>
          <span>쫀득 Real Cookie Power-Up</span>
        </div>
      </div>

      {/* [Real Cookie Power-Up Card] — title removed; ownership removed */}
      <div className="max-w-md mx-auto -mt-2">
        <div className="rounded-2xl border border-white/10 bg-[#1b1b1b] p-4">
          <div className="flex items-start gap-3">
            <div className="flex-1">
              <div className="text-secondary text-sm mt-1 space-y-1">
                <p>Закажи настоящее печенье Meowchi и получи игровые бусты!</p>
                <p>
                  Виртуальные 쫀득-вайбы не enough? Попробуй настоящую bouncy текстуру +<br />
                  Time Booster ×3<br />
                  Cookie Bomb ×3<br />
                  Point Multipliers ×3
                </p>
              </div>
              <div className="flex items-center justify-end mt-4">
                <button
                  type="button"
                  onClick={handleRealCookieCTA}
                  className="px-4 py-2 rounded-xl bg-yellow-400 text-black font-semibold shadow hover:brightness-95 active:brightness-90 transition inline-flex items-center gap-2"
                >
                  <span className="text-black/90">⭐</span>
                  <span>Заказать</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* SAFE FIX 5: Category Skeletons while data is not ready */}
      {(!data || loading) && (
        <div className="max-w-md mx-auto space-y-6">
          {["time", "bomb", "multiplier"].map((cat) => (
            <div key={`skel-${cat}`} className="space-y-3">
              <div className="h-6 w-36 bg-white/10 rounded" />
              <div className="grid grid-cols-3 gap-3">
                {[0, 1, 2].map((i) => (
                  <div
                    key={`skel-card-${cat}-${i}`}
                    className="rounded-2xl border border-white/10 bg-[#1b1b1b] p-3 animate-pulse"
                  >
                    <div className="h-16 bg-white/10 rounded mb-3" />
                    <div className="h-4 bg-white/10 rounded w-3/4 mb-2" />
                    <div className="h-4 bg-white/10 rounded w-1/2" />
                    <div className="mt-3 h-8 bg-white/10 rounded" />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Shop Categories — always render; hydrate with data when ready */}
      {["time", "bomb", "multiplier"].map((category) => (
        <CategorySection
          key={category}
          category={category}
          items={itemsByCategory[category]}
          userPoints={data?.userPoints ?? cachedUserPoints ?? 0}
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
