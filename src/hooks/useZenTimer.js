// src/hooks/useZenTimer.js
import { useState, useEffect } from "react";

/**
 * Hook: useZenTimer
 * Tracks total time spent in active gameplay and reports to backend.
 * Logic identical to your approved implementation for “Уровень дзена”.
 */
export default function useZenTimer(tg, BACKEND_URL, gameStarted, isGameOver) {
  const [gameStartTime, setGameStartTime] = useState(null);
  const [durationSubmitted, setDurationSubmitted] = useState(false);

  // --- Start timer when game begins ---
  useEffect(() => {
    if (gameStarted) {
      setGameStartTime(Date.now());
      setDurationSubmitted(false);
    }
  }, [gameStarted]);

  // --- When game ends, calculate and send duration ---
  useEffect(() => {
    if (isGameOver && gameStartTime && !durationSubmitted) {
      const elapsedSeconds = Math.floor((Date.now() - gameStartTime) / 1000);
      setDurationSubmitted(true);

      if (tg && tg.initData && BACKEND_URL) {
        fetch(`${BACKEND_URL}/api/game/record-time`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ initData: tg.initData, duration: elapsedSeconds }),
        })
          .then((res) => res.json())
          .then((data) => console.log("🧘 Zen time recorded:", data))
          .catch((err) => console.error("Failed to record Zen time:", err));
      }
    }
  }, [isGameOver, gameStartTime, durationSubmitted, tg, BACKEND_URL]);

  return {
    gameStartTime,
    setGameStartTime,
    durationSubmitted,
    setDurationSubmitted,
  };
}
