import React, { useEffect, useState, Suspense, lazy, createContext, useContext } from "react";
import { useStore } from "./store.js";
import ErrorBoundary from "./ErrorBoundary.jsx";
import Home from "./Home.jsx";
import Squads from "./Squads.jsx";
import HomeSkeleton from "./HomeSkeleton.jsx";
import GameView from "./GameView.jsx";
import Splash from "./Splash.jsx";
import Leaderboard from "./Leaderboard.jsx";
import DailyTasks from "./DailyTasks.jsx";
import Shop from "./Shop.jsx";
import GameOver from "./GameOver.jsx";
import * as audio from "./audio.js";
import AlertModal from "./AlertModal.jsx";

const EnhancedProfileModal = lazy(() => import('./EnhancedProfileModal.jsx'));
const DailyRewardModal = lazy(() => import('./DailyRewardModal.jsx'));

const getTG = () => (typeof window !== "undefined" ? window.Telegram?.WebApp : undefined);

const AlertContext = createContext();
export const useAlert = () => useContext(AlertContext);

export default function App() {
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

  useEffect(() => {
    const tg = getTG();
    try {
      tg?.ready();
      tg?.expand();
      tg?.disableVerticalSwipes?.();
    } catch {}
  }, []);

  const [showSplash, setShowSplash] = useState(true);
  useEffect(() => {
    const minDelay = new Promise((r) => setTimeout(r, 2400));
    const pageReady = document.readyState === "complete" ? Promise.resolve() : new Promise((r) => window.addEventListener("load", r, { once: true }));
    Promise.all([minDelay, pageReady]).then(() => setShowSplash(false));
  }, []);

  const coins = useStore(s => s.coins);
  const setCoins = useStore(s => s.setCoins);
  const settings = useStore(s => s.settings);
  const userProfile = useStore(s => s.userProfile);
  const setUserProfile = useStore(s => s.setUserProfile);
  const userStats = useStore(s => s.userStats);
  const setUserStats = useStore(s => s.setUserStats);
  const setPowerups = useStore(s => s.setPowerups);

  const [screen, setScreen] = useState("home");
  const [lastRun, setLastRun] = useState(null);
  const [userTelegramId, setUserTelegramId] = useState(null);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [streakData, setStreakData] = useState(null);
  const [showRewardModal, setShowRewardModal] = useState(false);
  const [alertConfig, setAlertConfig] = useState({ show: false, title: '', message: '', buttons: [] });

  const showAlert = (title, message, buttons = [{ text: 'OK' }]) => {
    setAlertConfig({ show: true, title, message, buttons });
  };

  useEffect(() => {
    const initializeUser = async () => {
      try {
        const tg = getTG();
        let telegramId = tg?.initDataUnsafe?.user?.id || 12345678; // Fallback for dev
        setUserTelegramId(telegramId);

        performDailyCheckIn(telegramId);

        const response = await fetch('/api/user/upsert', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ initData: tg?.initData || 'dev_mode', telegram_id: telegramId }),
        });

        if (response.ok) {
          const data = await response.json();
          setUserProfile(data.user);
          fetchUserStats(telegramId);
          fetchUserPowerups(telegramId);
        }
      } catch (error) {
        console.error('User initialization failed:', error);
      }
    };
    initializeUser();
  }, []);

  const performDailyCheckIn = async (telegramId) => {
    if (!telegramId) return;
    try {
      const response = await fetch('/api/user/check-in', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ initData: getTG()?.initData || 'dev_mode', telegram_id: telegramId })
      });
      const data = await response.json();
      if (data.success) {
        setStreakData(data);
        if (!data.claimed_today) {
          setShowRewardModal(true);
        }
      }
    } catch (error) {
      console.error("Failed to check in for streak:", error);
    }
  };

  const fetchUserStats = async (telegramId) => {
    try {
      const response = await fetch(`/api/user/${telegramId}/stats`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ initData: getTG()?.initData || 'dev_mode', telegram_id: telegramId })
      });
      if (response.ok) {
        const data = await response.json();
        setUserStats(data.user);
        setCoins(parseInt(data.user.bonus_coins || 0));
      }
    } catch (error) {
      console.error('Failed to fetch user stats:', error);
    }
  };

  const fetchUserPowerups = async (telegramId) => {
    try {
      const response = await fetch(`/api/user/${telegramId}/powerups`);
      if (response.ok) {
        const data = await response.json();
        setPowerups(data.powerups || {});
      }
    } catch (error) {
      console.error('Failed to fetch user powerups:', error);
    }
  };

  const handleRewardClaimed = () => {
    getTG()?.HapticFeedback?.notificationOccurred('success');
    setShowRewardModal(false);
    fetchUserStats(userTelegramId);
    fetchUserPowerups(userTelegramId);
    setStreakData(prev => ({...prev, claimed_today: true}));
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
      await audio.preload?.({
        cascade_tick: '/sfx/cascade_tick.wav', coin: '/sfx/coin.wav',
        combo_x1: '/sfx/combo_x1.wav', combo_x2: '/sfx/combo_x2.wav',
        combo_x3: '/sfx/combo_x3.wav', combo_x4: '/sfx/combo_x4.wav',
        finish_lose: '/sfx/finish_lose.wav', finish_win: '/sfx/finish_win.wav',
        match_pop: '/sfx/match_pop.wav', powerup_spawn: '/sfx/powerup_spawn.wav',
        swap: '/sfx/swap.wav', swap_invalid: '/sfx/swap_invalid.wav',
        timer_hurry: '/sfx/timer_hurry.wav', timer_tick: '/sfx/timer_tick.wav'
      });
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
      setTimeout(() => {
        fetchUserStats(userTelegramId);
        fetchUserPowerups(userTelegramId);
      }, 800);
    }
    setScreen("gameover");
  };

  return (
    <ErrorBoundary>
      <AlertContext.Provider value={showAlert}>
        <Splash show={showSplash} />
        <div className="shell" style={{ visibility: showSplash ? "hidden" : "visible" }}>
          <Header coins={coins} />
          <main className="content">
            {screen === "home" && (userStats ? <Home coins={coins} onNavigate={navigateTo} userStats={userStats} userProfile={userProfile} onOpenProfileModal={() => setShowProfileModal(true)} streakData={streakData} /> : <HomeSkeleton />)}
            {screen === "leaderboard" && <Leaderboard userTelegramId={userTelegramId} />}
            {screen === "squad" && <Squads userTelegramId={userTelegramId} />}
            {screen === "daily" && <DailyTasks userTelegramId={userTelegramId} />}
            {screen === "shop" && <Shop coins={coins} userTelegramId={userTelegramId} onPurchase={(item, newBalance) => { setCoins(newBalance); fetchUserPowerups(userTelegramId); }} />}
            {screen === "game" && <GameView onExit={handleGameExit} settings={settings} userTelegramId={userTelegramId} />}
            {screen === "gameover" && lastRun && <GameOver gameResult={lastRun} userStats={userStats} onNavigate={navigateTo} />}
          </main>
          <BottomNav screen={screen} onNavigate={navigateTo} />
        </div>
        <Suspense fallback={<div />}>
          {showProfileModal && <EnhancedProfileModal show={showProfileModal} onClose={() => setShowProfileModal(false)} onSave={handleProfileSaved} userTelegramId={userTelegramId} currentProfile={userProfile} />}
          {showRewardModal && streakData && <DailyRewardModal show={showRewardModal} onClose={() => setShowRewardModal(false)} onClaim={handleRewardClaimed} streakData={streakData} userTelegramId={userTelegramId} />}
        </Suspense>
        <AlertModal {...alertConfig} onClose={() => setAlertConfig({ ...alertConfig, show: false })} />
      </AlertContext.Provider>
    </ErrorBoundary>
  );
}

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
            <img src="https://ik.imagekit.io/59r2kpz8r/Meowchi/Meowchi.webp?tr=w-64,h-64,f-auto" alt="Meowchi" />
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
