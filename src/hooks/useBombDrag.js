// src/hooks/useBombDrag.js
import { useState, useCallback, useEffect } from "react";

/**
 * Hook: useBombDrag
 * Handles drag-and-drop logic for Cookie Bombs.
 * v3 — fixes undefined setter bug, disables screen scroll during drag, preserves gameplay.
 */
export default function useBombDrag(tg, BACKEND_URL) {
  const [isDraggingBomb, setIsDraggingBomb] = useState(false);
  const [ghostBombPosition, setGhostBombPosition] = useState({ x: 0, y: 0 });
  const [gameBoardRef, setGameBoardRef] = useState(null);

  // --- Start dragging the bomb ---
  const startDraggingBomb = useCallback(
    (e, availableItems) => {
      const bombItem = availableItems.find((item) => item.item_id === 3);
      if (!bombItem || bombItem.quantity <= 0 || isDraggingBomb) return;

      setIsDraggingBomb(true);
      const x = e.clientX || (e.touches && e.touches[0]?.clientX) || 0;
      const y = e.clientY || (e.touches && e.touches[0]?.clientY) || 0;
      setGhostBombPosition({ x, y });

      if (window.Telegram?.WebApp?.HapticFeedback) {
        window.Telegram.WebApp.HapticFeedback.impactOccurred("medium");
      }

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

              // ✅ Proper state update (no 'p is not a function' error)
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

  // --- Global pointer listeners (prevent scrolling while dragging) ---
  useEffect(() => {
    if (isDraggingBomb) {
      const preventScroll = (e) => e.preventDefault();
      document.body.style.overscrollBehavior = "none";
      document.body.style.touchAction = "none";

      const pointerMoveHandler = (e) => handlePointerMove(e);
      const pointerUpHandler = (e) =>
        handlePointerUp(e, window._availableItemsRef, window._setAvailableItemsRef);

      document.addEventListener("pointermove", pointerMoveHandler, { passive: false });
      document.addEventListener("pointerup", pointerUpHandler, { passive: false });
      document.addEventListener("touchmove", pointerMoveHandler, { passive: false });
      document.addEventListener("touchend", pointerUpHandler, { passive: false });
      document.addEventListener("scroll", preventScroll, { passive: false });

      return () => {
        document.body.style.overscrollBehavior = "";
        document.body.style.touchAction = "";
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
    // state
    isDraggingBomb,
    ghostBombPosition,
    gameBoardRef,
    setGameBoardRef,

    // handlers
    startDraggingBomb,
    handlePointerMove,
    handlePointerUp,
    registerInventoryRefs,
  };
}
