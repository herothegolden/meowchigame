// src/hooks/useScoreSubmit.js
import { useEffect, useRef, useState } from "react";

/**
 * Hook: useScoreSubmit
 * Submits score exactly once when a game ends.
 * Minimal, targeted fix: idempotent guard + broadcast updated points on success.
 */
export default function useScoreSubmit(tg, BACKEND_URL, score, isGameOver) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const submittedRef = useRef(false); // ✅ prevents duplicate submits per game end

  // Reset the latch when leaving game-over state (new round can submit again)
  useEffect(() => {
    if (!isGameOver) submittedRef.current = false;
  }, [isGameOver]);

  useEffect(() => {
    if (!isGameOver || isSubmitting || submittedRef.current) return;

    const submitScore = async () => {
      try {
        submittedRef.current = true; // ✅ latch immediately to avoid duplicate POSTs
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

        // ⬇️ NEW: read authoritative total and push it to interested subscribers
        let data = null;
        try {
          data = await res.json();
        } catch (_) {
          // If backend returns empty body, we simply skip broadcasting.
          data = null;
        }

        const newPoints = Number(data?.new_points);
        if (!Number.isNaN(newPoints)) {
          // 1) Broadcast an app-wide event for immediate UI updates (Profile can subscribe)
          window.dispatchEvent(
            new CustomEvent("meowchi:points-updated", { detail: { points: newPoints } })
          );
          // 2) Persist to storage in case Profile/Overview reads from cache on focus
          try {
            sessionStorage.setItem("meowchi:points", String(newPoints));
            localStorage.setItem("meowchi:points", String(newPoints));
          } catch (_) {
            // storage can fail in private mode; silently ignore
          }
        }

        // Optional: haptic "success" feedback
        try {
          tg?.HapticFeedback?.notificationOccurred?.("success");
        } catch (_) {}

      } catch (err) {
        console.error("⚠️ Error submitting score:", err);
        // allow retry on hard failure within this game-over phase
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
