// Path: src/pages/ProfilePage/index.jsx
// v17 — Instant paint:
// - Removed full-screen loading gate to avoid black screen.
// - Render page shell immediately; show a tiny inline header skeleton while data hydrates.
// - Kept tabs lazy + local fallbacks; CTA logic unchanged.

import React, { useState, useEffect, useCallback, Suspense, lazy } from "react";
import { useNavigate } from "react-router-dom";
import { apiCall, showError, showSuccess } from "../../utils/api";
import ProfileHeader from "./ProfileHeader";
import BottomNav from "../../components/BottomNav";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "../../components/ui/tabs";

// ✅ Corrected lazy imports (moved to /tabs/ folder)
const OverviewTab = lazy(() => import("./tabs/OverviewTab.jsx"));
const LeaderboardTab = lazy(() => import("./tabs/LeaderboardTab.jsx"));
const TasksTab = lazy(() => import("./tabs/TasksTab.jsx"));

const ProfilePage = () => {
  const navigate = useNavigate();

  const [data, setData] = useState(null);
  const [activeTab, setActiveTab] = useState("overview");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Meow counter status
  const [meowCounter, setMeowCounter] = useState({
    count: 0,
    showCTA: false,
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

  const refreshMeowCounter = useCallback(async () => {
    try {
      const res = await apiCall("/api/meow-counter");
      const count = Number(res?.count ?? res?.meow_taps ?? 0);
      setMeowCounter({
        count,
        showCTA: Boolean(res?.showCTA ?? (res?.locked && count >= 42)),
      });
    } catch (e) {
      // Optional UI; swallow network errors
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // If already at 42 on initial load (e.g., navigated back), fetch CTA immediately.
  useEffect(() => {
    if (data?.stats?.meow_taps >= 42) {
      refreshMeowCounter();
    }
  }, [data?.stats?.meow_taps, refreshMeowCounter]);

  // Listen for custom event from OverviewTab when user reaches 42 in-session.
  useEffect(() => {
    const pendingTimeouts = new Set();

    const queueRefresh = () => {
      refreshMeowCounter();
      [150, 400, 800].forEach((delay) => {
        const id = setTimeout(() => {
          refreshMeowCounter();
          pendingTimeouts.delete(id);
        }, delay);
        pendingTimeouts.add(id);
      });
    };

    const onReached42 = () => {
      pendingTimeouts.forEach(clearTimeout);
      pendingTimeouts.clear();
      queueRefresh();
    };

    window.addEventListener("meow:reached42", onReached42);
    return () => {
      window.removeEventListener("meow:reached42", onReached42);
      pendingTimeouts.forEach(clearTimeout);
    };
  }, [refreshMeowCounter]);

  // Poll CTA status lightly (reflects global 42 cap); also on tab switch
  useEffect(() => {
    refreshMeowCounter();
    const t = setInterval(refreshMeowCounter, 20000);
    return () => clearInterval(t);
  }, [refreshMeowCounter, activeTab]);

  const handleGoToOrder = useCallback(() => {
    if (ctaLoading) return;
    setCtaLoading(true);
    try {
      showSuccess("Скидка 42% активирована на заказ 🎉");
      navigate("/order?promo=MEOW42");
    } catch (e) {
      showError(e?.message || "Не удалось открыть страницу заказа");
    } finally {
      setCtaLoading(false);
    }
  }, [ctaLoading, navigate]);

  const stats = data?.stats || {};
  const streakInfo = data?.stats?.streakInfo || {};

  const meowCount = Math.max(0, Number(meowCounter.count || 0));
  const showMeowCTA = Boolean(meowCounter.showCTA);

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
              onClick={handleGoToOrder}
              className={`px-4 py-2 rounded-lg font-semibold transition
                ${ctaLoading ? "bg-accent/60 cursor-wait" : "bg-accent hover:bg-accent/90"}
                text-background`}
            >
              {ctaLoading ? "Подождите..." : "Заказать сейчас"}
            </button>
          </div>
          <p className="mt-2 text-[12.5px] text-gray-400">
            Прогресс: {Math.min(meowCount, 42)} / 42 мяу за сегодня
          </p>
        </div>
      )}

      {/* Bottom Navigation */}
      <BottomNav />
    </div>
  );
};

export default ProfilePage;
