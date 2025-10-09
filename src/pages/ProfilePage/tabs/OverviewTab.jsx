// Path: frontend/src/pages/ProfilePage/tabs/OverviewTab.jsx
// v20 — Deterministic 42nd-tap CTA trigger
// - NEW: optional onReached42 callback fired exactly once when taps reach ≥42.
// - IMPROVED: Fire trigger immediately on optimistic 41→42 increment, in addition to
//   server reconciliation and guard effect (covers throttle/race).

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";

// Helper: convert seconds → "Xч Yм"
const formatPlayTime = (seconds) => {
  if (!seconds || isNaN(seconds)) return "0ч 0м";
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  return `${hrs}ч ${mins}м`;
};

/**
 * Props:
 * - stats: object returned from /api/get-profile-complete (or similar)
 * - streakInfo: optional (contains canClaim/claimedToday/etc. from backend)
 * - onUpdate: optional callback to trigger parent refetch
 * - onReached42: optional callback fired once when meow taps reach ≥ 42
 * - backendUrl / BACKEND_URL: optional backend base URL
 */
const OverviewTab = ({ stats, streakInfo, onUpdate, onReached42, backendUrl, BACKEND_URL }) => {
  const totalPoints = (stats?.points || 0).toLocaleString();
  const totalPlay =
    typeof stats?.totalPlayTime === "string"
      ? stats.totalPlayTime
      : formatPlayTime(stats?.totalPlayTime || 0);
  const highScoreToday = (stats?.high_score_today || 0).toLocaleString();
  const dailyStreak = stats?.daily_streak || 0;

  // --- Day-aware cache for Meow Counter (prevents stale carry-over) ---
  const storageKey = "meowchi:v2:meow_taps";
  const serverDay =
    (stats?.meow_taps_date && String(stats.meow_taps_date).slice(0, 10)) ||
    new Date().toISOString().slice(0, 10);
  const serverVal0 = Number.isFinite(stats?.meow_taps) ? Number(stats.meow_taps) : 0;

  const dayRef = useRef(serverDay);

  const [meowTapsLocal, setMeowTapsLocal] = useState(() => {
    try {
      const raw = sessionStorage.getItem(storageKey);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && parsed.day === serverDay && Number.isFinite(parsed.value)) {
          return Math.max(parsed.value, serverVal0);
        }
      }
    } catch (_) {}
    return serverVal0;
  });

  // Broadcast helpers
  const notified42Ref = useRef(false);
  const notifyReached42 = useCallback(() => {
    if (notified42Ref.current) return;
    try {
      window.dispatchEvent(new CustomEvent("meow:reached42"));
      if (typeof onReached42 === "function") onReached42();
      notified42Ref.current = true;
    } catch (_) {}
  }, [onReached42]);

  // Persist helper
  const persist = useCallback(
    (val) => {
      try {
        sessionStorage.setItem(storageKey, JSON.stringify({ day: serverDay, value: val }));
      } catch (_) {}
    },
    [serverDay]
  );

  // Reconcile with server updates; reset local on server day change
  useEffect(() => {
    const newDay = serverDay;
    const prevDay = dayRef.current;

    setMeowTapsLocal((prev) => {
      let next;
      if (newDay !== prevDay) {
        // new day — reset local cache and notification guard
        notified42Ref.current = false;
        next = serverVal0;
      } else {
        next = Math.max(prev, serverVal0);
      }
      persist(next);
      // If reconciliation shows 42, emit event (server-confirmed path)
      if (next >= 42 && prev < 42) notifyReached42();
      return next;
    });

    dayRef.current = newDay;
  }, [serverDay, serverVal0, notifyReached42, persist]);

  // 🔔 Also guard against the race where local hits 42 before server confirms.
  useEffect(() => {
    if (meowTapsLocal >= 42 || serverVal0 >= 42) {
      notifyReached42();
    }
  }, [meowTapsLocal, serverVal0, notifyReached42]);

  // Client small cooldown (aligns with backend 220ms)
  const tapCooldownRef = useRef(0);
  const CLIENT_COOLDOWN_MS = 220;

  // ✅ Zen shows lifetime games played (unchanged)
  const gamesPlayed = (stats?.games_played || 0).toLocaleString();

  // Backend base resolution
  const backendBase = useMemo(() => {
    if (typeof backendUrl === "string" && backendUrl) return backendUrl;
    if (typeof BACKEND_URL === "string" && BACKEND_URL) return BACKEND_URL;
    if (typeof window !== "undefined") {
      if (window.BACKEND_URL) return window.BACKEND_URL;
      if (window.__MEOWCHI_BACKEND_URL__) return window.__MEOWCHI_BACKEND_URL__;
    }
    try {
      if (typeof import.meta !== "undefined" && import.meta.env?.VITE_BACKEND_URL) {
        return import.meta.env.VITE_BACKEND_URL;
      }
    } catch (_) {}
    return "";
  }, [backendUrl, BACKEND_URL]);

  // Cache initData once
  const initDataRef = useRef("");
  useEffect(() => {
    try {
      initDataRef.current = window?.Telegram?.WebApp?.initData || "";
    } catch (_) {}
  }, []);

  const haptic = useCallback(() => {
    try {
      const HW = window?.Telegram?.WebApp?.HapticFeedback;
      if (HW?.impactOccurred) HW.impactOccurred("light");
    } catch (_) {}
  }, []);

  // --- 🔁 Auto-claim Daily Streak (silent, once per day) ---
  useEffect(() => {
    const dayKey = `meowchi:v1:streak_claimed:${serverDay}`;
    const already = sessionStorage.getItem(dayKey);

    // Claim only if backend says it's claimable and we haven't tried this day
    if (streakInfo?.canClaim === true && !already) {
      (async () => {
        try {
          const url = `${backendBase}/api/streak/claim-streak`;
          const res = await fetch(url, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ initData: initDataRef.current }),
            keepalive: true,
          });
          // Mark attempt regardless of result to avoid loops; parent will refresh stats
          sessionStorage.setItem(dayKey, "1");
          if (res.ok) {
            // Refresh profile stats so the card shows the new streak and points
            if (typeof onUpdate === "function") onUpdate();
          }
        } catch (_) {
          // Network error — keep guard to avoid spamming; user will still see 0 until next refresh
          sessionStorage.setItem(dayKey, "1");
        }
      })();
    }
  }, [streakInfo?.canClaim, backendBase, serverDay, onUpdate]);

  // Build stats list (Meow Counter card is tappable)
  const lifeStats = useMemo(
    () => [
      {
        key: "points",
        title: "Съедено печенек",
        value: totalPoints,
        subtitle: "Гравитация дрожит. Ещё чуть-чуть — и мы улетим.",
        tint: "from-[#c6b09a]/30 via-[#a98f78]/15 to-[#7d6958]/10",
      },
      {
        key: "zen",
        title: "Уровень дзена",
        value: gamesPlayed,
        subtitle: "Чем больше часов, тем тише мысли.",
        tint: "from-[#9db8ab]/30 via-[#7d9c8b]/15 to-[#587265]/10",
      },
      {
        key: "power-mood",
        title: "Настроение по мощности",
        value: highScoreToday,
        subtitle: "Рекорд дня. Система сияет, ты тоже.",
        tint: "from-[#b3a8cf]/30 via-[#9c8bbd]/15 to-[#756a93]/10",
      },
      {
        key: "social-energy",
        title: "Социальная энергия",
        value: `${dailyStreak}`,
        subtitle:
          dailyStreak > 0 ? "Ты говорил с людьми. Герой дня." : "Пора снова выйти в Meowchiverse.",
        tint: "from-[#b79b8e]/30 via-[#9c8276]/15 to-[#6c5a51]/10",
      },
      {
        key: "invites",
        title: "Приглашено друзей",
        value: (stats?.invited_friends || 0).toLocaleString(),
        subtitle: "Каждый получил полотенце. Никто не вернул.",
        tint: "from-[#a1b7c8]/30 via-[#869dac]/15 to-[#5d707d]/10",
      },
      {
        key: "meow-counter",
        title: "Счётчик мяу",
        value: (meowTapsLocal >= 42 ? 42 : meowTapsLocal).toLocaleString(),
        subtitle:
          meowTapsLocal >= 42
            ? "Совершенство достигнуто — мир в равновесии."
            : "Нажимай дальше. Мяу ждёт.",
        tint: "from-[#c7bda3]/30 via-[#a79a83]/15 to-[#756c57]/10",
        tappable: true,
      },
    ],
    [totalPoints, gamesPlayed, highScoreToday, dailyStreak, stats?.invited_friends, meowTapsLocal]
  );

  // ---- One-shot retry guard for final-commit edge cases (meow tap) ----
  const retryOnceRef = useRef(false);

  const sendTap = useCallback(async () => {
    const url = `${backendBase}/api/meow-tap`;
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ initData: initDataRef.current }),
        keepalive: true,
      });

      let data = null;
      try {
        data = await res.json();
      } catch (_) {}

      // Reconcile with server — authoritative but non-decreasing
      if (res.ok && data && typeof data.meow_taps === "number") {
        setMeowTapsLocal((prev) => {
          const next = Math.min(42, Math.max(prev, data.meow_taps));
          persist(next);
          if (next >= 42 && prev < 42) notifyReached42();
          return next;
        });

        // 🔁 If server says "throttled" while our local shows 42, retry once
        const throttledAt42 = data?.throttled === true && meowTapsLocal >= 42;

        // 🔁 If server returns 41 (non-throttled) while local already 42, retry once
        const nonThrottled41AtLocal42 =
          data?.throttled !== true && data?.meow_taps === 41 && meowTapsLocal >= 42;

        if (!retryOnceRef.current && (throttledAt42 || nonThrottled41AtLocal42)) {
          retryOnceRef.current = true;
          setTimeout(() => {
            void (async () => {
              try {
                const r2 = await fetch(url, {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ initData: initDataRef.current }),
                  keepalive: true,
                });
                let d2 = null;
                try {
                  d2 = await r2.json();
                } catch (_) {}
                if (r2.ok && d2 && typeof d2.meow_taps === "number") {
                  setMeowTapsLocal((prev) => {
                    const next = Math.min(42, Math.max(prev, d2.meow_taps));
                    persist(next);
                    if (next >= 42 && prev < 42) notifyReached42();
                    return next;
                  });
                }
              } catch (_) {}
            })();
          }, 260); // a hair above 220ms
        }
      }
    } catch (_) {
      // Network error: keep optimistic for n>0; reconcile later on next success.
    }
  }, [backendBase, notifyReached42, persist, meowTapsLocal]);

  const handleMeowTap = useCallback(() => {
    const now = Date.now();
    if (now - tapCooldownRef.current < CLIENT_COOLDOWN_MS) return;
    tapCooldownRef.current = now;

    if (meowTapsLocal >= 42) return;

    haptic();

    if (meowTapsLocal === 0) {
      // First tap of the day: wait for server
      void sendTap();
      return;
    }

    // Optimistic for n > 0
    setMeowTapsLocal((n) => {
      const next = Math.min(n + 1, 42);
      persist(next);
      // 🔔 NEW: fire immediately if optimistic path crosses 42
      if (next >= 42 && n < 42) notifyReached42();
      return next;
    });

    void sendTap();
  }, [meowTapsLocal, haptic, sendTap, persist, notifyReached42]);

  return (
    <motion.div
      className="grid grid-cols-2 gap-4"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: "easeOut" }}
    >
      {lifeStats.map((stat, i) => {
        const isMeowCounter = stat.key === "meow-counter";
        const baseClass =
          `relative rounded-2xl border border-white/10 
           bg-gradient-to-br ${stat.tint}
           backdrop-blur-xl p-5 h-[155px] 
           flex flex-col justify-center items-center text-center 
           shadow-[0_0_20px_rgba(0,0,0,0.25)] overflow-hidden`;

        const interactiveProps = isMeowCounter
          ? {
              onPointerDown: handleMeowTap,
              onClick: handleMeowTap,
              className: `${baseClass} cursor-pointer select-none`,
            }
          : { className: baseClass };

        return (
          <motion.div
            key={i}
            whileHover={{ scale: 1.015, boxShadow: "0 8px 22px rgba(255,255,255,0.06)" }}
            whileTap={{ scale: 0.985 }}
            transition={{ type: "spring", stiffness: 220, damping: 18 }}
            {...interactiveProps}
          >
            <div className="absolute inset-0 rounded-2xl bg-gradient-to-b from-white/10 via-transparent to-transparent pointer-events-none" />
            <div className="absolute inset-0 rounded-2xl ring-1 ring-white/5 shadow-inner pointer-events-none" />

            <div className="flex flex-col items-center justify-center space-y-2 max-w-[88%]">
              <p className="text-[13.5px] font-medium text-gray-200 tracking-wide leading-tight">
                {stat.title}
              </p>
              <p className="text-[24px] font-extrabold text-white leading-none tracking-tight drop-shadow-sm">
                {stat.value}
              </p>
              <p className="text-[12.5px] text-gray-400 leading-snug">
                {stat.subtitle}
              </p>
            </div>

            <div className="absolute bottom-0 left-0 right-0 h-1/3 bg-gradient-to-t from-black/10 to-transparent pointer-events-none rounded-b-2xl" />
          </motion.div>
        );
      })}
    </motion.div>
  );
};

export default OverviewTab;
