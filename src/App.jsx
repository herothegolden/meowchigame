return (
    <div className="section board-wrap" ref={containerRef}>
      {/* Game HUD */}
      <div className="row">
        <div><span className="muted">Score</span> <b>{score}</b></div>
        <div><span className="muted">Moves</span> <b>{moves}</b></div>
        <div><span className="muted">Combo</span> <b>{combo > 0 ? `x${combo + 1}` : "-"}</b></div>
      </div>

      {/* Board */}
      <div ref={boardRef} className="board" style={{ width: boardW, height: boardH }}>
        <div
          className="gridlines"
          style={{
            backgroundImage:
              "linear-gradient(var(--line) 1px, transparent 1px), linear-gradient(90deg, var(--line) 1px, transparent 1px)",
            backgroundSize: `${cell}import React, { useEffect, useRef, useState } from "react";

/* -------------------------------------------------
   Meowchi Game — Match-3 (Telegram WebApp)
   ✦ Match-3 style with cats, pretzels, strawberries, oreos, marshmallows
   ✦ Full-screen responsive design
   ✦ Stable 100vh via Telegram viewportStableHeight
   ✦ Touch & drag functionality optimized for mobile
   ✦ Proper navigation with back buttons
-------------------------------------------------- */

// ---------- Shared config ----------
const COLS = 8;
const ROWS = 8;
const CELL_MIN = 36;
const CELL_MAX = 64;

const CANDY_SET = ["😺", "🥨", "🍓", "🍪", "🍡"];
const randEmoji = () => CANDY_SET[Math.floor(Math.random() * CANDY_SET.length)];

const getTG = () =>
  (typeof window !== "undefined" ? window.Telegram?.WebApp : undefined);

// ---------- Root App ----------
export default function App() {
  // Inject CSS once
  useEffect(() => {
    const style = document.createElement("style");
    style.innerHTML = `
      :root { --line:#243069; --vh: 1vh; }
      html, body, #root { height: 100%; }
      body { margin:0; background:#0a0f23; color:#fff; font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial; }

      /* Full-screen shell (optimized for maximum space) */
      .shell {
        height: calc(var(--vh, 1vh) * 100);
        display: grid;
        grid-template-rows: auto 1fr;
        width: 100%;
        max-width: 100vw;
        overflow: hidden;
      }
      
      /* Compact 2-line header design */
      .header {
        background:#0f1430; border-bottom:1px solid rgba(122,162,255,.15);
        position: sticky; top: 0; z-index: 5;
        flex-shrink: 0;
        padding: 6px 12px;
      }
      
      .header-line1 {
        display: flex;
        justify-content: flex-end;
        gap: 8px;
        margin-bottom: 4px;
      }
      
      .header-line2 {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 8px;
        min-height: 32px;
      }
      
      .brand-compact { 
        display: flex; 
        align-items: center; 
        gap: 6px; 
        flex: 1; 
        min-width: 0; 
      }
      
      .brand-compact .logo { 
        font-size: 18px; 
        flex-shrink: 0; 
      }
      
      .brand-compact .name { 
        font-weight: 700; 
        font-size: 14px;
        letter-spacing: .1px; 
        white-space: nowrap; 
      }
      
      .pill-compact { 
        padding: 1px 6px; 
        border-radius: 999px; 
        border: 1px solid rgba(122,162,255,.25); 
        background: #0f1533; 
        font-size: 9px; 
        flex-shrink: 0; 
      }
      
      .score-info {
        display: flex;
        align-items: center;
        gap: 12px;
        font-size: 13px;
      }
      
      .score-item {
        white-space: nowrap;
        font-weight: 600;
      }

      .content {
        height: 100%; 
        width: 100%;
        max-width: 100vw;
        padding: 8px 12px 12px 12px;
        display: grid; 
        align-content: start; 
        gap: 8px;
        overflow: auto;
        box-sizing: border-box;
      }

      .section {
        background:#0f1430; border:1px solid var(--line);
        border-radius:16px; padding:12px;
        box-shadow:0 10px 28px rgba(0,0,0,.15);
        width: 100%;
        max-width: 100%;
        box-sizing: border-box;
      }
      .title { font-weight:800; font-size:16px; }
      .muted { opacity:.72; }
      .row { display:flex; align-items:center; justify-content:space-between; gap:8px; flex-wrap:wrap; }
      .grid { display:grid; gap:10px; }
      .btn {
        background:#12183a; border:1px solid #1c244e; border-radius:12px;
        padding:8px 10px; color:#fff; cursor:pointer;
        white-space: nowrap; text-align: center;
        touch-action: manipulation;
        font-size: 12px;
        font-weight: 600;
      }
      .btn:hover { background:#1a2260; }
      .btn:disabled { opacity:0.5; cursor:not-allowed; }
      .btn.primary { background:#132049; border-color:#1f2a5c; font-weight:700; }
      .btn.primary:hover { background:#1a2768; }
      .btn.block { width:100%; }

      .list > * {
        background:#12183a; border:1px solid #1c244e; border-radius:14px;
        padding:10px 12px; display:flex; align-items:center; justify-content:space-between; gap:8px;
      }
      .tabs { display:flex; gap:8px; flex-wrap:wrap; }
      .tab { padding:8px 10px; border-radius:999px; border:1px solid var(--line); background:#12183a; cursor:pointer; font-size:12px; }
      .tab:hover { background:#1a2260; }
      .tab.active { background:#132049; border-color:#1f2a5c; font-weight:700; }

      /* Board - maximized for full screen experience */
      .board-wrap { display:grid; gap:8px; }
      .board {
        position:relative; background:#0f1533; border-radius:16px;
        outline:1px solid var(--line);
        box-shadow:0 8px 28px rgba(0,0,0,.35); 
        margin: 0 auto;
        touch-action: none;
        user-select: none;
        -webkit-user-select: none;
        -webkit-touch-callout: none;
      }
      .gridlines { position:absolute; inset:0; opacity:.15; pointer-events:none; }
      .tile {
        position:absolute; display:flex; align-items:center; justify-content:center;
        border-radius:16px; background:linear-gradient(135deg, #1a2260 0%, #151b46 100%);
        outline:1px solid #26307a;
        transition: transform .3s ease, opacity .4s ease, background .2s ease, box-shadow .3s ease;
        cursor:pointer; box-shadow: 0 2px 8px rgba(0,0,0,.2);
        touch-action: none;
        user-select: none;
      }
      .tile:hover { 
        background:linear-gradient(135deg, #2a3270 0%, #1f2556 100%);
        transform: translateY(-1px);
        box-shadow: 0 4px 12px rgba(0,0,0,.3);
      }
      .tile.sel { 
        background:linear-gradient(135deg, #3a4280 0%, #2f3566 100%);
        outline-color:#4a58b4; 
        transform: scale(1.05);
        box-shadow: 0 0 0 3px rgba(74, 88, 180, 0.4);
      }
      .tile.hint { 
        box-shadow: 0 0 0 3px #7aa2ff inset, 0 0 20px rgba(122,162,255,.6);
        animation: pulse-hint 2s ease-in-out infinite;
      }
      @keyframes pulse-hint {
        0%, 100% { box-shadow: 0 0 0 3px #7aa2ff inset, 0 0 20px rgba(122,162,255,.6); }
        50% { box-shadow: 0 0 0 3px #ffd166 inset, 0 0 25px rgba(255,209,102,.8); }
      }
      .tile.falling {
        animation: fall-in 0.6s ease-out;
      }
      .tile.swapping {
        transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        z-index: 20;
      }
      .tile.drop-in {
        animation: drop-from-above 0.8s cubic-bezier(0.25, 0.46, 0.45, 0.94);
      }
      @keyframes fall-in {
        0% { transform: translateY(-100px); opacity: 0; }
        100% { transform: translateY(0); opacity: 1; }
      }
      @keyframes drop-from-above {
        0% { 
          transform: translateY(-400px); 
          opacity: 0.7; 
        }
        100% { 
          transform: translateY(0); 
          opacity: 1; 
        }
      }
      .controls { display:grid; grid-template-columns: repeat(5, 1fr); gap:6px; }
      .combo { position:absolute; left:50%; transform:translateX(-50%); top:4px; background:rgba(255,255,255,.1); border:1px solid rgba(255,255,255,.1); border-radius:999px; padding:3px 6px; font-size:11px; }
      @keyframes poof { 
        from { 
          opacity:1; 
          transform: translate(var(--cx), var(--cy)) scale(1.2) rotate(0deg); 
        } 
        50% {
          opacity:1;
          transform: translate(calc(var(--cx) + (var(--tx) - var(--cx)) * 0.7), calc(var(--cy) + (var(--ty) - var(--cy)) * 0.7)) scale(1) rotate(180deg);
        }
        to { 
          opacity:0; 
          transform: translate(var(--tx), var(--ty)) scale(0.2) rotate(360deg); 
        } 
      }
      .spark { 
        position:absolute; 
        animation: poof ease-out forwards;
        pointer-events: none;
        z-index: 100;
      }

      /* Splash (clean wallpaper, no dim/box) */
      .splash {
        position: fixed; inset: 0; z-index: 9999;
        display: grid; place-items: center; overflow: hidden;
        background: linear-gradient(135deg, #0a0f23 0%, #1a2260 50%, #243069 100%);
      }
      .splash-min {
        position: relative;
        display: grid; gap: 10px; place-items: center; text-align: center;
      }
      .loader-ring {
        width: 56px; height: 56px; border-radius: 50%;
        border: 3px solid rgba(255,255,255,.25);
        border-top-color: #ffffff;
        animation: spin 1s linear infinite;
      }
      @keyframes spin { to { transform: rotate(360deg); } }
      .splash-text { font-size: 13px; font-weight: 600; letter-spacing: .2px; }

      /* Responsive breakpoints */
      @media (max-width: 480px) {
        .content { padding: 6px 10px 10px 10px; }
        .brand-compact .name { font-size: 13px; }
        .btn { padding: 6px 8px; font-size: 11px; }
        .score-info { font-size: 12px; gap: 8px; }
      }
    `;
    document.head.appendChild(style);
    return () => document.head.removeChild(style);
  }, []);

  // Stable vh (Telegram provides viewportStableHeight)
  useEffect(() => {
    const setVH = () => {
      const vh = window.innerHeight / 100;
      document.documentElement.style.setProperty("--vh", `${vh}px`);
    };
    setVH();
    window.addEventListener("resize", setVH);
    return () => window.removeEventListener("resize", setVH);
  }, []);

  // Telegram WebApp initialization with better touch handling
  useEffect(() => {
    const tg = getTG();
    try { 
      tg?.ready(); 
      tg?.expand(); 
      // CRITICAL: Disable vertical swipes to prevent app closing during gameplay
      if (tg?.disableVerticalSwipes) {
        tg.disableVerticalSwipes();
        console.log("✅ Vertical swipes disabled for game");
      }
      // Set viewport to stable height
      if (tg?.viewportStableHeight) {
        document.documentElement.style.setProperty("--vh", `${tg.viewportStableHeight / 100}px`);
      }
    } catch (e) {
      console.warn("Telegram WebApp features not available:", e);
    }
  }, []);

  // Splash gating (3s + tg.ready + image loaded)
  const [showSplash, setShowSplash] = useState(true);
  const [tgReady, setTgReady] = useState(false);
  const [minElapsed, setMinElapsed] = useState(false);
  const [imgLoaded, setImgLoaded] = useState(false);

  useEffect(() => {
    const tg = getTG();
    try { tg?.ready(); tg?.expand(); } catch {}
    setTgReady(true);
  }, []);
  useEffect(() => {
    const t = setTimeout(() => setMinElapsed(true), 2000); // Shorter for demo
    return () => clearTimeout(t);
  }, []);
  useEffect(() => {
    setImgLoaded(true); // Skip image loading for demo
  }, []);
  useEffect(() => {
    if (tgReady && minElapsed && imgLoaded) setShowSplash(false);
  }, [tgReady, minElapsed, imgLoaded]);

  // Navigation / state with history tracking
  const [screen, setScreen] = useState("home");
  const [screenHistory, setScreenHistory] = useState(["home"]);
  const [coins, setCoins] = useState(500);
  const [lastRun, setLastRun] = useState({ score: 0, coins: 0 });
  const [settings, setSettings] = useState({ haptics: true, sounds: false });
  const [daily, setDaily] = useState({ streak: 0, lastClaim: null });
  const [lbScope, setLbScope] = useState("daily");
  const leaders = {
    daily: [["mira", 220], ["zeno", 180], ["kira", 150]],
    weekly: [["mira", 820], ["kira", 760], ["alex", 700]],
    all: [["neo", 4120], ["mira", 3880], ["alex", 3550]],
  };

  // Navigation functions
  const navigateTo = (newScreen) => {
    setScreenHistory(prev => [...prev, newScreen]);
    setScreen(newScreen);
  };

  const goBack = () => {
    if (screenHistory.length > 1) {
      const newHistory = [...screenHistory];
      newHistory.pop(); // Remove current screen
      const previousScreen = newHistory[newHistory.length - 1];
      setScreenHistory(newHistory);
      setScreen(previousScreen);
    } else {
      // Fallback to home if no history
      setScreen("home");
      setScreenHistory(["home"]);
    }
  };

  const goHome = () => {
    setScreen("home");
    setScreenHistory(["home"]);
  };

  // UI sections
  function Header() {
    const isHome = screen === "home";
    
    return (
      <div className="header">
        {/* Line 1: Navigation Buttons */}
        {!isHome && (
          <div className="header-line1">
            <button className="btn" onClick={goBack}>
              ← Back
            </button>
            <button className="btn" onClick={goHome}>
              🏠 Home
            </button>
          </div>
        )}
        
        {/* Line 2: Brand and Stats */}
        <div className="header-line2">
          <div className="brand-compact">
            <span className="logo">🐱</span>
            <div className="name">Meowchi</div>
            <span className="pill-compact">{screen.toUpperCase()}</span>
          </div>
          
          <div className="score-info">
            {screen === "game" && (
              <div className="score-item">Score: {score || 0}</div>
            )}
            <div className="score-item">$Meow {coins}</div>
          </div>
        </div>
      </div>
    );
  }

  function Home() {
    return (
      <div className="grid" style={{ gridTemplateColumns: "1fr" }}>
        <div className="section" style={{ display: "grid", gap: 10 }}>
          <div className="title">Match‑3 Meowchi Game with cute cats!</div>
          <button className="btn primary block" onClick={() => navigateTo("game")}>
            🍭 Play Meowchi Game
          </button>
          <div className="row">
            <button className="btn block" onClick={() => navigateTo("shop")}>🛍 Meowchi Shop</button>
            <button className="btn block" onClick={() => navigateTo("leaderboard")}>🏆 Sweet Leaders</button>
          </div>
          <div className="row">
            <button className="btn block" onClick={() => navigateTo("daily")}>🍯 Daily Treats</button>
            <button className="btn block" onClick={() => navigateTo("invite")}>🔗 Share Sweetness</button>
          </div>
          <button className="btn block" onClick={() => navigateTo("settings")}>⚙️ Settings</button>
        </div>
        <div className="section" style={{ display: "grid", gap: 8 }}>
          <div className="title">How to play Meowchi</div>
          <div className="muted">
            Touch and drag to swap adjacent candies to create rows or columns of 3+ matching treats! 
            Match cats 😺, pretzels 🥨, strawberries 🍓, oreos 🍪, or marshmallows 🍡. 
            Create cascades for <b>bonus points</b>. Use hints when stuck!
          </div>
        </div>
      </div>
    );
  }

  function Shop() {
    const items = [
      { key: "hint", name: "Candy Hint", desc: "Highlight a sweet swap", price: 20, icon: "💡" },
      { key: "shuffle", name: "Sugar Shuffle", desc: "Mix up the candy board", price: 40, icon: "🔄" },
      { key: "hammer", name: "Candy Crusher", desc: "Smash any candy", price: 60, icon: "🔨" },
      { key: "bomb", name: "Candy Bomb", desc: "Explode 3x3 area", price: 80, icon: "💥" },
    ];
    return (
      <div className="section">
        <div className="title" style={{ marginBottom: 10 }}>🛍 Meowchi Shop</div>
        <div className="list" style={{ display: "grid", gap: 8 }}>
          {items.map((it) => (
            <div key={it.key}>
              <div>
                <div style={{ fontWeight: 600 }}>{it.icon} {it.name}</div>
                <div className="muted" style={{ fontSize: 12 }}>{it.desc}</div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <div className="muted" style={{ fontSize: 12 }}>{it.price} $Meow</div>
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
      </div>
    );
  }

  function Leaderboard() {
    const scopes = [["daily", "Daily"], ["weekly", "Weekly"], ["all", "All‑time"]];
    const rows = leaders[lbScope] || [];
    return (
      <div className="section" style={{ display: "grid", gap: 10 }}>
        <div className="row">
          <div className="title">🏆 Sweet Leaderboard</div>
          <div className="tabs">
            {scopes.map(([k, label]) => (
              <button
                key={k}
                className={`tab ${lbScope === k ? "active" : ""}`}
                onClick={() => setLbScope(k)}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
        <div className="list" style={{ display: "grid", gap: 6 }}>
          {rows.map(([u, s], i) => (
            <div key={u}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ opacity: 0.7, width: 18, textAlign: "right" }}>{i + 1}.</span>
                <span style={{ fontWeight: 600 }}>{u}</span>
              </div>
              <div style={{ fontWeight: 700 }}>{s}</div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  function Daily() {
    const today = new Date().toISOString().slice(0, 10);
    const canClaim = daily.lastClaim !== today;
    function claim() {
      const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
      setDaily((d) => ({
        streak: d.lastClaim === yesterday ? d.streak + 1 : 1,
        lastClaim: today
      }));
      setCoins((c) => c + 50);
    }
    return (
      <div className="section" style={{ display: "grid", gap: 10 }}>
        <div className="title">🍯 Daily Sweet Treats</div>
        <div className="muted">
          Streak: <b>{daily.streak}</b>
          {daily.lastClaim ? ` • last: ${daily.lastClaim}` : ""}
        </div>
        <button className="btn primary" onClick={claim} disabled={!canClaim}>
          {canClaim ? "Claim 50 $Meow" : "Come back tomorrow"}
        </button>
        <div className="muted" style={{ fontSize: 12 }}>
          Keep your sweet streak alive! Resets if you miss a day.
        </div>
      </div>
    );
  }

  function Invite() {
    const link = "https://t.me/meowchi_game_bot?start=sweet";
    const [copied, setCopied] = useState(false);
    async function copy() {
      try {
        await navigator.clipboard.writeText(link);
        setCopied(true);
        setTimeout(() => setCopied(false), 1200);
      } catch { /* ignore */ }
    }
    return (
      <div className="section" style={{ display: "grid", gap: 10 }}>
        <div className="title">🍭 Share the Sweetness</div>
        <div className="muted" style={{ fontSize: 12 }}>
          Invite friends to join the meowchi crushing fun! When your friend completes their first level, you both get 200 $Meow.
        </div>
        <div className="row" style={{ gap: 8 }}>
          <div
            className="pill"
            style={{
              overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
              maxWidth: "70%",
            }}
          >
            {link}
          </div>
          <button className="btn" onClick={copy}>
            {copied ? "Copied!" : "Copy"}
          </button>
        </div>
      </div>
    );
  }

  function Settings() {
    return (
      <div className="section" style={{ display: "grid", gap: 10 }}>
        <div className="title">Settings</div>
        <label style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>Haptics</div>
          <input
            type="checkbox"
            checked={settings.haptics}
            onChange={(e) => setSettings((s) => ({ ...s, haptics: e.target.checked }))}
          />
        </label>
        <label style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>Sounds (preview only)</div>
          <input
            type="checkbox"
            checked={settings.sounds}
            onChange={(e) => setSettings((s) => ({ ...s, sounds: e.target.checked }))}
          />
        </label>
      </div>
    );
  }

  function GameOver() {
    return (
      <div className="section" style={{ display: "grid", gap: 10 }}>
        <div className="title">🍬 Sweet Level Complete!</div>
        <div className="row">
          <div className="muted">Score</div><b>{lastRun.score}</b>
        </div>
        <div className="row">
          <div className="muted">$Meow earned</div><b>{lastRun.coins}</b>
        </div>
        <button className="btn primary" onClick={() => navigateTo("game")}>
          🍭 Play More Meowchi
        </button>
        <div className="row">
          <button className="btn block" onClick={() => navigateTo("shop")}>Meowchi Shop</button>
          <button className="btn block" onClick={() => navigateTo("leaderboard")}>Sweet Leaders</button>
        </div>
      </div>
    );
  }

  return (
    <>
      {showSplash && (
        <div className="splash" role="status" aria-live="polite">
          <div className="splash-min">
            <div className="loader-ring" />
            <div className="splash-text">Loading sweet meowchi…</div>
          </div>
        </div>
      )}

      <div className="shell" style={{ visibility: showSplash ? "hidden" : "visible" }}>
        <Header />
        <div className="content">
          {screen === "home" && <Home />}
          {screen === "shop" && <Shop />}
          {screen === "leaderboard" && <Leaderboard />}
          {screen === "daily" && <Daily />}
          {screen === "invite" && <Invite />}
          {screen === "settings" && <Settings />}
          {screen === "game" && (
            <GameView
              onExit={(run) => { 
                setLastRun(run); 
                setCoins((c) => c + run.coins);
                navigateTo("gameover"); 
              }}
              onBack={goBack}
              onCoins={(d) => setCoins((c) => c + d)}
            />
          )}
          {screen === "gameover" && <GameOver />}
        </div>
      </div>
    </>
  );
}

// ---------- Game View (Match-3) ----------
function GameView({ onExit, onBack, onCoins }) {
  const containerRef = useRef(null);
  const boardRef = useRef(null);
  const [cell, setCell] = useState(48);
  useResizeCell(containerRef, setCell);

  // Board state
  const [grid, setGrid] = useState(() => initSolvableGrid());
  const gridRef = useRef(grid);
  gridRef.current = grid;

  // Selection + hint + animation state
  const [sel, setSel] = useState(null); // {r,c}
  const [hint, setHint] = useState(null); // [[r1,c1],[r2,c2]]
  const [swapping, setSwapping] = useState(null); // {from: {r,c}, to: {r,c}}

  // Score / moves / combo FX
  const [score, setScore] = useState(0);
  const [moves, setMoves] = useState(20);
  const [combo, setCombo] = useState(0);
  const [fx, setFx] = useState([]);
  const [blast, setBlast] = useState(new Set());
  const [paused, setPaused] = useState(false);

  // Track newly added tiles for drop animation
  const [newTiles, setNewTiles] = useState(new Set());

  // Expose score to parent component
  useEffect(() => {
    window.currentGameScore = score;
  }, [score]);

  function haptic(ms = 12) {
    try { navigator.vibrate?.(ms); } catch {}
  }

  // FIXED: Proper Telegram WebApp touch handling
  useEffect(() => {
    const el = boardRef.current;
    if (!el) return;
    
    let dragState = null;
    const dragThreshold = 20; // Optimal for mobile
    
    // Ensure document is scrollable for Telegram WebApp
    const ensureScrollable = () => {
      if (document.documentElement.scrollHeight <= window.innerHeight) {
        document.documentElement.style.height = "calc(100vh + 1px)";
      }
    };
    ensureScrollable();
    
    const rcFromEvent = (e) => {
      const rect = el.getBoundingClientRect();
      const touch = e.touches ? e.touches[0] : e;
      const x = Math.max(0, Math.min(rect.width - 1, touch.clientX - rect.left));
      const y = Math.max(0, Math.min(rect.height - 1, touch.clientY - rect.top));
      const c = Math.floor(x / cell);
      const r = Math.floor(y / cell);
      return { r, c, x, y };
    };

    const onTouchStart = (e) => {
      if (paused) return;
      
      // Prevent Telegram app closing
      if (window.scrollY === 0) {
        window.scrollTo(0, 1);
      }
      
      e.preventDefault();
      const p = rcFromEvent(e);
      if (!inBounds(p.r, p.c)) return;
      
      dragState = {
        startR: p.r, startC: p.c,
        startX: p.x, startY: p.y,
        isDragging: false,
        startTime: Date.now()
      };
      
      setSel({ r: p.r, c: p.c });
      haptic(5);
    };

    const onTouchMove = (e) => {
      if (paused || !dragState) return;
      e.preventDefault();
      
      const p = rcFromEvent(e);
      const dx = p.x - dragState.startX;
      const dy = p.y - dragState.startY;
      const distance = Math.sqrt(dx * dx + dy * dy);
      
      if (distance > dragThreshold && !dragState.isDragging) {
        dragState.isDragging = true;
        haptic(8);
        
        // Determine drag direction
        let targetR = dragState.startR;
        let targetC = dragState.startC;
        
        if (Math.abs(dx) > Math.abs(dy)) {
          targetC = dragState.startC + (dx > 0 ? 1 : -1);
        } else {
          targetR = dragState.startR + (dy > 0 ? 1 : -1);
        }
        
        if (inBounds(targetR, targetC)) {
          setSel({ r: targetR, c: targetC });
        }
      }
    };

    const onTouchEnd = (e) => {
      if (paused || !dragState) return;
      e.preventDefault();
      
      if (dragState.isDragging) {
        // Complete the drag swap
        const p = rcFromEvent(e);
        const dx = p.x - dragState.startX;
        const dy = p.y - dragState.startY;
        
        let dr = 0, dc = 0;
        if (Math.abs(dx) > Math.abs(dy)) {
          dc = dx > 0 ? 1 : -1;
        } else {
          dr = dy > 0 ? 1 : -1;
        }
        
        const targetR = dragState.startR + dr;
        const targetC = dragState.startC + dc;
        
        if (inBounds(targetR, targetC)) {
          trySwap(dragState.startR, dragState.startC, targetR, targetC);
          haptic(12);
        }
        setSel(null);
      } else {
        // Quick tap - just select
        setSel({ r: dragState.startR, c: dragState.startC });
        haptic(5);
      }
      
      dragState = null;
    };

    // Use proper passive: false for preventDefault
    el.addEventListener("touchstart", onTouchStart, { passive: false });
    el.addEventListener("touchmove", onTouchMove, { passive: false });
    el.addEventListener("touchend", onTouchEnd, { passive: false });
    
    // Desktop fallback
    const onMouseDown = (e) => {
      if (paused) return;
      const p = rcFromEvent(e);
      if (!inBounds(p.r, p.c)) return;
      
      if (sel && Math.abs(sel.r - p.r) + Math.abs(sel.c - p.c) === 1) {
        trySwap(sel.r, sel.c, p.r, p.c);
        setSel(null);
      } else {
        setSel({ r: p.r, c: p.c });
      }
    };
    
    el.addEventListener("mousedown", onMouseDown);

    return () => {
      el.removeEventListener("touchstart", onTouchStart);
      el.removeEventListener("touchmove", onTouchMove);
      el.removeEventListener("touchend", onTouchEnd);
      el.removeEventListener("mousedown", onMouseDown);
    };
  }, [cell, paused, sel]);

  // Swap logic
  function trySwap(r1, c1, r2, c2) {
    if (Math.abs(r1 - r2) + Math.abs(c1 - c2) !== 1) return;
    
    const g = cloneGrid(gridRef.current);
    [g[r1][c1], g[r2][c2]] = [g[r2][c2], g[r1][c1]];
    const matches = findMatches(g);
    
    if (matches.length === 0) {
      haptic(8);
      setSel({ r: r1, c: c1 });
      setTimeout(() => setSel(null), 120);
      return;
    }
    
    // Start visual swap animation
    setSwapping({ from: {r: r1, c: c1}, to: {r: r2, c: c2} });
    
    // After animation completes, update grid and start cascades
    setTimeout(() => {
      setGrid(g);
      setSwapping(null);
      setMoves((m) => Math.max(0, m - 1));
      
      resolveCascades(g, () => {
        if (movesRef.current === 0) finish();
      });
    }, 300);
  }

  const movesRef = useRef(moves);
  movesRef.current = moves;

  function resolveCascades(startGrid, done) {
    let g = cloneGrid(startGrid);
    let comboCount = 0;
    
    const step = () => {
      const matches = findMatches(g);
      if (matches.length === 0) {
        setGrid(g);
        setNewTiles(new Set());
        if (comboCount > 0) {
          setCombo(comboCount);
          haptic(15);
          setTimeout(() => setCombo(0), 1500);
        }
        ensureSolvable();
        done && done();
        return;
      }
      
      // Show blast effect
      const keys = matches.map(([r, c]) => `${r}:${c}`);
      setBlast(new Set(keys));
      
      // FX particles
      const fxId = Date.now() + Math.random();
      setFx((prev) => [
        ...prev,
        ...matches.map((m, i) => ({ 
          id: fxId + i + Math.random(),
          x: m[1] * cell, 
          y: m[0] * cell 
        })),
      ]);
      
      // Scoring
      setScore((s) => s + 10 * matches.length * Math.max(1, comboCount + 1));
      onCoins(Math.ceil(matches.length / 4));
      
      // PHASE 1: Clear matches and show empty spaces
      matches.forEach(([r, c]) => { g[r][c] = null; });
      setGrid(cloneGrid(g));
      
      setTimeout(() => setBlast(new Set()), 800);
      
      // PHASE 2: Apply gravity and refill, then animate the drops
      setTimeout(() => {
        // Remember which positions were empty before refill
        const emptyPositions = new Set();
        for (let r = 0; r < ROWS; r++) {
          for (let c = 0; c < COLS; c++) {
            if (g[r][c] === null) {
              emptyPositions.add(`${r}-${c}`);
            }
          }
        }
        
        // Apply gravity and refill
        applyGravity(g);
        refill(g);
        
        // Mark positions that got new tiles for drop animation
        setNewTiles(emptyPositions);
        setGrid(cloneGrid(g));
        
        // Clear the drop animation after it completes
        setTimeout(() => {
          setNewTiles(new Set());
          comboCount++;
          setTimeout(step, 300);
        }, 800); // Drop animation duration
        
      }, 600); // Time to see empty spaces
      
      setTimeout(() => {
        setFx((prev) => prev.filter((p) => p.id < fxId || p.id > fxId + 100));
      }, 1500);
    };
    
    step();
  }

  function doHint() {
    const m = findFirstMove(gridRef.current);
    if (!m) { shuffleBoard(); return; }
    setHint(m);
    setTimeout(() => setHint(null), 1500);
    haptic(10);
  }

  function shuffleBoard() {
    const g = shuffleToSolvable(gridRef.current);
    setGrid(g);
    haptic(12);
  }

  function ensureSolvable() {
    if (!hasAnyMove(gridRef.current)) setGrid(shuffleToSolvable(gridRef.current));
  }

  function finish() { onExit({ score, coins: Math.floor(score * 0.15) }); }

  const boardW = cell * COLS, boardH = cell * ROWS;

  return (
    <div className="section board-wrap" ref={containerRef}>
      {/* Game HUD */}
      <div className="row">
        <div><span className="muted">Score</span> <b>{score}</b></div>
        <div><span className="muted">Moves</span> <b>{moves}</b></div>
        <div><span className="muted">Combo</span> <b>{combo > 0 ? `x${combo + 1}` : "-"}</b></div>
      </div>

      {/* Board */}
      <div ref={boardRef} className="board" style={{ width: boardW, height: boardH }}>
        <div
          className="gridlines"
          style={{
            backgroundImage:
              "linear-gradient(var(--line) 1px, transparent 1px), linear-gradient(90deg, var(--line) 1px, transparent 1px)",
            backgroundSize: `${cell}px ${cell}px`,
          }}
        />

        {/* Tiles */}
        {grid.map((row, r) =>
          row.map((v, c) => {
            const isSelected = sel && sel.r === r && sel.c === c;
            const isHinted = hint && 
              ((hint[0][0] === r && hint[0][1] === c) ||
               (hint[1][0] === r && hint[1][1] === c));
            const isBlasting = blast.has(`${r}:${c}`);
            
            // Smooth swap animation
            let swapTransform = "";
            if (swapping) {
              if (swapping.from.r === r && swapping.from.c === c) {
                const deltaX = (swapping.to.c - swapping.from.c) * cell;
                const deltaY = (swapping.to.r - swapping.from.r) * cell;
                swapTransform = `translate(${deltaX}px, ${deltaY}px)`;
              } else if (swapping.to.r === r && swapping.to.c === c) {
                const deltaX = (swapping.from.c - swapping.to.c) * cell;
                const deltaY = (swapping.from.r - swapping.to.r) * cell;
                swapTransform = `translate(${deltaX}px, ${deltaY}px)`;
              }
            }
            
            const isSwapping = swapping && (
              (swapping.from.r === r && swapping.from.c === c) || 
              (swapping.to.r === r && swapping.to.c === c)
            );

            const tileKey = `${r}-${c}`;
            const isNewTile = newTiles.has(tileKey);
            
            return (
              <div
                key={`tile-${r}-${c}`}
                className={`tile ${isSelected ? "sel" : ""} ${isHinted ? "hint" : ""} ${isSwapping ? "swapping" : ""} ${isNewTile ? "drop-in" : ""}`}
                style={{
                  left: c * cell,
                  top: r * cell,
                  width: cell,
                  height: cell,
                  transform: swapTransform || (isBlasting ? "scale(1.3) rotate(10deg)" : undefined),
                  boxShadow: isBlasting
                    ? "0 0 0 4px #ffd166 inset, 0 0 20px 6px rgba(255,209,102,.8), 0 0 40px 10px rgba(255,255,255,.3)"
                    : undefined,
                  background: isBlasting ? "linear-gradient(135deg, #ffd166 0%, #ff9500 100%)" : undefined,
                  zIndex: isBlasting ? 10 : (isSwapping ? 20 : 1),
                }}
              >
                <span style={{ 
                  fontSize: Math.floor(cell * 0.7),
                  transform: isBlasting ? "scale(1.2)" : undefined,
                  filter: isBlasting ? "drop-shadow(0 2px 4px rgba(0,0,0,.5))" : undefined,
                }}>
                  {v}
                </span>
              </div>
            );
          })
        )}

        {/* particles */}
        {fx.map((p) => (
          <Poof key={p.id} id={p.id} x={p.x} y={p.y} size={cell} />
        ))}

        {/* combo */}
        {combo > 0 && <div className="combo">🍭 Sweet Combo x{combo + 1}! 🍭</div>}

        {/* Pause overlay */}
        {paused && (
          <div
            style={{
              position: "absolute",
              inset: 0,
              background: "rgba(0,0,0,.35)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              borderRadius: 16,
            }}
          >
            <div className="section" style={{ textAlign: "center" }}>
              <div className="title" style={{ marginBottom: 8 }}>
                🍬 Game Paused
              </div>
              <div className="muted" style={{ marginBottom: 12 }}>
                Take a sweet break!
              </div>
              <div className="row" style={{ gap: 8 }}>
                <button className="btn primary" onClick={() => setPaused(false)}>
                  Resume
                </button>
                <button className="btn" onClick={() => finish()}>
                  End Sweet Level
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Controls */}
      <div className="controls">
        <button className="btn" onClick={() => setPaused((p) => !p)}>
          {paused ? "Resume" : "Pause"}
        </button>
        <button
          className="btn"
          onClick={() => {
            setGrid(initSolvableGrid());
            setScore(0);
            setMoves(20);
            setCombo(0);
            setSel(null);
            setHint(null);
            setSwapping(null);
          }}
        >
          Reset
        </button>
        <button className="btn" onClick={doHint}>💡 Sweet Hint</button>
        <button className="btn primary" onClick={shuffleBoard}>🔄 Sugar Shuffle</button>
        <div
          style={{
            gridColumn: "span 1",
            opacity: 0.7,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 11,
          }}
        >
          8×8
        </div>
      </div>
    </div>
  );
}
}

// ---------- Helpers ----------
const makeGrid = (rows, cols) =>
  Array.from({ length: rows }, () => Array(cols).fill(null));
const cloneGrid = (g) => g.map((r) => r.slice());
const inBounds = (r, c) => r >= 0 && r < ROWS && c >= 0 && c < COLS;

function findMatches(g) {
  const hits = new Set();
  // Horizontal
  for (let r = 0; r < ROWS; r++) {
    let c = 0;
    while (c < COLS) {
      const v = g[r][c];
      if (!v) { c++; continue; }
      let len = 1;
      while (c + len < COLS && g[r][c + len] === v) len++;
      if (len >= 3) for (let k = 0; k < len; k++) hits.add(`${r}:${c + k}`);
      c += len;
    }
  }
  // Vertical
  for (let c = 0; c < COLS; c++) {
    let r = 0;
    while (r < ROWS) {
      const v = g[r][c];
      if (!v) { r++; continue; }
      let len = 1;
      while (r + len < ROWS && g[r + len][c] === v) len++;
      if (len >= 3) for (let k = 0; k < len; k++) hits.add(`${r + k}:${c}`);
      r += len;
    }
  }
  return Array.from(hits).map((k) => k.split(":").map((n) => parseInt(n, 10)));
}

function applyGravity(g) {
  for (let c = 0; c < COLS; c++) {
    let write = ROWS - 1;
    for (let r = ROWS - 1; r >= 0; r--) {
      if (g[r][c] != null) {
        const v = g[r][c];
        g[r][c] = null;
        g[write][c] = v;
        write--;
      }
    }
    while (write >= 0) { g[write][c] = null; write--; }
  }
}

function refill(g) {
  for (let r = 0; r < ROWS; r++)
    for (let c = 0; c < COLS; c++)
      if (g[r][c] == null) g[r][c] = randEmoji();
}

function hasAnyMove(g) { return !!findFirstMove(g); }

function findFirstMove(g) {
  // Check swaps right and down for a created match
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      if (c + 1 < COLS) {
        const t = cloneGrid(g);
        [t[r][c], t[r][c + 1]] = [t[r][c + 1], t[r][c]];
        if (findMatches(t).length > 0) return [[r, c], [r, c + 1]];
      }
      if (r + 1 < ROWS) {
        const t = cloneGrid(g);
        [t[r][c], t[r + 1][c]] = [t[r + 1][c], t[r][c]];
        if (findMatches(t).length > 0) return [[r, c], [r + 1, c]];
      }
    }
  }
  return null;
}

function initSolvableGrid() {
  let g; let tries = 0;
  do {
    g = makeGrid(ROWS, COLS);
    for (let r = 0; r < ROWS; r++)
      for (let c = 0; c < COLS; c++)
        g[r][c] = randEmoji();
    removeAllMatches(g);
    tries++;
    if (tries > 50) break;
  } while (!hasAnyMove(g));
  return g;
}

function removeAllMatches(g) {
  // Reroll any existing matches to start without clears
  while (true) {
    const m = findMatches(g);
    if (m.length === 0) break;
    m.forEach(([r, c]) => { g[r][c] = randEmoji(); });
  }
}

function shuffleToSolvable(g) {
  const flat = [];
  for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) flat.push(g[r][c]);

  let attempts = 0;
  while (attempts < 100) {
    // Fisher-Yates shuffle
    for (let i = flat.length - 1; i > 0; i--) {
      const j = (Math.random() * (i + 1)) | 0;
      [flat[i], flat[j]] = [flat[j], flat[i]];
    }

    const t = makeGrid(ROWS, COLS);
    let idx = 0;
    for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) t[r][c] = flat[idx++];

    removeAllMatches(t);
    if (hasAnyMove(t)) return t;
    attempts++;
  }
  return initSolvableGrid();
}

function Poof({ x, y, size }) {
  const sparks = Array.from({ length: 20 }); // More particles!
  return (
    <>
      {sparks.map((_, i) => {
        const angle = (i / 20) * Math.PI * 2;
        const distance = size * (0.8 + Math.random() * 0.6); // Varied distances
        const tx = size / 2 + Math.cos(angle) * distance;
        const ty = size / 2 + Math.sin(angle) * distance;
        const randomDelay = Math.random() * 0.2; // Staggered timing
        const randomDuration = 1.2 + Math.random() * 0.6; // Varied speeds
        const sparkTypes = ['✨', '💫', '⭐', '🌟', '💥', '🎉', '🍬', '💎'];
        const randomSpark = sparkTypes[Math.floor(Math.random() * sparkTypes.length)];
        
        const style = {
          left: x, top: y,
          ["--cx"]: size / 2 + "px",
          ["--cy"]: size / 2 + "px",
          ["--tx"]: tx + "px",
          ["--ty"]: ty + "px",
          position: "absolute",
          animationDelay: `${randomDelay}s`,
          animationDuration: `${randomDuration}s`,
          fontSize: Math.floor(size * (0.3 + Math.random() * 0.4)) + "px", // Varied sizes
        };
        return (
          <span key={i} className="spark" style={style}>
            {randomSpark}
          </span>
        );
      })}
    </>
  );
}

function useResizeCell(containerRef, setCell) {
  useEffect(() => {
    const compute = () => {
      const el = containerRef.current;
      if (!el) return;
      // Maximize available space - reserve minimal space for HUD + controls
      const pad = 16;
      const w = el.clientWidth - pad * 2;
      const h = el.clientHeight - 120; // Reduced from 180 to maximize board
      const size = Math.floor(Math.min(w / COLS, h / ROWS));
      setCell(Math.max(CELL_MIN, Math.min(size, CELL_MAX)));
    };
    compute();
    let ro;
    if (typeof ResizeObserver !== "undefined" && containerRef.current) {
      ro = new ResizeObserver(compute);
      ro.observe(containerRef.current);
    }
    window.addEventListener("resize", compute);
    return () => {
      ro?.disconnect();
      window.removeEventListener("resize", compute);
    };
  }, [containerRef, setCell]);
}
