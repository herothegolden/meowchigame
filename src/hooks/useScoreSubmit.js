// src/hooks/useScoreSubmit.js
import { useEffect, useState } from "react";

/**
 * Hook: useScoreSubmit
 * Submits the score when the game ends.
 * On success, dispatches "points:updated" so Profile can refetch lifetime points immediately.
 *
 * Usage:
 *   const { isSubmitting } = useScoreSubmit(tg, import.meta.env.VITE_BACKEND_URL, score, isGameOver);
 */
export default function useScoreSubmit(tg, BACKEND_URL, score, isGameOver) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    // Guardrails: only submit once, only if game is over and we have a positive score.
    if (!isGameOver || isSubmitting) return;

    const submitScore = async () => {
      setIsSubmitting(true);
      try {
        const initData = tg?.initData;
        const validScore = Number.isFinite(Number(score)) ? Number(score) : 0;

        if (!BACKEND_URL || !initData) {
          console.error("⚠️ Missing BACKEND_URL or Telegram initData");
          return;
        }
        if (validScore <= 0) {
          console.log("ℹ️ Score is zero or invalid; skipping submit.");
          return;
        }

        const res = await fetch(`${BACKEND_URL}/api/update-score`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ initData, score: validScore }),
        });

        const data = await res.json().catch(() => ({}));

        if (!res.ok) {
          console.error("❌ Score submission failed:", data?.error || res.status);
          return;
        }

        // ✅ Success: notify any listeners (ProfilePage) to refetch totals immediately
        try {
          const detail = {
            score_awarded: data?.score_awarded ?? validScore,
            new_points: data?.new_points, // if backend returns this
            high_score: data?.high_score,
            games_played: data?.games_played,
            at: Date.now(),
          };
          if (typeof window !== "undefined") {
            window.dispatchEvent(new CustomEvent("points:updated", { detail }));
          }
        } catch (e) {
          // Non-browser / SSR safe; no-op
        }

        console.log("✅ Score submitted successfully:", data);
      } catch (err) {
        console.error("⚠️ Error submitting score:", err);
      } finally {
        setIsSubmitting(false);
      }
    };

    // Submit immediately after game over
    submitScore();

    return () => {};
  }, [isGameOver, score, isSubmitting, tg, BACKEND_URL]);

  return { isSubmitting, setIsSubmitting };
}
