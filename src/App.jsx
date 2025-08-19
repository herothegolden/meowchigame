import React, { useEffect, useRef, useState } from "react";

// ---------- Shared config ----------
const COLS = 8;
const ROWS = 8;
const CELL_MIN = 36;
const CELL_MAX = 88; // bigger tiles

const CANDY_SET = ["😺", "🥨", "🍓", "🍪", "🍡"];
const randEmoji = () => CANDY_SET[Math.floor(Math.random() * CANDY_SET.length)];

const getTG = () =>
  (typeof window !== "undefined" ? window.Telegram?.WebApp : undefined);

// ---------- Root App ----------
export default function App() {
  // Stable vh (Telegram provides viewportStableHeight)
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

  // Telegram init + swipe suppression
  useEffect(() => {
    const tg = getTG();
    try { tg?.ready(); tg?.expand(); tg?.disableVerticalSwipes?.(); } catch (e) {}
  }, []);

  const [showSplash, setShowSplash] = useState(true);
  useEffect(() => { const t = setTimeout(() => setShowSplash(false), 1200); return () => clearTimeout(t); }, []);

  // Navigation / state
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

  const navigateTo = (s) => { setScreenHistory(p => [...p, s]); setScreen(s); };
  const goBack = () => {
    if (screenHistory.length > 1) {
      const h = [...screenHistory]; h.pop(); setScreenHistory(h); setScreen(h[h.length - 1]);
    } else { setScreen("home"); setScreenHistory(["home"]); }
  };
  const goHome = () => { setScreen("home"); setScreenHistory(["home"]); };

  function Header() {
    const isHome = screen === "home";
    return (
      <div className="header">
        {!isHome && (
          <div className="header-line1">
            <button className="btn" onClick={goBack}>← Back</button>
            <button className="btn" onClick={goHome}>🏠 Home</button>
          </div>
        )}
        <div className="header-line2">
          <div className="brand-compact">
            <span className="logo">🐱</span>
            <div className="name">Meowchi</div>
            <span className="pill-compact">{screen.toUpperCase()}</span>
          </div>
          <div className="score-info">
            {screen === "game" && <div className="score-item">Score: {window.currentGameScore || 0}</div>}
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
          <div className="title">Match-3 Meowchi Game with cute cats!</div>
          <button className="btn primary block" onClick={() => navigateTo("game")}>🍭 Play Meowchi Game</button>
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
            Match cats 😺, pretzels 🥨, strawberries 🍓, oreos 🍪, or marshmallows 🍡. Create cascades for <b>bonus points</b>.
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
                <button className="btn" onClick={() => setCoins((c) => Math.max(0, c - it.price))} disabled={coins < it.price}>Buy</button>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  function Leaderboard() {
    const scopes = [["daily", "Daily"], ["weekly", "Weekly"], ["all", "All-time"]];
    const rows = leaders[lbScope] || [];
    return (
      <div className="section" style={{ display: "grid", gap: 10 }}>
        <div className="row">
          <div className="title">🏆 Sweet Leaderboard</div>
          <div className="tabs">
            {scopes.map(([k, label]) => (
              <button key={k} className={`tab ${lbScope === k ? "active" : ""}`} onClick={() => setLbScope(k)}>{label}</button>
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
      setDaily((d) => ({ streak: d.lastClaim === yesterday ? d.streak + 1 : 1, lastClaim: today }));
      setCoins((c) => c + 50);
    }
    return (
      <div className="section" style={{ display: "grid", gap: 10 }}>
        <div className="title">🍯 Daily Sweet Treats</div>
        <div className="muted">Streak: <b>{daily.streak}</b> {daily.lastClaim ? ` • last: ${daily.lastClaim}` : ""}</div>
        <button className="btn primary" onClick={claim} disabled={!canClaim}>
          {canClaim ? "Claim 50 $Meow" : "Come back tomorrow"}
        </button>
        <div className="muted" style={{ fontSize: 12 }}>Keep your sweet streak alive! Resets if you miss a day.</div>
      </div>
    );
  }

  function Invite() {
    const link = "https://t.me/meowchi_game_bot?start=sweet";
    const [copied, setCopied] = useState(false);
    async function copy() { try { await navigator.clipboard.writeText(link); setCopied(true); setTimeout(() => setCopied(false), 1200); } catch {} }
    return (
      <div className="section" style={{ display: "grid", gap: 10 }}>
        <div className="title">🍭 Share the Sweetness</div>
        <div className="muted" style={{ fontSize: 12 }}>
          Invite friends to join the meowchi crushing fun! When your friend completes their first level, you both get 200 $Meow.
        </div>
        <div className="row" style={{ gap: 8 }}>
          <div className="pill" style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: "70%" }}>{link}</div>
          <button className="btn" onClick={copy}>{copied ? "Copied!" : "Copy"}</button>
        </div>
      </div>
    );
  }

  function Settings() {
    return (
      <div className="section" style={{ display: "grid", gap: 10 }}>
        <div className="title">Settings</div>
        <label className="row">
          <div>Haptics</div>
          <input type="checkbox" checked={settings.haptics} onChange={(e) => setSettings((s) => ({ ...s, haptics: e.target.checked }))}/>
        </label>
        <label className="row">
          <div>Sounds (preview only)</div>
          <input type="checkbox" checked={settings.sounds} onChange={(e) => setSettings((s) => ({ ...s, sounds: e.target.checked }))}/>
        </label>
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
          {screen === "game" && <GameView
              onExit={(run) => { setLastRun(run); setCoins((c) => c + run.coins); setScreen("gameover"); setScreenHistory((h) => [...h, "gameover"]); }}
              onCoins={(d) => setCoins((c) => c + d)}
              settings={settings}
            />}
          {screen === "gameover" && (
            <div className="section" style={{ display: "grid", gap: 10 }}>
              <div className="title">🍬 Sweet Level Complete!</div>
              <div className="row"><div className="muted">Score</div><b>{lastRun.score}</b></div>
              <div className="row"><div className="muted">$Meow earned</div><b>{lastRun.coins}</b></div>
              <button className="btn primary" onClick={() => setScreen("game")}>🍭 Play More Meowchi</button>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

// ---------- Game View (Match-3) ----------
function GameView({ onExit, onCoins, settings }) {
  const containerRef = useRef(null);
  const boardRef = useRef(null);
  const [cell, setCell] = useState(48);
  useResizeCell(containerRef, setCell);

  // Board state
  const [grid, setGrid] = useState(() => initSolvableGrid());
  const gridRef = useRef(grid); gridRef.current = grid;

  // Selection + hint + animation state
  const [sel, setSel] = useState(null);
  const [hint, setHint] = useState(null);
  const [swapping, setSwapping] = useState(null);

  // Score / moves / combo FX
  const [score, setScore] = useState(0);
  const [moves, setMoves] = useState(20);
  const [combo, setCombo] = useState(0);
  const [fx, setFx] = useState([]);
  const [blast, setBlast] = useState(new Set());
  const [paused, setPaused] = useState(false);

  const [newTiles, setNewTiles] = useState(new Set());

  useEffect(() => { window.currentGameScore = score; }, [score]);

  function haptic(ms = 12) { if (!settings?.haptics) return; try { navigator.vibrate?.(ms); } catch {} }

  // Unified Pointer Events
  useEffect(() => {
    const el = boardRef.current; if (!el || paused) return;
    let drag = null; const threshold = 18;

    const rc = (e) => {
      const rect = el.getBoundingClientRect();
      const x = Math.max(0, Math.min(rect.width - 1, e.clientX - rect.left));
      const y = Math.max(0, Math.min(rect.height - 1, e.clientY - rect.top));
      return { r: Math.floor(y / cell), c: Math.floor(x / cell), x, y };
    };

    const down = (e) => {
      el.setPointerCapture?.(e.pointerId);
      const p = rc(e); if (!inBounds(p.r, p.c)) return;
      drag = { r: p.r, c: p.c, x: p.x, y: p.y, dragging: false };
      setSel({ r: p.r, c: p.c }); haptic(5);
    };
    const move = (e) => {
      if (!drag) return;
      const p = rc(e); const dx = p.x - drag.x, dy = p.y - drag.y;
      if (!drag.dragging && Math.hypot(dx, dy) > threshold) {
        drag.dragging = true; haptic(8);
        const horiz = Math.abs(dx) > Math.abs(dy);
        const tr = drag.r + (horiz ? 0 : (dy > 0 ? 1 : -1));
        const tc = drag.c + (horiz ? (dx > 0 ? 1 : -1) : 0);
        if (inBounds(tr, tc)) setSel({ r: tr, c: tc });
      }
    };
    const up = (e) => {
      if (!drag) return;
      const p = rc(e); const dx = p.x - drag.x, dy = p.y - drag.y;
      if (drag.dragging) {
        const horiz = Math.abs(dx) > Math.abs(dy);
        const tr = drag.r + (horiz ? 0 : (dy > 0 ? 1 : -1));
        const tc = drag.c + (horiz ? (dx > 0 ? 1 : -1) : 0);
        if (inBounds(tr, tc)) { trySwap(drag.r, drag.c, tr, tc); haptic(12); }
        setSel(null);
      } else { setSel({ r: drag.r, c: drag.c }); }
      drag = null;
    };

    el.addEventListener("pointerdown", down, { passive: true });
    el.addEventListener("pointermove",  move, { passive: true });
    el.addEventListener("pointerup",    up,   { passive: true });
    el.addEventListener("pointercancel",up,   { passive: true });
    return () => {
      el.removeEventListener("pointerdown", down);
      el.removeEventListener("pointermove",  move);
      el.removeEventListener("pointerup",    up);
      el.removeEventListener("pointercancel",up);
    };
  }, [cell, paused, settings?.haptics]);

  function trySwap(r1, c1, r2, c2) {
    if (Math.abs(r1 - r2) + Math.abs(c1 - c2) !== 1) return;
    const g = cloneGrid(gridRef.current);
    [g[r1][c1], g[r2][c2]] = [g[r2][c2], g[r1][c1]];
    const matches = findMatches(g);
    if (matches.length === 0) { haptic(8); setSel({ r: r1, c: c1 }); setTimeout(() => setSel(null), 120); return; }
    setSwapping({ from: { r: r1, c: c1 }, to: { r: r2, c: c2 } });
    setTimeout(() => {
      setGrid(g); setSwapping(null); setMoves((m) => Math.max(0, m - 1));
      resolveCascades(g, () => { if (movesRef.current === 0) finish(); });
    }, 300);
  }

  const movesRef = useRef(moves); movesRef.current = moves;

  function resolveCascades(start, done) {
    let g = cloneGrid(start); let comboCount = 0;
    const step = () => {
      const matches = findMatches(g);
      if (matches.length === 0) {
        setGrid(g); setNewTiles(new Set());
        if (comboCount > 0) { setCombo(comboCount); haptic(15); setTimeout(() => setCombo(0), 1500); }
        ensureSolvable(); done && done(); return;
      }
      const keys = matches.map(([r, c]) => `${r}:${c}`); setBlast(new Set(keys));
      const fxId = Date.now() + Math.random();
      setFx((prev) => [...prev, ...matches.map((m, i) => ({ id: fxId + i + Math.random(), x: m[1] * cell, y: m[0] * cell }))]);
      setScore((s) => s + 10 * matches.length * Math.max(1, comboCount + 1));
      onCoins(Math.ceil(matches.length / 4));
      matches.forEach(([r, c]) => { g[r][c] = null; }); setGrid(cloneGrid(g));
      setTimeout(() => setBlast(new Set()), 800);
      setTimeout(() => {
        const empty = new Set();
        for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) if (g[r][c] === null) empty.add(`${r}-${c}`);
        applyGravity(g); refill(g); setNewTiles(empty); setGrid(cloneGrid(g));
        setTimeout(() => { setNewTiles(new Set()); comboCount++; setTimeout(step, 300); }, 800);
      }, 600);
      setTimeout(() => setFx((prev) => prev.filter((p) => p.id < fxId || p.id > fxId + 100)), 1500);
    };
    step();
  }

  function doHint() { const m = findFirstMove(gridRef.current); if (!m) { shuffleBoard(); return; } setHint(m); setTimeout(() => setHint(null), 1500); haptic(10); }
  function shuffleBoard() { const g = shuffleToSolvable(gridRef.current); setGrid(g); haptic(12); }
  function ensureSolvable() { if (!hasAnyMove(gridRef.current)) setGrid(shuffleToSolvable(gridRef.current)); }
  function finish() { onExit({ score, coins: Math.floor(score * 0.15) }); }

  const boardW = cell * COLS, boardH = cell * ROWS;

  return (
    <div className="section board-wrap" ref={containerRef}>
      <div className="row">
        <div><span className="muted">Score</span> <b>{score}</b></div>
        <div><span className="muted">Moves</span> <b>{moves}</b></div>
        <div><span className="muted">Combo</span> <b>{combo > 0 ? `x${combo + 1}` : "-"}</b></div>
      </div>

      <div ref={boardRef} className="board" style={{ width: boardW, height: boardH }}>
        <div className="gridlines"
             style={{ backgroundImage: "linear-gradient(var(--line) 1px, transparent 1px), linear-gradient(90deg, var(--line) 1px, transparent 1px)", backgroundSize: `${cell}px ${cell}px` }} />
        {grid.map((row, r) =>
          row.map((v, c) => {
            const isSelected = sel && sel.r === r && sel.c === c;
            const isHinted = hint && ((hint[0][0] === r && hint[0][1] === c) || (hint[1][0] === r && hint[1][1] === c));
            const isBlasting = blast.has(`${r}:${c}`);
            let swapTransform = "";
            if (swapping) {
              if (swapping.from.r === r && swapping.from.c === c) {
                const dx = (swapping.to.c - swapping.from.c) * cell;
                const dy = (swapping.to.r - swapping.from.r) * cell;
                swapTransform = `translate(${dx}px, ${dy}px)`;
              } else if (swapping.to.r === r && swapping.to.c === c) {
                const dx = (swapping.from.c - swapping.to.c) * cell;
                const dy = (swapping.from.r - swapping.to.r) * cell;
                swapTransform = `translate(${dx}px, ${dy}px)`;
              }
            }
            const isSwapping = swapping && ((swapping.from.r === r && swapping.from.c === c) || (swapping.to.r === r && swapping.to.c === c));
            const tileKey = `${r}-${c}`;
            const isNewTile = newTiles.has(tileKey);
            return (
              <div key={`tile-${r}-${c}`}
                   className={`tile ${isSelected ? "sel" : ""} ${isHinted ? "hint" : ""} ${isSwapping ? "swapping" : ""} ${isNewTile ? "drop-in" : ""}`}
                   style={{
                     left: c * cell, top: r * cell, width: cell, height: cell,
                     transform: swapTransform || (isBlasting ? "scale(1.3) rotate(10deg)" : undefined),
                     boxShadow: isBlasting ? "0 0 0 4px #ffd166 inset, 0 0 20px 6px rgba(255,209,102,.8), 0 0 40px 10px rgba(255,255,255,.3)" : undefined,
                     background: isBlasting ? "linear-gradient(135deg, #ffd166 0%, #ff9500 100%)" : undefined,
                     zIndex: isBlasting ? 10 : (isSwapping ? 20 : 1),
                   }}>
                <span style={{ fontSize: Math.floor(cell * 0.7), transform: isBlasting ? "scale(1.2)" : undefined, filter: isBlasting ? "drop-shadow(0 2px 4px rgba(0,0,0,.5))" : undefined }}>
                  {v}
                </span>
              </div>
            );
          })
        )}
        {fx.map((p, i) => <Poof key={p.id ?? i} x={p.x} y={p.y} size={cell} />)}
        {combo > 0 && <div className="combo">🍭 Sweet Combo x{combo + 1}! 🍭</div>}
        {paused && (
          <div className="pause-overlay">
            <div className="section" style={{ textAlign: "center" }}>
              <div className="title" style={{ marginBottom: 8 }}>🍬 Game Paused</div>
              <div className="muted" style={{ marginBottom: 12 }}>Take a sweet break!</div>
              <div className="row" style={{ gap: 8 }}>
                <button className="btn primary" onClick={() => setPaused(false)}>Resume</button>
                <button className="btn" onClick={() => onExit({ score, coins: Math.floor(score * 0.15) })}>End Sweet Level</button>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="controls">
        <button className="btn" onClick={() => setPaused((p) => !p)}>{paused ? "Resume" : "Pause"}</button>
        <button className="btn" onClick={() => { setGrid(initSolvableGrid()); setScore(0); setMoves(20); setCombo(0); setSel(null); setHint(null); setSwapping(null); }}>Reset</button>
        <button className="btn" onClick={doHint}>💡 Sweet Hint</button>
        <button className="btn primary" onClick={shuffleBoard}>🔄 Sugar Shuffle</button>
        <div className="controls-size">8×8</div>
      </div>
    </div>
  );
}

// ---------- Helpers ----------
const makeGrid = (rows, cols) => Array.from({ length: rows }, () => Array(cols).fill(null));
const cloneGrid = (g) => g.map((r) => r.slice());
const inBounds = (r, c) => r >= 0 && r < ROWS && c >= 0 && c < COLS;

function findMatches(g) {
  const hits = new Set();
  for (let r = 0; r < ROWS; r++) {
    let c = 0;
    while (c < COLS) {
      const v = g[r][c]; if (!v) { c++; continue; }
      let len = 1; while (c + len < COLS && g[r][c + len] === v) len++;
      if (len >= 3) for (let k = 0; k < len; k++) hits.add(`${r}:${c + k}`);
      c += len;
    }
  }
  for (let c = 0; c < COLS; c++) {
    let r = 0;
    while (r < ROWS) {
      const v = g[r][c]; if (!v) { r++; continue; }
      let len = 1; while (r + len < ROWS && g[r + len][c] === v) len++;
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
      if (g[r][c] != null) { const v = g[r][c]; g[r][c] = null; g[write][c] = v; write--; }
    }
    while (write >= 0) { g[write][c] = null; write--; }
  }
}

function refill(g) { for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) if (g[r][c] == null) g[r][c] = randEmoji(); }
function hasAnyMove(g) { return !!findFirstMove(g); }

function findFirstMove(g) {
  for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) {
    if (c + 1 < COLS) { const t = cloneGrid(g); [t[r][c], t[r][c + 1]] = [t[r][c + 1], t[r][c]]; if (findMatches(t).length > 0) return [[r, c], [r, c + 1]]; }
    if (r + 1 < ROWS) { const t = cloneGrid(g); [t[r][c], t[r + 1][c]] = [t[r + 1][c], t[r][c]]; if (findMatches(t).length > 0) return [[r, c], [r + 1, c]]; }
  }
  return null;
}

function initSolvableGrid() {
  let g; let tries = 0;
  do {
    g = makeGrid(ROWS, COLS);
    for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) g[r][c] = randEmoji();
    removeAllMatches(g); tries++; if (tries > 50) break;
  } while (!hasAnyMove(g));
  return g;
}

function removeAllMatches(g) {
  while (true) {
    const m = findMatches(g); if (m.length === 0) break;
    m.forEach(([r, c]) => { g[r][c] = randEmoji(); });
  }
}

function shuffleToSolvable(g) {
  const flat = []; for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) flat.push(g[r][c]);
  let attempts = 0;
  while (attempts < 100) {
    for (let i = flat.length - 1; i > 0; i--) { const j = (Math.random() * (i + 1)) | 0; [flat[i], flat[j]] = [flat[j], flat[i]]; }
    const t = makeGrid(ROWS, COLS); let idx = 0;
    for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) t[r][c] = flat[idx++];
    removeAllMatches(t); if (hasAnyMove(t)) return t; attempts++;
  }
  return initSolvableGrid();
}

function Poof({ x, y, size }) {
  const sparks = Array.from({ length: 20 });
  return (
    <>
      {sparks.map((_, i) => {
        const angle = (i / 20) * Math.PI * 2;
        const distance = size * (0.8 + Math.random() * 0.6);
        const tx = size / 2 + Math.cos(angle) * distance;
        const ty = size / 2 + Math.sin(angle) * distance;
        const randomDelay = Math.random() * 0.2;
        const randomDuration = 1.2 + Math.random() * 0.6;
        const sparkTypes = ['✨', '💫', '⭐', '🌟', '💥', '🎉', '🍬', '💎'];
        const randomSpark = sparkTypes[Math.floor(Math.random() * sparkTypes.length)];
        const style = {
          left: x, top: y, ["--cx"]: size / 2 + "px", ["--cy"]: size / 2 + "px",
          ["--tx"]: tx + "px", ["--ty"]: ty + "px", position: "absolute",
          animationDelay: `${randomDelay}s`, animationDuration: `${randomDuration}s`,
          fontSize: Math.floor(size * (0.3 + Math.random() * 0.4)) + "px",
        };
        return <span key={i} className="spark" style={style}>{randomSpark}</span>;
      })}
    </>
  );
}

function useResizeCell(containerRef, setCell) {
  useEffect(() => {
    const compute = () => {
      const el = containerRef.current; if (!el) return;
      const pad = 16; const w = el.clientWidth - pad * 2;
      const h = el.clientHeight - 84; // more room to board
      const size = Math.floor(Math.min(w / COLS, h / ROWS));
      setCell(Math.max(CELL_MIN, Math.min(size, CELL_MAX)));
    };
    compute();
    let ro;
    if (typeof ResizeObserver !== "undefined" && containerRef.current) { ro = new ResizeObserver(compute); ro.observe(containerRef.current); }
    window.addEventListener("resize", compute);
    return () => { ro?.disconnect(); window.removeEventListener("resize", compute); };
  }, [containerRef, setCell]);
}
