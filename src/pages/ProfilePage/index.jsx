// Path: frontend/src/pages/ProfilePage/index.jsx
// v19 — Debug + fix CTA appearance issue:
// - Added comprehensive console logging for CTA status flow
// - Extended retry delays to handle race condition with backend DB updates
// - Added longer-term polling after initial retries
// - Keep BACKEND_URL prop fix from v18

import React, { useState, useEffect, useCallback, Suspense, lazy } from "react";
import { useNavigate } from "react-router-dom";
import { apiCall, showError, showSuccess } from "../../utils/api";
import ProfileHeader from "./ProfileHeader";
import BottomNav from "../../components/BottomNav";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

// ✅ Corrected lazy imports (moved to /tabs/ folder)
const OverviewTab = lazy(() => import("./tabs/OverviewTab"));
const LeaderboardTab = lazy(() => import("./tabs/LeaderboardTab"));
const TasksTab = lazy(() => import("./tabs/TasksTab"));

// 🔧 Backend URL from environment
const BACKEND_URL = import.meta.env.VITE_BACKEND_URL;

const ProfilePage = () => {
  const navigate = useNavigate();

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

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const result = await apiCall("/api/get-profile-complete");
      setData(result);
    } catch (err) {
      console.error("❌ Failed to load profile:", err);
      setError(err.message || "Failed to load profile");
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchCtaStatus = useCallback(async () => {
    try {
      console.log('🔍 [CTA] Fetching CTA status...');
      const res = await apiCall("/api/meow-cta-status");
      
      // 🔍 DEBUG: Log full response
      console.log('🔍 [CTA] Response:', {
        meow_taps: res.meow_taps,
        usedToday: res.usedToday,
        remainingGlobal: res.remainingGlobal,
        eligible: res.eligible
      });

      setCtaStatus({
        eligible: !!res.eligible,
        usedToday: !!res.usedToday,
        remainingGlobal: Number(res.remainingGlobal || 0),
        meow_taps: Number(res.meow_taps || 0),
      });

      // 🔍 DEBUG: Log state update
      if (res.eligible) {
        console.log('✅ [CTA] ELIGIBLE! CTA should appear now');
      } else {
        console.log('❌ [CTA] NOT ELIGIBLE:', {
          reason: res.meow_taps < 42 ? 'Counter below 42' :
                  res.usedToday ? 'Already used today' :
                  res.remainingGlobal <= 0 ? 'No slots remaining' :
                  'Unknown'
        });
      }
    } catch (e) {
      console.error('❌ [CTA] Failed to fetch status:', e);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // If already at 42 on initial load (e.g., navigated back), fetch CTA immediately.
  useEffect(() => {
    if (data?.stats?.meow_taps >= 42) {
      console.log('🔍 [CTA] Initial load: User at 42, fetching CTA status');
      fetchCtaStatus();
    }
  }, [data?.stats?.meow_taps, fetchCtaStatus]);

  // Listen for custom event from OverviewTab when user reaches 42 in-session.
  useEffect(() => {
    const onReached42 = () => {
      console.log('🎯 [CTA] Event received: meow:reached42');
      console.log('🔍 [CTA] Starting aggressive retry sequence...');
      
      // Immediate check
      console.log('🔍 [CTA] Retry #0: Immediate');
      fetchCtaStatus();
      
      // Extended retry ladder (more attempts, longer delays)
      const t1 = setTimeout(() => {
        console.log('🔍 [CTA] Retry #1: 300ms');
        fetchCtaStatus();
      }, 300);
      
      const t2 = setTimeout(() => {
        console.log('🔍 [CTA] Retry #2: 600ms');
        fetchCtaStatus();
      }, 600);
      
      const t3 = setTimeout(() => {
        console.log('🔍 [CTA] Retry #3: 1000ms');
        fetchCtaStatus();
      }, 1000);
      
      const t4 = setTimeout(() => {
        console.log('🔍 [CTA] Retry #4: 1500ms');
        fetchCtaStatus();
      }, 1500);
      
      const t5 = setTimeout(() => {
        console.log('🔍 [CTA] Retry #5: 2000ms');
        fetchCtaStatus();
      }, 2000);
      
      const t6 = setTimeout(() => {
        console.log('🔍 [CTA] Final check: 3000ms');
        fetchCtaStatus();
      }, 3000);
      
      return () => {
        clearTimeout(t1);
        clearTimeout(t2);
        clearTimeout(t3);
        clearTimeout(t4);
        clearTimeout(t5);
        clearTimeout(t6);
      };
    };
    
    window.addEventListener("meow:reached42", onReached42);
    return () => window.removeEventListener("meow:reached42", onReached42);
  }, [fetchCtaStatus]);

  // Poll CTA status lightly (reflects global 42 cap); also on tab switch
  useEffect(() => {
    fetchCtaStatus();
    const t = setInterval(fetchCtaStatus, 20000);
    return () => clearInterval(t);
  }, [fetchCtaStatus, activeTab]);

  const handleClaimAndGoToOrder = useCallback(async () => {
    if (ctaLoading) return;
    try {
      setCtaLoading(true);
      console.log('🔍 [CTA] Claiming promo...');
      
      const res = await apiCall("/api/meow-claim");
      console.log('🔍 [CTA] Claim response:', res);
      
      if (res?.success && res?.claimId) {
        showSuccess("Скидка 42% активирована на заказ 🎉");
        // Hide CTA locally to avoid double-taps
        setCtaStatus((s) => ({ ...s, eligible: false, usedToday: true }));
        console.log('✅ [CTA] Claim successful, navigating to order page');
        navigate(`/order?promo=MEOW42&claim=${res.claimId}`);
      } else {
        console.error('❌ [CTA] Claim failed:', res?.error);
        showError(res?.error || "Не удалось активировать предложение");
        fetchCtaStatus();
      }
    } catch (e) {
      console.error('❌ [CTA] Claim error:', e);
      showError(e?.message || "Сеть недоступна");
      fetchCtaStatus();
    } finally {
      setCtaLoading(false);
    }
  }, [ctaLoading, navigate, fetchCtaStatus]);

  const stats = data?.stats || {};
  const streakInfo = data?.stats?.streakInfo || {};

  // Show CTA if server says eligible (meow_taps >= 42, not used today, remainingGlobal > 0)
  const showMeowCTA = !!ctaStatus.eligible;
  
  // 🔍 DEBUG: Log CTA visibility state
  useEffect(() => {
    console.log('🔍 [CTA] Visibility check:', {
      showMeowCTA,
      eligible: ctaStatus.eligible,
      meow_taps: ctaStatus.meow_taps,
      usedToday: ctaStatus.usedToday,
      remainingGlobal: ctaStatus.remainingGlobal
    });
  }, [showMeowCTA, ctaStatus]);

  return (
    <div className="p-4 space-y-6 pb-28 bg-background text-primary">
      {/* Inline error banner (non-blocking) */}
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

      {/* Profile Header — instant shell render.
          Show a tiny skeleton while loading, otherwise real header. */}
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

      {/* Tabs Section — always visible; contents hydrate progressively */}
      <div className="relative overflow-hidden rounded-lg bg-[#1b1b1b] border border-white/10 shadow-[0_4px_24px_rgba(0,0,0,0.4)] backdrop-blur-xl">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full relative z-10">
          <TabsList className="grid grid-cols-3 rounded-t-lg border-b border-white/10">
            <TabsTrigger value="overview">Обзор</TabsTrigger>
            <TabsTrigger value="leaderboard">Рейтинг</TabsTrigger>
            <TabsTrigger value="tasks">Задания</TabsTrigger>
          </TabsList>

          {/* Overview */}
          <TabsContent value="overview">
            <Suspense
              fallback={
                <div className="p-4 text-center text-secondary text-sm">
                  Loading overview...
                </div>
              }
            >
              {/* 🔧 Pass BACKEND_URL prop to OverviewTab */}
              <OverviewTab
                stats={stats}
                streakInfo={streakInfo}
                onUpdate={fetchData}
                BACKEND_URL={BACKEND_URL}
              />
            </Suspense>
          </TabsContent>

          {/* Leaderboard */}
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

          {/* Tasks */}
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

      {/* 🔍 DEBUG: Always show CTA status in console */}
      {showMeowCTA && console.log('🎨 [CTA] Rendering CTA button')}
      
      {/* Meow CTA — under tabs (appears only when eligible). */}
      {showMeowCTA && (
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

      {/* Bottom Navigation */}
      <BottomNav />
    </div>
  );
};

export default ProfilePage;
