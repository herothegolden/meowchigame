// src/hooks/useScoreSubmit.js
import { useEffect, useRef, useState } from "react";

/**
 * Hook: useScoreSubmit
 * Submits score exactly once when a game ends.
 * Minimal, targeted fix: idempotent guard to prevent duplicate POSTs.
 */
export default function useScoreSubmit(tg, BACKEND_URL, score, isGameOver) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const submittedRef = useRef(false); // ✅ prevents duplicate submits per game end

  useEffect(() => {
    // reset idempotency latch when leaving game-over state (i.e., new round can submit again)
    if (!isGameOver) submittedRef.current = false;
  }, [isGameOver]);

  useEffect(() => {
    if (!isGameOver || isSubmitting || submittedRef.current) return;

    const submitScore = async () => {
      try {
        submittedRef.current = true; // ✅ latch immediately
        setIsSubmitting(true);

        const user = tg?.initDataUnsafe?.user;
        if (!user?.id || !BACKEND_URL) throw new Error("Missing Telegram user or BACKEND_URL");

        const res = await fetch(`${BACKEND_URL}/api/update-score`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            score,
            duration: 30,
            itemsUsed: [],
          }),
        });

        if (!res.ok) throw new Error(`update-score failed: ${res.status}`);
        // We intentionally do not do any optimistic client-side addition here.
        // The Profile will reflect the authoritative server value via subsequent fetch.

      } catch (err) {
        console.error("⚠️ Error submitting score:", err);
        // allow retry on hard failure within this game over phase
        submittedRef.current = false;
      } finally {
        setIsSubmitting(false);
      }
    };

    submitScore();
    return () => {};
  }, [isGameOver, score, isSubmitting, tg, BACKEND_URL]);

  return { isSubmitting };
}
