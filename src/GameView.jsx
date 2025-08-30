// src/GameView.jsx
import React, { useEffect, useRef, useState, useCallback, useMemo } from "react";
import * as audio from "./audio";
import ShareButtons from "./ShareButtons.jsx";
import { game } from "./utils.js";
import { useStore } from "./store.js";

// 🐱 SIX MEOWCHI CATS - FIXED!
const CAT_SET = [
  "https://ik.imagekit.io/59r2kpz8r/Meowchi/Boba.webp?updatedAt=1756284887507",
  "https://ik.imagekit.io/59r2kpz8r/Meowchi/Cheese.webp?updatedAt=1756284887499", 
  "https://ik.imagekit.io/59r2kpz8r/Meowchi/Meowchi.webp?updatedAt=1756284887490",
  "https://ik.imagekit.io/59r2kpz8r/Meowchi/Oreo.webp?updatedAt=1756284887488",
  "https://ik.imagekit.io/59r2kpz8r/Meowchi/Panthera.webp?updatedAt=1756284887493", 
  "https://ik.imagekit.io/59r2kpz8r/Meowchi/Patches.webp?updatedAt=1756284887491",
];

// FIXED random function
const randCat = () => CAT_SET[Math.floor(Math.random() * CAT_SET.length)];

// FIXED MemoizedTile with image support
const MemoizedTile = React.memo(({
  r, c, value, cell, isSelected, isHinted, isBlasting, isSwapping,
  isNewTile, isGrab, isShake, swapTransform, delaySeconds, EMOJI_SIZE
}) => {
  const isImage = value && typeof value === 'string' && value.startsWith('https://ik.imagekit.io');
  
  return (
    <div
      key={`${r}-${c}`}
      className={`tile ${isSelected ? "sel" : ""} ${isHinted ? "hint-pulse" : ""} ${isGrab ? "grab" : ""} ${isShake ? "shake" : ""}`}
      style={{
        left: c * cell, top: r * cell, width: cell, height: cell,
        transform: swapTransform || undefined,
        zIndex: isBlasting ? 10 : isGrab ? 5 : 1,
        transition: isSwapping ? "transform 0.16s ease" : delaySeconds ? `top 0.16s ease ${delaySeconds}s` : "top 0.16s ease",
      }}
    >
      <div
        className={`emoji ${isGrab ? "grab" : ""} ${isShake ? "shake" : ""}`}
        style={{ 
          fontSize: isImage ? 'inherit' : Math.floor(cell * EMOJI_SIZE),
          width: isImage ? '85%' : 'auto', height: isImage ? '85%' : 'auto',
          display: 'flex', alignItems: 'center', justifyContent: 'center'
        }}
      >
        {isImage ? (
          <img 
            src={value} alt="cat"
            style={{ width: '100%', height: '100%', objectFit: 'contain', borderRadius: '8px' }}
            onError={(e) => {
              console.error('Image failed to load:', value);
              e.target.parentNode.innerHTML = '😺'; // Fallback
            }}
          />
        ) : (
          <span className="tile-emoji">{value || '😺'}</span>
        )}
      </div>
    </div>
  );
});

// Rest of your existing GameView code with optimized helpers...
const useSmoothAnimation = () => {
  const requestRef = useRef();
  const animate = useCallback((callback) => {
    const animateFrame = () => {
      callback();
      requestRef.current = requestAnimationFrame(animateFrame);
    };
    requestRef.current = requestAnimationFrame(animateFrame);
    return () => {
      if (requestRef.current) {
        cancelAnimationFrame(requestRef.current);
      }
    };
  }, []);
  return animate;
};

const useBatchedState = () => {
  const [pendingUpdates, setPendingUpdates] = useState({});
  const timeoutRef = useRef();

  const batchUpdate = useCallback((updates) => {
    setPendingUpdates(prev => ({ ...prev, ...updates }));
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    timeoutRef.current = setTimeout(() => {
      Object.entries(pendingUpdates).forEach(([key, updater]) => {
        if (typeof updater === 'function') {
          updater();
        }
      });
      setPendingUpdates({});
    }, 16);
  }, [pendingUpdates]);

  return batchUpdate;
};

const COLS = 6;
const ROWS = 6;
const CELL_MIN = 36;
const CELL_MAX = 88;
const GAME_DURATION = 60;
const EMOJI_SIZE = 0.8;

// NEW: Power-up definitions
const POWERUP_DEFINITIONS = {
  shuffle: { name: "Paw-sitive Swap", icon: "🐾" },
  hammer: { name: "Catnip Cookie", icon: "🍪" },
  bomb: { name: "Marshmallow Bomb", icon: "💣" },
};

export default function GameView({
  onExit,
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
  const [lastPlayTime, setLastPlayTime] = useState(Date.now());
  const [grabTile, setGrabTile] = useState(null);
  const [shake, setShake] = useState(new Set());

  const powerups = useStore(s => s.powerups);
  const consumePowerup = useStore(s => s.consumePowerup);
  const addCoins = useStore(s => s.addCoins);

  const batchUpdate = useBatchedState();

  // Calculate board dimensions
  useEffect(() => {
    function updateCell() {
      if (!containerRef.current || !boardRef.current) return;
      const containerWidth = containerRef.current.offsetWidth - 40;
      const newCell = Math.max(CELL_MIN, Math.min(CELL_MAX, Math.floor(containerWidth / COLS)));
      setCell(newCell);
    }
    updateCell();
    window.addEventListener("resize", updateCell);
    return () => window.removeEventListener("resize", updateCell);
  }, []);

  // Game timer
  useEffect(() => {
    if (paused || timeLeft <= 0) return;
    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          handleGameEnd();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [paused, timeLeft]);

  // Auto-hint after 6 seconds
  useEffect(() => {
    if (sel || hint || swapping || paused || timeLeft <= 0) return;
    const hintTimer = setTimeout(() => {
      const firstMove = findFirstMove(gridRef.current);
      if (firstMove) {
        setHint(firstMove);
        setTimeout(() => setHint(null), 3000);
      }
    }, 6000);
    return () => clearTimeout(hintTimer);
  }, [sel, hint, swapping, paused, timeLeft, grid]);

  // Clear blast effects
  useEffect(() => {
    if (blast.size > 0) {
      const timer = setTimeout(() => setBlast(new Set()), 300);
      return () => clearTimeout(timer);
    }
  }, [blast]);

  // Clear fx effects
  useEffect(() => {
    if (fx.length > 0) {
      const timer = setTimeout(() => setFx([]), 800);
      return () => clearTimeout(timer);
    }
  }, [fx]);

  // Clear shake effects
  useEffect(() => {
    if (shake.size > 0) {
      const timer = setTimeout(() => setShake(new Set()), 300);
      return () => clearTimeout(timer);
    }
  }, [shake]);

  const handleGameEnd = useCallback(() => {
    if (timeLeft > 0) return; // Don't end if time left
    const finalScore = score;
    const coinsEarned = game.calculateCoins(finalScore, maxComboAchieved);
    addCoins(coinsEarned);
    onExit?.({
      score: finalScore,
      moves: moveCount,
      maxCombo: maxComboAchieved,
      coins: coinsEarned,
      duration: Math.floor((Date.now() - gameStartTime) / 1000),
    });
  }, [score, maxComboAchieved, moveCount, gameStartTime, addCoins, onExit, timeLeft]);

  const optimizedResolveCascades = useCallback((start, done) => {
    let current = cloneGrid(start);
    let cascadeCount = 0;
    let totalPointsThisTurn = 0;

    const processCascade = () => {
      const matches = findMatches(current);
      if (matches.length === 0) {
        setCombo(cascadeCount);
        if (cascadeCount > maxComboAchieved) {
          setMaxComboAchieved(cascadeCount);
        }
        done(current);
        return;
      }

      cascadeCount++;
      const newBlast = new Set(matches.map(([r, c]) => `${r}:${c}`));
      setBlast(newBlast);

      setTimeout(() => {
        matches.forEach(([r, c]) => {
          current[r][c] = null;
        });

        const basePoints = 10 * matches.length;
        const comboMultiplier = Math.max(1, cascadeCount + 1);
        const pointsEarned = basePoints * comboMultiplier;
        totalPointsThisTurn += pointsEarned;

        if (comboMultiplier >= 4) {
          setFx(prev => [...prev, { type: "combo", value: `x${comboMultiplier}`, id: Date.now() }]);
          audio.play?.("combo_x4", { volume: 0.7 });
        } else if (comboMultiplier >= 3) {
          setFx(prev => [...prev, { type: "combo", value: `x${comboMultiplier}`, id: Date.now() }]);
          audio.play?.("combo_x3", { volume: 0.6 });
        } else if (comboMultiplier >= 2) {
          setFx(prev => [...prev, { type: "combo", value: `x${comboMultiplier}`, id: Date.now() }]);
          audio.play?.("combo_x2", { volume: 0.5 });
        } else {
          audio.play?.("match_pop", { volume: 0.4 });
        }

        batchUpdate({
          score: () => setScore(s => s + pointsEarned),
        });

        applyGravity(current);
        refill(current);
        setGrid(cloneGrid(current));

        setTimeout(processCascade, 200);
      }, 150);
    };

    processCascade();
  }, [maxComboAchieved, batchUpdate]);

  const handleTileClick = useCallback((r, c) => {
    if (swapping || paused || timeLeft <= 0) return;

    if (sel) {
      const [r1, c1] = sel;
      if (r1 === r && c1 === c) {
        setSel(null);
        return;
      }

      const isAdjacent = Math.abs(r1 - r) + Math.abs(c1 - c) === 1;
      if (!isAdjacent) {
        setSel([r, c]);
        return;
      }

      const g = cloneGrid(gridRef.current);
      [g[r1][c1], g[r][c]] = [g[r][c], g[r1][c1]];

      const matches = findMatches(g);
      if (matches.length > 0) {
        setSel(null);
        setSwapping({ from: { r: r1, c: c1 }, to: { r, c } });
        setMoveCount(m => m + 1);

        audio.play?.("swap", { volume: 0.3 });

        setTimeout(() => {
          setGrid(g);
          setSwapping(null);
          optimizedResolveCascades(g, (finalGrid) => {
            setGrid(finalGrid);
          });
        }, 160);
      } else {
        setSel(null);
        const shakeKey = `${r}:${c}`;
        setShake(prev => new Set(prev.add(shakeKey)));
        audio.play?.("swap_invalid", { volume: 0.5 });
      }
    } else {
      setSel([r, c]);
    }
  }, [sel, swapping, paused, timeLeft, optimizedResolveCascades]);

  const handlePowerupUse = useCallback((key) => {
    if (powerups[key] <= 0 || paused || timeLeft <= 0) return;

    const g = cloneGrid(gridRef.current);

    if (key === "shuffle") {
      for (let i = 0; i < 50; i++) {
        const r1 = Math.floor(Math.random() * ROWS);
        const c1 = Math.floor(Math.random() * COLS);
        const r2 = Math.floor(Math.random() * ROWS);
        const c2 = Math.floor(Math.random() * COLS);
        [g[r1][c1], g[r2][c2]] = [g[r2][c2], g[r1][c1]];
      }
      setGrid(g);
      audio.play?.("powerup_spawn", { volume: 0.8 });
      optimizedResolveCascades(g, () => {});
      consumePowerup(key);
    } else if (key === "hammer" && sel) {
      const [r, c] = sel;
      g[r][c] = null;
      setSel(null);
      setGrid(g);
      applyGravity(g);
      refill(g);
      setGrid(cloneGrid(g));
      audio.play?.("powerup_spawn", { volume: 0.8 });
      optimizedResolveCascades(g, () => {});
      consumePowerup(key);
    } else if (key === "bomb" && sel) {
      const [r, c] = sel;
      for (let rr = r - 1; rr <= r + 1; rr++) {
        for (let cc = c - 1; cc <= c + 1; cc++) {
          if (inBounds(rr, cc)) g[rr][cc] = null;
        }
      }
      setSel(null);
      setGrid(g);
      audio.play?.("powerup_spawn", { volume: 0.8 });
      optimizedResolveCascades(g, () => {});
      consumePowerup(key);
    } else {
      audio.play?.("swap_invalid", { volume: 0.5 });
    }
  }, [sel, powerups, paused, timeLeft, optimizedResolveCascades, consumePowerup]);

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

  const optimizedGridRender = useMemo(() => {
    return grid.map((row, r) =>
      row.map((v, c) => {
        const isSelected = sel && sel[0] === r && sel[1] === c;
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
        const delaySeconds = isSwapping ? null : fallDelay[tileKey] || null;

        if (v === null) return null;

        return (
          <MemoizedTile
            key={`${r}-${c}-${v}`}
            r={r}
            c={c}
            value={v}
            cell={cell}
            isSelected={isSelected}
            isHinted={isHinted}
            isBlasting={isBlasting}
            isSwapping={isSwapping}
            isNewTile={isNewTile}
            isGrab={isGrab}
            isShake={isShake}
            swapTransform={swapTransform}
            delaySeconds={delaySeconds}
            EMOJI_SIZE={EMOJI_SIZE}
            onClick={() => handleTileClick(r, c)}
          />
        );
      })
    );
  }, [grid, sel, hint, blast, swapping, newTiles, grabTile, shake, fallDelay, cell, handleTileClick]);

  return (
    <div className="game-container" ref={containerRef}>
      {/* Header */}
      <div style={{ 
        display: "flex", 
        justifyContent: "space-between", 
        alignItems: "center", 
        padding: "12px 20px", 
        borderBottom: "1px solid var(--line)" 
      }}>
        <button
          className="btn"
          onClick={() => onExit?.({ score, moves: moveCount, maxCombo: maxComboAchieved })}
          style={{ fontSize: "14px", padding: "8px 16px" }}
        >
          ← Exit
        </button>
        <div style={{ 
          textAlign: "center", 
          background: `linear-gradient(135deg, ${getTimerColor()}, ${getTimerColor()}cc)`,
          color: "white",
          padding: "8px 16px",
          borderRadius: "12px",
          fontWeight: "700"
        }}>
          {formatTime(timeLeft)}
          <button
            onClick={() => setPaused(!paused)}
            style={{
              marginLeft: "10px",
              background: "rgba(255,255,255,0.2)",
              border: "1px solid rgba(255,255,255,0.3)",
              borderRadius: "4px",
              color: "white",
              padding: "2px 8px",
              fontSize: "11px",
              cursor: "pointer"
            }}
          >
            {paused ? "▶️" : "⏸"}
          </button>
        </div>
      </div>

      {/* Stats */}
      <div style={{ 
        display: "flex", 
        justifyContent: "space-between", 
        alignItems: "center", 
        padding: "16px 20px",
        borderBottom: "1px solid var(--line)" 
      }}>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: "20px", fontWeight: "800", color: "var(--text)" }}>
            {score.toLocaleString()}
          </div>
          <div style={{ fontSize: "11px", color: "var(--muted)", fontWeight: "600" }}>
            SCORE
          </div>
        </div>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: "20px", fontWeight: "800", color: "var(--text)" }}>
            {moveCount}
          </div>
          <div style={{ fontSize: "11px", color: "var(--muted)", fontWeight: "600" }}>
            MOVES
          </div>
        </div>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: "20px", fontWeight: "800", color: "var(--text)" }}>
            {combo}x
          </div>
          <div style={{ fontSize: "11px", color: "var(--muted)", fontWeight: "600" }}>
            COMBO
          </div>
        </div>
      </div>

      {/* Board */}
      <div style={{ padding: "20px", textAlign: "center" }}>
        <div
          className="board"
          ref={boardRef}
          style={{
            position: "relative",
            margin: "0 auto",
            width: boardW,
            height: boardH,
            background: "var(--card)",
            borderRadius: "16px",
            border: "1px solid var(--line)",
            overflow: "hidden",
          }}
        >
          {/* Grid lines */}
          <div style={{ position: "absolute", inset: 0, opacity: 0.1, pointerEvents: "none" }}>
            <svg width={boardW} height={boardH}>
              {Array.from({ length: ROWS + 1 }, (_, i) => (
                <line key={`h-${i}`} x1={0} y1={i * cell} x2={boardW} y2={i * cell} stroke="currentColor" strokeWidth={1} />
              ))}
              {Array.from({ length: COLS + 1 }, (_, i) => (
                <line key={`v-${i}`} x1={i * cell} y1={0} x2={i * cell} y2={boardH} stroke="currentColor" strokeWidth={1} />
              ))}
            </svg>
          </div>

          {/* Tiles */}
          {optimizedGridRender}

          {/* Effects */}
          {fx.map((f, i) => (
            <div
              key={f.id || i}
              style={{
                position: "absolute",
                top: "50%",
                left: "50%",
                transform: "translate(-50%, -50%)",
                fontSize: "24px",
                fontWeight: "800",
                color: "var(--accent)",
                pointerEvents: "none",
                animation: "combo-pop 0.8s ease-out forwards",
                zIndex: 100,
              }}
            >
              {f.value}
            </div>
          ))}
        </div>
      </div>

      {/* Powerups */}
      <div style={{ 
        display: "flex", 
        gap: "8px", 
        padding: "16px 20px", 
        borderTop: "1px solid var(--line)" 
      }}>
        {Object.entries(POWERUP_DEFINITIONS).map(([key, def]) => (
          <button
            key={key}
            className={`btn ${powerups[key] > 0 ? "primary" : ""}`}
            onClick={() => handlePowerupUse(key)}
            disabled={powerups[key] <= 0}
            style={{
              flex: 1,
              fontSize: "12px",
              padding: "10px 8px",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: "4px",
            }}
          >
            <span style={{ fontSize: "16px" }}>{def.icon}</span>
            <span>{def.name}</span>
            <span style={{ fontSize: "10px", opacity: 0.8 }}>({powerups[key]})</span>
          </button>
        ))}
      </div>

      <ShareButtons score={score} />
    </div>
  );
}

// Helper Functions
function initSolvableGrid() {
  const g = Array.from({ length: ROWS }, () =>
    Array.from({ length: COLS }, () => randCat())
  );
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      if (c >= 2 && g[r][c] === g[r][c - 1] && g[r][c] === g[r][c - 2]) {
        g[r][c] = pickDifferent(g[r][c]);
      }
      if (r >= 2 && g[r][c] === g[r - 1][c] && g[r][c] === g[r - 2][c]) {
        g[r][c] = pickDifferent(g[r][c]);
      }
    }
  }
  if (!hasAnyMove(g)) return shuffleToSolvable(g);
  return g;
}

function pickDifferent(curr) {
  const choices = CAT_SET.filter(x => x !== curr);
  return choices[Math.floor(Math.random() * choices.length)];
}

function cloneGrid(g) {
  return g.map(row => row.slice());
}

function inBounds(r, c) {
  return r >= 0 && c >= 0 && r < ROWS && c < COLS;
}

function findMatches(g) {
  const matches = [];
  // Horizontal matches
  for (let r = 0; r < ROWS; r++) {
    let streak = 1;
    for (let c = 1; c < COLS; c++) {
      if (g[r][c] && g[r][c] === g[r][c - 1]) streak++;
      else {
        if (streak >= 3) {
          for (let k = 0; k < streak; k++) matches.push([r, c - 1 - k]);
        }
        streak = 1;
      }
    }
    if (streak >= 3) for (let k = 0; k < streak; k++) matches.push([r, COLS - 1 - k]);
  }
  // Vertical matches
  for (let c = 0; c < COLS; c++) {
    let streak = 1;
    for (let r = 1; r < ROWS; r++) {
      if (g[r][c] && g[r][c] === g[r - 1][c]) streak++;
      else {
        if (streak >= 3) {
          for (let k = 0; k < streak; k++) matches.push([r - 1 - k, c]);
        }
        streak = 1;
      }
    }
    if (streak >= 3) for (let k = 0; k < streak; k++) matches.push([ROWS - 1 - k, c]);
  }
  return matches;
}

function applyGravity(g) {
  for (let c = 0; c < COLS; c++) {
    for (let r = ROWS - 1; r >= 0; r--) {
      if (g[r][c] === null) {
        for (let rr = r - 1; rr >= 0; rr--) {
          if (g[rr][c] != null) {
            g[r][c] = g[rr][c];
            g[rr][c] = null;
            break;
          }
        }
      }
    }
  }
}

function refill(g) {
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      if (g[r][c] === null) g[r][c] = randCat();
    }
  }
}

function hasAnyMove(g) {
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const dirs = [[0, 1], [1, 0]];
      for (const [dr, dc] of dirs) {
        const r2 = r + dr, c2 = c + dc;
        if (!inBounds(r2, c2)) continue;
        const ng = cloneGrid(g);
        [ng[r][c], ng[r2][c2]] = [ng[r2][c2], ng[r][c]];
        if (findMatches(ng).length > 0) return true;
      }
    }
  }
  return false;
}

function shuffleToSolvable(g) {
  for (let i = 0; i < 100; i++) {
    const ng = cloneGrid(g);
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        if (c >= 2 && ng[r][c] === ng[r][c - 1] && ng[r][c] === ng[r][c - 2]) {
          ng[r][c] = pickDifferent(ng[r][c]);
        }
        if (r >= 2 && ng[r][c] === ng[r - 1][c] && ng[r][c] === ng[r - 2][c]) {
          ng[r][c] = pickDifferent(ng[r][c]);
        }
      }
    }
    if (hasAnyMove(ng)) return ng;
  }
  return g;
}

function findFirstMove(g) {
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const dirs = [[0, 1], [1, 0]];
      for (const [dr, dc] of dirs) {
        const r2 = r + dr, c2 = c + dc;
        if (!inBounds(r2, c2)) continue;
        const ng = cloneGrid(g);
        [ng[r][c], ng[r2][c2]] = [ng[r2][c2], ng[r][c]];
        const m = findMatches(ng);
        if (m.length > 0) return [[r, c], [r2, c2]];
      }
    }
  }
  return null;
}
