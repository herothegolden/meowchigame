// Path: frontend/src/pages/ProfilePage/index.jsx
// v25 — Staleness guard + prefer-truthy for CTA; trimmed retries; light observability.
// - Adds a monotonic request id to fetchCtaStatus() and ignores late/stale responses.
// - Prefer-truthy rule: once eligible===true, do not demote to false unless usedToday===true.
// - Keeps 20s polling, event trigger now: immediate + one late retry (~1400ms).
// - Concise console logs show request id, origin, and whether a response was applied or ignored.

import React, { useState, useEffect, useCallback, Suspense, lazy, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { apiCall, showError, showSuccess } from "../../utils/api";
import ProfileHeader from "./ProfileHeader";
import BottomNav from "../../components/BottomNav";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import AnnouncementBar from "../../components/AnnouncementBar";

// ✅ Lazy tabs
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

  // ---- Staleness guard refs (monotonic request id) ----
  const ctaReqSeqRef = useRef(0);           // incremented for each fetch start
  const ctaLastStartedRef = useRef(0);      // id of the latest started request
  const ctaLastAppliedRef = useRef(0);      // id of the latest applied response

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

  // origin: "mount" | "reached42:server" | "retry1400" | "poll" | "tab" | "init>=42"
  const fetchCtaStatus = useCallback(
    async (origin = "manual") => {
      const reqId = ++ctaReqSeqRef.current;
      ctaLastStartedRef.current = reqId;
      // Observability: request start
      // eslint-disable-next-line no-console
      console.log("[CTA] start", { reqId, origin, t: Math.round(performance.now()) });

      try {
        const res = await apiCall("/api/meow-cta-status");

        // Staleness guard: only apply if this is the latest started request
        if (reqId !== ctaLastStartedRef.current) {
          // eslint-disable-next-line no-console
          console.log("[CTA] ignore(stale)", {
            reqId,
            lastStarted: ctaLastStartedRef.current,
            origin,
            res,
            t: Math.round(performance.now()),
          });
          return;
        }

        // Prefer-truthy safety: do not demote eligible:true → false unless usedToday becomes true
        setCtaStatus((prev) => {
          const next = {
            eligible: !!res.eligible,
            usedToday: !!res.usedToday,
            remainingGlobal: Number(res.remainingGlobal || 0),
            meow_taps: Number(res.meow_taps || 0),
          };

          let applied;
          if (prev.eligible === true && next.eligible === false && next.usedToday !== true) {
            // Keep CTA visible; still refresh ancillary fields
            applied = {
              ...prev,
              usedToday: prev.usedToday, // do not toggle to false here
              remainingGlobal: next.remainingGlobal,
              meow_taps: next.meow_taps,
            };
            // eslint-disable-next-line no-console
            console.log("[CTA] applied(prefer-truthy, no demote)", {
              reqId,
              origin,
              prev,
              next,
              t: Math.round(performance.now()),
            });
          } else {
            applied = next;
            // eslint-disable-next-line no-console
            console.log("[CTA] applied", {
              reqId,
              origin,
              applied,
              t: Math.round(performance.now()),
            });
          }

          ctaLastAppliedRef.current = reqId;
          return applied;
        });
      } catch (e) {
        // eslint-disable-next-line no-console
        console.log("[CTA] error", {
          reqId,
          origin,
          err: e?.message || String(e),
          t: Math.round(performance.now()),
        });
        // CTA is optional; ignore network errors here.
      }
    },
    []
  );

  // 🔁 When child components ask to "update", refresh both data and CTA.
  const handleProfileUpdate = useCallback(async () => {
    await fetchData();
    await fetchCtaStatus("tab"); // origin mark: tab/child update
  }, [fetchData, fetchCtaStatus]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // If already at 42 on initial load (e.g., returning to Profile), fetch CTA immediately.
  useEffect(() => {
    if (data?.stats?.meow_taps >= 42) {
      fetchCtaStatus("init>=42");
    }
  }, [data?.stats?.meow_taps, fetchCtaStatus]);

  // Listen for "42 reached (server-confirmed)" and schedule immediate + one late retry (~1400ms).
  useEffect(() => {
    const timers = [];
    const onReached42Server = () => {
      fetchCtaStatus("reached42:server");
      timers.push(setTimeout(() => fetchCtaStatus("retry1400"), 1400));
    };
    window.addEventListener("meow:reached42:server", onReached42Server);
    return () => {
      window.removeEventListener("meow:reached42:server", onReached42Server);
      timers.forEach((t) => clearTimeout(t));
    };
  }, [fetchCtaStatus]);

  // Light polling (reflects global daily cap). Prefer-truthy rule ensures no demotion flicker.
  useEffect(() => {
    fetchCtaStatus("mount");
    const t = setInterval(() => fetchCtaStatus("poll"), 20000);
    return () => clearInterval(t);
  }, [fetchCtaStatus, activeTab]);

  const handleClaimAndGoToOrder = useCallback(async () => {
    if (ctaLoading) return;
    try {
      setCtaLoading(true);
      const res = await apiCall("/api/meow-claim");
      if (res?.success && res?.claimId) {
        showSuccess("Скидка 42% активирована на заказ 🎉");
        // Hide CTA locally to avoid double taps (usedToday becomes true)
        setCtaStatus((s) => ({ ...s, eligible: false, usedToday: true }));
        navigate(`/order?promo=MEOW42&claim=${res.claimId}`);
      } else {
        showError(res?.error || "Не удалось активировать предложение");
        fetchCtaStatus("post-claim-fail");
      }
    } catch (e) {
      showError(e?.message || "Сеть недоступна");
      fetchCtaStatus("post-claim-error");
    } finally {
      setCtaLoading(false);
    }
  }, [ctaLoading, navigate, fetchCtaStatus]);

  const stats = data?.stats || {};
  const streakInfo = data?.stats?.streakInfo || {};

  // Server decides eligibility
  const showMeowCTA = !!ctaStatus.eligible;

  // Late-state helper: show explicit message if user is #43+ with 42 taps
  const isLateToday =
    !ctaStatus.eligible && ctaStatus.meow_taps === 42 && Number(ctaStatus.remainingGlobal) === 0;

  return (
    <div className="p-4 space-y-6 pb-28 bg-background text-primary">
      {/* Red announcement stripe at the very top (just under Telegram header) */}
      <AnnouncementBar />

      {/* Inline error (non-blocking) */}
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

      {/* Header: instant shell + tiny skeleton while hydrating */}
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

      {/* Tabs container (always mounted; contents hydrate lazily) */}
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
                onUpdate={handleProfileUpdate}
                // Child has its own onReached42 callback, but parent relies on window event too.
                onReached42={() => fetchCtaStatus("child-callback")}
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

      {/* Meow CTA — renders under tabs when eligible */}
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

      {/* Late message when quota exhausted but user is at 42 */}
      {isLateToday && (
        <div className="rounded-xl border border-yellow-400/20 bg-yellow-400/10 text-yellow-200 px-3 py-2 text-sm">
          Вы опоздали, попробуйте завтра.
        </div>
      )}

      {/* Bottom Navigation */}
      <BottomNav />
    </div>
  );
};

export default ProfilePage;
