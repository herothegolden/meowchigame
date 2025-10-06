// src/hooks/useScoreSubmit.js
import { useEffect, useState } from "react";

/**
 * Hook: useScoreSubmit
 * Handles automatic score submission after each game.
 * Logic identical to the original GamePage implementation.
 */
export default function useScoreSubmit(tg, BACKEND_URL, score, isGameOver) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!isGameOver || isSubmitting) return;

    const submitScore = async () => {
      setIsSubmitting(true);
      if (score > 0 && tg && tg.initData && BACKEND_URL) {
        try {
          const res = await fetch(`${BACKEND_URL}/api/update-score`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ initData: tg.initData, score }),
          });
          const data = await res.json();
          if (res.ok) console.log("✅ Score submitted successfully:", data);
          else console.error("❌ Score submission failed:", data.error);
        } catch (err) {
          console.error("⚠️ Error submitting score:", err);
        }
      }
      setIsSubmitting(false);
    };

    const timeoutId = setTimeout(submitScore, 1000);
    return () => clearTimeout(timeoutId);
  }, [isGameOver, score, isSubmitting, tg, BACKEND_URL]);

  return { isSubmitting, setIsSubmitting };
}
