// src/hooks/useScoreSubmit.js
import { useEffect, useRef, useState } from "react";

/**
 * Hook: useScoreSubmit
 * Submits score exactly once when a game ends.
 * Minimal, targeted fix:
 *  - Idempotent guard to prevent duplicate POSTs
 *  - Post body includes all common server keys (score/finalScore/points)
 *  - On success, broadcast authoritative points; fallback GET if needed
 */
export default function useScoreSubmit(tg, BACKEND_URL, score, isGameOver) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const submittedRef = useRef(false); // prevents duplicate submits per game over

  // Reset latch when a new round starts
  useEffect(() => {
    if (!isGameOver) submittedRef.current = false;
  }, [isGameOver]);

  useEffect(() => {
    if (!isGameOver || isSubmitting || submittedRef.current) return;

    const submitScore = async () => {
      setIsSubmitting(true);
      try {
        if (score > 0 && tg && tg.initData && BACKEND_URL) {
          submittedRef.current = true;

          const final = Number(score) || 0;
          const payload = {
            initData: tg.initData,
            score: final,        // primary key some servers expect
            finalScore: final,   // alt key some servers expect
            points: final,       // alt key some servers expect
            duration: 30,        // keep for compatibility
            itemsUsed: []        // keep for compatibility
          };

          const res = await fetch(`${BACKEND_URL}/api/update-score`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          });

          // Attempt to parse JSON, but tolerate empty bodies
          let data = null;
          try { data = await res.json(); } catch (_) {}

          // Extract new total from any of the common shapes
          const num = (v) => (typeof v === "number" && !Number.isNaN(v) ? v : null);
          let newTotal =
            num(data?.new_points) ??
            num(data?.points) ??
            num(data?.data?.points) ??
            null;

          // If response doesn't contain the updated total, do a single fallback fetch
          if (res.ok && newTotal === null) {
            try {
              const s = await fetch(`${BACKEND_URL}/api/get-user-stats`, {
                method: "GET",
                headers: { "Content-Type": "application/json" }
              });
              if (s.ok) {
                const fresh = await s.json();
                newTotal =
                  num(fresh?.points) ??
                  num(fresh?.data?.points) ??
                  null;

                if (newTotal !== null) {
                  try {
                    window.dispatchEvent(
                      new CustomEvent("meowchi:stats-updated", { detail: { stats: fresh } })
                    );
                    sessionStorage.setItem("meowchi:stats", JSON.stringify(fresh));
                    localStorage.setItem("meowchi:stats", JSON.stringify(fresh));
                  } catch (_) {}
                }
              }
            } catch (_) {
              // ignore fallback errors
            }
          }

          // Broadcast and persist if we have an authoritative number
          if (res.ok && newTotal !== null) {
            try {
              window.dispatchEvent(
                new CustomEvent("meowchi:points-updated", { detail: { points: newTotal } })
              );
              sessionStorage.setItem("meowchi:points", String(newTotal));
              localStorage.setItem("meowchi:points", String(newTotal));
            } catch (_) {}
          }

          // If server rejected, allow re-submit within this game-over phase
          if (!res.ok) {
            submittedRef.current = false;
          }
        }
      } catch (_) {
        // allow retry on hard failure
        submittedRef.current = false;
      } finally {
        setIsSubmitting(false);
      }
    };

    submitScore();
    return () => {};
  }, [isGameOver, score, isSubmitting, tg, BACKEND_URL]);

  return { isSubmitting, setIsSubmitting };
}
