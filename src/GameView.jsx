import React, { useEffect, useRef, useState } from "react";

/**
 * ENHANCED GameView with Backend Integration
 * - Preserves ALL existing game mechanics
 * - Adds game completion tracking
 * - Integrates with leaderboard system
 */

const COLS = 8;
const ROWS = 8;
const CELL_MIN = 36;
const CELL_MAX = 88;

// Tune this to adjust emoji size relative to the cell.
const EMOJI_SIZE = 0.86;

// Your emojis
const CANDY_SET = ["😺", "🥨", "🍓", "🍪", "🡠"];
const randEmoji = () => CANDY_SET[Math.floor(Math.random() * CANDY_SET.length)];

export default function GameView({ onExit, onCoins, settings, userTelegramId }) {
  const containerRef = useRef(null);
  const boardRef = useRef(null);
  const [cell, setCell] = useState(48);
  useResizeCell(containerRef, setCell);

  // Board state
  const [grid, setGrid] = useState(() => initSolvableGrid());
  const gridRef = useRef(grid);
  gridRef.current = grid;

  // Selection / hint / swap
  const [sel, setSel] = useState(null);
  const [hint, setHint] = useState(null);
  const [swapping, setSwapping] = useState(null);

  // Score / moves / combo FX
  const [score, setScore] = useState(0);
  const [moves, setMoves] = useState(20);
  const [combo, setCombo] = useState(0);
  const [fx, setFx] = useState([]);
  const [blast, setBlast] = useState(new Set());

  // Game tracking for backend
  const [gameStartTime, setGameStartTime] = useState(Date.now());
  const [moveCount, setMoveCount] = useState(0);
  const [maxComboAchieved, setMaxComboAchieved] = useState(0);

  // New tiles (for drop-in) + fall delay map (by distance)
  const [newTiles, setNewTiles] = useState(new Set());
  const [fallDelay, setFallDelay] = useState({}); // {"r-c": seconds}

  // Input/animation helpers
  const [paused, setPaused] = useState(false);
  const [animating, setAnimating] = useState(false); // lock input during cascades
  const animatingRef = useRef(animating); animatingRef.current = animating;

  // Press/invalid-swap feedback
  const [grabTile, setGrabTile] = useState(null); // {r,c} while pressed
  const [shake, setShake] = useState(new Set());  // tiles shaking after invalid swap

  const movesRef = useRef(moves); movesRef.current = moves;

  useEffect(() => { window.currentGameScore = score; }, [score]);

  // Track max combo achieved
  useEffect(() => {
    if (combo > maxComboAchieved) {
      setMaxComboAchieved(combo);
    }
  }, [combo, maxComboAchieved]);

  function haptic(ms = 12) {
    if (!settings?.haptics) return;
    try { navigator.vibrate?.(ms); } catch {}
  }

  // Submit game score to backend
  async function submitGameScore(finalScore, coinsEarned) {
    if (!userTelegramId) {
      console.log('No Telegram ID, skipping score submission');
      return { user_needs_profile: false };
    }

    try {
      const gameData = {
        telegram_id: userTelegramId,
        score: finalScore,
        coins_earned: coinsEarned,
        moves_used: moveCount,
        max_combo: maxComboAchieved,
        game_duration: Math.floor((Date.now() - gameStartTime) / 1000)
      };

      const response = await fetch('/api/game/complete', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(gameData)
      });

      const result = await response.json();
      
      if (!response.ok) {
        console.error('Score submission failed:', result.error);
        return { user_needs_profile: false };
      }

      console.log('Score submitted successfully:', result);
      return result;
    } catch (error) {
      console.error('Error submitting score:', error);
      return { user_needs_profile: false };
    }
  }

  // Pointer events (Telegram WebView friendly) – preserved
  useEffect(() => {
    const el = boardRef.current; if (!el || paused) return;
    let drag = null; const thresholdBase = 18;

    const rc = (e) => {
      const rect = el.getBoundingClientRect();
      const x = Math.max(0, Math.min(rect.width - 1, e.clientX - rect.left));
      const y = Math.max(0, Math.min(rect.height - 1, e.clientY - rect.top));
      return { r: Math.floor(y / cell), c: Math.floor(x / cell), x, y };
    };

    const down = (e) => {
      if (animatingRef.current) return; // lock during cascades
      el.setPointerCapture?.(e.pointerId);
      const p = rc(e); if (!inBounds(p.r, p.c)) return;
      drag = { r: p.r, c: p.c, x: p.x, y: p.y, dragging: false };
      setSel({ r: p.r, c: p.c });
      setGrabTile({ r: p.r, c: p.c });
      haptic(5);
    };

    const move = (e) => {
      if (!drag || animatingRef.current) return;
      const p = rc(e);
      const dx = p.x - drag.x, dy = p.y - drag.y;
      const threshold = Math.min(thresholdBase, Math.floor(cell * 0.35));
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
      if (!drag.dragging) {
        setSel({ r: drag.r, c: drag.c });
      } else {
        if (!animatingRef.current) {
          const horiz = Math.abs(dx) > Math.abs(dy);
          const tr = drag.r + (horiz ? 0 : (dy > 0 ? 1 : -1));
          const tc = drag.c + (horiz ? (dx > 0 ? 1 : -1) : 0);
          if (inBounds(tr, tc)) { trySwap(drag.r, drag.c, tr, tc); haptic(12); }
        }
        setSel(null);
      }
      drag = null;
      setGrabTile(null);
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
      // INVALID SWAP: shake both tiles briefly
      const s = new Set(shake);
      s.add(`${r1}-${c1}`); s.add(`${r2}-${c2}`);
      setShake(s);
      setTimeout(() => {
        setShake((prev) => {
          const n = new Set(prev);
          n.delete(`${r1}-${c1}`); n.delete(`${r2}-${c2}`);
          return n;
        });
      }, 220);
      haptic(8);
      setSel({ r: r1, c: c1 });
      setTimeout(() => setSel(null), 120);
      return;
    }

    // Valid swap - increment move count
    setMoveCount(prev => prev + 1);
    
    setSwapping({ from: { r: r1, c: c1 }, to: { r: r2, c: c2 } });
    // Let CSS animate swap; then commit the grid
    setTimeout(() => {
      setGrid(g); setSwapping(null); setMoves((m) => Math.max(0, m - 1));
      resolveCascades(g, () => { if (movesRef.current === 0) finish(); });
    }, 300);
  }

  // Cascade resolver – timing staged; input locked; distance-based fall delay computed
  function resolveCascades(start, done) {
    setAnimating(true);
    let g = cloneGrid(start); let comboCount = 0;

    const step = () => {
      const matches = findMatches(g);
      if (matches.length === 0) {
        setGrid(g); setNewTiles(new Set()); setFallDelay({});
        if (comboCount > 0) { setCombo(comboCount); haptic(15); setTimeout(() => setCombo(0), 1500); }
        ensureSolvable();
        setAnimating(false);
        done && done();
        return;
      }

      const keys = matches.map(([r, c]) => `${r}:${c}`);
      setBlast(new Set(keys));

      // FX points
      const fxId = Date.now() + Math.random();
      setFx((prev) => [
        ...prev,
        ...matches.map((m, i) => ({
          id: fxId + i + Math.random(),
          x: m[1] * cell,
          y: m[0] * cell
        }))
      ]);

      setScore((s) => s + 10 * matches.length * Math.max(1, comboCount + 1));
      onCoins(Math.ceil(matches.length / 4));

      // 1) Mark matches null in a copy (pop phase)
      matches.forEach(([r, c]) => { g[r][c] = null; });
      setGrid(cloneGrid(g)); // show holes so pop anim is clear
      setTimeout(() => setBlast(new Set()), 200); // let pop finish ~200ms

      // 2) Gravity + refill (after pop)
      setTimeout(() => {
        // Compute distance-based delays BEFORE gravity: how many nulls below each tile
        const delayMap = {};
        for (let c = 0; c < COLS; c++) {
          // Precompute cumulative nulls from bottom for speed
          const nullsBelow = new Array(ROWS).fill(0);
          let count = 0;
          for (let r = ROWS - 1; r >= 0; r--) {
            nullsBelow[r] = count;
            if (g[r][c] === null) count++;
          }
          // Each non-null will fall by `nullsBelow[r]` rows
          for (let r = ROWS - 1; r >= 0; r--) {
            if (g[r][c] != null) {
              const dist = nullsBelow[r]; // rows to fall
              const newR = r + dist;
              if (dist > 0) {
                // 0.03s per row, capped to 0.14s for snappiness
                delayMap[`${newR}-${c}`] = Math.min(0.14, dist * 0.03);
              }
            }
          }
        }

        // Apply gravity + refill
        applyGravity(g);
        const empties = new Set();
        for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) if (g[r][c] === null) empties.add(`${r}-${c}`);
        refill(g);

        setNewTiles(empties);       // new tiles get drop-in animation
        setFallDelay(delayMap);     // per-tile delay by actual distance
        setGrid(cloneGrid(g));      // left/top transitions + delays handle slide

        setTimeout(() => {
          setNewTiles(new Set());
          comboCount++;
          // Short cadence between cascade steps
          setTimeout(step, 140);
        }, 220);
      }, 200); // wait until pop visually completes
    };
    step();
  }

  function doHint() {
    if (animating) return;
    const m = findFirstMove(gridRef.current);
    if (!m) { shuffleBoard(); return; }
    setHint(m);
    setTimeout(() => setHint(null), 1200);
    haptic(10);
  }
  function shuffleBoard() { if (animating) return; const g = shuffleToSolvable(gridRef.current); setGrid(g); haptic(12); }
  function ensureSolvable() { if (!hasAnyMove(gridRef.current)) setGrid(shuffleToSolvable(gridRef.current)); }
  
  async function finish() {
    const finalCoins = Math.floor(score * 0.15);
    
    // Submit score to backend
    const result = await submitGameScore(score, finalCoins);
    
    onExit({ 
      score, 
      coins: finalCoins,
      moves_used: moveCount,
      max_combo: maxComboAchieved,
      user_needs_profile: result.user_needs_profile || false
    });
  }

  function resetGame() {
    if (animating) return;
    setGrid(initSolvableGrid());
    setScore(0);
    setMoves(20);
    setCombo(0);
    setSel(null);
    setHint(null);
    setSwapping(null);
    setFallDelay({});
    setNewTiles(new Set());
    
    // Reset game tracking
    setGameStartTime(Date.now());
    setMoveCount(0);
    setMaxComboAchieved(0);
  }

  const boardW = cell * COLS, boardH = cell * ROWS;

  return (
    <div className="section board-wrap" ref={containerRef}>
      <div className="row">
        <div><span className="muted">Score</span> <b>{score}</b></div>
        <div><span className="muted">Moves</span> <b>{moves}</b></div>
        <div><span className="muted">Combo</span> <b>{combo > 0 ? `x${combo + 1}` : "-"}</b></div>
      </div>

      <div ref={boardRef} className="board" style={{ width: boardW, height: boardH }}>
        <div
          className="gridlines"
          style={{
            backgroundImage:
              "linear-gradient(var(--line) 1px, transparent 1px), linear-gradient(90deg, var(--line) 1px, transparent 1px)",
            backgroundSize: `${cell}px ${cell}px`
          }}
        />
        {grid.map((row, r) =>
          row.map((v, c) => {
            const isSelected = sel && sel.r === r && sel.c === c;
            const isHinted =
              hint && ((hint[0][0] === r && hint[0][1] === c) || (hint[1][0] === r && hint[1][1] === c));
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
            const isSwapping =
              swapping &&
              ((swapping.from.r === r && swapping.from.c === c) ||
                (swapping.to.r === r && swapping.to.c === c));

            const tileKey = `${r}-${c}`;
            const isNewTile = newTiles.has(tileKey);
            const isGrab = grabTile && grabTile.r === r && grabTile.c === c;
            const isShake = shake.has(tileKey);

            // Distance-based stagger (no delay during swaps); default 0 if none
            const delaySeconds = isSwapping ? 0 : (fallDelay[tileKey] ?? 0);

            return (
              <div
                key={`tile-${r}-${c}`}
                className={
                  `tile ${isSelected ? "sel" : ""} ${isHinted ? "hint" : ""} ${isSwapping ? "swapping" : ""} ${isBlasting ? "blasting" : ""} ${isNewTile ? "drop-in" : ""} ${isGrab ? "grab" : ""} ${isShake ? "shake" : ""}`
                }
                style={{
                  left: c * cell,
                  top: r * cell,
                  width: cell,
                  height: cell,
                  transform: swapTransform || undefined,
                  zIndex: isBlasting ? 10 : (isSwapping ? 20 : 1),
                  transitionDelay: `${delaySeconds}s`,
                }}
              >
                <span
                  className="tile-emoji"
                  style={{ fontSize: Math.floor(cell * EMOJI_SIZE), lineHeight: 1 }}
                >
                  {v}
                </span>
              </div>
            );
          })
        )}
        {fx.map((p, i) => <Poof key={p.id ?? i} x={p.x} y={p.y} size={cell} />)}
        {combo > 0 && <div className="combo">🭠Sweet Combo x{combo + 1}! 🭠</div>}
        {paused && (
          <div className="pause-overlay">
            <div className="section" style={{ textAlign: "center" }}>
              <div className="title" style={{ marginBottom: 8 }}>🬠Game Paused</div>
              <div className="muted" style={{ marginBottom: 12 }}>Take a sweet break!</div>
              <div className="row" style={{ gap: 8 }}>
                <button className="btn primary" onClick={() => setPaused(false)}>Resume</button>
                <button className="btn" onClick={() => finish()}>End Sweet Level</button>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="controls">
        <button className="btn" onClick={() => setPaused((p) => !p)}>{paused ? "Resume" : "Pause"}</button>
        <button className="btn" onClick={resetGame}>Reset</button>
        <button className="btn" onClick={doHint}>💡 Sweet Hint</button>
        <button className="btn primary" onClick={shuffleBoard}>🔄 Sugar Shuffle</button>
        <div className="controls-size">8×8</div>
      </div>
    </div>
  );
}

/* ------------ helpers & hook (logic unchanged) ------------ */
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
        const sparkTypes = ['✨', '💫', '⭐', '🌟', '💥', '🎉', '🬠', '💎'];
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
