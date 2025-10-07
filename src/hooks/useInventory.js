// src/hooks/useInventory.js
import { useState, useEffect, useCallback } from "react";
import soundManager from "../utils/SoundManager";

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL;

/**
 * Hook: useInventory
 * Handles inventory, boosters, and item use logic exactly as in GamePage.jsx.
 * No behavioral changes. Plug-and-play replacement.
 */
export default function useInventory(tg) {
  const [availableItems, setAvailableItems] = useState([]);
  const [inventory, setInventory] = useState([]);
  const [inventoryError, setInventoryError] = useState(null);
  const [isActivatingItem, setIsActivatingItem] = useState(null);

  const [boosterTimeLeft, setBoosterTimeLeft] = useState(0);
  const [boosterActive, setBoosterActive] = useState(false);
  const [activeBoosts, setActiveBoosts] = useState({ pointMultiplier: false });

  // --- Booster countdown identical logic ---
  useEffect(() => {
    if (boosterTimeLeft > 0) {
      const timer = setInterval(() => {
        setBoosterTimeLeft((prev) => {
          if (prev <= 1) {
            setBoosterActive(false);
            setActiveBoosts((p) => ({ ...p, pointMultiplier: false }));
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [boosterTimeLeft]);

  useEffect(() => {
    return () => {
      setBoosterTimeLeft(0);
      setBoosterActive(false);
    };
  }, []);

  // --- Load inventory from backend ---
  const loadInventory = useCallback(async () => {
    try {
      if (!tg || !tg.initData || !BACKEND_URL) {
        console.error("Cannot load inventory: Missing Telegram data or backend URL");
        setInventoryError("Connection required. Please open from Telegram.");
        setAvailableItems([]);
        setInventory([]);
        return;
      }

      const res = await fetch(`${BACKEND_URL}/api/get-shop-data`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ initData: tg.initData }),
      });

      if (!res.ok) {
        console.error("Failed to fetch inventory:", res.status);
        setInventoryError("Failed to load inventory from server.");
        setAvailableItems([]);
        setInventory([]);
        return;
      }

      const shopData = await res.json();
      let userInventory = shopData.inventory || [];
      userInventory = userInventory.filter((item) => item.item_id !== 2);

      setAvailableItems(userInventory);
      const consumableItems = userInventory.filter(
        (item) => item.item_id === 4 && item.quantity > 0
      );
      setInventory(consumableItems);

      // Booster expiration logic identical to GamePage
      if (shopData.boosterExpiresAt) {
        const expirationTime = new Date(shopData.boosterExpiresAt);
        const now = new Date();
        if (expirationTime > now) {
          const secondsLeft = Math.ceil((expirationTime - now) / 1000);
          setBoosterTimeLeft(secondsLeft);
          setBoosterActive(true);
          setActiveBoosts((p) => ({ ...p, pointMultiplier: true }));
        }
      }

      setInventoryError(null);
    } catch (error) {
      console.error("Error loading inventory:", error);
      setInventoryError("Network error. Please check your connection.");
      setAvailableItems([]);
      setInventory([]);
    }
  }, [tg]);

  // --- Handle item use identical to GamePage ---
  const handleUseItem = useCallback(
    async (itemId, setTimeLeft) => {
      const item = availableItems.find((i) => i.item_id === itemId);
      if (!item || item.quantity <= 0) return;

      setIsActivatingItem(itemId);
      try {
        if (!tg || !tg.initData || !BACKEND_URL)
          throw new Error("Connection required. Please open from Telegram.");

        if (itemId === 1) {
          // Extra Time +10s
          const res = await fetch(`${BACKEND_URL}/api/use-time-booster`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ initData: tg.initData, itemId: 1, timeBonus: 10 }),
          });
          const result = await res.json();
          if (!res.ok) throw new Error(result.error || "Failed to use time booster");

          soundManager.playCore("power_up", { volume: 0.9 });
          setTimeLeft?.((p) => p + 10);

          setAvailableItems((prev) =>
            prev
              .map((inv) =>
                inv.item_id === itemId
                  ? { ...inv, quantity: inv.quantity - 1 }
                  : inv
              )
              .filter((inv) => inv.quantity > 0)
          );
          tg?.HapticFeedback?.impactOccurred("medium");
        } else if (itemId === 4) {
          // Double Points
          const res = await fetch(`${BACKEND_URL}/api/activate-item`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ initData: tg.initData, itemId: 4 }),
          });
          const result = await res.json();

          if (!res.ok)
            console.warn("Double Points activation warning:", result.error);

          setBoosterTimeLeft(20);
          setBoosterActive(true);
          setActiveBoosts((p) => ({ ...p, pointMultiplier: true }));

          setAvailableItems((prev) =>
            prev
              .map((inv) =>
                inv.item_id === itemId
                  ? { ...inv, quantity: inv.quantity - 1 }
                  : inv
              )
              .filter((inv) => inv.quantity > 0)
          );
          tg?.HapticFeedback?.notificationOccurred("success");
        }
      } catch (error) {
        console.error("Item usage error:", error);
        if (!error.message.includes("already active")) {
          if (tg?.showPopup) {
            tg.showPopup({
              title: "Error",
              message: error.message,
              buttons: [{ type: "ok" }],
            });
          } else {
            alert(error.message);
          }
        }
      } finally {
        setIsActivatingItem(null);
      }
    },
    [availableItems, tg]
  );

  // --- Return interface ---
  return {
    // state
    availableItems,
    inventory,
    inventoryError,
    isActivatingItem,
    boosterTimeLeft,
    boosterActive,
    activeBoosts,

    // actions
    loadInventory,
    handleUseItem,
  };
}
