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
import GameOver from "./GameOver.jsx";
import * as audio from "./audio.js";

const EnhancedProfileModal = lazy(() => import('./EnhancedProfileModal.jsx'));
const DailyRewardModal = lazy(() => import('./DailyRewardModal.jsx'));

const getTG = () => (typeof window !== "undefined" ? window.Telegram?.WebApp : undefined);

export default function App() {
  // FIXED: Optimized viewport setup for better height calculation
  useEffect(() => {
    const setVH = () => {
      const tg = getTG();
      const height = tg?.viewportStableHeight || window.innerHeight;
      const vh = height / 100;
      document.documentElement.style.setProperty("--vh", `${vh}px`);
      document.documentElement.style.setProperty("--safe-height", `${height}px`);
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

  // Store state
  const {
    screen, navigateTo, settings,
    coins, setCoins,
    userStats, userProfile, streakData,
    userTelegramId, lastRun,
    showProfileModal, setShowProfileModal,
    showRewardModal, setShowRewardModal,
    fetchUserData, fetchUserPowerups
  } = useStore();

  // Initialize user data
  useEffect(() => {
    if (userTelegramId) {
      fetchUserData();
      fetchUserPowerups(userTelegramId);
    }
  }, [userTelegramId]);

  const handleGameExit = (gameResult) => {
    if (gameResult) {
      navigateTo("gameover");
    } else {
      navigateTo("home");
    }
  };

  const handleProfileSaved = (updatedProfile) => {
    setShowProfileModal(false);
    if (userTelegramId) {
      fetchUserData();
    }
  };

  const handleRewardClaimed = (reward) => {
    setCoins(prev => prev + reward.coins);
    setShowRewardModal(false);
    if (userTelegramId) {
      fetchUserData();
    }
  };

  if (showSplash) {
    return <Splash />;
  }

  return (
    <ErrorBoundary>
      {/* FIXED: Optimized shell with better height management */}
      <div className="shell" style={{ 
        height: 'var(--safe-height, 100vh)',
        overflow: 'hidden' // Prevent document scroll
      }}>
        {/* FIXED: Only show header for non-game screens */}
        <div style={{ visibility: screen === "game" ? "hidden" : "visible" }}>
          <Header coins={coins} />
        </div>
        
        {/* FIXED: Content with proper height calculation */}
        <main className={`content ${screen === "game" ? "game-content" : ""}`}>
          <ErrorBoundary>
            {screen === "home" && (
              userStats ? (
                <Home
                  coins={coins}
                  onNavigate={navigateTo}
                  userStats={userStats}
                  userProfile={userProfile}
                  onOpenProfileModal={() => setShowProfileModal(true)}
                  streakData={streakData}
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
            {screen === "shop" && <Shop coins={coins} userTelegramId={userTelegramId} onPurchase={(item, newBalance) => {
              setCoins(newBalance);
              fetchUserPowerups(userTelegramId);
            }} />}
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
              <GameOver 
                gameResult={lastRun}
                userStats={userStats}
                onNavigate={navigateTo}
              />
            )}
          </ErrorBoundary>
        </main>
        
        {/* FIXED: Only show navigation for non-game screens */}
        {screen !== "game" && <BottomNav screen={screen} onNavigate={navigateTo} />}
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
          {showRewardModal && streakData && (
            <DailyRewardModal
              show={showRewardModal}
              onClose={() => setShowRewardModal(false)}
              onClaim={handleRewardClaimed}
              streakData={streakData}
              userTelegramId={userTelegramId}
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
