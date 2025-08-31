// src/GameView.jsx
import React, { useEffect, useRef, useState, useCallback, useMemo, useLayoutEffect } from "react";
import * as audio from "./audio"; // minimal sound hooks
import ShareButtons from "./ShareButtons.jsx";
import { game } from "./utils.js";
import { useStore } from "./store.js"; // NEW: Import Zustand store

// 🆕 PHASE 2: Special Cat Types
const SPECIAL_TYPES = {
  WHISKER_STREAK_H: 'whisker_streak_h', // Horizontal line clear
  WHISKER_STREAK_V: 'whisker_streak_v', // Vertical line clear
  BOX_CAT: 'box_cat',                   // 3x3 area clear
  CATNIP_BOMB: 'catnip_bomb',           // Clear all of one type
};

// 1) OPTIMIZE: Enhanced Memoized tile component with special rendering
const MemoizedTile = React.memo(({
  r, c, value, cell, isSelected, isHinted, isBlasting, isSwapping,
  isNewTile, isGrab, isShake, swapTransform, delaySeconds, EMOJI_SIZE, specialType,
  effectOverlay // 🆕 PHASE 3: Effect overlay
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
      className={`tile ${isSelected ? "sel" : ""} ${isHinted ? "hint-pulse" : ""} ${isGrab ? "grab" : ""} ${isShake ? "shake" : ""} ${isSpecial ? "special-tile" : ""}`}
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
        className={`emoji ${isGrab ? "grab" : ""} ${isShake ? "shake" : ""}`}
        style={{ 
          fontSize: isImage ? 'inherit' : Math.floor(cell * EMOJI_SIZE),
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
      
      {/* 🆕 PHASE 2: Special overlay indicator */}
      {isSpecial && (
        <div className="special-overlay">
          {getSpecialOverlay()}
        </div>
      )}
      
      {/* 🆕 PHASE 3: Effect overlay for animations */}
      {effectOverlay && (
        <div className={`special-effect-overlay ${effectOverlay.type}`}>
          {effectOverlay.content}
        </div>
      )}
    </div>
  );
});

export default GameView;

function GameView() {
  const ROWS = 6, COLS = 6;
  const [grid, setGrid] = useState([]);
  const [specialGrid, setSpecialGrid] = useState([]); // 🆕 PHASE 2: Track special cats
  const [activeEffects, setActiveEffects] = useState([]); // 🆕 PHASE 3: Track active effects
  
  const gridRef = useRef([]);
  const specialGridRef = useRef([]); // 🆕 PHASE 2: Ref for special grid
  
  const [timeLeft, setTimeLeft] = useState(60);
  const [score, setScore] = useState(0);
  const [gameStarted, setGameStarted] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  const [gameOverState, setGameOverState] = useState('playing');
  
  const [drag, setDrag] = useState(null);
  const [selectedTile, setSelectedTile] = useState(null);
  const [hintTiles, setHintTiles] = useState([]);
  
  const [fx, setFx] = useState([]);
  const [combo, setCombo] = useState(0);
  const [cascadeLevel, setCascadeLevel] = useState(0); // 🆕 PHASE 1: Cascade tracking
  const [totalCascadeTimeBonus, setTotalCascadeTimeBonus] = useState(0); // 🆕 PHASE 1: Total time bonus tracking
  
  const [swapPair, setSwapPair] = useState(null);
  const [blastCells, setBlastCells] = useState([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [animatingTiles, setAnimatingTiles] = useState(new Set());
  
  const [activePowerup, setActivePowerup] = useState(null);
  const [showComboDisplay, setShowComboDisplay] = useState(false);
  
  const { profile, consumePowerup, addCoins, getInventory } = useStore();

  // 🎯 Meowchi 6x6 Rush Scoring (Updated for Phase 2)
  const RUSH_SCORING = {
    3: 60,   // 3-match = 60 points
    4: 120,  // 4-match = 120 points  
    5: 200,  // 5-match = 200 points
    CASCADE_TIME_BONUS: 0.25, // +0.25s per cascade step
    MAX_TIME_BONUS: 5,        // Cap at +5s total per game
    CASCADE_MULTIPLIER: 0.3,   // Each cascade step: ×(1 + 0.3 per step)
    
    // 🆕 PHASE 2: Special Scoring
    WHISKER_STREAK_BASE: 160,  // +160 base + +15 per tile cleared
    WHISKER_STREAK_PER_TILE: 15,
    BOX_CAT_BASE: 180,         // +180 base + +20 per tile
    BOX_CAT_PER_TILE: 20,
    CATNIP_BOMB_BASE: 420,     // +420 base + +12 per tile
    CATNIP_BOMB_PER_TILE: 12,
  };

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
        case 2: return 'HOT! ⚡';
        case 1: return 'WARM! 🌟';
        default: return 'BUILDING...';
      }
    };

    return (
      <div className="hype-meter">
        <div className="hype-label">{getTierLabel()}</div>
        <div className="hype-progress" style={{
          width: '200px',
          height: '8px',
          backgroundColor: 'var(--surface)',
          borderRadius: '4px',
          overflow: 'hidden',
          border: '1px solid var(--border)'
        }}>
          <div className="hype-fill" style={{
            width: `${progress}%`,
            height: '100%',
            backgroundColor: getTierColor(),
            transition: 'width 0.3s ease',
            backgroundImage: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.2) 50%, transparent 100%)'
          }} />
        </div>
        <div className="hype-score" style={{
          fontSize: '14px',
          fontWeight: '700',
          color: getTierColor()
        }}>
          {currentScore.toLocaleString()} {cascadeLevel > 0 && `(x${(1 + cascadeLevel * RUSH_SCORING.CASCADE_MULTIPLIER).toFixed(1)})`}
        </div>
      </div>
    );
  };

  // 🎯 Meowchi Rush Cat Set (Phase 1)
  const CAT_SET = useMemo(() => [
      "/assets/gem1.png",
      "/assets/gem2.png", 
      "/assets/gem3.png",
      "/assets/gem4.png",
      "/assets/gem5.png",
      "/assets/gem6.png"
  ], []);

  const POWERUP_DEFINITIONS = {
    shuffle: { name: "Paw-sitive Swap", icon: "🐾" },
    hammer: { name: "Catnip Cookie", icon: "🍪" },
    bomb: { name: "Marshmallow Bomb", icon: "💣" },
  };

  const boardRef = useRef(null);
  const [cell, setCell] = useState(40); // Start with a sensible default to avoid division by zero

  useLayoutEffect(() => {
    const boardElement = boardRef.current;
    if (!boardElement) return;
  
    const resizeObserver = new ResizeObserver(() => {
      if (boardElement.offsetWidth > 0) {
        setCell(Math.floor(boardElement.offsetWidth / COLS));
      }
    });
  
    resizeObserver.observe(boardElement);
    return () => resizeObserver.disconnect();
  }, []);


  const EMOJI_SIZE = 0.72;

  function cloneGrid(g) {
    return g.map(row => [...row]);
  }

  function inBounds(r, c) {
    return r >= 0 && r < ROWS && c >= 0 && c < COLS;
  }

  function randomCat() {
    return CAT_SET[Math.floor(Math.random() * CAT_SET.length)];
  }

  function preventMatches(grid) {
  // Simple implementation - just return grid for now
  return grid;
  }
  
  function createGrid() {
    const g = [];
    const sg = []; // 🆕 PHASE 2: Special grid
    for (let r = 0; r < ROWS; r++) {
      g[r] = [];
      sg[r] = []; // 🆕 PHASE 2: Special grid row
      for (let c = 0; c < COLS; c++) {
        g[r][c] = randomCat();
        sg[r][c] = null; // 🆕 PHASE 2: No special initially
      }
    }
    return { grid: g, specialGrid: sg };
  }

  function findMatches(g) {
    const matches = [];
    // Check horizontal matches
    for (let r = 0; r < ROWS; r++) {
      let count = 1;
      let current = g[r][0];
      for (let c = 1; c < COLS; c++) {
        if (g[r][c] === current && current !== null) {
          count++;
        } else {
          if (count >= 3) {
            for (let i = c - count; i < c; i++) {
              matches.push([r, i]);
            }
          }
          current = g[r][c];
          count = 1;
        }
      }
      if (count >= 3) {
        for (let i = COLS - count; i < COLS; i++) {
          matches.push([r, i]);
        }
      }
    }

    // Check vertical matches
    for (let c = 0; c < COLS; c++) {
      let count = 1;
      let current = g[0][c];
      for (let r = 1; r < ROWS; r++) {
        if (g[r][c] === current && current !== null) {
          count++;
        } else {
          if (count >= 3) {
            for (let i = r - count; i < r; i++) {
              matches.push([i, c]);
            }
          }
          current = g[r][c];
          count = 1;
        }
      }
      if (count >= 3) {
        for (let i = ROWS - count; i < ROWS; i++) {
          matches.push([i, c]);
        }
      }
    }

    return matches;
  }

  // 🆕 PHASE 2: Special Cat Detection Functions

  // Detect 4-in-a-row for Whisker-Streak
  const detect4Match = (matches) => {
    const specials = [];
    
    // Group horizontal matches by row
    const horizontalGroups = {};
    const verticalGroups = {};
    
    matches.forEach(([r, c]) => {
      // Group horizontal matches by row
      if (!horizontalGroups[r]) horizontalGroups[r] = [];
      horizontalGroups[r].push(c);
      
      // Group vertical matches by column
      if (!verticalGroups[c]) verticalGroups[c] = [];
      verticalGroups[c].push(r);
    });
    
    // Check horizontal groups for 4+
    Object.entries(horizontalGroups).forEach(([row, cols]) => {
      cols.sort((a, b) => a - b);
      if (cols.length >= 4) {
        // Create horizontal Whisker-Streak in the middle
        const middleCol = cols[Math.floor(cols.length / 2)];
        specials.push({
          r: parseInt(row),
          c: middleCol,
          type: SPECIAL_TYPES.WHISKER_STREAK_H
        });
      }
    });
    
    // Check vertical groups for 4+
    Object.entries(verticalGroups).forEach(([col, rows]) => {
      rows.sort((a, b) => a - b);
      if (rows.length >= 4) {
        // Create vertical Whisker-Streak in the middle
        const middleRow = rows[Math.floor(rows.length / 2)];
        specials.push({
          r: middleRow,
          c: parseInt(col),
          type: SPECIAL_TYPES.WHISKER_STREAK_V
        });
      }
    });
    
    return specials;
  };

  // Detect 5-in-a-line for Catnip Bomb
  const detect5InLine = (matches) => {
    const specials = [];
    
    // Check for exactly 5 in a straight line
    const horizontalGroups = {};
    const verticalGroups = {};
    
    matches.forEach(([r, c]) => {
      if (!horizontalGroups[r]) horizontalGroups[r] = [];
      horizontalGroups[r].push(c);
      
      if (!verticalGroups[c]) verticalGroups[c] = [];
      verticalGroups[c].push(r);
    });
    
    // Check for exactly 5 horizontal
    Object.entries(horizontalGroups).forEach(([row, cols]) => {
      if (cols.length >= 5) {
        cols.sort((a, b) => a - b);
        const middleCol = cols[Math.floor(cols.length / 2)];
        specials.push({
          r: parseInt(row),
          c: middleCol,
          type: SPECIAL_TYPES.CATNIP_BOMB
        });
      }
    });
    
    // Check for exactly 5 vertical
    Object.entries(verticalGroups).forEach(([col, rows]) => {
      if (rows.length >= 5) {
        rows.sort((a, b) => a - b);
        const middleRow = rows[Math.floor(rows.length / 2)];
        specials.push({
          r: middleRow,
          c: parseInt(col),
          type: SPECIAL_TYPES.CATNIP_BOMB
        });
      }
    });
    
    return specials;
  };

  // Detect L/T shapes for Box Cat (simplified version)
  const detectLTShape = (grid, matches) => {
    const specials = [];
    
    // For Phase 2, we'll use a simplified approach:
    // If we have 5+ matches and they form a rough L or T, create a Box Cat
    if (matches.length >= 5) {
      // Find the center point of the match group
      const centerR = Math.round(matches.reduce((sum, [r]) => sum + r, 0) / matches.length);
      const centerC = Math.round(matches.reduce((sum, [, c]) => sum + c, 0) / matches.length);
      
      // Check if this forms an L or T pattern (simplified)
      const hasHorizontal = matches.some(([r, c]) => r === centerR && Math.abs(c - centerC) >= 1);
      const hasVertical = matches.some(([r, c]) => c === centerC && Math.abs(r - centerR) >= 1);
      
      if (hasHorizontal && hasVertical && matches.length >= 5) {
        specials.push({
          r: centerR,
          c: centerC,
          type: SPECIAL_TYPES.BOX_CAT
        });
      }
    }
    
    return specials;
  };

  // 🆕 PHASE 3: Enhanced Special Activation Functions

  const activateWhiskerStreak = async (r, c, direction, targetCat) => {
    // Phase 3: Add visual effects before clearing
    const effectId = Date.now();
    
    // Add line sweep effect
    setActiveEffects(prev => [...prev, {
      id: effectId,
      type: 'line-sweep',
      direction,
      row: r,
      col: c,
      duration: 500
    }]);
    
    // Screen flash effect
    document.body.style.filter = 'brightness(1.3)';
    setTimeout(() => {
      document.body.style.filter = 'brightness(1)';
    }, 100);
    
    // Enhanced audio
    audio.play?.('powerup_spawn', { volume: 0.8 });
    
    // Wait for effect animation
    await new Promise(resolve => setTimeout(resolve, 300));
    
    const g = cloneGrid(gridRef.current);
    const sg = cloneGrid(specialGridRef.current);
    let tilesCleared = 0;
    
    if (direction === 'horizontal') {
      // Clear entire row
      for (let col = 0; col < COLS; col++) {
        if (g[r][col] !== null) {
          g[r][col] = null;
          sg[r][col] = null;
          tilesCleared++;
        }
      }
    } else {
      // Clear entire column
      for (let row = 0; row < ROWS; row++) {
        if (g[row][c] !== null) {
          g[row][c] = null;
          sg[row][c] = null;
          tilesCleared++;
        }
      }
    }
    
    const points = RUSH_SCORING.WHISKER_STREAK_BASE + (tilesCleared * RUSH_SCORING.WHISKER_STREAK_PER_TILE);
    setScore(s => s + points);
    
    console.log(`⚡ Whisker-Streak activated: ${tilesCleared} tiles, ${points} points`);
    
    // Remove effect
    setTimeout(() => {
      setActiveEffects(prev => prev.filter(fx => fx.id !== effectId));
    }, 200);
    
  };

  const activateBoxCat = async (r, c, targetCat) => {
    // Phase 3: Add explosion effect
    const effectId = Date.now();
    
    // Add explosion effect
    setActiveEffects(prev => [...prev, {
      id: effectId,
      type: 'explosion',
      row: r,
      col: c,
      duration: 600
    }]);
    
    // Screen shake effect
    document.body.style.animation = 'screen-shake 0.3s ease';
    setTimeout(() => {
      document.body.style.animation = '';
    }, 300);
    
    // Enhanced audio with explosion sound
    audio.play?.('powerup_spawn', { volume: 0.9 });
    
    // Wait for effect animation
    await new Promise(resolve => setTimeout(resolve, 400));
    
    const g = cloneGrid(gridRef.current);
    const sg = cloneGrid(specialGridRef.current);
    let tilesCleared = 0;
    
    // Clear 3x3 area around the Box Cat
    for (let row = r - 1; row <= r + 1; row++) {
      for (let col = c - 1; col <= c + 1; col++) {
        if (inBounds(row, col) && g[row][col] !== null) {
          g[row][col] = null;
          sg[row][col] = null;
          tilesCleared++;
        }
      }
    }
    
    const points = RUSH_SCORING.BOX_CAT_BASE + (tilesCleared * RUSH_SCORING.BOX_CAT_PER_TILE);
    setScore(s => s + points);
    
    console.log(`💥 Box Cat activated: ${tilesCleared} tiles, ${points} points`);
    
    // Remove effect
    setTimeout(() => {
      setActiveEffects(prev => prev.filter(fx => fx.id !== effectId));
    }, 200);
    
    return { grid: g, specialGrid: sg };
  };

  const activateCatnipBomb = async (r, c, targetCat) => {
    // Phase 3: Add color flash effect
    const effectId = Date.now();
    
    // Add color bomb effect
    setActiveEffects(prev => [...prev, {
      id: effectId,
      type: 'color-bomb',
      targetCat,
      row: r,
      col: c,
      duration: 800
    }]);
    
    // Rainbow flash effect
    document.body.style.filter = 'hue-rotate(180deg) saturate(2)';
    setTimeout(() => {
      document.body.style.filter = '';
    }, 200);
    
    // Enhanced audio
    audio.play?.('powerup_spawn', { volume: 1.0 });
    
    // Wait for effect animation
    await new Promise(resolve => setTimeout(resolve, 500));
    
    const g = cloneGrid(gridRef.current);
    const sg = cloneGrid(specialGridRef.current);
    let tilesCleared = 0;
    
    // Clear all cats of the target type
    for (let row = 0; row < ROWS; row++) {
      for (let col = 0; col < COLS; col++) {
        if (g[row][col] === targetCat) {
          g[row][col] = null;
          sg[row][col] = null;
          tilesCleared++;
        }
      }
    }
    
    const points = RUSH_SCORING.CATNIP_BOMB_BASE + (tilesCleared * RUSH_SCORING.CATNIP_BOMB_PER_TILE);
    setScore(s => s + points);
    
    console.log(`🌟 Catnip Bomb activated: ${tilesCleared} tiles, ${points} points`);
    
    // Remove effect
    setTimeout(() => {
      setActiveEffects(prev => prev.filter(fx => fx.id !== effectId));
    }, 300);
    
    return { grid: g, specialGrid: sg };
  };

  // Rest of the functions remain the same as Phase 2...
  // [All other game functions unchanged]

  function applyGravity(g) {
    const ng = cloneGrid(g);
    for (let c = 0; c < COLS; c++) {
      const column = [];
      for (let r = 0; r < ROWS; r++) {
        if (ng[r][c] !== null) column.push(ng[r][c]);
      }
      for (let r = 0; r < ROWS; r++) {
        ng[r][c] = r < ROWS - column.length ? null : column[r - (ROWS - column.length)];
      }
    }
    return ng;
  }

  function refillGrid(g, sg) {
    const ng = cloneGrid(g);
    const nsg = cloneGrid(sg); // 🆕 PHASE 2: Clone special grid
    for (let c = 0; c < COLS; c++) {
      for (let r = 0; r < ROWS; r++) {
        if (ng[r][c] === null) {
          ng[r][c] = randomCat();
          nsg[r][c] = null; // 🆕 PHASE 2: New tiles are not special
        }
      }
    }
    return { grid: ng, specialGrid: nsg };
  }

  const optimizedResolveCascades = useCallback(async (initialGrid, initialSpecialGrid, onComplete) => {
    if (isProcessing) return;
    setIsProcessing(true);
    
    let currentGrid = cloneGrid(initialGrid);
    let currentSpecialGrid = cloneGrid(initialSpecialGrid); // 🆕 PHASE 2: Handle special grid
    let stepCount = 0;
    let totalCascadePoints = 0;
    
    while (true) {
      const matches = findMatches(currentGrid);
      if (matches.length === 0) break;

      // 🆕 PHASE 2: Detect and create special cats
      const whiskerStreaks = detect4Match(matches);
      const catnipBombs = detect5InLine(matches);
      const boxCats = detectLTShape(currentGrid, matches);
      
      const allSpecials = [...whiskerStreaks, ...catnipBombs, ...boxCats];
      
      // Add specials to grid
      allSpecials.forEach(special => {
        if (inBounds(special.r, special.c)) {
          currentSpecialGrid[special.r][special.c] = special.type;
          console.log(`✨ Created special: ${special.type} at (${special.r}, ${special.c})`);
        }
      });

      stepCount++;
      setCascadeLevel(stepCount);

      // 🆕 PHASE 1: Enhanced cascade scoring with multiplier
      const basePoints = matches.length <= 3 ? RUSH_SCORING[3] :
                        matches.length <= 4 ? RUSH_SCORING[4] : RUSH_SCORING[5];
      const cascadeMultiplier = 1 + (stepCount * RUSH_SCORING.CASCADE_MULTIPLIER);
      const stepPoints = Math.floor(basePoints * cascadeMultiplier);
      
      totalCascadePoints += stepPoints;

      // Remove matched pieces
      matches.forEach(([r, c]) => {
        currentGrid[r][c] = null;
      });

      // 🆕 PHASE 1: Add cascade time bonus (+0.25s per step, cap +5s total)
      if (stepCount <= (RUSH_SCORING.MAX_TIME_BONUS / RUSH_SCORING.CASCADE_TIME_BONUS)) {
        const timeBonus = RUSH_SCORING.CASCADE_TIME_BONUS;
        setTimeLeft(prev => prev + timeBonus);
        setTotalCascadeTimeBonus(prev => Math.min(prev + timeBonus, RUSH_SCORING.MAX_TIME_BONUS));
      }

      // Visual feedback for cascade
      const fxId = Date.now();
      setFx(prev => [
        ...prev.slice(-5),
        ...matches.slice(0, 10).map((m, i) => ({
          id: fxId + i,
          x: m[1] * cell,
          y: m[0] * cell,
        }))
      ]);

      audio.play?.("cascade_tick", { volume: Math.min(0.6, 0.3 + stepCount * 0.1) });

      // Apply gravity and refill
      currentGrid = applyGravity(currentGrid);
      const refilled = refillGrid(currentGrid, currentSpecialGrid);
      currentGrid = refilled.grid;
      currentSpecialGrid = refilled.specialGrid;

      setGrid([...currentGrid]);
      setSpecialGrid([...currentSpecialGrid]); // 🆕 PHASE 2: Update special grid state
      gridRef.current = currentGrid;
      specialGridRef.current = currentSpecialGrid; // 🆕 PHASE 2: Update special grid ref

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

  }, [cell, isProcessing]);

  // Initialize game
  useEffect(() => {
    const { grid: newGrid, specialGrid: newSpecialGrid } = createGrid();
    setGrid(newGrid);
    setSpecialGrid(newSpecialGrid); // 🆕 PHASE 2: Initialize special grid
    gridRef.current = newGrid;
    specialGridRef.current = newSpecialGrid; // 🆕 PHASE 2: Initialize special grid ref
  }, []);

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

  // Start game function
  const startGame = () => {
    const { grid: newGrid, specialGrid: newSpecialGrid } = createGrid();
    setGrid(newGrid);
    setSpecialGrid(newSpecialGrid); // 🆕 PHASE 2: Reset special grid
    gridRef.current = newGrid;
    specialGridRef.current = newSpecialGrid; // 🆕 PHASE 2: Reset special grid ref
    
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
    setActiveEffects([]); // 🆕 PHASE 3: Reset effects
  };

  // Mouse/touch event handlers
  function haptic(ms = 12) {
    try {
      navigator.vibrate?.(ms);
    } catch {}
  }

  function rc(e) {
    if (!cell) return { r: 0, c: 0 }; // Prevent crash if cell is 0
    const rect = e.currentTarget.getBoundingClientRect();
    const x = (e.clientX || e.touches?.[0]?.clientX || 0) - rect.left;
    const y = (e.clientY || e.touches?.[0]?.clientY || 0) - rect.top;
    return {
      r: Math.floor(y / cell),
      c: Math.floor(x / cell),
    };
  }

  const handlePointerUp = useCallback(async (e) => {
    if (!gameStarted || gameOver || isProcessing) return;
    
    if (activePowerup) {
      e.preventDefault();
      setSelectedTile(null);
      setDrag(null);
      document.releasePointerCapture?.(e.pointerId);
      const p = rc(e);
      if (!inBounds(p.r, p.c)) return;

      // 🆕 PHASE 2: Check for special activation
      const specialType = specialGridRef.current[p.r][p.c];
      if (specialType) {
        const targetCat = gridRef.current[p.r][p.c];
        let result;
        
        if (specialType === SPECIAL_TYPES.WHISKER_STREAK_H) {
          result = await activateWhiskerStreak(p.r, p.c, 'horizontal', targetCat);
        } else if (specialType === SPECIAL_TYPES.WHISKER_STREAK_V) {
          result = await activateWhiskerStreak(p.r, p.c, 'vertical', targetCat);
        } else if (specialType === SPECIAL_TYPES.BOX_CAT) {
          result = await activateBoxCat(p.r, p.c, targetCat);
        } else if (specialType === SPECIAL_TYPES.CATNIP_BOMB) {
          result = await activateCatnipBomb(p.r, p.c, targetCat);
        }
        
        if (result) {
          setGrid(result.grid);
          setSpecialGrid(result.specialGrid);
          haptic(15);
          
          // Trigger cascade after special activation
          setTimeout(() => {
            optimizedResolveCascades(result.grid, result.specialGrid, () => {});
          }, 100);
        }
        return;
      }

      // Regular powerup handling
      const g = cloneGrid(gridRef.current);
      if (activePowerup === 'hammer') {
        const targetCat = g[p.r][p.c];
        if (CAT_SET.includes(targetCat)) {
          for (let r = 0; r < ROWS; r++) {
            for (let c = 0; c < COLS; c++) {
              if (g[r][c] === targetCat) g[r][c] = null;
            }
          }
          audio.play?.('powerup_spawn', { volume: 0.7 });
          optimizedResolveCascades(g, specialGridRef.current, () => {});
          consumePowerup('hammer');
          setActivePowerup(null);
        } else {
          haptic(8);
          audio.play?.("swap_invalid", { volume: 0.5 });
        }
      } else if (activePowerup === 'bomb') {
        for (let r = p.r - 1; r <= p.r + 1; r++) {
          for (let c = p.c - 1; c <= p.c + 1; c++) {
            if (inBounds(r, c)) g[r][c] = null;
          }
        }
        audio.play?.('powerup_spawn', { volume: 0.7 });
        optimizedResolveCascades(g, specialGridRef.current, () => {});
        consumePowerup('bomb');
        setActivePowerup(null);
      }
      return;
    }

    // Regular game logic continues...
    if (!drag) return;

    e.preventDefault();
    setSelectedTile(null);
    setDrag(null);
    document.releasePointerCapture?.(e.pointerId);

    const p = rc(e);
    if (!inBounds(p.r, p.c)) return;

    const dx = (e.clientX || e.touches?.[0]?.clientX || 0) - drag.startX;
    const dy = (e.clientY || e.touches?.[0]?.clientY || 0) - drag.startY;
    const distance = Math.sqrt(dx * dx + dy * dy);
    const threshold = Math.min(30, Math.floor(cell * 0.35));

    if (distance < threshold) {
      audio.play?.("swap_invalid", { volume: 0.5 });
      haptic(8);
      return;
    }

    const horiz = Math.abs(dx) > Math.abs(dy);
    const tr = drag.r + (horiz ? 0 : dy > 0 ? 1 : -1);
    const tc = drag.c + (horiz ? (dx > 0 ? 1 : -1) : 0);

    if (!inBounds(tr, tc)) {
      audio.play?.("swap_invalid", { volume: 0.5 });
      haptic(8);
      return;
    }

    const g = cloneGrid(gridRef.current);
    const sg = cloneGrid(specialGridRef.current); // 🆕 PHASE 2: Clone special grid for swapping
    
    // Swap both regular and special grids
    [g[drag.r][drag.c], g[tr][tc]] = [g[tr][tc], g[drag.r][drag.c]];
    [sg[drag.r][drag.c], sg[tr][tc]] = [sg[tr][tc], sg[drag.r][drag.c]]; // 🆕 PHASE 2: Swap specials too

    const matches = findMatches(g);
    if (matches.length === 0) {
      audio.play?.("swap_invalid", { volume: 0.5 });
      haptic(8);
      return;
    }

    audio.play?.("swap", { volume: 0.6 });
    haptic(12);

    setSwapPair([[drag.r, drag.c], [tr, tc]]);
    setTimeout(() => {
      setGrid(g);
      setSpecialGrid(sg); // 🆕 PHASE 2: Update special grid state
      gridRef.current = g;
      specialGridRef.current = sg; // 🆕 PHASE 2: Update special grid ref
      setSwapPair(null);
      optimizedResolveCascades(g, sg, () => {});
    }, 100);
  }, [gameStarted, gameOver, isProcessing, activePowerup, drag, cell, optimizedResolveCascades, CAT_SET]);

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
  }, [gameStarted, gameOver, isProcessing, cell]);

  // Timer color logic
  const getTimerColor = () => {
    if (timeLeft <= 5) return '#e74c3c';      // Red - critical
    if (timeLeft <= 10) return '#f39c12';     // Orange - warning  
    if (timeLeft <= 30) return '#f1c40f';     // Yellow - caution
    return '#27ae60';                         // Green - safe
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // 🆕 PHASE 3: Render active effects
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

  if (!gameStarted) {
    return (
      <div className="section board-wrap">
        <div className="rush-mode-intro">
          <h2 style={{ textAlign: 'center', color: 'var(--accent)', marginBottom: '20px' }}>
            🎯 Meowchi 6×6 Rush
          </h2>
          <div style={{ textAlign: 'center', marginBottom: '30px' }}>
            <p><strong>🐱 Six Adorable Cats:</strong> Boba, Cheese, Meowchi, Oreo, Panthera, Patches</p>
            <p><strong>⚡ Special Cats:</strong> Create 4+ matches for Whisker-Streak, 5+ for Catnip Bomb!</p>
            <p><strong>🔥 Rush Scoring:</strong> 3=60pts, 4=120pts, 5=200pts + cascade bonuses!</p>
            <p><strong>⏰ 60 Second Timer:</strong> Each cascade adds +0.25s (max +5s total)</p>
          </div>
          
          {/* Enhanced Hype Meter Preview */}
          <HypeMeter currentScore={0} cascadeLevel={0} />
          
          <div style={{ textAlign: 'center', marginTop: '20px' }}>
            <button
              className="primary-button rush-start-btn"
              onClick={startGame}
              style={{
                background: 'linear-gradient(135deg, var(--accent), var(--accent2))',
                color: 'white',
                border: 'none',
                padding: '16px 32px',
                borderRadius: '16px',
                fontSize: '18px',
                fontWeight: '700',
                cursor: 'pointer',
                boxShadow: '0 4px 16px rgba(212, 175, 55, 0.3)',
                transition: 'all 0.2s ease'
              }}
              onMouseEnter={(e) => {
                e.target.style.transform = 'translateY(-2px)';
                e.target.style.boxShadow = '0 6px 20px rgba(212, 175, 55, 0.4)';
              }}
              onMouseLeave={(e) => {
                e.target.style.transform = 'translateY(0)';
                e.target.style.boxShadow = '0 4px 16px rgba(212, 175, 55, 0.3)';
              }}
            >
              🚀 START MEOWCHI RUSH
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="section board-wrap" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', boxSizing: 'border-box' }}>
      {/* Enhanced Rush Mode UI */}
      <div className="rush-board" style={{
        background: 'var(--card)',
        borderRadius: '20px',
        padding: '16px',
        border: '2px solid var(--accent-light)',
        boxShadow: '0 8px 24px rgba(0,0,0,0.1)',
        display: 'flex',
        flexDirection: 'column',
        width: '100%',
        maxWidth: '420px',
        maxHeight: '90vh'
      }}>
        
        {/* 🆕 PHASE 2: Special activation instructions */}
        {Object.values(specialGridRef.current || []).some(row => row?.some(cell => cell)) && (
          <div className="special-instructions">
            <div className="instruction-text">
              ✨ Tap Special Cats to Activate! ⚡ Whisker-Streak clears lines • 💥 Box Cat explodes 3×3 • 🌟 Catnip Bomb clears all matching!
            </div>
          </div>
        )}

        {/* Rush Mode Stats Row */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '12px',
          flexWrap: 'wrap',
          gap: '8px'
        }}>
          
          {/* Enhanced Timer */}
          <div className="rush-timer" style={{
            padding: '12px 20px',
            borderRadius: '16px',
            fontSize: '20px',
            fontWeight: '800',
            color: 'white',
            background: `linear-gradient(135deg, ${getTimerColor()}, ${getTimerColor()}dd)`,
            border: `2px solid ${getTimerColor()}`,
            boxShadow: `0 4px 12px ${getTimerColor()}40`,
            minWidth: '100px',
            textAlign: 'center',
            transition: 'all 0.3s ease'
          }}>
            ⏰ {formatTime(timeLeft)}
          </div>

          {/* Score Display */}
          <div style={{
            fontSize: '24px',
            fontWeight: '800',
            color: 'var(--accent)',
            textAlign: 'center'
          }}>
            🏆 {score.toLocaleString()}
          </div>

          {/* Cascade Bonus Display */}
          {totalCascadeTimeBonus > 0 && (
            <div style={{
              fontSize: '14px',
              fontWeight: '700',
              color: 'var(--accent2)',
              background: 'var(--accent-light)',
              padding: '6px 12px',
              borderRadius: '12px',
              border: '1px solid var(--accent)'
            }}>
              ⏱️ +{totalCascadeTimeBonus.toFixed(2)}s bonus
            </div>
          )}
        </div>

        {/* Enhanced Hype Meter */}
        <HypeMeter currentScore={score} cascadeLevel={cascadeLevel} />

        {/* Game Board */}
        <div
          ref={boardRef}
          className="board rush-board"
          style={{
            position: 'relative',
            margin: '16px auto 0',
            background: 'var(--surface)',
            borderRadius: '16px',
            border: '2px solid var(--border)',
            overflow: 'hidden',
            width: '100%',
            aspectRatio: '1 / 1'
          }}
          onPointerDown={handlePointerDown}
          onPointerUp={handlePointerUp}
          onPointerMove={(e) => e.preventDefault()}
        >
        { cell > 0 && <>
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
              
              // 🆕 PHASE 2: Get special type for this tile
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
                  swapTransform={swapTransform}
                  EMOJI_SIZE={EMOJI_SIZE}
                  specialType={specialType} // 🆕 PHASE 2: Pass special type
                />
              ) : null;
            })
          )}

          {/* 🆕 PHASE 3: Render active effects */}
          {renderActiveEffects()}

          {/* Particle Effects */}
          {fx.map((f) => (
            <div
              key={f.id}
              className="blast-enhanced"
              style={{ left: f.x, top: f.y }}
            >
              💥
            </div>
          ))}

          {/* Combo Celebration */}
          {showComboDisplay && combo > 1 && (
            <div className="combo-celebration" style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translateX(-50%) translateY(-50%)',
              fontSize: '18px',
              fontWeight: '800',
              color: 'var(--accent)',
              background: 'var(--card)',
              padding: '12px 20px',
              borderRadius: '20px',
              border: '2px solid var(--accent)',
              boxShadow: '0 8px 24px rgba(0,0,0,0.2)',
              animation: 'combo-celebration 1.5s ease forwards',
              zIndex: 100
            }}>
              💥 🐱 Sweet Combo x{combo + 1}! 🐱 💥
            </div>
          )}

          {/* Game Over Overlay */}
          {gameOverState === 'calculating' && (
            <div className="calculating-overlay" style={{
              position: 'absolute',
              inset: '0',
              background: 'rgba(0,0,0,0.8)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: '16px',
              zIndex: 200
            }}>
              <div className="calculating-content" style={{ textAlign: 'center', color: 'white' }}>
                <div className="calculating-icon" style={{ fontSize: '48px', marginBottom: '12px' }}>⏰</div>
                <div className="calculating-text" style={{ fontSize: '24px', fontWeight: '800' }}>Time's Up!</div>
                <div style={{ fontSize: '16px', marginTop: '8px', opacity: 0.8 }}>Final Score: {score.toLocaleString()}</div>
              </div>
            </div>
          )}
        </> }
        </div>

        {/* Action Buttons */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: '12px', marginTop: '16px' }}>
          <button
            onClick={startGame}
            style={{
              background: 'var(--accent-light)',
              border: '2px solid var(--accent)',
              color: 'var(--accent)',
              padding: '12px 24px',
              borderRadius: '16px',
              fontSize: '16px',
              fontWeight: '700',
              cursor: 'pointer',
              transition: 'all 0.2s ease'
            }}
            onMouseEnter={(e) => {
              e.target.style.background = 'var(--accent)';
              e.target.style.color = 'white';
            }}
            onMouseLeave={(e) => {
              e.target.style.background = 'var(--accent-light)';
              e.target.style.color = 'var(--accent)';
            }}
          >
            🔄 New Game
          </button>
          
          {gameOverState === 'complete' && (
            <ShareButtons 
              score={score}
              gameMode="rush"
            />
          )}
        </div>
      </div>
    </div>
  );
}
