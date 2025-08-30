// src/GameView.jsx
import React, { useEffect, useRef, useState, useCallback, useMemo } from "react";

// --- START: Mocked Dependencies ---
// These were previously in separate files. They are now included here to make the component standalone.

// Mocked audio object
const audio = {
  play: (sound, options) => {
    // In a real app, this would play sound. For now, it just logs to the console.
    console.log(`Playing sound: ${sound}`, options || '');
  }
};

// Mocked ShareButtons component
const ShareButtons = ({ score }) => {
  return (
    <div style={{
      padding: '20px',
      background: 'rgba(255, 255, 255, 0.9)',
      backdropFilter: 'blur(10px)',
      borderRadius: '16px',
      display: 'flex',
      flexDirection: 'column',
      gap: '10px',
      alignItems: 'center',
      color: '#333',
      boxShadow: '0 4px 20px rgba(0,0,0,0.1)'
    }}>
      <h2 style={{margin: 0, color: 'var(--text)', fontSize: '24px'}}>Game Over!</h2>
      <p style={{fontSize: '18px', margin: '4px 0 12px', color: 'var(--muted)'}}>Final Score: <strong>{score.toLocaleString()}</strong></p>
      <div style={{display: 'flex', gap: '10px', width: '100%'}}>
        <button className="btn primary" style={{flex: 1}}>📢 Share to Chats</button>
        <button className="btn" style={{flex: 1}}>⚔️ Challenge Friends</button>
      </div>
    </div>
  );
};


// Mocked game utils
const game = {
  calculateCoins: (score, maxCombo) => {
    // A simple formula to calculate coins earned
    return Math.floor(score / 10) + (maxCombo * 5);
  }
};

// --- END: Mocked Dependencies ---


// 🐱 SIX MEOWCHI CATS
const CAT_SET = [
  "https://ik.imagekit.io/59r2kpz8r/Meowchi/Boba.webp?updatedAt=1756284887507",
  "https://ik.imagekit.io/59r2kpz8r/Meowchi/Cheese.webp?updatedAt=1756284887499",
  "https://ik.imagekit.io/59r2kpz8r/Meowchi/Meowchi.webp?updatedAt=1756284887490",
  "https://ik.imagekit.io/59r2kpz8r/Meowchi/Boba.webp?updatedAt=1756284887507", // Replaced broken Oreo link
  "https://ik.imagekit.io/59r2kpz8r/Meowchi/Panthera.webp?updatedAt=1756284887493",
  "https://ik.imagekit.io/59r2kpz8r/Meowchi/Patches.webp?updatedAt=1756284887491",
];

const randCat = () => CAT_SET[Math.floor(Math.random() * CAT_SET.length)];

const MemoizedTile = React.memo(({
  r, c, value, cell, isSelected, isHinted, isBlasting, isSwapping,
  isGrab, isShake, swapTransform, EMOJI_SIZE, onClick
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
        transition: isSwapping ? "transform 0.16s ease" : "top 0.16s ease",
      }}
      onClick={onClick}
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

const COLS = 6;
const ROWS = 6;
const CELL_MIN = 36;
const CELL_MAX = 88;
const GAME_DURATION = 60;
const EMOJI_SIZE = 0.8;

const POWERUP_DEFINITIONS = {
  shuffle: { name: "Paw-sitive Swap", icon: "🐾" },
  hammer: { name: "Catnip Cookie", icon: "🍪" },
  bomb: { name: "Marshmallow Bomb", icon: "💣" },
};

export default function GameView({ onExit }) {
  const containerRef = useRef(null);
  const boardRef = useRef(null);
  const [cell, setCell] = useState(48);

  const [grid, setGrid] = useState(() => initSolvableGrid());
  const gridRef = useRef(grid);
  gridRef.current = grid;

  const [sel, setSel] = useState(null);
  const [hint, setHint] = useState(null);
  const [swapping, setSwapping] = useState(null);

  const [score, setScore] = useState(0);
  const [combo, setCombo] = useState(0);
  const [fx, setFx] = useState([]);
  const [blast, setBlast] = useState(new Set());
  const [timeLeft, setTimeLeft] = useState(GAME_DURATION);

  const [gameStartTime, setGameStartTime] = useState(Date.now());
  const [moveCount, setMoveCount] = useState(0);
  const [maxComboAchieved, setMaxComboAchieved] = useState(0);

  const [paused, setPaused] = useState(false);
  const [grabTile, setGrabTile] = useState(null);
  const [shake, setShake] = useState(new Set());

  // State previously managed by useStore
  const [powerups, setPowerups] = useState({ shuffle: 3, hammer: 3, bomb: 3 });
  
  const consumePowerup = useCallback((key) => {
    setPowerups(prev => ({ ...prev, [key]: Math.max(0, prev[key] - 1) }));
  }, []);
  
  const addCoins = useCallback((amount) => {
    console.log(`Congratulations! You earned ${amount} coins.`);
  }, []);

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

  const handleGameEnd = useCallback(() => {
    const finalScore = score;
    const coinsEarned = game.calculateCoins(finalScore, maxComboAchieved);
    addCoins(coinsEarned);
  }, [score, maxComboAchieved, addCoins]);

  useEffect(() => {
    if (paused || timeLeft <= 0) return;
    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          handleGameEnd();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [paused, timeLeft, handleGameEnd]);

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
  
  useEffect(() => {
    if (blast.size > 0) {
      const timer = setTimeout(() => setBlast(new Set()), 300);
      return () => clearTimeout(timer);
    }
  }, [blast]);

  useEffect(() => {
    if (fx.length > 0) {
      const timer = setTimeout(() => setFx([]), 800);
      return () => clearTimeout(timer);
    }
  }, [fx]);

  useEffect(() => {
    if (shake.size > 0) {
      const timer = setTimeout(() => setShake(new Set()), 300);
      return () => clearTimeout(timer);
    }
  }, [shake]);
  
  const resolveCascades = useCallback((start, done) => {
    let current = cloneGrid(start);
    let cascadeCount = combo;

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
        const comboMultiplier = Math.max(1, cascadeCount);
        const pointsEarned = basePoints * comboMultiplier;

        if (comboMultiplier >= 4) {
          setFx(prev => [...prev, { value: `x${comboMultiplier}`, id: Date.now() }]);
          audio.play("combo_x4");
        } else if (comboMultiplier >= 2) {
          audio.play("combo_x2");
        } else {
          audio.play("match_pop");
        }

        setScore(s => s + pointsEarned);
        
        applyGravity(current);
        refill(current);
        setGrid(cloneGrid(current));

        setTimeout(processCascade, 200);
      }, 150);
    };

    processCascade();
  }, [maxComboAchieved, combo]);

  const handleTileClick = useCallback((r, c) => {
    if (swapping || paused || timeLeft <= 0) return;

    if (sel) {
      const [r1, c1] = sel;
      if (r1 === r && c1 === c) {
        setSel(null);
        return;
      }

      if (Math.abs(r1 - r) + Math.abs(c1 - c) !== 1) {
        setSel([r, c]);
        return;
      }

      const g = cloneGrid(gridRef.current);
      [g[r1][c1], g[r][c]] = [g[r][c], g[r1][c1]];

      if (findMatches(g).length > 0) {
        setSel(null);
        setSwapping({ from: { r: r1, c: c1 }, to: { r, c } });
        setMoveCount(m => m + 1);
        setCombo(0); // Reset combo on manual move
        audio.play("swap");
        setTimeout(() => {
          setGrid(g);
          setSwapping(null);
          resolveCascades(g, (finalGrid) => setGrid(finalGrid));
        }, 160);
      } else {
        setSel(null);
        setShake(prev => new Set(prev.add(`${r}:${c}`).add(`${r1}:${c1}`)));
        audio.play("swap_invalid");
      }
    } else {
      setSel([r, c]);
    }
  }, [sel, swapping, paused, timeLeft, resolveCascades]);

  const handlePowerupUse = useCallback((key) => {
    if (powerups[key] <= 0 || paused || timeLeft <= 0) return;

    consumePowerup(key);
    let g = cloneGrid(gridRef.current);

    if (key === "shuffle") {
      g = shuffleToSolvable(g);
      audio.play("powerup_spawn");
      setGrid(g);
      setTimeout(() => resolveCascades(g, (finalGrid) => setGrid(finalGrid)), 200);
    } else if (key === "hammer" && sel) {
      const [r, c] = sel;
      g[r][c] = null;
      setSel(null);
      applyGravity(g);
      refill(g);
      setGrid(g);
      audio.play("powerup_spawn");
      setTimeout(() => resolveCascades(g, (finalGrid) => setGrid(finalGrid)), 200);
    } else if (key === "bomb" && sel) {
      const [r, c] = sel;
      for (let rr = r - 1; rr <= r + 1; rr++) {
        for (let cc = c - 1; cc <= c + 1; cc++) {
          if (inBounds(rr, cc)) g[rr][cc] = null;
        }
      }
      setSel(null);
      applyGravity(g);
      refill(g);
      setGrid(g);
      audio.play("powerup_spawn");
      setTimeout(() => resolveCascades(g, (finalGrid) => setGrid(finalGrid)), 200);
    } else {
      audio.play("swap_invalid");
    }
  }, [sel, powerups, paused, timeLeft, resolveCascades, consumePowerup]);

  const boardW = cell * COLS;
  const boardH = cell * ROWS;

  const formatTime = (seconds) => `${Math.floor(seconds / 60)}:${(seconds % 60).toString().padStart(2, "0")}`;
  const getTimerColor = () => timeLeft <= 10 ? "#e74c3c" : timeLeft <= 30 ? "#f39c12" : "#27ae60";

  const isGameOver = timeLeft <= 0;

  return (
    <div className="game-container" ref={containerRef}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 20px", borderBottom: "1px solid var(--line)" }}>
        <button className="btn" onClick={() => onExit?.({ score, moves: moveCount, maxCombo: maxComboAchieved })} style={{ fontSize: "14px", padding: "8px 16px" }}>
          ← Exit
        </button>
        <div style={{ textAlign: "center", background: `linear-gradient(135deg, ${getTimerColor()}, ${getTimerColor()}cc)`, color: "white", padding: "8px 16px", borderRadius: "12px", fontWeight: "700" }}>
          {formatTime(timeLeft)}
          <button onClick={() => setPaused(!paused)} style={{ marginLeft: "10px", background: "rgba(255,255,255,0.2)", border: "1px solid rgba(255,255,255,0.3)", borderRadius: "4px", color: "white", padding: "2px 8px", fontSize: "11px", cursor: "pointer" }}>
            {paused ? "▶️" : "⏸"}
          </button>
        </div>
      </div>

      <div style={{ display: "flex", justifyContent: "space-around", alignItems: "center", padding: "16px 20px", borderBottom: "1px solid var(--line)" }}>
        {[{label: 'SCORE', value: score.toLocaleString()}, {label: 'MOVES', value: moveCount}, {label: 'COMBO', value: `${combo}x`}].map(stat => (
            <div key={stat.label} style={{ textAlign: "center" }}>
                <div style={{ fontSize: "20px", fontWeight: "800", color: "var(--text)" }}>{stat.value}</div>
                <div style={{ fontSize: "11px", color: "var(--muted)", fontWeight: "600" }}>{stat.label}</div>
            </div>
        ))}
      </div>

      <div style={{ padding: "20px", textAlign: "center", position: "relative" }}>
        <div
          className="board"
          ref={boardRef}
          style={{
            position: "relative", margin: "0 auto", width: boardW, height: boardH,
            background: "var(--card)", borderRadius: "16px", border: "1px solid var(--line)",
            overflow: "hidden", filter: isGameOver ? 'blur(4px)' : 'none', transition: 'filter 0.3s ease'
          }}
        >
          {grid.map((row, r) => row.map((v, c) => {
              if (v === null) return null;
              const isSelected = sel && sel[0] === r && sel[1] === c;
              const isHinted = hint && ((hint[0][0] === r && hint[0][1] === c) || (hint[1][0] === r && hint[1][1] === c));
              const isBlasting = blast.has(`${r}:${c}`);
              let swapTransform = "";
              if (swapping) {
                  if (swapping.from.r === r && swapping.from.c === c) swapTransform = `translate(${(swapping.to.c - c) * cell}px, ${(swapping.to.r - r) * cell}px)`;
                  else if (swapping.to.r === r && swapping.to.c === c) swapTransform = `translate(${(swapping.from.c - c) * cell}px, ${(swapping.from.r - r) * cell}px)`;
              }
              const isGrab = grabTile && grabTile.r === r && grabTile.c === c;
              const isShake = shake.has(`${r}:${c}`);
              
              return (
                  <MemoizedTile
                      key={`${r}-${c}-${v}`} r={r} c={c} value={v} cell={cell}
                      isSelected={isSelected} isHinted={isHinted} isBlasting={isBlasting}
                      isSwapping={!!swapping} isGrab={isGrab} isShake={isShake}
                      swapTransform={swapTransform} EMOJI_SIZE={EMOJI_SIZE}
                      onClick={() => handleTileClick(r, c)}
                  />
              );
          }))}
          {fx.map(f => (
            <div key={f.id} className="combo-pop" style={{ position: "absolute", top: "50%", left: "50%", zIndex: 100 }}>{f.value}</div>
          ))}
        </div>
        
        {isGameOver && (
          <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', zIndex: 200, width: '90%' }}>
             <ShareButtons score={score} />
          </div>
        )}
      </div>

      <div style={{ display: "flex", gap: "8px", padding: "16px 20px", borderTop: "1px solid var(--line)" }}>
        {Object.entries(POWERUP_DEFINITIONS).map(([key, def]) => (
          <button
            key={key} className={`btn ${powerups[key] > 0 ? "primary" : ""}`}
            onClick={() => handlePowerupUse(key)} disabled={powerups[key] <= 0 || isGameOver}
            style={{ flex: 1, fontSize: "12px", padding: "10px 8px", display: "flex", flexDirection: "column", alignItems: "center", gap: "4px" }}
          >
            <span style={{ fontSize: "16px" }}>{def.icon}</span>
            <span>{def.name}</span>
            <span style={{ fontSize: "10px", opacity: 0.8 }}>({powerups[key]})</span>
          </button>
        ))}
      </div>
    </div>
  );
}

// --- Helper Functions ---
function cloneGrid(g) { return g.map(row => row.slice()); }
function inBounds(r, c) { return r >= 0 && c >= 0 && r < ROWS && c < COLS; }
function pickDifferent(curr) {
  const choices = CAT_SET.filter(x => x !== curr);
  return choices[Math.floor(Math.random() * choices.length)];
}

function findMatches(g) {
    const matches = new Set();
    for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c < COLS - 2; c++) {
            if (g[r][c] && g[r][c] === g[r][c + 1] && g[r][c] === g[r][c + 2]) {
                for (let i = 0; i < 3; i++) matches.add(`${r}:${c + i}`);
            }
        }
    }
    for (let c = 0; c < COLS; c++) {
        for (let r = 0; r < ROWS - 2; r++) {
            if (g[r][c] && g[r][c] === g[r + 1][c] && g[r][c] === g[r + 2][c]) {
                for (let i = 0; i < 3; i++) matches.add(`${r + i}:${c}`);
            }
        }
    }
    return Array.from(matches).map(s => s.split(':').map(Number));
}

function applyGravity(g) {
  for (let c = 0; c < COLS; c++) {
    let emptyRow = ROWS - 1;
    for (let r = ROWS - 1; r >= 0; r--) {
        if (g[r][c] !== null) {
            [g[emptyRow][c], g[r][c]] = [g[r][c], g[emptyRow][c]];
            emptyRow--;
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
      if (c < COLS - 1) {
        const ng = cloneGrid(g);
        [ng[r][c], ng[r][c+1]] = [ng[r][c+1], ng[r][c]];
        if (findMatches(ng).length > 0) return true;
      }
      if (r < ROWS - 1) {
        const ng = cloneGrid(g);
        [ng[r][c], ng[r+1][c]] = [ng[r+1][c], ng[r][c]];
        if (findMatches(ng).length > 0) return true;
      }
    }
  }
  return false;
}

function shuffleToSolvable(g) {
    let attempts = 0;
    while(attempts < 100) {
        // Simple shuffle: swap two random tiles 50 times
        for (let i = 0; i < 50; i++) {
            const r1 = Math.floor(Math.random() * ROWS);
            const c1 = Math.floor(Math.random() * COLS);
            const r2 = Math.floor(Math.random() * ROWS);
            const c2 = Math.floor(Math.random() * COLS);
            [g[r1][c1], g[r2][c2]] = [g[r2][c2], g[r1][c1]];
        }
        // Remove initial matches
        let matches = findMatches(g);
        while(matches.length > 0) {
            matches.forEach(([r,c]) => g[r][c] = randCat());
            matches = findMatches(g);
        }
        if (hasAnyMove(g)) return g;
        attempts++;
    }
    console.warn("Could not generate a solvable grid.");
    return g;
}

function initSolvableGrid() {
  const g = Array.from({ length: ROWS }, () => Array(COLS).fill(null));
  refill(g);
  return shuffleToSolvable(g);
}

function findFirstMove(g) {
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      if (c < COLS - 1) {
        const ng = cloneGrid(g);
        [ng[r][c], ng[r][c+1]] = [ng[r][c+1], ng[r][c]];
        if (findMatches(ng).length > 0) return [[r,c], [r,c+1]];
      }
      if (r < ROWS - 1) {
        const ng = cloneGrid(g);
        [ng[r][c], ng[r+1][c]] = [ng[r+1][c], ng[r][c]];
        if (findMatches(ng).length > 0) return [[r,c], [r+1,c]];
      }
    }
  }
  return null;
}
