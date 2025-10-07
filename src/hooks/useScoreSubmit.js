// src/hooks/useScoreSubmit.js
import { useEffect, useRef, useState } from "react";

/**
 * Hook: useScoreSubmit
 * Submits score exactly once when a game ends.
 * Minimal, targeted fix:
 *  1) Idempotent guard to prevent duplicate POSTs
 *  2) On success, fetch fresh stats and broadcast them so Profile updates immediately
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

        // 1) Submit final score (authoritative increment happens on the server)
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

        // Read the response if present (may include new_points)
        let upd = null;
        try {
          upd = await res.json();
        } catch (_) {
          upd = null;
        }

        // 2) Immediately fetch fresh user stats so Profile can reflect the new total
        //    (keeps single source of truth = server; no optimistic math here)
        let fresh = null;
        try {
          const s = await fetch(`${BACKEND_URL}/api/get-user-stats`, {
            method: "GET",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
          });
          if (s.ok) fresh = await s.json();
        } catch (_) {
          // ignore fetch errors, we still publish new_points if available
        }

        // Prefer server stats if available; fall back to update-score payload’s new_points
        const serverPoints =
          typeof fresh?.points === "number" ? fresh.points :
          typeof fresh?.data?.points === "number" ? fresh.data.points :
          typeof upd?.new_points === "number" ? upd.new_points :
          null;

        // 3) Broadcast updates for subscribers (Profile / Overview can react)
        if (serverPoints !== null) {
          try {
            window.dispatchEvent(
              new CustomEvent("meowchi:points-updated", { detail: { points: serverPoints } })
            );
            // Also broadcast full stats if we have them
            if (fresh && typeof fresh === "object") {
              window.dispatchEvent(
                new CustomEvent("meowchi:stats-updated", { detail: { stats: fresh } })
              );
            }
          } catch (_) {}
          // 4) Persist for components hydrating from storage
          try {
            sessionStorage.setItem("meowchi:points", String(serverPoints));
            localStorage.setItem("meowchi:points", String(serverPoints));
            if (fresh) {
              sessionStorage.setItem("meowchi:stats", JSON.stringify(fresh));
              localStorage.setItem("meowchi:stats", JSON.stringify(fresh));
            }
          } catch (_) {}
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
