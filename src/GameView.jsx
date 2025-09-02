// FIXED: Complete GameView.jsx - Layout & Performance Optimized
import React, { useEffect, useRef, useState, useCallback, useMemo, useLayoutEffect } from "react";
import * as audio from "./audio"; // minimal sound hooks
import ShareButtons from "./ShareButtons.jsx";
import { game } from "./utils.js";
import { useStore } from "./store.js";

// Special Cat Types
const SPECIAL_TYPES = {
  WHISKER_STREAK_H: 'whisker_streak_h', // Horizontal line clear
  WHISKER_STREAK_V: 'whisker_streak_v', // Vertical line clear
  BOX_CAT: 'box_cat',                   // 3x3 area clear
  CATNIP_BOMB: 'catnip_bomb',           // Clear all of one type
};

// Performance-optimized Memoized tile component
const MemoizedTile = React.memo(({
  r, c, value, cell, isSelected, isHinted, isBlasting, isSwapping,
  isNewTile, isGrab, isShake, swapTransform, delaySeconds, EMOJI_SIZE, specialType,
  effectOverlay
}) => {
  const isSpecial = !!specialType;
  const isImage = value && typeof value === 'string' && value.startsWith('/assets/');
  
  // Get special overlay based on type
  const getSpecialOverlay = () => {
    switch(specialType) {
      case SPECIAL_TYPES.WHISKER_STREAK_H:
        return '⚡'; // Horizontal lightning
      case SPECIAL_TYPES.WHISKER_STREAK_V:
        return '⚡'; // Vertical lightning  
      case SPECIAL_TYPES.BOX_CAT:
        return '💥'; // Explosion symbol
      case SPECIAL_TYPES.CATNIP_BOMB:
        return '🌟'; // Star bomb
      default:
        return null;
    }
  };

  const getSpecialBorder = () => {
    switch(specialType) {
      case SPECIAL_TYPES.WHISKER_STREAK_H:
        return '3px solid #00d4ff'; // Cyan for horizontal
      case SPECIAL_TYPES.WHISKER_STREAK_V:
        return '3px solid #ff6b35'; // Orange for vertical
      case SPECIAL_TYPES.BOX_CAT:
        return '3px solid #f7b731'; // Gold for box
      case SPECIAL_TYPES.CATNIP_BOMB:
        return '3px solid #e056fd'; // Purple for bomb
      default:
        return '1px solid var(--border)';
    }
  };
  
  return (
    <div
      key={`tile-${r}-${c}`}
      className={`tile ${isSelected ? "sel" : ""} ${isHinted ? "hint" : ""} ${isGrab ? "grab" : ""} ${isShake ? "shake" : ""} ${isSpecial ? "special-tile" : ""} ${isSwapping ? "swapping" : ""}`}
      style={{
        left: c * cell,
        top: r * cell,
        width: cell,
        height: cell,
        transform: swapTransform || undefined,
        zIndex: isBlasting ? 10 : isGrab ? 5 : (isSpecial ? 3 : 1),
        transition: isSwapping
          ? "transform 0.1s ease"
          : delaySeconds
          ? `top 0.16s ease ${delaySeconds}s`
          : "top 0.16s ease",
        border: getSpecialBorder(),
        boxShadow: isSpecial ? `0 0 12px ${getSpecialBorder().split(' ')[2]}40` : 'none'
      }}
    >
      <div
        className={`tile-emoji ${isGrab ? "grab" : ""} ${isShake ? "shake" : ""}`}
        style={{ 
          fontSize: isImage ? 'inherit' : Math.floor(cell * (EMOJI_SIZE || 0.5)),
          width: isImage ? '85%' : 'auto',
          height: isImage ? '85%' : 'auto',
          borderRadius: isImage ? '12px' : '0',
          backgroundImage: isImage ? `url(${value})` : 'none',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      >
        {!isImage && value}
      </div>
      
      {/* Special overlay indicator */}
      {isSpecial && (
        <div className="special-overlay">
          {getSpecialOverlay()}
        </div>
      )}
      
      {/* Effect overlay for animations */}
      {effectOverlay && (
        <div className={`special-effect-overlay ${effectOverlay.type}`}>
          {effectOverlay.content}
        </div>
      )}
    </div>
  );
});

// HypeMeter component
const HypeMeter = React.memo(({ currentScore, cascadeLevel }) => {
  const progress = Math.min((currentScore % 1000) / 1000, 1) * 100;
  
  return (
    <div style={{
      margin: '8px 16px',
      padding: '8px 12px',
      background: 'var(--surface)',
      borderRadius: '12px',
      border: '1px solid var(--border)'
    }}>
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '4px'
      }}>
        <span style={{ fontSize: '12px', fontWeight: '600', color: 'var(--text)' }}>
          🔥 Hype Meter
        </span>
        <span style={{ fontSize: '12px', color: 'var(--accent)' }}>
          Level {Math.floor(currentScore / 1000) + 1}
        </span>
      </div>
      <div style={{
        width: '100%',
        height: '6px',
        background: 'var(--bg)',
        borderRadius: '3px',
        overflow: 'hidden'
      }}>
        <div style={{
          width: `${progress}%`,
          height: '100%',
          background: cascadeLevel > 0 
            ? 'linear-gradient(90deg, var(--accent), var(--accent2))' 
            : 'var(--accent)',
          transition: 'width 0.3s ease',
          borderRadius: '3px'
        }} />
      </div>
    </div>
  );
});

export default function GameView({ onExit, settings, userTelegramId }) {
  const ROWS = 6, COLS = 6;
  const EMOJI_SIZE = 0.5;
  
  // State management
  const [grid, setGrid] = useState([]);
  const [specialGrid, setSpecialGrid] = useState([]);
  const [activeEffects, setActiveEffects] = useState([]);
  
  const gridRef = useRef([]);
  const specialGridRef = useRef([]);
  const boardRef = useRef(null);
  
  // Game stats
  const [timeLeft, setTimeLeft] = useState(60);
  const [score, setScore] = useState(0);
  const [combo, setCombo] = useState(0);
  const [cascadeLevel, setCascadeLevel] = useState(0);
  const [totalCascadeTimeBonus, setTotalCascadeTimeBonus] = useState(0);
  
  // Game state
  const [gameStarted, setGameStarted] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  const [gameOverState, setGameOverState] = useState('playing');
  
  // Interaction state
  const [drag, setDrag] = useState(null);
  const [selectedTile, setSelectedTile] = useState(null);
  const [swapPair, setSwapPair] = useState(null);
  const [hintTiles, setHintTiles] = useState([]);
  const [blastCells, setBlastCells] = useState([]);
  const [animatingTiles, setAnimatingTiles] = useState(new Set());
  const [isProcessing, setIsProcessing] = useState(false);
  
  // Visual effects
  const [fx, setFx] = useState([]);
  const [showComboDisplay, setShowComboDisplay] = useState(false);
  const [activePowerup, setActivePowerup] = useState(null);
  
  // Cell size for responsive layout
  const [cell, setCell] = useState(0);

  // Emoji sets
  const CAT_SET = useMemo(() => ['🐱', '🥨', '🍓', '🍪', '🍭'], []);

  // Cell size calculation
  useEffect(() => {
    const calculateCellSize = () => {
      if (!boardRef.current) return;
      
      const rect = boardRef.current.getBoundingClientRect();
      const boardSize = Math.min(rect.width, rect.height);
      const cellSize = Math.floor(boardSize / COLS) - 2;
      setCell(cellSize);
    };
    
    calculateCellSize();
    window.addEventListener('resize', calculateCellSize);
    return () => window.removeEventListener('resize', calculateCellSize);
  }, []);

  // Helper functions
  const inBounds = useCallback((r, c) => r >= 0 && r < ROWS && c >= 0 && c < COLS, []);
  
  const cloneGrid = useCallback((g) => g.map(row => [...row]), []);
  
  const createGrid = useCallback(() => {
    const grid = Array(ROWS).fill().map(() =>
      Array(COLS).fill().map(() => CAT_SET[Math.floor(Math.random() * CAT_SET.length)])
    );
    const specialGrid = Array(ROWS).fill().map(() => Array(COLS).fill(null));
    return { grid, specialGrid };
  }, [CAT_SET]);

  const findMatches = useCallback((g) => {
    const matches = [];
    
    // Horizontal matches
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS - 2; c++) {
        if (g[r][c] && g[r][c] === g[r][c + 1] && g[r][c] === g[r][c + 2]) {
          let length = 3;
          while (c + length < COLS && g[r][c] === g[r][c + length]) {
            length++;
          }
          matches.push({
            type: 'horizontal',
            start: [r, c],
            length,
            cells: Array.from({ length }, (_, i) => [r, c + i])
          });
          c += length - 1;
        }
      }
    }
    
    // Vertical matches
    for (let c = 0; c < COLS; c++) {
      for (let r = 0; r < ROWS - 2; r++) {
        if (g[r][c] && g[r][c] === g[r + 1][c] && g[r][c] === g[r + 2][c]) {
          let length = 3;
          while (r + length < ROWS && g[r][c] === g[r + length][c]) {
            length++;
          }
          matches.push({
            type: 'vertical',
            start: [r, c],
            length,
            cells: Array.from({ length }, (_, i) => [r + i, c])
          });
          r += length - 1;
        }
      }
    }
    
    return matches;
  }, []);

  const applyGravity = useCallback((g) => {
    const newGrid = cloneGrid(g);
    
    for (let c = 0; c < COLS; c++) {
      const column = [];
      for (let r = ROWS - 1; r >= 0; r--) {
        if (newGrid[r][c]) {
          column.push(newGrid[r][c]);
        }
      }
      
      for (let r = 0; r < ROWS; r++) {
        newGrid[r][c] = null;
      }
      
      for (let i = 0; i < column.length; i++) {
        newGrid[ROWS - 1 - i][c] = column[i];
      }
    }
    
    return newGrid;
  }, [cloneGrid]);

  const refillGrid = useCallback((g, sg) => {
    const newGrid = cloneGrid(g);
    const newSpecialGrid = cloneGrid(sg);
    
    for (let c = 0; c < COLS; c++) {
      for (let r = 0; r < ROWS; r++) {
        if (!newGrid[r][c]) {
          newGrid[r][c] = CAT_SET[Math.floor(Math.random() * CAT_SET.length)];
          // Small chance for special cats
          if (Math.random() < 0.1) {
            const specialTypes = Object.values(SPECIAL_TYPES);
            newSpecialGrid[r][c] = specialTypes[Math.floor(Math.random() * specialTypes.length)];
          }
        }
      }
    }
    
    return { grid: newGrid, specialGrid: newSpecialGrid };
  }, [CAT_SET, cloneGrid]);

  // Initialize game
  useEffect(() => {
    const { grid: newGrid, specialGrid: newSpecialGrid } = createGrid();
    setGrid(newGrid);
    setSpecialGrid(newSpecialGrid);
    gridRef.current = newGrid;
    specialGridRef.current = newSpecialGrid;
  }, [createGrid]);

  // Game timer
  useEffect(() => {
    if (!gameStarted || gameOver || timeLeft <= 0) return;
    
    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          setGameOver(true);
          setGameOverState('calculating');
          setTimeout(() => setGameOverState('complete'), 1000);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    
    return () => clearInterval(timer);
  }, [gameStarted, gameOver, timeLeft]);

  // Game over handling
  useEffect(() => {
    if (gameOverState === 'complete' && onExit) {
      const gameResult = {
        score,
        max_combo: combo,
        coins: Math.floor(score / 100),
        moves_used: 0,
        time_bonus: totalCascadeTimeBonus
      };
      onExit(gameResult);
    }
  }, [gameOverState, onExit, score, combo, totalCascadeTimeBonus]);

  // Start game function
  const startGame = useCallback(() => {
    const { grid: newGrid, specialGrid: newSpecialGrid } = createGrid();
    setGrid(newGrid);
    setSpecialGrid(newSpecialGrid);
    gridRef.current = newGrid;
    specialGridRef.current = newSpecialGrid;
    
    setTimeLeft(60);
    setScore(0);
    setCombo(0);
    setCascadeLevel(0);
    setTotalCascadeTimeBonus(0);
    setGameStarted(true);
    setGameOver(false);
    setGameOverState('playing');
    setActivePowerup(null);
    setFx([]);
    setActiveEffects([]);
  }, [createGrid]);

  // Simplified cascade processing
  const optimizedResolveCascades = useCallback(async (g, sg, onComplete) => {
    let currentGrid = cloneGrid(g);
    let currentSpecialGrid = cloneGrid(sg);
    let stepCount = 0;
    let totalCascadePoints = 0;

    while (true) {
      const matches = findMatches(currentGrid);
      if (matches.length === 0) break;

      stepCount++;
      const basePoints = matches.reduce((sum, match) => sum + match.length * 10, 0);
      const cascadeMultiplier = Math.min(1 + stepCount * 0.5, 3);
      const stepPoints = Math.floor(basePoints * cascadeMultiplier);
      totalCascadePoints += stepPoints;

      // Remove matched cells
      matches.forEach(match => {
        match.cells.forEach(([r, c]) => {
          currentGrid[r][c] = null;
          currentSpecialGrid[r][c] = null;
        });
      });

      // Play sound
      audio.play?.("cascade_tick", { volume: Math.min(0.6, 0.3 + stepCount * 0.1) });

      // Apply gravity and refill
      currentGrid = applyGravity(currentGrid);
      const refilled = refillGrid(currentGrid, currentSpecialGrid);
      currentGrid = refilled.grid;
      currentSpecialGrid = refilled.specialGrid;

      setGrid([...currentGrid]);
      setSpecialGrid([...currentSpecialGrid]);
      gridRef.current = currentGrid;
      specialGridRef.current = currentSpecialGrid;

      await new Promise(resolve => setTimeout(resolve, 150));
    }

    // Final score update
    setScore(prev => prev + totalCascadePoints);
    setCombo(stepCount);
    
    // Show combo celebration
    if (stepCount > 1) {
      setShowComboDisplay(true);
      setTimeout(() => setShowComboDisplay(false), 1500);
    }

    setTimeout(() => {
      setCascadeLevel(0);
      setIsProcessing(false);
      onComplete?.();
    }, 100);
  }, [findMatches, cloneGrid, applyGravity, refillGrid]);

  // Touch/mouse handlers
  function haptic(ms = 12) {
    try {
      navigator.vibrate?.(ms);
    } catch {}
  }

  function rc(e) {
    if (!cell || !boardRef.current) return { r: 0, c: 0 };
    const rect = boardRef.current.getBoundingClientRect();
    const x = (e.clientX || e.touches?.[0]?.clientX || 0) - rect.left;
    const y = (e.clientY || e.touches?.[0]?.clientY || 0) - rect.top;
    return {
      r: Math.floor(y / cell),
      c: Math.floor(x / cell)
    };
  }

  const handlePointerDown = useCallback((e) => {
    if (!gameStarted || gameOver || isProcessing) return;
    
    const p = rc(e);
    if (!inBounds(p.r, p.c)) return;

    e.preventDefault();
    document.setPointerCapture?.(e.currentTarget, e.pointerId);

    setDrag({
      r: p.r,
      c: p.c,
      startX: e.clientX || e.touches?.[0]?.clientX || 0,
      startY: e.clientY || e.touches?.[0]?.clientY || 0,
    });
    setSelectedTile([p.r, p.c]);
    haptic(8);
  }, [gameStarted, gameOver, isProcessing, cell, inBounds]);

  const handlePointerUp = useCallback((e) => {
    if (!drag || !gameStarted || gameOver || isProcessing) return;

    e.preventDefault();
    setSelectedTile(null);
    const newDrag = drag;
    setDrag(null);
    document.releasePointerCapture?.(e.currentTarget, e.pointerId);

    const p = rc(e);
    if (!inBounds(p.r, p.c)) return;

    const dx = (e.clientX || e.touches?.[0]?.clientX || 0) - newDrag.startX;
    const dy = (e.clientY || e.touches?.[0]?.clientY || 0) - newDrag.startY;
    const distance = Math.sqrt(dx * dx + dy * dy);
    const threshold = Math.min(30, Math.floor(cell * 0.35));

    if (distance < threshold) {
      audio.play?.("swap_invalid", { volume: 0.5 });
      haptic(8);
      return;
    }

    // Determine swap direction
    const horiz = Math.abs(dx) > Math.abs(dy);
    const tr = newDrag.r + (horiz ? 0 : dy > 0 ? 1 : -1);
    const tc = newDrag.c + (horiz ? (dx > 0 ? 1 : -1) : 0);

    if (!inBounds(tr, tc)) {
      audio.play?.("swap_invalid", { volume: 0.5 });
      haptic(8);
      return;
    }

    // Perform swap
    const g = cloneGrid(gridRef.current);
    const sg = cloneGrid(specialGridRef.current);
    
    [g[newDrag.r][newDrag.c], g[tr][tc]] = [g[tr][tc], g[newDrag.r][newDrag.c]];
    [sg[newDrag.r][newDrag.c], sg[tr][tc]] = [sg[tr][tc], sg[newDrag.r][newDrag.c]];

    const matches = findMatches(g);
    if (matches.length === 0) {
      audio.play?.("swap_invalid", { volume: 0.5 });
      haptic(8);
      return;
    }

    audio.play?.("swap", { volume: 0.6 });
    haptic(12);

    setSwapPair([[newDrag.r, newDrag.c], [tr, tc]]);
    setTimeout(() => {
      setGrid(g);
      setSpecialGrid(sg);
      gridRef.current = g;
      specialGridRef.current = sg;
      setSwapPair(null);
      optimizedResolveCascades(g, sg, () => {});
    }, 100);
  }, [drag, gameStarted, gameOver, isProcessing, cell, inBounds, cloneGrid, findMatches, optimizedResolveCascades]);

  // Timer formatting and color
  const getTimerColor = () => {
    if (timeLeft <= 5) return '#e74c3c';
    if (timeLeft <= 10) return '#f39c12';
    if (timeLeft <= 30) return '#f1c40f';
    return '#27ae60';
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Render active effects
  const renderActiveEffects = () => {
    return activeEffects.map(effect => {
      const baseStyle = {
        position: 'absolute',
        pointerEvents: 'none',
        zIndex: 1000
      };

      switch (effect.type) {
        case 'line-sweep':
          return (
            <div
              key={effect.id}
              className="line-sweep-effect"
              style={{
                ...baseStyle,
                [effect.direction === 'horizontal' ? 'left' : 'top']: 0,
                [effect.direction === 'horizontal' ? 'top' : 'left']: effect.direction === 'horizontal' ? effect.row * cell : effect.col * cell,
                [effect.direction === 'horizontal' ? 'width' : 'height']: COLS * cell,
                [effect.direction === 'horizontal' ? 'height' : 'width']: cell,
                background: effect.direction === 'horizontal' ? 
                  'linear-gradient(90deg, transparent, #00d4ff, transparent)' :
                  'linear-gradient(0deg, transparent, #ff6b35, transparent)',
                animation: 'line-sweep 0.5s ease forwards'
              }}
            />
          );

        case 'explosion':
          return (
            <div
              key={effect.id}
              className="explosion-effect"
              style={{
                ...baseStyle,
                left: effect.col * cell,
                top: effect.row * cell,
                width: cell * 3,
                height: cell * 3,
                marginLeft: -cell,
                marginTop: -cell,
                background: 'radial-gradient(circle, #f7b731, transparent)',
                borderRadius: '50%',
                animation: 'explosion-blast 0.6s ease forwards'
              }}
            />
          );

        case 'color-bomb':
          return (
            <div
              key={effect.id}
              className="color-bomb-effect"
              style={{
                ...baseStyle,
                left: effect.col * cell,
                top: effect.row * cell,
                width: cell * 8,
                height: cell * 8,
                marginLeft: -cell * 3.5,
                marginTop: -cell * 3.5,
                background: 'radial-gradient(circle, #e056fd, transparent)',
                borderRadius: '50%',
                animation: 'color-bomb-flash 0.8s ease forwards'
              }}
            />
          );

        default:
          return null;
      }
    });
  };

  // FIXED: Main render with optimized layout
  return (
    <div style={{
      height: 'var(--game-height)',
      display: 'flex',
      flexDirection: 'column',
      background: 'var(--bg)',
      overflow: 'hidden'
    }}>
      
      {/* FIXED: Top game controls - always visible, no scrolling */}
      {gameStarted && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: '50%',
          transform: 'translateX(-50%)',
          width: '100%',
          maxWidth: '520px',
          background: 'var(--card)',
          borderBottom: '1px solid var(--line)',
          zIndex: 999,
          padding: '12px 16px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          
          {/* Exit button */}
          <button 
            className="btn" 
            onClick={() => onExit?.(null)}
            style={{ 
              minWidth: '40px',
              padding: '8px 12px',
              fontSize: '14px'
            }}
          >
            ← Exit
          </button>

          {/* Timer */}
          <div style={{
            padding: '8px 16px',
            borderRadius: '12px',
            fontSize: '16px',
            fontWeight: '800',
            color: 'white',
            background: getTimerColor(),
            minWidth: '80px',
            textAlign: 'center'
          }}>
            ⏰ {formatTime(timeLeft)}
          </div>

          {/* Score */}
          <div style={{
            fontSize: '16px',
            fontWeight: '800',
            color: 'var(--accent)',
            textAlign: 'right',
            minWidth: '80px'
          }}>
            🏆 {score.toLocaleString()}
          </div>
        </div>
      )}

      {/* FIXED: Start screen - no scrolling needed */}
      {!gameStarted && (
        <div style={{
          position: 'fixed',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          textAlign: 'center',
          zIndex: 1000,
          background: 'var(--card)',
          padding: '32px',
          borderRadius: '20px',
          border: '1px solid var(--line)'
        }}>
          <h2 style={{ margin: '0 0 16px', color: 'var(--text)' }}>Ready to Play? 🐱</h2>
          <p style={{ margin: '0 0 24px', color: 'var(--muted)' }}>Match 3 or more treats to feed the cats!</p>
          <button 
            className="btn primary" 
            onClick={startGame}
            style={{ fontSize: '16px', padding: '16px 32px' }}
          >
            🎮 Start Game
          </button>
        </div>
      )}

      {/* FIXED: Game board - centered and properly sized */}
      {gameStarted && (
        <>
          <div style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '80px 16px 80px', // Top and bottom padding for fixed elements
          }}>

            {/* Special instructions */}
            {Object.values(specialGridRef.current || []).some(row => row?.some(cell => cell)) && (
              <div style={{
                margin: '0 16px 12px',
                padding: '8px 12px',
                background: 'var(--accent-light)',
                borderRadius: '8px',
                fontSize: '12px',
                color: 'var(--accent)',
                textAlign: 'center',
                fontWeight: '600'
              }}>
                ✨ Tap Special Cats! ⚡ Whisker-Streak clears lines • 💥 Box Cat explodes 3×3 • 🌟 Catnip Bomb clears all matching!
              </div>
            )}

            {/* Cascade bonus display */}
            {totalCascadeTimeBonus > 0 && (
              <div style={{
                fontSize: '14px',
                fontWeight: '700',
                color: 'var(--accent2)',
                background: 'var(--accent-light)',
                padding: '6px 12px',
                borderRadius: '12px',
                border: '1px solid var(--accent)',
                marginBottom: '12px'
              }}>
                ⏱️ +{totalCascadeTimeBonus.toFixed(2)}s bonus
              </div>
            )}

            {/* Hype Meter */}
            <HypeMeter currentScore={score} cascadeLevel={cascadeLevel} />

            {/* Game Board */}
            <div
              ref={boardRef}
              style={{
                position: 'relative',
                background: 'var(--surface)',
                borderRadius: '16px',
                border: '2px solid var(--border)',
                overflow: 'hidden',
                aspectRatio: '1 / 1',
                width: 'min(90vw, 400px)',
                maxWidth: '400px',
                marginTop: '16px'
              }}
              onPointerDown={handlePointerDown}
              onPointerUp={handlePointerUp}
              onPointerMove={(e) => e.preventDefault()}
            >
              {cell > 0 && (
                <>
                  {/* Grid Lines */}
                  <div className="gridlines">
                    {Array.from({ length: ROWS + 1 }, (_, i) => (
                      <div
                        key={`h-${i}`}
                        style={{
                          position: 'absolute',
                          left: 0,
                          top: i * cell,
                          width: '100%',
                          height: '1px',
                          background: 'var(--line)',
                        }}
                      />
                    ))}
                    {Array.from({ length: COLS + 1 }, (_, i) => (
                      <div
                        key={`v-${i}`}
                        style={{
                          position: 'absolute',
                          left: i * cell,
                          top: 0,
                          width: '1px',
                          height: '100%',
                          background: 'var(--line)',
                        }}
                      />
                    ))}
                  </div>

                  {/* Tiles */}
                  {grid.map((row, r) =>
                    row.map((value, c) => {
                      const isSelected = selectedTile && selectedTile[0] === r && selectedTile[1] === c;
                      const isHinted = hintTiles.some(([hr, hc]) => hr === r && hc === c);
                      const isBlasting = blastCells.some(([br, bc]) => br === r && bc === c);
                      const isSwapping = swapPair && swapPair.some(([sr, sc]) => sr === r && sc === c);
                      const isAnimating = animatingTiles.has(`${r}-${c}`);
                      const specialType = specialGrid[r] && specialGrid[r][c];

                      let swapTransform = null;
                      if (isSwapping && swapPair) {
                        const [[r1, c1], [r2, c2]] = swapPair;
                        if (r === r1 && c === c1) {
                          swapTransform = `translate(${(c2 - c1) * cell}px, ${(r2 - r1) * cell}px)`;
                        } else if (r === r2 && c === c2) {
                          swapTransform = `translate(${(c1 - c2) * cell}px, ${(r1 - r2) * cell}px)`;
                        }
                      }

                      return value ? (
                        <MemoizedTile
                          key={`${r}-${c}`}
                          r={r}
                          c={c}
                          value={value}
                          cell={cell}
                          isSelected={isSelected}
                          isHinted={isHinted}
                          isBlasting={isBlasting}
                          isSwapping={isSwapping}
                          isAnimating={isAnimating}
                          specialType={specialType}
                          swapTransform={swapTransform}
                          EMOJI_SIZE={EMOJI_SIZE}
                        />
                      ) : null;
                    })
                  )}

                  {/* Active effects */}
                  {renderActiveEffects()}

                  {/* Combo celebration */}
                  {showComboDisplay && (
                    <div className="combo-celebration">
                      🔥 {combo}x Combo! 🔥
                    </div>
                  )}

                  {/* Blast effects */}
                  {fx.map((effect) => (
                    <div
                      key={effect.id}
                      className="blast"
                      style={{
                        left: effect.col * cell + cell/2,
                        top: effect.row * cell + cell/2,
                      }}
                    >
                      🐱 💥
                    </div>
                  ))}
                </>
              )}
            </div>
          </div>

          {/* FIXED: Bottom controls - always visible */}
          <div style={{
            position: 'fixed',
            bottom: 0,
            left: '50%',
            transform: 'translateX(-50%)',
            width: '100%',
            maxWidth: '520px',
            background: 'var(--card)',
            borderTop: '1px solid var(--line)',
            zIndex: 999,
            padding: '12px 16px',
            display: 'flex',
            justifyContent: 'center',
            gap: '12px'
          }}>
            <div style={{
              fontSize: '14px',
              color: 'var(--muted)',
              display: 'flex',
              alignItems: 'center',
              gap: '16px'
            }}>
              <span>💪 Combo: {combo}x</span>
              <span>⚡ Level: {cascadeLevel}</span>
            </div>
          </div>
        </>
      )}

      {/* Game Over Overlay */}
      {gameOver && (
        <div className="game-over">
          <div className="game-over-content">
            <div className="game-over-title">Time's Up! 🐱</div>
            <div className="final-score">{score.toLocaleString()}</div>
            <p style={{ margin: '0 0 24px', color: 'var(--muted)' }}>
              Great job feeding the cats!
            </p>
            <button 
              className="btn primary" 
              onClick={() => onExit?.({ 
                score, 
                max_combo: combo, 
                coins: Math.floor(score / 100),
                moves_used: 0,
                time_bonus: totalCascadeTimeBonus
              })}
            >
              Continue →
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
