// src/App.jsx
import React, { useEffect, useMemo, useState } from "react";
import Home from "./Home.jsx";
import GameView from "./GameView.jsx";
import Splash from "./Splash.jsx";
import Leaderboard from "./Leaderboard.jsx";
import EnhancedProfileModal from "./EnhancedProfileModal.jsx";

const getTG = () => (typeof window !== "undefined" ? window.Telegram?.WebApp : undefined);

/** Simple error boundary so a render/runtime error shows a screen instead of a black webview */
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
          <h2>Something went wrong 🤕</h2>
          <p style={{ color: "#555" }}>{String(this.state.error)}</p>
          <button className="btn" onClick={() => this.setState({ hasError: false, error: null })}>
            Try Again
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

export default function App() {
  /** Telegram init */
  useEffect(() => {
    const tg = getTG();
    try {
      tg?.ready?.();
      tg?.expand?.();
    } catch (_) {}
  }, []);

  /** Global error hook to avoid black screen in Telegram webview */
  useEffect(() => {
    const onErr = (e) => {
      console.error("Global error:", e?.message || e);
      // Telegram sometimes swallows errors; we still want them in console.
    };
    const onRej = (e) => console.error("Unhandled promise rejection:", e?.reason || e);
    window.addEventListener("error", onErr);
    window.addEventListener("unhandledrejection", onRej);
    return () => {
      window.removeEventListener("error", onErr);
      window.removeEventListener("unhandledrejection", onRej);
    };
  }, []);

  /** UI State */
  const [view, setView] = useState("home"); // 'home' | 'game' | 'leaderboard'
  const [showSplash, setShowSplash] = useState(true);

  // Telegram user id/username (fallbacks for local testing)
  const tg = getTG();
  const userTelegramId = tg?.initDataUnsafe?.user?.id || null;
  const telegramUsername = tg?.initDataUnsafe?.user?.username || null;

  /** Profile & Stats */
  const [userProfile, setUserProfile] = useState(null);
  const [userStats, setUserStats] = useState({ total_coins_earned: 0, best_score: 0, games_played: 0, best_combo: 0 });
  const [coins, setCoins] = useState(0);
  const [showProfileModal, setShowProfileModal] = useState(false);

  // Register user if we have Telegram ID
  useEffect(() => {
    let active = true;
    async function register() {
      if (!userTelegramId) return;
      try {
        await fetch("/api/user/register", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ telegram_id: userTelegramId, telegram_username: telegramUsername }),
        });
      } catch (e) {
        console.warn("register failed", e);
      }
    }
    register();
    return () => { active = false; };
  }, [userTelegramId, telegramUsername]);

  // Load stats
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

  /** Splash timeout (quick) */
  useEffect(() => {
    const id = setTimeout(() => setShowSplash(false), 900);
    return () => clearTimeout(id);
  }, []);

  /** Handlers */
  function handleNavigate(to) {
    setView(to);
  }
  function handleProfileSaved(updated) {
    setUserProfile((p) => ({ ...(p || {}), ...updated }));
  }
  async function handleExitGame(result) {
    // result: { score, coins, moves_used, max_combo, duration }
    await refreshStats(); // pick up server-credited coins
    setView("home");
  }

  /** Derived display name */
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
          <button className={`tab ${view === "home" ? "active" : ""}`} onClick={() => setView("home")}>Home</button>
          <button className={`tab ${view === "game" ? "active" : ""}`} onClick={() => setView("game")}>Play</button>
          <button className={`tab ${view === "leaderboard" ? "active" : ""}`} onClick={() => setView("leaderboard")}>Leaderboard</button>
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
