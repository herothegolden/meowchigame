import React, { useEffect, useRef, useState } from "react";

/* -------------------------------------------------
   Candy‑Cats (Canvas) — Oreo/Strawberry/Pretzel theme
   ✔ Drag to swap (touch & mouse)
   ✔ Visible: swap tween → clear fade → gravity fall → refill → cascades
   ✔ Level 1: 6×6, 20 moves, target 1000
   ✔ No horizontal scroll
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

// Visuals
const BG = "#0f1533";
const GRID_LINE = "rgba(122,162,255,.25)";
const TILE_BG = "#151b46";
const TILE_HL = "#1a2260";
const TILE_BORDER = "#26307a";

// Timings
const SWAP_MS = 140;
const CLEAR_MS = 180;
const CASCADE_DELAY_MS = 90;

// Utils
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const now = () => performance.now();
const easeInOut = (t) => (t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t);

// ---------- Root shell ----------
export default function App() {
  // inject minimal UI CSS once
  useEffect(() => {
    const style = document.createElement("style");
    style.innerHTML = `
      :root { --line:#243069; }
      html, body, #root { height:100%; }
      body { margin:0; background:#0a0f23; color:#fff; font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial; overflow-x:hidden; }
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
        {screen !== "home" && (
          <button className="btn" onClick={() => setScreen("home")}>
            Home
          </button>
        )}
      </div>
    );
  }

  function Home() {
    return (
      <div className="section" style={{ display: "grid", gap: 10 }}>
        <div className="title">Match‑3 with cats & treats</div>
        <div className="muted">
          Drag a tile toward a neighbor to swap. Make 3+ in a row/col to clear;
          watch them pop and fall!
        </div>
        <button className="btn primary" onClick={() => setScreen("game")}>
          ▶️ Play Level 1
        </button>
      </div>
    );
  }

  function GameOver() {
    return (
      <div className="section" style={{ display: "grid", gap: 10 }}>
        <div className="title">Level Over</div>
        <div className="row">
          <div className="muted">Score</div>
          <b>{lastRun.score}</b>
        </div>
        <div className="row">
          <div className="muted">Result</div>
          <b style={{ color: lastRun.win ? "#7CFC7C" : "#ffb4a2" }}>
            {lastRun.win ? "Win" : "Try Again"}
          </b>
        </div>
        <div className="row" style={{ gap: 8 }}>
          <button className="btn primary" onClick={() => setScreen("game")}>
            Play again
          </button>
          <button className="btn" onClick={() => setScreen("home")}>
            Home
          </button>
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

  // board state
  const gridRef = useRef(makeGridFromLayout(LEVEL1_LAYOUT)); // cells with anim state
  const cellSizeRef = useRef(60);
  const boardPxRef = useRef({ w: 0, h: 0 });

  // dragging state (kept simple and robust)
  const dragRef = useRef({
    active: false,
    r: -1,
    c: -1,
    startX: 0,
    startY: 0,
    lastX: 0,
    lastY: 0,
  });

  const busyRef = useRef(false); // block input during animations

  // init + sizing + listeners
  useEffect(() => {
    const canvas = canvRef.current;
    const resize = () => {
      const wrap = wrapRef.current;
      if (!wrap || !canvas) return;
      const availW = wrap.clientWidth - 2;
      const availH = Math.max(260, wrap.clientHeight - 200);
      const cs = Math.floor(Math.min(availW / COLS, availH / ROWS));
      cellSizeRef.current = clamp(cs, 44, 80);
      const w = COLS * cellSizeRef.current;
      const h = ROWS * cellSizeRef.current;
      boardPxRef.current = { w, h };
      const dpr = window.devicePixelRatio || 1;
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
      canvas.width = Math.floor(w * dpr);
      canvas.height = Math.floor(h * dpr);
    };
    resize();
    const ro = new ResizeObserver(resize);
    wrapRef.current && ro.observe(wrapRef.current);
    window.addEventListener("resize", resize);

    // sanitize board: no auto‑clear and at least one move
    stripAllMatches(gridRef.current);
    ensureAnyMove(gridRef.current);

    startLoop();

    // ---- Pointer input (fixed) ----
    const rcFromCanvas = (e) => {
      const rect = canvas.getBoundingClientRect();
      const x = Math.max(0, Math.min(rect.width - 1, e.clientX - rect.left));
      const y = Math.max(0, Math.min(rect.height - 1, e.clientY - rect.top));
      const cs = cellSizeRef.current;
      const c = Math.floor(x / cs);
      const r = Math.floor(y / cs);
      return { r, c, x, y };
    };

    const onDown = (e) => {
      if (hud.paused || busyRef.current) return;
      const p = rcFromCanvas(e);
      if (!inBounds(p.r, p.c)) return;
      dragRef.current = {
        active: true,
        r: p.r,
        c: p.c,
        startX: p.x,
        startY: p.y,
        lastX: p.x,
        lastY: p.y,
      };
      canvas.setPointerCapture?.(e.pointerId); // keep pointer events on canvas
    };

    const onMove = (e) => {
      if (!dragRef.current.active) return;
      const p = rcFromCanvas(e);
      dragRef.current.lastX = p.x;
      dragRef.current.lastY = p.y;
    };

    const onUp = async (e) => {
      if (!dragRef.current.active) return;
      const d = dragRef.current;
      dragRef.current.active = false;
      if (hud.paused || busyRef.current) return;

      const dx = d.lastX - d.startX;
      const dy = d.lastY - d.startY;
      const threshold = Math.max(12, cellSizeRef.current * 0.22);

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

    const onCancel = () => {
      dragRef.current.active = false;
    };

    canvas.addEventListener("pointerdown", onDown);
    canvas.addEventListener("pointermove", onMove);
    canvas.addEventListener("pointerup", onUp);
    canvas.addEventListener("pointercancel", onCancel);

    return () => {
      cancelAnimationFrame(_raf);
      ro.disconnect();
      window.removeEventListener("resize", resize);
      canvas.removeEventListener("pointerdown", onDown);
      canvas.removeEventListener("pointermove", onMove);
      canvas.removeEventListener("pointerup", onUp);
      canvas.removeEventListener("pointercancel", onCancel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hud.paused]);

  // --------------- Main loop ---------------
  let _raf = 0;
  function startLoop() {
    let last = 0;
    const step = (t) => {
      const dt = last ? Math.min(48, t - last) : 16;
      last = t;
      update(dt);
      draw();
      _raf = requestAnimationFrame(step);
    };
    _raf = requestAnimationFrame(step);
  }

  function update() {
    const g = gridRef.current;
    const cs = cellSizeRef.current;

    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        const cell = g[r][c];
        if (!cell) continue;

        // spring toward its grid center
        const tx = c * cs + cs / 2;
        const ty = r * cs + cs / 2;
        const k = 0.18;
        cell.vx += (tx - cell.x) * k;
        cell.vy += (ty - cell.y) * k;
        cell.x += cell.vx * 0.12;
        cell.y += cell.vy * 0.12;
        cell.vx *= 0.5;
        cell.vy *= 0.5;

        // fade while clearing
        if (cell.clearingUntil) {
          const rem = clamp((cell.clearingUntil - now()) / CLEAR_MS, 0, 1);
          cell.alpha = rem;
          cell.s = 0.9 + 0.1 * rem;
          if (rem <= 0) g[r][c] = null;
        }
      }
    }
  }

  function draw() {
    const canvas = canvRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const dpr = window.devicePixelRatio || 1;
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
    const cs = cellSizeRef.current;
    for (let r = 0; r <= ROWS; r++) {
      const y = r * cs + 0.5;
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
    }
    for (let c = 0; c <= COLS; c++) {
      const x = c * cs + 0.5;
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

        const size = cs * (cell.s ?? 1);
        const half = size / 2;

        ctx.save();
        ctx.globalAlpha = 0.95 * (cell.alpha ?? 1);

        roundRect(ctx, cell.x - half, cell.y - half, size, size, 12);
        ctx.fillStyle = cell.highlight ? TILE_HL : TILE_BG;
        ctx.fill();
        ctx.strokeStyle = TILE_BORDER;
        ctx.stroke();

        ctx.font = `${Math.floor(size * 0.72)}px system-ui, Apple Color Emoji, Noto Color Emoji, Segoe UI Emoji`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(EMOJI[cell.type] || "❓", cell.x, cell.y);
        ctx.restore();
      }
    }

    // drag highlight
    if (dragRef.current.active) {
      const { r, c } = dragRef.current;
      if (inBounds(r, c)) {
        ctx.save();
        ctx.strokeStyle = "#7aa2ff";
        ctx.lineWidth = 2;
        ctx.strokeRect(c * cs + 2, r * cs + 2, cs - 4, cs - 4);
        ctx.restore();
      }
    }
  }

  // --------------- Actions ---------------
  async function attemptSwap(r1, c1, r2, c2) {
    if (hud.moves <= 0) return;
    if (Math.abs(r1 - r2) + Math.abs(c1 - c2) !== 1) return;
    const g = gridRef.current;
    if (!g[r1][c1] || !g[r2][c2]) return;

    busyRef.current = true;

    // animate swap (tween positions, then swap types)
    await tweenSwap(g, r1, c1, r2, c2);

    // evaluate
    let matched = collectMatches(g);
    if (matched.length === 0) {
      // swap back if invalid
      await tweenSwap(g, r1, c1, r2, c2);
      busyRef.current = false;
      return;
    }

    setHud((h) => ({ ...h, moves: h.moves - 1 }));

    // cascades
    let combo = 0;
    while (matched.length > 0) {
      combo++;
      addScore(10 * matched.length * combo);

      // mark for fade
      clearWithFade(g, matched);
      await sleep(CLEAR_MS);

      // compact (gravity) and show falling via springs
      compactGravity(g); // data moves immediately; update() animates to targets
      await sleep(240);

      // refill from top (spawn above, fade in)
      spawnRefill(g);
      await sleep(260);

      matched = collectMatches(g);
      if (matched.length > 0) await sleep(CASCADE_DELAY_MS);
    }

    // end?
    const nextMoves = hud.moves - 1;
    if (nextMoves <= 0) {
      const win = hud.score >= OBJECTIVE_SCORE;
      onExit({ score: hud.score, win });
    }
    busyRef.current = false;
  }

  function addScore(pts) {
    setHud((h) => ({
      ...h,
      score: h.score + pts,
      combo: Math.min(9, (h.combo ?? 0) + 1),
    }));
    setTimeout(() => setHud((h) => ({ ...h, combo: 0 })), 900);
  }

  // HUD controls
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

  // layout sizes (for initial mount)
  const { w, h } = boardPxRef.current;

  return (
    <div className="section" style={{ display: "grid", gap: 10 }}>
      <div className="row">
        <button className="btn" onClick={onBack}>
          Back
        </button>
        <div className="muted">
          Drag a tile toward a neighbor to swap. Score {OBJECTIVE_SCORE} in {MOVES} moves.
        </div>
      </div>

      <div className="row">
        <div>
          <span className="muted">Score</span> <b>{hud.score}</b>
        </div>
        <div>
          <span className="muted">Moves</span> <b>{hud.moves}</b>
        </div>
        <div>
          <span className="muted">Combo</span>{" "}
          <b>{hud.combo > 0 ? `x${hud.combo + 1}` : "-"}</b>
        </div>
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

// ---------- Board / animation helpers ----------
function makeCell(type, r, c, cs, spawnAbove = false) {
  const x = c * cs + cs / 2;
  const y = r * cs + cs / 2;
  return {
    type,
    x,
    y: spawnAbove ? y - (Math.random() * 120 + 60) : y,
    vx: 0,
    vy: 0,
    s: spawnAbove ? 0.9 : 1,
    alpha: spawnAbove ? 0.2 : 1,
    clearingUntil: 0,
    highlight: false,
  };
}

function makeGridFromLayout(layout) {
  // we don't know cell size yet during data init; it gets snapped during update()
  const cs = 60;
  const g = Array.from({ length: ROWS }, (_, r) =>
    Array.from({ length: COLS }, (_, c) =>
      makeCell(layout[r][c] ?? randomPiece(), r, c, cs, false)
    )
  );
  return g;
}

function randomPiece() {
  return POOL[(Math.random() * POOL.length) | 0];
}

function inBounds(r, c) {
  return r >= 0 && r < ROWS && c >= 0 && c < COLS;
}

function collectMatches(g) {
  const hits = new Set();
  // horizontal
  for (let r = 0; r < ROWS; r++) {
    let c = 0;
    while (c < COLS) {
      const t = g[r][c]?.type;
      if (!t) { c++; continue; }
      let len = 1;
      while (c + len < COLS && g[r][c + len]?.type === t) len++;
      if (len >= 3) for (let k = 0; k < len; k++) hits.add(`${r}:${c + k}`);
      c += len;
    }
  }
  // vertical
  for (let c = 0; c < COLS; c++) {
    let r = 0;
    while (r < ROWS) {
      const t = g[r][c]?.type;
      if (!t) { r++; continue; }
      let len = 1;
      while (r + len < ROWS && g[r + len][c]?.type === t) len++;
      if (len >= 3) for (let k = 0; k < len; k++) hits.add(`${r + k}:${c}`);
      r += len;
    }
  }
  return Array.from(hits).map((k) => k.split(":").map((n) => parseInt(n, 10)));
}

function stripAllMatches(g) {
  // replace pieces until no instantaneous matches
  while (true) {
    const m = collectMatches(g);
    if (m.length === 0) break;
    for (const [r, c] of m) g[r][c].type = randomPiece();
  }
}

function findFirstMove(g) {
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
  if (!findFirstMove(g)) shuffleToSolvable(g);
}

function shuffleToSolvable(g) {
  const flat = g.flat().map((cell) => cell.type);
  let tries = 0;
  while (tries++ < 100) {
    for (let i = flat.length - 1; i > 0; i--) {
      const j = (Math.random() * (i + 1)) | 0;
      [flat[i], flat[j]] = [flat[j], flat[i]];
    }
    let idx = 0;
    for (let r = 0; r < ROWS; r++)
      for (let c = 0; c < COLS; c++)
        g[r][c].type = flat[idx++];
    stripAllMatches(g);
    if (findFirstMove(g)) return;
  }
}

function swapTypes(g, r1, c1, r2, c2) {
  const a = g[r1][c1].type;
  g[r1][c1].type = g[r2][c2].type;
  g[r2][c2].type = a;
}

async function tweenSwap(g, r1, c1, r2, c2) {
  const a = g[r1][c1];
  const b = g[r2][c2];
  const cs = (typeof window !== "undefined" ? window : {}).cellSizeRef?.current || 0; // not used directly
  const ax0 = a.x, ay0 = a.y;
  const bx0 = b.x, by0 = b.y;
  const ax1 = b.x, ay1 = b.y;
  const bx1 = a.x, by1 = a.y;
  const t0 = now();

  return new Promise((res) => {
    const run = () => {
      const u = clamp((now() - t0) / SWAP_MS, 0, 1);
      const e = easeInOut(u);
      a.x = ax0 + (ax1 - ax0) * e;
      a.y = ay0 + (ay1 - ay0) * e;
      b.x = bx0 + (bx1 - bx0) * e;
      b.y = by0 + (by1 - by0) * e;
      if (u < 1) {
        requestAnimationFrame(run);
      } else {
        swapTypes(g, r1, c1, r2, c2);
        res();
      }
    };
    run();
  });
}

function clearWithFade(g, matched) {
  const until = now() + CLEAR_MS;
  for (const [r, c] of matched) {
    const cell = g[r][c];
    if (cell) cell.clearingUntil = until;
  }
}

function compactGravity(g) {
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
}

function spawnRefill(g) {
  // spawn new cells above, they will fall via springs in update()
  const cs = 60; // initial snap (the spring will move them to real centers)
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      if (!g[r][c]) g[r][c] = makeCell(randomPiece(), r, c, cs, true);
    }
  }
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

function sleep(ms) {
  return new Promise((res) => setTimeout(res, ms));
}
