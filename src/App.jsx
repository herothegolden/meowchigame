// src/App.jsx
import React, { useEffect, useMemo, useState } from "react";
import Home from "./Home.jsx";
import GameView from "./GameView.jsx";
import Splash from "./Splash.jsx";
import Leaderboard from "./Leaderboard.jsx";
import EnhancedProfileModal from "./EnhancedProfileModal.jsx";
import * as audio from "./audio"; // safe if file exists; otherwise ignore usage

const getTG = () =>
  (typeof window !== "undefined" ? window.Telegram?.WebApp : undefined);

/** Small boundary so Telegram webview never shows a blank page */
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }
  componentDidCatch(error, info) {
    console.error("ErrorBoundary caught:", error, info);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: 16, fontFamily: "system-ui" }}>
          <h2>Something went wrong</h2>
          <pre style={{ whiteSpace: "pre-wrap" }}>
            {String(this.state.error || "")}
          </pre>
          <button
            onClick={() => this.setState({ hasError: false, error: null })}
            style={{
              padding: "10px 14px",
              borderRadius: 8,
              border: "1px solid #ddd",
              background: "#fff",
              cursor: "pointer",
              marginTop: 8,
            }}
          >
            Try again
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

export default function App() {
  // Stable viewport sizing in Telegram
  useEffect(() => {
    const setVH = () => {
      const tg = getTG();
      const height = tg?.viewportStableHeight || window.innerHeight;
      document.documentElement.style.setProperty("--vh", `${height * 0.01}px`);
    };
    setVH();
    window.addEventListener("resize", setVH);
    return () => window.removeEventListener("resize", setVH);
  }, []);

  // Telegram init
  useEffect(() => {
    const tg = getTG();
    try {
      tg?.ready?.();
      tg?.expand?.();
    } catch {}
  }, []);

  // Simple view state
  const [view, setView] = useState("home"); // 'home' | 'game' | 'leaderboard'
  const [showSplash, setShowSplash] = useState(true);
  const [showProfileModal, setShowProfileModal] = useState(false);

  // Telegram user
  const tg = getTG();
  const userTelegramId = tg?.initDataUnsafe?.user?.id || null;
  const telegramUsername = tg?.initDataUnsafe?.user?.username || null;

  // Stats & profile
  const [userProfile, setUserProfile] = useState(null);
  const [userStats, setUserStats] = useState({
    total_coins_earned: 0,
    best_score: 0,
    games_played: 0,
    best_combo: 0,
  });
  const [coins, setCoins] = useState(0);

  // Register user (idempotent on server)
  useEffect(() => {
    async function register() {
      if (!userTelegramId) return;
      try {
        await fetch("/api/user/register", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            telegram_id: userTelegramId,
            telegram_username: telegramUsername,
          }),
        });
      } catch (e) {
        console.warn("register failed", e);
      }
    }
    register();
  }, [userTelegramId, telegramUsername]);

  // Fetch stats
  async function refreshStats() {
    if (!userTelegramId) return;
    try {
      const r = await fetch(`/api/user/${userTelegramId}/stats`);
      const j = await r.json();
      if (j?.stats) {
        setUserStats(j.stats);
        setCoins(Number(j.stats.total_coins_earned || 0));
        setUserProfile({
          display_name: j.stats.display_name,
          country_flag: j.stats.country_flag,
          profile_completed: j.stats.profile_completed,
        });
      }
    } catch (e) {
      console.warn("stats fetch failed", e);
    }
  }
  useEffect(() => { refreshStats(); }, [userTelegramId]);

  // Splash quick hide
  useEffect(() => {
    const id = setTimeout(() => setShowSplash(false), 900);
    return () => clearTimeout(id);
  }, []);

  // Audio (optional): unlock+preload only on Play press
  const [audioReady, setAudioReady] = useState(false);
  async function ensureAudio() {
    if (audioReady || !audio?.unlock) return;
    try {
      await audio.unlock(); // must be after a user gesture
      await audio.preload({
        swap: "/sfx/swap.wav",
        swap_invalid: "/sfx/swap_invalid.wav",
        match_pop: "/sfx/match_pop.wav",
        cascade_tick: "/sfx/cascade_tick.wav",
        coin: "/sfx/coin.wav",
        combo_x1: "/sfx/combo_x1.wav",
        combo_x2: "/sfx/combo_x2.wav",
        combo_x3: "/sfx/combo_x3.wav",
        combo_x4: "/sfx/combo_x4.wav",
        powerup_spawn: "/sfx/powerup_spawn.wav",
        finish_win: "/sfx/finish_win.wav",
        finish_lose: "/sfx/finish_lose.wav",
        timer_tick: "/sfx/timer_tick.wav",
        timer_hurry: "/sfx/timer_hurry.wav",
      });
      setAudioReady(true);
    } catch (e) {
      console.warn("audio preload failed (non-fatal)", e);
    }
  }

  async function handleNavigate(to) {
    if (to === "game") {
      await ensureAudio(); // required by browser/Telegram policies
    }
    setView(to);
  }

  function handleProfileSaved(updated) {
    setUserProfile((p) => ({ ...(p || {}), ...updated }));
  }

  async function handleExitGame(_result) { // { score, coins, ... }
    // sync banked coins from server after a game
    await refreshStats();
    setView("home");
  }

  const displayName = useMemo(() => {
    return userProfile?.display_name || (telegramUsername ? `@${telegramUsername}` : "Player");
  }, [userProfile, telegramUsername]);

  return (
    <>
      <Splash show={showSplash} />

      <div className="container">
        {/* Header */}
        <div className="header">
          <div className="logo">MEOWCHI</div>
          <div className="wallet">
            <span className="muted">$Meow</span> <b>{coins}</b>
          </div>
        </div>

        {/* Views */}
        {view === "home" && (
          <Home
            coins={coins}
            userStats={userStats}
            userProfile={userProfile}
            onProfileUpdate={handleProfileSaved}
            onOpenProfileModal={() => setShowProfileModal(true)}
            onNavigate={handleNavigate}
          />
        )}

        {view === "leaderboard" && (
          <Leaderboard
            onBack={() => setView("home")}
            userTelegramId={userTelegramId}
          />
        )}

        {view === "game" && (
          <ErrorBoundary>
            <GameView
              userTelegramId={userTelegramId}
              onExit={handleExitGame}
            />
          </ErrorBoundary>
        )}

        {/* Bottom nav */}
        <div className="bottom-nav">
          <button
            className={`tab ${view === "home" ? "active" : ""}`}
            onClick={() => handleNavigate("home")}
          >
            Home
          </button>
          <button
            className={`tab ${view === "game" ? "active" : ""}`}
            onClick={() => handleNavigate("game")}
          >
            Play
          </button>
          <button
            className={`tab ${view === "leaderboard" ? "active" : ""}`}
            onClick={() => handleNavigate("leaderboard")}
          >
            Leaderboard
          </button>
        </div>
      </div>

      {/* Profile modal */}
      <EnhancedProfileModal
        show={showProfileModal}
        onClose={() => setShowProfileModal(false)}
        onSave={handleProfileSaved}
        userTelegramId={userTelegramId}
        currentProfile={userProfile}
      />
    </>
  );
}
