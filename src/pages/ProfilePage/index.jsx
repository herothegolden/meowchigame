// Path: src/pages/ProfilePage/index.jsx
// v18 — Option A (frontend-only):
// - On 'meow:reached42' event, optimistically set CTA eligible=true immediately,
//   then run the existing fetchCtaStatus() + retry ladder to reconcile with server.
// - No other mechanics/flows changed.

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
      // apiCall always posts initData in body; backend route is POST /api/meow-cta-status
      const res = await apiCall("/api/meow-cta-status");
      setCtaStatus({
        eligible: !!res.eligible,
        usedToday: !!res.usedToday,
        remainingGlobal: Number(res.remainingGlobal || 0),
        meow_taps: Number(res.meow_taps || 0),
      });
    } catch (e) {
      // Silently ignore; CTA is optional UI
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // If already at 42 on initial load (e.g., navigated back), fetch CTA immediately.
  useEffect(() => {
    if (data?.stats?.meow_taps >= 42) {
      fetchCtaStatus();
    }
  }, [data?.stats?.meow_taps, fetchCtaStatus]);

  // Listen for custom event from OverviewTab when user reaches 42 in-session.
  useEffect(() => {
    const onReached42 = () => {
      // --- Option A: Optimistic CTA reveal (frontend-only, minimal) ---
      // Show the CTA immediately at the lock moment; server remains final authority
      // because /api/meow-claim will still validate eligibility.
      setCtaStatus((s) => ({
        ...s,
        eligible: true,
        // Keep a sane floor at 42 for display if prior value was lower
        meow_taps: Math.max(42, Number(s.meow_taps || 0)),
      }));

      // Immediate server reconciliation + short retry ladder to outwait DB latency
      fetchCtaStatus();
      const t1 = setTimeout(fetchCtaStatus, 150);
      const t2 = setTimeout(fetchCtaStatus, 400);
      const t3 = setTimeout(fetchCtaStatus, 800);
      // Note: returning a cleanup function from the event handler is a no-op for addEventListener;
      // timers will be GC'd shortly after firing.
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
      // apiCall always posts; backend route is POST /api/meow-claim
      const res = await apiCall("/api/meow-claim");
      if (res?.success && res?.claimId) {
        showSuccess("Скидка 42% активирована на заказ 🎉");
        // Hide CTA locally to avoid double-taps
        setCtaStatus((s) => ({ ...s, eligible: false, usedToday: true }));
        navigate(`/order?promo=MEOW42&claim=${res.claimId}`);
      } else {
        showError(res?.error || "Не удалось активировать предложение");
        // Refresh CTA status to reflect server truth
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

  // Show CTA if server says eligible (or optimistic flip just occurred)
  const showMeowCTA = !!ctaStatus.eligible;

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
          Show a tiny skeleton while data hydrates, otherwise real header. */}
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
              <OverviewTab
                stats={stats}
                streakInfo={streakInfo}
                onUpdate={fetchData}
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
