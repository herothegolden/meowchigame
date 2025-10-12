// src/hooks/useShuffle.js
import { useState, useEffect, useCallback } from "react";

/**
 * Hook: useShuffle
 * Encapsulates shuffle logic (cooldown, counters, function binding)
 * Identical mechanics to current GamePage.jsx.
 */
export default function useShuffle() {
  const [shuffleNeeded, setShuffleNeeded] = useState(false);
  const [shuffleCount, setShuffleCount] = useState(0);
  const [shuffleCooldown, setShuffleCooldown] = useState(0);
  const [shuffleFunction, setShuffleFunction] = useState(null);

  // Cooldown timer identical to GamePage
  useEffect(() => {
    if (shuffleCooldown > 0) {
      const timer = setInterval(() => {
        setShuffleCooldown((prev) => Math.max(0, prev - 1));
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [shuffleCooldown]);

  // Called when GameBoard signals need for shuffle
  const handleShuffleNeeded = useCallback((needed) => {
    setShuffleNeeded(needed);
  }, []);

  // Called when GameBoard is ready and exposes its shuffle() function
  const handleBoardReady = useCallback((fn) => {
    setShuffleFunction(() => fn);
  }, []);

  // Perform shuffle with cooldown & haptic feedback
  const handleShuffle = useCallback(
    (gameStarted, isGameOver) => {
      if (!shuffleFunction || shuffleCooldown > 0 || !gameStarted || isGameOver) return;

      try {
        const shuffleResult = shuffleFunction();
        if (shuffleResult !== false) {
          setShuffleCount((prev) => prev + 1);
          setShuffleCooldown(10);
          setShuffleNeeded(false);

          if (window.Telegram?.WebApp?.HapticFeedback) {
            window.Telegram.WebApp.HapticFeedback.impactOccurred("heavy");
          }
        }
      } catch (error) {
        console.error("Error executing shuffle:", error);
      }
    },
    [shuffleFunction, shuffleCooldown]
  );

  return {
    shuffleNeeded,
    setShuffleNeeded,
    shuffleCount,
    setShuffleCount,
    shuffleCooldown,
    setShuffleCooldown,
    shuffleFunction,
    setShuffleFunction,
    handleShuffleNeeded,
    handleBoardReady,
    handleShuffle,
  };
}
