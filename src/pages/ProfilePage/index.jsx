// v12 — PROFILE PAGE SAFE PERF FIXES
// - PERF FIX 1: Cache Header Stats in sessionStorage for instant header paint
// - PERF FIX 2: Parallel CTA Check when cache indicates ≥42
// - PERF FIX 5: Consistent loading states (use cached values during load)

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

  // PERF FIX 1: Read cached header data immediately for instant header paint
  const [cachedHeader, setCachedHeader] = useState(() => {
    try {
      const raw = sessionStorage.getItem("profileHeader");
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  });

  // PERF FIX 1: When fetching completes, cache minimal header stats for next load
  const fetchData = useCallback(async () => {
    if (!isTMA) return;
    try {
      setLoading(true);
      setError(null);
      const result = await apiCall("/api/get-profile-complete");
      setData(result);

      // PERF FIX 1: Save minimal header info
      const stats = result?.stats || {};
      const streakInfo = stats?.streakInfo || {};
      const cache = {
        points: stats.points || 0,
        name: stats.name || "",
        rank: stats.rank || "",
        avatar: stats.avatar || "",
        streak: streakInfo?.streak || 0,
        meow_taps: stats.meow_taps || 0,
      };
      sessionStorage.setItem("profileHeader", JSON.stringify(cache));
      setCachedHeader(cache);
    } catch (err) {
      setError(err.message || "Failed to load profile");
    } finally {
      setLoading(false);
    }
  }, [isTMA]);

  const fetchCtaStatus = useCallback(async () => {
    if (!isTMA) return;
    try {
      const res = await apiCall("/api/meow-cta-status");
      setCtaStatus((s) => ({
        ...s,
        eligible: !!res.eligible,
        usedToday: !!res.usedToday,
        meow_taps: Number(res.meow_taps || 0),
        remainingGlobal: Number(res.remainingGlobal || 0),
      }));
    } catch {
      // Silent fail; UI falls back to current state
    }
  }, [isTMA]);

  // PERF FIX 2: Parallel CTA check if cache shows ≥42
  useEffect(() => {
    if (!isTMA) return;
    const cached = cachedHeader?.meow_taps;
    if (cached && cached >= 42) {
      fetchCtaStatus();
    }
    fetchData();
  }, [isTMA, fetchData, fetchCtaStatus, cachedHeader?.meow_taps]);

  // If we load a profile already at 42, check CTA immediately
  useEffect(() => {
    if (!isTMA) return;
    if (data?.stats?.meow_taps >= 42) {
      fetchCtaStatus();
    }
  }, [isTMA, data?.stats?.meow_taps, fetchCtaStatus]);

  // Listen for "meow:reached42" events from OverviewTab
  useEffect(() => {
    if (!isTMA) return;

    const onReached42 = (e) => {
      if (e?.detail && e.detail.eligible === true) {
        setCtaStatus((s) => ({ ...s, eligible: true, usedToday: !!e.detail.usedToday }));
      } else {
        fetchCtaStatus();
      }
      const t1 = setTimeout(fetchCtaStatus, 150);
      const t2 = setTimeout(fetchCtaStatus, 400);
      const t3 = setTimeout(fetchCtaStatus, 800);
      post42TimersRef.current.push(t1, t2, t3);
    };

    window.addEventListener("meow:reached42", onReached42);
    return () => {
      window.removeEventListener("meow:reached42", onReached42);
      for (const t of post42TimersRef.current) clearTimeout(t);
      post42TimersRef.current = [];
    };
  }, [isTMA, fetchCtaStatus]);

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
  }, [ctaLoading, isTMA, navigate, fetchCtaStatus]);

  const stats = data?.stats || {};
  const streakInfo = data?.stats?.streakInfo || {};
  const showMeowCTA = !!ctaStatus.eligible;

  // -------- Non-Telegram rendering --------
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

      {/* PERF FIX 5: show cached header even while loading */}
      {loading ? (
        cachedHeader ? (
          <ProfileHeader stats={cachedHeader} onUpdate={fetchData} />
        ) : (
          <div className="rounded-xl border border-white/10 bg-[#1b1b1b] p-4 animate-pulse">
            <div className="h-6 w-40 bg-white/10 rounded mb-3" />
            <div className="grid grid-cols-3 gap-3">
              <div className="h-16 bg-white/10 rounded" />
              <div className="h-16 bg-white/10 rounded" />
              <div className="h-16 bg-white/10 rounded" />
            </div>
          </div>
        )
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
