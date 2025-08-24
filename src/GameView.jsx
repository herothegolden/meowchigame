// src/GameView.jsx
import React, { useEffect, useRef, useState } from "react";

const COLS = 6;  // CHANGED: 8 → 6
const ROWS = 6;  // CHANGED: 8 → 6
const CELL_MIN = 36;
const CELL_MAX = 88;
const GAME_DURATION = 60;
const EMOJI_SIZE = 0.8;  // FIXED: Further reduced to fit properly in cells

const CANDY_SET = ["😺", "🥨", "🍓", "🍪", "🍡"];
const randEmoji = () =>
  CANDY_SET[Math.floor(Math.random() * CANDY_SET.length)];

export default function GameView({
  onExit,
  onCoins,
  settings,
  userTelegramId,
}) {
  const containerRef = useRef(null);
  const boardRef = useRef(null);
  const [cell, setCell] = useState(48);

  // Grid state
  const [grid, setGrid] = useState(() => initSolvableGrid());
  const gridRef = useRef(grid);
  gridRef.current = grid;

  // Selection / hint / animation
  const [sel, setSel] = useState(null);
  const [hint, setHint] = useState(null);
  const [swapping, setSwapping] = useState(null);

  // Stats
  const [score, setScore] = useState(0);
  const [moves, setMoves] = useState(20);
  const [combo, setCombo] = useState(0);
  const [fx, setFx] = useState([]);
  const [blast, setBlast] = useState(new Set());
  const [timeLeft, setTimeLeft] = useState(GAME_DURATION);

  const [gameStartTime, setGameStartTime] = useState(Date.now());
  const [moveCount, setMoveCount] = useState(0);
  const [maxComboAchieved, setMaxComboAchieved] = useState(0);

  const [newTiles, setNewTiles] = useState(new Set());
  const [fallDelay, setFallDelay] = useState({});

  const [paused, setPaused] = useState(false);
  const [animating, setAnimating] = useState(false);
  const animatingRef = useRef(animating);
  animatingRef.current = animating;

  const [grabTile, setGrabTile] = useState(null);
  const [shake, setShake] = useState(new Set());

  // FIXED: Keep refs for proper state access during async operations
  const movesRef = useRef(moves);
  movesRef.current = moves;
  const timeLeftRef = useRef(timeLeft);
  timeLeftRef.current = timeLeft;
  const scoreRef = useRef(score);
  scoreRef.current = score;
  const maxComboAchievedRef = useRef(maxComboAchieved);
  maxComboAchievedRef.current = maxComboAchieved;

  // Responsive sizing
  useEffect(() => {
    const compute = () => {
      const el = containerRef.current;
      if (!el) return;
      const pad = 16;
      const w = el.clientWidth - pad * 2;
      const h = el.clientHeight - 84;
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
  }, []);

  useEffect(() => {
    window.currentGameScore = score;
  }, [score]);

  // Timer
  useEffect(() => {
    if (paused) return;
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          setTimeout(() => {
            console.log('⏰ Time up! Final score:', scoreRef.current, 'Max combo:', maxComboAchievedRef.current);
            finish();
          }, 100);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [paused]);

  function haptic(ms = 12) {
    if (!settings?.haptics) return;
    try {
      navigator.vibrate?.(ms);
    } catch {}
  }

  async function submitGameScore(finalScore, coinsEarned) {
    if (!userTelegramId) {
      console.log("No Telegram ID, skipping score submission");
      return { user_needs_profile: false };
    }

    const gameScore = Math.max(finalScore, 0);
    const actualCoins = Math.max(coinsEarned, 0);
    const currentMaxCombo = maxComboAchievedRef.current;

    try {
      const gameData = {
        telegram_id: userTelegramId,
        score: gameScore,
        coins_earned: actualCoins,
        moves_used: Math.max(1, moveCount),
        max_combo: currentMaxCombo, // FIXED: Use ref value
        game_duration: Math.floor((Date.now() - gameStartTime) / 1000),
      };

      console.log("🎯 Submitting game score:", gameData);

      const response = await fetch("/api/game/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(gameData),
      });

      const result = await response.json();
      console.log("📊 Score submission result:", result);

      if (!response.ok) {
        console.error("Score submission failed:", result.error);
        return { user_needs_profile: false };
      }
      return result;
    } catch (error) {
      console.error("Error submitting score:", error);
      return { user_needs_profile: false };
    }
  }

  // IMPROVED: Responsive pointer interactions (NO ANIMATION BLOCKING)
  useEffect(() => {
    const el = boardRef.current;
    if (!el || paused) return;
    let drag = null;
    const thresholdBase = 18;

    const rc = (e) => {
      const rect = el.getBoundingClientRect();
      const x = Math.max(0, Math.min(rect.width - 1, e.clientX - rect.left));
      const y = Math.max(0, Math.min(rect.height - 1, e.clientY - rect.top));
      return { r: Math.floor(y / cell), c: Math.floor(x / cell), x, y };
    };

    const down = (e) => {
      // REMOVED: if (animatingRef.current || timeLeftRef.current <= 0) return;
      if (timeLeftRef.current <= 0) return; // Only block on game over
      el.setPointerCapture?.(e.pointerId);
      const p = rc(e);
      if (!inBounds(p.r, p.c)) return;
      drag = { r: p.r, c: p.c, x: p.x, y: p.y, dragging: false };
      setSel({ r: p.r, c: p.c });
      setGrabTile({ r: p.r, c: p.c });
      haptic(5);
    };

    const move = (e) => {
      // REMOVED: if (!drag || animatingRef.current || timeLeftRef.current <= 0) return;
      if (!drag || timeLeftRef.current <= 0) return; // Only block on game over
      const p = rc(e);
      const dx = p.x - drag.x;
      const dy = p.y - drag.y;
      const threshold = Math.min(thresholdBase, Math.floor(cell * 0.35));
      if (!drag.dragging && Math.hypot(dx, dy) > threshold) {
        drag.dragging = true;
        haptic(8);
        const horiz = Math.abs(dx) > Math.abs(dy);
        const tr = drag.r + (horiz ? 0 : dy > 0 ? 1 : -1);
        const tc = drag.c + (horiz ? (dx > 0 ? 1 : -1) : 0);
        if (inBounds(tr, tc)) setSel({ r: tr, c: tc });
      }
    };

    const up = (e) => {
      if (!drag) return;
      const p = rc(e);
      const dx = p.x - drag.x;
      const dy = p.y - drag.y;
      if (!drag.dragging) {
        setSel({ r: drag.r, c: drag.c });
      } else {
        // REMOVED: if (!animatingRef.current && timeLeftRef.current > 0)
        if (timeLeftRef.current > 0) { // Only check game time, allow moves during animations
          const horiz = Math.abs(dx) > Math.abs(dy);
          const tr = drag.r + (horiz ? 0 : dy > 0 ? 1 : -1);
          const tc = drag.c + (horiz ? (dx > 0 ? 1 : -1) : 0);
          if (inBounds(tr, tc)) {
            trySwap(drag.r, drag.c, tr, tc);
            haptic(12);
          }
        }
        setSel(null);
      }
      drag = null;
      setGrabTile(null);
    };

    el.addEventListener("pointerdown", down, { passive: true });
    el.addEventListener("pointermove", move, { passive: true });
    el.addEventListener("pointerup", up, { passive: true });
    el.addEventListener("pointercancel", up, { passive: true });
    return () => {
      el.removeEventListener("pointerdown", down);
      el.removeEventListener("pointermove", move);
      el.removeEventListener("pointerup", up);
      el.removeEventListener("pointercancel", up);
    };
  }, [cell, paused, settings?.haptics]);

  function trySwap(r1, c1, r2, c2) {
    if (timeLeft <= 0) return;
    if (Math.abs(r1 - r2) + Math.abs(c1 - c2) !== 1) return;

    const g = cloneGrid(gridRef.current);
    [g[r1][c1], g[r2][c2]] = [g[r2][c2], g[r1][c1]];
    const matches = findMatches(g);

    if (matches.length === 0) {
      const s = new Set(shake);
      s.add(`${r1}-${c1}`);
      s.add(`${r2}-${c2}`);
      setShake(s);
      setTimeout(() => {
        setShake((prev) => {
          const n = new Set(prev);
          n.delete(`${r1}-${c1}`);
          n.delete(`${r2}-${c2}`);
          return n;
        });
      }, 140);
      haptic(8);
      setSel({ r: r1, c: c1 });
      setTimeout(() => setSel(null), 80);
      return;
    }

    setMoveCount((prev) => prev + 1);
    setSwapping({ from: { r: r1, c: c1 }, to: { r: r2, c: c2 } });
    setTimeout(() => {
      setGrid(g);
      setSwapping(null);
      setMoves((m) => Math.max(0, m - 1));
      resolveCascades(g, () => {
        if (timeLeftRef.current <= 0) finish();
      });
    }, 200);
  }

  // FIXED: Complete cascade resolution with proper combo tracking
  function resolveCascades(start, done) {
    setAnimating(true);
    let g = cloneGrid(start);
    let comboCount = 0;

    const step = () => {
      const matches = findMatches(g);
      if (matches.length === 0) {
        setGrid(g);
        setNewTiles(new Set());
        setFallDelay({});

        // FIXED: Update max combo achieved immediately when cascade ends
        if (comboCount > 0) {
          console.log(`🔥 Combo sequence complete! Achieved x${comboCount + 1} combo (comboCount=${comboCount})`);
          
          // Update max combo immediately
          setMaxComboAchieved(prev => {
            const newMax = Math.max(prev, comboCount);
            console.log(`🏆 Max combo updated: ${prev} → ${newMax} (display will show x${newMax + 1})`);
            maxComboAchievedRef.current = newMax; // Update ref immediately
            return newMax;
          });
          
          // Show combo animation
          setCombo(comboCount);
          haptic(15);
          setTimeout(() => setCombo(0), 1500); // Longer display for bigger animation
        }

        setTimeout(() => setFx([]), 1200);

        ensureSolvable();
        setAnimating(false);
        done && done();
        return;
      }

      // Process matches
      const keys = matches.map(([r, c]) => `${r}:${c}`);
      setBlast(new Set(keys));

      const fxId = Date.now() + Math.random();
      setFx((prev) => [
        ...prev.slice(-10),
        ...matches.map((m, i) => ({
          id: fxId + i + Math.random(),
          x: m[1] * cell,
          y: m[0] * cell,
        })),
      ]);

      // Calculate scoring
      const basePoints = 10 * matches.length;
      const comboMultiplier = Math.max(1, comboCount + 1);
      const pointsEarned = basePoints * comboMultiplier;
      
      console.log(`🎯 Match ${comboCount + 1}: ${matches.length} items × ${comboMultiplier} multiplier = ${pointsEarned} points`);
      
      setScore((s) => {
        const newScore = s + pointsEarned;
        console.log(`📊 Score: ${s} + ${pointsEarned} = ${newScore}`);
        return newScore;
      });
      
      const coinsEarned = Math.ceil(matches.length / 4);
      onCoins(coinsEarned);

      // Clear matches
      matches.forEach(([r, c]) => {
        g[r][c] = null;
      });
      setGrid(cloneGrid(g));
      setTimeout(() => setBlast(new Set()), 100);

      // Apply gravity and continue cascade
      setTimeout(() => {
        const delayMap = {};
        for (let c = 0; c < COLS; c++) {
          const nullsBelow = new Array(ROWS).fill(0);
          let count = 0;
          for (let r = ROWS - 1; r >= 0; r--) {
            nullsBelow[r] = count;
            if (g[r][c] === null) count++;
          }
          for (let r = ROWS - 1; r >= 0; r--) {
            if (g[r][c] != null) {
              const dist = nullsBelow[r];
              const newR = r + dist;
              if (dist > 0) {
                delayMap[`${newR}-${c}`] = Math.min(0.05, dist * 0.01);
              }
            }
          }
        }

        applyGravity(g);
        const empties = new Set();
        for (let r = 0; r < ROWS; r++)
          for (let c = 0; c < COLS; c++) if (g[r][c] === null) empties.add(`${r}-${c}`);
        refill(g);

        setNewTiles(empties);
        setFallDelay(delayMap);
        setGrid(cloneGrid(g));

        setTimeout(() => {
          setNewTiles(new Set());
          comboCount++; // Increment for next cascade
          setTimeout(step, 60);
        }, 120);
      }, 100);
    };
    step();
  }

  function doHint() {
    if (timeLeft <= 0) return; // REMOVED: animating check for responsiveness
    const m = findFirstMove(gridRef.current);
    if (!m) {
      shuffleBoard();
      return;
    }
    setHint(m);
    setTimeout(() => setHint(null), 1200);
    haptic(10);
  }

  function shuffleBoard() {
    if (timeLeft <= 0) return; // REMOVED: animating check for responsiveness
    const g = shuffleToSolvable(gridRef.current);
    setGrid(g);
    haptic(12);
  }

  function ensureSolvable() {
    if (!hasAnyMove(gridRef.current))
      setGrid(shuffleToSolvable(gridRef.current));
  }

  // FIXED: Use refs for accurate final values
  async function finish() {
    const finalScore = scoreRef.current;
    const finalMaxCombo = maxComboAchievedRef.current;
    
    console.log('🎮 Game finishing with score:', finalScore, 'Max combo achieved:', finalMaxCombo);
    
    // Calculate final coins (minimum 10 for completing the game)
    const finalCoins = Math.max(10, Math.floor(finalScore * 0.15));
    
    // Submit score to backend
    const result = await submitGameScore(finalScore, finalCoins);
    
    // Send results to parent
    const gameResult = {
      score: finalScore,
      coins: finalCoins,
      moves_used: moveCount,
      max_combo: finalMaxCombo,
      gameSubmitted: !!result,
    };
    
    console.log('🏁 Game complete! Final result:', gameResult);
    
    onExit(gameResult);
  }

  function resetGame() {
    if (timeLeft <= 0 && !paused) return; // Only prevent reset after game over
    console.log('🔄 Resetting game...');
    
    setGrid(initSolvableGrid());
    setScore(0);
    setMoves(20);
    setCombo(0);
    setSel(null);
    setHint(null);
    setSwapping(null);
    setFallDelay({});
    setNewTiles(new Set());
    setTimeLeft(GAME_DURATION);
    setGameStartTime(Date.now());
    setMoveCount(0);
    setMaxComboAchieved(0);
    setFx([]);
    
    // Reset refs
    maxComboAchievedRef.current = 0;
    scoreRef.current = 0;
    
    console.log('✅ Game reset complete');
  }

  const boardW = cell * COLS;
  const boardH = cell * ROWS;

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const getTimerColor = () => {
    if (timeLeft <= 10) return "#e74c3c";
    if (timeLeft <= 30) return "#f39c12";
    return "#27ae60";
  };

  return (
    <div className="section board-wrap" ref={containerRef}>
      <div
        className="timer-display"
        style={{
          textAlign: "center",
          marginBottom: "12px",
          fontSize: "24px",
          fontWeight: "800",
          color: getTimerColor(),
          padding: "8px 16px",
          background: "var(--card)",
          borderRadius: "16px",
          border: "2px solid",
          borderColor: getTimerColor(),
          boxShadow: `0 0 0 3px ${getTimerColor()}20`,
        }}
      >
        ⏰ {formatTime(timeLeft)}
      </div>

      <div className="row">
        <div>
          <span className="muted">Score</span> <b>{score}</b>
        </div>
        <div>
          <span className="muted">Moves</span> <b>{moves}</b>
        </div>
        <div>
          <span className="muted">Combo</span>{" "}
          <b>{combo > 0 ? `x${combo + 1}` : "-"}</b>
        </div>
      </div>

      {/* MOVED: Combo explosion above the stats */}
      {combo > 0 && (
        <div className="combo-celebration">
          💥 🍬 Sweet Combo x{combo + 1}! 🍬 💥
        </div>
      )}

      <div
        ref={boardRef}
        className="board"
        style={{ width: boardW, height: boardH }}
      >
        <div
          className="gridlines"
          style={{
            backgroundImage:
              "linear-gradient(var(--line) 1px, transparent 1px), linear-gradient(90deg, var(--line) 1px, transparent 1px)",
            backgroundSize: `${cell}px ${cell}px`,
          }}
        />
        {grid.map((row, r) =>
          row.map((v, c) => {
            const isSelected = sel && sel.r === r && sel.c === c;
            const isHinted =
              hint &&
              ((hint[0][0] === r && hint[0][1] === c) ||
                (hint[1][0] === r && hint[1][1] === c));
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
              !!swapping &&
              ((swapping.from.r === r && swapping.from.c === c) ||
                (swapping.to.r === r && swapping.to.c === c));

            const tileKey = `${r}-${c}`;
            const isNewTile = newTiles.has(tileKey);
            const isGrab = grabTile && grabTile.r === r && grabTile.c === c;
            const isShake = shake.has(tileKey);

            const delaySeconds = isSwapping ? 0 : fallDelay[tileKey] || 0;

            return (
              <div
                key={`tile-${r}-${c}`}
                className={`tile ${isSelected ? "sel" : ""} ${
                  isHinted ? "hint" : ""
                } ${isSwapping ? "swapping" : ""} ${
                  isBlasting ? "blasting" : ""
                } ${isNewTile ? "drop-in" : ""} ${isGrab ? "grab" : ""} ${
                  isShake ? "shake" : ""
                }`}
                style={{
                  left: c * cell,
                  top: r * cell,
                  width: cell,
                  height: cell,
                  transform: swapTransform || undefined,
                  zIndex: isBlasting ? 10 : isSwapping ? 20 : 1,
                  transitionDelay: `${delaySeconds}s`,
                }}
              >
                <span
                  className="tile-emoji"
                  style={{
                    fontSize: Math.floor(cell * EMOJI_SIZE),
                    lineHeight: 1,
                  }}
                >
                  {v}
                </span>
              </div>
            );
          })
        )}
        {fx.map((p, i) => (
          <Poof key={p.id || i} x={p.x} y={p.y} size={cell} />
        ))}
        {paused && (
          <div className="pause-overlay">
            <div className="section" style={{ textAlign: "center" }}>
              <div className="title" style={{ marginBottom: 8 }}>
                � Game Paused
              </div>
              <div className="muted" style={{ marginBottom: 12 }}>
                Take a sweet break!
              </div>
              <div className="row" style={{ gap: 8 }}>
                <button className="btn primary" onClick={() => setPaused(false)}>
                  Resume
                </button>
                <button className="btn" onClick={() => finish()}>
                  End Sweet Level
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="controls">
        <button
          className="btn"
          onClick={() => setPaused((p) => !p)}
          disabled={timeLeft <= 0}
        >
          {paused ? "Resume" : "Pause"}
        </button>
        <button className="btn" onClick={resetGame}>
          Reset
        </button>
        <button className="btn" onClick={doHint} disabled={timeLeft <= 0}>
          💡 Sweet Hint
        </button>
        <button
          className="btn primary"
          onClick={shuffleBoard}
          disabled={timeLeft <= 0}
        >
          🔄 Sugar Shuffle
        </button>
        <div className="controls-size">6×6</div>
      </div>
    </div>
  );
}

function Poof({ x, y, size }) {
  const sparks = Array.from({ length: 12 });

  return (
    <>
      {sparks.map((_, i) => {
        const angle = (i / 12) * Math.PI * 2 + (Math.random() * 0.3 - 0.15);
        const distance = size * (0.6 + Math.random() * 0.8);
        const tx = size / 2 + Math.cos(angle) * distance;
        const ty = size / 2 + Math.sin(angle) * distance;

        const randomDelay = Math.random() * 0.02;
        const randomDuration = 0.3 + Math.random() * 0.2;

        const sparkTypes = ["✨", "💫", "⭐", "🌟", "💥", "🎉", "�", "💎"];
        const randomSpark =
          sparkTypes[Math.floor(Math.random() * sparkTypes.length)];

        const particleType = Math.random();
        let animationName = "fly";
        if (particleType < 0.2) animationName = "fly-bounce";
        else if (particleType < 0.4) animationName = "fly-spiral";

        const style = {
          left: x,
          top: y,
          "--cx": size / 2 + "px",
          "--cy": size / 2 + "px",
          "--tx": tx + "px",
          "--ty": ty + "px",
          position: "absolute",
          animationName,
          animationDelay: `${randomDelay}s`,
          animationDuration: `${randomDuration}s`,
          animationFillMode: "forwards",
          animationTimingFunction: "ease-out",
          fontSize: Math.floor(size * (0.25 + Math.random() * 0.25)) + "px",
          textShadow: "0 0 4px rgba(255, 255, 255, 0.6)",
          filter: "drop-shadow(0 0 3px rgba(255, 255, 255, 0.5))",
          zIndex: 15,
        };
        return (
          <span key={i} className="spark enhanced-spark" style={style}>
            {randomSpark}
          </span>
        );
      })}

      <div
        className="explosion-flash"
        style={{
          position: "absolute",
          left: x - size * 0.5,
          top: y - size * 0.5,
          width: size * 2,
          height: size * 2,
          borderRadius: "50%",
          background:
            "radial-gradient(circle, rgba(255,255,255,0.6) 0%, rgba(255,215,0,0.4) 50%, transparent 100%)",
          animation: "explosion-flash 0.15s ease-out forwards",
          pointerEvents: "none",
          zIndex: 12,
        }}
      />

      <div
        className="shockwave"
        style={{
          position: "absolute",
          left: x + size / 2,
          top: y + size / 2,
          width: 0,
          height: 0,
          border: "2px solid rgba(255,215,0,0.6)",
          borderRadius: "50%",
          animation: "shockwave 0.2s ease-out forwards",
          pointerEvents: "none",
          zIndex: 11,
        }}
      />
    </>
  );
}

/* ========= Helpers ========= */

const makeGrid = (rows, cols) =>
  Array.from({ length: rows }, () => Array(cols).fill(null));
const cloneGrid = (g) => g.map((r) => r.slice());
const inBounds = (r, c) => r >= 0 && r < ROWS && c >= 0 && c < COLS;

function findMatches(g) {
  const hits = new Set();
  // rows
  for (let r = 0; r < ROWS; r++) {
    let c = 0;
    while (c < COLS) {
      const v = g[r][c];
      if (!v) {
        c++;
        continue;
      }
      let len = 1;
      while (c + len < COLS && g[r][c + len] === v) len++;
      if (len >= 3) for (let k = 0; k < len; k++) hits.add(`${r}:${c + k}`);
      c += len;
    }
  }
  // cols
  for (let c = 0; c < COLS; c++) {
    let r = 0;
    while (r < ROWS) {
      const v = g[r][c];
      if (!v) {
        r++;
        continue;
      }
      let len = 1;
      while (r + len < ROWS && g[r + len][c] === v) len++;
      if (len >= 3) for (let k = 0; k < len; k++) hits.add(`${r + k}:${c}`);
      r += len;
    }
  }
  return Array.from(hits).map((k) =>
    k.split(":").map((n) => parseInt(n, 10))
  );
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
    while (write >= 0) {
      g[write][c] = null;
      write--;
    }
  }
}

function refill(g) {
  for (let r = 0; r < ROWS; r++)
    for (let c = 0; c < COLS; c++) if (g[r][c] == null) g[r][c] = randEmoji();
}

function hasAnyMove(g) {
  return !!findFirstMove(g);
}

function findFirstMove(g) {
  for (let r = 0; r < ROWS; r++)
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
  return null;
}

function initSolvableGrid() {
  let g;
  let tries = 0;
  do {
    g = makeGrid(ROWS, COLS);
    for (let r = 0; r < ROWS; r++)
      for (let c = 0; c < COLS; c++) g[r][c] = randEmoji();
    removeAllMatches(g);
    tries++;
    if (tries > 50) break;
  } while (!hasAnyMove(g));
  return g;
}

function removeAllMatches(g) {
  while (true) {
    const m = findMatches(g);
    if (m.length === 0) break;
    m.forEach(([r, c]) => {
      g[r][c] = randEmoji();
    });
  }
}

function shuffleToSolvable(g) {
  // Flatten
  const flat = [];
  for (let r = 0; r < ROWS; r++)
    for (let c = 0; c < COLS; c++) flat.push(g[r][c]);

  let attempts = 0;
  while (attempts < 100) {
    // Fisher–Yates shuffle
    for (let i = flat.length - 1; i > 0; i--) {
      const j = (Math.random() * (i + 1)) | 0;
      [flat[i], flat[j]] = [flat[j], flat[i]];
    }
    // Rebuild
    const t = makeGrid(ROWS, COLS);
    let idx = 0;
    for (let r = 0; r < ROWS; r++)
      for (let c = 0; c < COLS; c++) t[r][c] = flat[idx++];

    // Remove starter matches; ensure a move exists
    removeAllMatches(t);
    if (hasAnyMove(t)) return t;
    attempts++;
  }
  // Fallback
  return initSolvableGrid();
}
