import React, { useEffect, useState } from "react";
import Home from "./Home.jsx";
import GameView from "./GameView.jsx";
import Splash from "./Splash.jsx";
import Leaderboard from "./Leaderboard.jsx";
import EnhancedProfileModal from "./EnhancedProfileModal.jsx";

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

  // Auto-detect Telegram user and country
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
        
        // Auto-detect country if not set
        if (!data.user.country_flag) {
          detectAndSetCountry(telegramId);
        }
        
        // Fetch user stats
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
      
      const response = await fetch(`/api/user/${telegramId}/stats`);
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
    
    // FIXED: Always refresh user stats after profile completion
    if (userTelegramId) {
      console.log('👤 Profile saved, refreshing stats...');
      fetchUserStats(userTelegramId);
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

  // Handle game completion (FIXED: Refresh homepage stats + better logging)
  const handleGameExit = async (gameResult) => {
    console.log('🎮 Game completed with result:', gameResult);
    
    setLastRun(gameResult);
    setCoins((c) => c + (gameResult?.coins || 0));
    
    // FIXED: Always refresh user stats after game completion 
    // This ensures homepage numbers update with new game data
    if (userTelegramId) {
      console.log('📊 Refreshing user stats after game...');
      console.log(`🔥 Game submitted combo: ${gameResult?.max_combo} (display will show: ${gameResult?.max_combo > 0 ? gameResult.max_combo + 1 : 0})`);
      
      // Delay to ensure backend has processed the game
      setTimeout(() => {
        fetchUserStats(userTelegramId);
      }, 800); // Increased delay for better reliability
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
              onProfileUpdate={handleProfileUpdate}
              onOpenProfileModal={() => setShowProfileModal(true)}
            />
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
                <div className="row">
                  <div className="muted">Best combo</div>
                  <b>x{lastRun.max_combo + 1}</b>
                  <div className="muted small" style={{ marginLeft: '8px' }}>
                    (will show as {lastRun.max_combo + 1} on homepage)
                  </div>
                </div>
              )}
              
              {/* Debug info for combo tracking */}
              {lastRun.max_combo === 0 && (
                <div className="row">
                  <div className="muted small">
                    ℹ️ No combos achieved this game. Try making matches that create cascading reactions!
                  </div>
                </div>
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
