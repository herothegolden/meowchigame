import React, { useEffect, useRef, useState } from "react";

/* -------------------------------------------------
   Candy-Cats – Match-3 (Telegram WebApp-friendly)
   ✔ Tap-then-tap OR swipe to swap
   ✔ Visible clear → (pause) → gravity fall → refill (animated)
   ✔ No horizontal scroll while playing
-------------------------------------------------- */

const COLS = 8;
const ROWS = 8;
const CELL_MIN = 36;
const CELL_MAX = 64;

const CAT_SET = ["😺", "😸", "😹", "😻", "😼", "🐱"];
const randEmoji = () => CAT_SET[(Math.random() * CAT_SET.length) | 0];

const getTG = () =>
  (typeof window !== "undefined" ? window.Telegram?.WebApp : undefined);

// ---------- Root App ----------
export default function App() {
  // inject UI CSS once
  useEffect(() => {
    const style = document.createElement("style");
    style.innerHTML = `
      :root { --line:#243069; }
      html, body, #root { height: 100%; }
      .page { background:#0a0f23; color:#fff; height:100%; display:flex; align-items:center; justify-content:center; padding:16px; font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial; }
      .card { width:min(420px, 100%); display:flex; flex-direction:column; gap:12px; }
      .panel { background:#0f1430; border:1px solid var(--line); border-radius:16px; padding:10px 14px; display:flex; align-items:center; justify-content:space-between; box-shadow:0 10px 28px rgba(0,0,0,.25); }
      .section { background:#0f1430; border:1px solid var(--line); border-radius:16px; padding:14px; box-shadow:0 10px 28px rgba(0,0,0,.15); }
      .title { font-weight:700; font-size:16px; }
      .muted { opacity:.7; }
      .row { display:flex; align-items:center; justify-content:space-between; gap:8px; }
      .grid { display:grid; gap:10px; }
      .btn { background:#12183a; border:1px solid #1c244e; border-radius:14px; padding:10px 12px; color:#fff; cursor:pointer; }
      .btn.primary { background:#132049; border-color:#1f2a5c; font-weight:600; }
      .btn.block { width:100%; }
      .list > * { background:#12183a; border:1px solid #1c244e; border-radius:14px; padding:10px 12px; display:flex; align-items:center; justify-content:space-between; }

      .board { position:relative; background:#0f1533; border-radius:18px; outline:1px solid var(--line); box-shadow:0 10px 34px rgba(0,0,0,.35); touch-action:none; margin: 0 auto; }
      .gridlines { position:absolute; inset:0; opacity:.2; pointer-events:none; }

      /* ANIMATIONS: animate left/top + transform so swaps & falls are visible */
      .tile {
        position:absolute; display:flex; align-items:center; justify-content:center;
        border-radius:12px; background:#151b46; outline:1px solid #26307a;
        transition:
          left .18s ease, top .18s ease,
          transform .18s ease, opacity .25s ease,
          background .15s ease, box-shadow .18s ease;
        will-change: left, top, transform, opacity;
      }
      .tile.sel { background:#1a2260; outline-color:#3a48a4; }
      .tile.hint { box-shadow: 0 0 0 2px #7aa2ff inset; }
      .tile.blip { transform: scale(1.12); box-shadow: 0 0 0 3px #ffd166 inset, 0 0 16px 4px rgba(255,209,102,.6); background:#1f2568; }

      .controls { display:grid; grid-template-columns: repeat(5, 1fr); gap:8px; }
      .combo { position:absolute; left:50%; transform:translateX(-50%); top:6px; background:rgba(255,255,255,.1); border:1px solid rgba(255,255,255,.1); border-radius:999px; padding:4px 8px; font-size:12px; }

      @keyframes poof { from { opacity:1; transform: translate(var(--cx), var(--cy)) scale(.9) rotate(0deg); } to { opacity:0; transform: translate(var(--tx), var(--ty)) scale(.4) rotate(90deg); } }
      .spark { position:absolute; font-size:18px; animation: poof .75s ease-out forwards; }
    `;
    document.head.appendChild(style);
    return () => document.head.removeChild(style);
  }, []);

  const [screen, setScreen] = useState("home");
  const [coins, setCoins] = useState(500);
  const [lastRun, setLastRun] = useState({ score: 0, coins: 0 });
  const [settings, setSettings] = useState({ haptics: true });

  function Header() {
    return (
      <div className="panel">
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 22 }}>🍬</span>
          <div style={{ fontWeight: 700 }}>Candy‑Cats</div>
          <span style={{ marginLeft: 8, opacity: 0.7, fontSize: 12 }}>
            {screen.toUpperCase()}
          </span>
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
          <div className="muted" style={{ fontSize: 12 }}>
            Swap by **swiping** or **tap‑then‑tap** adjacent tiles. Watch clears,
            falls, and refills animate.
          </div>
        </div>
        <div className="section" style={{ display: "grid", gap: 8 }}>
          <div className="title">Settings</div>
          <label style={{
            display: "flex", alignItems: "center", justifyContent: "space-between"
          }}>
            <span>Haptics</span>
            <input
              type="checkbox"
              checked={settings.haptics}
              onChange={(e) => setSettings(s => ({ ...s, haptics: e.target.checked }))}
            />
          </label>
        </div>
      </div>
    );
  }

  function GameOver() {
    return (
      <div className="section" style={{ display: "grid", gap: 10 }}>
        <div className="title">Level Over</div>
        <div className="row"><span className="muted">Score</span><b>{lastRun.score}</b></div>
        <div className="row"><span className="muted">CatCoins</span><b>{lastRun.coins}</b></div>
        <button className="btn primary" onClick={() => setScreen("game")}>Play again</button>
      </div>
    );
  }

  return (
    <div className="page">
      <div className="card">
        <Header />
        {screen === "home" && <Home />}
        {screen === "game" && (
          <GameView
            onExit={(run) => { setLastRun(run); setCoins(c => c + run.coins); setScreen("gameover"); }}
            onBack={() => setScreen("home")}
            haptics={settings.haptics}
          />
        )}
        {screen === "gameover" && <GameOver />}
      </div>
    </div>
  );
}

// ---------- Game View (with animated pipeline) ----------
function GameView({ onExit, onBack, haptics }) {
  const containerRef = useRef(null);
  const boardRef = useRef(null);
  const [cell, setCell] = useState(48);
  useResizeCell(containerRef, setCell);
  const tg = getTG();

  // Grid state
  const [grid, setGrid] = useState(() => initSolvableGrid());
  const gridRef = useRef(grid); gridRef.current = grid;

  // HUD
  const [score, setScore] = useState(0);
  const [moves, setMoves] = useState(20);
  const [combo, setCombo] = useState(0);

  // Selection / hint / FX
  const [sel, setSel] = useState(null);
  const [hint, setHint] = useState(null);
  const [blast, setBlast] = useState(new Set());
  const [fx, setFx] = useState([]);
  const [paused, setPaused] = useState(false);

  // Telegram buttons
  useEffect(() => {
    const w = getTG(); if (!w) return;
    try { w.ready(); w.expand(); w.BackButton.show(); w.MainButton.setText('Hint 🔍'); w.MainButton.show(); } catch {}
    const onBackBtn = () => setPaused(p => !p);
    const onMain = () => doHint();
    w?.onEvent?.('backButtonClicked', onBackBtn);
    w?.onEvent?.('mainButtonClicked', onMain);
    return () => {
      w?.offEvent?.('backButtonClicked', onBackBtn);
      w?.offEvent?.('mainButtonClicked', onMain);
      try { w.BackButton.hide(); w.MainButton.hide(); } catch {}
    };
  }, []);

  function haptic(ms = 12) {
    if (!haptics) return;
    try { getTG()?.HapticFeedback?.impactOccurred('light'); } catch {}
    try { navigator.vibrate?.(ms); } catch {}
  }

  // Input (tap + swipe + desktop)
  useEffect(() => {
    const el = boardRef.current; if (!el) return;
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
        setSel(null); start = null;
        e.target.setPointerCapture?.(e.pointerId);
        return;
      }
      start = p; setSel({ r: p.r, c: p.c });
      e.target.setPointerCapture?.(e.pointerId);
    };

    const onUp = (e) => {
      if (paused || !start) return;
      const end = rcFromEvent(e);
      let dr = end.r - start.r, dc = end.c - start.c;
      const dx = end.x - start.x, dy = end.y - start.y;
      if (Math.abs(dr) + Math.abs(dc) !== 1) {
        if (Math.abs(dx) < thresh && Math.abs(dy) < thresh) { setSel(null); start = null; return; }
        if (Math.abs(dx) > Math.abs(dy)) { dr = 0; dc = dx > 0 ? 1 : -1; }
        else { dc = 0; dr = dy > 0 ? 1 : -1; }
      }
      const r2 = start.r + dr, c2 = start.c + dc;
      if (!inBounds(r2, c2)) { setSel(null); start = null; return; }
      trySwap(start.r, start.c, r2, c2);
      setSel(null); start = null;
    };

    el.addEventListener("pointerdown", onDown);
    window.addEventListener("pointerup", onUp);
    return () => {
      el.removeEventListener("pointerdown", onDown);
      window.removeEventListener("pointerup", onUp);
    };
  }, [cell, paused, sel]);

  // Swapping with validation
  const movesRef = useRef(moves); movesRef.current = moves;
  const scoreRef = useRef(score); scoreRef.current = score;

  function trySwap(r1, c1, r2, c2) {
    if (Math.abs(r1 - r2) + Math.abs(c1 - c2) !== 1) return;
    const g = cloneGrid(gridRef.current);
    [g[r1][c1], g[r2][c2]] = [g[r2][c2], g[r1][c1]];
    const matches = findMatches(g);
    if (matches.length === 0) {
      haptic(8);
      // tiny feedback pulse on the two tiles
      flashBlast([[r1, c1], [r2, c2]], 180);
      return;
    }
    setGrid(g);
    setMoves((m) => Math.max(0, m - 1));
    resolveCascades(g, () => {
      if (movesRef.current === 0) {
        onExit({
          score: scoreRef.current,
          coins: Math.floor(scoreRef.current * 0.15),
        });
      }
    });
  }

  function flashBlast(cells, ms = 250) {
    const keys = new Set(cells.map(([r, c]) => `${r}:${c}`));
    setBlast(keys);
    setTimeout(() => setBlast(new Set()), ms);
  }

  // Cascades with visible phases
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
        ensureSolvable(g, setGrid);
        done && done();
        return;
      }

      // 1) Highlight & particles (keep tiles on screen briefly)
      flashBlast(matches, 260);
      const fxId = Date.now();
      setFx((prev) => [
        ...prev,
        ...matches.map(([r, c], i) => ({ id: fxId + i, x: c * cell, y: r * cell })),
      ]);
      setTimeout(() => setFx((prev) => prev.filter((p) => p.id < fxId)), 900);

      // 2) After short delay, actually clear → gravity → refill (these animate via CSS)
      setTimeout(() => {
        // score
        setScore((s) => s + 10 * matches.length * Math.max(1, comboCount + 1));

        matches.forEach(([r, c]) => { g[r][c] = null; });
        applyGravity(g);          // tiles fall (left/top transition)
        setGrid(cloneGrid(g));    // commit fall; show it before refill

        // small delay so fall is visible before refill appears
        setTimeout(() => {
          refill(g);
          setGrid(cloneGrid(g));  // commit refill (they pop into place)
          comboCount++;
          setTimeout(step, 160);   // move to next cascade step
        }, 180);
      }, 240);
    };

    step();
  }

  function doHint() {
    const m = findFirstMove(gridRef.current);
    if (!m) { setGrid(shuffleToSolvable(gridRef.current)); haptic(10); return; }
    flashBlast(m, 750);
    haptic(10);
  }

  function finishNow() {
    onExit({ score, coins: Math.floor(score * 0.15) });
  }

  const boardW = cell * COLS, boardH = cell * ROWS;

  return (
    <div className="section" ref={containerRef} style={{ display: "grid", gap: 10 }}>
      <div className="row" style={{ gap: 8 }}>
        <button className="btn" onClick={onBack}>Back</button>
        <div className="muted">
          {tg ? "Back button pauses"
              : "Swipe or tap‑then‑tap adjacent tiles to swap"}
        </div>
      </div>

      <div className="row">
        <div><span className="muted">Score</span> <b>{score}</b></div>
        <div><span className="muted">Moves</span> <b>{moves}</b></div>
        <div><span className="muted">Combo</span> <b>{combo > 0 ? `x${combo + 1}` : "-"}</b></div>
      </div>

      <div ref={boardRef} className="board" style={{ width: boardW, height: boardH }}>
        <div className="gridlines"
             style={{ backgroundImage:
               "linear-gradient(var(--line) 1px, transparent 1px), linear-gradient(90deg, var(--line) 1px, transparent 1px)",
               backgroundSize: `${cell}px ${cell}px` }} />

        {grid.map((row, r) => row.map((v, c) => (
          <div
            key={`t-${r}-${c}-${v}-${score}`}
            className={`tile ${sel && sel.r === r && sel.c === c ? "sel" : ""} ${blast.has(`${r}:${c}`) ? "blip" : ""} ${hint && ((hint[0][0] === r && hint[0][1] === c) || (hint[1][0] === r && hint[1][1] === c)) ? "hint" : ""}`}
            style={{
              left: c * cell,
              top: r * cell,
              width: cell,
              height: cell
            }}
          >
            <span style={{ fontSize: Math.floor(cell * 0.72) }}>{v ?? ""}</span>
          </div>
        )))}

        {fx.map((p) => <Poof key={p.id} id={p.id} x={p.x} y={p.y} size={cell} />)}
        {combo > 0 && <div className="combo">Combo x{combo + 1}!</div>}

        {paused && (
          <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,.35)",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        borderRadius: 18 }}>
            <div className="section" style={{ textAlign: "center" }}>
              <div className="title" style={{ marginBottom: 8 }}>Paused</div>
              <div className="muted" style={{ marginBottom: 12 }}>Tap Resume</div>
              <div className="row" style={{ gap: 8 }}>
                <button className="btn primary" onClick={() => setPaused(false)}>Resume</button>
                <button className="btn" onClick={finishNow}>End Level</button>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="controls">
        <button className="btn" onClick={() => setPaused(p => !p)}>
          {paused ? "Resume" : "Pause"}
        </button>
        <button className="btn" onClick={() => {
          setGrid(initSolvableGrid()); setScore(0); setMoves(20);
          setCombo(0); setSel(null); setHint(null);
        }}>Reset</button>
        <button className="btn" onClick={doHint}>Hint 🔍</button>
        <button className="btn primary" onClick={() => { setGrid(shuffleToSolvable(gridRef.current)); haptic(12); }}>
          Shuffle 🔀
        </button>
        <div style={{ gridColumn: "span 1", opacity: .7, display: "flex",
                      alignItems: "center", justifyContent: "center", fontSize: 12 }}>
          {ROWS}×{COLS}
        </div>
      </div>
    </div>
  );
}

// ---------- Core helpers ----------
const makeGrid = (rows, cols) => Array.from({ length: rows }, () => Array(cols).fill(null));
const cloneGrid = (g) => g.map((r) => r.slice());
const inBounds = (r, c) => r >= 0 && r < ROWS && c >= 0 && c < COLS;

function findMatches(g) {
  const hits = new Set();
  // Horizontal
  for (let r = 0; r < ROWS; r++) {
    let c = 0;
    while (c < COLS) {
      const v = g[r][c]; if (!v) { c++; continue; }
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
      const v = g[r][c]; if (!v) { r++; continue; }
      let len = 1;
      while (r + len < ROWS && g[r + len][c] === v) len++;
      if (len >= 3) for (let k = 0; k < len; k++) hits.add(`${r + k}:${c}`);
      r += len;
    }
  }
  return Array.from(hits).map(k => k.split(":").map(n => parseInt(n, 10)));
}

function applyGravity(g) {
  for (let c = 0; c < COLS; c++) {
    let write = ROWS - 1;
    for (let r = ROWS - 1; r >= 0; r--) {
      if (g[r][c] != null) {
        const v = g[r][c]; g[r][c] = null; g[write][c] = v; write--;
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

function findFirstMove(g) {
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      if (c + 1 < COLS) { const t = cloneGrid(g); [t[r][c], t[r][c + 1]] = [t[r][c + 1], t[r][c]]; if (findMatches(t).length > 0) return [[r, c], [r, c + 1]]; }
      if (r + 1 < ROWS) { const t = cloneGrid(g); [t[r][c], t[r + 1][c]] = [t[r + 1][c], t[r][c]]; if (findMatches(t).length > 0) return [[r, c], [r + 1, c]]; }
    }
  }
  return null;
}

function hasAnyMove(g) { return !!findFirstMove(g); }

function initSolvableGrid() {
  let g; let tries = 0;
  do {
    g = makeGrid(ROWS, COLS);
    for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) g[r][c] = randEmoji();
    removeAllMatches(g); tries++;
    if (tries > 50) break;
  } while (!hasAnyMove(g));
  return g;
}

function removeAllMatches(g) {
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

function ensureSolvable(g, setG) {
  if (!hasAnyMove(g)) setG(shuffleToSolvable(g));
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
        return <span key={i} className="spark" style={style}>✨</span>;
      })}
    </>
  );
}

function useResizeCell(containerRef, setCell) {
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
    return () => { ro?.disconnect(); window.removeEventListener("resize", compute); };
  }, [containerRef, setCell]);
}
