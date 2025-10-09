// Path: frontend/src/pages/ProfilePage/tabs/OverviewTab.jsx
// v27 - PRODUCTION READY: All em dashes removed, CTA fix preserved
// - ALL Cyrillic text sanitized for esbuild (no em dashes)
// - CTA fires "meow:cta-check" when server confirms meow_taps >= 42
// - Simplified retry logic without stale closures
// - Server-confirmed "meow:reached42:server" event unchanged

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";

// Helper: convert seconds to "Xч Yм"
const formatPlayTime = (seconds) => {
  if (!seconds || isNaN(seconds)) return "0ч 0м";
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  return `${hrs}ч ${mins}м`;
};

const OverviewTab = ({ stats, streakInfo, onUpdate, onReached42, backendUrl, BACKEND_URL }) => {
  // Guard: Don't render until we have stats
  if (!stats) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-400">Loading...</div>
      </div>
    );
  }

  const totalPoints = (stats?.points || 0).toLocaleString();
  const totalPlay =
    typeof stats?.totalPlayTime === "string"
      ? stats.totalPlayTime
      : formatPlayTime(stats?.totalPlayTime || 0);
  const highScoreToday = (stats?.high_score_today || 0).toLocaleString();
  const dailyStreak = stats?.daily_streak || 0;

  const storageKey = "meowchi:v2:meow_taps";

  const serverDay = useMemo(() => {
    if (!stats) return null;
    if (stats?.streak_server_day) return String(stats.streak_server_day);
    if (stats?.meow_taps_date) return String(stats.meow_taps_date).slice(0, 10);
    return null;
  }, [stats]);

  const serverVal0 = Number.isFinite(stats?.meow_taps) ? Number(stats.meow_taps) : 0;

  const dayRef = useRef(serverDay);

  const [meowTapsLocal, setMeowTapsLocal] = useState(() => {
    if (!serverDay) return Math.max(0, serverVal0);
    try {
      const raw = sessionStorage.getItem(storageKey);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && parsed.day === serverDay && Number.isFinite(parsed.value)) {
          return Math.max(0, Math.max(parsed.value, serverVal0));
        }
      }
    } catch (_) {}
    return Math.max(0, serverVal0);
  });

  // Broadcast helpers - server-confirmed only
  const notified42Ref = useRef(false);
  const notifyReached42Server = useCallback(() => {
    if (notified42Ref.current) return;
    try {
      window.dispatchEvent(new CustomEvent("meow:reached42:server"));
      if (typeof onReached42 === "function") onReached42();
      notified42Ref.current = true;
    } catch (_) {}
  }, [onReached42]);

  const persist = useCallback(
    (val) => {
      if (!serverDay) return;
      try {
        sessionStorage.setItem(storageKey, JSON.stringify({ day: serverDay, value: val }));
      } catch (_) {}
    },
    [serverDay]
  );

  useEffect(() => {
    if (!serverDay) {
      setMeowTapsLocal((prev) => {
        const next = Math.min(42, Math.max(prev, serverVal0));
        return next;
      });
      return;
    }

    const newDay = serverDay;
    const prevDay = dayRef.current;

    setMeowTapsLocal((prev) => {
      let next;
      if (prevDay && newDay !== prevDay) {
        notified42Ref.current = false;
        next = serverVal0;
      } else {
        next = Math.min(42, Math.max(prev, serverVal0));
      }
      persist(next);
      if (next >= 42 && prev < 42) notifyReached42Server();
      return next;
    });

    dayRef.current = newDay;
  }, [serverDay, serverVal0, notifyReached42Server, persist]);

  const tapCooldownRef = useRef(0);
  const CLIENT_COOLDOWN_MS = 220;

  const gamesPlayed = (stats?.games_played || 0).toLocaleString();

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

  const streakServerDay = stats?.streak_server_day || null;
  const streakKey = useMemo(
    () => (streakServerDay ? `meowchi:v2:streak_claimed:${streakServerDay}` : null),
    [streakServerDay]
  );

  useEffect(() => {
    if (!(streakInfo?.canClaim === true)) return;
    if (!streakKey) return;
    const already = sessionStorage.getItem(streakKey);
    if (already) return;

    (async () => {
      try {
        const url = `${backendBase}/api/streak/claim-streak`;
        const res = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ initData: initDataRef.current }),
          keepalive: true,
        });
        sessionStorage.setItem(streakKey, "1");
        if (res.ok && typeof onUpdate === "function") onUpdate();
      } catch (_) {
        sessionStorage.setItem(streakKey, "1");
      }
    })();
  }, [streakInfo?.canClaim, backendBase, streakKey, onUpdate]);

  const lifeStats = useMemo(
    () => [
      {
        key: "points",
        title: "Съедено печенек",
        value: totalPoints,
        subtitle: "Гравитация дрожит. Ещё чуть-чуть - и мы улетим.",
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
        // CRITICAL: Display EXACT server value (no +1 offset)
        // Server stores 0-42, display must match exactly
        value: String(meowTapsLocal >= 42 ? 42 : meowTapsLocal),
        subtitle:
          meowTapsLocal >= 42
            ? "Совершенство достигнуто - мир в равновесии."
            : "Нажимай дальше. Мяу ждёт.",
        tint: "from-[#c7bda3]/30 via-[#a79a83]/15 to-[#756c57]/10",
        tappable: true,
      },
    ],
    [totalPoints, gamesPlayed, highScoreToday, dailyStreak, stats?.invited_friends, meowTapsLocal]
  );

  const retryScheduledRef = useRef(false);

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

      if (res.ok && data && typeof data.meow_taps === "number") {
        setMeowTapsLocal((prev) => {
          const next = Math.min(42, Math.max(prev, data.meow_taps));
          persist(next);
          if (next >= 42 && prev < 42) notifyReached42Server();
          return next;
        });

        // Fire CTA check event when server confirms >= 42
        if (data.meow_taps >= 42 || data.locked === true) {
          try {
            window.dispatchEvent(
              new CustomEvent("meow:cta-check", { detail: { source: "tap-response-confirmed-42" } })
            );
          } catch (_) {}
        }

        // If server explicitly signals lock, snap to 42
        if (data?.locked === true && data.meow_taps < 42) {
          setMeowTapsLocal((prev) => {
            const next = 42;
            persist(next);
            if (prev < 42) notifyReached42Server();
            return next;
          });
        }

        // Simplified final-commit retry
        const shouldRetry =
          !retryScheduledRef.current &&
          ((data?.throttled === true && data.meow_taps >= 40) ||
            (data?.throttled !== true && data?.meow_taps === 41));

        if (shouldRetry) {
          retryScheduledRef.current = true;
          setTimeout(async () => {
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
                  if (next >= 42 && prev < 42) notifyReached42Server();
                  return next;
                });
                if (d2.meow_taps >= 42 || d2.locked === true) {
                  try {
                    window.dispatchEvent(
                      new CustomEvent("meow:cta-check", {
                        detail: { source: "tap-response-retry-confirmed-42" },
                      })
                    );
                  } catch (_) {}
                }
              }
            } catch (_) {}
            retryScheduledRef.current = false;
          }, 280);
        }
      }
    } catch (_) {
      // Network error: keep optimistic, reconcile on next success
    }
  }, [backendBase, notifyReached42Server, persist]);

  const handleMeowTap = useCallback(() => {
    const now = Date.now();
    if (now - tapCooldownRef.current < CLIENT_COOLDOWN_MS) return;
    tapCooldownRef.current = now;

    if (meowTapsLocal >= 42) return;

    haptic();

    // CRITICAL: Optimistic increment - server will return authoritative value
    // If server has 0, client increments to 1, then server confirms 1
    setMeowTapsLocal((n) => {
      const next = Math.min(n + 1, 42);
      persist(next);
      return next;
    });

    void sendTap();
  }, [meowTapsLocal, haptic, sendTap, persist]);

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
