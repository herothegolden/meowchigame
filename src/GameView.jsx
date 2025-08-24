// src/GameView.jsx
import React, { useEffect, useRef, useState } from "react";

/** ---------- Board + Gameplay constants (mechanics unchanged) ---------- */
const COLS = 8;             // restore classic size to avoid CSS/layout surprises
const ROWS = 8;
const CELL_MIN = 36;
const CELL_MAX = 88;
const GAME_DURATION = 60;   // seconds
const EMOJI_SIZE = 0.86;

const CANDY_SET = ["😺", "🥨", "🍓", "🍪", "🍡"];
const randEmoji = () => CANDY_SET[Math.floor(Math.random() * CANDY_SET.length)];

/** ---------- Coin economy (single formula, client mirrors server for Pending) ---------- */
const DEFAULT_COIN_CONF = { RATE: 8, MIN: 10, CAP: null, MULT: 1 };
function coinsFor(S, conf = DEFAULT_COIN_CONF) {
  const rate = Number(conf.RATE ?? DEFAULT_COIN_CONF.RATE);
  const min  = Number(conf.MIN  ?? DEFAULT_COIN_CONF.MIN);
  const cap  = conf.CAP == null ? null : Number(conf.CAP);
  const mult = Number(conf.MULT ?? DEFAULT_COIN_CONF.MULT);
  const base = Math.floor((mult * Math.max(0, S || 0)) / Math.max(1, rate));
  const withMin = Math.max(min, base);
  return cap ? Math.min(withMin, cap) : withMin;
}

/** Utility helpers */
const key = (r, c) => `${r}:${c}`;
const inside = (r, c) => r >= 0 && c >= 0 && r < ROWS && c < COLS;

/** Create an initial grid with no immediate matches (so first move is meaningful) */
function initSolvableGrid() {
  const grid = Array.from({ length: ROWS }, () =>
    Array.from({ length: COLS }, () => randEmoji())
  );
  // remove accidental runs of 3+ in initial board
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      if (willFormRun(grid, r, c)) {
        let tries = 0;
        let e;
        do {
          e = randEmoji();
          tries++;
        } while (tries < 20 && e === grid[r][c]);
        grid[r][c] = e;
      }
    }
  }
  return grid;
}
function willFormRun(grid, r, c) {
  const e = grid[r][c];
  // horizontal
  const left1 = c > 0 && grid[r][c - 1] === e;
  const left2 = c > 1 && grid[r][c - 2] === e;
  const right1 = c + 1 < COLS && grid[r][c + 1] === e;
  const right2 = c + 2 < COLS && grid[r][c + 2] === e;
  if ((left1 && left2) || (left1 && right1) || (right1 && right2)) return true;
  // vertical
  const up1 = r > 0 && grid[r - 1][c] === e;
  const up2 = r > 1 && grid[r - 2][c] === e;
  const down1 = r + 1 < ROWS && grid[r + 1][c] === e;
  const down2 = r + 2 < ROWS && grid[r + 2][c] === e;
  if ((up1 && up2) || (up1 && down1) || (down1 && down2)) return true;
  return false;
}

/** Find all matches (3+ in a row/col). Returns array of groups; each group is array of [r,c] */
function findMatches(grid) {
  const seen = new Set();
  const groups = [];

  // horizontal
  for (let r = 0; r < ROWS; r++) {
    let c = 0;
    while (c < COLS) {
      const e = grid[r][c];
      if (!e) { c++; continue; }
      let c2 = c + 1;
      while (c2 < COLS && grid[r][c2] === e) c2++;
      const run = c2 - c;
      if (run >= 3) {
        const group = [];
        for (let cc = c; cc < c2; cc++) {
          const k = key(r, cc);
          if (!seen.has(k)) { seen.add(k); group.push([r, cc]); }
        }
        groups.push(group);
      }
      c = c2;
    }
  }
  // vertical
  for (let c = 0; c < COLS; c++) {
    let r = 0;
    while (r < ROWS) {
      const e = grid[r][c];
      if (!e) { r++; continue; }
      let r2 = r + 1;
      while (r2 < ROWS && grid[r2][c] === e) r2++;
      const run = r2 - r;
      if (run >= 3) {
        const group = [];
        for (let rr = r; rr < r2; rr++) {
          const k = key(rr, c);
          if (!seen.has(k)) { seen.add(k); group.push([rr, c]); }
        }
        groups.push(group);
      }
      r = r2;
    }
  }
  return groups;
}

/** Apply gravity: move non-empty cells down and refill from top */
function applyGravity(grid) {
  for (let c = 0; c < COLS; c++) {
    let write = ROWS - 1;
    for (let r = ROWS - 1; r >= 0; r--) {
      if (grid[r][c]) {
        grid[write][c] = grid[r][c];
        write--;
      }
    }
    for (let r = write; r >= 0; r--) {
      grid[r][c] = randEmoji();
    }
  }
}

/** Swap two cells in-place */
function swapCells(grid, a, b) {
  const tmp = grid[a.r][a.c];
  grid[a.r][a.c] = grid[b.r][b.c];
  grid[b.r][b.c] = tmp;
}

/** Returns true if a swap produces at least one match */
function isValidSwap(grid, a, b) {
  swapCells(grid, a, b);
  const ok = findMatches(grid).length > 0;
  swapCells(grid, a, b);
  return ok;
}

export default function GameView({ onExit, onCoins, settings, userTelegramId }) {
  const containerRef = useRef(null);
  const [cell, setCell] = useState(48);

  // Core game state
  const [grid, setGrid] = useState(() => initSolvableGrid());
  const gridRef = useRef(grid); gridRef.current = grid;

  const [sel, setSel] = useState(null);
  const [score, setScore] = useState(0);
  const [moves, setMoves] = useState(20);
  const [combo, setCombo] = useState(0);
  const [timeLeft, setTimeLeft] = useState(GAME_DURATION);
  const gameStartRef = useRef(Date.now());
  const [moveCount, setMoveCount] = useState(0);
  const [maxCombo, setMaxCombo] = useState(0);

  // Pending coins (mirrors server config)
  const [coinConf, setCoinConf] = useState(DEFAULT_COIN_CONF);
  useEffect(() => {
    let active = true;
    fetch("/api/config").then(r => r.ok ? r.json() : null)
      .then(j => { if (active && j?.coins) setCoinConf(j.coins); })
      .catch(() => {});
    return () => { active = false; };
  }, []);

  // Responsive cell sizing
  useEffect(() => {
    const compute = () => {
      const el = containerRef.current;
      if (!el) return;
      const pad = 16;
      const w = el.clientWidth - pad * 2;
      const h = el.clientHeight - 120; // header + padding
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
      if (ro) ro.disconnect();
      window.removeEventListener("resize", compute);
    };
  }, []);

  // Timer
  useEffect(() => {
    if (timeLeft <= 0) return;
    const id = setInterval(() => setTimeLeft(t => t - 1), 1000);
    return () => clearInterval(id);
  }, [timeLeft]);
  useEffect(() => {
    if (timeLeft <= 0) {
      finish();
    }
  }, [timeLeft]); // eslint-disable-line

  /** Resolve the whole cascade from current grid (after a valid swap) */
  async function resolveCascade() {
    let localCombo = 0;
    let gained = 0;
    let any = false;

    // loop until no matches
    while (true) {
      const groups = findMatches(gridRef.current);
      if (!groups.length) break;
      any = true;

      // score for this step
      const toClear = new Set();
      let m = 0;
      for (const g of groups) {
        m += g.length;
        for (const [r, c] of g) toClear.add(key(r, c));
      }
      const stepPoints = 10 * m * (localCombo + 1);
      gained += stepPoints;
      setScore(s => s + stepPoints);
      setCombo(localCombo);
      if (localCombo + 1 > maxCombo) setMaxCombo(localCombo + 1);

      // clear
      const g2 = gridRef.current.map(row => row.slice());
      for (const k of toClear) {
        const [r, c] = k.split(":").map(Number);
        g2[r][c] = null;
      }
      // gravity + refill
      applyGravity(g2);
      gridRef.current = g2;
      setGrid(g2);

      localCombo++;
      await new Promise(r => setTimeout(r, 120)); // small delay so UI breathes
    }

    // move bookkeeping
    if (any) setMoves(m => Math.max(0, m - 1));
    setCombo(0);
  }

  /** Handle a swap attempt between two adjacent cells */
  async function attemptSwap(a, b) {
    if (!inside(a.r, a.c) || !inside(b.r, b.c)) return;
    if (moves <= 0 || timeLeft <= 0) return;

    const g = gridRef.current.map(row => row.slice());
    if (!isValidNeighbor(a, b)) return;

    // only accept swaps that produce matches
    if (!isValidSwap(g, a, b)) {
      // quick shake feedback
      setSel(null);
      return;
    }
    swapCells(g, a, b);
    gridRef.current = g;
    setGrid(g);
    setSel(null);
    setMoveCount(n => n + 1);
    await resolveCascade();
  }

  function isValidNeighbor(a, b) {
    const dr = Math.abs(a.r - b.r);
    const dc = Math.abs(a.c - b.c);
    return (dr === 1 && dc === 0) || (dr === 0 && dc === 1);
  }

  /** Finish the game: send score; server credits coins; return to parent */
  async function finish() {
    // prevent multiple calls
    if (finish._done) return;
    finish._done = true;

    const finalScore = Math.max(0, score);
    const payload = {
      telegram_id: userTelegramId,
      score: finalScore,
      moves_used: Math.max(1, moveCount),
      max_combo: maxCombo,
      game_duration: Math.floor((Date.now() - gameStartRef.current) / 1000),
    };

    let credited = coinsFor(finalScore, coinConf); // preview fallback
    try {
      const res = await fetch("/api/game/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (res.ok && data?.game?.coins_earned != null) {
        credited = Number(data.game.coins_earned);
      } else {
        console.warn("Game save not OK:", data?.error);
      }
    } catch (e) {
      console.warn("Network error saving game:", e);
    }

    onExit?.({
      score: finalScore,
      coins: credited,
      moves_used: Math.max(1, moveCount),
      max_combo: maxCombo,
      duration: Math.floor((Date.now() - gameStartRef.current) / 1000),
    });
  }

  /** Input handling: tap or drag to pick a neighbor */
  const dragStart = useRef(null);
  function onCellPointerDown(r, c, e) {
    e.preventDefault();
    dragStart.current = { r, c, x: e.clientX ?? e.touches?.[0]?.clientX, y: e.clientY ?? e.touches?.[0]?.clientY };
    setSel({ r, c });
  }
  function onCellPointerUp(r, c, e) {
    e.preventDefault();
    if (!dragStart.current) return;
    const start = dragStart.current;
    const dx = (e.clientX ?? e.changedTouches?.[0]?.clientX) - start.x;
    const dy = (e.clientY ?? e.changedTouches?.[0]?.clientY) - start.y;
    const absx = Math.abs(dx), absy = Math.abs(dy);
    let target = { r, c };
    if (Math.max(absx, absy) > 10) {
      if (absx > absy) target = { r, c: c + (dx > 0 ? 1 : -1) };
      else target = { r: r + (dy > 0 ? 1 : -1), c };
    } else if (sel && sel.r === r && sel.c === c) {
      // second tap selects neighbor? noop – keep simple
      dragStart.current = null;
      return;
    }
    dragStart.current = null;
    attemptSwap({ r, c }, target);
  }
  function onCellPointerLeave() {
    // do nothing; swap on release
  }

  // Back to home when moves or time end (auto-finish)
  useEffect(() => {
    if (moves <= 0) finish();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [moves]);

  /** --------- Render UI --------- */
  // inline sizes to match existing CSS variables
  const cellPx = `${cell}px`;
  const boardStyle = {
    display: "grid",
    gridTemplateColumns: `repeat(${COLS}, ${cellPx})`,
    gridTemplateRows: `repeat(${ROWS}, ${cellPx})`,
    gap: "6px",
    justifyContent: "center",
    touchAction: "none"
  };

  return (
    <div className="section board-wrap" ref={containerRef}>
      {/* HUD */}
      <div className="row" style={{justifyContent: "space-between"}}>
        <div><span className="muted">Score</span> <b>{score}</b></div>
        <div><span className="muted">Moves</span> <b>{moves}</b></div>
        <div><span className="muted">Combo</span> <b>{combo > 0 ? `x${combo+1}` : "-"}</b></div>
        <div><span className="muted">$Meow (pending)</span> <b>{coinsFor(score, coinConf)}</b></div>
        <div><span className="muted">Time</span> <b>{timeLeft}s</b></div>
      </div>

      {/* Combo banner */}
      {combo > 0 && (
        <div className="combo-celebration" style={{left: "50%", transform: "translateX(-50%)"}}>
          💥 🍬 Sweet Combo x{combo + 1}! 🍬 💥
        </div>
      )}

      {/* Board */}
      <div className="board" style={boardStyle}>
        {grid.map((row, r) =>
          row.map((e, c) => (
            <div
              key={key(r, c)}
              className={`cell ${sel && sel.r === r && sel.c === c ? "selected" : ""}`}
              style={{ 
                width: cellPx, height: cellPx, 
                fontSize: `${Math.floor(cell * EMOJI_SIZE)}px`, 
                display: "flex", alignItems: "center", justifyContent: "center",
                userSelect: "none", cursor: "pointer", background: "var(--card)",
                borderRadius: "12px", boxShadow: "0 1px 0 rgba(0,0,0,0.08)",
              }}
              onPointerDown={(e) => onCellPointerDown(r, c, e)}
              onPointerUp={(e) => onCellPointerUp(r, c, e)}
              onTouchStart={(e) => onCellPointerDown(r, c, e)}
              onTouchEnd={(e) => onCellPointerUp(r, c, e)}
              onPointerLeave={onCellPointerLeave}
            >
              <span>{e}</span>
            </div>
          ))
        )}
      </div>

      {/* Controls */}
      <div className="row" style={{marginTop: 12, gap: 8, justifyContent: "center"}}>
        <button className="btn" onClick={() => finish()}>Finish</button>
        <button className="btn" onClick={() => {
          // reset
          setGrid(initSolvableGrid());
          gridRef.current = initSolvableGrid();
          setScore(0); setMoves(20); setCombo(0);
          setTimeLeft(GAME_DURATION);
          gameStartRef.current = Date.now();
          setMoveCount(0); setMaxCombo(0);
        }}>Reset</button>
      </div>
    </div>
  );
}
