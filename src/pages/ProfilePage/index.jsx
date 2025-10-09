// Path: frontend/src/pages/ProfilePage/index.jsx
// v27 — Commit-lag backoff & atomic 42-response reinforcement (frontend-only).
// - Adds a short backoff window after the exact tap-42 response: immediate +300ms +1200ms CTA checks.
// - Tracks last "tap-42" moment; if a CTA read reports meow_taps<42 within ~1.8s, ignore & re-fetch (commit propagation guard).
// - Keeps v25 staleness guard + prefer-truthy (no demotion from eligible:true, unless usedToday:true).
// - Light logs indicate origins and whether backoff suppressed a stale result.

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

  // ---- Commit-propagation guard (when server just confirmed 42) ----
  const lastTap42AtRef = useRef(0);         // ms timestamp when /meow-tap returned 42/locked
  const TAP42_BACKOFF_MS = 1800;            // window where we treat sub-42 reads as stale

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

  // origin: "mount" | "reached42:server" | "retry1400" | "poll" | "tab" | "init>=42" | "tap-42-response" | "tap42-backoff-300" | "tap42-backoff-1200" | "tap42-backoff-retry" | "child-callback" | "post-claim-*"
  const fetchCtaStatus = useCallback(
    async (origin = "manual") => {
      const reqId = ++ctaReqSeqRef.current;
      ctaLastStartedRef.current = reqId;
      // Observability: request start
      // eslint-disable-next-line no-console
      console.log("[CTA] start", { reqId, origin, t: Math.round(performance.now()) });

      try {
        const res = await apiCall("/api/meow-cta-status");

        // Commit-lag guard: if we *just* saw 42 from /meow-tap, but CTA read shows <42, ignore & retry shortly.
        const sinceTap42 = Date.now() - lastTap42AtRef.current;
        if (res && typeof res.meow_taps === "number" && res.meow_taps < 42 && sinceTap42 >= 0 && sinceTap42 <= TAP42_BACKOFF_MS) {
          // eslint-disable-next-line no-console
          console.log("[CTA] backoff-guard: stale <42 after tap-42, rescheduled", {
            reqId,
            origin,
            meow_taps: res.meow_taps,
            sinceTap42,
            t: Math.round(performance.now()),
          });
          setTimeout(() => fetchCtaStatus("tap42-backoff-retry"), 300);
          return; // do not apply this stale read
        }

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

          // During backoff window, also avoid decreasing meow_taps below 42 if we already hit 42.
          const withinBackoff = Date.now() - lastTap42AtRef.current <= TAP42_BACKOFF_MS;
          if (withinBackoff) {
            next.meow_taps = Math.max(prev.meow_taps || 0, next.meow_taps || 0);
          }

          let applied;
          if (prev.eligible === true && next.eligible === false && next.usedToday !== true) {
            // Keep CTA visible; still refresh ancillary fields (respect backoff max above)
            applied = {
              ...prev,
              usedToday: prev.usedToday,
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

  // Direct trigger when the /api/meow-tap response itself returns 42/locked.
  // OverviewTab dispatches "meow:cta-check" at that exact moment.
  useEffect(() => {
    const timers = [];
    const onCtaCheck = (ev) => {
      lastTap42AtRef.current = Date.now();
      // eslint-disable-next-line no-console
      console.log("[CTA] tap-42-response event", {
        t: Math.round(performance.now()),
        detail: ev?.detail || null,
      });
      // Immediate + short backoffs to outwait any write→read lag on the DB
      fetchCtaStatus("tap-42-response");
      timers.push(setTimeout(() => fetchCtaStatus("tap42-backoff-300"), 300));
      timers.push(setTimeout(() => fetchCtaStatus("tap42-backoff-1200"), 1200));
    };
    window.addEventListener("meow:cta-check", onCtaCheck);
    return () => {
      window.removeEventListener("meow:cta-check", onCtaCheck);
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
                // Child still can call parent directly; parent also listens to window event.
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
