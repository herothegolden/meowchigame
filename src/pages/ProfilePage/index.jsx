// Path: frontend/src/pages/ProfilePage/index.jsx
// v40 – Inline-eligibility listener + late sanity check with prefer‑truthy guard
// - Listens to "meow:cta-inline-eligible" raised by OverviewTab tap=42 response.
// - Performs late sanity checks via /api/meow-cta-status, but does NOT demote from
//   eligible=true unless usedToday===true or remainingGlobal===0.
// - Keeps CTA visibility local to Profile. Adds compact debug panel (DEBUG=true).

import React, { useState, useEffect, useCallback, Suspense, lazy, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { apiCall, showError, showSuccess } from "../../utils/api";
import ProfileHeader from "./ProfileHeader";
import BottomNav from "../../components/BottomNav";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import AnnouncementBar from "../../components/AnnouncementBar";

const OverviewTab = lazy(() => import("./tabs/OverviewTab"));
const LeaderboardTab = lazy(() => import("./tabs/LeaderboardTab"));
const TasksTab = lazy(() => import("./tabs/TasksTab"));

// 🐛 DEBUG FLAG - Set to false to disable debug panel
const DEBUG = true;

const ProfilePage = () => {
  const navigate = useNavigate();

  const [data, setData] = useState(null);
  const [activeTab, setActiveTab] = useState("overview");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [ctaStatus, setCtaStatus] = useState({
    eligible: false,
    usedToday: false,
    remainingGlobal: 0,
    meow_taps: 0,
  });
  const [ctaLoading, setCtaLoading] = useState(false);

  // Track real-time counter from OverviewTab
  const [liveCounterValue, setLiveCounterValue] = useState(0);

  const ctaReqSeqRef = useRef(0);

  // 🐛 DEBUG: Track all fetch attempts
  const [debugLogs, setDebugLogs] = useState([]);
  const addDebugLog = useCallback((msg) => {
    const timestamp = new Date().toLocaleTimeString();
    console.log(`[DEBUG ${timestamp}]`, msg);
    setDebugLogs((prev) => [...prev.slice(-9), `${timestamp}: ${msg}`]);
  }, []);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const result = await apiCall("/api/get-profile-complete");
      addDebugLog(`✅ Profile loaded: meow_taps=${result.stats?.meow_taps}`);
      setData(result);
    } catch (err) {
      console.error("Failed to load profile:", err);
      addDebugLog(`❌ Profile load failed: ${err.message}`);
      setError(err.message || "Failed to load profile");
    } finally {
      setLoading(false);
    }
  }, [addDebugLog]);

  const fetchCtaStatus = useCallback(async () => {
    const reqId = ++ctaReqSeqRef.current;
    addDebugLog(`🔍 fetchCtaStatus() called (req #${reqId})`);

    try {
      const res = await apiCall("/api/meow-cta-status");
      addDebugLog(`📥 CTA Status Response #${reqId}: ${JSON.stringify(res)}`);

      if (reqId !== ctaReqSeqRef.current) {
        addDebugLog(`⚠️ Response #${reqId} ignored (outdated)`);
        return;
      }

      setCtaStatus((prev) => {
        const next = {
          eligible: !!res.eligible,
          usedToday: !!res.usedToday,
          remainingGlobal: Number(res.remainingGlobal || 0),
          meow_taps: Number(res.meow_taps || 0),
        };

        addDebugLog(
          `📊 CTA State Update: eligible=${next.eligible}, taps=${next.meow_taps}, remaining=${next.remainingGlobal}, used=${next.usedToday}`
        );

        // Prefer-truthy guard: don't demote unless usedToday or quota exhausted
        if (prev.eligible === true && next.eligible === false && next.usedToday !== true && next.remainingGlobal > 0) {
          addDebugLog(`🛡️ Guard triggered: keeping eligible=true`);
          return {
            ...prev,
            remainingGlobal: next.remainingGlobal,
            meow_taps: Math.max(prev.meow_taps, next.meow_taps),
          };
        }

        return next;
      });
    } catch (err) {
      console.error("Failed to fetch CTA status:", err);
      addDebugLog(`❌ CTA Status fetch failed: ${err.message}`);
    }
  }, [addDebugLog]);

  const handleProfileUpdate = useCallback(async () => {
    await fetchData();
    await fetchCtaStatus();
  }, [fetchData, fetchCtaStatus]);

  useEffect(() => {
    fetchData();
    fetchCtaStatus();
  }, [fetchData, fetchCtaStatus]);

  // Listen for real-time counter updates from OverviewTab
  useEffect(() => {
    const handleCounterChanged = (evt) => {
      const count = evt?.detail?.count;
      if (typeof count === "number") {
        addDebugLog(`🎯 Counter event: ${liveCounterValue} → ${count}`);
        setLiveCounterValue(count);

        // When reaching 42, fetch CTA status
        if (count >= 42) {
          addDebugLog(`🔔 Counter reached 42! Fetching CTA status...`);
          fetchCtaStatus();
        }
      }
    };

    window.addEventListener("meow:counter-changed", handleCounterChanged);
    return () => window.removeEventListener("meow:counter-changed", handleCounterChanged);
  }, [fetchCtaStatus, liveCounterValue, addDebugLog]);

  // Inline eligibility signal from tap response
  useEffect(() => {
    const handleInlineEligible = (evt) => {
      const d = (evt && evt.detail) || {};
      addDebugLog(`📣 Inline eligible event: remaining=${d.remainingGlobal}, used=${d.usedToday}`);
      setCtaStatus((prev) => ({
        ...prev,
        eligible: true,
        usedToday: !!d.usedToday || false,
        remainingGlobal: Number(
          d.remainingGlobal !== undefined ? d.remainingGlobal : prev.remainingGlobal
        ),
        meow_taps: Math.max(prev.meow_taps || 0, 42),
      }));

      // One late sanity check (non-demoting due to guard above)
      setTimeout(() => {
        fetchCtaStatus();
      }, 600);
    };

    window.addEventListener("meow:cta-inline-eligible", handleInlineEligible);
    return () => window.removeEventListener("meow:cta-inline-eligible", handleInlineEligible);
  }, [fetchCtaStatus, addDebugLog]);

  // Backstop: when 42 is reached (server-confirmed), poll briefly
  useEffect(() => {
    const timers = [];

    const handleReached42 = () => {
      addDebugLog(`🎉 meow:reached42:server event fired`);
      fetchCtaStatus();
      timers.push(setTimeout(fetchCtaStatus, 200));
      timers.push(setTimeout(fetchCtaStatus, 500));
      timers.push(setTimeout(fetchCtaStatus, 1000));
    };

    window.addEventListener("meow:reached42:server", handleReached42);
    return () => {
      window.removeEventListener("meow:reached42:server", handleReached42);
      timers.forEach((t) => clearTimeout(t));
    };
  }, [fetchCtaStatus, addDebugLog]);

  // Backstop: CTA check triggers from other parts of the app
  useEffect(() => {
    const timers = [];

    const handleCtaCheck = () => {
      addDebugLog(`🔍 meow:cta-check event fired`);
      fetchCtaStatus();
      timers.push(setTimeout(fetchCtaStatus, 150));
      timers.push(setTimeout(fetchCtaStatus, 400));
      timers.push(setTimeout(fetchCtaStatus, 800));
    };

    window.addEventListener("meow:cta-check", handleCtaCheck);
    return () => {
      window.removeEventListener("meow:cta-check", handleCtaCheck);
      timers.forEach((t) => clearTimeout(t));
    };
  }, [fetchCtaStatus, addDebugLog]);

  // Poll CTA status when user is at or approaching 42
  useEffect(() => {
    if (liveCounterValue >= 40 || (data?.stats?.meow_taps || 0) >= 40) {
      addDebugLog(`⏰ Starting CTA polling (counter at ${liveCounterValue})`);
      const interval = setInterval(fetchCtaStatus, 15000);
      return () => {
        addDebugLog(`⏰ Stopping CTA polling`);
        clearInterval(interval);
      };
    }
  }, [fetchCtaStatus, liveCounterValue, data?.stats?.meow_taps, addDebugLog]);

  const handleClaimAndGoToOrder = useCallback(async () => {
    if (ctaLoading) return;

    try {
      setCtaLoading(true);
      addDebugLog(`🎁 Attempting to claim...`);
      const res = await apiCall("/api/meow-claim");
      addDebugLog(`📦 Claim response: ${JSON.stringify(res)}`);

      if (res?.success && res?.claimId) {
        showSuccess("Скидка 42% активирована на заказ 🎉");
        setCtaStatus((s) => ({ ...s, eligible: false, usedToday: true }));
        navigate(`/order?promo=MEOW42&claim=${res.claimId}`);
      } else {
        showError(res?.error || "Не удалось активировать предложение");
        fetchCtaStatus();
      }
    } catch (e) {
      addDebugLog(`❌ Claim failed: ${e.message}`);
      showError(e?.message || "Сеть недоступна");
      fetchCtaStatus();
    } finally {
      setCtaLoading(false);
    }
  }, [ctaLoading, navigate, fetchCtaStatus, addDebugLog]);

  const stats = data?.stats || {};
  const streakInfo = data?.stats?.streakInfo || {};

  // Use live counter value as primary source
  const displayCounter = Math.max(liveCounterValue, stats.meow_taps || 0, ctaStatus.meow_taps);
  const userReached42 = displayCounter >= 42;

  // CTA visibility logic
  const showMeowCTA = ctaStatus.eligible;
  const isLateToday = userReached42 && !ctaStatus.usedToday && ctaStatus.remainingGlobal === 0;
  const alreadyUsedToday = userReached42 && ctaStatus.usedToday;
  const quotaExhausted = ctaStatus.remainingGlobal === 0 && !ctaStatus.usedToday && displayCounter < 42;

  // 🐛 Log CTA visibility decisions
  useEffect(() => {
    if (displayCounter >= 42) {
      addDebugLog(`🎯 CTA Decision: showCTA=${showMeowCTA}, late=${isLateToday}, used=${alreadyUsedToday}`);
    }
  }, [showMeowCTA, isLateToday, alreadyUsedToday, displayCounter, addDebugLog]);

  return (
    <div className="p-4 space-y-6 pb-28 bg-background text-primary">
      <AnnouncementBar />

      {/* 🐛 DEBUG PANEL */}
      {DEBUG && (
        <div className="rounded-xl border-2 border-yellow-400 bg-yellow-400/10 p-3 text-xs font-mono">
          <div className="flex justify-between items-center mb-2">
            <span className="font-bold text-yellow-200">🐛 DEBUG MODE</span>
            <button
              onClick={() => setDebugLogs([])}
              className="text-yellow-200 hover:text-yellow-100 text-[10px]"
            >
              Clear
            </button>
          </div>

          <div className="grid grid-cols-2 gap-2 mb-2 text-yellow-100">
            <div>Counter: <span className="font-bold">{displayCounter}</span></div>
            <div>Live: <span className="font-bold">{liveCounterValue}</span></div>
            <div>DB: <span className="font-bold">{stats.meow_taps || 0}</span></div>
            <div>CTA: <span className="font-bold">{ctaStatus.meow_taps}</span></div>
          </div>

          <div className="grid grid-cols-3 gap-2 mb-2 text-yellow-100">
            <div>Eligible: <span className={ctaStatus.eligible ? "text-green-400 font-bold" : "text-red-400 font-bold"}>{String(ctaStatus.eligible)}</span></div>
            <div>Used: <span className={ctaStatus.usedToday ? "text-red-400" : "text-green-400"}>{String(ctaStatus.usedToday)}</span></div>
            <div>Quota: <span className="font-bold">{ctaStatus.remainingGlobal}</span></div>
          </div>

          <div className="border-t border-yellow-400/30 pt-2 mt-2">
            <div className="text-yellow-200 mb-1">Last 10 Events:</div>
            <div className="space-y-1 max-h-32 overflow-y-auto">
              {debugLogs.map((log, i) => (
                <div key={i} className="text-yellow-100 text-[10px] leading-tight">{log}</div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Quota Warning */}
      {quotaExhausted && (
        <div className="rounded-xl border border-orange-400/30 bg-orange-400/10 text-orange-200 px-3 py-2 text-sm">
          ⚠️ Внимание: Все 42 места на сегодня уже заняты. Скидка будет недоступна.
        </div>
      )}

      {error && (
        <div className="rounded-lg border border-red-500/30 bg-red-500/10 text-red-300 px-3 py-2 text-sm">
          Ошибка загрузки профиля: {error}{" "}
          <button
            onClick={fetchData}
            className="underline underline-offset-4 hover:text-red-200 ml-2"
          >
            Повторить
          </button>
        </div>
      )}

      {loading ? (
        <div className="rounded-xl border border-white/10 bg-[#1b1b1b] p-4 animate-pulse">
          <div className="h-6 w-40 bg-white/10 rounded mb-3" />
          <div className="grid grid-cols-3 gap-3">
            <div className="h-16 bg-white/10 rounded" />
            <div className="h-16 bg-white/10 rounded" />
            <div className="h-16 bg-white/10 rounded" />
          </div>
        </div>
      ) : (
        <ProfileHeader stats={stats} onUpdate={handleProfileUpdate} />
      )}

      <div className="relative overflow-hidden rounded-lg bg-[#1b1b1b] border border-white/10 shadow-[0_4px_24px_rgba(0,0,0,0.4)] backdrop-blur-xl">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full relative z-10">
          <TabsList className="grid grid-cols-3 rounded-t-lg border-b border-white/10">
            <TabsTrigger value="overview">Обзор</TabsTrigger>
            <TabsTrigger value="leaderboard">Рейтинг</TabsTrigger>
            <TabsTrigger value="tasks">Задания</TabsTrigger>
          </TabsList>

          <TabsContent value="overview">
            <Suspense
              fallback={
                <div className="p-4 text-center text-secondary text-sm">
                  Loading overview...
                </div>
              }
            >
              <OverviewTab
                stats={stats}
                streakInfo={streakInfo}
                onUpdate={handleProfileUpdate}
                onReached42={fetchCtaStatus}
              />
            </Suspense>
          </TabsContent>

          <TabsContent value="leaderboard">
            <Suspense
              fallback={
                <div className="p-4 text-center text-secondary text-sm">
                  Loading leaderboard...
                </div>
              }
            >
              <LeaderboardTab />
            </Suspense>
          </TabsContent>

          <TabsContent value="tasks">
            <Suspense
              fallback={
                <div className="p-4 text-center text-secondary text-sm">
                  Loading tasks...
                </div>
              }
            >
              <TasksTab />
            </Suspense>
          </TabsContent>
        </Tabs>
      </div>

      {/* CTA Button - Only shows when SERVER confirms eligibility */}
      {showMeowCTA && (
        <div className="rounded-xl border border-white/10 bg-[#1b1b1b] p-3 shadow-[0_6px_24px_rgba(0,0,0,0.35)]">
          <div className="flex items-center justify-between gap-3">
            <div className="flex flex-col">
              <span className="text-sm text-secondary">Достижение «42/42»</span>
              <span className="text-base font-semibold text-white">
                Первым 42 - скидка 42%
              </span>
            </div>
            <button
              disabled={ctaLoading}
              onClick={handleClaimAndGoToOrder}
              className={`px-4 py-2 rounded-lg font-semibold transition 
                ${ctaLoading ? "bg-accent/60 cursor-wait" : "bg-accent hover:bg-accent/90"} 
                text-background`}
            >
              {ctaLoading ? "Подождите..." : "Заказать сейчас"}
            </button>
          </div>
          <p className="mt-2 text-[12.5px] text-gray-400">
            Осталось сегодня: {ctaStatus.remainingGlobal}
          </p>
        </div>
      )}

      {/* Too Late Message */}
      {isLateToday && (
        <div className="rounded-xl border border-yellow-400/20 bg-yellow-400/10 text-yellow-200 px-3 py-2 text-sm">
          😿 Вы опоздали! Все 42 места заняты. Попробуйте завтра.
        </div>
      )}

      {/* Already Used Message */}
      {alreadyUsedToday && (
        <div className="rounded-xl border border-blue-400/20 bg-blue-400/10 text-blue-200 px-3 py-2 text-sm">
          ✅ Скидка уже активирована сегодня. Приходите завтра за новой!
        </div>
      )}

      <BottomNav />
    </div>
  );
};

export default ProfilePage;
