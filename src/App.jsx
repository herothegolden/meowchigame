import React, { useEffect, useRef, useState } from "react";

/* -------------------------------------------------
   Candy Crush with Cats — Match-3 (Telegram WebApp)
   ✦ Candy Crush style with cats, pretzels, strawberries, oreos, marshmallows
   ✦ HK-like full-screen shell (Header / Content)
   ✦ Stable 100vh via Telegram viewportStableHeight
   ✦ Wallpaper splash that holds ≥ 3s
   ✦ Mechanics: swap → match 3+ → clear → gravity → refill
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

      /* Full-screen shell (Hamster Kombat style) */
      .shell {
        height: calc(var(--vh, 1vh) * 100);
        display: grid;
        grid-template-rows: auto 1fr;
        width: 100%;
      }
      .header {
        display:flex; align-items:center; justify-content:space-between;
        padding:12px 16px;
        background:#0f1430; border-bottom:1px solid rgba(122,162,255,.15);
        position: sticky; top: 0; z-index: 5;
      }
      .brand { display:flex; align-items:center; gap:10px; }
      .brand .logo { font-size:22px }
      .brand .name { font-weight:800; letter-spacing:.2px }
      .pill { padding:2px 8px; border-radius:999px; border:1px solid rgba(122,162,255,.25); background:#0f1533; font-size:11px; }

      .content {
        height: 100%; width: 100%;
        padding: 12px 16px 16px 16px;
        display: grid; align-content:start; gap: 12px;
        overflow:auto;
      }

      .section {
        background:#0f1430; border:1px solid var(--line);
        border-radius:16px; padding:14px;
        box-shadow:0 10px 28px rgba(0,0,0,.15);
      }
      .title { font-weight:800; font-size:16px; }
      .muted { opacity:.72; }
      .row { display:flex; align-items:center; justify-content:space-between; gap:8px; flex-wrap:wrap; }
      .grid { display:grid; gap:10px; }
      .btn {
        background:#12183a; border:1px solid #1c244e; border-radius:14px;
        padding:10px 12px; color:#fff; cursor:pointer;
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

      /* Board - enhanced for smooth rendering */
      .board-wrap { display:grid; gap:10px; }
      .board {
        position:relative; background:#0f1533; border-radius:18px;
        outline:1px solid var(--line);
        box-shadow:0 10px 34px rgba(0,0,0,.35); touch-action:none;
        margin: 0 auto;
      }
      .gridlines { position:absolute; inset:0; opacity:.15; pointer-events:none; }
      .tile {
        position:absolute; display:flex; align-items:center; justify-content:center;
        border-radius:16px; background:linear-gradient(135deg, #1a2260 0%, #151b46 100%);
        outline:1px solid #26307a;
        transition: transform .3s ease, opacity .4s ease, background .2s ease, box-shadow .3s ease;
        cursor:pointer; box-shadow: 0 2px 8px rgba(0,0,0,.2);
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
      .controls { display:grid; grid-template-columns: repeat(5, 1fr); gap:8px; }
      .combo { position:absolute; left:50%; transform:translateX(-50%); top:6px; background:rgba(255,255,255,.1); border:1px solid rgba(255,255,255,.1); border-radius:999px; padding:4px 8px; font-size:12px; }
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

  // Navigation / state
  const [screen, setScreen] = useState("home");
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

  // UI sections
  function Header() {
    return (
      <div className="header">
        <div className="brand">
          <span className="logo">🍬</span>
          <div className="name">Candy‑Crush‑Cats</div>
          <span className="pill">{screen.toUpperCase()}</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div>
            <span className="muted" style={{ marginRight: 6 }}>
              CandyCoins
            </span>
            <b>{coins}</b>
          </div>
          {screen !== "home" && (
            <button className="btn" onClick={() => setScreen("home")}>
              Home
            </button>
          )}
        </div>
      </div>
    );
  }

  function Home() {
    return (
      <div className="grid" style={{ gridTemplateColumns: "1fr" }}>
        <div className="section" style={{ display: "grid", gap: 10 }}>
          <div className="title">Match‑3 Candy Crush with cute cats!</div>
          <button className="btn primary block" onClick={() => setScreen("game")}>
            🍭 Play Candy Crush
          </button>
          <div className="row">
            <button className="btn block" onClick={() => setScreen("shop")}>🛍 Candy Shop</button>
            <button className="btn block" onClick={() => setScreen("leaderboard")}>🏆 Sweet Leaders</button>
          </div>
          <div className="row">
            <button className="btn block" onClick={() => setScreen("daily")}>🍯 Daily Treats</button>
            <button className="btn block" onClick={() => setScreen("invite")}>🔗 Share Sweetness</button>
          </div>
          <button className="btn block" onClick={() => setScreen("settings")}>⚙️ Settings</button>
        </div>
        <div className="section" style={{ display: "grid", gap: 8 }}>
          <div className="title">How to play Candy Crush</div>
          <div className="muted">
            Swap adjacent candies to create rows or columns of 3+ matching treats! 
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
        <div className="title" style={{ marginBottom: 10 }}>🍭 Candy Shop</div>
        <div className="list" style={{ display: "grid", gap: 8 }}>
          {items.map((it) => (
            <div key={it.key}>
              <div>
                <div style={{ fontWeight: 600 }}>{it.icon} {it.name}</div>
                <div className="muted" style={{ fontSize: 12 }}>{it.desc}</div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <div className="muted" style={{ fontSize: 12 }}>{it.price} 🍬</div>
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
          {canClaim ? "Claim 50 🍬" : "Come back tomorrow"}
        </button>
        <div className="muted" style={{ fontSize: 12 }}>
          Keep your sweet streak alive! Resets if you miss a day.
        </div>
      </div>
    );
  }

  function Invite() {
    const link = "https://t.me/candy_crush_cats_bot?start=sweet";
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
          Invite friends to join the candy crushing fun! When your friend completes their first level, you both get 200 🍬.
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
          <div className="muted">CandyCoins earned</div><b>{lastRun.coins}</b>
        </div>
        <button className="btn primary" onClick={() => setScreen("game")}>
          🍭 Crush More Candy
        </button>
        <div className="row">
          <button className="btn block" onClick={() => setScreen("shop")}>Candy Shop</button>
          <button className="btn block" onClick={() => setScreen("leaderboard")}>Sweet Leaders</button>
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
            <div className="splash-text">Loading sweet candies…</div>
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
              onExit={(run) => { setLastRun(run); setScreen("gameover"); }}
              onBack={() => setScreen("home")}
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

  function haptic(ms = 12) {
    try { navigator.vibrate?.(ms); } catch {}
  }

  // Enhanced touch and drag support
  useEffect(() => {
    const el = boardRef.current;
    if (!el) return;
    
    let dragState = null; // {startR, startC, startX, startY, isDragging}
    const thresh = 20; // Increased threshold for better drag detection
    
    const rcFromEvent = (e) => {
      const rect = el.getBoundingClientRect();
      const clientX = e.touches ? e.touches[0].clientX : e.clientX;
      const clientY = e.touches ? e.touches[0].clientY : e.clientY;
      const x = Math.max(0, Math.min(rect.width - 1, clientX - rect.left));
      const y = Math.max(0, Math.min(rect.height - 1, clientY - rect.top));
      const c = Math.floor(x / cell);
      const r = Math.floor(y / cell);
      return { r, c, x, y };
    };

    const onStart = (e) => {
      if (paused) return;
      e.preventDefault();
      
      const p = rcFromEvent(e);
      if (!inBounds(p.r, p.c)) return;
      
      // Desktop convenience: if already selected and clicking adjacent, swap immediately
      if (sel && Math.abs(sel.r - p.r) + Math.abs(sel.c - p.c) === 1 && !e.touches) {
        trySwap(sel.r, sel.c, p.r, p.c);
        setSel(null);
        dragState = null;
        return;
      }
      
      dragState = {
        startR: p.r,
        startC: p.c,
        startX: p.x,
        startY: p.y,
        isDragging: false
      };
      
      setSel({ r: p.r, c: p.c });
    };

    const onMove = (e) => {
      if (paused || !dragState) return;
      e.preventDefault();
      
      const p = rcFromEvent(e);
      const dx = p.x - dragState.startX;
      const dy = p.y - dragState.startY;
      const distance = Math.sqrt(dx * dx + dy * dy);
      
      if (distance > thresh) {
        dragState.isDragging = true;
        
        // Determine direction and target cell
        let targetR = dragState.startR;
        let targetC = dragState.startC;
        
        if (Math.abs(dx) > Math.abs(dy)) {
          // Horizontal movement
          targetC = dragState.startC + (dx > 0 ? 1 : -1);
        } else {
          // Vertical movement
          targetR = dragState.startR + (dy > 0 ? 1 : -1);
        }
        
        // Update selection to show drag target
        if (inBounds(targetR, targetC)) {
          setSel({ r: targetR, c: targetC });
        }
      }
    };

    const onEnd = (e) => {
      if (paused || !dragState) return;
      e.preventDefault();
      
      if (dragState.isDragging) {
        const p = rcFromEvent(e);
        const dx = p.x - dragState.startX;
        const dy = p.y - dragState.startY;
        
        // Determine final direction
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
        }
        setSel(null);
      } else {
        // Just a tap - keep selection
        setSel({ r: dragState.startR, c: dragState.startC });
      }
      
      dragState = null;
    };

    const onCancel = () => {
      setSel(null);
      dragState = null;
    };

    // Mouse events
    el.addEventListener("mousedown", onStart);
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onEnd);
    
    // Touch events
    el.addEventListener("touchstart", onStart, { passive: false });
    window.addEventListener("touchmove", onMove, { passive: false });
    window.addEventListener("touchend", onEnd, { passive: false });
    window.addEventListener("touchcancel", onCancel, { passive: false });

    return () => {
      // Mouse cleanup
      el.removeEventListener("mousedown", onStart);
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onEnd);
      
      // Touch cleanup
      el.removeEventListener("touchstart", onStart);
      window.removeEventListener("touchmove", onMove);
      window.removeEventListener("touchend", onEnd);
      window.removeEventListener("touchcancel", onCancel);
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
      setTimeout(() => setSel
