// src/pages/ProfilePage/tabs/OverviewTab.jsx
// v2 – Batching + Correct Pending Drain + Safe Init + Non-destructive Reconcile + Cleanup
// NOTE: All edits are marked with `// FIXED:` comments.

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import { getMeowCtaStatus, apiCall } from "../../../utils/api";

// Helper: convert seconds → "Xч Yм"
const formatPlayTime = (seconds) => {
  if (!seconds || isNaN(seconds)) return "0ч 0м";
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  return `${hrs}ч ${mins}м`;
};

const OverviewTab = ({ stats, streakInfo, onUpdate }) => {
  const totalPoints = (stats?.points || 0).toLocaleString();
  const totalPlay =
    typeof stats?.totalPlayTime === "string"
      ? stats.totalPlayTime
      : formatPlayTime(stats?.totalPlayTime || 0);
  const highScoreToday = (stats?.high_score_today || 0).toLocaleString();
  const dailyStreak = stats?.daily_streak || 0;

  // --- Day-aware cache ---
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
          // FIXED: State Initialization — keep highest of session vs server; don't force 0 when serverVal0 is 0
          return Math.min(42, Math.max((parsed.value || 0), serverVal0)); // FIXED
        }
      }
    } catch (_) {}
    return serverVal0;
  });

  // Track the server-observed counter to know when it's caught up.
  const lastServerMeowRef = useRef(serverVal0);

  // Cache initData once
  const initDataRef = useRef("");
  useEffect(() => {
    try {
      initDataRef.current = window?.Telegram?.WebApp?.initData || "";
    } catch (_) {}
  }, []);

  const notifyReached42 = useCallback(() => {
    window.dispatchEvent(new CustomEvent("meow:reached42"));
    // Delayed backup check at 500ms to ensure DB transaction is committed
    setTimeout(async () => {
      try {
        const d = await getMeowCtaStatus();
        if (d?.eligible) {
          window.dispatchEvent(new CustomEvent("meow:reached42", { detail: d }));
        }
      } catch (_) {}
    }, 500);
  }, []);

  const persist = useCallback(
    (val) => {
      try {
        sessionStorage.setItem(storageKey, JSON.stringify({ day: serverDay, value: val }));
      } catch (_) {}
    },
    [serverDay]
  );

  // Reconcile on server stats change
  useEffect(() => {
    const newDay = serverDay;
    const prevDay = dayRef.current;

    setMeowTapsLocal((prev) => {
      let next;
      if (newDay !== prevDay) {
        next = serverVal0;
      } else {
        // FIXED: Reconciliation — do not overwrite with 0 while stats for the day haven't arrived yet
        next = serverVal0 > 0 ? Math.max(prev, serverVal0) : prev; // FIXED
      }
      persist(next);
      if (next === 42 && prev !== 42) notifyReached42();
      return next;
    });

    dayRef.current = newDay;
    lastServerMeowRef.current = serverVal0; // keep in sync with backend-observed value
  }, [serverDay, serverVal0, notifyReached42, persist]);

  // Visual feel
  const tapCooldownRef = useRef(0);
  const CLIENT_COOLDOWN_MS = 80;
  const [glowTick, setGlowTick] = useState(0);
  const [goldFlashTick, setGoldFlashTick] = useState(0);
  const prevMeowRef = useRef(meowTapsLocal);
  useEffect(() => {
    const prev = prevMeowRef.current;
    if (meowTapsLocal === 42 && prev < 42) {
      setGoldFlashTick((t) => t + 1);
    }
    prevMeowRef.current = meowTapsLocal;
  }, [meowTapsLocal]);

  const gamesPlayed = (stats?.games_played || 0).toLocaleString();

  // ==========================================================
  // Tap Queue + Flush Worker (keeps server in sync up to 42)
  // ==========================================================
  const pendingTapsRef = useRef(0);
  const inflightRef = useRef(false);
  const workerTimerRef = useRef(null);
  const FLUSH_INTERVAL_MS = 140; // ~7 req/sec to tolerate throttle

  const stopWorker = () => {
    if (workerTimerRef.current) {
      clearInterval(workerTimerRef.current);
      workerTimerRef.current = null;
    }
  };

  const startWorker = useCallback(() => {
    if (workerTimerRef.current) return;
    workerTimerRef.current = setInterval(async () => {
      // stop conditions
      if (pendingTapsRef.current <= 0 || lastServerMeowRef.current >= 42) {
        stopWorker();
        return;
      }
      if (inflightRef.current) return;

      inflightRef.current = true;
      const prevServer = lastServerMeowRef.current;
      try {
        // ✅ pass initData explicitly so backend validates/authenticates the user
        // FIXED: Batching — include inc: pendingTapsRef.current
        const d = await apiCall("/api/meow-tap", { 
          initData: initDataRef.current,
          inc: pendingTapsRef.current // FIXED
        });

        // FIXED: Decrement Logic — compute actual server-applied increment and decrement pending by that amount
        if (d && typeof d.meow_taps === "number") {
          const srv = Math.max(lastServerMeowRef.current, d.meow_taps);
          const actualIncrement = Math.max(0, srv - prevServer); // FIXED
          lastServerMeowRef.current = Math.min(42, srv);
          if (actualIncrement > 0) {
            pendingTapsRef.current = Math.max(0, pendingTapsRef.current - actualIncrement); // FIXED
          }
        }
        // If server didn't return a number, keep pending; retry next tick.
      } catch (_) {
        // transient fail; keep pending and retry next tick
      } finally {
        inflightRef.current = false;
      }
    }, FLUSH_INTERVAL_MS);
  }, []);

  // FIXED: Cleanup worker on unmount — prevents zombie intervals after tab switches
  useEffect(() => {
    return () => {
      stopWorker();
    };
  }, []); // FIXED

  // ==========================================================

  const lifeStats = useMemo(
    () => [
      {
        key: "points",
        title: "COOKIE LEGEND",
        value: totalPoints,
        subtitle: "쫀득-texture obsession. Never stop cooking!",
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
        subtitle: "Рекорд дня. Система сисет, ты тоже.",
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

  // ALWAYS increment optimistically; enqueue for server flush
  const handleMeowTap = useCallback(() => {
    const now = Date.now();
    if (now - tapCooldownRef.current < CLIENT_COOLDOWN_MS) return;
    tapCooldownRef.current = now;

    if (meowTapsLocal >= 42) return;

    try {
      const HW = window?.Telegram?.WebApp?.HapticFeedback;
      if (HW?.impactOccurred) HW.impactOccurred("light");
    } catch (_) {}

    setGlowTick((t) => t + 1);

    setMeowTapsLocal((n) => {
      const next = Math.min(n + 1, 42);
      persist(next);
      // enqueue a server tap whenever UI increments and server hasn't matched yet
      if (lastServerMeowRef.current < 42) {
        pendingTapsRef.current += 1;
        startWorker();
      }
      if (next === 42 && n !== 42) notifyReached42();
      return next;
    });
  }, [meowTapsLocal, persist, notifyReached42, startWorker]);

  // =========================
  // 🔥 Daily Streak Claim CTA
  // =========================
  const [claiming, setClaiming] = useState(false);

  // FIXED BUG 1: do NOT assume "not claimed" on first render; keep null (unknown) until data arrives
  const streakClaimedToday = stats?.streak_claimed_today ?? null; // (retained)

  // FIXED BUG 1: wait for data to load; only rely on backend's canClaim flag
  const streakDataLoaded =
    !!streakInfo && typeof streakInfo.canClaim === "boolean" && typeof stats?.daily_streak !== "undefined"; // (retained)

  // FIXED BUG 1: show only when data is loaded AND backend says canClaim.
  const canClaimComputed = streakDataLoaded && streakInfo.canClaim === true; // (retained)

  const claimStreak = useCallback(async () => {
    if (!canClaimComputed || claiming) return;
    setClaiming(true);
    const HW = window?.Telegram?.WebApp?.HapticFeedback;
    if (HW?.impactOccurred) HW.impactOccurred("light");
    try {
      const backendBase =
        (typeof window !== "undefined" && (window.__MEOWCHI_BACKEND_URL__ || window.BACKEND_URL)) ||
        (typeof import.meta !== "undefined" && import.meta.env && import.meta.env.VITE_BACKEND_URL) ||
        "";
      const url = backendBase ? `${backendBase}/api/streak/claim-streak` : "/api/streak/claim-streak";
      await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ initData: initDataRef.current }),
      });
    } catch (_) {
    } finally {
      setClaiming(false);
      try { if (typeof onUpdate === "function") onUpdate(); } catch (_) {}
    }
  }, [canClaimComputed, claiming, onUpdate]);

  // =========================
  // UI
  // =========================
  const lifeStatsCards = useMemo(() => {
    return lifeStats.map((stat, i) => {
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
            className: `${baseClass} cursor-pointer select-none`,
          }
        : { className: baseClass };

      if (isMeowCounter) {
        return (
          <div key={`wrap-${i}`} className="relative">
            {/* Aura */}
            <motion.div
              key={`gold-base-${isLocked ? "locked" : "idle"}`}
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

            {/* Pulse */}
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

            {/* Card */}
            <motion.div
              whileHover={{ scale: 1.015, boxShadow: "0 8px 22px rgba(255,255,255,0.06)" }}
              whileTap={{ scale: 0.985 }}
              transition={{ type: "spring", stiffness: 220, damping: 18 }}
              {...interactiveProps}
            >
              {/* Locked frame */}
              {isLocked && (
                <>
                  <div className="pointer-events-none absolute inset-0 rounded-2xl ring-16 ring-amber-300/95 shadow-[0_0_68px_rgba(246,196,83,0.85)]" />
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

              {/* Sheen + inner ring */}
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

      if (isStreakCard) {
        return (
          <div key={`streak-wrap-${i}`} className="relative">
            {/* Streak CTA is controlled by backend canClaim; unchanged logic */}
            {streakDataLoaded && streakInfo?.canClaim === true && (
              <motion.button
                type="button"
                onClick={async () => {
                  if (claiming) return;
                  try {
                    await claimStreak();
                  } catch (_) {}
                }}
                disabled={claiming}
                initial={{ y: -4, opacity: 0, scale: 0.95 }}
                animate={{ y: [ -4, -8, -4 ], opacity: 1, scale: claiming ? 0.95 : 1 }}
                transition={{ y: { duration: 1.6, repeat: Infinity, ease: "easeInOut" }, opacity: { duration: 0.25 } }}
                className="absolute top-2 left-1/2 -translate-x-1/2 z-40 rounded-full px-3 py-1.5 text-[16px] shadow-md bg-black/40 border border-white/10 backdrop-blur hover:scale-[1.02] active:scale-[0.98]"
                aria-label="Claim daily streak"
              >
                <span role="img" aria-hidden="true">🔥</span>
              </motion.button>
            )}
            <motion.div
              key={`streak-card-${i}`}
              whileHover={{ scale: 1.015, boxShadow: "0 8px 22px rgba(255,255,255,0.06)" }}
              whileTap={{ scale: 0.985 }}
              transition={{ type: "spring", stiffness: 220, damping: 18 }}
              className={baseClass}
            >
              <div className="absolute inset-0 rounded-2xl bg-gradient-to-b from-white/10 via-transparent to-transparent pointer-events-none" />
              <div className="absolute inset-0 rounded-2xl ring-1 ring-white/5 shadow-inner pointer-events-none" />
              <div className="flex flex-col items-center justify-center space-y-2 max-w-[88%]">
                <p className="text-[13.5px] font-medium text-gray-200 tracking-wide leading-tight">{stat.title}</p>
                <p className="text-[24px] font-extrabold text-white leading-none tracking-tight drop-shadow-sm">{stat.value}</p>
                <p className="text-[12.5px] text-gray-400 leading-snug">{stat.subtitle}</p>
              </div>
              <div className="absolute bottom-0 left-0 right-0 h-1/3 bg-gradient-to-t from-black/10 to-transparent pointer-events-none rounded-b-2xl" />
            </motion.div>
          </div>
        );
      }

      return (
        <motion.div
          key={i}
          whileHover={{ scale: 1.015, boxShadow: "0 8px 22px rgba(255,255,255,0.06)" }}
          whileTap={{ scale: 0.985 }}
          transition={{ type: "spring", stiffness: 220, damping: 18 }}
          className={baseClass}
        >
          <div className="absolute inset-0 rounded-2xl bg-gradient-to-b from-white/10 via-transparent to-transparent pointer-events-none" />
          <div className="absolute inset-0 rounded-2xl ring-1 ring-white/5 shadow-inner pointer-events-none" />
          <div className="flex flex-col items-center justify-center space-y-2 max-w-[88%]">
            <p className="text-[13.5px] font-medium text-gray-200 tracking-wide leading-tight">{stat.title}</p>
            <p className="text-[24px] font-extrabold text-white leading-none tracking-tight drop-shadow-sm">{stat.value}</p>
            <p className="text-[12.5px] text-gray-400 leading-snug">{stat.subtitle}</p>
          </div>
          <div className="absolute bottom-0 left-0 right-0 h-1/3 bg-gradient-to-t from-black/10 to-transparent pointer-events-none rounded-b-2xl" />
        </motion.div>
      );
    });
  }, [lifeStats, meowTapsLocal, streakInfo, stats?.streak_claimed_today, claiming, claimStreak, glowTick, handleMeowTap, streakDataLoaded]);

  return (
    <motion.div
      className="grid grid-cols-2 gap-4"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: "easeOut" }}
    >
      {lifeStatsCards}
    </motion.div>
  );
};

export default OverviewTab;
