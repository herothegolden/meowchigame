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
 * - backendUrl / BACKEND_URL: optional explicit backend base URL (preferred)
 */
const OverviewTab = ({ stats, streakInfo, onUpdate, backendUrl, BACKEND_URL }) => {
  const totalPoints = (stats?.points || 0).toLocaleString();

  // Kept for backward-compatibility, though no longer used for the Zen card
  const totalPlay =
    typeof stats?.totalPlayTime === "string"
      ? stats.totalPlayTime
      : formatPlayTime(stats?.totalPlayTime || 0);

  const highScoreToday = (stats?.high_score_today || 0).toLocaleString();
  const dailyStreak = stats?.daily_streak || 0;

  // Local state for meow taps to get instant feedback on tap
  const [meowTapsLocal, setMeowTapsLocal] = useState(
    Number.isFinite(stats?.meow_taps) ? stats.meow_taps : 0
  );

  // Keep local meow taps in sync if parent refreshes stats
  useEffect(() => {
    if (Number.isFinite(stats?.meow_taps)) {
      setMeowTapsLocal(stats.meow_taps);
    }
  }, [stats?.meow_taps]);

  // Cooldown & in-flight guard to prevent spamming the backend; server also rate-limits
  const tapCooldownRef = useRef(0);
  const inFlightRef = useRef(false);
  const CLIENT_COOLDOWN_MS = 600; // ↑ avoid 429 due to network jitter/batching

  // ✅ Use lifetime games played for the “Уровень дзена” value
  const gamesPlayed = (stats?.games_played || 0).toLocaleString();

  // Robust backend base URL resolution (no empty relative fallbacks)
  const backendBase = useMemo(() => {
    // 1) explicit props win
    if (typeof backendUrl === "string" && backendUrl) return backendUrl;
    if (typeof BACKEND_URL === "string" && BACKEND_URL) return BACKEND_URL;

    // 2) window globals
    if (typeof window !== "undefined") {
      if (window.BACKEND_URL) return window.BACKEND_URL;
      if (window.__MEOWCHI_BACKEND_URL__) return window.__MEOWCHI_BACKEND_URL__;
    }

    // 3) Vite env (compile-time injected)
    try {
      if (typeof import.meta !== "undefined" && import.meta.env && import.meta.env.VITE_BACKEND_URL) {
        return import.meta.env.VITE_BACKEND_URL;
      }
    } catch (_) {}

    // 4) last resort: empty string (won't work cross-origin; but we tried everything)
    return "";
  }, [backendUrl, BACKEND_URL]);

  // Build the list (we’ll inject onClick for the Meow Counter card)
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
        value: gamesPlayed, // ← switched from time to lifetime games played
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
          dailyStreak > 0
            ? "Ты говорил с людьми. Герой дня."
            : "Пора снова выйти в Meowchiverse.",
        tint: "from-[#b79b8e]/30 via-[#9c8276]/15 to-[#6c5a51]/10",
      },
      {
        key: "invites",
        title: "Приглашено друзей",
        value: (stats?.invited_friends || 0).toLocaleString(), // ← wired to backend value
        subtitle: "Каждый получил полотенце. Никто не вернул.",
        tint: "from-[#a1b7c8]/30 via-[#869dac]/15 to-[#5d707d]/10",
      },
      {
        key: "meow-counter",
        title: "Счётчик мяу",
        value: (meowTapsLocal >= 42 ? 42 : meowTapsLocal).toLocaleString(), // ← daily cap at 42
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

  const handleMeowTap = useCallback(async () => {
    const now = Date.now();
    if (inFlightRef.current) return; // prevent overlapping requests
    if (now - tapCooldownRef.current < CLIENT_COOLDOWN_MS) return; // client cooldown
    tapCooldownRef.current = now;

    // Already at cap
    if (meowTapsLocal >= 42) return;

    // Optimistic UI update
    setMeowTapsLocal((n) => Math.min(n + 1, 42));

    // Telegram initData
    const initData =
      typeof window !== "undefined" &&
      window.Telegram &&
      window.Telegram.WebApp &&
      window.Telegram.WebApp.initData
        ? window.Telegram.WebApp.initData
        : "";

    const url = `${backendBase}/api/meow-tap`;
    inFlightRef.current = true;
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ initData }),
        keepalive: true,
      });

      let data = null;
      try {
        data = await res.json();
      } catch (_) {}

      // Reconcile with server answer if present
      if (res.ok && data && typeof data.meow_taps === "number") {
        setMeowTapsLocal(Math.min(Math.max(0, data.meow_taps), 42));

        // Let parent refresh profile stats if it wants to
        if (typeof onUpdate === "function") {
          try {
            onUpdate(); // e.g., refetch /get-profile-complete
          } catch (_) {}
        }

        // Broadcast a local event so other parts can react if they listen
        try {
          window.dispatchEvent(
            new CustomEvent("meowchi:stats-updated:meow", {
              detail: { meow_taps: data.meow_taps },
            })
          );
        } catch (_) {}
      } else if (res.status === 429) {
        // Rate-limited: KEEP optimistic update; next allowed tap will reconcile
        // (Do not roll back — this is expected transient throttle)
      } else if (!res.ok) {
        // Other failures → roll back optimistic increment (best-effort)
        setMeowTapsLocal((n) => Math.max(0, n - 1));
        try {
          console.warn("meow-tap failed", { status: res.status, url });
        } catch (_) {}
      }
    } catch (_) {
      // Network error → roll back optimistic increment (best-effort)
      setMeowTapsLocal((n) => Math.max(0, n - 1));
    } finally {
      inFlightRef.current = false;
    }
  }, [meowTapsLocal, onUpdate, backendBase]);

  return (
    <motion.div
      className="grid grid-cols-2 gap-4"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: "easeOut" }}
    >
      {lifeStats.map((stat, i) => {
        const isMeowCounter = stat.key === "meow-counter";
        const interactiveProps = isMeowCounter
          ? {
              onClick: handleMeowTap,
              className:
                `relative rounded-2xl border border-white/10 
                 bg-gradient-to-br ${stat.tint}
                 backdrop-blur-xl p-5 h-[155px] 
                 flex flex-col justify-center items-center text-center 
                 shadow-[0_0_20px_rgba(0,0,0,0.25)] overflow-hidden
                 cursor-pointer select-none`, // clickable
            }
          : {
              className:
                `relative rounded-2xl border border-white/10 
                 bg-gradient-to-br ${stat.tint}
                 backdrop-blur-xl p-5 h-[155px] 
                 flex flex-col justify-center items-center text-center 
                 shadow-[0_0_20px_rgba(0,0,0,0.25)] overflow-hidden`,
            };

        return (
          <motion.div
            key={i}
            whileHover={{
              scale: 1.015,
              boxShadow: "0 8px 22px rgba(255,255,255,0.06)",
            }}
            transition={{ type: "spring", stiffness: 180, damping: 18 }}
            {...interactiveProps}
          >
            {/* Top reflection */}
            <div className="absolute inset-0 rounded-2xl bg-gradient-to-b from-white/10 via-transparent to-transparent pointer-events-none" />
            {/* Inner glow */}
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

            {/* Bottom fade for depth */}
            <div className="absolute bottom-0 left-0 right-0 h-1/3 bg-gradient-to-t from-black/10 to-transparent pointer-events-none rounded-b-2xl" />
          </motion.div>
        );
      })}
    </motion.div>
  );
};

export default OverviewTab;
