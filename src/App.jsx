import React, { useEffect, useRef, useState } from "react";

/* -------------------------------------------------
   Meowchi (Candy-Cats) – Match-3 (Telegram WebApp)
   Level 1 + Special Pieces + EXTRAS
   ✦ Level-config engine (6x6, 20 moves, 1000 score)
   ✦ Specials from shapes (4/5/T-L) + effects
   ✦ EXTRAS:
     - Color Bomb partner-color logic
     - Special+Special combos (striped+striped, striped+wrapped, wrapped+wrapped, bomb+bomb, bomb+X)
     - Telegram CloudStorage save/load (coins, best score)
   ✦ Tutorial: auto-highlight first valid move
   ✦ Same UI shell/splash/haptics/back button
-------------------------------------------------- */

// ---------- Engine types / assets ----------
const PIECE = {
  CAT: "CAT",
  OREO: "OREO",
  MARSHMALLOW: "MARSHMALLOW",
  STRAWBERRY: "STRAWBERRY",
  PRETZEL: "PRETZEL",

  STRIPED_H: "STRIPED_H",
  STRIPED_V: "STRIPED_V",
  WRAPPED: "WRAPPED",
  COLOR_BOMB: "COLOR_BOMB",
  MEGA_STRAWBERRY: "MEGA_STRAWBERRY",
};

const EMOJI = {
  CAT: "🐱",
  OREO: "🍪",
  MARSHMALLOW: "🍥",
  STRAWBERRY: "🍓",
  PRETZEL: "🥨",

  STRIPED_H: "🐱⚡",
  STRIPED_V: "🐱⚡",
  WRAPPED: "🍥💥",
  COLOR_BOMB: "🍪🌈",
  MEGA_STRAWBERRY: "🍓⭐",
};

// Level 1 from your spec
const LEVELS = {
  1: {
    size: [6, 6],
    moves: 20,
    objective: { type: "score", target: 1000 },
    pool: [PIECE.CAT, PIECE.OREO, PIECE.MARSHMALLOW, PIECE.STRAWBERRY, PIECE.PRETZEL],
    layout: [
      ["CAT", "OREO", "MARSHMALLOW", "STRAWBERRY", "PRETZEL", "CAT"],
      ["OREO", "PRETZEL", "CAT", "OREO", "MARSHMALLOW", "STRAWBERRY"],
      ["MARSHMALLOW", "STRAWBERRY", "PRETZEL", "CAT", "OREO", "MARSHMALLOW"],
      ["STRAWBERRY", "CAT", "OREO", "MARSHMALLOW", "PRETZEL", "STRAWBERRY"],
      ["PRETZEL", "MARSHMALLOW", "STRAWBERRY", "CAT", "OREO", "PRETZEL"],
      ["CAT", "OREO", "PRETZEL", "MARSHMALLOW", "STRAWBERRY", "CAT"],
    ],
  },
};

const CELL_MIN = 36;
const CELL_MAX = 64;
const getTG = () =>
  (typeof window !== "undefined" ? window.Telegram?.WebApp : undefined);

const SPLASH_URL = "/splash.jpg"; // optional splash

// ---------- Cloud helpers ----------
const SAVE_KEY = "candycats_save_v1";
function cloudSet(obj) {
  const tg = getTG();
  if (!tg || !tg.CloudStorage) return;
  try {
    tg.CloudStorage.setItem(SAVE_KEY, JSON.stringify(obj), () => {});
  } catch {}
}
function cloudGet(cb) {
  const tg = getTG();
  if (!tg || !tg.CloudStorage) return cb(null);
  try {
    tg.CloudStorage.getItem(SAVE_KEY, (_err, v) => {
      if (!v) return cb(null);
      try { cb(JSON.parse(v)); } catch { cb(null); }
    });
  } catch { cb(null); }
}

// ---------- Root App ----------
export default function App() {
  // Inject CSS once
  useEffect(() => {
    const style = document.createElement("style");
    style.innerHTML = `
      :root { --line:#243069; --vh: 1vh; }
      html, body, #root { height: 100%; }
      body { margin:0; background:#0a0f23; color:#fff; font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial; }

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
      .btn.primary { background:#132049; border-color:#1f2a5c; font-weight:700; }
      .btn.block { width:100%; }

      .list > * {
        background:#12183a; border:1px solid #1c244e; border-radius:14px;
        padding:10px 12px; display:flex; align-items:center; justify-content:space-between; gap:8px;
      }
      .tabs { display:flex; gap:8px; flex-wrap:wrap; }
      .tab { padding:8px 10px; border-radius:999px; border:1px solid var(--line); background:#12183a; cursor:pointer; font-size:12px; }
      .tab.active { background:#132049; border-color:#1f2a5c; font-weight:700; }

      .board-wrap { display:grid; gap:10px; }
      .board {
        position:relative; background:#0f1533; border-radius:18px;
        outline:1px solid var(--line);
        box-shadow:0 10px 34px rgba(0,0,0,.35); touch-action:none;
        margin: 0 auto;
      }
      .gridlines { position:absolute; inset:0; opacity:.2; pointer-events:none; }
      .tile {
        position:absolute; display:flex; align-items:center; justify-content:center;
        border-radius:12px; background:#151b46; outline:1px solid #26307a;
        transition: transform .18s ease, opacity .25s ease, background .15s ease, box-shadow .18s ease;
      }
      .tile.sel { background:#1a2260; outline-color:#3a48a4; }
      .tile.hint { box-shadow: 0 0 0 2px #7aa2ff inset; }
      .controls { display:grid; grid-template-columns: repeat(5, 1fr); gap:8px; }
      .combo { position:absolute; left:50%; transform:translateX(-50%); top:6px; background:rgba(255,255,255,.1); border:1px solid rgba(255,255,255,.1); border-radius:999px; padding:4px 8px; font-size:12px; }
      @keyframes poof { from { opacity:1; transform: translate(var(--cx), var(--cy)) scale(.9) rotate(0deg); } to { opacity:0; transform: translate(var(--tx), var(--ty)) scale(.4) rotate(90deg); } }
      .spark { position:absolute; font-size:18px; animation: poof .75s ease-out forwards; }

      .splash {
        position: fixed; inset: 0; z-index: 9999;
        display: grid; place-items: center; overflow: hidden;
        background: url('/splash.jpg') center/cover no-repeat;
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
    const tg = getTG();
    const setVH = () => {
      const vh =
        (tg?.viewportStableHeight ??
          window.visualViewport?.height ??
          window.innerHeight) / 100;
      document.documentElement.style.setProperty("--vh", `${vh}px`);
    };
    setVH();
    window.addEventListener("resize", setVH);
    tg?.onEvent?.("viewportChanged", setVH);
    return () => {
      window.removeEventListener("resize", setVH);
      tg?.offEvent?.("viewportChanged", setVH);
    };
  }, []);

  // Splash gating (quick)
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
    const t = setTimeout(() => setMinElapsed(true), 1000);
    return () => clearTimeout(t);
  }, []);
  useEffect(() => {
    const img = new Image();
    img.onload = () => setImgLoaded(true);
    img.onerror = () => setImgLoaded(true);
    img.src = SPLASH_URL;
  }, []);
  useEffect(() => {
    if (tgReady && minElapsed && imgLoaded) setShowSplash(false);
  }, [tgReady, minElapsed, imgLoaded]);

  // Navigation / state
  const [screen, setScreen] = useState("home");
  const [coins, setCoins] = useState(500);
  const [best, setBest] = useState(0);
  const [lastRun, setLastRun] = useState({ score: 0, coins: 0, win: false });
  const [settings, setSettings] = useState({ haptics: true, sounds: false });
  const [daily, setDaily] = useState({ streak: 0, lastClaim: null });
  const [lbScope, setLbScope] = useState("daily");
  const leaders = {
    daily: [["mira", 220], ["zeno", 180], ["kira", 150]],
    weekly: [["mira", 820], ["kira", 760], ["alex", 700]],
    all: [["neo", 4120], ["mira", 3880], ["alex", 3550]],
  };

  // Load saved coins/best from Cloud
  useEffect(() => {
    cloudGet((data) => {
      if (data && typeof data === "object") {
        if (typeof data.coins === "number") setCoins(data.coins);
        if (typeof data.best === "number") setBest(data.best);
      }
    });
  }, []);

  function persist() {
    cloudSet({ coins, best });
  }

  useEffect(() => { persist(); }, [coins, best]);

  function Header() {
    return (
      <div className="header">
        <div className="brand">
          <span className="logo">🍬</span>
          <div className="name">Candy‑Cats</div>
          <span className="pill">{screen.toUpperCase()}</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div><span className="muted" style={{ marginRight: 6 }}>Best</span><b>{best}</b></div>
          <div>
            <span className="muted" style={{ margin: "0 6px 0 10px" }}>CatCoins</span>
            <b>{coins}</b>
          </div>
          {screen !== "home" && (
            <button className="btn" onClick={() => setScreen("home")}>Home</button>
          )}
        </div>
      </div>
    );
  }

  function Home() {
    return (
      <div className="grid" style={{ gridTemplateColumns: "1fr" }}>
        <div className="section" style={{ display: "grid", gap: 10 }}>
          <div className="title">Match‑3 with cats</div>
          <button className="btn primary block" onClick={() => setScreen("game")}>
            ▶️ Play Level 1
          </button>
          <div className="row">
            <button className="btn block" onClick={() => setScreen("shop")}>🛍 Shop</button>
            <button className="btn block" onClick={() => setScreen("leaderboard")}>🏆 Leaderboard</button>
          </div>
          <div className="row">
            <button className="btn block" onClick={() => setScreen("daily")}>📆 Daily Reward</button>
            <button className="btn block" onClick={() => setScreen("invite")}>🔗 Invite</button>
          </div>
          <button className="btn block" onClick={() => setScreen("settings")}>⚙️ Settings</button>
        </div>
        <div className="section" style={{ display: "grid", gap: 8 }}>
          <div className="title">How to play</div>
          <div className="muted">
            Swap adjacent tiles to make 3+ in a row or column. 4+ creates special pieces:
            <br/>• 4 → Striped row/col • 5 → 🍪 Color Bomb • T/L → 🍥 Wrapped • 5+ w/ 🍓 → 🍓⭐ Mega
            <br/>Reach <b>1,000</b> points in <b>20</b> moves.
          </div>
        </div>
      </div>
    );
  }

  function Shop() {
    const items = [
      { key: "hint", name: "Hint", desc: "Highlight a valid swap", price: 20 },
      { key: "shuffle", name: "Shuffle", desc: "Randomize board (keeps solvable)", price: 40 },
      { key: "hammer", name: "Cat Hammer", desc: "Break one tile", price: 60 },
    ];
    return (
      <div className="section">
        <div className="title" style={{ marginBottom: 10 }}>Shop</div>
        <div className="list" style={{ display: "grid", gap: 8 }}>
          {items.map((it) => (
            <div key={it.key}>
              <div>
                <div style={{ fontWeight: 600 }}>{it.name}</div>
                <div className="muted" style={{ fontSize: 12 }}>{it.desc}</div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <div className="muted" style={{ fontSize: 12 }}>{it.price} 🐾</div>
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
          <div className="title">Leaderboard</div>
          <div className="tabs">
            {scopes.map(([k, label]) => (
              <button
                key={k}
                className={\`tab \${lbScope === k ? "active" : ""}\`}
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
        <div className="title">Daily Reward</div>
        <div className="muted">
          Streak: <b>{daily.streak}</b>
          {daily.lastClaim ? \` • last: \${daily.lastClaim}\` : ""}
        </div>
        <button className="btn primary" onClick={claim} disabled={!canClaim}>
          {canClaim ? "Claim 50 🐾" : "Come back tomorrow"}
        </button>
        <div className="muted" style={{ fontSize: 12 }}>
          Resets if you miss a day.
        </div>
      </div>
    );
  }

  function Invite() {
    const link = "https://t.me/candy_cats_bot?start=meow";
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
        <div className="title">Invite friends</div>
        <div className="muted" style={{ fontSize: 12 }}>
          Share this deep link. When your friend completes one level, you both get 200 🐾.
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
        <div className="title">Level Over</div>
        <div className="row"><div className="muted">Score</div><b>{lastRun.score}</b></div>
        <div className="row"><div className="muted">CatCoins earned</div><b>{lastRun.coins}</b></div>
        <div className="row">
          <div className="muted">Result</div>
          <b style={{ color: lastRun.win ? "#7CFC7C" : "#ffb4a2" }}>{lastRun.win ? "Win" : "Try Again"}</b>
        </div>
        <button className="btn primary" onClick={() => setScreen("game")}>
          Play again
        </button>
        <div className="row">
          <button className="btn block" onClick={() => setScreen("shop")}>Shop</button>
          <button className="btn block" onClick={() => setScreen("leaderboard")}>Leaderboard</button>
        </div>
      </div>
    );
  }

  return (
  <>
    {showSplash && (
      <div className="splash" role="status" aria-live="polite">
        <div className="loader-ring" />
        <div className="splash-text">Waking up cats…</div>
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
            levelNum={1}
            onExit={(run) => {
              setLastRun(run);
              if (run.score > best) setBest(run.score);
              setCoins((c) => c + run.coins);
              setScreen("gameover");
            }}
            onBack={() => setScreen("home")}
            haptics={settings.haptics}
          />
        )}
        {screen === "gameover" && <GameOver />}
      </div>
    </div>
  </>
);
}

// ---------- Game View with combos & Cloud save ----------
function GameView({ levelNum, onExit, onBack, haptics }) {
  const level = LEVELS[levelNum];
  const ROWS = level.size[0];
  const COLS = level.size[1];

  const containerRef = useRef(null);
  const boardRef = useRef(null);
  const [cell, setCell] = useState(48);
  useResizeCell(containerRef, setCell, ROWS, COLS);

  // Board stores {type: PIECE, special?: one of PIECE.* specials}
  const [grid, setGrid] = useState(() => {
    const g = levelToGrid(level);
    removeAllMatches(g, ROWS, COLS); // start with no clears
    ensureAnyMove(g, ROWS, COLS, level.pool);
    return g;
  });
  const gridRef = useRef(grid);
  gridRef.current = grid;

  // HUD
  const [score, setScore] = useState(0);
  const [moves, setMoves] = useState(level.moves);
  const [combo, setCombo] = useState(0);

  // Selection + hint + tutorial
  const [sel, setSel] = useState(null); // {r,c}
  const [hint, setHint] = useState(null); // [[r1,c1],[r2,c2]]

  // FX + pause
  const [fx, setFx] = useState([]);
  const [blast, setBlast] = useState(new Set());
  const [paused, setPaused] = useState(false);

  // Telegram WebApp
  useEffect(() => {
    const tg = getTG();
    if (!tg) return;
    try {
      tg.ready();
      tg.expand();
      tg.BackButton.show();
      tg.MainButton.setText("Hint 🔍");
      tg.MainButton.show();
    } catch {}
    const onBackBtn = () => setPaused((p) => !p);
    const onMain = () => doHint();
    tg?.onEvent?.("backButtonClicked", onBackBtn);
    tg?.onEvent?.("mainButtonClicked", onMain);
    return () => {
      tg?.offEvent?.("backButtonClicked", onBackBtn);
      tg?.offEvent?.("mainButtonClicked", onMain);
      try { tg.BackButton.hide(); tg.MainButton.hide(); } catch {}
    };
  }, []);

  function haptic(ms = 12) {
    if (!haptics) return;
    try { getTG()?.HapticFeedback?.impactOccurred("light"); } catch {}
    try { navigator.vibrate?.(ms); } catch {}
  }

  // Input (tap + swipe + desktop convenience)
  useEffect(() => {
    const el = boardRef.current;
    if (!el) return;
    let start = null; // {r,c,x,y}
    const thresh = 6;
    const rcFromEvent = (e) => {
      const rect = el.getBoundingClientRect();
      const x = Math.max(0, Math.min(rect.width - 1, e.clientX - rect.left));
      const y = Math.max(0, Math.min(rect.height - 1, e.clientY - rect.top));
      const c = Math.floor(x / cell);
      const r = Math.floor(y / cell);
      return { r, c, x, y };
    };

    const onDown = (e) => {
      if (paused) return;
      const p = rcFromEvent(e);
      if (sel && Math.abs(sel.r - p.r) + Math.abs(sel.c - p.c) === 1) {
        trySwap(sel.r, sel.c, p.r, p.c);
        setSel(null);
        start = null;
        e.target.setPointerCapture?.(e.pointerId);
        return;
      }
      start = p;
      setSel({ r: p.r, c: p.c });
      e.target.setPointerCapture?.(e.pointerId);
    };

    const onUp = (e) => {
      if (paused || !start) return;
      const end = rcFromEvent(e);
      let dr = end.r - start.r, dc = end.c - start.c;
      const dx = end.x - start.x, dy = end.y - start.y;
      if (Math.abs(dr) + Math.abs(dc) !== 1) {
        if (Math.abs(dx) < thresh && Math.abs(dy) < thresh) {
          setSel(null);
          start = null;
          return;
        }
        if (Math.abs(dx) > Math.abs(dy)) { dr = 0; dc = dx > 0 ? 1 : -1; }
        else { dc = 0; dr = dy > 0 ? 1 : -1; }
      }
      const r2 = start.r + dr, c2 = start.c + dc;
      if (!inBounds(r2, c2, ROWS, COLS)) { setSel(null); start = null; return; }
      trySwap(start.r, start.c, r2, c2);
      setSel(null);
      start = null;
    };

    el.addEventListener("pointerdown", onDown);
    window.addEventListener("pointerup", onUp);
    return () => {
      el.removeEventListener("pointerdown", onDown);
      window.removeEventListener("pointerup", onUp);
    };
  }, [cell, paused, sel, ROWS, COLS]);

  // Tutorial: auto-highlight a valid swap
  useEffect(() => {
    const m = findFirstMove(gridRef.current, ROWS, COLS);
    if (m) {
      setHint(m);
      const t = setTimeout(() => setHint(null), 1500);
      return () => clearTimeout(t);
    }
  }, []);

  function finishIfDone() {
    if (movesRef.current === 0) {
      const win = scoreRef.current >= level.objective.target;
      onExit({
        score: scoreRef.current,
        coins: Math.floor(scoreRef.current * 0.15),
        win,
      });
    }
  }

  const movesRef = useRef(moves);
  movesRef.current = moves;
  const scoreRef = useRef(score);
  scoreRef.current = score;

  // --- SWAP with combo handling ---
  function trySwap(r1, c1, r2, c2) {
    if (Math.abs(r1 - r2) + Math.abs(c1 - c2) !== 1) return;
    const g = cloneGrid(gridRef.current, ROWS, COLS);
    const A = g[r1][c1];
    const B = g[r2][c2];

    // Handle special+special or bomb combos first
    if (handleSwapCombos(g, r1, c1, r2, c2, ROWS, COLS)) {
      // After manual combo clear, cascade
      setGrid(g);
      setMoves((m) => Math.max(0, m - 1));
      resolveCascades(g, () => finishIfDone());
      return;
    }

    // Normal swap then check matches
    [g[r1][c1], g[r2][c2]] = [g[r2][c2], g[r1][c1]];

    const results = detectAllMatches(g, ROWS, COLS);
    if (results.totalClears === 0) {
      haptic(8);
      setSel({ r: r1, c: c1 });
      setTimeout(() => setSel(null), 120);
      return;
    }

    setGrid(g);
    setMoves((m) => Math.max(0, m - 1));
    resolveCascades(g, () => finishIfDone());
  }

  // --- Combo logic ---
  function handleSwapCombos(g, r1, c1, r2, c2, ROWS, COLS) {
    const A = g[r1][c1], B = g[r2][c2];
    if (!A || !B) return false;

    const centerR = r2, centerC = c2; // treat drop target as center
    const cleared = new Set();
    let specialsTriggered = 0;

    const add = (rr, cc) => { if (inBounds(rr, cc, ROWS, COLS)) cleared.add(key(rr, cc)); };

    const isBomb = (t) => t?.special === PIECE.COLOR_BOMB;
    const isStriped = (t) => t?.special === PIECE.STRIPED_H || t?.special === PIECE.STRIPED_V;
    const isWrapped = (t) => t?.special === PIECE.WRAPPED;
    const isMega = (t) => t?.special === PIECE.MEGA_STRAWBERRY;

    // COLOR_BOMB combos
    if (isBomb(A) || isBomb(B)) {
      const bomb = isBomb(A) ? A : B;
      const other = isBomb(A) ? B : A;

      if (isBomb(A) && isBomb(B)) {
        // bomb + bomb = clear entire board
        for (let rr = 0; rr < ROWS; rr++) for (let cc = 0; cc < COLS; cc++) add(rr, cc);
      } else if (isStriped(other)) {
        // bomb + striped: turn all of other's color into striped and trigger lines
        const targetType = other.type;
        for (let rr = 0; rr < ROWS; rr++) {
          for (let cc = 0; cc < COLS; cc++) {
            const t = g[rr][cc];
            if (t && t.type === targetType && !t.special) {
              // mark as striped and clear its row or column randomly
              t.special = Math.random() < 0.5 ? PIECE.STRIPED_H : PIECE.STRIPED_V;
              triggerSpecial(g, rr, cc, t.special, ROWS, COLS, cleared);
              specialsTriggered++;
            }
          }
        }
        add(r1, c1); add(r2, c2);
      } else if (isWrapped(other)) {
        // bomb + wrapped: turn all of other's color into wrapped and explode
        const targetType = other.type;
        for (let rr = 0; rr < ROWS; rr++) {
          for (let cc = 0; cc < COLS; cc++) {
            const t = g[rr][cc];
            if (t && t.type === targetType && !t.special) {
              t.special = PIECE.WRAPPED;
              triggerSpecial(g, rr, cc, t.special, ROWS, COLS, cleared);
              specialsTriggered++;
            }
          }
        }
        add(r1, c1); add(r2, c2);
      } else if (isMega(other)) {
        // bomb + mega: heavy clear — all of color + 3 rows/cols at center
        const targetType = other.type;
        for (let rr = 0; rr < ROWS; rr++)
          for (let cc = 0; cc < COLS; cc++)
            if (g[rr][cc]?.type === targetType) add(rr, cc);
        // plus mega sweep
        for (let rr = centerR - 1; rr <= centerR + 1; rr++)
          for (let cc = 0; cc < COLS; cc++) add(rr, cc);
        for (let cc = centerC - 1; cc <= centerC + 1; cc++)
          for (let rr = 0; rr < ROWS; rr++) add(rr, cc);
        add(r1, c1); add(r2, c2);
      } else {
        // bomb + basic: remove all of other's type
        const targetType = other.type;
        for (let rr = 0; rr < ROWS; rr++)
          for (let cc = 0; cc < COLS; cc++)
            if (g[rr][cc]?.type === targetType) add(rr, cc);
        add(r1, c1); add(r2, c2);
      }

      // apply immediate clear & cascade entry
      if (cleared.size > 0) {
        // include triggering specials in cleared handling
        performManualClear(g, cleared, ROWS, COLS);
        // score estimation
        const base = cleared.size * 12; // slightly juicier for combos
        setScore((s) => s + base + specialsTriggered * 25);
        haptic(18);
        return true;
      }
      return false;
    }

    // SPECIAL + SPECIAL (no bomb)
    if (isStriped(A) && isStriped(B)) {
      // cross: clear row of A and col of B (and vice versa for effect)
      for (let cc = 0; cc < COLS; cc++) add(r1, cc);
      for (let rr = 0; rr < ROWS; rr++) add(rr, c2);
      add(r1, c1); add(r2, c2);
      performManualClear(g, cleared, ROWS, COLS);
      setScore((s) => s + cleared.size * 12 + 40);
      haptic(16);
      return true;
    }

    if ((isStriped(A) && isWrapped(B)) || (isStriped(B) && isWrapped(A))) {
      // 3 rows + 3 cols centered at swap target
      for (let rr = centerR - 1; rr <= centerR + 1; rr++)
        for (let cc = 0; cc < COLS; cc++) add(rr, cc);
      for (let cc = centerC - 1; cc <= centerC + 1; cc++)
        for (let rr = 0; rr < ROWS; rr++) add(rr, cc);
      add(r1, c1); add(r2, c2);
      performManualClear(g, cleared, ROWS, COLS);
      setScore((s) => s + cleared.size * 12 + 50);
      haptic(18);
      return true;
    }

    if (isWrapped(A) && isWrapped(B)) {
      // 5x5 twice centered at target
      for (let pass = 0; pass < 2; pass++) {
        for (let rr = centerR - 2; rr <= centerR + 2; rr++)
          for (let cc = centerC - 2; cc <= centerC + 2; cc++)
            add(rr, cc);
      }
      add(r1, c1); add(r2, c2);
      performManualClear(g, cleared, ROWS, COLS);
      setScore((s) => s + cleared.size * 12 + 60);
      haptic(22);
      return true;
    }

    if (isMega(A) || isMega(B)) {
      // Mega with anything: at least do its 3 rows + 3 cols
      for (let rr = centerR - 1; rr <= centerR + 1; rr++)
        for (let cc = 0; cc < COLS; cc++) add(rr, cc);
      for (let cc = centerC - 1; cc <= centerC + 1; cc++)
        for (let rr = 0; rr < ROWS; rr++) add(rr, cc);
      add(r1, c1); add(r2, c2);
      performManualClear(g, cleared, ROWS, COLS);
      setScore((s) => s + cleared.size * 12 + 40);
      haptic(18);
      return true;
    }

    return false;
  }

  function resolveCascades(startGrid, done) {
    let g = cloneGrid(startGrid, ROWS, COLS);
    let comboCount = 0;

    const step = () => {
      const results = detectAllMatches(g, ROWS, COLS);
      if (results.totalClears === 0) {
        setGrid(g);
        if (comboCount > 0) {
          setCombo(comboCount);
          haptic(15);
          setTimeout(() => setCombo(0), 900);
        }
        ensureAnyMove(g, ROWS, COLS, level.pool);
        done && done();
        return;
      }

      // particles + blast highlight
      const fxId = Date.now();
      setFx((prev) => [
        ...prev,
        ...results.clearedCells.map(([r, c], i) => ({
          id: fxId + i, x: c * cell, y: r * cell
        })),
      ]);
      setTimeout(() => setFx((prev) => prev.filter((p) => p.id < fxId)), 900);

      const keys = new Set(results.clearedCells.map(([r, c]) => \`\${r}:\${c}\`));
      setBlast(keys);
      setTimeout(() => setBlast(new Set()), 500);

      // scoring: 10 per tile × (combo+1), bonus for specials
      const base = results.clearedCells.length * 10 * Math.max(1, comboCount + 1);
      const bonus = results.specialsTriggered * 20;
      setScore((s) => s + base + bonus);

      // apply clears
      results.clearedCells.forEach(([r, c]) => { g[r][c] = null; });

      // gravity + refill
      applyGravity(g, ROWS, COLS);
      refill(g, ROWS, COLS, level.pool);

      comboCount++;
      setTimeout(step, 90);
    };

    step();
  }

  function doHint() {
    const m = findFirstMove(gridRef.current, ROWS, COLS);
    if (!m) { shuffleBoard(); return; }
    setHint(m);
    setTimeout(() => setHint(null), 1500);
    haptic(10);
  }

  function shuffleBoard() {
    const g = shuffleToSolvable(gridRef.current, ROWS, COLS, level.pool);
    setGrid(g);
    haptic(12);
  }

  const boardW = cell * COLS, boardH = cell * ROWS;
  const tg = getTG();

  return (
    <div className="section board-wrap" ref={containerRef}>
      <div className="row">
        <button className="btn" onClick={onBack}>Back</button>
        <div className="muted">
          {tg
            ? "Back button pauses"
            : "Tap a tile then swipe to a neighbor (mobile) — or click a tile then click/drag to a neighbor (desktop) to swap"}
        </div>
      </div>

      {/* HUD */}
      <div className="row">
        <div><span className="muted">Score</span> <b>{score}</b></div>
        <div><span className="muted">Moves</span> <b>{moves}</b></div>
        <div><span className="muted">Combo</span> <b>{combo > 0 ? \`x\${combo + 1}\` : "-"}</b></div>
      </div>

      {/* Board */}
      <div ref={boardRef} className="board" style={{ width: boardW, height: boardH }}>
        <div
          className="gridlines"
          style={{
            backgroundImage:
              "linear-gradient(var(--line) 1px, transparent 1px), linear-gradient(90deg, var(--line) 1px, transparent 1px)",
            backgroundSize: \`\${cell}px \${cell}px\`,
          }}
        />

        {/* Tiles */}
        {grid.map((row, r) =>
          row.map((tile, c) => (
            <div
              key={\`t-\${r}-\${c}-\${tile?.type || "x"}-\${score}\`}
              className={\`tile \${sel && sel.r === r && sel.c === c ? "sel" : ""} \${hint && ((hint[0][0] === r && hint[0][1] === c) || (hint[1][0] === r && hint[1][1] === c)) ? "hint" : ""}\`}
              style={{
                left: c * cell,
                top: r * cell,
                width: cell,
                height: cell,
                transform: blast.has(\`\${r}:\${c}\`) ? "scale(1.18)" : undefined,
                boxShadow: blast.has(\`\${r}:\${c}\`)
                  ? "0 0 0 3px #ffd166 inset, 0 0 16px 4px rgba(255,209,102,.6)"
                  : undefined,
                background: blast.has(\`\${r}:\${c}\`) ? "#1f2568" : undefined,
              }}
            >
              <span style={{ fontSize: Math.floor(cell * 0.72) }}>
                {tile ? EMOJI[tile.special || tile.type] : ""}
              </span>
            </div>
          ))
        )}

        {/* particles */}
        {fx.map((p) => (
          <Poof key={p.id} id={p.id} x={p.x} y={p.y} size={cell} />
        ))}

        {/* combo */}
        {combo > 0 && <div className="combo">Combo x{combo + 1}!</div>}

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
              borderRadius: 18,
            }}
          >
            <div className="section" style={{ textAlign: "center" }}>
              <div className="title" style={{ marginBottom: 8 }}>Paused</div>
              <div className="muted" style={{ marginBottom: 12 }}>Tap Resume</div>
              <div className="row" style={{ gap: 8 }}>
                <button className="btn primary" onClick={() => setPaused(false)}>Resume</button>
                <button className="btn" onClick={() => {
                  const win = score >= LEVELS[1].objective.target;
                  onExit({ score, coins: Math.floor(score * 0.15), win });
                }}>
                  End Level
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
            const g = levelToGrid(level);
            removeAllMatches(g, ROWS, COLS);
            ensureAnyMove(g, ROWS, COLS, level.pool);
            setGrid(g);
            setScore(0);
            setMoves(level.moves);
            setCombo(0);
            setSel(null);
            setHint(null);
          }}
        >
          Reset
        </button>
        <button className="btn" onClick={doHint}>Hint 🔍</button>
        <button className="btn primary" onClick={shuffleBoard}>Shuffle 🔀</button>
        <div
          style={{
            gridColumn: "span 1",
            opacity: 0.7,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 12,
          }}
        >
          {ROWS}×{COLS}
        </div>
      </div>
    </div>
  );
}

// ---------- Helpers (grid, matching, specials) ----------
const inBounds = (r, c, ROWS, COLS) => r >= 0 && r < ROWS && c >= 0 && c < COLS;

function levelToGrid(level) {
  const [R, C] = level.size;
  const g = Array.from({ length: R }, () => Array(C).fill(null));
  for (let r = 0; r < R; r++) {
    for (let c = 0; c < C; c++) {
      g[r][c] = { type: level.layout[r][c], special: null };
    }
  }
  return g;
}

function cloneGrid(g, ROWS, COLS) {
  const t = Array.from({ length: ROWS }, () => Array(COLS).fill(null));
  for (let r = 0; r < ROWS; r++)
    for (let c = 0; c < COLS; c++)
      t[r][c] = g[r][c] ? { ...g[r][c] } : null;
  return t;
}

function removeAllMatches(g, ROWS, COLS) {
  while (true) {
    const res = detectRuns(g, ROWS, COLS);
    if (res.runs.length === 0) break;
    res.runs.forEach((run) => {
      for (const [r, c] of run.cells) {
        g[r][c] = { type: randomBasicFrom([PIECE.CAT, PIECE.OREO, PIECE.MARSHMALLOW, PIECE.STRAWBERRY, PIECE.PRETZEL]) };
      }
    });
  }
}

function randomBasicFrom(pool) {
  return pool[(Math.random() * pool.length) | 0];
}

function applyGravity(g, ROWS, COLS) {
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

function refill(g, ROWS, COLS, pool) {
  for (let r = 0; r < ROWS; r++)
    for (let c = 0; c < COLS; c++)
      if (g[r][c] == null) g[r][c] = { type: randomBasicFrom(pool), special: null };
}

function ensureAnyMove(g, ROWS, COLS, pool) {
  if (!hasAnyMove(g, ROWS, COLS)) {
    const s = shuffleToSolvable(g, ROWS, COLS, pool);
    for (let r = 0; r < ROWS; r++)
      for (let c = 0; c < COLS; c++)
        g[r][c] = s[r][c];
  }
}

function shuffleToSolvable(g, ROWS, COLS, pool) {
  const flat = [];
  for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) flat.push(g[r][c]?.type || randomBasicFrom(pool));

  let attempts = 0;
  while (attempts < 100) {
    for (let i = flat.length - 1; i > 0; i--) {
      const j = (Math.random() * (i + 1)) | 0;
      [flat[i], flat[j]] = [flat[j], flat[i]];
    }
    const t = Array.from({ length: ROWS }, () => Array(COLS).fill(null));
    let idx = 0;
    for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) t[r][c] = { type: flat[idx++], special: null };

    removeAllMatches(t, ROWS, COLS);
    if (hasAnyMove(t, ROWS, COLS)) return t;
    attempts++;
  }
  // fallback random fresh
  const f = Array.from({ length: ROWS }, () => Array(COLS).fill(null));
  for (let r = 0; r < ROWS; r++)
    for (let c = 0; c < COLS; c++)
      f[r][c] = { type: randomBasicFrom(pool), special: null };
  removeAllMatches(f, ROWS, COLS);
  return f;
}

// --- Matching & specials ---

function detectAllMatches(g, ROWS, COLS) {
  // 1) Find straight runs ≥3
  const { runs, byCell } = detectRuns(g, ROWS, COLS);

  // 2) Identify T/L intersections → wrapped
  const wrappedCenters = detectWrappedCenters(byCell);

  // 3) Decide promotions (one per run; T/L centers override to wrapped)
  const promotions = []; // {r,c,special}
  const clearedNormals = new Set(); // tiles cleared due to runs (excluding promoted ones)

  for (const run of runs) {
    const len = run.cells.length;
    const orient = run.orient; // 'H' / 'V'
    // pick a promotion cell: prefer an intersection cell (if any), else the middle
    let promoRC = run.cells[Math.floor(run.cells.length / 2)];
    // if any cell is wrapped center, use that
    for (const [r, c] of run.cells) {
      if (wrappedCenters.has(key(r, c))) { promoRC = [r, c]; break; }
    }

    // compute special to promote
    let special = null;
    if (wrappedCenters.has(key(promoRC[0], promoRC[1]))) {
      special = PIECE.WRAPPED;
    } else if (len >= 5) {
      // 5-in-a-row → Oreo Bomb; if run includes a 🍓, prefer Mega
      const hasStrawberry = run.cells.some(([r, c]) => g[r][c]?.type === PIECE.STRAWBERRY);
      special = hasStrawberry ? PIECE.MEGA_STRAWBERRY : PIECE.COLOR_BOMB;
    } else if (len === 4) {
      special = orient === "H" ? PIECE.STRIPED_H : PIECE.STRIPED_V;
    }

    if (special) {
      promotions.push({ r: promoRC[0], c: promoRC[1], special });
      // clear the rest of the run except promo cell
      for (const [r, c] of run.cells) {
        if (r === promoRC[0] && c === promoRC[1]) continue;
        clearedNormals.add(key(r, c));
      }
    } else {
      // plain 3-run: clear all
      for (const [r, c] of run.cells) clearedNormals.add(key(r, c));
    }
  }

  // 4) Apply promotions in grid
  for (const p of promotions) {
    const t = g[p.r][p.c];
    if (t) t.special = p.special;
  }

  // 5) Trigger special effects for all specials included in clears
  const clearedCells = new Set([...clearedNormals].map(parseKey));
  let specialsTriggered = 0;
  for (const k of [...clearedNormals]) {
    const [r, c] = parseKey(k);
    const tile = g[r][c];
    if (!tile) continue;
    if (tile.special) {
      specialsTriggered++;
      triggerSpecial(g, r, c, tile.special, ROWS, COLS, clearedCells);
    }
  }

  const clearedArr = [...clearedCells].map(parseKey);
  return {
    totalClears: clearedArr.length,
    clearedCells: clearedArr,
    specialsTriggered,
  };
}

function detectRuns(g, ROWS, COLS) {
  const runs = [];
  const byCell = new Map(); // key -> {hLen?, vLen?}

  // Horizontal runs
  for (let r = 0; r < ROWS; r++) {
    let c = 0;
    while (c < COLS) {
      const t = g[r][c];
      if (!t || t.special) { c++; continue; } // specials don't extend normal runs
      let len = 1;
      while (c + len < COLS && g[r][c + len] && !g[r][c + len].special && g[r][c + len].type === t.type) len++;
      if (len >= 3) {
        const cells = [];
        for (let k = 0; k < len; k++) {
          cells.push([r, c + k]);
          const K = key(r, c + k);
          const v = byCell.get(K) || {};
          v.hLen = len; byCell.set(K, v);
        }
        runs.push({ orient: "H", cells });
      }
      c += len;
    }
  }

  // Vertical runs
  for (let c = 0; c < COLS; c++) {
    let r = 0;
    while (r < ROWS) {
      const t = g[r][c];
      if (!t || t.special) { r++; continue; }
      let len = 1;
      while (r + len < ROWS && g[r + len][c] && !g[r + len][c].special && g[r + len][c].type === t.type) len++;
      if (len >= 3) {
        const cells = [];
        for (let k = 0; k < len; k++) {
          cells.push([r + k, c]);
          const K = key(r + k, c);
          const v = byCell.get(K) || {};
          v.vLen = len; byCell.set(K, v);
        }
        runs.push({ orient: "V", cells });
      }
      r += len;
    }
  }

  return { runs, byCell };
}

function detectWrappedCenters(byCell) {
  // T/L if a cell participates in both an H-run and a V-run (classic heuristic)
  const centers = new Set();
  for (const [K, v] of byCell.entries()) {
    if ((v.hLen && v.hLen >= 3) && (v.vLen && v.vLen >= 3)) {
      centers.add(K);
    }
  }
  return centers;
}

function triggerSpecial(g, r, c, special, ROWS, COLS, clearedSet) {
  const add = (rr, cc) => { if (inBounds(rr, cc, ROWS, COLS)) clearedSet.add(key(rr, cc)); };

  if (special === PIECE.STRIPED_H) {
    for (let cc = 0; cc < COLS; cc++) add(r, cc);
  } else if (special === PIECE.STRIPED_V) {
    for (let rr = 0; rr < ROWS; rr++) add(rr, c);
  } else if (special === PIECE.WRAPPED) {
    for (let pass = 0; pass < 2; pass++) {
      for (let dr = -1; dr <= 1; dr++)
        for (let dc = -1; dc <= 1; dc++)
          add(r + dr, c + dc);
    }
  } else if (special === PIECE.COLOR_BOMB) {
    // default "standalone" bomb use: remove most frequent color
    const freq = new Map();
    for (let rr = 0; rr < ROWS; rr++) {
      for (let cc = 0; cc < COLS; cc++) {
        const t = g[rr][cc];
        if (!t || t.special) continue;
        freq.set(t.type, (freq.get(t.type) || 0) + 1);
      }
    }
    let target = null, best = -1;
    for (const [type, count] of freq.entries()) {
      if (count > best) { best = count; target = type; }
    }
    if (target) {
      for (let rr = 0; rr < ROWS; rr++)
        for (let cc = 0; cc < COLS; cc++)
          if (g[rr][cc]?.type === target) add(rr, cc);
    }
  } else if (special === PIECE.MEGA_STRAWBERRY) {
    for (let rr = r - 1; rr <= r + 1; rr++)
      for (let cc = 0; cc < COLS; cc++) add(rr, cc);
    for (let cc = c - 1; cc <= c + 1; cc++)
      for (let rr = 0; rr < ROWS; rr++) add(rr, cc);
  }
}

// Manual clear used by combo handlers (includes triggering specials inside cleared area)
function performManualClear(g, clearedSet, ROWS, COLS) {
  // Expand clearedSet by triggering any specials in it
  // Note: run until stable in case triggering adds new specials to be triggered
  let changed = true;
  while (changed) {
    changed = false;
    const toTrigger = [];
    for (const K of [...clearedSet]) {
      const [r, c] = parseKey(K);
      const t = g[r][c];
      if (t && t.special) {
        toTrigger.push([r, c, t.special]);
      }
    }
    for (const [r, c, sp] of toTrigger) {
      const before = clearedSet.size;
      triggerSpecial(g, r, c, sp, ROWS, COLS, clearedSet);
      if (clearedSet.size > before) changed = true;
    }
  }
  // Apply clears
  for (const K of [...clearedSet]) {
    const [r, c] = parseKey(K);
    g[r][c] = null;
  }
  applyGravity(g, ROWS, COLS);
  // note: refill/cascades handled by caller
}

function hasAnyMove(g, ROWS, COLS) {
  return !!findFirstMove(g, ROWS, COLS);
}

function findFirstMove(g, ROWS, COLS) {
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      if (c + 1 < COLS) {
        const t = cloneGrid(g, ROWS, COLS);
        [t[r][c], t[r][c + 1]] = [t[r][c + 1], t[r][c]];
        if (detectRuns(t, ROWS, COLS).runs.length > 0) return [[r, c], [r, c + 1]];
      }
      if (r + 1 < ROWS) {
        const t = cloneGrid(g, ROWS, COLS);
        [t[r][c], t[r + 1][c]] = [t[r + 1][c], t[r][c]];
        if (detectRuns(t, ROWS, COLS).runs.length > 0) return [[r, c], [r + 1, c]];
      }
    }
  }
  return null;
}

function key(r, c) { return \`\${r}:\${c}\`; }
function parseKey(k) { return k.split(":").map((n) => parseInt(n, 10)); }

// Particles
function Poof({ x, y, size }) {
  const sparks = Array.from({ length: 10 });
  return (
    <>
      {sparks.map((_, i) => {
        const angle = (i / 10) * Math.PI * 2;
        const tx = size / 2 + Math.cos(angle) * (size * 0.9);
        const ty = size / 2 + Math.sin(angle) * (size * 0.9);
        const style = {
          left: x, top: y,
          ["--cx"]: size / 2 + "px",
          ["--cy"]: size / 2 + "px",
          ["--tx"]: tx + "px",
          ["--ty"]: ty + "px",
          position: "absolute",
        };
        return (
          <span key={i} className="spark" style={style}>
            ✨
          </span>
        );
      })}
    </>
  );
}

function useResizeCell(containerRef, setCell, ROWS, COLS) {
  useEffect(() => {
    const compute = () => {
      const el = containerRef.current; if (!el) return;
      const pad = 24; const w = el.clientWidth - pad * 2; const h = el.clientHeight - 180;
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
  }, [containerRef, setCell, ROWS, COLS]);
}
