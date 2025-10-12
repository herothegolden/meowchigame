// Path: src/pages/ProfilePage/index.jsx
// v22 — Add local ErrorBoundary + hard guards to surface the real error
// - No mechanics/flows changed for happy path
// - If something throws, you’ll see a small dev banner with the error/stack
// - Removed risky globals; minimal, defensive rendering

import React, { useState, useEffect, useCallback, Suspense, lazy } from "react";
import { useNavigate } from "react-router-dom";
import { apiCall, showError, showSuccess } from "../../utils/api";
import ProfileHeader from "./ProfileHeader";
import BottomNav from "../../components/BottomNav";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

// Lazy tabs (unchanged)
const OverviewTab = lazy(() => import("./tabs/OverviewTab"));
const LeaderboardTab = lazy(() => import("./tabs/LeaderboardTab"));
const TasksTab = lazy(() => import("./tabs/TasksTab"));

/* ---------- Dev-only ErrorBoundary (local, no flow change) ---------- */
class LocalErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { err: null };
  }
  static getDerivedStateFromError(err) {
    return { err };
  }
  componentDidCatch(err, info) {
    // Keep console noise low but make error visible
    // eslint-disable-next-line no-console
    console.error("⛔ ProfilePage crashed:", err, info);
  }
  render() {
    const { err } = this.state;
    if (err) {
      // Minimal dev banner; does not alter normal UX when no error
      return (
        <div className="p-4 space-y-4">
          <div className="rounded-lg border border-red-500/30 bg-red-500/10 text-red-300 px-3 py-2 text-sm">
            <div className="font-semibold mb-1">ProfilePage render error</div>
            <div className="text-xs whitespace-pre-wrap break-words">
              {String(err?.message || err)}
            </div>
          </div>
          {/* Offer a retry to re-run effects */}
          <button
            onClick={() => this.setState({ err: null })}
            className="px-3 py-2 rounded bg-accent text-background text-sm"
          >
            Try again
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

const ProfilePage = () => {
  const navigate = useNavigate();

  const [data, setData] = useState(null);
  const [activeTab, setActiveTab] = useState("overview");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Meow CTA status from server
  const [ctaStatus, setCtaStatus] = useState({
    eligible: false,
    usedToday: false,
    remainingGlobal: 0,
    meow_taps: 0,
  });
  const [ctaLoading, setCtaLoading] = useState(false);

  // Tiny optimistic flag to surface CTA instantly at the lock moment (client event)
  const [optimisticEligible, setOptimisticEligible] = useState(false);

  const safeSetData = useCallback((result) => {
    // Defensive: ensure result shape to avoid render-time exceptions
    const stats = result && typeof result === "object" ? result.stats || {} : {};
    setData({
      stats: {
        ...stats,
        meow_taps: Number(stats?.meow_taps ?? 0),
        daily_streak: Number(stats?.daily_streak ?? 0),
        high_score_today: Number(stats?.high_score_today ?? 0),
      },
      shopData: result?.shopData || { items: [], userPoints: 0, inventory: [] },
    });
  }, []);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const result = await apiCall("/api/get-profile-complete");
      safeSetData(result);
    } catch (err) {
      console.error("❌ Failed to load profile:", err);
      setError(err?.message || "Failed to load profile");
    } finally {
      setLoading(false);
    }
  }, [safeSetData]);

  const fetchCtaStatus = useCallback(async () => {
    try {
      const res = await apiCall("/api/meow-cta-status");
      setCtaStatus({
        eligible: !!res?.eligible,
        usedToday: !!res?.usedToday,
        remainingGlobal: Number(res?.remainingGlobal || 0),
        meow_taps: Number(res?.meow_taps || 0),
      });
    } catch (e) {
      // non-fatal: we keep UI running
      console.warn("⚠️ /meow-cta-status failed:", e?.message || e);
    }
  }, []);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  // If already at 42 on initial load (navigate back), fetch CTA immediately and surface it.
  useEffect(() => {
    const taps = Number(data?.stats?.meow_taps ?? 0);
    if (taps >= 42) {
      setOptimisticEligible(true); // surface right away from profile payload
      void fetchCtaStatus();
    }
  }, [data?.stats?.meow_taps, fetchCtaStatus]);

  // Listen for custom event from OverviewTab when user reaches 42 in-session (fallback path).
  useEffect(() => {
    const onReached42 = () => {
      setOptimisticEligible(true);
      // Reconcile with backend (retry ladder to handle DB visibility latency)
      void fetchCtaStatus();
      const t1 = setTimeout(fetchCtaStatus, 150);
      const t2 = setTimeout(fetchCtaStatus, 400);
      const t3 = setTimeout(fetchCtaStatus, 800);
      return () => {
        clearTimeout(t1);
        clearTimeout(t2);
        clearTimeout(t3);
      };
    };

    window.addEventListener("meow:reached42", onReached42);
    document.addEventListener("meow:reached42", onReached42);
    return () => {
      window.removeEventListener("meow:reached42", onReached42);
      document.removeEventListener("meow:reached42", onReached42);
    };
  }, [fetchCtaStatus]);

  // Poll CTA status lightly (reflects global 42 cap) and on tab switch
  useEffect(() => {
    void fetchCtaStatus();
    const t = setInterval(fetchCtaStatus, 20000);
    return () => clearInterval(t);
  }, [fetchCtaStatus, activeTab]);

  const handleClaimAndGoToOrder = useCallback(async () => {
    if (ctaLoading) return;
    try {
      setCtaLoading(true);
      const res = await apiCall("/api/meow-claim");
      if (res?.success && res?.claimId) {
        showSuccess("Скидка 42% активирована на заказ 🎉");
        setCtaStatus((s) => ({ ...s, eligible: false, usedToday: true }));
        setOptimisticEligible(false);
        navigate(`/order?promo=MEOW42&claim=${res.claimId}`);
      } else {
        showError(res?.error || "Не удалось активировать предложение");
        void fetchCtaStatus();
      }
    } catch (e) {
      showError(e?.message || "Сеть недоступна");
      void fetchCtaStatus();
    } finally {
      setCtaLoading(false);
    }
  }, [ctaLoading, navigate, fetchCtaStatus]);

  const stats = data?.stats || {};
  const streakInfo = data?.stats?.streakInfo || {};

  // FINAL gate for visibility (unchanged rules):
  // 1) server says eligible OR
  // 2) we reached 42 this session (optimistic) OR
  // 3) profile already reports 42 today and not used
  const showMeowCTA =
    !!ctaStatus.eligible ||
    optimisticEligible ||
    ((Number(stats?.meow_taps ?? 0) >= 42) && !ctaStatus.usedToday);

  return (
    <LocalErrorBoundary>
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

        {/* Profile Header */}
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

        {/* Tabs Section */}
        <div className="relative overflow-hidden rounded-lg bg-[#1b1b1b] border border-white/10 shadow-[0_4px_24px_rgba(0,0,0,0.4)] backdrop-blur-xl">
          <Tabs
            value={activeTab}
            onValueChange={(v) => setActiveTab(v || "overview")}
            className="w-full relative z-10"
          >
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

        {/* Meow CTA — appears only when visible by rules above */}
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
    </LocalErrorBoundary>
  );
};

export default ProfilePage;
