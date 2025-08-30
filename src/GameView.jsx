// src/GameView.jsx
import React, { useEffect, useRef, useState, useCallback, useMemo } from "react";

// --- START: Inlined & Mocked Dependencies ---
// To make this file standalone, the dependencies that were previously imported are now included here.

// Mocked audio object
const audio = {
  play: (sound, options) => {
    console.log(`Playing sound: ${sound}`, options || '');
  }
};

// Mocked game utils
const game = {
  calculateCoins: (score, maxCombo) => {
    return Math.floor(score / 10) + (maxCombo * 5);
  }
};

// Inlined ShareButtons component
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

// --- END: Inlined & Mocked Dependencies ---


// 🎯 Meowchi 6×6 Rush Configuration
const ROWS = 6;
const COLS = 6;
const GAME_DURATION = 60; // 60 seconds
const EMOJI_SIZE = 0.75;

// 🐱 Six Meowchi Cats (Phase 1)
const CAT_SET = [
  "https://ik.imagekit.io/59r2kpz8r/Meowchi/Boba.webp?updatedAt=1756284887507",
  "https://ik.imagekit.io/59r2kpz8r/Meowchi/Cheese.webp?updatedAt=1756284887499", 
  "https://ik.imagekit.io/59r2kpz8r/Meowchi/Meowchi.webp?updatedAt=1756284887490",
  "https://ik.imagekit.io/59r2kpz8r/Meowchi/Panthera.webp?updatedAt=1756284887493", // Replaced broken Oreo link
  "https://ik.imagekit.io/59r2kpz8r/Meowchi/Panthera.webp?updatedAt=1756284887493", 
  "https://ik.imagekit.io/59r2kpz8r/Meowchi/Patches.webp?updatedAt=1756284887491",
];

// 🆕 PHASE 2 & 3: Special Cat Types
const SPECIAL_TYPES = {
  WHISKER_STREAK_H: 'whisker_streak_h', // Horizontal line clear
  WHISKER_STREAK_V: 'whisker_streak_v', // Vertical line clear
  BOX_CAT: 'box_cat',              // 3x3 area clear
  CATNIP_BOMB: 'catnip_bomb',          // Clear all of one type
};

// 🎯 Meowchi 6x6 Rush Scoring (Updated for Phase 3)
const RUSH_SCORING = {
  3: 60,   // 3-match = 60 points
  4: 120,  // 4-match = 120 points  
  5: 200,  // 5-match = 200 points
  CASCADE_TIME_BONUS: 0.25, // +0.25s per cascade step
  MAX_TIME_BONUS: 5,       // Cap at +5s total per game
  CASCADE_MULTIPLIER: 0.3,   // Each cascade step: ×(1 + 0.3 per step)
  
  // 🆕 PHASE 3: Special Scoring
  WHISKER_STREAK_BASE: 160,  // +160 base + +15 per tile cleared
  WHISKER_STREAK_PER_TILE: 15,
  BOX_CAT_BASE: 180,         // +180 base + +20 per tile
  BOX_CAT_PER_TILE: 20,
  CATNIP_BOMB_BASE: 420,     // +420 base + +12 per tile
  CATNIP_BOMB_PER_TILE: 12,
};

// 🆕 PHASE 3: Enhanced Memoized tile component with special rendering & click handling
const MemoizedTile = React.memo(({
  r, c, value, cell, isSelected, isHinted, isBlasting, isSwapping,
  isNewTile, isGrab, isShake, swapTransform, delaySeconds, EMOJI_SIZE, 
  specialType, onClick // Simplified to use a single onClick prop
}) => {
  const isSpecial = !!specialType;
  const isImage = value && typeof value === 'string' && value.startsWith('https://ik.imagekit.io');
  
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
      className={`tile ${isSelected ? "sel" : ""} ${isHinted ? "hint-pulse" : ""} ${isGrab ? "grab" : ""} ${isShake ? "shake" : ""} ${isSpecial ? "special-tile" : ""}`}
      style={{
        left: c * cell,
        top: r * cell,
        width: cell,
        height: cell,
        transform: swapTransform || undefined,
        zIndex: isBlasting ? 10 : isGrab ? 5 : (isSpecial ? 3 : 1),
        transition: isSwapping
          ? "transform 0.16s ease"
          : delaySeconds
          ? `top 0.16s ease ${delaySeconds}s`
          : "top 0.16s ease",
        border: getSpecialBorder(),
        boxShadow: isSpecial ? `0 0 12px ${getSpecialBorder().split(' ')[2]}40` : 'none',
        cursor: 'pointer' // All tiles are clickable
      }}
      onClick={onClick} // FIX: Using the onClick prop directly
    >
      <div
        className={`emoji ${isGrab ? "grab" : ""} ${isShake ? "shake" : ""}`}
        style={{ 
          fontSize: isImage ? 'inherit' : Math.floor(cell * EMOJI_SIZE),
          width: isImage ? '85%' : 'auto',
          height: isImage ? '85%' : 'auto',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'relative'
        }}
      >
        {isImage ? (
          <img 
            src={value} 
            alt="cat" 
            style={{ 
              width: '100%', 
              height: '100%', 
              objectFit: 'contain',
              borderRadius: '8px',
              filter: isSpecial ? 'brightness(1.1) contrast(1.1)' : 'none'
            }}
          />
        ) : (
          <span className="tile-emoji" style={{ filter: isSpecial ? 'brightness(1.2) drop-shadow(0 0 4px gold)' : 'none' }}>
            {value}
          </span>
        )}
        
        {/* 🆕 PHASE 3: Special overlay indicator */}
        {isSpecial && getSpecialOverlay() && (
          <div className="special-overlay">
            {getSpecialOverlay()}
          </div>
        )}
      </div>
    </div>
  );
});

// 🔥 Hype Meter Component (unchanged from Phase 1)
const HypeMeter = ({ currentScore, cascadeLevel }) => {
  const tier1 = 1500;
  const tier2 = 4500; 
  const tier3 = 9000;
  
  let currentTier = 0;
  let progress = 0;
  
  if (currentScore >= tier3) {
    currentTier = 3;
    progress = 100;
  } else if (currentScore >= tier2) {
    currentTier = 2;
    progress = ((currentScore - tier2) / (tier3 - tier2)) * 100;
  } else if (currentScore >= tier1) {
    currentTier = 1;
    progress = ((currentScore - tier1) / (tier2 - tier1)) * 100;
  } else {
    progress = (currentScore / tier1) * 100;
  }
  
  const getTierColor = () => {
    switch(currentTier) {
      case 3: return '#ff6b35'; // Hot orange
      case 2: return '#f7b731'; // Gold  
      case 1: return '#26de81'; // Green
      default: return '#74b9ff'; // Blue
    }
  };
  
  const getTierLabel = () => {
    switch(currentTier) {
      case 3: return 'FIRE! 🔥';
      case 2: return 'HOT! 🌟';
      case 1: return 'WARM 🔆';
      default: return 'HYPE ⚡';
    }
  };
  
  return (
    <div className="hype-meter">
      <div className="hype-label">{getTierLabel()}</div>
      <div className="hype-bar">
        <div 
          className="hype-progress"
          style={{ 
            width: `${Math.min(progress, 100)}%`,
            background: `linear-gradient(90deg, ${getTierColor()}, ${getTierColor()}80)`
          }}
        />
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

// 📱 Rush Timer Component (updated)
const RushTimer = ({ timeLeft, isPaused, onTogglePause }) => {
  const getTimerColor = () => {
    if (timeLeft <= 10) return '#e74c3c'; // Red
    if (timeLeft <= 20) return '#f39c12'; // Orange  
    return '#27ae60'; // Green
  };

  return (
    <div className="rush-timer" style={{ 
      textAlign: 'center', 
      padding: '12px 16px',
      background: `linear-gradient(135deg, ${getTimerColor()}, ${getTimerColor()}cc)`,
      color: 'white',
      borderRadius: '12px',
      margin: '8px 16px',
      fontWeight: '800',
      fontSize: '18px'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px' }}>
        <span>{timeLeft}s</span>
        <button 
          onClick={onTogglePause}
          style={{
            background: 'rgba(255,255,255,0.2)',
            border: '1px solid rgba(255,255,255,0.3)',
            borderRadius: '6px',
            color: 'white',
            padding: '4px 8px',
            fontSize: '12px',
            cursor: 'pointer'
          }}
        >
          {isPaused ? "▶️ Resume" : "⏸ Pause"}
        </button>
      </div>

      <div
        className="progress rush-progress"
        style={{
          width: `${(timeLeft / GAME_DURATION) * 100}%`,
          height: 8,
          background: `linear-gradient(90deg, ${getTimerColor()}, ${getTimerColor()}80)`,
          borderRadius: 6,
          marginTop: 10,
          boxShadow: `0 0 8px ${getTimerColor()}40`
        }}
      />
    </div>
  );
}

// ====== START: Game Logic Helper Functions ======
// FIX: Moved all helper functions before the GameView component to prevent initialization errors.

function randCat() {
    return CAT_SET[(Math.random() * CAT_SET.length) | 0];
}

function pickDifferent(curr) {
    const choices = CAT_SET.filter((x) => x !== curr);
    return choices[(Math.random() * choices.length) | 0];
}

function cloneGrid(g) {
    return g.map((row) => row.slice());
}

function inBounds(r, c) {
    return r >= 0 && c >= 0 && r < ROWS && c < COLS;
}

function findMatches(g) {
    const matches = new Set();
    // Horizontal matches
    for (let r = 0; r < ROWS; r++) {
        let streak = [];
        for (let c = 0; c < COLS; c++) {
            if (streak.length > 0 && g[r][c] === streak[0].value) {
                streak.push({ r, c, value: g[r][c] });
            } else {
                if (streak.length >= 3) streak.forEach(t => matches.add(`${t.r}:${t.c}`));
                streak = [{ r, c, value: g[r][c] }];
            }
        }
        if (streak.length >= 3) streak.forEach(t => matches.add(`${t.r}:${t.c}`));
    }
    // Vertical matches
    for (let c = 0; c < COLS; c++) {
        let streak = [];
        for (let r = 0; r < ROWS; r++) {
            if (streak.length > 0 && g[r][c] === streak[0].value) {
                streak.push({ r, c, value: g[r][c] });
            } else {
                if (streak.length >= 3) streak.forEach(t => matches.add(`${t.r}:${t.c}`));
                streak = [{ r, c, value: g[r][c] }];
            }
        }
        if (streak.length >= 3) streak.forEach(t => matches.add(`${t.r}:${t.c}`));
    }
    return Array.from(matches).map(s => s.split(':').map(Number));
}

function hasAnyMove(g) {
    for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c < COLS; c++) {
            const dirs = [[0, 1], [1, 0]];
            for (const [dr, dc] of dirs) {
                const r2 = r + dr,
                    c2 = c + dc;
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
    while (attempts < 100) {
        for (let i = 0; i < 50; i++) {
            const r1 = Math.floor(Math.random() * ROWS);
            const c1 = Math.floor(Math.random() * COLS);
            const r2 = Math.floor(Math.random() * ROWS);
            const c2 = Math.floor(Math.random() * COLS);
            [g[r1][c1], g[r2][c2]] = [g[r2][c2], g[r1][c1]];
        }
        let matches = findMatches(g);
        while (matches.length > 0) {
            matches.forEach(([r, c]) => g[r][c] = randCat());
            matches = findMatches(g);
        }
        if (hasAnyMove(g)) return g;
        attempts++;
    }
    console.warn("Could not generate a solvable grid.");
    return g;
}

function initSolvableGrid() {
    let g = Array.from({ length: ROWS }, () => Array(COLS).fill(null));
    for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c < COLS; c++) g[r][c] = randCat();
    }
    let matches = findMatches(g);
    while (matches.length > 0) {
        matches.forEach(([r, c]) => g[r][c] = randCat());
        matches = findMatches(g);
    }
    if (!hasAnyMove(g)) {
        g = shuffleToSolvable(g);
    }
    return g;
}

const detect4Match = () => [];
const detect5InLine = () => [];
const detectLTShape = () => [];

// ====== END: Game Logic Helper Functions ======


// ====== Main GameView Component ======
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
  const [comboCelebration, setComboCelebration] = useState(null);
  const [cascadeCelebration, setCascadeCelebration] = useState(null);
  const [specialEffects, setSpecialEffects] = useState([]); // 🆕 PHASE 3
  
  // Refs for persistence
  const gridRef = useRef(grid);
  const specialGridRef = useRef(specialGrid);
  const cascadeLevelRef = useRef(0);
  const totalTimeBonus = useRef(0);

  // Update refs when state changes
  useEffect(() => { gridRef.current = grid; }, [grid]);
  useEffect(() => { specialGridRef.current = specialGrid; }, [specialGrid]);

  const findFirstMove = useCallback((g) => {
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
  }, []);

  const cascadeAndFillGrid = useCallback((currentGrid, currentSpecialGrid, cascadeLevel = 1) => {
    cascadeLevelRef.current = cascadeLevel;
    
    const g = cloneGrid(currentGrid);
    const sg = cloneGrid(currentSpecialGrid);
    
    for (let c = 0; c < COLS; c++) {
      const columnCats = [];
      const columnSpecials = [];
      for (let r = ROWS - 1; r >= 0; r--) {
        if (g[r][c] !== null) {
          columnCats.push(g[r][c]);
          columnSpecials.push(sg[r][c]);
        }
      }
      for (let r = 0; r < ROWS; r++) {
        g[r][c] = null;
        sg[r][c] = null;
      }
      for (let i = 0; i < columnCats.length; i++) {
        g[ROWS - 1 - i][c] = columnCats[i];
        sg[ROWS - 1 - i][c] = columnSpecials[i];
      }
      for (let r = ROWS - columnCats.length - 1; r >= 0; r--) {
        g[r][c] = randCat();
      }
    }
    
    setGrid(g);
    setSpecialGrid(sg);
    
    setTimeout(() => {
      const matches = findMatches(g);
      if (matches.length > 0) {
        processMatches(g, sg, matches, cascadeLevel);
      } else {
        cascadeLevelRef.current = 0;
      }
    }, 300);
  }, []); 


  const processMatches = useCallback((currentGrid, currentSpecialGrid, matches, cascadeLevel = 1) => {
    const specials4 = detect4Match(currentGrid, matches);
    const specials5 = detect5InLine(currentGrid, matches);  
    const specialsLT = detectLTShape(currentGrid, matches);
    
    const allSpecials = [...specials4, ...specials5, ...specialsLT];
    
    const g = cloneGrid(currentGrid);
    const sg = cloneGrid(currentSpecialGrid);
    
    matches.forEach(([r, c]) => {
      g[r][c] = null;
      sg[r][c] = null;
    });

    allSpecials.forEach(special => {
      if (inBounds(special.r, special.c)) {
        g[special.r][special.c] = special.originalCat;
        sg[special.r][special.c] = special.type;
        console.log(`🌟 Created special: ${special.type} at (${special.r},${special.c})`);
      }
    });
    
    const basePoints = matches.length <= 3 ? RUSH_SCORING[3] :
                       matches.length === 4 ? RUSH_SCORING[4] :
                       RUSH_SCORING[5];
    
    const cascadeMultiplier = 1 + (cascadeLevel - 1) * RUSH_SCORING.CASCADE_MULTIPLIER;
    const finalPoints = Math.floor(basePoints * cascadeMultiplier);
    
    setScore(s => s + finalPoints);
    setCombo(cascadeLevel);
    
    if (cascadeLevel > 1) {
      const timeBonus = Math.min(RUSH_SCORING.CASCADE_TIME_BONUS, 
                                 RUSH_SCORING.MAX_TIME_BONUS - totalTimeBonus.current);
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
    
    setTimeout(() => {
      cascadeAndFillGrid(g, sg, cascadeLevel + 1);
    }, 400);
  }, [cascadeAndFillGrid]);


  const activateWhiskerStreak = (r, c, direction) => {
    let g = cloneGrid(gridRef.current);
    let sg = cloneGrid(specialGridRef.current);
    let tilesCleared = 0;
    
    if (direction === 'horizontal') {
      for (let col = 0; col < COLS; col++) if (g[r][col] !== null) { g[r][col] = null; sg[r][col] = null; tilesCleared++; }
      setSpecialEffects(prev => [...prev, { type: 'line-clear', direction: 'horizontal', row: r, id: Date.now() }]);
    } else {
      for (let row = 0; row < ROWS; row++) if (g[row][c] !== null) { g[row][c] = null; sg[row][c] = null; tilesCleared++; }
      setSpecialEffects(prev => [...prev, { type: 'line-clear', direction: 'vertical', col: c, id: Date.now() }]);
    }
    
    const points = RUSH_SCORING.WHISKER_STREAK_BASE + (tilesCleared * RUSH_SCORING.WHISKER_STREAK_PER_TILE);
    setScore(s => s + points);
    audio.play?.('powerup_spawn', { volume: 0.8 });
    return { grid: g, specialGrid: sg };
  };

  const activateBoxCat = (r, c) => {
    let g = cloneGrid(gridRef.current);
    let sg = cloneGrid(specialGridRef.current);
    let tilesCleared = 0;
    
    for (let row = r - 1; row <= r + 1; row++) {
      for (let col = c - 1; col <= c + 1; col++) {
        if (inBounds(row, col) && g[row][col] !== null) { g[row][col] = null; sg[row][col] = null; tilesCleared++; }
      }
    }
    
    setSpecialEffects(prev => [...prev, { type: 'area-blast', r, c, id: Date.now() }]);
    const points = RUSH_SCORING.BOX_CAT_BASE + (tilesCleared * RUSH_SCORING.BOX_CAT_PER_TILE);
    setScore(s => s + points);
    audio.play?.('combo_x2', { volume: 0.9 });
    return { grid: g, specialGrid: sg };
  };

  const activateCatnipBomb = (targetCat) => {
    let g = cloneGrid(gridRef.current);
    let sg = cloneGrid(specialGridRef.current);
    let tilesCleared = 0;
    
    for (let row = 0; row < ROWS; row++) {
      for (let col = 0; col < COLS; col++) {
        if (g[row][col] === targetCat) { g[row][col] = null; sg[row][col] = null; tilesCleared++; }
      }
    }
    
    setSpecialEffects(prev => [...prev, { type: 'color-bomb', targetCat, id: Date.now() }]);
    const points = RUSH_SCORING.CATNIP_BOMB_BASE + (tilesCleared * RUSH_SCORING.CATNIP_BOMB_PER_TILE);
    setScore(s => s + points);
    audio.play?.('combo_x4', { volume: 1.0 });
    return { grid: g, specialGrid: sg };
  };

  const handleSpecialClick = useCallback((r, c, specialType, originalCat) => {
    if (!gameActive || isPaused) return;
    
    let result;
    switch(specialType) {
      case SPECIAL_TYPES.WHISKER_STREAK_H: result = activateWhiskerStreak(r, c, 'horizontal'); break;
      case SPECIAL_TYPES.WHISKER_STREAK_V: result = activateWhiskerStreak(r, c, 'vertical'); break;
      case SPECIAL_TYPES.BOX_CAT: result = activateBoxCat(r, c); break;
      case SPECIAL_TYPES.CATNIP_BOMB: result = activateCatnipBomb(originalCat); break;
      default: return;
    }
    
    if (result) {
      setGrid(result.grid);
      setSpecialGrid(result.specialGrid);
      setSelectedTile(null);
      setTimeout(() => cascadeAndFillGrid(result.grid, result.specialGrid), 500);
    }
  }, [gameActive, isPaused, cascadeAndFillGrid]);

  const handleTileClick = useCallback((r, c) => {
    if (!gameActive || isPaused) return;
    
    if (specialGridRef.current[r][c]) {
      handleSpecialClick(r, c, specialGridRef.current[r][c], gridRef.current[r][c]);
      return;
    }
    
    if (selectedTile) {
      const [r1, c1] = selectedTile;
      if (r1 === r && c1 === c) {
        setSelectedTile(null);
        return;
      }
      
      const isAdjacent = (Math.abs(r1 - r) + Math.abs(c1 - c)) === 1;
      if (!isAdjacent) {
        setSelectedTile([r, c]);
        return;
      }
      
      const g = cloneGrid(gridRef.current);
      const sg = cloneGrid(specialGridRef.current);
      [g[r1][c1], g[r][c]] = [g[r][c], g[r1][c1]];
      [sg[r1][c1], sg[r][c]] = [sg[r][c], sg[r1][c1]];
      
      const matches = findMatches(g);
      if (matches.length > 0) {
        setGrid(g);
        setSpecialGrid(sg);
        setSelectedTile(null);
        setMoves(m => m + 1);
        setTimeout(() => processMatches(g, sg, matches), 200);
      } else {
        setSelectedTile(null);
        audio.play?.('swap_invalid');
      }
    } else {
      setSelectedTile([r, c]);
    }
  }, [selectedTile, gameActive, isPaused, handleSpecialClick, processMatches]);

  // Game timer
  useEffect(() => {
    if (!gameActive || isPaused) return;
    
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          setGameActive(false);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [gameActive, isPaused]);

  // Auto-hint system
  useEffect(() => {
    if (!gameActive || selectedTile || isPaused) {
        setHintTile(null);
        return;
    };
    
    const hintTimer = setTimeout(() => {
      const firstMove = findFirstMove(gridRef.current);
      if (firstMove) {
        setHintTile(firstMove[0]);
        setTimeout(() => setHintTile(null), 2000);
      }
    }, 8000);
    
    return () => clearTimeout(hintTimer);
  }, [gameActive, selectedTile, grid, isPaused, findFirstMove]);

  // Game over logic
  useEffect(() => {
    if (!gameActive) {
      onGameOver?.({ score, moves, combo: cascadeLevelRef.current });
    }
  }, [gameActive, onGameOver, score, moves]);

  // Clear special effects after animation
  useEffect(() => {
    if (specialEffects.length > 0) {
      const timer = setTimeout(() => {
        setSpecialEffects([]);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [specialEffects]);

  // Calculate board dimensions
  const containerWidth = typeof window !== 'undefined' ? Math.min(380, window.innerWidth - 40) : 340;
  const cellSize = Math.floor(containerWidth / COLS);
  const boardWidth = cellSize * COLS;
  const boardHeight = cellSize * ROWS;

  const isGameOver = !gameActive;

  return (
    <div className="section board-wrap">
      {specialGrid.some(row => row.some(cell => cell)) && (
        <div className="special-instructions">
          <div className="instruction-text">
            ✨ Tap special cats to activate their powers! ✨
          </div>
        </div>
      )}
      
      <RushTimer 
        timeLeft={timeLeft}
        isPaused={isPaused}
        onTogglePause={() => setIsPaused(!isPaused)}
      />
      
      <HypeMeter currentScore={score} cascadeLevel={cascadeLevelRef.current} />
      
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

      <div 
        className={`board ${cascadeLevelRef.current > 1 ? 'rush-board' : ''}`}
        style={{ width: boardWidth, height: boardHeight, position: 'relative' }}
      >
        <div className="gridlines" style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
            {/* Grid lines can be added via CSS for performance */}
        </div>

        {grid.map((row, r) =>
          row.map((cat, c) => {
            if (!cat) return null;
            
            return (
              <MemoizedTile
                key={`${r}-${c}-${cat}`}
                r={r}
                c={c}
                value={cat}
                cell={cellSize}
                isSelected={selectedTile?.[0] === r && selectedTile?.[1] === c}
                isHinted={hintTile?.[0] === r && hintTile?.[1] === c}
                EMOJI_SIZE={EMOJI_SIZE}
                specialType={specialGrid[r][c]}
                onClick={() => handleTileClick(r, c)}
              />
            );
          })
        )}

        {specialEffects.map(effect => {
            if (effect.type === 'line-clear') {
                return <div key={effect.id} className="special-activation-effect line-clear-effect" style={{[effect.direction === 'horizontal' ? 'top' : 'left']: effect.direction === 'horizontal' ? effect.row * cellSize : effect.col * cellSize, [effect.direction === 'horizontal' ? 'left' : 'top']: 0, [effect.direction === 'horizontal' ? 'width' : 'height']: effect.direction === 'horizontal' ? boardWidth : boardHeight, [effect.direction === 'horizontal' ? 'height' : 'width']: cellSize, }} />;
            } else if (effect.type === 'area-blast') {
                return <div key={effect.id} className="special-activation-effect area-blast-effect" style={{ left: (effect.c - 1) * cellSize, top: (effect.r - 1) * cellSize, width: cellSize * 3, height: cellSize * 3, }} />;
            }
            return null;
        })}
      </div>

      {isGameOver && <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', zIndex: 100, width: '90%' }}><ShareButtons score={score} /></div>}
    </div>
  );
}

