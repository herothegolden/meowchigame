// Path: frontend/src/pages/ProfilePage/index.jsx
// v32 — DEBUG VERSION: Added console logs to trace CTA state flow
// Use this to diagnose why CTA doesn't appear at 42

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

  // Staleness guard to prevent race conditions
  const ctaReqSeqRef = useRef(0);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const result = await apiCall("/api/get-profile-complete");
      setData(result);
    } catch (err) {
      console.error("Failed to load profile:", err);
      setError(err.message || "Failed to load profile");
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchCtaStatus = useCallback(async () => {
    const reqId = ++ctaReqSeqRef.current;

    try {
      const res = await apiCall("/api/meow-cta-status");
      console.log("🔍 [CTA-DEBUG] /meow-cta-status response:", res);

      // Ignore stale responses
      if (reqId !== ctaReqSeqRef.current) {
        console.log("⏭️ [CTA-DEBUG] Ignoring stale response, reqId:", reqId);
        return;
      }

      setCtaStatus((prev) => {
        const next = {
          eligible: !!res.eligible,
          usedToday: !!res.usedToday,
          remainingGlobal: Number(res.remainingGlobal || 0),
          meow_taps: Number(res.meow_taps || 0),
        };

        console.log("🔍 [CTA-DEBUG] fetchCtaStatus state transition:", { prev, next });

        // Prefer-truthy guard: Don't demote eligible:true to false unless explicitly used
        if (prev.eligible === true && next.eligible === false && next.usedToday !== true) {
          console.log("🛡️ [CTA-DEBUG] Prefer-truthy guard activated, keeping eligible=true");
          return {
            ...prev,
            remainingGlobal: next.remainingGlobal,
            meow_taps: Math.max(prev.meow_taps, next.meow_taps),
          };
        }

        console.log("✅ [CTA-DEBUG] Setting new CTA state:", next);
        return next;
      });
    } catch (err) {
      console.error("❌ [CTA-DEBUG] Failed to fetch CTA status:", err);
    }
  }, []);

  const handleProfileUpdate = useCallback(async () => {
    await fetchData();
    await fetchCtaStatus();
  }, [fetchData, fetchCtaStatus]);

  // Initial data fetch
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // If already at 42 on initial load, fetch CTA immediately
  useEffect(() => {
    if (data?.stats?.meow_taps >= 42) {
      console.log("🎯 [CTA-DEBUG] User already at 42 on load, fetching CTA status");
      fetchCtaStatus();
    }
  }, [data?.stats?.meow_taps, fetchCtaStatus]);

  // Listen for inline eligibility from OverviewTab (atomic /meow-tap response)
  useEffect(() => {
    const handleInlineEligible = (evt) => {
      console.log("🎉 [CTA-DEBUG] Received meow:cta-inline-eligible event:", evt.detail);
      const d = (evt && evt.detail) || {};
      setCtaStatus((prev) => {
        const newState = {
          ...prev,
          eligible: true,
          usedToday: !!d.usedToday || false,
          remainingGlobal: Number(
            d.remainingGlobal !== undefined ? d.remainingGlobal : prev.remainingGlobal
          ),
          meow_taps: Math.max(prev.meow_taps || 0, 42),
        };
        console.log("✅ [CTA-DEBUG] handleInlineEligible state transition:", { prev, new: newState });
        return newState;
      });

      // Optional sanity check shortly after to sync with global status
      setTimeout(() => {
        console.log("🔄 [CTA-DEBUG] Running sanity check fetchCtaStatus after inline event");
        fetchCtaStatus();
      }, 600);
    };

    console.log("👂 [CTA-DEBUG] Adding meow:cta-inline-eligible event listener");
    window.addEventListener("meow:cta-inline-eligible", handleInlineEligible);
    return () => {
      console.log("🔇 [CTA-DEBUG] Removing meow:cta-inline-eligible event listener");
      window.removeEventListener("meow:cta-inline-eligible", handleInlineEligible);
    };
  }, [fetchCtaStatus]);

  // Listen for server-confirmed 42 event from OverviewTab
  useEffect(() => {
    const timers = [];

    const handleReached42 = () => {
      console.log("🎯 [CTA-DEBUG] Received meow:reached42:server event");
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
  }, [fetchCtaStatus]);

  // Listen for CTA check event when tap response confirms 42
  useEffect(() => {
    const timers = [];

    const handleCtaCheck = () => {
      console.log("🔍 [CTA-DEBUG] Received meow:cta-check event");
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
  }, [fetchCtaStatus]);

  // Light polling to reflect global daily cap
  useEffect(() => {
    fetchCtaStatus();
    const interval = setInterval(() => {
      console.log("⏰ [CTA-DEBUG] Polling interval triggered");
      fetchCtaStatus();
    }, 20000);
    return () => clearInterval(interval);
  }, [fetchCtaStatus, activeTab]);

  const handleClaimAndGoToOrder = useCallback(async () => {
    if (ctaLoading) return;

    try {
      setCtaLoading(true);
      const res = await apiCall("/api/meow-claim");

      if (res?.success && res?.claimId) {
        showSuccess("Скидка 42% активирована на заказ 🎉");
        setCtaStatus((s) => ({ ...s, eligible: false, usedToday: true }));
        navigate(`/order?promo=MEOW42&claim=${res.claimId}`);
      } else {
        showError(res?.error || "Не удалось активировать предложение");
        fetchCtaStatus();
      }
    } catch (e) {
      showError(e?.message || "Сеть недоступна");
      fetchCtaStatus();
    } finally {
      setCtaLoading(false);
    }
  }, [ctaLoading, navigate, fetchCtaStatus]);

  const stats = data?.stats || {};
  const streakInfo = data?.stats?.streakInfo || {};
  
  // CTA visibility logic
  const showMeowCTA = ctaStatus.eligible;
  
  // Debug output on every render
  console.log("🎨 [CTA-DEBUG] RENDER - ctaStatus:", ctaStatus);
  console.log("🎨 [CTA-DEBUG] RENDER - showMeowCTA:", showMeowCTA);

  // Show "you're late" message if user reached 42 but all claims are taken
  const isLateToday =
    !ctaStatus.eligible &&
    ctaStatus.meow_taps === 42 &&
    Number(ctaStatus.remainingGlobal) === 0;

  console.log("🎨 [CTA-DEBUG] RENDER - isLateToday:", isLateToday);

  return (
    <div className="p-4 space-y-6 pb-28 bg-background text-primary">
      <AnnouncementBar />

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

      {/* 🔍 DEBUG: Always show CTA state for visibility */}
      <div className="rounded-lg border border-blue-500/30 bg-blue-500/10 text-blue-300 px-3 py-2 text-xs font-mono">
        <div>DEBUG CTA State:</div>
        <div>eligible: {String(ctaStatus.eligible)}</div>
        <div>usedToday: {String(ctaStatus.usedToday)}</div>
        <div>remainingGlobal: {ctaStatus.remainingGlobal}</div>
        <div>meow_taps: {ctaStatus.meow_taps}</div>
        <div>showMeowCTA: {String(showMeowCTA)}</div>
      </div>

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

      {isLateToday && (
        <div className="rounded-xl border border-yellow-400/20 bg-yellow-400/10 text-yellow-200 px-3 py-2 text-sm">
          Вы опоздали, попробуйте завтра.
        </div>
      )}

      <BottomNav />
    </div>
  );
};

export default ProfilePage;
