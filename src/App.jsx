import React, { useEffect, useState, useMemo } from "react";
import Home from "./Home.jsx";
import HomeSkeleton from "./HomeSkeleton.jsx"; // Import the skeleton
import GameView from "./GameView.jsx";
import Splash from "./Splash.jsx";
import Leaderboard from "./Leaderboard.jsx";
import EnhancedProfileModal from "./EnhancedProfileModal.jsx";
import DailyTasks from "./DailyTasks.jsx";
import ShareButtons from "./ShareButtons.jsx";
import * as audio from "./audio"; // audio helper (must exist in src/)

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

// Telegram theme integration
useEffect(() => {
  /*
  const tg = getTG();
  if (!tg) return;

  const applyTheme = () => {
    try {
      const themeParams = tg.themeParams || {};
      const root = document.documentElement.style;
      
      // Apply Telegram theme colors
      if (themeParams.bg_color) {
        root.setProperty('--bg', themeParams.bg_color);
      }
      if (themeParams.text_color) {
        root.setProperty('--text', themeParams.text_color);
      }
      if (themeParams.hint_color) {
        root.setProperty('--muted', themeParams.hint_color);
      }
      if (themeParams.button_color) {
        root.setProperty('--accent', themeParams.button_color);
      }
      if (themeParams.button_text_color) {
        root.setProperty('--accent-text', themeParams.button_text_color);
      }
      if (themeParams.secondary_bg_color) {
        root.setProperty('--surface', themeParams.secondary_bg_color);
        root.setProperty('--card', themeParams.secondary_bg_color);
      }
      
      // Set header colors to match theme
      if (tg.setHeaderColor && themeParams.bg_color) {
        tg.setHeaderColor(themeParams.bg_color);
      }
      if (tg.setBottomBarColor && themeParams.bg_color) {
        tg.setBottomBarColor(themeParams.bg_color);
      }
      
      console.log('✅ Theme applied:', themeParams);
    } catch (error) {
      console.warn('⚠️ Theme application failed:', error);
    }
  };

  // Apply theme immediately
  applyTheme();
  
  // Listen for theme changes
  tg.onEvent?.('themeChanged', applyTheme);
  
  return () => {
    tg.offEvent?.('themeChanged', applyTheme);
  };
  */
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
  const [contentKey, setContentKey] = useState(0); // For screen transitions
  const [animateCoins, setAnimateCoins] = useState(false); // For coin counter animation
  const [screenHistory, setScreenHistory] = useState(["home"]);
  const [coins, setCoins] = useState(150);
  const [lastRun, setLastRun] = useState(null);
  const [settings, setSettings] = useState({
    haptics: true,
    sound: true, // enable by default now that audio exists
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

  // Helper to create authenticated request body
  const createAuthenticatedRequest = (data = {}) => {
    const tg = getTG();
    const request = {
      telegram_id: userTelegramId, // Legacy support
      ...data
    };
    
    // Add secure initData if available
    if (tg?.initData) {
      request.initData = tg.initData;
    }
    
    return request;
  };

  // The initializeUser function
const initializeUser = async () => {
  try {
    const tg = getTG();
    let telegramId = null;
    let initData = null;

    // Try to get Telegram data from WebApp
    if (tg?.initDataUnsafe?.user?.id) {
      telegramId = tg.initDataUnsafe.user.id;
      initData = tg.initData; // Signed data
    } else {
      // Fallback for testing/demo
      telegramId = Math.floor(Math.random() * 1000000) + 100000;
      console.log('Demo mode - using random Telegram ID:', telegramId);
    }

    setUserTelegramId(telegramId);

    // Legacy + secure auth payload
    const requestBody = {
      telegram_id: telegramId,
      telegram_username: tg?.initDataUnsafe?.user?.username || null,
    };
    if (initData) {
      requestBody.initData = initData;
    }

    const response = await fetch('/api/user/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody),
    });

    if (response.ok) {
      const data = await response.json();
      setUserProfile(data.user);

      // ✅ NEW LOGIC: use server-provided flag
      if (data.shouldPromptProfile) {
        setTimeout(() => {
          setShowProfileModal(true);
        }, 1500);
      }

      // Keep your existing behavior below unchanged
      if (!data.user.country_flag) {
        detectAndSetCountry(telegramId);
      }
      fetchUserStats(telegramId);
    }
  } catch (error) {
    console.error('User initialization failed:', error);
  }
};

  // Detect and set country automatically
  const detectAndSetCountry = async (telegramId) => {
    try {
      const response = await fetch('https://ipapi.co/json/');
      const data = await response.json();
      
      if (data.country_code) {
        const countryMap = {
          'US': '🇺🇸', 'GB': '🇬🇧', 'CA': '🇨🇦', 'AU': '🇦🇺',
          'DE': '🇩🇪', 'FR': '🇫🇷', 'IT': '🇮🇹', 'ES': '🇪🇸',
          'JP': '🇯🇵', 'KR': '🇰🇷', 'CN': '🇨🇳', 'IN': '🇮🇳',
          'BR': '🇧🇷', 'MX': '🇲🇽', 'RU': '🇷🇺', 'UZ': '🇺🇿',
          'TR': '🇹🇷', 'SA': '🇸🇦', 'AE': '🇦🇪', 'NL': '🇳🇱',
          'SE': '🇸🇪', 'NO': '🇳🇴', 'DK': '🇩🇰', 'PL': '🇵🇱',
          'CZ': '🇨🇿', 'HU': '🇭🇺', 'AT': '🇦🇹', 'CH': '🇨🇭',
          'BE': '🇧🇪', 'PT': '🇵🇹', 'GR': '🇬🇷', 'IL': '🇮🇱',
          'EG': '🇪🇬', 'ZA': '🇿🇦', 'NG': '🇳🇬', 'KE': '🇰🇪',
          'MA': '🇲🇦', 'AR': '🇦🇷', 'CL': '🇨🇱', 'CO': '🇨🇴',
          'PE': '🇵🇪', 'VE': '🇻🇪', 'TH': '🇹🇭', 'VN': '🇻🇳',
          'ID': '🇮🇩', 'MY': '🇲🇾', 'SG': '🇸🇬', 'PH': '🇵🇭',
          'BD': '🇧🇩', 'PK': '🇵🇰', 'LK': '🇱🇰', 'NP': '🇳🇵'
        };
        
        const countryFlag = countryMap[data.country_code.toUpperCase()];
        if (countryFlag) {
          // Update user's country flag
          const updateResponse = await fetch('/api/user/profile', {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              telegram_id: telegramId,
              country_flag: countryFlag
            })
          });
          
          if (updateResponse.ok) {
            const result = await updateResponse.json();
            setUserProfile(result.user);
          }
        }
      }
    } catch (error) {
      console.log('Country detection failed:', error);
    }
  };

  // Fetch user statistics (FIXED: Better sync and error handling)
  const fetchUserStats = async (telegramId) => {
    try {
      console.log('📊 Fetching updated user stats...');
      
      const tg = getTG();
      const requestBody = {
        telegram_id: telegramId
      };
      
      if (tg?.initData) {
        requestBody.initData = tg.initData;
      }
      
      const response = await fetch(`/api/user/${telegramId}/stats`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody)
      });

      if (response.ok) {
        const data = await response.json();
        console.log('✅ User stats updated:', data.stats);
        
        setUserStats(data.stats);
        
        // FIXED: Sync local coins with backend total
        if (data.stats.total_coins_earned) {
          setCoins(data.stats.total_coins_earned);
        }
      } else {
        console.error('❌ Failed to fetch user stats:', response.status);
      }
    } catch (error) {
      console.error('❌ Failed to fetch user stats:', error);
    }
  };

  // Handle profile updates (FIXED: Ensure stats refresh)
  const handleProfileUpdate = (updatedUser) => {
    setUserProfile(updatedUser);
    
    // FIXED: Always refresh user stats after profile updates
    if (userTelegramId) {
      console.log('👤 Profile updated, refreshing stats...');
      fetchUserStats(userTelegramId);
    }
  };

  // Handle profile completion (FIXED: Ensure stats refresh)
  const handleProfileSaved = (updatedUser) => {
    setUserProfile(updatedUser);
    setShowProfileModal(false);
    
    // NEW: Add success haptic feedback
    getTG()?.HapticFeedback?.notificationOccurred('success');
    
    // FIXED: Always refresh user stats after profile completion
    if (userTelegramId) {
      console.log('👤 Profile saved, refreshing stats...');
      fetchUserStats(userTelegramId);
    }
  };

  // ------------ Audio (minimal + safe) ------------
  const [audioReady, setAudioReady] = useState(false);
  async function ensureAudio() {
    if (audioReady || !settings?.sound) return;
    try {
      await audio.unlock?.(); // must be in a user gesture
      await audio.preload?.({
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

  // NEW: Add a useEffect for the coin animation
  useEffect(() => {
    if (coins > 0) {
      setAnimateCoins(true);
      const timer = setTimeout(() => setAnimateCoins(false), 500); // Animation duration
      return () => clearTimeout(timer);
    }
  }, [coins]);

  // Navigation helpers
  const navigateTo = async (s) => {
    if (s === "game") {
      await ensureAudio(); // unlock + preload before entering game
    }
    // NEW: Add selection haptic feedback
    getTG()?.HapticFeedback?.selectionChanged();
    
    setScreenHistory((p) => [...p, s]);
    setScreen(s);
    setContentKey(prev => prev + 1); // Trigger transition animation
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

  // NEW: Add a useEffect to manage the Telegram Main Button
  useEffect(() => {
    const tg = getTG();
    if (!tg?.MainButton) return;

    const button = tg.MainButton;

    // Hide the button if the splash screen is showing or on specific screens
    if (showSplash || screen === 'home' || screen === 'daily') {
      button.hide();
      return;
    }
    
    // Example of how you might use it on other screens in the future
    // if (screen === 'shop') {
    //   button.setText('🛒 Go to Checkout');
    //   button.show();
    // } 
    else {
      button.hide(); // Hide by default on all other screens
    }

  }, [screen, showSplash]); // Add showSplash as a dependency

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
          
          <div className={`coins-display ${animateCoins ? 'pop' : ''}`}>
            <span className="coins-icon">💰</span>
            <span className="coins-amount">{Math.min(coins, 999999999)}</span>
          </div>
        </div>
      </header>
    );
  }

  // ------------ Bottom Navigation Panel ------------
  function BottomNav() {
    const navItems = [
      { key: "home", label: "Home", icon: "🏠", screen: "home" },
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

  // Optional inline pages (kept intact)
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
    // Manual stats refresh for debugging
    const handleRefreshStats = () => {
      if (userTelegramId) {
        console.log('🔄 Manually refreshing user stats...');
        fetchUserStats(userTelegramId);
      }
    };

    // Debug combo display logic
    const debugComboDisplay = () => {
      if (userStats?.best_combo !== undefined) {
        const rawCombo = userStats.best_combo;
        const displayCombo = rawCombo === 0 ? 0 : rawCombo + 1;
        console.log(`🔍 Combo Debug: Database=${rawCombo}, Homepage Shows=${displayCombo}`);
        alert(`Combo Debug:\nDatabase: ${rawCombo}\nHomepage Shows: ${displayCombo}\n\nIf you got combos but see 0, the game isn't tracking combos properly.`);
      } else {
        alert('No user stats available. Play a game first!');
      }
    };

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
            <div style={{ fontWeight: 600 }}>Profile Settings</div>
            <div className="muted small">
              Manage your display name and country
            </div>
          </div>
          <button 
            className="btn" 
            onClick={() => setShowProfileModal(true)}
          >
            Edit Profile
          </button>
        </div>

        {/* Manual stats refresh */}
        <div className="row">
          <div>
            <div style={{ fontWeight: 600 }}>Refresh Stats</div>
            <div className="muted small">
              Update homepage numbers manually
            </div>
          </div>
          <button 
            className="btn" 
            onClick={handleRefreshStats}
          >
            🔄 Refresh
          </button>
        </div>

        {/* Debug combo tracking */}
        <div className="row">
          <div>
            <div style={{ fontWeight: 600 }}>Debug Combo</div>
            <div className="muted small">
              Check combo tracking values
            </div>
          </div>
          <button 
            className="btn" 
            onClick={debugComboDisplay}
          >
            🔍 Check Combo
          </button>
        </div>
      </section>
    );
  }

  function Daily() {
    return (
      <DailyTasks 
        userTelegramId={userTelegramId}
        onTaskComplete={(message, coins) => {
          setCoins(c => c + coins);
          // Could add popup notification here later
          console.log(`✅ Task completed: ${message}`);
        }}
      />
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

  // Handle game completion (kept intact)
  const handleGameExit = async (gameResult) => {
    console.log('🎮 Game completed with result:', gameResult);
    
    setLastRun(gameResult);
    setCoins((c) => c + (gameResult?.coins || 0));
    
    // Refresh user stats after game completion 
    if (userTelegramId) {
      console.log('📊 Refreshing user stats after game...');
      console.log(`🔥 Game submitted combo: ${gameResult?.max_combo} (display will show: ${gameResult?.max_combo > 0 ? gameResult.max_combo + 1 : 0})`);
      setTimeout(() => {
        fetchUserStats(userTelegramId);
      }, 800);
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
        <main className="content" key={contentKey}>
          {screen === "home" && (
            userStats ? (
              <Home 
                coins={coins} 
                onNavigate={navigateTo} 
                userStats={userStats}
                userProfile={userProfile}
                onProfileUpdate={handleProfileUpdate}
                onOpenProfileModal={() => setShowProfileModal(true)}
              />
            ) : (
              <HomeSkeleton />
            )
          )}

          {screen === "shop" && <Shop />}
          {screen === "leaderboard" && (
            <Leaderboard 
              userTelegramId={userTelegramId}
              userNeedsProfile={false}
            />
          )}
          {screen === "daily" && <Daily />}
          {screen === "invite" && <Invite />}
          {screen === "settings" && <Settings />}

          {screen === "game" && (
            <div className="game-view-container">
              <GameView
                onExit={handleGameExit}
                onCoins={(d) => setCoins((c) => c + d)}
                settings={settings}
                userTelegramId={userTelegramId}
              />
            </div>
          )}

          {screen === "gameover" && lastRun && (
            <section className="section">
              <div className="title">🎯 Level Complete!</div>
              <div className="row"><div className="muted">Score</div><b>{lastRun.score}</b></div>
              <div className="row"><div className="muted">$Meow earned</div><b>{lastRun.coins}</b></div>
              {lastRun.max_combo > 0 && (
                <div className="row">
                  <div className="muted">Best combo</div>
                  <b>x{lastRun.max_combo + 1}</b>
                </div>
              )}
              
              {/* Add viral sharing */}
              <ShareButtons 
                variant="game-over"
                score={lastRun.score}
                combo={lastRun.max_combo}
                coins={lastRun.coins}
                userTelegramId={userTelegramId}
              />
              
              <div className="row" style={{ gap: 8, marginTop: 16 }}>
                <button 
                  className="btn primary" 
                  onClick={() => navigateTo("game")}
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
            </section>
          )}
        </main>
        
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
