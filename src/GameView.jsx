// src/GameView.jsx
import React, { useEffect, useRef, useState, useCallback, useMemo } from "react";
import * as audio from "./audio";
import ShareButtons from "./ShareButtons.jsx";
import { game } from "./utils.js";
import { useStore } from "./store.js";

// 🎯 Meowchi 6×6 Rush Configuration
const ROWS = 6;
const COLS = 6;
const GAME_DURATION = 60;
const EMOJI_SIZE = 0.75;

// 🐱 Six Meowchi Cats (Fixed URLs)
const CAT_SET = [
  "https://ik.imagekit.io/59r2kpz8r/Meowchi/Boba.webp?updatedAt=1756284887507",
  "https://ik.imagekit.io/59r2kpz8r/Meowchi/Cheese.webp?updatedAt=1756284887499", 
  "https://ik.imagekit.io/59r2kpz8r/Meowchi/Meowchi.webp?updatedAt=1756284887490",
  "https://ik.imagekit.io/59r2kpz8r/Meowchi/Oreo.webp?updatedAt=1756284887488",
  "https://ik.imagekit.io/59r2kpz8r/Meowchi/Panthera.webp?updatedAt=1756284887493", 
  "https://ik.imagekit.io/59r2kpz8r/Meowchi/Patches.webp?updatedAt=1756284887491",
];

// Special cat types
const SPECIAL_TYPES = {
  WHISKER_STREAK_H: 'whisker_streak_h',
  WHISKER_STREAK_V: 'whisker_streak_v',
  BOX_CAT: 'box_cat',
  CATNIP_BOMB: 'catnip_bomb',
};

// Scoring system
const RUSH_SCORING = {
  3: 60, 4: 120, 5: 200,
  CASCADE_TIME_BONUS: 0.25,
  MAX_TIME_BONUS: 5,
  CASCADE_MULTIPLIER: 0.3,
  WHISKER_STREAK_BASE: 160, WHISKER_STREAK_PER_TILE: 15,
  BOX_CAT_BASE: 180, BOX_CAT_PER_TILE: 20,
  CATNIP_BOMB_BASE: 420, CATNIP_BOMB_PER_TILE: 12,
};

// Fixed MemoizedTile component
const MemoizedTile = React.memo(({
  r, c, value, cell, isSelected, isHinted, isBlasting, isSwapping,
  isNewTile, isGrab, isShake, swapTransform, delaySeconds, EMOJI_SIZE, 
  specialType, onTileClick, onSpecialClick
}) => {
  const isSpecial = !!specialType;
  const isImage = value && typeof value === 'string' && value.startsWith('https://ik.imagekit.io');
  
  const getSpecialOverlay = () => {
    switch(specialType) {
      case SPECIAL_TYPES.WHISKER_STREAK_H: case SPECIAL_TYPES.WHISKER_STREAK_V: return '⚡';
      case SPECIAL_TYPES.BOX_CAT: return '💥';
      case SPECIAL_TYPES.CATNIP_BOMB: return '🌟';
      default: return null;
    }
  };

  const getSpecialBorder = () => {
    switch(specialType) {
      case SPECIAL_TYPES.WHISKER_STREAK_H: return '3px solid #00d4ff';
      case SPECIAL_TYPES.WHISKER_STREAK_V: return '3px solid #ff6b35';
      case SPECIAL_TYPES.BOX_CAT: return '3px solid #f7b731';
      case SPECIAL_TYPES.CATNIP_BOMB: return '3px solid #e056fd';
      default: return '1px solid var(--border)';
    }
  };

  const handleClick = () => {
    if (isSpecial && onSpecialClick) {
      onSpecialClick(r, c, specialType, value);
    } else if (onTileClick) {
      onTileClick(r, c);
    }
  };
  
  return (
    <div
      className={`tile ${isSelected ? "sel" : ""} ${isHinted ? "hint-pulse" : ""} ${isGrab ? "grab" : ""} ${isShake ? "shake" : ""} ${isSpecial ? "special-tile" : ""}`}
      style={{
        left: c * cell, top: r * cell, width: cell, height: cell,
        transform: swapTransform || undefined,
        zIndex: isBlasting ? 10 : isGrab ? 5 : (isSpecial ? 3 : 1),
        transition: isSwapping ? "transform 0.16s ease" : delaySeconds ? `top 0.16s ease ${delaySeconds}s` : "top 0.16s ease",
        border: getSpecialBorder(),
        boxShadow: isSpecial ? `0 0 12px ${getSpecialBorder().split(' ')[2]}40` : 'none',
        cursor: 'pointer'
      }}
      onClick={handleClick}
    >
      <div
        className={`emoji ${isGrab ? "grab" : ""} ${isShake ? "shake" : ""}`}
        style={{ 
          fontSize: isImage ? 'inherit' : Math.floor(cell * EMOJI_SIZE),
          width: isImage ? '85%' : 'auto', height: isImage ? '85%' : 'auto',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          position: 'relative'
        }}
      >
        {isImage ? (
          <img 
            src={value} alt="cat"
            style={{ 
              width: '100%', height: '100%', objectFit: 'contain',
              borderRadius: '8px',
              filter: isSpecial ? 'brightness(1.1) contrast(1.1)' : 'none'
            }}
            onError={(e) => {
              console.error('Image load error:', value);
              e.target.style.display = 'none';
              e.target.parentNode.innerHTML = '😺'; // Fallback emoji
            }}
          />
        ) : (
          <span className="tile-emoji" style={{ filter: isSpecial ? 'brightness(1.2) drop-shadow(0 0 4px gold)' : 'none' }}>
            {value || '😺'}
          </span>
        )}
        
        {isSpecial && getSpecialOverlay() && (
          <div className="special-overlay">
            {getSpecialOverlay()}
          </div>
        )}
      </div>
    </div>
  );
});

// Hype Meter Component
const HypeMeter = ({ currentScore, cascadeLevel }) => {
  const tier1 = 1500, tier2 = 4500, tier3 = 9000;
  let currentTier = 0, progress = 0;
  
  if (currentScore >= tier3) { currentTier = 3; progress = 100; }
  else if (currentScore >= tier2) { currentTier = 2; progress = ((currentScore - tier2) / (tier3 - tier2)) * 100; }
  else if (currentScore >= tier1) { currentTier = 1; progress = ((currentScore - tier1) / (tier2 - tier1)) * 100; }
  else { progress = (currentScore / tier1) * 100; }
  
  const getTierColor = () => {
    switch(currentTier) {
      case 3: return '#ff6b35'; case 2: return '#f7b731'; case 1: return '#26de81'; default: return '#74b9ff';
    }
  };
  
  const getTierLabel = () => {
    switch(currentTier) {
      case 3: return 'FIRE! 🔥'; case 2: return 'HOT! 🌟'; case 1: return 'WARM 🔆'; default: return 'HYPE ⚡';
    }
  };
  
  return (
    <div className="hype-meter">
      <div className="hype-label">{getTierLabel()}</div>
      <div className="hype-bar">
        <div className="hype-progress" style={{ 
          width: `${Math.min(progress, 100)}%`,
          background: `linear-gradient(90deg, ${getTierColor()}, ${getTierColor()}80)`
        }} />
      </div>
      <div className="hype-score">{currentScore.toLocaleString()}</div>
      {cascadeLevel > 1 && (
        <div style={{ fontSize: '10px', color: getTierColor(), fontWeight: '700' }}>
          CASCADE ×{cascadeLevel}
        </div>
      )}
    </div>
  );
};

// Timer Component
const RushTimer = ({ timeLeft, isPaused, onTogglePause }) => {
  const getTimerColor = () => {
    if (timeLeft <= 10) return '#e74c3c';
    if (timeLeft <= 20) return '#f39c12';
    return '#27ae60';
  };

  return (
    <div className="rush-timer" style={{ 
      textAlign: 'center', padding: '12px 16px',
      background: `linear-gradient(135deg, ${getTimerColor()}, ${getTimerColor()}cc)`,
      color: 'white', borderRadius: '12px', margin: '8px 16px',
      fontWeight: '800', fontSize: '18px'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px' }}>
        <span>{timeLeft}s</span>
        <button onClick={onTogglePause} style={{
          background: 'rgba(255,255,255,0.2)', border: '1px solid rgba(255,255,255,0.3)',
          borderRadius: '6px', color: 'white', padding: '4px 8px', fontSize: '12px', cursor: 'pointer'
        }}>
          {isPaused ? "▶️ Resume" : "⏸ Pause"}
        </button>
      </div>
      <div className="progress rush-progress" style={{
        width: `${(timeLeft / GAME_DURATION) * 100}%`, height: 8,
        background: `linear-gradient(90deg, ${getTimerColor()}, ${getTimerColor()}80)`,
        borderRadius: 6, marginTop: 10, boxShadow: `0 0 8px ${getTimerColor()}40`
      }} />
    </div>
  );
};

// Main GameView Component
export default function GameView({ onGameOver }) {
  // Game state
  const [grid, setGrid] = useState(() => initSolvableGrid());
  const [specialGrid, setSpecialGrid] = useState(() => Array.from({ length: ROWS }, () => Array(COLS).fill(null)));
  const [score, setScore] = useState(0);
  const [moves, setMoves] = useState(0);
  const [combo, setCombo] = useState(0);
  const [timeLeft, setTimeLeft] = useState(GAME_DURATION);
  const [gameActive, setGameActive] = useState(true);
  const [isPaused, setIsPaused] = useState(false);
  
  // Visual state
  const [selectedTile, setSelectedTile] = useState(null);
  const [hintTile, setHintTile] = useState(null);
  const [specialEffects, setSpecialEffects] = useState([]);
  const [comboCelebration, setComboCelebration] = useState(null);
  const [cascadeCelebration, setCascadeCelebration] = useState(null);
  
  // Refs
  const gridRef = useRef(grid);
  const specialGridRef = useRef(specialGrid);
  const cascadeLevelRef = useRef(0);
  const totalTimeBonus = useRef(0);

  useEffect(() => { gridRef.current = grid; }, [grid]);
  useEffect(() => { specialGridRef.current = specialGrid; }, [specialGrid]);

  // Helper functions
  function randCat() { return CAT_SET[Math.floor(Math.random() * CAT_SET.length)]; }
  function pickDifferent(curr) { const choices = CAT_SET.filter(x => x !== curr); return choices[Math.floor(Math.random() * choices.length)]; }
  function cloneGrid(g) { return g.map(row => row.slice()); }
  function inBounds(r, c) { return r >= 0 && c >= 0 && r < ROWS && c < COLS; }

  function initSolvableGrid() {
    const g = Array.from({ length: ROWS }, () => Array.from({ length: COLS }, () => randCat()));
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        if (c >= 2 && g[r][c] === g[r][c - 1] && g[r][c] === g[r][c - 2]) g[r][c] = pickDifferent(g[r][c]);
        if (r >= 2 && g[r][c] === g[r - 1][c] && g[r][c] === g[r - 2][c]) g[r][c] = pickDifferent(g[r][c]);
      }
    }
    if (!hasAnyMove(g)) return shuffleToSolvable(g);
    return g;
  }

  function findMatches(g) {
    const matches = [];
    // Horizontal matches
    for (let r = 0; r < ROWS; r++) {
      let streak = 1;
      for (let c = 1; c < COLS; c++) {
        if (g[r][c] && g[r][c] === g[r][c - 1]) streak++;
        else {
          if (streak >= 3) for (let k = 0; k < streak; k++) matches.push([r, c - 1 - k]);
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
          if (streak >= 3) for (let k = 0; k < streak; k++) matches.push([r - 1 - k, c]);
          streak = 1;
        }
      }
      if (streak >= 3) for (let k = 0; k < streak; k++) matches.push([ROWS - 1 - k, c]);
    }
    return matches;
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

  // Special detection functions
  const detect4Match = (grid, matches) => {
    const specials = [];
    // Horizontal 4+ matches
    for (let r = 0; r < ROWS; r++) {
      let streak = 1, currentCat = null;
      for (let c = 1; c < COLS; c++) {
        if (grid[r][c] && grid[r][c] === grid[r][c - 1]) {
          currentCat = grid[r][c]; streak++;
        } else {
          if (streak >= 4 && currentCat) {
            const middleC = Math.floor((c - streak + c - 1) / 2);
            specials.push({ r, c: middleC, type: SPECIAL_TYPES.WHISKER_STREAK_H, originalCat: currentCat });
          }
          streak = 1; currentCat = grid[r][c];
        }
      }
      if (streak >= 4 && currentCat) {
        const middleC = Math.floor((COLS - streak + COLS - 1) / 2);
        specials.push({ r, c: middleC, type: SPECIAL_TYPES.WHISKER_STREAK_H, originalCat: currentCat });
      }
    }
    // Vertical 4+ matches  
    for (let c = 0; c < COLS; c++) {
      let streak = 1, currentCat = null;
      for (let r = 1; r < ROWS; r++) {
        if (grid[r][c] && grid[r][c] === grid[r - 1][c]) {
          currentCat = grid[r][c]; streak++;
        } else {
          if (streak >= 4 && currentCat) {
            const middleR = Math.floor((r - streak + r - 1) / 2);
            specials.push({ r: middleR, c, type: SPECIAL_TYPES.WHISKER_STREAK_V, originalCat: currentCat });
          }
          streak = 1; currentCat = grid[r][c];
        }
      }
      if (streak >= 4 && currentCat) {
        const middleR = Math.floor((ROWS - streak + ROWS - 1) / 2);
        specials.push({ r: middleR, c, type: SPECIAL_TYPES.WHISKER_STREAK_V, originalCat: currentCat });
      }
    }
    return specials;
  };

  const detect5InLine = (grid, matches) => {
    const specials = [];
    // Similar logic for 5-in-line detection...
    return specials;
  };

  const detectLTShape = (grid, matches) => {
    const specials = [];
    if (matches.length >= 5) {
      const centerR = Math.round(matches.reduce((sum, [r]) => sum + r, 0) / matches.length);
      const centerC = Math.round(matches.reduce((sum, [, c]) => sum + c, 0) / matches.length);
      const hasHorizontal = matches.some(([r, c]) => r === centerR && Math.abs(c - centerC) >= 1);
      const hasVertical = matches.some(([r, c]) => c === centerC && Math.abs(r - centerR) >= 1);
      if (hasHorizontal && hasVertical && matches.length >= 5) {
        const originalCat = grid[centerR] && grid[centerR][centerC] ? grid[centerR][centerC] : CAT_SET[0];
        specials.push({ r: centerR, c: centerC, type: SPECIAL_TYPES.BOX_CAT, originalCat });
      }
    }
    return specials;
  };

  // Special activation functions
  const activateWhiskerStreak = (r, c, direction, targetCat) => {
    const g = cloneGrid(gridRef.current), sg = cloneGrid(specialGridRef.current);
    let tilesCleared = 0;
    
    if (direction === 'horizontal') {
      for (let col = 0; col < COLS; col++) {
        if (g[r][col] !== null) { g[r][col] = null; sg[r][col] = null; tilesCleared++; }
      }
      setSpecialEffects(prev => [...prev, { type: 'line-clear', direction: 'horizontal', row: r, id: Date.now() }]);
    } else {
      for (let row = 0; row < ROWS; row++) {
        if (g[row][c] !== null) { g[row][c] = null; sg[row][c] = null; tilesCleared++; }
      }
      setSpecialEffects(prev => [...prev, { type: 'line-clear', direction: 'vertical', col: c, id: Date.now() }]);
    }
    
    const points = RUSH_SCORING.WHISKER_STREAK_BASE + (tilesCleared * RUSH_SCORING.WHISKER_STREAK_PER_TILE);
    setScore(s => s + points);
    audio.play?.('powerup_spawn', { volume: 0.8 });
    console.log(`⚡ Whisker-Streak activated: ${tilesCleared} tiles, ${points} points`);
    return { grid: g, specialGrid: sg };
  };

  const activateBoxCat = (r, c, targetCat) => {
    const g = cloneGrid(gridRef.current), sg = cloneGrid(specialGridRef.current);
    let tilesCleared = 0;
    
    for (let row = r - 1; row <= r + 1; row++) {
      for (let col = c - 1; col <= c + 1; col++) {
        if (inBounds(row, col) && g[row][col] !== null) {
          g[row][col] = null; sg[row][col] = null; tilesCleared++;
        }
      }
    }
    
    setSpecialEffects(prev => [...prev, { type: 'area-blast', r, c, id: Date.now() }]);
    const points = RUSH_SCORING.BOX_CAT_BASE + (tilesCleared * RUSH_SCORING.BOX_CAT_PER_TILE);
    setScore(s => s + points);
    audio.play?.('combo_x2', { volume: 0.9 });
    console.log(`💥 Box Cat activated: ${tilesCleared} tiles, ${points} points`);
    return { grid: g, specialGrid: sg };
  };

  const activateCatnipBomb = (r, c, targetCat) => {
    const g = cloneGrid(gridRef.current), sg = cloneGrid(specialGridRef.current);
    let tilesCleared = 0;
    
    for (let row = 0; row < ROWS; row++) {
      for (let col = 0; col < COLS; col++) {
        if (g[row][col] === targetCat) {
          g[row][col] = null; sg[row][col] = null; tilesCleared++;
        }
      }
    }
    
    setSpecialEffects(prev => [...prev, { type: 'color-bomb', r, c, targetCat, id: Date.now() }]);
    const points = RUSH_SCORING.CATNIP_BOMB_BASE + (tilesCleared * RUSH_SCORING.CATNIP_BOMB_PER_TILE);
    setScore(s => s + points);
    audio.play?.('combo_x4', { volume: 1.0 });
    console.log(`🌟 Catnip Bomb activated: ${tilesCleared} tiles, ${points} points`);
    return { grid: g, specialGrid: sg };
  };

  // Special click handler
  const handleSpecialClick = useCallback((r, c, specialType, originalCat) => {
    if (!gameActive || isPaused) return;
    
    console.log(`🎯 Special activated at (${r},${c}): ${specialType}`);
    let result;
    
    switch(specialType) {
      case SPECIAL_TYPES.WHISKER_STREAK_H: result = activateWhiskerStreak(r, c, 'horizontal', originalCat); break;
      case SPECIAL_TYPES.WHISKER_STREAK_V: result = activateWhiskerStreak(r, c, 'vertical', originalCat); break;
      case SPECIAL_TYPES.BOX_CAT: result = activateBoxCat(r, c, originalCat); break;
      case SPECIAL_TYPES.CATNIP_BOMB: result = activateCatnipBomb(r, c, originalCat); break;
      default: return;
    }
    
    if (result) {
      setGrid(result.grid); setSpecialGrid(result.specialGrid); setSelectedTile(null);
      setTimeout(() => cascadeAndFillGrid(result.grid, result.specialGrid), 500);
    }
  }, [gameActive, isPaused]);

  // Regular tile click handler
  const handleTileClick = useCallback((r, c) => {
    if (!gameActive || isPaused) return;
    
    if (specialGridRef.current[r][c]) {
      handleSpecialClick(r, c, specialGridRef.current[r][c], gridRef.current[r][c]);
      return;
    }
    
    if (selectedTile) {
      const [r1, c1] = selectedTile;
      if (r1 === r && c1 === c) { setSelectedTile(null); return; }
      
      const isAdjacent = (Math.abs(r1 - r) + Math.abs(c1 - c)) === 1;
      if (!isAdjacent) { setSelectedTile([r, c]); return; }
      
      const g = cloneGrid(gridRef.current), sg = cloneGrid(specialGridRef.current);
      [g[r1][c1], g[r][c]] = [g[r][c], g[r1][c1]];
      [sg[r1][c1], sg[r][c]] = [sg[r][c], sg[r1][c1]];
      
      const matches = findMatches(g);
      if (matches.length > 0) {
        setGrid(g); setSpecialGrid(sg); setSelectedTile(null); setMoves(m => m + 1);
        setTimeout(() => processMatches(g, sg, matches), 200);
      } else {
        setSelectedTile(null);
        audio.play?.('swap_invalid');
      }
    } else {
      setSelectedTile([r, c]);
    }
  }, [selectedTile, gameActive, isPaused, handleSpecialClick]);

  // Cascade and process functions
  function cascadeAndFillGrid(currentGrid, currentSpecialGrid, cascadeLevel = 1) {
    cascadeLevelRef.current = cascadeLevel;
    
    const g = cloneGrid(currentGrid), sg = cloneGrid(currentSpecialGrid);
    
    for (let c = 0; c < COLS; c++) {
      const columnCats = [], columnSpecials = [];
      for (let r = ROWS - 1; r >= 0; r--) {
        if (g[r][c] !== null) {
          columnCats.push(g[r][c]); columnSpecials.push(sg[r][c]);
        }
      }
      for (let r = 0; r < ROWS; r++) { g[r][c] = null; sg[r][c] = null; }
      for (let i = 0; i < columnCats.length; i++) {
        g[ROWS - 1 - i][c] = columnCats[i]; sg[ROWS - 1 - i][c] = columnSpecials[i];
      }
      for (let r = ROWS - columnCats.length - 1; r >= 0; r--) { g[r][c] = randCat(); }
    }
    
    setGrid(g); setSpecialGrid(sg);
    setTimeout(() => {
      const matches = findMatches(g);
      if (matches.length > 0) processMatches(g, sg, matches, cascadeLevel);
      else cascadeLevelRef.current = 0;
    }, 300);
  }

  function processMatches(currentGrid, currentSpecialGrid, matches, cascadeLevel = 1) {
    const specials4 = detect4Match(currentGrid, matches);
    const specials5 = detect5InLine(currentGrid, matches);  
    const specialsLT = detectLTShape(currentGrid, matches);
    const allSpecials = [...specials4, ...specials5, ...specialsLT];
    
    const g = cloneGrid(currentGrid), sg = cloneGrid(currentSpecialGrid);
    
    allSpecials.forEach(special => {
      if (inBounds(special.r, special.c)) {
        g[special.r][special.c] = special.originalCat;
        sg[special.r][special.c] = special.type;
        console.log(`🌟 Created special: ${special.type} at (${special.r},${special.c})`);
      }
    });
    
    matches.forEach(([r, c]) => {
      if (!sg[r][c]) { g[r][c] = null; sg[r][c] = null; }
    });
    
    const basePoints = matches.length <= 3 ? RUSH_SCORING[3] : matches.length === 4 ? RUSH_SCORING[4] : RUSH_SCORING[5];
    const cascadeMultiplier = 1 + (cascadeLevel - 1) * RUSH_SCORING.CASCADE_MULTIPLIER;
    const finalPoints = Math.floor(basePoints * cascadeMultiplier);
    
    setScore(s => s + finalPoints); setCombo(cascadeLevel);
    
    if (cascadeLevel > 1) {
      const timeBonus = Math.min(RUSH_SCORING.CASCADE_TIME_BONUS, RUSH_SCORING.MAX_TIME_BONUS - totalTimeBonus.current);
      if (timeBonus > 0) {
        setTimeLeft(t => Math.min(GAME_DURATION, t + timeBonus));
        totalTimeBonus.current += timeBonus;
      }
    }
    
    if (cascadeLevel >= 3) {
      setComboCelebration(`${cascadeLevel}x CASCADE! 🔥`);
      setTimeout(() => setComboCelebration(null), 2000);
    }

    if (cascadeLevel >= 2) {
      setCascadeCelebration(`+${Math.floor(cascadeMultiplier * 10) / 10}x CASCADE`);
      setTimeout(() => setCascadeCelebration(null), 1500);
    }

    audio.play?.(cascadeLevel >= 4 ? 'combo_x4' : cascadeLevel >= 3 ? 'combo_x3' : cascadeLevel >= 2 ? 'combo_x2' : 'match_pop');
    
    setTimeout(() => cascadeAndFillGrid(g, sg, cascadeLevel + 1), 400);
  }

  // Game timer
  useEffect(() => {
    if (!gameActive || isPaused) return;
    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) { setGameActive(false); return 0; }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [gameActive, isPaused]);

  // Auto-hint system
  useEffect(() => {
    if (!gameActive || selectedTile) return;
    const hintTimer = setTimeout(() => {
      const firstMove = findFirstMove(gridRef.current);
      if (firstMove) {
        setHintTile(firstMove[0]);
        setTimeout(() => setHintTile(null), 2000);
      }
    }, 8000);
    return () => clearTimeout(hintTimer);
  }, [gameActive, selectedTile, grid]);

  // Game over logic
  useEffect(() => {
    if (timeLeft <= 0 && gameActive) {
      onGameOver?.({ score, moves, combo: cascadeLevelRef.current });
    }
  }, [timeLeft, gameActive, onGameOver, score, moves]);

  // Clear effects
  useEffect(() => {
    if (specialEffects.length > 0) {
      const timer = setTimeout(() => setSpecialEffects([]), 1000);
      return () => clearTimeout(timer);
    }
  }, [specialEffects]);

  // Board dimensions
  const containerWidth = Math.min(380, window.innerWidth - 40);
  const cellSize = Math.floor(containerWidth / COLS);
  const boardWidth = cellSize * COLS;
  const boardHeight = cellSize * ROWS;

  return (
    <div className="section board-wrap">
      {/* Special Instructions */}
      {specialGrid.some(row => row.some(cell => cell)) && (
        <div className="special-instructions">
          <div className="instruction-text">
            ✨ Tap special cats to activate their powers! ✨
          </div>
        </div>
      )}
      
      {/* Rush Timer */}
      <RushTimer timeLeft={timeLeft} isPaused={isPaused} onTogglePause={() => setIsPaused(!isPaused)} />
      
      {/* Hype Meter */}
      <HypeMeter currentScore={score} cascadeLevel={cascadeLevelRef.current} />
      
      {/* Game Stats */}
      <div className="stats">
        <div className="stat">
          <div className="stat-value">{score.toLocaleString()}</div>
          <div className="stat-label">Score</div>
        </div>
        <div className="stat">
          <div className="stat-value">{moves}</div>
          <div className="stat-label">Moves</div>
        </div>
        <div className="stat">
          <div className="stat-value">{combo}</div>
          <div className="stat-label">Combo</div>
        </div>
        
        {comboCelebration && <div className="combo-celebration">{comboCelebration}</div>}
        {cascadeCelebration && <div className="cascade-celebration">{cascadeCelebration}</div>}
      </div>

      {/* Game Board */}
      <div className={`board ${cascadeLevelRef.current > 1 ? 'rush-board' : ''}`} style={{ width: boardWidth, height: boardHeight }}>
        {/* Grid lines */}
        <div className="gridlines">
          <svg width={boardWidth} height={boardHeight}>
            {Array.from({ length: ROWS + 1 }, (_, i) => (
              <line key={`h-${i}`} x1={0} y1={i * cellSize} x2={boardWidth} y2={i * cellSize} stroke="currentColor" strokeWidth={1} />
            ))}
            {Array.from({ length: COLS + 1 }, (_, i) => (
              <line key={`v-${i}`} x1={i * cellSize} y1={0} x2={i * cellSize} y2={boardHeight} stroke="currentColor" strokeWidth={1} />
            ))}
          </svg>
        </div>

        {/* Tiles */}
        {grid.map((row, r) =>
          row.map((cat, c) => {
            if (!cat) return null;
            return (
              <MemoizedTile
                key={`${r}-${c}-${cat}`} r={r} c={c} value={cat} cell={cellSize}
                isSelected={selectedTile?.[0] === r && selectedTile?.[1] === c}
                isHinted={hintTile?.[0] === r && hintTile?.[1] === c}
                EMOJI_SIZE={EMOJI_SIZE} specialType={specialGrid[r][c]}
                onTileClick={handleTileClick} onSpecialClick={handleSpecialClick}
              />
            );
          })
        )}

        {/* Special Effects Overlay */}
        {specialEffects.map(effect => {
          if (effect.type === 'line-clear') {
            return (
              <div key={effect.id} className="special-activation-effect line-clear-effect" style={{
                [effect.direction === 'horizontal' ? 'top' : 'left']: 
                  effect.direction === 'horizontal' ? effect.row * cellSize : effect.col * cellSize,
                [effect.direction === 'horizontal' ? 'left' : 'top']: 0,
                [effect.direction === 'horizontal' ? 'width' : 'height']: 
                  effect.direction === 'horizontal' ? boardWidth : boardHeight,
                [effect.direction === 'horizontal' ? 'height' : 'width']: cellSize,
              }} />
            );
          } else if (effect.type === 'area-blast') {
            return (
              <div key={effect.id} className="special-activation-effect area-blast-effect" style={{
                left: (effect.c - 1) * cellSize, top: (effect.r - 1) * cellSize,
                width: cellSize * 3, height: cellSize * 3,
              }} />
            );
          } else if (effect.type === 'color-bomb') {
            return (
              <div key={effect.id} className="special-activation-effect color-bomb-effect" style={{
                left: effect.c * cellSize - cellSize, top: effect.r * cellSize - cellSize,
                width: cellSize * 3, height: cellSize * 3,
              }} />
            );
          }
          return null;
        })}
      </div>

      <ShareButtons score={score} />
    </div>
  );
}
