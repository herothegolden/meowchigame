// v21 — DEBUG VERSION: Visible debug panel for CTA troubleshooting
// - Shows real-time ctaStatus state
// - Logs meow:reached42 events
// - Displays API responses
// - Explains why CTA shows/hides

import React, { useState, useEffect, useCallback, Suspense, lazy, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { apiCall, showError, showSuccess } from "../../utils/api";
import ProfileHeader from "./ProfileHeader";
import BottomNav from "../../components/BottomNav";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

const OverviewTab = lazy(() => import("./tabs/OverviewTab"));
const LeaderboardTab = lazy(() => import("./tabs/LeaderboardTab"));
const TasksTab = lazy(() => import("./tabs/TasksTab"));

const ProfilePage = () => {
  const navigate = useNavigate();

  // Detect Telegram Mini App environment
  const isTMA = typeof window !== "undefined" && !!window.Telegram?.WebApp?.initData;

  const [data, setData] = useState(null);
  const [activeTab, setActiveTab] = useState("overview");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Meow CTA status
  const [ctaStatus, setCtaStatus] = useState({
    eligible: false,
    usedToday: false,
    remainingGlobal: 0,
    meow_taps: 0,
  });
  const [ctaLoading, setCtaLoading] = useState(false);

  const post42TimersRef = useRef([]);

  // 🐛 DEBUG STATE
  const [debugVisible, setDebugVisible] = useState(true);
  const [debugLogs, setDebugLogs] = useState([]);
  const debugLog = useCallback((type, message, data = null) => {
    const timestamp = new Date().toLocaleTimeString();
    setDebugLogs((prev) => [
      { type, message, data, timestamp },
      ...prev.slice(0, 19), // Keep last 20 logs
    ]);
  }, []);

  const fetchData = useCallback(async () => {
    if (!isTMA) return;
    try {
      setLoading(true);
      setError(null);
      const result = await apiCall("/api/get-profile-complete");
      setData(result);
      debugLog("info", "Profile data loaded", { meow_taps: result?.stats?.meow_taps });
    } catch (err) {
      console.error("❌ Failed to load profile:", err);
      setError(err.message || "Failed to load profile");
      debugLog("error", "Profile load failed", err.message);
    } finally {
      setLoading(false);
    }
  }, [isTMA, debugLog]);

  const fetchCtaStatus = useCallback(async () => {
    if (!isTMA) return;
    try {
      debugLog("info", "🔄 Calling /api/meow-cta-status...");
      const res = await apiCall("/api/meow-cta-status");
      debugLog("success", "✅ API Response", res);
      
      setCtaStatus((s) => {
        const newState = {
          ...s,
          eligible: !!res.eligible,
          usedToday: !!res.usedToday,
          meow_taps: Number(res.meow_taps || 0),
          remainingGlobal: Number(res.remainingGlobal || 0),
        };
        debugLog("info", "CTA State Updated", newState);
        return newState;
      });
    } catch (err) {
      debugLog("error", "❌ API Error", err.message);
    }
  }, [isTMA, debugLog]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // If we load a profile already at 42, check CTA immediately
  useEffect(() => {
    if (!isTMA) return;
    if (data?.stats?.meow_taps >= 42) {
      debugLog("info", "📊 Profile loaded with meow_taps >= 42, fetching CTA status");
      fetchCtaStatus();
    }
  }, [isTMA, data?.stats?.meow_taps, fetchCtaStatus, debugLog]);

  // 🔒 Consume payload from OverviewTab's "meow:reached42"
  useEffect(() => {
    if (!isTMA) return;

    const onReached42 = (e) => {
      debugLog("event", "🎯 meow:reached42 EVENT FIRED", e.detail);
      
      // Fast-path: if server already replied eligible:true, set immediately
      if (e?.detail && e.detail.eligible === true) {
        debugLog("success", "⚡ Fast-path: Setting eligible immediately");
        setCtaStatus((s) => ({ ...s, eligible: true, usedToday: !!e.detail.usedToday }));
      } else {
        debugLog("info", "🔄 Fallback: Fetching CTA status");
        fetchCtaStatus();
      }

      // Short retry ladder to outwait any residual commit latency
      debugLog("info", "⏱️ Starting retry ladder (150ms, 400ms, 800ms)");
      const t1 = setTimeout(() => {
        debugLog("info", "⏱️ Retry 1 (150ms)");
        fetchCtaStatus();
      }, 150);
      const t2 = setTimeout(() => {
        debugLog("info", "⏱️ Retry 2 (400ms)");
        fetchCtaStatus();
      }, 400);
      const t3 = setTimeout(() => {
        debugLog("info", "⏱️ Retry 3 (800ms)");
        fetchCtaStatus();
      }, 800);
      post42TimersRef.current.push(t1, t2, t3);
    };

    window.addEventListener("meow:reached42", onReached42);
    debugLog("info", "👂 Listening for meow:reached42 events");
    
    return () => {
      window.removeEventListener("meow:reached42", onReached42);
      for (const t of post42TimersRef.current) clearTimeout(t);
      post42TimersRef.current = [];
    };
  }, [isTMA, fetchCtaStatus, debugLog]);

  // Light polling while on Profile to reflect caps/flags
  useEffect(() => {
    if (!isTMA) return;
    fetchCtaStatus();
    const t = setInterval(fetchCtaStatus, 20000);
    return () => clearInterval(t);
  }, [isTMA, fetchCtaStatus, activeTab]);

  const handleClaimAndGoToOrder = useCallback(async () => {
    if (ctaLoading) return;
    if (!isTMA) {
      showError("Откройте мини-приложение в Telegram, чтобы активировать предложение.");
      return;
    }
    try {
      setCtaLoading(true);
      debugLog("info", "🎁 Claiming CTA...");
      const res = await apiCall("/api/meow-claim");
      debugLog("success", "✅ Claim response", res);
      
      if (res?.success && res?.claimId) {
        showSuccess("Скидка 42% активирована на заказ 🎉");
        setCtaStatus((s) => ({ ...s, eligible: false, usedToday: true }));
        debugLog("success", "🎉 CTA claimed successfully!");
        navigate(`/order?promo=MEOW42&claim=${res.claimId}`);
      } else {
        showError(res?.error || "Не удалось активировать предложение");
        debugLog("error", "❌ Claim failed", res?.error);
        fetchCtaStatus();
      }
    } catch (e) {
      showError(e?.message || "Сеть недоступна");
      debugLog("error", "❌ Claim error", e.message);
      fetchCtaStatus();
    } finally {
      setCtaLoading(false);
    }
  }, [ctaLoading, isTMA, navigate, fetchCtaStatus, debugLog]);

  const stats = data?.stats || {};
  const streakInfo = data?.stats?.streakInfo || {};

  // Show CTA solely based on server eligibility flag
  const showMeowCTA = !!ctaStatus.eligible;

  // 🐛 DEBUG: Why is CTA showing/hiding?
  const ctaReason = !ctaStatus.eligible
    ? ctaStatus.usedToday
      ? "Already used today"
      : ctaStatus.meow_taps < 42
      ? `Only ${ctaStatus.meow_taps}/42 taps`
      : ctaStatus.remainingGlobal <= 0
      ? "Global limit reached (42/42)"
      : "Unknown reason"
    : "Eligible! ✅";

  useEffect(() => {
    debugLog("info", `🎯 CTA Display: ${showMeowCTA ? "SHOWING" : "HIDDEN"} - ${ctaReason}`);
  }, [showMeowCTA, ctaReason, debugLog]);

  // -------- Non-Telegram rendering (browser deep link) --------
  if (!isTMA) {
    return (
      <div className="p-4 space-y-6 pb-28 bg-background text-primary">
        <div className="rounded-xl border border-yellow-500/30 bg-yellow-500/10 text-yellow-100 px-3 py-2 text-sm">
          Эта страница требует мини-приложение Telegram.<br />
          <span className="opacity-80">
            Откройте бота и перейдите в «Профиль», чтобы увидеть ваши данные.
          </span>
        </div>
        <div className="rounded-xl border border-white/10 bg-[#1b1b1b] p-4">
          <div className="text-white font-semibold mb-2">Профиль</div>
          <div className="text-secondary text-sm">
            Авторизация происходит через Telegram внутри мини-приложения.
          </div>
        </div>
        <BottomNav />
      </div>
    );
  }

  // -------- Telegram rendering --------
  return (
    <div className="p-4 space-y-6 pb-28 bg-background text-primary">
      {/* 🐛 DEBUG PANEL */}
      {debugVisible && (
        <div className="fixed bottom-20 right-4 z-50 w-80 max-h-96 overflow-y-auto 
                        rounded-lg border border-green-500/50 bg-black/90 backdrop-blur-sm 
                        shadow-[0_0_20px_rgba(34,197,94,0.3)] text-xs">
          <div className="sticky top-0 bg-green-900/80 px-3 py-2 flex items-center justify-between border-b border-green-500/30">
            <span className="font-bold text-green-300">🐛 CTA DEBUG</span>
            <button
              onClick={() => setDebugVisible(false)}
              className="text-green-300 hover:text-white text-lg leading-none"
            >
              ×
            </button>
          </div>
          
          <div className="p-3 space-y-2">
            {/* Current CTA Status */}
            <div className="rounded bg-gray-900/50 p-2 border border-gray-700">
              <div className="font-bold text-green-400 mb-1">Current CTA State:</div>
              <div className="text-white space-y-0.5">
                <div>eligible: <span className={ctaStatus.eligible ? "text-green-400" : "text-red-400"}>
                  {String(ctaStatus.eligible)}
                </span></div>
                <div>meow_taps: <span className="text-yellow-400">{ctaStatus.meow_taps}</span></div>
                <div>usedToday: <span className={ctaStatus.usedToday ? "text-red-400" : "text-green-400"}>
                  {String(ctaStatus.usedToday)}
                </span></div>
                <div>remainingGlobal: <span className="text-blue-400">{ctaStatus.remainingGlobal}</span></div>
              </div>
              <div className="mt-2 pt-2 border-t border-gray-700">
                <div className="font-bold text-orange-400">Why CTA is {showMeowCTA ? "showing" : "hidden"}:</div>
                <div className={showMeowCTA ? "text-green-400" : "text-red-400"}>{ctaReason}</div>
              </div>
            </div>

            {/* Event Log */}
            <div className="rounded bg-gray-900/50 p-2 border border-gray-700 max-h-48 overflow-y-auto">
              <div className="font-bold text-green-400 mb-1">Event Log:</div>
              {debugLogs.length === 0 ? (
                <div className="text-gray-500 italic">No events yet...</div>
              ) : (
                <div className="space-y-1">
                  {debugLogs.map((log, i) => (
                    <div key={i} className="text-xs">
                      <span className="text-gray-500">{log.timestamp}</span>{" "}
                      <span className={
                        log.type === "error" ? "text-red-400" :
                        log.type === "success" ? "text-green-400" :
                        log.type === "event" ? "text-purple-400" :
                        "text-blue-400"
                      }>
                        {log.message}
                      </span>
                      {log.data && (
                        <div className="text-gray-400 ml-2 text-[10px] font-mono">
                          {JSON.stringify(log.data, null, 2).slice(0, 100)}
                          {JSON.stringify(log.data).length > 100 ? "..." : ""}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Toggle button when hidden */}
      {!debugVisible && (
        <button
          onClick={() => setDebugVisible(true)}
          className="fixed bottom-20 right-4 z-50 px-3 py-2 rounded-lg 
                     bg-green-900/80 border border-green-500/50 text-green-300 
                     hover:bg-green-900 text-xs font-bold shadow-lg"
        >
          🐛 DEBUG
        </button>
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
        <ProfileHeader stats={stats} onUpdate={fetchData} />
      )}

      <div className="relative overflow-hidden rounded-lg bg-[#1b1b1b] border border-white/10 shadow-[0_4px_24px_rgba(0,0,0,0.4)] backdrop-blur-xl">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full relative z-10">
          <TabsList className="grid grid-cols-3 rounded-t-lg border-b border-white/10">
            <TabsTrigger value="overview">Обзор</TabsTrigger>
            <TabsTrigger value="leaderboard">Рейтинг</TabsTrigger>
            <TabsTrigger value="tasks">Задания</TabsTrigger>
          </TabsList>

          <TabsContent value="overview">
            <Suspense fallback={<div className="p-4 text-center text-secondary text-sm">Loading overview...</div>}>
              <OverviewTab
                stats={stats}
                streakInfo={streakInfo}
                onUpdate={fetchData}
              />
            </Suspense>
          </TabsContent>

          <TabsContent value="leaderboard">
            <Suspense fallback={<div className="p-4 text-center text-secondary text-sm">Loading leaderboard...</div>}>
              <LeaderboardTab />
            </Suspense>
          </TabsContent>

          <TabsContent value="tasks">
            <Suspense fallback={<div className="p-4 text-center text-secondary text-sm">Loading tasks...</div>}>
              <TasksTab />
            </Suspense>
          </TabsContent>
        </Tabs>
      </div>

      {showMeowCTA && activeTab === "overview" && (
        <div className="rounded-xl border border-white/10 bg-[#1b1b1b] p-3 shadow-[0_6px_24px_rgba(0,0,0,0.35)]">
          <div className="flex items-center justify-between gap-3">
            <div className="flex flex-col">
              <span className="text-sm text-secondary">Достижение «42/42»</span>
              <span className="text-base font-semibold text-white">
                Первым 42 — скидка 42%
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

      <BottomNav />
    </div>
  );
};

export default ProfilePage;
