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
    console.error("🔥 ErrorBoundary caught:", error, info);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: 16, color: "#fff", background: "#111", height: "100vh" }}>
          <h2>Something went wrong.</h2>
          <p style={{ opacity: 0.8 }}>{String(this.state.error)}</p>
          <button className="btn" onClick={() => this.setState({ hasError: false, error: null })}>
            Try again
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

export default function App() {
  // Telegram webapp resize + ready
  useEffect(() => {
    const tg = getTG();
    try {
      tg?.ready();
      tg?.expand();
    } catch {}
  }, []);

  // Stable viewport height to avoid jumpiness in Telegram webview
  useEffect(() => {
    const setVH = () => {
      const tg = getTG();
      const height = tg?.viewportStableHeight || window.innerHeight;
      document.documentElement.style.setProperty("--vh", `${height}px`);
    };
    setVH();
    window.addEventListener("resize", setVH);
    const tg = getTG();
    if (tg && tg.onEvent) tg.onEvent("viewportChanged", setVH);
    return () => {
      window.removeEventListener("resize", setVH);
      if (tg && tg.offEvent) tg.offEvent("viewportChanged", setVH);
    };
  }, []);

  // Routing
  const [route, setRoute] = useState("home"); // "home" | "game" | "leaderboard"
  const navigate = (to) => setRoute(to);

  // User + wallet
  const [userTelegramId, setUserTelegramId] = useState(null);
  const [username, setUsername] = useState(null);
  const [userStats, setUserStats] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [walletCoins, setWalletCoins] = useState(0);

  // UI
  const [loading, setLoading] = useState(true);
  const [showProfileModal, setShowProfileModal] = useState(false);

  // Initialize user from Telegram → register → fetch stats/profile
  useEffect(() => {
    async function init() {
      try {
        const tg = getTG();
        const tgUser = tg?.initDataUnsafe?.user;
        const telegram_id = tgUser?.id || null;
        const telegram_username = tgUser?.username || null;
        if (!telegram_id) {
          console.warn("No Telegram user found in initDataUnsafe. Running in fallback mode.");
        }
        setUserTelegramId(telegram_id);
        setUsername(telegram_username);

        // register (idempotent)
        if (telegram_id) {
          await fetch("/api/user/register", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ telegram_id, telegram_username })
          }).catch(() => {});
        }

        // pull stats
        if (telegram_id) {
          const sres = await fetch(`/api/user/${telegram_id}/stats`).then(r => r.ok ? r.json() : null).catch(() => null);
          const stats = sres?.stats || null;
          setUserStats(stats);
          if (stats?.total_coins_earned != null) setWalletCoins(Number(stats.total_coins_earned) || 0);
        }

        // minimal profile cache
        setUserProfile({ display_name: telegram_username || "Player", country_flag: null });

      } catch (e) {
        console.error("User init failed:", e);
      } finally {
        setLoading(false);
      }
    }
    init();
  }, []);

  // Handle game end: update wallet, navigate home
  const handleExitGame = (result) => {
    try {
      if (result?.coins != null) {
        setWalletCoins((c) => (Number(c || 0) + Number(result.coins || 0)));
      }
      // refresh stats in background
      if (userTelegramId) {
        fetch(`/api/user/${userTelegramId}/stats`)
          .then(r => r.ok ? r.json() : null)
          .then(j => {
            if (j?.stats) setUserStats(j.stats);
          })
          .catch(()=>{});
      }
    } finally {
      setRoute("home");
    }
  };

  // Profile saved handler
  const handleProfileSaved = (updatedProfile) => {
    setUserProfile(updatedProfile || userProfile);
  };

  // Bottom navigation (local to App to avoid missing external component)
  function BottomNav() {
    return (
      <nav className="bottom-nav">
        <button className={`nav-btn ${route === "home" ? "active" : ""}`} onClick={() => navigate("home")}>🏠 Home</button>
        <button className={`nav-btn ${route === "game" ? "active" : ""}`} onClick={() => navigate("game")}>🎮 Play</button>
        <button className={`nav-btn ${route === "leaderboard" ? "active" : ""}`} onClick={() => navigate("leaderboard")}>🏆 Rank</button>
      </nav>
    );
  }

  // Header (wallet + profile quick open)
  function HeaderBar() {
    return (
      <header className="header">
        <div className="brand">MEOWCHI</div>
        <div className="spacer" />
        <div className="wallet" title="Total coins earned (banked)">
          <span>$Meow</span>
          <b>{Number(walletCoins || 0).toLocaleString()}</b>
        </div>
        <button className="profile-btn" onClick={() => setShowProfileModal(true)} aria-label="Edit profile">😺</button>
      </header>
    );
  }

  // While initializing
  if (loading) {
    return <Splash show={true} />;
  }

  return (
    <>
      <HeaderBar />

      <div className="app-shell">
        {route === "home" && (
          <Home
            coins={walletCoins}
            onNavigate={navigate}
            userStats={userStats}
            userProfile={userProfile}
            onProfileUpdate={setUserProfile}
            onOpenProfileModal={() => setShowProfileModal(true)}
          />
        )}

        {route === "game" && (
          <ErrorBoundary>
            <GameView
              onExit={handleExitGame}
              // onCoins removed by design (server-authoritative model)
              settings={{}}
              userTelegramId={userTelegramId}
            />
          </ErrorBoundary>
        )}

        {route === "leaderboard" && (
          <Leaderboard
            userTelegramId={userTelegramId}
          />
        )}

        <BottomNav />
      </div>

      {/* Enhanced Profile Modal */}
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
