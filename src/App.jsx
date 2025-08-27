import React, { useEffect, useState, Suspense, lazy } from "react";
import { useStore } from "./store.js"; // <-- Uses Zustand store
import ErrorBoundary from "./ErrorBoundary.jsx";

import Home from "./Home.jsx";
import Squads from "./Squads.jsx";
import HomeSkeleton from "./HomeSkeleton.jsx";
import GameView from "./GameView.jsx";
import Splash from "./Splash.jsx";
import Leaderboard from "./Leaderboard.jsx";
import DailyTasks from "./DailyTasks.jsx";
import Shop from "./Shop.jsx";
import ShareButtons from "./ShareButtons.jsx";
import * as audio from "./audio.js";

const EnhancedProfileModal = lazy(() => import('./EnhancedProfileModal.jsx'));

const getTG = () => (typeof window !== "undefined" ? window.Telegram?.WebApp : undefined);

export default function App() {
  // Stable viewport setup (no changes needed here)
  useEffect(() => {
    const setVH = () => {
      const tg = getTG();
      const height = tg?.viewportStableHeight || window.innerHeight;
      const vh = height / 100;
      document.documentElement.style.setProperty("--vh", `${vh}px`);
    };
    setVH();
    window.addEventListener("resize", setVH);
    return () => window.removeEventListener("resize", setVH);
  }, []);

  // Telegram init (no changes needed here)
  useEffect(() => {
    const tg = getTG();
    try {
      tg?.ready();
      tg?.expand();
      tg?.disableVerticalSwipes?.();
    } catch { }
  }, []);

  // Splash screen logic (no changes needed here)
  const [showSplash, setShowSplash] = useState(true);
  useEffect(() => {
    const minDelay = new Promise((r) => setTimeout(r, 2400));
    const pageReady =
      document.readyState === "complete"
        ? Promise.resolve()
        : new Promise((r) => window.addEventListener("load", r, { once: true }));
    Promise.all([minDelay, pageReady]).then(() => setShowSplash(false));
  }, []);

  // --- App state from Zustand store ---
  const coins = useStore(s => s.coins);
  const setCoins = useStore(s => s.setCoins);
  const settings = useStore(s => s.settings);
  const setSettings = useStore(s => s.setSettings);
  const userProfile = useStore(s => s.userProfile);
  const setUserProfile = useStore(s => s.setUserProfile);
  const userStats = useStore(s => s.userStats);
  const setUserStats = useStore(s => s.setUserStats);

  // 🔥 1. Get streak and its setter from the store
  const streak = useStore(s => s.streak);
  const setStreak = useStore(s => s.setStreak);

  // --- Local component state ---
  const [screen, setScreen] = useState("home");
  const [lastRun, setLastRun] = useState(null);
  const [userTelegramId, setUserTelegramId] = useState(null);
  const [showProfileModal, setShowProfileModal] = useState(false);

  // --- Initialization ---
  useEffect(() => {
    initializeUser();
  }, []);

  const initializeUser = async () => {
    try {
      const tg = getTG();
      const telegramId = tg?.initDataUnsafe?.user?.id || null;
      if (!telegramId) {
        console.warn("Telegram ID not found. Running in dev mode.");
        return;
      }
      
      setUserTelegramId(telegramId);
      
      // 🔥 2. Call the check-in function on startup
      performDailyCheckIn(telegramId);

      const response = await fetch('/api/user/upsert', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ initData: tg.initData }),
      });

      if (response.ok) {
        const data = await response.json();
        setUserProfile(data.user);
        fetchUserStats(telegramId); // Fetch stats after ensuring user exists
      }
    } catch (error) {
      console.error('User initialization failed:', error);
    }
  };

  // 🔥 3. Define the check-in function
  const performDailyCheckIn = async (telegramId) => {
    if (!telegramId) return;
    try {
      const tg = getTG();
      const response = await fetch('/api/user/check-in', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ initData: tg?.initData })
      });
      const data = await response.json();
      if (data.success) {
        setStreak(data.streak);
        console.log(`🔥 Daily streak updated to: ${data.streak}`);
      }
    } catch (error) {
      console.error("Failed to check in for streak:", error);
    }
  };

  const fetchUserStats = async (telegramId) => {
    try {
      const tg = getTG();
      const response = await fetch(`/api/user/${telegramId}/stats`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ initData: tg?.initData })
      });
      if (response.ok) {
        const data = await response.json();
        setUserStats(data.user); // The user object from this endpoint contains stats
        setCoins(parseInt(data.user.bonus_coins || 0));
      }
    } catch (error) {
      console.error('Failed to fetch user stats:', error);
    }
  };

  const handleProfileSaved = (updatedUser) => {
    setUserProfile(updatedUser);
    setShowProfileModal(false);
    getTG()?.HapticFeedback?.notificationOccurred('success');
  };

  const [audioReady, setAudioReady] = useState(false);
  async function ensureAudio() {
    if (audioReady || !settings?.sound) return;
    try {
      await audio.unlock?.();
      await audio.preload?.({ /* ... sound files ... */ });
      setAudioReady(true);
    } catch (e) { console.warn("audio preload failed", e); }
  }

  const navigateTo = async (s) => {
    if (s === "game") await ensureAudio();
    getTG()?.HapticFeedback?.selectionChanged();
    setScreen(s);
  };
  
  const handleGameExit = (gameResult) => {
    setLastRun(gameResult);
    if (userTelegramId) {
      setTimeout(() => fetchUserStats(userTelegramId), 800);
    }
    setScreen("gameover");
  };

  // --- Render ---
  return (
    <ErrorBoundary>
      <Splash show={showSplash} />
      <div className="shell" style={{ visibility: showSplash ? "hidden" : "visible" }}>
        <Header coins={coins} />
        <main className="content">
          <ErrorBoundary>
            {screen === "home" && (
              userStats ? (
                <Home
                  onNavigate={navigateTo}
                  userStats={userStats}
                  userProfile={userProfile}
                  onOpenProfileModal={() => setShowProfileModal(true)}
                  // 🔥 4. Pass the streak down to the Home component
                  streak={streak}
                />
              ) : <HomeSkeleton />
            )}
          </ErrorBoundary>
          
          <ErrorBoundary>
            {screen === "leaderboard" && <Leaderboard userTelegramId={userTelegramId} />}
          </ErrorBoundary>
          
          <ErrorBoundary>
            {screen === "squad" && <Squads userTelegramId={userTelegramId} />}
          </ErrorBoundary>
          
          <ErrorBoundary>
            {screen === "daily" && <DailyTasks userTelegramId={userTelegramId} />}
          </ErrorBoundary>
          
          <ErrorBoundary>
            {screen === "shop" && <Shop coins={coins} userTelegramId={userTelegramId} onPurchase={(item, newBalance) => setCoins(newBalance)} />}
          </ErrorBoundary>
          
          <ErrorBoundary>
            {screen === "game" && (
              <GameView
                onExit={handleGameExit}
                settings={settings}
                userTelegramId={userTelegramId}
              />
            )}
          </ErrorBoundary>
          
          <ErrorBoundary>
            {screen === "gameover" && lastRun && (
               <section className="section">
                 <div className="title">🎯 Level Complete!</div>
                 <div className="row"><div className="muted">Score</div><b>{lastRun.score.toLocaleString()}</b></div>
                 <div className="row"><div className="muted">$Meow earned</div><b>{lastRun.coins}</b></div>
                 <ShareButtons 
                   variant="game-over"
                   score={lastRun.score}
                   combo={lastRun.max_combo}
                   coins={lastRun.coins}
                   userTelegramId={userTelegramId}
                 />
                 <button className="btn primary" style={{width: '100%', marginTop: '16px'}} onClick={() => navigateTo("game")}>
                   🎮 Play Again
                 </button>
               </section>
            )}
          </ErrorBoundary>
        </main>
        <BottomNav screen={screen} onNavigate={navigateTo} />
      </div>
      <ErrorBoundary>
        <Suspense fallback={<div />}>
          {showProfileModal && (
            <EnhancedProfileModal
              show={showProfileModal}
              onClose={() => setShowProfileModal(false)}
              onSave={handleProfileSaved}
              userTelegramId={userTelegramId}
              currentProfile={userProfile}
            />
          )}
        </Suspense>
      </ErrorBoundary>
    </ErrorBoundary>
  );
}

// --- Sub-components ---
function Header({ coins }) {
  const [animate, setAnimate] = useState(false);
  useEffect(() => {
    setAnimate(true);
    const timer = setTimeout(() => setAnimate(false), 500);
    return () => clearTimeout(timer);
  }, [coins]);

  return (
    <header className="header">
      <div className="header-content">
        <div className="brand">
          <div className="logo">
            <img src="https://ik.imagekit.io/59r2kpz8r/Meowchi/Meowchi.webp?updatedAt=1756284887490" alt="Meowchi" />
          </div>
          <div className="brand-text">Meowchi</div>
        </div>
        <div className={`coins-display ${animate ? 'pop' : ''}`}>
          <span className="coins-icon">💰</span>
          <span className="coins-amount">{coins.toLocaleString()}</span>
        </div>
      </div>
    </header>
  );
}

function BottomNav({ screen, onNavigate }) {
  const navItems = [
    { key: "home", label: "Home", icon: "🏠" },
    { key: "shop", label: "Shop", icon: "🛒" },
    { key: "squad", label: "Squad", icon: "🐾" },
    { key: "leaderboard", label: "Rankings", icon: "🏆" },
    { key: "daily", label: "Tasks", icon: "💎" },
  ];
  return (
    <nav className="bottom-nav">
      <div className="nav-container">
        {navItems.map((item) => (
          <button
            key={item.key}
            className={`nav-item ${screen === item.key ? "active" : ""}`}
            onClick={() => onNavigate(item.key)}
          >
            <span className="nav-icon">{item.icon}</span>
            <span className="nav-label">{item.label}</span>
          </button>
        ))}
      </div>
    </nav>
  );
}
