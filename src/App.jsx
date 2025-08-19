import React, { useEffect, useRef, useState } from "react";

/* -------------------------------------------------
   Candy-Cats (Canvas) — Match‑3 with animations
   ✦ Pieces: 🐱 CAT, 🍪 OREO, 🍥 MARSHMALLOW, 🍓 STRAWBERRY, 🥨 PRETZEL
   ✦ Inputs: drag (touch/mouse) to swap adjacent tiles
   ✦ Animations: swap tween, clear fade+poof, gravity fall, refill, cascades
   ✦ HUD: score, moves, combo, hint, shuffle, pause
   ✦ No horizontal scroll; mobile-first layout

   Files untouched: index.html, main.jsx, server.js, vite.config.js
   Also add the tiny CSS tweak in index.css (section 2 below).
-------------------------------------------------- */

// ---------- Game constants ----------
const ROWS = 6;
const COLS = 6;
const MOVES = 20;
const OBJECTIVE_SCORE = 1000;

// Pieces
const P = {
  CAT: "CAT",
  OREO: "OREO",
  MARSHMALLOW: "MARSHMALLOW",
  STRAWBERRY: "STRAWBERRY",
  PRETZEL: "PRETZEL",
};

const EMOJI = {
  [P.CAT]: "🐱",
  [P.OREO]: "🍪",
  [P.MARSHMALLOW]: "🍥",
  [P.STRAWBERRY]: "🍓",
  [P.PRETZEL]: "🥨",
};

const POOL = [P.CAT, P.OREO, P.MARSHMALLOW, P.STRAWBERRY, P.PRETZEL];

// Level 1 layout (your spec)
const LEVEL1_LAYOUT = [
  [P.CAT, P.OREO, P.MARSHMALLOW, P.STRAWBERRY, P.PRETZEL, P.CAT],
  [P.OREO, P.PRETZEL, P.CAT, P.OREO, P.MARSHMALLOW, P.STRAWBERRY],
  [P.MARSHMALLOW, P.STRAWBERRY, P.PRETZEL, P.CAT, P.OREO, P.MARSHMALLOW],
  [P.STRAWBERRY, P.CAT, P.OREO, P.MARSHMALLOW, P.PRETZEL, P.STRAWBERRY],
  [P.PRETZEL, P.MARSHMALLOW, P.STRAWBERRY, P.CAT, P.OREO, P.PRETZEL],
  [P.CAT, P.OREO, P.PRETZEL, P.MARSHMALLOW, P.STRAWBERRY, P.CAT],
];

// Drawing
const BG = "#0f1533";
const GRID_LINE = "rgba(122,162,255,.25)";
const TILE_BG = "#151b46";
const TILE_HL = "#1a2260";
const TILE_BORDER = "#26307a";

// Tweens
const SWAP_MS = 140;
const FALL_PX_PER_MS = 0.6; // gravity
const CLEAR_MS = 180;
const CASCADE_DELAY_MS = 90;

// Utilities
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const now = () => performance.now();

// ---------- Root app shell ----------
export default function App() {
  useEffect(() => {
    // Minimal inline CSS for the shell
    const style = document.createElement("style");
    style.innerHTML = `
      :root { --line:#243069; }
      body { margin:0; background:#0a0f23; color:#fff; font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial; overflow-x:hidden; }
      #root, html, body { height:100%; }
      .page { min-height:100%; display:flex; align-items:center; justify-content:center; padding:16px; }
      .card { width:min(480px, 100%); display:flex; flex-direction:column; gap:12px; }
      .panel, .section { background:#0f1430; border:1px solid var(--line); border-radius:16px; padding:12px 14px; box-shadow:0 10px 28px rgba(0,0,0,.2); }
      .panel { display:flex; align-items:center; justify-content:space-between; }
      .title { font-weight:800; font-size:16px; }
      .muted { opacity:.72; }
      .btn { background:#12183a; border:1px solid #1c244e; color:#fff; border-radius:14px; padding:10px 12px; cursor:pointer; }
      .btn.primary { background:#132049; border-color:#1f2a5c; font-weight:700; }
      .row { display:flex; align-items:center; justify-content:space-between; gap:8px; flex-wrap:wrap; }
      .controls { display:grid; grid-template-columns: repeat(5, 1fr); gap:8px; }
      canvas { touch-action:none; display:block; }
      .pill { padding:2px 8px; border-radius:999px; border:1px solid var(--line); background:#0f1533; font-size:11px; }
    `;
    document.head.appendChild(style);
    return () => document.head.removeChild(style);
  }, []);

  const [screen, setScreen] = useState("home");
  const [lastRun, setLastRun] = useState({ score: 0, win: false });

  function Header() {
    return (
      <div className="panel">
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontSize: 22 }}>🍬</span>
          <b>Candy‑Cats</b>
          <span className="pill">{screen.toUpperCase()}</span>
        </div>
        {screen !== "home" && <button className="btn" onClick={() => setScreen("home")}>Home</button>}
      </div>
    );
  }

  function Home() {
    return (
      <div className="section" style={{ display: "grid", gap: 10 }}>
        <div className="title">Match‑3 with cats & treats</div>
        <div className="muted">
          Drag a tile to swap with a neighbor. Make 3+ in a row/col to clear; watch them pop and fall!
        </div>
        <button className="btn primary" onClick={() => setScreen("game")}>▶️ Play Level 1</button>
      </div>
    );
  }

  function GameOver() {
    return (
      <div className="section" style={{ display: "grid", gap: 10 }}>
        <div className="title">Level Over</div>
        <div className="row"><div className="muted">Score</div><b>{lastRun.score}</b></div>
        <div className="row"><div className="muted">Result</div><b style={{ color: lastRun.win ? "#7CFC7C" : "#ffb4a2" }}>{lastRun.win ? "Win" : "Try Again"}</b></div>
        <div className="row" style={{ gap: 8 }}>
          <button className="btn primary" onClick={() => setScreen("game")}>Play again</button>
          <button className="btn" onClick={() => setScreen("home")}>Home</button>
        </div>
      </div>
    );
  }

  return (
    <div className="page">
      <div className="card">
        <Header />
        {screen === "home" && <Home />}
        {screen === "game" && (
          <CanvasGame
            onExit={(run) => {
              setLastRun(run);
              setScreen("gameover");
            }}
            onBack={() => setScreen("home")}
          />
        )}
        {screen === "gameover" && <GameOver />}
      </div>
    </div>
  );
}

// ---------- Canvas Game ----------
function CanvasGame({ onExit, onBack }) {
  const wrapRef = useRef(null);
  const canvRef = useRef(null);
  const [hud, setHud] = useState({
    score: 0,
    moves: MOVES,
    combo: 0,
    paused: false,
  });

  // Board model: cell objects live in grid[r][c]
  // Each cell keeps an animation state: x,y (pixels), sx,sy (scale), alpha, vx,vy, clearingUntil (timestamp)
  const gridRef = useRef(makeGrid());

  // Layout (computed)
  const cellSizeRef = useRef(60);
  const originRef = useRef({ x: 0, y: 0 }); // top-left of board in canvas
  const boardPxRef = useRef({ w: 0, h: 0 });

  // Interaction
  const dragRef = useRef({ active: false, r: -1, c: -1, startX: 0, startY: 0, lastX: 0, lastY: 0 });

  // Anim loop
  const rafRef = useRef(0);
  const lastTRef = useRef(0);
  const busyRef = useRef(false); // block input during swaps/clear/fall phases

  // ---------- Init ----------
  useEffect(() => {
    // create canvas and size it
    const canvas = canvRef.current;
    const dpr = window.devicePixelRatio || 1;
    const resize = () => {
      const wrap = wrapRef.current;
      if (!wrap) return;
      // Reserve space for HUD
      const availW = wrap.clientWidth - 2; // small pad
      const availH = Math.max(260, wrap.clientHeight - 200);

      // cell size keeps board square-ish within wrapper
      const s = Math.floor(Math.min(availW / COLS, availH / ROWS));
      cellSizeRef.current = clamp(s, 44, 80);
      const w = COLS * cellSizeRef.current;
      const h = ROWS * cellSizeRef.current;
      boardPxRef.current = { w, h };

      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
      canvas.width = Math.floor(w * dpr);
      canvas.height = Math.floor(h * dpr);

      originRef.current = { x: 0, y: 0 }; // centered can be added later
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(wrapRef.current);
    window.addEventListener("resize", resize);

    // initialize board from level layout, remove auto-matches, ensure a move
    gridRef.current = makeGridFromLayout(LEVEL1_LAYOUT);
    stripAllMatches(gridRef.current);
    ensureAnyMove(gridRef.current);

    startLoop();

    // input handlers
    const onPointerDown = (e) => {
      if (hud.paused || busyRef.current) return;
      const pt = canvasPoint(canvas, e);
      const hit = hitCell(pt.x, pt.y);
      if (!hit) return;
      dragRef.current = {
        active: true,
        r: hit.r,
        c: hit.c,
        startX: pt.x,
        startY: pt.y,
        lastX: pt.x,
        lastY: pt.y,
      };
      canvas.setPointerCapture?.(e.pointerId);
    };
    const onPointerMove = (e) => {
      if (!dragRef.current.active) return;
      const pt = canvasPoint(canvas, e);
      dragRef.current.lastX = pt.x;
      dragRef.current.lastY = pt.y;
    };
    const onPointerUp = async (e) => {
      if (!dragRef.current.active) return;
      const d = dragRef.current;
      dragRef.current.active = false;

      if (hud.paused || busyRef.current) return;

      // Decide swap dir from drag delta
      const dx = d.lastX - d.startX;
      const dy = d.lastY - d.startY;
      const threshold = Math.max(8, cellSizeRef.current * 0.25);
      let dr = 0,
        dc = 0;
      if (Math.abs(dx) > Math.abs(dy)) {
        if (Math.abs(dx) >= threshold) dc = dx > 0 ? 1 : -1;
      } else {
        if (Math.abs(dy) >= threshold) dr = dy > 0 ? 1 : -1;
      }
      const r2 = d.r + dr,
        c2 = d.c + dc;
      if (!inBounds(r2, c2)) return;

      await attemptSwap(d.r, d.c, r2, c2);
    };

    canvas.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("pointermove", onPointerMove, { passive: true });
    window.addEventListener("pointerup", onPointerUp, { passive: true });

    return () => {
      cancelAnimationFrame(rafRef.current);
      ro.disconnect();
      window.removeEventListener("resize", resize);
      canvas.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ---------- Main loop ----------
  function startLoop() {
    const step = (t) => {
      const dt = lastTRef.current ? t - lastTRef.current : 16;
      lastTRef.current = t;
      update(dt);
      draw();
      rafRef.current = requestAnimationFrame(step);
    };
    rafRef.current = requestAnimationFrame(step);
  }

  function update(dt) {
    // Gravity animation
    const g = gridRef.current;
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        const cell = g[r][c];
        if (!cell) continue;
        // approach target pixel pos
        const targetX = c * cellSizeRef.current + cellSizeRef.current / 2;
        const targetY = r * cellSizeRef.current + cellSizeRef.current / 2;

        const k = 0.18; // spring-ish
        cell.vx += (targetX - cell.x) * k;
        cell.vy += (targetY - cell.y) * k;
        cell.x += cell.vx * 0.12;
        cell.y += cell.vy * 0.12;
        cell.vx *= 0.5;
        cell.vy *= 0.5;

        // clear animation (fade)
        if (cell.clearingUntil) {
          const remain = clamp((cell.clearingUntil - now()) / CLEAR_MS, 0, 1);
          cell.alpha = remain;
          cell.s = 0.9 + 0.1 * remain;
          if (remain <= 0) {
            g[r][c] = null;
          }
        }
      }
    }
  }

  function draw() {
    const canvas = canvRef.current;
    if (!canvas) return;
    const dpr = window.devicePixelRatio || 1;
    const ctx = canvas.getContext("2d");
    const { w, h } = boardPxRef.current;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);

    // board bg
    ctx.fillStyle = BG;
    ctx.fillRect(0, 0, w, h);

    // grid lines
    ctx.strokeStyle = GRID_LINE;
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let r = 0; r <= ROWS; r++) {
      const y = r * cellSizeRef.current + 0.5;
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
    }
    for (let c = 0; c <= COLS; c++) {
      const x = c * cellSizeRef.current + 0.5;
      ctx.moveTo(x, 0);
      ctx.lineTo(x, h);
    }
    ctx.stroke();

    // tiles
    const g = gridRef.current;
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        const cell = g[r][c];
        if (!cell) continue;
        const x = cell.x;
        const y = cell.y;

        // tile bg
        const size = cellSizeRef.current * (cell.s ?? 1);
        const half = size / 2;
        const alpha = cell.alpha ?? 1;

        ctx.save();
        ctx.globalAlpha = 0.95 * alpha;

        // rounded rect
        roundRect(ctx, x - half, y - half, size, size, 12);
        ctx.fillStyle = cell.highlight ? TILE_HL : TILE_BG;
        ctx.fill();
        ctx.strokeStyle = TILE_BORDER;
        ctx.stroke();

        // emoji
        ctx.font = `${Math.floor(size * 0.72)}px system-ui, Apple Color Emoji, Noto Color Emoji, Segoe UI Emoji`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(EMOJI[cell.type] || "❓", x, y);
        ctx.restore();
      }
    }

    // dragging highlight
    if (dragRef.current.active) {
      const { r, c } = dragRef.current;
      if (inBounds(r, c)) {
        const x = c * cellSizeRef.current;
        const y = r * cellSizeRef.current;
        ctx.save();
        ctx.strokeStyle = "#7aa2ff";
        ctx.lineWidth = 2;
        ctx.strokeRect(x + 2, y + 2, cellSizeRef.current - 4, cellSizeRef.current - 4);
        ctx.restore();
      }
    }
  }

  // ---------- Actions ----------
  async function attemptSwap(r1, c1, r2, c2) {
    if (hud.moves <= 0) return;
    if (Math.abs(r1 - r2) + Math.abs(c1 - c2) !== 1) return;

    const g = gridRef.current;
    if (!g[r1][c1] || !g[r2][c2]) return;

    busyRef.current = true;
    // animate swap
    await tweenSwap(r1, c1, r2, c2);

    // evaluate
    let matched = collectMatches(g);
    if (matched.length === 0) {
      // swap back
      await tweenSwap(r1, c1, r2, c2);
      busyRef.current = false;
      return;
    }

    // consume 1 move
    setHud((h) => ({ ...h, moves: h.moves - 1 }));

    // Cascades loop
    let combo = 0;
    while (matched.length > 0) {
      combo++;
      // clear with fade
      addScore(10 * matched.length * combo);
      clearWithFade(g, matched);
      await sleep(CLEAR_MS);

      // remove cleared (set to null already), apply gravity fall animation
      const fallPlan = computeFalls(g);
      await animateFalls(g, fallPlan);

      // refill from top (spawn above and fall)
      const spawns = refillSpawnPlan(g);
      await animateSpawns(g, spawns);

      matched = collectMatches(g);
      if (matched.length > 0) await sleep(CASCADE_DELAY_MS);
    }

    // end?
    if (hud.moves - 1 <= 0) {
      const win = hud.score >= OBJECTIVE_SCORE;
      onExit({ score: hud.score, win });
    }
    busyRef.current = false;
  }

  function addScore(pts) {
    setHud((h) => ({ ...h, score: h.score + pts, combo: Math.min(9, (h.combo ?? 0) + 1) }));
    setTimeout(() => setHud((h) => ({ ...h, combo: 0 })), 900);
  }

  // ---------- HUD controls ----------
  const resetLevel = () => {
    gridRef.current = makeGridFromLayout(LEVEL1_LAYOUT);
    stripAllMatches(gridRef.current);
    ensureAnyMove(gridRef.current);
    setHud({ score: 0, moves: MOVES, combo: 0, paused: false });
  };

  const hint = () => {
    if (busyRef.current) return;
    const m = findFirstMove(gridRef.current);
    flashHint(gridRef.current, m);
  };

  const shuffle = () => {
    if (busyRef.current) return;
    shuffleToSolvable(gridRef.current);
  };

  // ---------- Render UI ----------
  const { w, h } = boardPxRef.current;

  return (
    <div className="section" style={{ display: "grid", gap: 10 }}>
      <div className="row">
        <button className="btn" onClick={onBack}>Back</button>
        <div className="muted">
          Drag a tile toward a neighbor to swap. Score {OBJECTIVE_SCORE} in {MOVES} moves.
        </div>
      </div>

      <div className="row">
        <div><span className="muted">Score</span> <b>{hud.score}</b></div>
        <div><span className="muted">Moves</span> <b>{hud.moves}</b></div>
        <div><span className="muted">Combo</span> <b>{hud.combo > 0 ? `x${hud.combo + 1}` : "-"}</b></div>
      </div>

      <div ref={wrapRef} style={{ width: "100%", display: "grid", placeItems: "center" }}>
        <canvas ref={canvRef} width={w} height={h} />
      </div>

      <div className="controls">
        <button className="btn" onClick={() => setHud((h) => ({ ...h, paused: !h.paused }))}>
          {hud.paused ? "Resume" : "Pause"}
        </button>
        <button className="btn" onClick={resetLevel}>Reset</button>
        <button className="btn" onClick={hint}>Hint 🔍</button>
        <button className="btn primary" onClick={shuffle}>Shuffle 🔀</button>
        <div style={{ display:"flex", alignItems:"center", justifyContent:"center", opacity:.7, fontSize:12 }}>
          {ROWS}×{COLS}
        </div>
      </div>
    </div>
  );
}

// ---------- Board helpers ----------
function makeGridFromLayout(layout) {
  const g = Array.from({ length: ROWS }, (_, r) =>
    Array.from({ length: COLS }, (_, c) => makeCell(layout[r][c] ?? randomPiece(), r, c, true))
  );
  return g;
}

function makeGrid() {
  const g = Array.from({ length: ROWS }, () =>
    Array.from({ length: COLS }, () => null)
  );
  for (let r = 0; r < ROWS; r++)
    for (let c = 0; c < COLS; c++)
      g[r][c] = makeCell(randomPiece(), r, c, true);
  return g;
}

function makeCell(type, r, c, snap = false) {
  const size = 60; // will be resnapped by tween loop
  const cx = c * size + size / 2;
  const cy = r * size + size / 2;
  return {
    type,
    x: snap ? cx : cx + (Math.random() * 30 - 15),
    y: snap ? cy : cy - Math.random() * 100,
    vx: 0,
    vy: 0,
    s: 1,
    alpha: 1,
    clearingUntil: 0,
    highlight: false,
  };
}

function randomPiece() {
  return POOL[(Math.random() * POOL.length) | 0];
}

function inBounds(r, c) {
  return r >= 0 && r < ROWS && c >= 0 && c < COLS;
}

function canvasPoint(canvas, e) {
  const rect = canvas.getBoundingClientRect();
  const x = e.clientX - rect.left;
  const y = e.clientY - rect.top;
  return { x, y };
}

function hitCell(x, y) {
  const cellSize = Math.floor(Math.min(
    (document.body.clientWidth - 32) / COLS,
    600 / ROWS
  ));
  const cs = clamp(cellSize, 44, 80); // same range as we use
  const c = Math.floor(x / cs);
  const r = Math.floor(y / cs);
  if (!inBounds(r, c)) return null;
  return { r, c };
}

function collectMatches(g) {
  const hits = new Set();
  // Horizontal
  for (let r = 0; r < ROWS; r++) {
    let c = 0;
    while (c < COLS) {
      const cur = g[r][c]?.type;
      if (!cur) {
        c++;
        continue;
      }
      let len = 1;
      while (c + len < COLS && g[r][c + len]?.type === cur) len++;
      if (len >= 3) for (let k = 0; k < len; k++) hits.add(`${r}:${c + k}`);
      c += len;
    }
  }
  // Vertical
  for (let c = 0; c < COLS; c++) {
    let r = 0;
    while (r < ROWS) {
      const cur = g[r][c]?.type;
      if (!cur) {
        r++;
        continue;
      }
      let len = 1;
      while (r + len < ROWS && g[r + len][c]?.type === cur) len++;
      if (len >= 3) for (let k = 0; k < len; k++) hits.add(`${r + k}:${c}`);
      r += len;
    }
  }
  return Array.from(hits).map((k) => k.split(":").map((n) => parseInt(n, 10)));
}

function stripAllMatches(g) {
  while (true) {
    const m = collectMatches(g);
    if (m.length === 0) break;
    for (const [r, c] of m) g[r][c].type = randomPiece();
  }
}

function hasAnyMove(g) {
  return !!findFirstMove(g);
}

function findFirstMove(g) {
  // try right/down swaps
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      if (c + 1 < COLS) {
        swapTypes(g, r, c, r, c + 1);
        const ok = collectMatches(g).length > 0;
        swapTypes(g, r, c, r, c + 1);
        if (ok) return [[r, c], [r, c + 1]];
      }
      if (r + 1 < ROWS) {
        swapTypes(g, r, c, r + 1, c);
        const ok = collectMatches(g).length > 0;
        swapTypes(g, r, c, r + 1, c);
        if (ok) return [[r, c], [r + 1, c]];
      }
    }
  }
  return null;
}

function ensureAnyMove(g) {
  if (!hasAnyMove(g)) shuffleToSolvable(g);
}

function shuffleToSolvable(g) {
  const flat = g.flat().map((cell) => cell.type);
  let tries = 0;
  while (tries++ < 100) {
    // Fisher-Yates
    for (let i = flat.length - 1; i > 0; i--) {
      const j = (Math.random() * (i + 1)) | 0;
      [flat[i], flat[j]] = [flat[j], flat[i]];
    }
    // write back
    let idx = 0;
    for (let r = 0; r < ROWS; r++)
      for (let c = 0; c < COLS; c++) g[r][c].type = flat[idx++];

    stripAllMatches(g);
    if (hasAnyMove(g)) return;
  }
}

function swapTypes(g, r1, c1, r2, c2) {
  const a = g[r1][c1].type;
  g[r1][c1].type = g[r2][c2].type;
  g[r2][c2].type = a;
}

async function tweenSwap(r1, c1, r2, c2) {
  const g = gridRef.current;
  const a = g[r1][c1];
  const b = g[r2][c2];
  const t0 = now();
  const ax0 = a.x,
    ay0 = a.y;
  const bx0 = b.x,
    by0 = b.y;
  const ax1 = c2 *  cellSizeRef.current + cellSizeRef.current / 2;
  const ay1 = r2 *  cellSizeRef.current + cellSizeRef.current / 2;
  const bx1 = c1 *  cellSizeRef.current + cellSizeRef.current / 2;
  const by1 = r1 *  cellSizeRef.current + cellSizeRef.current / 2;

  return new Promise((res) => {
    const run = () => {
      const t = now() - t0;
      const u = clamp(t / SWAP_MS, 0, 1);
      const e = easeInOut(u);
      a.x = ax0 + (ax1 - ax0) * e;
      a.y = ay0 + (ay1 - ay0) * e;
      b.x = bx0 + (bx1 - bx0) * e;
      b.y = by0 + (by1 - by0) * e;
      if (u < 1) requestAnimationFrame(run);
      else {
        // finalize swap of types
        swapTypes(g, r1, c1, r2, c2);
        // snap positions to their cells (velocity reset)
        snapCell(a, r2, c2);
        snapCell(b, r1, c1);
        res();
      }
    };
    run();
  });
}

function snapCell(cell, r, c) {
  const cx = c * cellSizeRef.current + cellSizeRef.current / 2;
  const cy = r * cellSizeRef.current + cellSizeRef.current / 2;
  cell.x = cx;
  cell.y = cy;
  cell.vx = 0;
  cell.vy = 0;
}

function clearWithFade(g, matchCells) {
  const until = now() + CLEAR_MS;
  for (const [r, c] of matchCells) {
    const cell = g[r][c];
    if (!cell) continue;
    cell.clearingUntil = until;
  }
}

function computeFalls(g) {
  // return array of { fromR, toR, c }
  const falls = [];
  for (let c = 0; c < COLS; c++) {
    let write = ROWS - 1;
    for (let r = ROWS - 1; r >= 0; r--) {
      if (g[r][c] && !g[r][c].clearingUntil) {
        if (write !== r) {
          falls.push({ fromR: r, toR: write, c });
        }
        write--;
      }
    }
  }
  return falls;
}

function animateFalls(g, falls) {
  // Move cells in data immediately; animate positions downwards
  for (const f of falls) {
    for (let r = f.fromR; r >= 0; r--) {
      if (g[r][f.c] && !g[r][f.c].clearingUntil) {
        // bubble down to next empty above write
      }
    }
  }
  // Actually perform a standard gravity compacting:
  for (let c = 0; c < COLS; c++) {
    let write = ROWS - 1;
    for (let r = ROWS - 1; r >= 0; r--) {
      const cell = g[r][c];
      if (cell && !cell.clearingUntil) {
        if (write !== r) {
          g[write][c] = cell;
          g[r][c] = null;
        }
        write--;
      }
    }
    for (; write >= 0; write--) g[write][c] = null;
  }

  // Animate motion by snapping targets and letting update() spring to them.
  return sleep(240);
}

function refillSpawnPlan(g) {
  const spawns = [];
  for (let r = 0; r < ROWS; r++)
    for (let c = 0; c < COLS; c++)
      if (!g[r][c]) spawns.push({ r, c });
  return spawns;
}

function animateSpawns(g, spawns) {
  const sz = cellSizeRef.current;
  for (const { r, c } of spawns) {
    const cell = makeCell(randomPiece(), r, c, false);
    // spawn above
    cell.x = c * sz + sz / 2;
    cell.y = (r * sz + sz / 2) - Math.random() * 120 - 60;
    cell.vx = 0; cell.vy = 0; cell.alpha = 0.0; cell.s = 0.9;
    g[r][c] = cell;
    // tween alpha in
    const t0 = now();
    const dur = 160;
    const tick = () => {
      const u = clamp((now() - t0) / dur, 0, 1);
      cell.alpha = 0.2 + 0.8 * u;
      cell.s = 0.9 + 0.1 * u;
      if (u < 1) requestAnimationFrame(tick);
    };
    tick();
  }
  // let gravity settle them
  return sleep(260);
}

function flashHint(g, move) {
  if (!move) return;
  const [[r1, c1], [r2, c2]] = move;
  const a = g[r1][c1];
  const b = g[r2][c2];
  a.highlight = b.highlight = true;
  setTimeout(() => {
    a.highlight = b.highlight = false;
  }, 900);
}

// ---------- Small utils ----------
function sleep(ms) {
  return new Promise((res) => setTimeout(res, ms));
}

function roundRect(ctx, x, y, w, h, r) {
  const rr = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.closePath();
}

function easeInOut(t) {
  return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
}
