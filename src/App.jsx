import React, { useEffect, useState } from "react";
import Home from "./Home.jsx";
import GameView from "./GameView.jsx";
import Splash from "./Splash.jsx";
import Leaderboard from "./Leaderboard.jsx";
import ProfileModal from "./ProfileModal.jsx";

const getTG = () =>
  (typeof window !== "undefined" ? window.Telegram?.WebApp : undefined);

// Diagnostic Component - REMOVE THIS IN PRODUCTION
function DiagnosticPanel({ userTelegramId }) {
  const [diagnostics, setDiagnostics] = useState({
    databaseStatus: null,
    leaderboardTest: null,
    gameSubmissionTest: null,
    loading: false
  });

  const runDiagnostics = async () => {
    setDiagnostics(prev => ({ ...prev, loading: true }));
    
    try {
      // 1. Check database status
      console.log("🔧 Testing database status...");
      const dbResponse = await fetch('/api/debug/database');
      const dbData = await dbResponse.json();
      
      // 2. Test leaderboard
      console.log("🔧 Testing leaderboard...");
      const leaderboardResponse = await fetch('/api/leaderboard/alltime');
      const leaderboardData = await leaderboardResponse.json();
      
      // 3. Test game submission (with dummy data)
      console.log("🔧 Testing game submission...");
      let gameSubmissionResult = null;
      if (userTelegramId) {
        try {
          const gameResponse = await fetch('/api/game/complete', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              telegram_id: userTelegramId,
              score: Math.floor(Math.random() * 2000) + 500, // Random score
              coins_earned: 150,
              moves_used: 15,
              max_combo: 3,
              game_duration: 45
            })
          });
          gameSubmissionResult = await gameResponse.json();
        } catch (err) {
          gameSubmissionResult = { error: err.message };
        }
      }
      
      setDiagnostics({
        databaseStatus: dbData,
        leaderboardTest: leaderboardData,
        gameSubmissionTest: gameSubmissionResult,
        loading: false
      });
      
    } catch (error) {
      console.error("❌ Diagnostics failed:", error);
      setDiagnostics(prev => ({ 
        ...prev, 
        loading: false, 
        error: error.message 
      }));
    }
  };

  return (
    <div style={{
      background: '#f8f9fa',
      border: '2px solid #e9ecef',
      borderRadius: '12px',
      padding: '20px',
      margin: '20px',
      fontFamily: 'monospace'
    }}>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '20px'
      }}>
        <h3>🔍 Leaderboard Diagnostics</h3>
        <button 
          className="btn primary" 
          onClick={runDiagnostics}
          disabled={diagnostics.loading}
        >
          {diagnostics.loading ? 'Running Tests...' : 'Run Diagnostics'}
        </button>
      </div>

      {diagnostics.error && (
        <div style={{
          background: '#f8d7da',
          border: '1px solid #f5c6cb',
          borderRadius: '4px',
          padding: '10px',
          color: '#721c24',
          margin: '10px 0'
        }}>
          <h4>❌ Error</h4>
          <pre>{diagnostics.error}</pre>
        </div>
      )}

      {diagnostics.databaseStatus && (
        <div style={{
          background: 'white',
          border: '1px solid #dee2e6',
          borderRadius: '8px',
          padding: '15px',
          margin: '15px 0'
        }}>
          <h4>📊 Database Status</h4>
          <div>Tables: {diagnostics.databaseStatus.tablesExist?.join(', ') || 'None'}</div>
          <div>Users: {diagnostics.databaseStatus.userCount || 0}</div>
          <div>Games: {diagnostics.databaseStatus.gameCount || 0}</div>
          
          {diagnostics.databaseStatus.gameCount === 0 && (
            <div style={{
              background: '#fff3cd',
              border: '1px solid #ffeaa7',
              borderRadius: '4px',
              padding: '10px',
              color: '#856404',
              fontWeight: 'bold',
              margin: '10px 0'
            }}>
              ⚠️ NO GAMES IN DATABASE - This is why leaderboard is empty!
            </div>
          )}
          
          <details>
            <summary style={{ cursor: 'pointer', fontWeight: 'bold', color: '#007bff' }}>
              Sample Data
            </summary>
            <pre style={{
              background: '#f8f9fa',
              border: '1px solid #dee2e6',
              borderRadius: '4px',
              padding: '10px',
              overflow: 'auto',
              maxHeight: '200px',
              fontSize: '12px'
            }}>
              {JSON.stringify(diagnostics.databaseStatus, null, 2)}
            </pre>
          </details>
        </div>
      )}

      {diagnostics.leaderboardTest && (
        <div style={{
          background: 'white',
          border: '1px solid #dee2e6',
          borderRadius: '8px',
          padding: '15px',
          margin: '15px 0'
        }}>
          <h4>🏆 Leaderboard Test</h4>
          <div>Total Players: {diagnostics.leaderboardTest.totalPlayers || 0}</div>
          <div>Results: {diagnostics.leaderboardTest.leaderboard?.length || 0}</div>
          <div>Type: {diagnostics.leaderboardTest.type || 'N/A'}</div>
          
          {diagnostics.leaderboardTest.leaderboard?.length === 0 && (
            <div style={{
              background: '#fff3cd',
              border: '1px solid #ffeaa7',
              borderRadius: '4px',
              padding: '10px',
              color: '#856404',
              fontWeight: 'bold',
              margin: '10px 0'
            }}>
              ⚠️ LEADERBOARD EMPTY - No players found!
            </div>
          )}
        </div>
      )}

      {diagnostics.gameSubmissionTest && (
        <div style={{
          background: 'white',
          border: '1px solid #dee2e6',
          borderRadius: '8px',
          padding: '15px',
          margin: '15px 0'
        }}>
          <h4>🎮 Game Submission Test</h4>
          {diagnostics.gameSubmissionTest.error ? (
            <div style={{
              background: '#f8d7da',
              border: '1px solid #f5c6cb',
              borderRadius: '4px',
              padding: '10px',
              color: '#721c24',
              margin: '10px 0'
            }}>
              ❌ Game submission failed: {diagnostics.gameSubmissionTest.error}
            </div>
          ) : (
            <div style={{
              background: '#d4edda',
              border: '1px solid #c3e6cb',
              borderRadius: '4px',
              padding: '10px',
              color: '#155724',
              fontWeight: 'bold',
              margin: '10px 0'
            }}>
              ✅ Game submitted successfully! Total games: {diagnostics.gameSubmissionTest.totalGames}
            </div>
          )}
        </div>
      )}

      <div style={{
        background: '#e7f3ff',
        border: '1px solid #b3d7ff',
        borderRadius: '8px',
        padding: '15px',
        marginTop: '20px'
      }}>
        <h4>🔧 Quick Fix Instructions</h4>
        <ol>
          <li>If database shows 0 games → Click "Run Diagnostics" to add test data</li>
          <li>If tables are missing → Server will auto-create them</li>
          <li>If game submission fails → Check browser console for errors</li>
          <li>If leaderboard is empty but games exist → Check date filters</li>
        </ol>
        <p><strong>User ID:</strong> {userTelegramId}</p>
      </div>
    </div>
  );
}

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

  // DIAGNOSTIC MODE - Set to false in production
  const [showDiagnostics, setShowDiagnostics] = useState(true);

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
        console.log('✅ Using Telegram WebApp ID:', telegramId);
      } else {
        // Fallback for testing (use a demo ID)
        telegramId = Math.floor(Math.random() * 1000000) + 100000;
        console.log('⚠️ Demo mode - using random Telegram ID:', telegramId);
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
        console.log('✅ User registered:', data.user);
        
        // Auto-detect country if not set
        if (!data.user.country_flag) {
          detectAndSetCountry(telegramId);
        }
        
        // Fetch user stats
        fetchUserStats(telegramId);
      } else {
        const error = await response.json();
        console.error('❌ User registration failed:', error);
      }
    } catch (error) {
      console.error('❌ User initialization failed:', error);
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
            console.log('✅ Country detected and set:', countryFlag);
          }
        }
      }
    } catch (error) {
      console.log('⚠️ Country detection failed:', error);
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
      console.error('❌ Failed to fetch user stats:', error);
    }
  };

  // Handle profile updates
  const handleProfileUpdate = (updatedUser) => {
    setUserProfile(updatedUser);
    // Refresh user stats
    if (userTelegramId) {
      fetchUserStats(userTelegramId);
    }
  };

  // Handle profile completion (simplified)
  const handleProfileSaved = (updatedUser) => {
    setUserProfile(updatedUser);
    setShowProfileModal(false);
    
    // Refresh user stats
    if (userTelegramId) {
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

        {/* Diagnostic toggle */}
        <div className="row">
          <div>
            <div style={{ fontWeight: 600 }}>Debug Mode</div>
            <div className="muted small">
              Show diagnostic panel for troubleshooting
            </div>
          </div>
          <input
            type="checkbox"
            checked={showDiagnostics}
            onChange={(e) => setShowDiagnostics(e.target.checked)}
          />
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

  // Handle game completion (simplified)
  const handleGameExit = async (gameResult) => {
    console.log('🎮 Game completed with result:', gameResult);
    
    setLastRun(gameResult);
    setCoins((c) => c + (gameResult?.coins || 0));
    
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
          {/* DIAGNOSTIC PANEL - REMOVE IN PRODUCTION */}
          {showDiagnostics && (
            <DiagnosticPanel userTelegramId={userTelegramId} />
          )}

          {screen === "home" && (
            <Home 
              coins={coins} 
              onNavigate={navigateTo} 
              userStats={userStats}
              userProfile={userProfile}
              onProfileUpdate={handleProfileUpdate}
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
