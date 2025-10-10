// Path: frontend/src/pages/ProfilePage/tabs/OverviewTab.jsx
// v33 — Server truth on tap + immediate CTA signal
// - Uses server response as the ONLY source of truth for meow count/lock.
// - Emits CTA inline event when `ctaEligible === true` on (or after) the 42nd tap.
// - Fixes off-by-one: initial render shows exact server value; first confirmed tap shows 1.
// - Removes optimistic increment; no client-side +1 before server confirms.

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";

const DEBUG_CTA = (import.meta?.env?.VITE_LOG_CTA === "1");

const formatPlayTime = (seconds) => {
  if (!seconds || isNaN(seconds)) return "0ч 0м";
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  return `${hrs}ч ${mins}м`;
};

// Helper to emit counter changes to ProfilePage
const emitCounterChange = (count, day) => {
  try {
    window.dispatchEvent(new CustomEvent("meow:counter-changed", {
      detail: { count, day }
    }));
  } catch {}
};

const OverviewTab = ({
  stats,
  streakInfo,
  onUpdate,
  onReached42,
  backendUrl,
  BACKEND_URL,
  addDebugLog // optional debug logger from ProfilePage
}) => {
  const totalPoints = (stats?.points || 0).toLocaleString();
  const totalPlay =
    typeof stats?.totalPlayTime === "string"
      ? stats.totalPlayTime
      : formatPlayTime(stats?.totalPlayTime || 0);
  const highScoreToday = (stats?.high_score_today || 0).toLocaleString();
  const dailyStreak = stats?.daily_streak || 0;

  const storageKey = "meowchi:v2:meow_taps";

  const serverDay = useMemo(() => {
    if (stats?.streak_server_day) return String(stats.streak_server_day);
    if (stats?.meow_taps_date) return String(stats.meow_taps_date).slice(0, 10);
    return null;
  }, [stats?.streak_server_day, stats?.meow_taps_date]);

  const serverVal0 = Number.isFinite(stats?.meow_taps) ? Number(stats.meow_taps) : 0;

  const dayRef = useRef(null);

  // Server is ALWAYS source of truth on load
  const [meowTapsLocal, setMeowTapsLocal] = useState(() => {
    return serverVal0;
  });

  const notified42Ref = useRef(false);
  const notifyReached42Server = useCallback(() => {
    if (notified42Ref.current) return;
    try {
      if (DEBUG_CTA) console.log("[CTA] emit meow:reached42:server");
      if (addDebugLog) addDebugLog("🎉 Reached 42 - firing server event");
      window.dispatchEvent(new CustomEvent("meow:reached42:server"));
      if (typeof onReached42 === "function") onReached42();
      notified42Ref.current = true;
    } catch (_) {}
  }, [onReached42, addDebugLog]);

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
    // On stats refresh: adopt server value exactly
    setMeowTapsLocal((prev) => {
      const next = Math.min(42, serverVal0);
      if (addDebugLog) addDebugLog(`📊 Sync from server: ${prev} → ${next}`);
      persist(next);
      if (next >= 42 && prev < 42) notifyReached42Server();
      emitCounterChange(next, serverDay);
      return next;
    });
    dayRef.current = serverDay;
  }, [serverDay, serverVal0, notifyReached42Server, persist, addDebugLog]);

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
      if (addDebugLog && initDataRef.current) {
        addDebugLog(`🔑 InitData length: ${initDataRef.current.length}`);
      }
    } catch (_) {}
  }, [addDebugLog]);

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
        subtitle: "Рекорд дня. Система сиеет, ты тоже.",
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

  const tapCountRef = useRef(0);

  const sendTap = useCallback(async () => {
    const url = `${backendBase}/api/meow-tap`;
    const tapNum = ++tapCountRef.current;

    if (addDebugLog) addDebugLog(`📤 Sending tap #${tapNum} → /api/meow-tap`);

    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ initData: initDataRef.current }),
        keepalive: true,
        cache: "no-store",
      });

      if (addDebugLog) addDebugLog(`📥 Tap #${tapNum} response: ${res.status}`);

      let data = null;
      try {
        data = await res.json();
      } catch (e) {
        if (addDebugLog) addDebugLog(`❌ Tap #${tapNum} JSON parse fail: ${e.message}`);
      }

      if (res.ok && data && typeof data.meow_taps === "number") {
        const serverCount = Math.min(42, data.meow_taps);
        setMeowTapsLocal((prev) => {
          const next = serverCount; // server truth only
          persist(next);
          if (next >= 42 && prev < 42) notifyReached42Server();
          emitCounterChange(next, serverDay);
          if (addDebugLog) addDebugLog(`✅ Tap #${tapNum} applied: ${prev} → ${next}`);
          return next;
        });

        // Inline CTA eligibility from same response
        if ((serverCount >= 42 || data.locked === true) && data.ctaEligible === true) {
          if (DEBUG_CTA) console.log("[CTA] emit meow:cta-inline-eligible", data);
          if (addDebugLog) addDebugLog(`🎯 Tap #${tapNum} CTA eligible inline`);
          try {
            window.dispatchEvent(
              new CustomEvent("meow:cta-inline-eligible", {
                detail: {
                  remainingGlobal: data.ctaRemainingGlobal,
                  usedToday: !!data.ctaUsedToday,
                  tz_day: data.tz_day,
                },
              })
            );
          } catch (_) {}
        }

        // Secondary check hook (non-blocking)
        if (serverCount >= 42 || data.locked === true) {
          try {
            window.dispatchEvent(
              new CustomEvent("meow:cta-check", { detail: { source: "tap-42-response" } })
            );
          } catch (_) {}
        }
      } else {
        if (addDebugLog) addDebugLog(`❌ Tap #${tapNum} failed: status=${res.status}`);
      }
    } catch (err) {
      if (addDebugLog) addDebugLog(`❌ Tap #${tapNum} network error: ${err.message}`);
    }
  }, [backendBase, notifyReached42Server, persist, serverDay, addDebugLog]);

  // No-optimism tap handler: rely on server
  const handleMeowTap = useCallback(() => {
    const now = Date.now();
    if (now - tapCooldownRef.current < CLIENT_COOLDOWN_MS) {
      if (addDebugLog) addDebugLog(`⏸️ Tap throttled (${now - tapCooldownRef.current}ms since last)`);
      return;
    }
    tapCooldownRef.current = now;

    if (meowTapsLocal >= 42) {
      if (addDebugLog) addDebugLog(`🛑 Tap ignored (already at 42)`);
      return;
    }

    // Tactile feedback only; do NOT increment locally
    try {
      const HW = window?.Telegram?.WebApp?.HapticFeedback;
      if (HW?.impactOccurred) HW.impactOccurred("light");
    } catch (_) {}

    void sendTap();
  }, [meowTapsLocal, sendTap, addDebugLog]);

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
