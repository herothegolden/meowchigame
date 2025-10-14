// Path: frontend/src/pages/ProfilePage/tabs/OverviewTab.jsx
// v23 — Daily Streak claim CTA visibility fix
// - Floating 🔥 moved inside card (top-2, z-40) to avoid clipping
// - Added inline fallback "Claim 🔥" chip inside the streak card (top-right)
// - No unrelated changes to logic, styles, or other cards

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
 * - streakInfo: optional
 * - onUpdate: optional callback to trigger parent refetch
 * - backendUrl / BACKEND_URL: optional backend base URL
 */
const OverviewTab = ({ stats, streakInfo, onUpdate, backendUrl, BACKEND_URL }) => {
  const totalPoints = (stats?.points || 0).toLocaleString();
  const totalPlay =
    typeof stats?.totalPlayTime === "string"
      ? stats.totalPlayTime
      : formatPlayTime(stats?.totalPlayTime || 0);
  const highScoreToday = (stats?.high_score_today || 0).toLocaleString();
  const dailyStreak = stats?.daily_streak || 0;

  // --- Day-aware cache (prevents stale carry-over and "start from 1" after reset) ---
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
          // trust server 0; do not lift from cache when serverVal0 === 0
          return serverVal0 === 0 ? 0 : Math.max(parsed.value, serverVal0);
        }
      }
    } catch (_) {}
    return serverVal0;
  });

  // Broadcast "hit 42" so parent can fetch CTA status immediately (only on confirmed/reconciled 42)
  const notifyReached42 = useCallback(() => {
    try {
      window.dispatchEvent(new CustomEvent("meow:reached42"));
    } catch (_) {}
  }, []);

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
        next = serverVal0;
      } else {
        // trust server 0; do not preserve stale local when serverVal0 === 0
        next = serverVal0 === 0 ? 0 : Math.max(prev, serverVal0);
      }
      persist(next);
      if (next === 42 && prev !== 42) notifyReached42();
      return next;
    });

    dayRef.current = newDay;
  }, [serverDay, serverVal0, notifyReached42, persist]);

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

  // 🔮 Backlight glow tick (purely visual)
  const [glowTick, setGlowTick] = useState(0);

  // ✨ One-time gold frame flash when entering locked state (42)
  const [goldFlashTick, setGoldFlashTick] = useState(0);
  const prevMeowRef = useRef(meowTapsLocal);
  useEffect(() => {
    const prev = prevMeowRef.current;
    if (meowTapsLocal === 42 && prev < 42) {
      setGoldFlashTick((t) => t + 1);
    }
    prevMeowRef.current = meowTapsLocal;
  }, [meowTapsLocal]);

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
        key: "social-energy", // Daily Streak
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

  // ---- One-shot retry guard for final-commit edge cases ----
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
          if (next === 42 && prev !== 42) notifyReached42();
          return next;
        });

        // 🔁 If server says "throttled" while our local shows 42, retry once
        const throttledAt42 = data?.throttled === true && meowTapsLocal === 42;

        // 🔁 If server returns 41 (non-throttled) while local already 42, retry once
        const nonThrottled41AtLocal42 =
          data?.throttled !== true && data?.meow_taps === 41 && meowTapsLocal === 42;

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
                    if (next === 42 && prev !== 42) notifyReached42();
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

    // 🔮 trigger backlight pulse on every tap attempt
    setGlowTick((t) => t + 1);

    if (meowTapsLocal === 0) {
      // First tap of the day: wait for server
      void sendTap();
      return;
    }

    // Optimistic for n > 0
    setMeowTapsLocal((n) => {
      const next = Math.min(n + 1, 42);
      persist(next);
      // no early notify here
      return next;
    });

    void sendTap();
  }, [meowTapsLocal, haptic, sendTap, persist]);

  // =========================
  // 🔥 Daily Streak Claim CTA
  // =========================
  const [claiming, setClaiming] = useState(false);
  const canClaim = !!(streakInfo && streakInfo.canClaim === true);

  const claimStreak = useCallback(async () => {
    if (!canClaim || claiming) return;
    setClaiming(true);
    haptic();
    try {
      await fetch(`${backendBase}/api/streak/claim-streak`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ initData: initDataRef.current }),
      });
      // Parent will refetch authoritative stats
    } catch (_) {
      // swallow; parent refresh will reconcile
    } finally {
      setClaiming(false);
      try {
        if (typeof onUpdate === "function") onUpdate();
      } catch (_) {}
    }
  }, [backendBase, canClaim, claiming, onUpdate, haptic]);

  return (
    <motion.div
      className="grid grid-cols-2 gap-4"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: "easeOut" }}
    >
      {lifeStats.map((stat, i) => {
        const isMeowCounter = stat.key === "meow-counter";
        const isStreakCard = stat.key === "social-energy";
        const isLocked = isMeowCounter && meowTapsLocal >= 42;
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

        // --- Render Meow Counter with OUTER gold glow wrapper (allows spill beyond card) ---
        if (isMeowCounter) {
          return (
            <div key={`wrap-${i}`} className="relative">
              {/* Static subtle golden aura */}
              <motion.div
                key={`gold-base-${isLocked ? 'locked' : 'idle'}`}
                className="pointer-events-none absolute -inset-3 rounded-[22px]"
                initial={false}
                animate={{ opacity: isLocked ? 0.35 : 0.22 }}
                transition={{ duration: 0.3 }}
                style={{
                  background:
                    "radial-gradient(70% 70% at 50% 50%, rgba(246,196,83,0.55) 0%, rgba(246,196,83,0.28) 35%, rgba(246,196,83,0.10) 60%, rgba(0,0,0,0) 100%)",
                  filter: "blur(18px)",
                }}
              />

              {/* Pulse on every tap */}
              <motion.div
                key={`gold-pulse-${glowTick}`}
                className="pointer-events-none absolute -inset-5 rounded-[26px]"
                initial={{ opacity: 0, scale: 0.96 }}
                animate={{ opacity: [0, 0.7, 0], scale: [0.96, 1.08, 1.02] }}
                transition={{ duration: 0.5, times: [0, 0.4, 1], ease: "easeOut" }}
                style={{
                  background:
                    "radial-gradient(70% 70% at 50% 50%, rgba(246,196,83,0.75) 0%, rgba(246,196,83,0.42) 30%, rgba(246,196,83,0.16) 58%, rgba(0,0,0,0) 100%)",
                  filter: "blur(22px)",
                }}
              />

              {/* Card itself */}
              <motion.div
                whileHover={{ scale: 1.015, boxShadow: "0 8px 22px rgba(255,255,255,0.06)" }}
                whileTap={{ scale: 0.985 }}
                transition={{ type: "spring", stiffness: 220, damping: 18 }}
                {...interactiveProps}
              >
                {/* GOLD FRAME when locked (persistent) */}
                {isLocked && (
                  <>
                    <div className="pointer-events-none absolute inset-0 rounded-2xl ring-16 ring-amber-300/95 shadow-[0_0_68px_rgba(246,196,83,0.85)]" />
                    {/* One-time gold flash on entering locked state */}
                    <motion.div
                      key={`goldflash-${goldFlashTick}`}
                      className="pointer-events-none absolute inset-0 rounded-2xl"
                      initial={{ opacity: 0, boxShadow: "0 0 0 0 rgba(246,196,83,0)" }}
                      animate={{
                        opacity: [0, 1, 0],
                        boxShadow: [
                          "0 0 0 0 rgba(246,196,83,0)",
                          "0 0 90px 26px rgba(246,196,83,0.95)",
                          "0 0 0 0 rgba(246,196,83,0)"
                        ]
                      }}
                      transition={{ duration: 0.75, times: [0, 0.4, 1], ease: "easeOut" }}
                      style={{ borderRadius: "1rem" }}
                    />
                  </>
                )}

                {/* base sheen + inner ring above content */}
                <div className="absolute inset-0 rounded-2xl bg-gradient-to-b from-white/10 via-transparent to-transparent pointer-events-none z-10" />
                <div className="absolute inset-0 rounded-2xl ring-1 ring-white/5 shadow-inner pointer-events-none z-10" />

                <div className="flex flex-col items-center justify-center space-y-2 max-w-[88%] relative z-20">
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

                <div className="absolute bottom-0 left-0 right-0 h-1/3 bg-gradient-to-t from-black/10 to-transparent pointer-events-none rounded-b-2xl z-10" />
              </motion.div>
            </div>
          );
        }

        // --- Daily Streak card wrapper to host floating 🔥 CTA ---
        if (isStreakCard) {
          return (
            <div key={`streak-wrap-${i}`} className="relative">
              {/* Floating 🔥 button (inside the wrapper to avoid clipping) */}
              {canClaim && (
                <motion.button
                  type="button"
                  onClick={claimStreak}
                  disabled={claiming}
                  initial={{ y: -4, opacity: 0, scale: 0.95 }}
                  animate={{
                    y: [ -4, -8, -4 ],
                    opacity: 1,
                    scale: claiming ? 0.95 : 1,
                  }}
                  transition={{
                    y: { duration: 1.6, repeat: Infinity, ease: "easeInOut" },
                    opacity: { duration: 0.25 },
                  }}
                  className="absolute top-2 left-1/2 -translate-x-1/2 z-40
                             rounded-full px-3 py-1.5 text-[16px] shadow-md
                             bg-black/40 border border-white/10 backdrop-blur
                             hover:scale-[1.02] active:scale-[0.98]"
                  aria-label="Claim daily streak"
                >
                  <span role="img" aria-hidden="true">🔥</span>
                </motion.button>
              )}

              {/* Card itself (non-tappable) */}
              <motion.div
                key={`streak-card-${i}`}
                whileHover={{ scale: 1.015, boxShadow: "0 8px 22px rgba(255,255,255,0.06)" }}
                whileTap={{ scale: 0.985 }}
                transition={{ type: "spring", stiffness: 220, damping: 18 }}
                {...interactiveProps /* same base styles */}
              >
                {/* Inline fallback "Claim 🔥" chip inside the card (top-right) */}
                {canClaim && (
                  <button
                    type="button"
                    onClick={claimStreak}
                    disabled={claiming}
                    className="absolute top-2 right-2 z-30
                               rounded-full px-2.5 py-1 text-[12.5px] font-semibold
                               bg-white/10 border border-white/15 text-white
                               hover:bg-white/15 active:scale-95"
                    aria-label="Claim daily streak"
                  >
                    Claim 🔥
                  </button>
                )}

                {/* base sheen + inner ring */}
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
            </div>
          );
        }

        // --- Default cards (no outer glow wrapper) ---
        return (
          <motion.div
            key={i}
            whileHover={{ scale: 1.015, boxShadow: "0 8px 22px rgba(255,255,255,0.06)" }}
            whileTap={{ scale: 0.985 }}
            transition={{ type: "spring", stiffness: 220, damping: 18 }}
            {...interactiveProps}
          >
            {/* base sheen + inner ring */}
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
