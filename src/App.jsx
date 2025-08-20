import React, { useEffect, useState } from "react";
import Home from "./Home.jsx";
import GameView from "./GameView.jsx";
import Splash from "./Splash.jsx";
import Leaderboard from "./Leaderboard.jsx";
import ProfileModal from "./ProfileModal.jsx";

const getTG = () =>
  (typeof window !== "undefined" ? window.Telegram?.WebApp : undefined);

export default function App() {
  // Stable viewport for Telegram webview
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

  // Telegram init (safe no-op outside Telegram)
  useEffect(() => {
    const tg = getTG();
    try {
      tg?.ready();
      tg?.expand();
      tg?.disableVerticalSwipes?.();
    } catch {}
  }, []);

  // Splash: show for at least 2.4s AND until window 'load'
  const [showSplash, setShowSplash] = useState(true);
  useEffect(() => {
    const minDelay = new Promise((r) => setTimeout(r, 2400));
    const pageReady =
      document.readyState === "complete"
        ? Promise.resolve()
        : new Promise((r) => window.addEventListener("load", r, { once: true }));
    Promise.all([minDelay, pageReady]).then(() => setShowSplash(false));
  }, []);

  // ------------ App state / routing ------------
  const [screen, setScreen] = useState("home");
  const [screenHistory, setScreenHistory] = useState(["home"]);
  const [coins, setCoins] = useState(150);
  const [lastRun, setLastRun] = useState(null);
  const [settings, setSettings] = useState({
    haptics: true,
    sound: false,
    theme: "system",
  });
  const [daily, setDaily] = useState({ streak: 0, lastClaim: null });

  // User system state
  const [userTelegramId, setUserTelegramId] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [userStats, setUserStats] = useState(null);

  // Initialize user system
  useEffect(() => {
    initializeUser();
  }, []);

  // Auto-detect Telegram user
  const initializeUser = async () => {
    try {
      const tg = getTG();
      let telegramId = null;

      // Try to get Telegram ID from WebApp
      if (tg?.initDataUnsafe?.user?.id) {
        telegramId = tg.initDataUnsafe.user.id;
      } else {
        // Fallback for testing (use a demo ID)
        telegramId = Math.floor(Math.random() * 1000000) + 100000;
        console.log('Demo mode - using random Telegram ID:', telegramId);
      }

      setUserTelegramId(telegramId);

      // Register or get existing user
      const response = await fetch('/api/user/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          telegram_id: telegramId,
          telegram_username: tg?.initDataUnsafe?.user?.username || null
        })
      });

      if (response.ok) {
        const data = await response.json();
        setUserProfile(data.user);
        
        // Fetch user stats
        fetchUserStats(telegramId);
      }
    } catch (error) {
      console.error('User initialization failed:', error);
    }
  };

  // Fetch user statistics
  const fetchUserStats = async (telegramId) => {
    try {
      const response = await fetch(`/api/user/${telegramId}/stats`);
      if (response.ok) {
        const data = await response.json();
        setUserStats(data.stats);
        
        // Update coins from backend if different
        if (data.stats.total_coins_earned) {
          setCoins(prev => Math.max(prev, data.stats.total_coins_earned));
        }
      }
    } catch (error) {
      console.error('Failed to fetch user stats:', error);
    }
  };

  // Handle profile completion
  const handleProfileSaved = (updatedUser) => {
    setUserProfile(updatedUser);
    setShowProfileModal(false);
    
    // Refresh user stats
    if (userTelegramId) {
      fetchUserStats(userTelegramId);
    }
  };

  // Show profile modal when needed
  const promptProfileCompletion = () => {
    if (userProfile && !userProfile.profile_completed) {
      setShowProfileModal(true);
    }
  };

  const navigateTo = (s) => {
    setScreenHistory((p) => [...p, s]);
    setScreen(s);
  };
  const goBack = () => {
    if (screenHistory.length > 1) {
      const h = [...screenHistory];
      h.pop();
      setScreenHistory(h);
      setScreen(h[h.length - 1]);
    } else {
      setScreen("home");
      setScreenHistory(["home"]);
    }
  };
  const goHome = () => {
    setScreen("home");
    setScreenHistory(["home"]);
  };

  // ------------ Minimal header with just branding and coins ------------
  function Header() {
    const backable = screenHistory.length > 1 && screen !== "home";
    return (
      <header className="header">
        <div className="header-content">
          <div className="brand">
            <div className="logo">
              <img
                src="https://i.postimg.cc/wjQ5W8Zw/Meowchi-The-Cat-NBG.png"
                alt="Meowchi"
                onError={(e) => {
                  e.currentTarget.style.display = "none";
                  e.currentTarget.parentElement.textContent = "😺";
                }}
              />
            </div>
            <div className="brand-text">Meowchi</div>
          </div>
          
          {backable && (
            <button className="back-btn" onClick={goBack}>
              <span className="back-icon">←</span>
            </button>
          )}
          
          <div className="coins-display">
            <span className="coins-icon">💰</span>
            <span className="coins-amount">{coins}</span>
          </div>
        </div>
      </header>
    );
  }

  // ------------ Bottom Navigation Panel ------------
  function BottomNav() {
    const navItems = [
      { key: "home", label: "Profile", icon: "👤", screen: "home" },
      { key: "shop", label: "Shop", icon: "🛒", screen: "shop" },
      { key: "leaderboard", label: "Rankings", icon: "🏆", screen: "leaderboard" },
      { key: "wallet", label: "Wallet", icon: "💎", screen: "daily" },
      { key: "settings", label: "Settings", icon: "⚙️", screen: "settings" },
    ];

    return (
      <nav className="bottom-nav">
        <div className="nav-container">
          {navItems.map((item) => (
            <button
              key={item.key}
              className={`nav-item ${screen === item.screen ? "active" : ""}`}
              onClick={() => navigateTo(item.screen)}
            >
              <span className="nav-icon">{item.icon}</span>
              <span className="nav-label">{item.label}</span>
            </button>
          ))}
        </div>
      </nav>
    );
  }

  // Optional inline pages (updated with backend integration)
  function Shop() {
    const items = [
      { key: "shuffle", name: "Sugar Shuffle", desc: "Mix up the candy board", price: 40, icon: "🔄" },
      { key: "hammer", name: "Candy Crusher", desc: "Smash any candy", price: 60, icon: "🔨" },
      { key: "bomb", name: "Candy Bomb", desc: "Explode 3×3 area", price: 80, icon: "💥" },
    ];
    return (
      <section className="section">
        <div className="title" style={{ marginBottom: 10 }}>🛒 Meowchi Shop</div>
        <div className="list grid-gap">
          {items.map((it) => (
            <div key={it.key} className="row">
              <div>
                <div style={{ fontWeight: 600 }}>{it.icon} {it.name}</div>
                <div className="muted small">{it.desc}</div>
              </div>
              <div className="row" style={{ gap: 8 }}>
                <div className="muted small">{it.price} $Meow</div>
                <button
                  className="btn"
                  onClick={() => setCoins((c) => Math.max(0, c - it.price))}
                  disabled={coins < it.price}
                >
                  Buy
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>
    );
  }

  function Settings() {
    return (
      <section className="section">
        <div className="title">⚙️ Settings</div>
        <label className="row">
          <div>Haptics</div>
          <input
            type="checkbox"
            checked={settings.haptics}
            onChange={(e) => setSettings((s) => ({ ...s, haptics: e.target.checked }))}
          />
        </label>
        <label className="row">
          <div>Sound</div>
          <input
            type="checkbox"
            checked={settings.sound}
            onChange={(e) => setSettings((s) => ({ ...s, sound: e.target.checked }))}
          />
        </label>
        
        {/* Profile management */}
        <div className="row">
          <div>
            <div style={{ fontWeight: 600 }}>Profile</div>
            <div className="muted small">
              {userProfile?.profile_completed ? 'Profile completed' : 'Complete your profile to join rankings'}
            </div>
          </div>
          <button 
            className="btn" 
            onClick={() => setShowProfileModal(true)}
          >
            {userProfile?.profile_completed ? 'Edit' : 'Complete'}
          </button>
        </div>
      </section>
    );
  }

  function Daily() {
    const today = new Date().toISOString().slice(0, 10);
    const canClaim = daily.lastClaim !== today;
    function claim() {
      const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
      setDaily((d) => ({ streak: d.lastClaim === yesterday ? d.streak + 1 : 1, lastClaim: today }));
      setCoins((c) => c + 50);
    }
    return (
      <section className="section">
        <div className="title">💎 Daily Rewards</div>
        <div className="muted">Streak: <b>{daily.streak}</b> {daily.lastClaim ? `• last: ${daily.lastClaim}` : ""}</div>
        <button className="btn primary" onClick={claim} disabled={!canClaim}>
          {canClaim ? "Claim 50 $Meow" : "Come back tomorrow"}
        </button>
        <div className="muted small">Keep your streak alive! Resets if you miss a day.</div>
      </section>
    );
  }

  function Invite() {
    const link = "https://t.me/meowchi_game_bot?start=sweet";
    const [copied, setCopied] = useState(false);
    async function copy() {
      try { await navigator.clipboard.writeText(link); setCopied(true); setTimeout(() => setCopied(false), 1000); } catch {}
    }
    return (
      <section className="section">
        <div className="title">👥 Invite Friends</div>
        <div className="muted small">Share Meowchi and earn rewards together.</div>
        <div className="row" style={{ gap: 8 }}>
          <div className="pill ellipsis" style={{ maxWidth: 260 }}>{link}</div>
          <button className="btn" onClick={copy}>{copied ? "Copied!" : "Copy"}</button>
        </div>
      </section>
    );
  }

  // Handle game completion with backend integration
  const handleGameExit = async (gameResult) => {
    setLastRun(gameResult);
    setCoins((c) => c + (gameResult?.coins || 0));
    
    // Show profile completion modal if needed after game
    if (gameResult.user_needs_profile) {
      setTimeout(() => {
        setShowProfileModal(true);
      }, 1000); // Show after a brief delay
    }
    
    setScreen("gameover");
    setScreenHistory((h) => [...h, "gameover"]);
  };

  // ------------ Render ------------
  return (
    <>
      <Splash show={showSplash} />

      <div className="shell" style={{ visibility: showSplash ? "hidden" : "visible" }}>
        <Header />
        <main className="content">
          {screen === "home" && (
            <Home 
              coins={coins} 
              onNavigate={navigateTo} 
              userStats={userStats}
              userProfile={userProfile}
            />
          )}

          {screen === "shop" && <Shop />}
          {screen === "leaderboard" && (
            <Leaderboard 
              userTelegramId={userTelegramId}
              userNeedsProfile={userProfile && !userProfile.profile_completed}
            />
          )}
          {screen === "daily" && <Daily />}
          {screen === "invite" && <Invite />}
          {screen === "settings" && <Settings />}

          {screen === "game" && (
            <GameView
              onExit={handleGameExit}
              onCoins={(d) => setCoins((c) => c + d)}
              settings={settings}
              userTelegramId={userTelegramId}
            />
          )}

          {screen === "gameover" && lastRun && (
            <section className="section">
              <div className="title">🎯 Level Complete!</div>
              <div className="row"><div className="muted">Score</div><b>{lastRun.score}</b></div>
              <div className="row"><div className="muted">$Meow earned</div><b>{lastRun.coins}</b></div>
              {lastRun.max_combo > 0 && (
                <div className="row"><div className="muted">Best combo</div><b>x{lastRun.max_combo + 1}</b></div>
              )}
              
              <div className="row" style={{ gap: 8, marginTop: 16 }}>
                <button 
                  className="btn primary" 
                  onClick={() => setScreen("game")}
                >
                  🎮 Play Again
                </button>
                <button 
                  className="btn" 
                  onClick={() => navigateTo("leaderboard")}
                >
                  🏆 View Rankings
                </button>
              </div>
              
              {lastRun.user_needs_profile && (
                <div className="profile-prompt">
                  <p className="muted small">Great score! Complete your profile to join the leaderboard!</p>
                  <button 
                    className="btn" 
                    onClick={() => setShowProfileModal(true)}
                    style={{ marginTop: 8 }}
                  >
                    Complete Profile
                  </button>
                </div>
              )}
            </section>
          )}
        </main>
        
        <BottomNav />
      </div>

      {/* Profile Modal */}
      <ProfileModal
        show={showProfileModal}
        onClose={() => setShowProfileModal(false)}
        onSave={handleProfileSaved}
        userTelegramId={userTelegramId}
        currentProfile={userProfile}
      />
    </>
  );
}
