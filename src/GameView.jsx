// src/GameView.jsx
import React, { useEffect, useRef, useState, useCallback, useMemo } from "react";
import * as audio from "./audio"; // minimal sound hooks
import ShareButtons from "./ShareButtons.jsx";
import { game } from "./utils.js";
import { useStore } from "./store.js";

// Memoized tile component for performance
const MemoizedTile = React.memo(({
  r, c, value, cell, isSelected, isHinted, isSwapping,
  isNewTile, isGrab, isShake, swapTransform, delaySeconds, EMOJI_SIZE, isBlasting
}) => {
  return (
    <div
      key={`tile-${r}-${c}`}
      className={`tile ${isSelected ? "sel" : ""} ${isHinted ? "hint" : ""} ${isGrab ? "grab" : ""} ${isShake ? "shake" : ""} ${isBlasting ? "blasting" : ""}`}
      style={{
        left: c * cell,
        top: r * cell,
        width: cell,
        height: cell,
        transform: swapTransform || undefined,
        zIndex: isGrab ? 5 : isBlasting ? 10 : 1,
        transition: isSwapping
          ? "transform 0.16s ease"
          : delaySeconds
          ? `top 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94) ${delaySeconds}s`
          : "top 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94)",
      }}
    >
      <div
        className={`emoji ${isGrab ? "grab" : ""} ${isShake ? "shake" : ""}`}
        style={{ fontSize: Math.floor(cell * EMOJI_SIZE) }}
      >
        {value}
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

const CANDY_SET = ["\uD83D\uDE3A", "\uD83E\uDD68", "\uD83C\uDF53", "\uD83C\uDF6A", "\uD83C\uDF61"];
const randEmoji = () => CANDY_SET[(Math.random() * CANDY_SET.length) | 0];

const POWERUP_DEFINITIONS = {
  shuffle: { name: "Paw-sitive Swap", icon: "🐾" },
  hammer: { name: "Catnip Cookie", icon: "🍪" },
  bomb: { name: "Marshmallow Bomb", icon: "💣" },
};

export default function GameView({ onExit, settings, userTelegramId }) {
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
  const [moves, setMoves] = useState(20);
  const [combo, setCombo] = useState(0);
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
  
  const [gameOverState, setGameOverState] = useState(null);
  
  const [draggedPowerup, setDraggedPowerup] = useState(null);
  const [dragPosition, setDragPosition] = useState({ x: 0, y: 0, visible: false });

  const [blastingTiles, setBlastingTiles] = useState(new Set());
  const [feedbackText, setFeedbackText] = useState(null);

  const [activePowerup, setActivePowerup] = useState(null);
  const powerups = useStore(s => s.powerups);
  const setPowerups = useStore(s => s.setPowerups);

  const consumePowerup = useCallback(async (powerupKey) => {
    setPowerups(prev => ({ ...prev, [powerupKey]: (prev[powerupKey] || 1) - 1 }));
    try {
      const response = await fetch('/api/powerups/use', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          telegram_id: userTelegramId,
          item_id: powerupKey,
          initData: window.Telegram?.WebApp?.initData,
        }),
      });
      if (!response.ok) throw new Error('Server error on powerup use');
    } catch (error) {
      setPowerups(prev => ({ ...prev, [powerupKey]: (prev[powerupKey] || 0) + 1 }));
      console.error("Error consuming powerup:", error);
    }
  }, [userTelegramId, setPowerups]);

  useEffect(() => {
    const tg = window.Telegram?.WebApp;
    tg?.enableClosingConfirmation();
    return () => tg?.disableClosingConfirmation();
  }, []);

  const timeLeftRef = useRef(timeLeft);
  timeLeftRef.current = timeLeft;

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
    const ro = new ResizeObserver(compute);
    if (containerRef.current) ro.observe(containerRef.current);
    window.addEventListener("resize", compute);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", compute);
    };
  }, []);

  useEffect(() => {
    if (paused || gameOverState) return;
    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          finish();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [paused, gameOverState]);

  function haptic(ms = 12) {
    if (!settings?.haptics) return;
    try { navigator.vibrate?.(ms); } catch {}
  }

  async function submitGameScore(finalScore) {
    if (!userTelegramId) return { user_needs_profile: false, coins_earned: 0 };
    const coinsEarned = game.calculateCoins(finalScore, maxComboAchieved);
    try {
      const response = await fetch("/api/game/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          telegram_id: userTelegramId,
          score: finalScore,
          coins_earned: coinsEarned,
          max_combo: maxComboAchieved,
          game_duration: Math.floor((Date.now() - gameStartTime) / 1000),
          initData: window.Telegram?.WebApp?.initData,
        }),
      });
      const result = await response.json();
      return { ...result, coins_earned: coinsEarned };
    } catch (error) {
      console.error("Error submitting score:", error);
      return { user_needs_profile: false, coins_earned: coinsEarned };
    }
  }

  const handlePowerupPointerDown = (e, key) => {
    if (powerups[key] <= 0 || animatingRef.current || key === 'shuffle') return;
    
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);
    
    setDraggedPowerup({ key, icon: POWERUP_DEFINITIONS[key].icon });
    setDragPosition({ x: e.clientX, y: e.clientY, visible: true });
    haptic(8);

    const handlePointerMove = (moveEvent) => {
      setDragPosition({ x: moveEvent.clientX, y: moveEvent.clientY, visible: true });
    };

    const handlePointerUp = (upEvent) => {
      e.currentTarget.releasePointerCapture(e.pointerId);
      
      const boardEl = boardRef.current;
      if (boardEl) {
        const rect = boardEl.getBoundingClientRect();
        const isOverBoard = (
          upEvent.clientX >= rect.left && upEvent.clientX <= rect.right &&
          upEvent.clientY >= rect.top && upEvent.clientY <= rect.bottom
        );

        if (isOverBoard) {
          const x = upEvent.clientX - rect.left;
          const y = upEvent.clientY - rect.top;
          const r = Math.floor(y / cell);
          const c = Math.floor(x / cell);
          if (inBounds(r, c)) {
            applyPowerup(key, r, c);
          }
        }
      }

      setDraggedPowerup(null);
      setDragPosition({ x: 0, y: 0, visible: false });
      
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
    };

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
  };

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
      if (timeLeftRef.current <= 0 || animatingRef.current) return;
      el.setPointerCapture?.(e.pointerId);
      const p = rc(e);
      if (!inBounds(p.r, p.c)) return;

      drag = { r: p.r, c: p.c, x: p.x, y: p.y, dragging: false };
      setSel({ r: p.r, c: p.c });
      setGrabTile({ r: p.r, c: p.c });
      haptic(5);
    };

    const move = (e) => {
      if (!drag || timeLeftRef.current <= 0) return;
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
        if (timeLeftRef.current > 0) {
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

  const optimizedResolveCascades = useCallback((startGrid, done, initialCombo = 0) => {
    setAnimating(true);
    let g = cloneGrid(startGrid);
    let currentCombo = initialCombo;

    const step = () => {
        const matches = findMatches(g);
        if (matches.length === 0) {
            setGrid(g);
            setNewTiles(new Set());
            if (currentCombo > 0) {
                setMaxComboAchieved(prev => Math.max(prev, currentCombo));
                setCombo(currentCombo);
                setTimeout(() => setCombo(0), 1500);
            }
            ensureSolvable();
            setAnimating(false);
            done?.();
            return;
        }

        audio.play?.("match_pop", { volume: 0.5 });
        const newBlastingTiles = new Set();
        matches.forEach(([r, c]) => newBlastingTiles.add(`${r}-${c}`));
        setBlastingTiles(newBlastingTiles);
        
        const points = 10 * matches.length * (currentCombo + 1);
        setScore(s => s + points);

        setTimeout(() => {
            matches.forEach(([r, c]) => { g[r][c] = null; });
            setGrid(cloneGrid(g));
            setBlastingTiles(new Set());

            setTimeout(() => {
                applyGravity(g);
                const empties = new Set();
                for (let r = 0; r < ROWS; r++) {
                    for (let c = 0; c < COLS; c++) {
                        if (g[r][c] === null) {
                            empties.add(`${r}-${c}`);
                            g[r][c] = randEmoji();
                        }
                    }
                }
                setNewTiles(empties);
                setGrid(cloneGrid(g));
                
                setTimeout(() => {
                    setNewTiles(new Set());
                    currentCombo++;
                    step();
                }, 150);
            }, 100);
        }, 200);
    };
    step();
  }, []);

  function trySwap(r1, c1, r2, c2) {
    if (timeLeft <= 0 || animatingRef.current) return;
    if (Math.abs(r1 - r2) + Math.abs(c1 - c2) !== 1) return;

    const g = cloneGrid(gridRef.current);
    [g[r1][c1], g[r2][c2]] = [g[r2][c2], g[r1][c1]];
    const matches = findMatches(g);

    if (matches.length === 0) {
      const s = new Set(shake);
      s.add(`${r1}-${c1}`); s.add(`${r2}-${c2}`);
      setShake(s);
      setTimeout(() => {
        setShake((prev) => {
          const n = new Set(prev);
          n.delete(`${r1}-${c1}`); n.delete(`${r2}-${c2}`);
          return n;
        });
      }, 140);
      haptic(8);
      audio.play?.("swap_invalid", { volume: 0.5 });
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
      optimizedResolveCascades(g, () => {
        if (timeLeftRef.current <= 0) finish();
      });
    }, 200);
  }

  function doHint() {
    if (timeLeft <= 0 || animatingRef.current) return;
    const m = findFirstMove(gridRef.current);
    if (!m) { shuffleBoard(); return; }
    setHint(m);
    setFeedbackText({ text: '💡 TIP', r: m[0][0], c: m[0][1], key: `feedback-${Date.now()}` });
    setTimeout(() => setHint(null), 1200);
    setTimeout(() => setFeedbackText(null), 1000);
    haptic(10);
  }

  function shuffleBoard() {
    if (timeLeft <= 0 || animatingRef.current) return;
    const g = shuffleToSolvable(gridRef.current);
    setGrid(g);
    haptic(12);
  }

  function ensureSolvable() {
    if (!hasAnyMove(gridRef.current))
      setGrid(shuffleToSolvable(gridRef.current));
  }

  async function finish() {
    setGameOverState('calculating');
    const finalScore = score.current;
    const result = await submitGameScore(finalScore);
    const serverCoins = Math.max(0, Number(result?.coins_earned ?? 0));
    const gameResult = {
      score: finalScore,
      coins: serverCoins,
      moves_used: moveCount,
      max_combo: maxComboAchieved,
      gameSubmitted: !!result,
      showSharing: true,
    };
    setTimeout(() => onExit(gameResult), 500);
  }

  function resetGame() {
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
  }

  const handlePowerupSelect = (key) => {
    if (powerups[key] > 0 && !animatingRef.current) {
      if (key === 'shuffle') {
        shuffleBoard();
        consumePowerup('shuffle');
      }
      haptic(10);
    }
  };

  const applyPowerup = (key, r, c) => {
    if (animatingRef.current) return;
    
    const g = cloneGrid(gridRef.current);
    let applied = false;
    let feedback = null;
    let tilesToRemove = new Set();

    if (key === 'hammer') {
      const targetCookie = g[r][c];
      if (CANDY_SET.includes(targetCookie)) {
        for (let row = 0; row < ROWS; row++) {
          for (let col = 0; col < COLS; col++) {
            if (g[row][col] === targetCookie) tilesToRemove.add(`${row}-${col}`);
          }
        }
        feedback = { text: '🔥 FIRE!', r, c, key: `feedback-${Date.now()}` };
        applied = true;
      }
    } else if (key === 'bomb') {
      for (let row = r - 1; row <= r + 1; row++) {
        for (let col = c - 1; col <= c + 1; col++) {
          if (inBounds(row, col)) tilesToRemove.add(`${row}-${col}`);
        }
      }
      feedback = { text: '💥 BOOM!', r, c, key: `feedback-${Date.now()}` };
      applied = true;
    }

    if (applied) {
      setAnimating(true);
      audio.play?.('powerup_use', { volume: 0.8 });
      if (feedback) {
        setFeedbackText(feedback);
        setTimeout(() => setFeedbackText(null), 1000);
      }
      
      setBlastingTiles(tilesToRemove);
      consumePowerup(key);
      
      setTimeout(() => {
        const nextGrid = cloneGrid(g);
        tilesToRemove.forEach(key => {
          const [row, col] = key.split('-').map(Number);
          nextGrid[row][col] = null;
        });
        
        setBlastingTiles(new Set());
        
        // --- CORRECTED REFILL LOGIC ---
        applyGravity(nextGrid);
        const empties = new Set();
        for (let row = 0; row < ROWS; row++) {
            for (let col = 0; col < COLS; col++) {
                if (nextGrid[row][col] === null) {
                    empties.add(`${row}-${col}`);
                    nextGrid[row][col] = randEmoji();
                }
            }
        }
        setNewTiles(empties);
        setGrid(cloneGrid(nextGrid));

        setTimeout(() => {
          setNewTiles(new Set());
          // Now check for cascades from the refilled grid
          optimizedResolveCascades(nextGrid, () => {
            if (timeLeftRef.current <= 0) finish();
          });
        }, 150);

      }, 200);

    } else {
      haptic(8);
      audio.play?.("swap_invalid", { volume: 0.5 });
    }
  };

  const boardW = cell * COLS;
  const boardH = cell * ROWS;
  const formatTime = (seconds) => `${Math.floor(seconds / 60)}:${(seconds % 60).toString().padStart(2, "0")}`;
  const getTimerColor = () => timeLeft <= 10 ? "#e74c3c" : timeLeft <= 30 ? "#f39c12" : "#27ae60";

  const optimizedGridRender = useMemo(() => {
    return grid.map((row, r) =>
      row.map((v, c) => {
        const isSelected = sel?.r === r && sel?.c === c;
        const isHinted = hint && ((hint[0][0] === r && hint[0][1] === c) || (hint[1][0] === r && hint[1][1] === c));
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
        const isSwapping = !!swapping && ((swapping.from.r === r && swapping.from.c === c) || (swapping.to.r === r && swapping.to.c === c));
        const tileKey = `${r}-${c}`;
        const isNewTile = newTiles.has(tileKey);
        const isGrab = grabTile?.r === r && grabTile?.c === c;
        const isShake = shake.has(tileKey);
        const delaySeconds = isSwapping ? 0 : fallDelay[tileKey] || 0;
        const isBlasting = blastingTiles.has(tileKey);

        return (
          <MemoizedTile
            key={tileKey} r={r} c={c} value={v} cell={cell}
            isSelected={isSelected} isHinted={isHinted} isSwapping={isSwapping}
            isNewTile={isNewTile} isGrab={isGrab} isShake={isShake}
            swapTransform={swapTransform} delaySeconds={delaySeconds}
            EMOJI_SIZE={EMOJI_SIZE} isBlasting={isBlasting}
          />
        );
      })
    );
  }, [grid, sel, hint, swapping, newTiles, grabTile, shake, fallDelay, cell, blastingTiles]);

  return (
    <div className="section board-wrap" ref={containerRef}>
      {draggedPowerup && dragPosition.visible && (
        <div 
          className="powerup-drag-icon" 
          style={{ 
            position: 'fixed', 
            left: dragPosition.x, 
            top: dragPosition.y,
            transform: 'translate(-50%, -50%)',
            pointerEvents: 'none',
            zIndex: 1001
          }}
        >
          {draggedPowerup.icon}
        </div>
      )}
      
      {gameOverState === 'calculating' && (
        <div className="calculating-overlay">
          <div className="calculating-content">
            <div className="calculating-icon">⏳</div>
            <div className="calculating-text">Time's Up!</div>
          </div>
        </div>
      )}
      <div className="timer-display" style={{ borderColor: getTimerColor(), color: getTimerColor(), boxShadow: `0 0 0 3px ${getTimerColor()}20` }}>
        \u23F0 {formatTime(timeLeft)}
      </div>

      <div className="row">
        <div><span className="muted">Score</span> <b>{score}</b></div>
        <div className="combo-meter-container">
          <div className="combo-meter-bar"><div className="combo-meter-fill" style={{ width: `${Math.min((combo / 5) * 100, 100)}%` }}></div></div>
          <b>{combo > 0 ? `\uD83D\uDD25 COMBO x${combo + 1}` : "Combo"}</b>
        </div>
        <div><span className="muted">Moves</span> <b>{moves}</b></div>
      </div>

      {combo > 0 && <div className="combo-celebration">\uD83D\uDCA5 \uD83C\uDF6C Sweet Combo x{combo + 1}! \uD83C\uDF6C \uD83D\uDCA5</div>}

      <div ref={boardRef} className="board" style={{ width: boardW, height: boardH, position: 'relative' }}>
        <div className="gridlines" style={{ backgroundImage: `linear-gradient(var(--line) 1px, transparent 1px), linear-gradient(90deg, var(--line) 1px, transparent 1px)`, backgroundSize: `${cell}px ${cell}px` }} />
        {optimizedGridRender}
        {feedbackText && (
          <div key={feedbackText.key} className="feedback-text" style={{ left: feedbackText.c * cell + cell / 2, top: feedbackText.r * cell + cell / 2 }}>
            {feedbackText.text}
          </div>
        )}
      </div>

      <div className="powerup-tray">
        {Object.entries(POWERUP_DEFINITIONS).map(([key, def]) => (
          <button
            key={key}
            className={`powerup-btn ${activePowerup === key ? 'active' : ''}`}
            onClick={() => handlePowerupSelect(key)}
            onPointerDown={(e) => handlePowerupPointerDown(e, key)}
            disabled={!powerups[key] || powerups[key] <= 0 || animating}
            title={`${def.name} (Owned: ${powerups[key] || 0})`}
            style={{ touchAction: 'none' }}
          >
            <div className="powerup-icon">{def.icon}</div>
            <div className="powerup-quantity">{powerups[key] || 0}</div>
          </button>
        ))}
      </div>

      <div className="row" style={{ gap: 8, marginTop: 12 }}>
        <button className="btn" onClick={() => doHint()} disabled={timeLeft <= 0 || animating}>💡 Hint</button>
        <button className="btn" onClick={() => shuffleBoard()} disabled={timeLeft <= 0 || animating}>🔀 Shuffle</button>
        <button className="btn" onClick={() => resetGame()}>🔄 Reset</button>
        <button className="btn" onClick={() => setPaused(p => !p)}>{paused ? "▶️ Resume" : "⏸ Pause"}</button>
      </div>

      <div className="progress" style={{ width: `${(timeLeft / GAME_DURATION) * 100}%`, height: 6, background: getTimerColor(), borderRadius: 6, marginTop: 10 }} />
    </div>
  );
}

// ====== Helpers ======
function initSolvableGrid() {
  const g = Array.from({ length: ROWS }, () => Array.from({ length: COLS }, () => randEmoji()));
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      if (c >= 2 && g[r][c] === g[r][c - 1] && g[r][c] === g[r][c - 2]) g[r][c] = pickDifferent(g[r][c]);
      if (r >= 2 && g[r][c] === g[r - 1][c] && g[r][c] === g[r - 2][c]) g[r][c] = pickDifferent(g[r][c]);
    }
  }
  if (!hasAnyMove(g)) return shuffleToSolvable(g);
  return g;
}

function pickDifferent(curr) {
  const choices = CANDY_SET.filter((x) => x !== curr);
  return choices[(Math.random() * choices.length) | 0];
}

function cloneGrid(g) { return g.map((row) => row.slice()); }
function inBounds(r, c) { return r >= 0 && c >= 0 && r < ROWS && c < COLS; }

function findMatches(g) {
  const matches = [];
  const matched = new Set();
  const addMatch = (r, c) => {
    const key = `${r}-${c}`;
    if (!matched.has(key)) {
      matches.push([r, c]);
      matched.add(key);
    }
  };
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS - 2; c++) {
      if (g[r][c] && g[r][c] === g[r][c + 1] && g[r][c] === g[r][c + 2]) {
        addMatch(r, c); addMatch(r, c + 1); addMatch(r, c + 2);
      }
    }
  }
  for (let c = 0; c < COLS; c++) {
    for (let r = 0; r < ROWS - 2; r++) {
      if (g[r][c] && g[r][c] === g[r + 1][c] && g[r][c] === g[r + 2][c]) {
        addMatch(r, c); addMatch(r + 1, c); addMatch(r + 2, c);
      }
    }
  }
  return matches;
}

function applyGravity(g) {
  for (let c = 0; c < COLS; c++) {
    let writeRow = ROWS - 1;
    for (let r = ROWS - 1; r >= 0; r--) {
      if (g[r][c] !== null) {
        if (writeRow !== r) {
          g[writeRow][c] = g[r][c];
          g[r][c] = null;
        }
        writeRow--;
      }
    }
  }
}

function refill(g) {
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      if (g[r][c] === null) g[r][c] = randEmoji();
    }
  }
}

function hasAnyMove(g) {
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const dirs = [[0, 1], [1, 0]];
      for (const [dr, dc] of dirs) {
        const r2 = r + dr; const c2 = c + dc;
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
  let attempts = 0;
  while (attempts++ < 200) {
    const flat = g.flat();
    for (let i = flat.length - 1; i > 0; i--) {
      const j = (Math.random() * (i + 1)) | 0;
      [flat[i], flat[j]] = [flat[j], flat[i]];
    }
    const ng = [];
    for (let r = 0; r < ROWS; r++) ng.push(flat.slice(r * COLS, r * COLS + COLS));
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        if (c >= 2 && ng[r][c] === ng[r][c - 1] && ng[r][c] === ng[r][c - 2]) ng[r][c] = pickDifferent(ng[r][c]);
        if (r >= 2 && ng[r][c] === ng[r - 1][c] && ng[r][c] === ng[r - 2][c]) ng[r][c] = pickDifferent(ng[r][c]);
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
        const r2 = r + dr; const c2 = c + dc;
        if (!inBounds(r2, c2)) continue;
        const ng = cloneGrid(g);
        [ng[r][c], ng[r2][c2]] = [ng[r2][c2], ng[r][c]];
        if (findMatches(ng).length > 0) return [[r, c], [r2, c2]];
      }
    }
  }
  return null;
}
