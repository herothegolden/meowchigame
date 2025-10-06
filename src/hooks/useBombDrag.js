// src/hooks/useBombDrag.js
import { useState, useCallback, useEffect } from "react";

/**
 * Hook: useBombDrag
 * Fix v4 — Immediate scroll lock to prevent viewport jumping during drag.
 */
export default function useBombDrag(tg, BACKEND_URL) {
  const [isDraggingBomb, setIsDraggingBomb] = useState(false);
  const [ghostBombPosition, setGhostBombPosition] = useState({ x: 0, y: 0 });
  const [gameBoardRef, setGameBoardRef] = useState(null);

  // 🔒 Ensure Telegram viewport doesn’t scroll independently
  useEffect(() => {
    try {
      tg?.expand();
      window.Telegram?.WebApp?.expand();
    } catch (_) {}
  }, [tg]);

  // --- Start dragging the bomb ---
  const startDraggingBomb = useCallback(
    (e, availableItems) => {
      const bombItem = availableItems.find((item) => item.item_id === 3);
      if (!bombItem || bombItem.quantity <= 0 || isDraggingBomb) return;

      // ✅ Immediate scroll lock BEFORE render update
      document.body.style.touchAction = "none";
      document.body.style.overscrollBehavior = "none";
      document.documentElement.style.touchAction = "none";
      document.documentElement.style.overscrollBehavior = "none";

      setIsDraggingBomb(true);
      const x = e.clientX || (e.touches && e.touches[0]?.clientX) || 0;
      const y = e.clientY || (e.touches && e.touches[0]?.clientY) || 0;
      setGhostBombPosition({ x, y });

      if (window.Telegram?.WebApp?.HapticFeedback) {
        window.Telegram.WebApp.HapticFeedback.impactOccurred("medium");
      }

      // Prevent browser scroll start
      e.preventDefault();
    },
    [isDraggingBomb]
  );

  // --- Handle pointer move ---
  const handlePointerMove = useCallback(
    (e) => {
      if (!isDraggingBomb) return;
      const x = e.clientX || (e.touches && e.touches[0]?.clientX) || 0;
      const y = e.clientY || (e.touches && e.touches[0]?.clientY) || 0;
      setGhostBombPosition({ x, y });
      e.preventDefault();
    },
    [isDraggingBomb]
  );

  // --- Handle pointer up (drop event) ---
  const handlePointerUp = useCallback(
    async (e, availableItems, setAvailableItems) => {
      if (!isDraggingBomb) return;
      setIsDraggingBomb(false);

      // ✅ Unlock scroll immediately
      document.body.style.touchAction = "";
      document.body.style.overscrollBehavior = "";
      document.documentElement.style.touchAction = "";
      document.documentElement.style.overscrollBehavior = "";

      const x = e.clientX || (e.changedTouches && e.changedTouches[0]?.clientX) || 0;
      const y = e.clientY || (e.changedTouches && e.changedTouches[0]?.clientY) || 0;
      const targetEl = document.elementFromPoint(x, y);

      if (targetEl && gameBoardRef) {
        const boardEl = gameBoardRef.getBoardElement?.();
        if (boardEl && boardEl.contains(targetEl)) {
          const rect = boardEl.getBoundingClientRect();
          const cell = rect.width / 6;
          const relX = x - rect.left;
          const relY = y - rect.top;
          const col = Math.floor(relX / cell);
          const row = Math.floor(relY / cell);

          if (row >= 0 && row < 6 && col >= 0 && col < 6) {
            try {
              if (!tg || !tg.initData || !BACKEND_URL)
                throw new Error("Connection required");

              const res = await fetch(`${BACKEND_URL}/api/use-bomb`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ initData: tg.initData, itemId: 3 }),
              });

              const result = await res.json();
              if (!res.ok) throw new Error(result.error || "Failed to use bomb");

              // Update inventory count
              setAvailableItems((prev) =>
                prev
                  .map((item) =>
                    item.item_id === 3
                      ? { ...item, quantity: item.quantity - 1 }
                      : item
                  )
                  .filter((item) => item.quantity > 0)
              );

              // Notify board
              gameBoardRef.handleBombDrop?.({ row, col });

              if (window.Telegram?.WebApp?.HapticFeedback) {
                window.Telegram.WebApp.HapticFeedback.impactOccurred("heavy");
              }
            } catch (error) {
              console.error("Bomb usage error:", error);
              if (tg?.showPopup) {
                tg.showPopup({
                  title: "Error",
                  message: error.message,
                  buttons: [{ type: "ok" }],
                });
              }
            }
          }
        }
      }

      e.preventDefault();
    },
    [isDraggingBomb, gameBoardRef, tg, BACKEND_URL]
  );

  // --- Global pointer listeners (preserved, ensures smooth drag) ---
  useEffect(() => {
    if (isDraggingBomb) {
      const preventScroll = (e) => e.preventDefault();
      const pointerMoveHandler = (e) => handlePointerMove(e);
      const pointerUpHandler = (e) =>
        handlePointerUp(e, window._availableItemsRef, window._setAvailableItemsRef);

      document.addEventListener("pointermove", pointerMoveHandler, { passive: false });
      document.addEventListener("pointerup", pointerUpHandler, { passive: false });
      document.addEventListener("touchmove", pointerMoveHandler, { passive: false });
      document.addEventListener("touchend", pointerUpHandler, { passive: false });
      document.addEventListener("scroll", preventScroll, { passive: false });

      return () => {
        document.removeEventListener("pointermove", pointerMoveHandler);
        document.removeEventListener("pointerup", pointerUpHandler);
        document.removeEventListener("touchmove", pointerMoveHandler);
        document.removeEventListener("touchend", pointerUpHandler);
        document.removeEventListener("scroll", preventScroll);
      };
    }
  }, [isDraggingBomb, handlePointerMove, handlePointerUp]);

  // --- Provide helpers to GamePage so we can pass inventory refs ---
  const registerInventoryRefs = useCallback((availableItems, setAvailableItems) => {
    window._availableItemsRef = availableItems;
    window._setAvailableItemsRef = setAvailableItems;
  }, []);

  return {
    isDraggingBomb,
    ghostBombPosition,
    gameBoardRef,
    setGameBoardRef,
    startDraggingBomb,
    handlePointerMove,
    handlePointerUp,
    registerInventoryRefs,
  };
}
