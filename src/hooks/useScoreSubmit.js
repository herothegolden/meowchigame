// src/hooks/useScoreSubmit.js
import { useEffect, useRef, useState } from "react";

/**
 * Hook: useScoreSubmit
 * Submits score exactly once when a game ends.
 * Adds server-side idempotency support by attaching a client-generated gameId (UUID).
 */
export default function useScoreSubmit(tg, BACKEND_URL, score, isGameOver) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const submittedRef = useRef(false);        // prevents duplicate submits per game over
  const gameIdRef = useRef(null);            // stable id for this game's submission window

  // UUID generator with browser crypto fallback
  const makeUuid = () => {
    if (typeof crypto !== "undefined" && crypto.randomUUID) {
      return crypto.randomUUID();
    }
    // RFC4122-ish fallback
    return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, c => {
      const r = (Math.random() * 16) | 0;
      const v = c === "x" ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  };

  // Reset latch and gameId when a new round starts
  useEffect(() => {
    if (!isGameOver) {
      submittedRef.current = false;
      gameIdRef.current = null;
    }
  }, [isGameOver]);

  useEffect(() => {
    if (!isGameOver || isSubmitting || submittedRef.current) return;

    const submitScore = async () => {
      setIsSubmitting(true);
      try {
        if (score > 0 && tg && tg.initData && BACKEND_URL) {
          submittedRef.current = true;

          // Ensure a stable gameId for this finished game
          if (!gameIdRef.current) {
            gameIdRef.current = makeUuid();
          }

          const final = Number(score) || 0;
          const payload = {
            initData: tg.initData,
            score: final,        // compatibility keys
            finalScore: final,   // "
            points: final,       // "
            duration: 30,        // keep for compatibility
            itemsUsed: [],       // keep for compatibility
            gameId: gameIdRef.current, // 🔒 idempotency key
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

          // If response doesn't contain updated total, do a single fallback fetch
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

          // If server rejected, allow re-submit within this game-over phase (same gameId)
          if (!res.ok) {
            submittedRef.current = false;
          }
        }
      } catch (_) {
        // allow retry on hard failure (same gameId)
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
