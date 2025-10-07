// src/hooks/useScoreSubmit.js
import { useEffect, useRef, useState } from "react";

/**
 * Hook: useScoreSubmit
 * Submits score exactly once when a game ends.
 * Minimal, targeted fix:
 *  - Add idempotent guard to prevent duplicate POSTs
 *  - After success, broadcast authoritative points to update Profile immediately
 */
export default function useScoreSubmit(tg, BACKEND_URL, score, isGameOver) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const submittedRef = useRef(false); // ✅ prevents duplicate submits per game over

  // Reset latch when a new round starts
  useEffect(() => {
    if (!isGameOver) submittedRef.current = false;
  }, [isGameOver]);

  useEffect(() => {
    if (!isGameOver || isSubmitting || submittedRef.current) return;

    const submitScore = async () => {
      setIsSubmitting(true);
      try {
        // keep your current auth/path contract: initData + score
        if (score > 0 && tg && tg.initData && BACKEND_URL) {
          // latch immediately to avoid re-submits from re-renders
          submittedRef.current = true;

          const res = await fetch(`${BACKEND_URL}/api/update-score`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ initData: tg.initData, score }),
          });

          let data = null;
          try {
            data = await res.json();
          } catch (_) {
            // backend might not always return JSON; ignore silently
          }

          if (res.ok) {
            console.log("✅ Score submitted successfully:", data);

            // ⬇️ NEW: broadcast authoritative total so Profile updates immediately
            const newPoints = Number(data?.new_points);
            if (!Number.isNaN(newPoints)) {
              try {
                window.dispatchEvent(
                  new CustomEvent("meowchi:points-updated", { detail: { points: newPoints } })
                );
              } catch (_) {}
              try {
                sessionStorage.setItem("meowchi:points", String(newPoints));
                localStorage.setItem("meowchi:points", String(newPoints));
              } catch (_) {}
            }
          } else {
            console.error("❌ Score submission failed:", data?.error ?? res.status);
            // allow retry in this game-over phase if server rejected
            submittedRef.current = false;
          }
        }
      } catch (err) {
        console.error("⚠️ Error submitting score:", err);
        // allow retry on hard failure
        submittedRef.current = false;
      } finally {
        setIsSubmitting(false);
      }
    };

    // Submit immediately (no delay) to avoid racing Profile fetches
    submitScore();

    return () => {};
  }, [isGameOver, score, isSubmitting, tg, BACKEND_URL]);

  return { isSubmitting, setIsSubmitting };
}
