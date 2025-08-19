import React, { useEffect, useRef, useState } from "react";

/* Canvas match‑3 with specials (Level 1)
   - Grid 6x6, moves 20, target 1000
   - Specials:
      • 4 in row/col -> Striped (row/col)
      • 5 in row     -> Color Bomb (Oreo)
      • T/L shape    -> Wrapped Marshmallow
      • 5+ including 🍓 -> Mega Strawberry
*/

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
  MEGA_STRAWBERRY: "MEGA_STRAWBERRY"
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
  MEGA_STRAWBERRY: "🍓⭐"
};

const LEVEL = {
  size: [6, 6],
  moves: 20,
  objective: { type: "score", target: 1000 },
  pool: [PIECE.CAT, PIECE.OREO, PIECE.MARSHMALLOW, PIECE.STRAWBERRY, PIECE.PRETZEL],
  layout: [
    ["CAT","OREO","MARSHMALLOW","STRAWBERRY","PRETZEL","CAT"],
    ["OREO","PRETZEL","CAT","OREO","MARSHMALLOW","STRAWBERRY"],
    ["MARSHMALLOW","STRAWBERRY","PRETZEL","CAT","OREO","MARSHMALLOW"],
    ["STRAWBERRY","CAT","OREO","MARSHMALLOW","PRETZEL","STRAWBERRY"],
    ["PRETZEL","MARSHMALLOW","STRAWBERRY","CAT","OREO","PRETZEL"],
    ["CAT","OREO","PRETZEL","MARSHMALLOW","STRAWBERRY","CAT"]
  ]
};

const getTG = () => (typeof window !== "undefined" ? window.Telegram?.WebApp : undefined);

export default function App() {
  const [screen, setScreen] = useState("home");
  const [best, setBest] = useState(0);
  const [lastRun, setLastRun] = useState({ score: 0, win: false });

  useEffect(() => {
    const tg = getTG();
    try { tg?.ready(); tg?.expand(); } catch {}
  }, []);

  return (
    <div className="shell">
      <div className="header">
        <div className="brand">
          <span style={{ fontSize: 22 }}>🍬</span>
          <div style={{ fontWeight: 800 }}>Candy‑Cats</div>
          <span className="pill">{screen.toUpperCase()}</span>
        </div>
        <div style={{ display:"flex", alignItems:"center", gap:10 }}>
          <div className="kv">Best<b>{best}</b></div>
          {screen !== "home" && <button className="btn" onClick={() => setScreen("home")}>Home</button>}
        </div>
      </div>

      <div className="content">
        {screen === "home" && (
          <div className="grid" style={{ gridTemplateColumns:"1fr" }}>
            <div className="section" style={{ display:"grid", gap:10 }}>
              <div className="title">Match‑3 with cats & treats</div>
              <button className="btn primary block" onClick={() => setScreen("game")}>▶️ Play Level 1</button>
              <div className="muted">
                Swap to make 3+. 4 → striped, 5 → 🍪 bomb, T/L → 🍥 wrapped, 5+ w/ 🍓 → 🍓⭐ mega.
                Reach <b>1000</b> in <b>20</b> moves.
              </div>
            </div>
          </div>
        )}

        {screen === "game" && (
          <GameCanvas
            level={LEVEL}
            onExit={(res) => {
              setLastRun(res);
              if (res.score > best) setBest(res.score);
              setScreen("over");
            }}
            onBack={() => setScreen("home")}
          />
        )}

        {screen === "over" && (
          <div className="section" style={{ display:"grid", gap:10, maxWidth:420 }}>
            <div className="title">Level Over</div>
            <div className="row"><div className="muted">Score</div><b>{lastRun.score}</b></div>
            <div className="row"><div className="muted">Result</div>
              <b style={{ color:lastRun.win?"#7CFC7C":"#ffb4a2" }}>{lastRun.win?"Win":"Try again"}</b>
            </div>
            <button className="btn primary" onClick={() => setScreen("game")}>Play again</button>
            <button className="btn" onClick={() => setScreen("home")}>Home</button>
          </div>
        )}
      </div>
    </div>
  );
}

/* =========================
   Game Canvas Component
========================= */
function GameCanvas({ level, onExit, onBack }) {
  const ROWS = level.size[0], COLS = level.size[1];
  const ref = useRef(null);
  const wrapRef = useRef(null);
  const [score, setScore] = useState(0);
  const [moves, setMoves] = useState(level.moves);
  const [paused, setPaused] = useState(false);

  // grid: {type, special|null}
  const [grid, setGrid] = useState(() => {
    const g = levelToGrid(level);
    removeAllMatches(g, ROWS, COLS);
    ensureAnyMove(g, ROWS, COLS, level.pool);
    return g;
  });
  const gridRef = useRef(grid); gridRef.current = grid;

  // selection + hint
  const [sel, setSel] = useState(null); // {r,c}
  const [hint, setHint] = useState(null); // [[r,c],[r,c]]
  const selRef = useRef(sel); selRef.current = sel;

  // canvas sizing
  const cell = useCanvasSize(wrapRef, ref, COLS, ROWS);

  // Telegram buttons
  useEffect(() => {
    const tg = getTG(); if (!tg) return;
    try {
      tg.BackButton.show();
      tg.MainButton.setText("Hint 🔍");
      tg.MainButton.show();
    } catch {}
    const onBackBtn = () => setPaused(p => !p);
    const onMain = () => doHint();
    tg?.onEvent?.("backButtonClicked", onBackBtn);
    tg?.onEvent?.("mainButtonClicked", onMain);
    return () => {
      tg?.offEvent?.("backButtonClicked", onBackBtn);
      tg?.offEvent?.("mainButtonClicked", onMain);
      try { tg.BackButton.hide(); tg.MainButton.hide(); } catch {}
    };
  }, []);

  // draw loop
  useEffect(() => {
    const cvs = ref.current; if (!cvs) return;
    const ctx = cvs.getContext("2d");
    let raf = 0;

    const draw = () => {
      const dpr = window.devicePixelRatio || 1;
      const W = cvs.width, H = cvs.height;
      ctx.clearRect(0, 0, W, H);

      // grid background lines
      ctx.save();
      ctx.globalAlpha = 0.15;
      ctx.fillStyle = "#243069";
      for (let r = 0; r <= ROWS; r++) {
        ctx.fillRect(0, r * cell * dpr, W, 1);
      }
      for (let c = 0; c <= COLS; c++) {
        ctx.fillRect(c * cell * dpr, 0, 1, H);
      }
      ctx.restore();

      // tiles
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.font = `${Math.floor(cell * dpr * 0.72)}px AppleColorEmoji, "Segoe UI Emoji", Noto Color Emoji, sans-serif`;

      for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c < COLS; c++) {
          const t = gridRef.current[r][c];
          const x = (c + 0.5) * cell * dpr;
          const y = (r + 0.5) * cell * dpr;
          // tile bg
          ctx.fillStyle = "#151b46";
          ctx.strokeStyle = "#26307a";
          ctx.lineWidth = 2;
          roundRect(ctx, c * cell * dpr + 6 * dpr, r * cell * dpr + 6 * dpr, cell * dpr - 12 * dpr, cell * dpr - 12 * dpr, 12 * dpr, true, true);

          // selection/hint
          if (selRef.current && selRef.current.r === r && selRef.current.c === c) {
            ctx.strokeStyle = "#7aa2ff";
            ctx.lineWidth = 4 * dpr;
            roundRect(ctx, c * cell * dpr + 4 * dpr, r * cell * dpr + 4 * dpr, cell * dpr - 8 * dpr, cell * dpr - 8 * dpr, 12 * dpr, false, true);
          }
          if (hint && ((hint[0][0] === r && hint[0][1] === c) || (hint[1][0] === r && hint[1][1] === c))) {
            ctx.strokeStyle = "rgba(255,209,102,.85)";
            ctx.lineWidth = 3 * dpr;
            roundRect(ctx, c * cell * dpr + 8 * dpr, r * cell * dpr + 8 * dpr, cell * dpr - 16 * dpr, cell * dpr - 16 * dpr, 10 * dpr, false, true);
          }

          // emoji
          if (t) {
            ctx.fillText(EMOJI[t.special || t.type], x, y);
          }
        }
      }

      raf = requestAnimationFrame(draw);
    };

    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, [cell, ROWS, COLS, hint]);

  // pointer input
  useEffect(() => {
    const wrap = wrapRef.current;
    if (!wrap) return;

    let start = null; // {r,c,x,y}
    const thresh = 10;
    const rcFromEvent = (e) => {
      const rect = ref.current.getBoundingClientRect();
      const scale = (window.devicePixelRatio || 1);
      const x = Math.max(0, Math.min(rect.width, e.clientX - rect.left));
      const y = Math.max(0, Math.min(rect.height, e.clientY - rect.top));
      const c = Math.floor((x / rect.width) * COLS);
      const r = Math.floor((y / rect.height) * ROWS);
      return { r, c, x, y, scale };
    };

    const onDown = (e) => {
      if (paused) return;
      const p = rcFromEvent(e);
      if (sel && Math.abs(sel.r - p.r) + Math.abs(sel.c - p.c) === 1) {
        trySwap(sel.r, sel.c, p.r, p.c);
        setSel(null);
        start = null;
        return;
      }
      setSel({ r: p.r, c: p.c });
      start = p;
      wrap.setPointerCapture?.(e.pointerId);
    };

    const onUp = (e) => {
      if (paused || !start) return;
      const end = rcFromEvent(e);
      let dr = end.r - start.r, dc = end.c - start.c;
      const dx = end.x - start.x, dy = end.y - start.y;

      if (Math.abs(dr) + Math.abs(dc) !== 1) {
        if (Math.abs(dx) < thresh && Math.abs(dy) < thresh) {
          setSel(null); start = null; return;
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

    wrap.addEventListener("pointerdown", onDown);
    window.addEventListener("pointerup", onUp);
    return () => {
      wrap.removeEventListener("pointerdown", onDown);
      window.removeEventListener("pointerup", onUp);
    };
  }, [paused, sel, ROWS, COLS]);

  function doHint() {
    const m = findFirstMove(gridRef.current, ROWS, COLS);
    if (!m) { shuffleBoard(); return; }
    setHint(m);
    setTimeout(() => setHint(null), 1200);
  }

  function shuffleBoard() {
    const g = shuffleToSolvable(gridRef.current, ROWS, COLS, level.pool);
    setGrid(g);
  }

  function finish() {
    const win = score >= level.objective.target;
    onExit({ score, win });
  }

  // --- swap+resolve with full specials ---
  function trySwap(r1, c1, r2, c2) {
    if (Math.abs(r1 - r2) + Math.abs(c1 - c2) !== 1) return;

    // check for direct special+special with color bomb handling
    const g0 = cloneGrid(gridRef.current, ROWS, COLS);
    if (handleSwapCombos(g0, r1, c1, r2, c2, ROWS, COLS)) {
      setGrid(g0);
      setMoves(m => Math.max(0, m - 1));
      resolveCascades(g0, () => { if (movesRef.current === 0) finish(); });
      return;
    }

    const g = cloneGrid(gridRef.current, ROWS, COLS);
    [g[r1][c1], g[r2][c2]] = [g[r2][c2], g[r1][c1]];
    const res = detectAllMatches(g, ROWS, COLS);
    if (res.totalClears === 0) {
      // revert feel: brief select blink
      setSel({ r: r1, c: c1 });
      setTimeout(() => setSel(null), 120);
      return;
    }

    setGrid(g);
    setMoves(m => Math.max(0, m - 1));
    resolveCascades(g, () => { if (movesRef.current === 0) finish(); });
  }

  const movesRef = useRef(moves); movesRef.current = moves;
  const scoreRef = useRef(score); scoreRef.current = score;

  function resolveCascades(startGrid, done) {
    let g = cloneGrid(startGrid, ROWS, COLS);
    let combo = 0;

    const step = () => {
      const res = detectAllMatches(g, ROWS, COLS);
      if (res.totalClears === 0) {
        setGrid(g);
        ensureAnyMove(g, ROWS, COLS, level.pool);
        done && done();
        return;
      }

      // score
      const base = res.clearedCells.length * 10 * Math.max(1, combo + 1);
      const bonus = res.specialsTriggered * 20;
      setScore(s => s + base + bonus);

      // clear, gravity, refill
      res.clearedCells.forEach(([r, c]) => { g[r][c] = null; });
      applyGravity(g, ROWS, COLS);
      refill(g, ROWS, COLS, level.pool);

      combo++;
      setTimeout(step, 80);
    };

    step();
  }

  return (
    <div className="section board-wrap" style={{ maxWidth: 520, margin: "0 auto" }}>
      <div className="row">
        <button className="btn" onClick={onBack}>Back</button>
        <div className="hud">
          <div className="kv">Score<b>{score}</b></div>
          <div className="kv">Moves<b>{moves}</b></div>
          <div className="kv">Goal<b>{level.objective.target}</b></div>
        </div>
      </div>

      <div className="canvas-wrap" ref={wrapRef}>
        <canvas ref={ref} />
        {paused && (
          <div className="overlay-msg">
            <div style={{ textAlign:"center" }}>
              <div className="title" style={{ marginBottom:8 }}>Paused</div>
              <button className="btn primary" onClick={() => setPaused(false)}>Resume</button>
              <div style={{ height:8 }} />
              <button className="btn" onClick={finish}>End Level</button>
            </div>
          </div>
        )}
      </div>

      <div className="row">
        <button className="btn" onClick={() => setPaused(p => !p)}>{paused ? "Resume" : "Pause"}</button>
        <button className="btn" onClick={() => {
          const g = levelToGrid(level);
          removeAllMatches(g, ROWS, COLS);
          ensureAnyMove(g, ROWS, COLS, level.pool);
          setGrid(g); setScore(0); setMoves(level.moves); setHint(null); setSel(null);
        }}>Reset</button>
        <button className="btn" onClick={doHint}>Hint 🔍</button>
        <button className="btn primary" onClick={shuffleBoard}>Shuffle 🔀</button>
      </div>
    </div>
  );
}

/* =========================
   Canvas + Engine helpers
========================= */
function useCanvasSize(wrapRef, canvasRef, COLS, ROWS) {
  const [cell, setCell] = useState(56);
  useEffect(() => {
    const rescale = () => {
      const el = wrapRef.current; const cvs = canvasRef.current; if (!el || !cvs) return;
      const w = Math.min(el.clientWidth, 420);
      const h = w; // square board
      const dpr = window.devicePixelRatio || 1;
      cvs.style.width = `${w}px`;
      cvs.style.height = `${h}px`;
      cvs.width = Math.floor(w * dpr);
      cvs.height = Math.floor(h * dpr);
      setCell(Math.floor((w / COLS)));
    };
    rescale();
    const ro = new ResizeObserver(rescale);
    ro.observe(document.body);
    window.addEventListener("resize", rescale);
    return () => { ro.disconnect(); window.removeEventListener("resize", rescale); };
  }, [wrapRef, canvasRef, COLS]);
  return cell;
}

// draw rounded rectangle
function roundRect(ctx, x, y, w, h, r, fill, stroke) {
  const rr = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  if (fill) ctx.fill();
  if (stroke) ctx.stroke();
}

const inBounds = (r, c, ROWS, COLS) => r >= 0 && r < ROWS && c >= 0 && c < COLS;

function levelToGrid(level) {
  const [R, C] = level.size;
  const g = Array.from({ length: R }, () => Array(C).fill(null));
  for (let r = 0; r < R; r++) for (let c = 0; c < C; c++)
    g[r][c] = { type: level.layout[r][c], special: null };
  return g;
}
function cloneGrid(g, ROWS, COLS) {
  const t = Array.from({ length: ROWS }, () => Array(COLS).fill(null));
  for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++)
    t[r][c] = g[r][c] ? { ...g[r][c] } : null;
  return t;
}
function randomFrom(pool){ return pool[(Math.random() * pool.length) | 0]; }

function removeAllMatches(g, ROWS, COLS) {
  while (true) {
    const res = detectRuns(g, ROWS, COLS);
    if (res.runs.length === 0) break;
    for (const run of res.runs) {
      for (const [r, c] of run.cells) {
        g[r][c] = { type: randomFrom([PIECE.CAT, PIECE.OREO, PIECE.MARSHMALLOW, PIECE.STRAWBERRY, PIECE.PRETZEL]), special: null };
      }
    }
  }
}
function applyGravity(g, ROWS, COLS) {
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
function refill(g, ROWS, COLS, pool) {
  for (let r = 0; r < ROWS; r++)
    for (let c = 0; c < COLS; c++)
      if (g[r][c] == null) g[r][c] = { type: randomFrom(pool), special: null };
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
  for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) flat.push(g[r][c]?.type || randomFrom(pool));
  let attempts = 0;
  while (attempts < 100) {
    // shuffle
    for (let i = flat.length - 1; i > 0; i--) { const j = (Math.random() * (i + 1)) | 0; [flat[i], flat[j]] = [flat[j], flat[i]]; }
    const t = Array.from({ length: ROWS }, () => Array(COLS).fill(null));
    let k = 0;
    for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++)
      t[r][c] = { type: flat[k++], special: null };
    removeAllMatches(t, ROWS, COLS);
    if (hasAnyMove(t, ROWS, COLS)) return t;
    attempts++;
  }
  // fallback random
  const f = Array.from({ length: ROWS }, () => Array(COLS).fill(null));
  for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++)
    f[r][c] = { type: randomFrom(pool), special: null };
  removeAllMatches(f, ROWS, COLS);
  return f;
}

function hasAnyMove(g, ROWS, COLS) { return !!findFirstMove(g, ROWS, COLS); }
function findFirstMove(g, ROWS, COLS) {
  for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) {
    if (c + 1 < COLS) { const t = cloneGrid(g, ROWS, COLS); [t[r][c], t[r][c + 1]] = [t[r][c + 1], t[r][c]]; if (detectRuns(t, ROWS, COLS).runs.length > 0) return [[r, c], [r, c + 1]]; }
    if (r + 1 < ROWS) { const t = cloneGrid(g, ROWS, COLS); [t[r][c], t[r + 1][c]] = [t[r + 1][c], t[r][c]]; if (detectRuns(t, ROWS, COLS).runs.length > 0) return [[r, c], [r + 1, c]]; }
  }
  return null;
}

function detectAllMatches(g, ROWS, COLS) {
  const { runs, byCell } = detectRuns(g, ROWS, COLS);
  const wrappedCenters = detectWrappedCenters(byCell);

  const promotions = [];
  const clearedNormals = new Set();

  for (const run of runs) {
    const len = run.cells.length;
    let promo = run.cells[Math.floor(len / 2)];
    for (const [r, c] of run.cells) if (wrappedCenters.has(`${r}:${c}`)) { promo = [r, c]; break; }

    let special = null;
    if (wrappedCenters.has(`${promo[0]}:${promo[1]}`)) {
      special = PIECE.WRAPPED;
    } else if (len >= 5) {
      const hasStrawberry = run.cells.some(([r, c]) => g[r][c]?.type === PIECE.STRAWBERRY);
      special = hasStrawberry ? PIECE.MEGA_STRAWBERRY : PIECE.COLOR_BOMB;
    } else if (len === 4) {
      special = run.orient === "H" ? PIECE.STRIPED_H : PIECE.STRIPED_V;
    }

    if (special) {
      promotions.push({ r: promo[0], c: promo[1], special });
      for (const [r, c] of run.cells) {
        if (r === promo[0] && c === promo[1]) continue;
        clearedNormals.add(`${r}:${c}`);
      }
    } else {
      for (const [r, c] of run.cells) clearedNormals.add(`${r}:${c}`);
    }
  }

  // apply promotions
  for (const p of promotions) {
    const t = g[p.r][p.c];
    if (t) t.special = p.special;
  }

  // trigger specials inside clears
  const clearedCells = new Set([...clearedNormals]);
  let specialsTriggered = 0;
  for (const K of [...clearedNormals]) {
    const [r, c] = K.split(":").map(n => parseInt(n, 10));
    const t = g[r][c];
    if (t && t.special) {
      specialsTriggered++;
      triggerSpecial(g, r, c, t.special, ROWS, COLS, clearedCells);
    }
  }

  const arr = [...clearedCells].map(k => k.split(":").map(n => parseInt(n, 10)));
  return { totalClears: arr.length, clearedCells: arr, specialsTriggered };
}

function detectRuns(g, ROWS, COLS) {
  const runs = [];
  const byCell = new Map();
  // horizontal
  for (let r = 0; r < ROWS; r++) {
    let c = 0;
    while (c < COLS) {
      const t = g[r][c];
      if (!t || t.special) { c++; continue; }
      let len = 1;
      while (c + len < COLS && g[r][c + len] && !g[r][c + len].special && g[r][c + len].type === t.type) len++;
      if (len >= 3) {
        const cells = [];
        for (let k = 0; k < len; k++) {
          cells.push([r, c + k]);
          const K = `${r}:${c + k}`;
          const v = byCell.get(K) || {};
          v.hLen = len; byCell.set(K, v);
        }
        runs.push({ orient: "H", cells });
      }
      c += len;
    }
  }
  // vertical
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
          const K = `${r + k}:${c}`;
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
  const centers = new Set();
  for (const [K, v] of byCell.entries())
    if (v.hLen >= 3 && v.vLen >= 3) centers.add(K);
  return centers;
}
function triggerSpecial(g, r, c, special, ROWS, COLS, outSet) {
  const add = (rr, cc) => { if (inBounds(rr, cc, ROWS, COLS)) outSet.add(`${rr}:${cc}`); };
  if (special === PIECE.STRIPED_H) for (let cc = 0; cc < COLS; cc++) add(r, cc);
  else if (special === PIECE.STRIPED_V) for (let rr = 0; rr < ROWS; rr++) add(rr, c);
  else if (special === PIECE.WRAPPED) {
    for (let pass = 0; pass < 2; pass++)
      for (let dr = -1; dr <= 1; dr++)
        for (let dc = -1; dc <= 1; dc++)
          add(r + dr, c + dc);
  } else if (special === PIECE.COLOR_BOMB) {
    // remove most frequent basic color
    const freq = new Map();
    for (let rr = 0; rr < ROWS; rr++) for (let cc = 0; cc < COLS; cc++) {
      const t = g[rr][cc]; if (!t || t.special) continue;
      freq.set(t.type, (freq.get(t.type) || 0) + 1);
    }
    let target = null, best = -1;
    for (const [type, n] of freq.entries()) if (n > best) { best = n; target = type; }
    if (target) for (let rr = 0; rr < ROWS; rr++) for (let cc = 0; cc < COLS; cc++)
      if (g[rr][cc]?.type === target) add(rr, cc);
  } else if (special === PIECE.MEGA_STRAWBERRY) {
    for (let rr = r - 1; rr <= r + 1; rr++) for (let cc = 0; cc < COLS; cc++) add(rr, cc);
    for (let cc = c - 1; cc <= c + 1; cc++) for (let rr = 0; rr < ROWS; rr++) add(rr, cc);
  }
}

// Special+special and color-bomb combos when swapped directly
function handleSwapCombos(g, r1, c1, r2, c2, ROWS, COLS) {
  const A = g[r1][c1], B = g[r2][c2];
  if (!A || !B) return false;
  const isBomb = (t) => t?.special === PIECE.COLOR_BOMB;
  const isStriped = (t) => t?.special === PIECE.STRIPED_H || t?.special === PIECE.STRIPED_V;
  const isWrapped = (t) => t?.special === PIECE.WRAPPED;
  const isMega = (t) => t?.special === PIECE.MEGA_STRAWBERRY;

  const cleared = new Set();
  const add = (rr, cc) => { if (inBounds(rr, cc, ROWS, COLS)) cleared.add(`${rr}:${cc}`); };

  if (isBomb(A) || isBomb(B)) {
    const bomb = isBomb(A) ? A : B;
    const other = isBomb(A) ? B : A;

    if (isBomb(A) && isBomb(B)) {
      for (let rr = 0; rr < ROWS; rr++) for (let cc = 0; cc < COLS; cc++) add(rr, cc);
    } else if (isStriped(other)) {
      const targetType = other.type;
      for (let rr = 0; rr < ROWS; rr++) for (let cc = 0; cc < COLS; cc++) {
        const t = g[rr][cc];
        if (t && t.type === targetType && !t.special) {
          t.special = Math.random() < 0.5 ? PIECE.STRIPED_H : PIECE.STRIPED_V;
          triggerSpecial(g, rr, cc, t.special, ROWS, COLS, cleared);
        }
      }
      add(r1, c1); add(r2, c2);
    } else if (isWrapped(other)) {
      const targetType = other.type;
      for (let rr = 0; rr < ROWS; rr++) for (let cc = 0; cc < COLS; cc++) {
        const t = g[rr][cc];
        if (t && t.type === targetType && !t.special) {
          t.special = PIECE.WRAPPED;
          triggerSpecial(g, rr, cc, t.special, ROWS, COLS, cleared);
        }
      }
      add(r1, c1); add(r2, c2);
    } else if (isMega(other)) {
      const targetType = other.type;
      for (let rr = 0; rr < ROWS; rr++) for (let cc = 0; cc < COLS; cc++)
        if (g[rr][cc]?.type === targetType) add(rr, cc);
      for (let rr = r2 - 1; rr <= r2 + 1; rr++) for (let cc = 0; cc < COLS; cc++) add(rr, cc);
      for (let cc = c2 - 1; cc <= c2 + 1; cc++) for (let rr = 0; rr < ROWS; rr++) add(rr, cc);
      add(r1, c1); add(r2, c2);
    } else {
      const targetType = other.type;
      for (let rr = 0; rr < ROWS; rr++) for (let cc = 0; cc < COLS; cc++)
        if (g[rr][cc]?.type === targetType) add(rr, cc);
      add(r1, c1); add(r2, c2);
    }

    if (cleared.size > 0) {
      performManualClear(g, cleared, ROWS, COLS);
      return true;
    }
    return false;
  }

  if ((isStriped(A) && isStriped(B))) {
    for (let cc = 0; cc < COLS; cc++) add(r1, cc);
    for (let rr = 0; rr < ROWS; rr++) add(rr, c2);
    add(r1, c1); add(r2, c2);
    performManualClear(g, cleared, ROWS, COLS);
    return true;
  }
  if ((isStriped(A) && isWrapped(B)) || (isStriped(B) && isWrapped(A))) {
    for (let rr = r2 - 1; rr <= r2 + 1; rr++) for (let cc = 0; cc < COLS; cc++) add(rr, cc);
    for (let cc = c2 - 1; cc <= c2 + 1; cc++) for (let rr = 0; rr < ROWS; rr++) add(rr, cc);
    add(r1, c1); add(r2, c2);
    performManualClear(g, cleared, ROWS, COLS);
    return true;
  }
  if (isWrapped(A) && isWrapped(B)) {
    for (let pass = 0; pass < 2; pass++)
      for (let rr = r2 - 2; rr <= r2 + 2; rr++)
        for (let cc = c2 - 2; cc <= c2 + 2; cc++)
          add(rr, cc);
    add(r1, c1); add(r2, c2);
    performManualClear(g, cleared, ROWS, COLS);
    return true;
  }
  if (isMega(A) || isMega(B)) {
    for (let rr = r2 - 1; rr <= r2 + 1; rr++) for (let cc = 0; cc < COLS; cc++) add(rr, cc);
    for (let cc = c2 - 1; cc <= c2 + 1; cc++) for (let rr = 0; rr < ROWS; rr++) add(rr, cc);
    add(r1, c1); add(r2, c2);
    performManualClear(g, cleared, ROWS, COLS);
    return true;
  }
  return false;
}

function performManualClear(g, clearedSet, ROWS, COLS) {
  // trigger contained specials until stable
  let changed = true;
  while (changed) {
    changed = false;
    const toTrig = [];
    for (const K of [...clearedSet]) {
      const [r, c] = K.split(":").map(n => parseInt(n, 10));
      const t = g[r][c];
      if (t && t.special) toTrig.push([r, c, t.special]);
    }
    for (const [r, c, sp] of toTrig) {
      const before = clearedSet.size;
      triggerSpecial(g, r, c, sp, ROWS, COLS, clearedSet);
      if (clearedSet.size > before) changed = true;
    }
  }
  for (const K of [...clearedSet]) {
    const [r, c] = K.split(":").map(n => parseInt(n, 10));
    g[r][c] = null;
  }
  applyGravity(g, ROWS, COLS);
}

/* ========== end helpers ========== */
