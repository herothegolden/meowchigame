import React, { useEffect, useRef, useState } from "react";

/* -------------------------------------------------
   Meowchi (Candy-Cats) – Match-3 (Telegram WebApp)
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

const CAT_SET = ["😺", "😸", "😹", "😻", "😼", "🐱"];
const randEmoji = () => CAT_SET[Math.floor(Math.random() * CAT_SET.length)];

const getTG = () =>
  (typeof window !== "undefined" ? window.Telegram?.WebApp : undefined);

const SPLASH_URL = "/splash.jpg"; // place image in /public/splash.jpg

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
      .btn.primary { background:#132049; border-color:#1f2a5c; font-weight:700; }
      .btn.block { width:100%; }

      .list > * {
        background:#12183a; border:1px solid #1c244e; border-radius:14px;
        padding:10px 12px; display:flex; align-items:center; justify-content:space-between; gap:8px;
      }
      .tabs { display:flex; gap:8px; flex-wrap:wrap; }
      .tab { padding:8px 10px; border-radius:999px; border:1px solid var(--line); background:#12183a; cursor:pointer; font-size:12px; }
      .tab.active { background:#132049; border-color:#1f2a5c; font-weight:700; }

      /* Board */
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

      /* Splash (clean wallpaper, no dim/box) */
      .splash {
        position: fixed; inset: 0; z-index: 9999;
        display: grid; place-items: center; overflow: hidden;
        background: url('/splash.jpg') center/cover no-repeat;
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
    const t = setTimeout(() => setMinElapsed(true), 3000);
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
          <div className="name">Candy‑Cats</div>
          <span className="pill">{screen.toUpperCase()}</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div>
            <span className="muted" style={{ marginRight: 6 }}>
              CatCoins
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
          <div className="title">Match‑3 with cats</div>
          <button className="btn primary block" onClick={() => setScreen("game")}>
            ▶️ Play
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
            Tap a tile, then swipe to a neighbor (or tap a neighbor) to swap. Make
            a line of 3+ identical cats to clear. Cascades give bonus points. You
            have limited moves—use <b>Hint</b> or <b>Shuffle</b> if stuck.
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
        <div className="title">Daily Reward</div>
        <div className="muted">
          Streak: <b>{daily.streak}</b>
          {daily.lastClaim ? ` • last: ${daily.lastClaim}` : ""}
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
        <div className="row">
          <div className="muted">Score</div><b>{lastRun.score}</b>
        </div>
        <div className="row">
          <div className="muted">CatCoins earned</div><b>{lastRun.coins}</b>
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

  // Selection + hint
  const [sel, setSel] = useState(null); // {r,c}
  const [hint, setHint] = useState(null); // [[r1,c1],[r2,c2]]

  // Score / moves / combo FX
  const [score, setScore] = useState(0);
  const [moves, setMoves] = useState(20);
  const [combo, setCombo] = useState(0);
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
    } catch {}
    const onBackBtn = () => setPaused((p) => !p);
    tg?.onEvent?.("backButtonClicked", onBackBtn);
    return () => {
      tg?.offEvent?.("backButtonClicked", onBackBtn);
      try { tg.BackButton.hide(); } catch {}
    };
  }, []);

  // MainButton = Hint
  useEffect(() => {
    const tg = getTG();
    if (!tg) return;
    try {
      tg.MainButton.setText("Hint 🔍");
      tg.MainButton.show();
    } catch {}
    const handler = () => doHint();
    tg?.onEvent?.("mainButtonClicked", handler);
    return () => {
      tg?.offEvent?.("mainButtonClicked", handler);
      try { tg.MainButton.hide(); } catch {}
    };
  }, []);

  function haptic(ms = 12) {
    try { getTG()?.HapticFeedback?.impactOccurred("light"); } catch {}
    try { navigator.vibrate?.(ms); } catch {}
  }

  // Input handlers (tap + swipe + mouse click-to-swap)
  useEffect(() => {
    const el = boardRef.current;
    if (!el) return;
    let start = null; // {r,c,x,y}
    const thresh = 6; // px minimum to consider swipe
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
      // Desktop convenience: if already selected and adjacent, swap immediately
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
      // If ended on adjacent cell, use that. Else infer from swipe direction.
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
      if (!inBounds(r2, c2)) { setSel(null); start = null; return; }
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
    setGrid(g);
    setMoves((m) => Math.max(0, m - 1));
    resolveCascades(g, () => {
      if (movesRef.current === 0) finish();
    });
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
        if (comboCount > 0) {
          setCombo(comboCount);
          haptic(15);
          setTimeout(() => setCombo(0), 900);
        }
        ensureSolvable();
        done && done();
        return;
      }
      // FX + scoring
      const fxId = Date.now();
      setFx((prev) => [
        ...prev,
        ...matches.map((m, i) => ({ id: fxId + i, x: m[1] * cell, y: m[0] * cell })),
      ]);
      setTimeout(() => setFx((prev) => prev.filter((p) => p.id < fxId)), 900);
      const keys = matches.map(([r, c]) => `${r}:${c}`);
      setBlast(new Set(keys));
      setTimeout(() => setBlast(new Set()), 500);
      setScore((s) => s + 10 * matches.length * Math.max(1, comboCount + 1));
      onCoins(Math.ceil(matches.length / 4));
      // clear → gravity → refill
      matches.forEach(([r, c]) => { g[r][c] = null; });
      applyGravity(g);
      refill(g);
      comboCount++;
      setTimeout(step, 90);
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
          row.map((v, c) => (
            <div
              key={`t-${r}-${c}-${v}-${score}`}
              className={`tile ${
                sel && sel.r === r && sel.c === c ? "sel" : ""
              } ${
                hint &&
                ((hint[0][0] === r && hint[0][1] === c) ||
                  (hint[1][0] === r && hint[1][1] === c))
                  ? "hint"
                  : ""
              }`}
              style={{
                left: c * cell,
                top: r * cell,
                width: cell,
                height: cell,
                transform: blast.has(`${r}:${c}`) ? "scale(1.18)" : undefined,
                boxShadow: blast.has(`${r}:${c}`)
                  ? "0 0 0 3px #ffd166 inset, 0 0 16px 4px rgba(255,209,102,.6)"
                  : undefined,
                background: blast.has(`${r}:${c}`) ? "#1f2568" : undefined,
              }}
            >
              <span style={{ fontSize: Math.floor(cell * 0.72) }}>{v}</span>
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
              <div className="title" style={{ marginBottom: 8 }}>
                Paused
              </div>
              <div className="muted" style={{ marginBottom: 12 }}>
                Tap Resume
              </div>
              <div className="row" style={{ gap: 8 }}>
                <button className="btn primary" onClick={() => setPaused(false)}>
                  Resume
                </button>
                <button className="btn" onClick={() => finish()}>
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
            setGrid(initSolvableGrid());
            setScore(0);
            setMoves(20);
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
          8×8
        </div>
      </div>
    </div>
  );
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

function useResizeCell(containerRef, setCell) {
  useEffect(() => {
    const compute = () => {
      const el = containerRef.current;
      if (!el) return;
      // Reserve space for HUD + controls (~180px), then fill the rest.
      const pad = 24;
      const w = el.clientWidth - pad * 2;
      const h = el.clientHeight - 180;
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
