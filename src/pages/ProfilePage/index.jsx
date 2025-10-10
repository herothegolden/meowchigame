// Path: frontend/src/pages/ProfilePage/index.jsx
// v34 — ULTRA-SIMPLE FIX: Read meow counter from sessionStorage cache
// CHANGES:
// 1. Reads client counter from sessionStorage (same key as OverviewTab)
// 2. Shows CTA when client counter OR server counter >= 42
// 3. No new events needed - uses existing infrastructure
// 4. Handles daily reset race condition elegantly

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

  // ✅ NEW: Helper to read cached counter from sessionStorage (same key as OverviewTab)
  const getClientMeowCounter = useCallback(() => {
    try {
      const cached = sessionStorage.getItem("meowchi:v2:meow_taps");
      if (cached) {
        const parsed = JSON.parse(cached);
        return Number(parsed?.value) || 0;
      }
    } catch {}
    return 0;
  }, []);

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

      // Ignore stale responses
      if (reqId !== ctaReqSeqRef.current) return;

      setCtaStatus((prev) => {
        const next = {
          eligible: !!res.eligible,
          usedToday: !!res.usedToday,
          remainingGlobal: Number(res.remainingGlobal || 0),
          meow_taps: Number(res.meow_taps || 0),
        };

        // Prefer-truthy guard: Don't demote eligible:true to false unless explicitly used
        if (prev.eligible === true && next.eligible === false && next.usedToday !== true) {
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
    const serverTaps = data?.stats?.meow_taps || 0;
    const clientTaps = getClientMeowCounter();
    
    if (serverTaps >= 42 || clientTaps >= 42) {
      fetchCtaStatus();
    }
  }, [data?.stats?.meow_taps, fetchCtaStatus, getClientMeowCounter]);

  // Listen for inline eligibility from OverviewTab (atomic /meow-tap response)
  useEffect(() => {
    const handleInlineEligible = (evt) => {
      const d = (evt && evt.detail) || {};
      setCtaStatus((prev) => ({
        ...prev,
        eligible: true,
        usedToday: !!d.usedToday || false,
        remainingGlobal: Number(
          d.remainingGlobal !== undefined ? d.remainingGlobal : prev.remainingGlobal
        ),
        meow_taps: Math.max(prev.meow_taps || 0, 42),
      }));

      // Sanity check shortly after
      setTimeout(() => {
        fetchCtaStatus();
      }, 600);
    };

    window.addEventListener("meow:cta-inline-eligible", handleInlineEligible);
    return () => window.removeEventListener("meow:cta-inline-eligible", handleInlineEligible);
  }, [fetchCtaStatus]);

  // Listen for server-confirmed 42 event from OverviewTab
  useEffect(() => {
    const timers = [];

    const handleReached42 = () => {
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

  // Light polling to reflect global daily cap - ONLY when user reached 42
  useEffect(() => {
    const clientTaps = getClientMeowCounter();
    const serverTaps = data?.stats?.meow_taps || 0;
    
    if (clientTaps >= 42 || serverTaps >= 42) {
      fetchCtaStatus();
      const interval = setInterval(fetchCtaStatus, 20000);
      return () => clearInterval(interval);
    }
  }, [fetchCtaStatus, activeTab, getClientMeowCounter, data?.stats?.meow_taps]);

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
  
  // ✅ CRITICAL FIX: Check BOTH client cache AND server state for 42
  const clientMeowTaps = getClientMeowCounter();
  const serverMeowTaps = Math.max(stats.meow_taps || 0, ctaStatus.meow_taps);
  const userReached42 = Math.max(clientMeowTaps, serverMeowTaps) >= 42;
  
  // Show CTA only when: reached 42 AND not used today AND quota available
  const showMeowCTA = userReached42 && !ctaStatus.usedToday && ctaStatus.remainingGlobal > 0;

  // Show "you're late" message if reached 42 but quota exhausted
  const isLateToday = userReached42 && !ctaStatus.usedToday && ctaStatus.remainingGlobal === 0;
  
  // Show "already used" message if reached 42 but used today
  const alreadyUsedToday = userReached42 && ctaStatus.usedToday;

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

      {/* CTA Button - Shows when user reached 42 and eligible */}
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

      {/* Too Late Message - Quota exhausted */}
      {isLateToday && (
        <div className="rounded-xl border border-yellow-400/20 bg-yellow-400/10 text-yellow-200 px-3 py-2 text-sm">
          😿 Вы опоздали! Все 42 места заняты. Попробуйте завтра.
        </div>
      )}

      {/* Already Used Message - User already claimed today */}
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
