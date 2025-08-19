import React, { useEffect, useRef, useState } from "react";

/**
 * GameView contains the full Match-3 game exactly as before,
 * just moved out of App.jsx so App stays small and less error-prone.
 * Nothing about mechanics/behavior has changed.
 */

const COLS = 8;
const ROWS = 8;
const CELL_MIN = 36;
const CELL_MAX = 88;
const CANDY_SET = ["😺", "🥨", "🍓", "🍪", "🍡"];
const randEmoji = () => CANDY_SET[Math.floor(Math.random() * CANDY_SET.length)];

export default function GameView({ onExit, onCoins, settings }) {
  const containerRef = useRef(null);
  const boardRef = useRef(null);
  const [cell, setCell] = useState(48);
  useResizeCell(containerRef, setCell);

  // Board state
  const [grid, setGrid] = useState(() => initSolvableGrid());
  const gridRef = useRef(grid);
  gridRef.current = grid;

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

  function haptic(ms = 12) {
    if (!settings?.haptics) return;
    try { navigator.vibrate?.(ms); } catch {}
  }

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
    if (matches.length === 0) {
      haptic(8);
      setSel({ r: r1, c: c1 });
      setTimeout(() => setSel(null), 120);
      return;
    }
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

/* ------------ helpers & hook (same mechanics as before) ------------ */
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
      const h = el.clientHeight - 84;
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
