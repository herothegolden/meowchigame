// src/GameView.jsx
import React, { useEffect, useRef, useState, useCallback, useMemo } from "react";
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
  isNewTile, isGrab, isShake, swapTransform, delaySeconds, EMOJI_SIZE, specialType
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
        boxShadow: isSpecial ? `0 0 12px ${getSpecialBorder().split(' ')[2]}40` : 'none'
      }}
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
              filter: isSpecial ? 'brightness(1.2) saturate(1.3)' : 'none'
            }}
            draggable={false}
            onError={(e) => {
              console.error('Failed to load cat image:', value);
              e.target.style.display = 'none';
            }}
          />
        ) : (
          value
        )}
        
        {/* Special overlay */}
        {isSpecial && (
          <div className="special-overlay">
            {getSpecialOverlay()}
          </div>
        )}
      </div>
      
      {/* Enhanced blast effect */}
      {isBlasting && (
        <div className="blast-enhanced">
          ✨
        </div>
      )}
    </div>
  );
}, (prevProps, nextProps) => {
  return (
    prevProps.value === nextProps.value &&
    prevProps.isSelected === nextProps.isSelected &&
    prevProps.isHinted === nextProps.isHinted &&
    prevProps.isBlasting === nextProps.isBlasting &&
    prevProps.isSwapping === nextProps.isSwapping &&
    prevProps.isNewTile === nextProps.isNewTile &&
    prevProps.isGrab === nextProps.isGrab &&
    prevProps.isShake === nextProps.isShake &&
    prevProps.swapTransform === nextProps.swapTransform &&
    prevProps.specialType === nextProps.specialType
  );
});

// 2) OPTIMIZE: RAF helper
const useAnimationFrame = () => {
  const requestRef = useRef();
  const previousTimeRef = useRef();

  const animate = useCallback((callback) => {
    const animateFrame = (time) => {
      if (previousTimeRef.current !== undefined) {
        const deltaTime = time - previousTimeRef.current;
        callback(deltaTime);
      }
      previousTimeRef.current = time;
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

// 3) OPTIMIZE: Batched state helper
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

const COLS = 6;  // 6x6 grid for Rush mode
const ROWS = 6;
const CELL_MIN = 36;
const CELL_MAX = 88;
const GAME_DURATION = 60; // 60 seconds for Rush mode
const EMOJI_SIZE = 0.8;

// 🐱 THE SIX MEOWCHI CATS (Phase 1)
const CAT_SET = [
  "https://ik.imagekit.io/59r2kpz8r/Meowchi/Boba.webp?updatedAt=1756284887939",      // Boba
  "https://ik.imagekit.io/59r2kpz8r/Meowchi/Cheese.webp?updatedAt=1756284888031",    // Cheese  
  "https://ik.imagekit.io/59r2kpz8r/Meowchi/Meowchi.webp?updatedAt=1756284887490",   // Meowchi
  "https://ik.imagekit.io/59r2kpz8r/Meowchi/Oreo%20.webp?updatedAt=1756284888252",   // Oreo
  "https://ik.imagekit.io/59r2kpz8r/Meowchi/Panthera.webp?updatedAt=1756284887810",  // Panthera
  "https://ik.imagekit.io/59r2kpz8r/Meowchi/Patches.webp?updatedAt=1756284888179"    // Patches
];

const randCat = () => CAT_SET[Math.floor(Math.random() * CAT_SET.length)];

// NEW: Power-up definitions
const POWERUP_DEFINITIONS = {
  shuffle: { name: "Paw-sitive Swap", icon: "🐾" },
  hammer: { name: "Catnip Cookie", icon: "🍪" },
  bomb: { name: "Marshmallow Bomb", icon: "💣" },
};

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
      case 2: return 'HOT! ✨'; 
      case 1: return 'WARM 💫';
      default: return 'HYPE';
    }
  };
  
  return (
    <div className="hype-meter">
      <div className="hype-label">{getTierLabel()}</div>
      <div className="hype-bar">
        <div 
          className="hype-fill" 
          style={{ 
            width: `${Math.min(progress, 100)}%`,
            backgroundColor: getTierColor(),
            boxShadow: `0 0 10px ${getTierColor()}40`
          }}
        />
      </div>
      <div className="hype-score">{currentScore.toLocaleString()}</div>
      {cascadeLevel > 0 && (
        <div className="cascade-indicator">
          CASCADE x{cascadeLevel + 1}
        </div>
      )}
    </div>
  );
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
  
  // 🆕 PHASE 2: Special cats grid
  const [specialGrid, setSpecialGrid] = useState(() => Array.from({ length: ROWS }, () => Array(COLS).fill(null)));
  const specialGridRef = useRef(specialGrid);
  specialGridRef.current = specialGrid;

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

  // Enhanced Rush Mode Stats
  const [totalTimeBonusEarned, setTotalTimeBonusEarned] = useState(0);
  const [currentCascadeLevel, setCurrentCascadeLevel] = useState(0);
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
  const [draggedIconStyle, setDraggedIconStyle] = useState({});

  // Power-up state
  const [activePowerup, setActivePowerup] = useState(null);
  const powerups = useStore(s => s.powerups);
  const setPowerups = useStore(s => s.setPowerups);

  // 🆕 PHASE 2: Special activation mode
  const [specialActivationMode, setSpecialActivationMode] = useState(false);

  // NEW: Function to consume a power-up
  const consumePowerup = async (powerupKey) => {
    try {
      setPowerups({ ...powerups, [powerupKey]: (powerups[powerupKey] || 1) - 1 });
      
      const response = await fetch('/api/powerups/use', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          telegram_id: userTelegramId,
          item_id: powerupKey,
          initData: window.Telegram?.WebApp?.initData,
        }),
      });
      
      if (!response.ok) {
        setPowerups(powerups);
        console.error("Failed to consume power-up on server");
      }
    } catch (error) {
      setPowerups(powerups);
      console.error("Error consuming powerup:", error);
    }
  };

  // 🆕 PHASE 2: Special Detection Functions

  // Detect 4-in-a-row/column for Whisker-Streak
  const detect4Match = (matches) => {
    const specials = [];
    
    // Group matches by position to find 4+ consecutive
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

  // 🆕 PHASE 2: Special Activation Functions

  const activateWhiskerStreak = (r, c, direction, targetCat) => {
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
    
    audio.play?.('powerup_spawn', { volume: 0.8 });
    console.log(`⚡ Whisker-Streak activated: ${tilesCleared} tiles, ${points} points`);
    
    return { grid: g, specialGrid: sg };
  };

  const activateBoxCat = (r, c, targetCat) => {
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
    
    audio.play?.('powerup_spawn', { volume: 0.9 });
    console.log(`💥 Box Cat activated: ${tilesCleared} tiles, ${points} points`);
    
    return { grid: g, specialGrid: sg };
  };

  const activateCatnipBomb = (r, c, targetCat) => {
    const g = cloneGrid(gridRef.current);
    const sg = cloneGrid(specialGridRef.current);
    let tilesCleared = 0;
    
    // Clear all cats of the target type
    for (let row = 0; row < ROWS; row++) {
      for (let col = 0; col < COLS; col++) {
        if (g[row][col] === targetCat && (row !== r || col !== c)) {
          g[row][col] = null;
          sg[row][col] = null;
          tilesCleared++;
        }
      }
    }
    
    // Also clear the bomb itself
    g[r][c] = null;
    sg[r][c] = null;
    tilesCleared++;
    
    const points = RUSH_SCORING.CATNIP_BOMB_BASE + (tilesCleared * RUSH_SCORING.CATNIP_BOMB_PER_TILE);
    setScore(s => s + points);
    
    audio.play?.('powerup_spawn', { volume: 1.0 });
    console.log(`🌟 Catnip Bomb activated: ${tilesCleared} tiles, ${points} points`);
    
    return { grid: g, specialGrid: sg };
  };

  // Enable closing confirmation during gameplay
  useEffect(() => {
    const tg = window.Telegram?.WebApp;
    if (tg?.enableClosingConfirmation) {
      tg.enableClosingConfirmation();
      console.log('✅ Closing confirmation enabled');
    }

    return () => {
      if (tg?.disableClosingConfirmation) {
        tg.disableClosingConfirmation();
        console.log('✅ Closing confirmation disabled');
      }
    };
  }, []);

  // Keep refs for async
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

  // Enhanced Timer with Cascade Bonuses
  useEffect(() => {
    if (paused || gameOverState) return;
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
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

  // Timer tick sounds
  const lastTickRef = useRef(null);
  useEffect(() => {
    if (!settings?.sound) return;
    if (timeLeftRef.current <= 0) return;
    if (timeLeftRef.current <= 10) {
      if (lastTickRef.current !== timeLeftRef.current) {
        lastTickRef.current = timeLeftRef.current;
        audio.play?.("timer_tick", { volume: 0.35 });
      }
    }
    if (timeLeftRef.current === 5) {
      audio.play?.("timer_hurry", { volume: 0.7 });
    }
  }, [timeLeft, settings?.sound]);

  function haptic(ms = 12) {
    if (!settings?.haptics) return;
    try {
      navigator.vibrate?.(ms);
    } catch {}
  }

  // Rush Mode Cascade Time Bonus
  const addCascadeTimeBonus = (cascadeSteps) => {
    const timeBonus = Math.min(
      cascadeSteps * RUSH_SCORING.CASCADE_TIME_BONUS,
      RUSH_SCORING.MAX_TIME_BONUS - totalTimeBonusEarned
    );
    
    if (timeBonus > 0) {
      setTimeLeft(prev => prev + timeBonus);
      setTotalTimeBonusEarned(prev => prev + timeBonus);
      console.log(`⏰ Time bonus: +${timeBonus}s (Total: ${totalTimeBonusEarned + timeBonus}s)`);
    }
  };

  async function submitGameScore(finalScore) {
    if (!userTelegramId) {
      console.log("No Telegram ID, skipping score submission");
      return { user_needs_profile: false, coins_earned: 0 };
    }

    const gameScore = Math.max(finalScore, 0);
    const currentMaxCombo = maxComboAchievedRef.current;

    const coinsEarned = game.calculateCoins(gameScore, currentMaxCombo);

    try {
      const tg = window.Telegram?.WebApp;
      const gameData = {
        telegram_id: userTelegramId,
        score: gameScore,
        coins_earned: coinsEarned,
        max_combo: currentMaxCombo,
        game_duration: Math.floor((Date.now() - gameStartTime) / 1000),
      };

      if (tg?.initData) {
        gameData.initData = tg.initData;
      }

      const response = await fetch("/api/game/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(gameData),
      });

      const result = await response.json();
      if (!response.ok) {
        console.error("Score submission failed:", result.error);
        return { user_needs_profile: false, coins_earned: coinsEarned };
      }

      return { ...result, coins_earned: coinsEarned };
    } catch (error) {
      console.error("Error submitting score:", error);
      return { user_needs_profile: false, coins_earned: coinsEarned };
    }
  }

  // 🆕 PHASE 2: Enhanced Pointer Interactions with Special Activation
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
      if (timeLeftRef.current <= 0) return;
      el.setPointerCapture?.(e.pointerId);
      const p = rc(e);
      if (!inBounds(p.r, p.c)) return;

      // 🆕 PHASE 2: Check for special activation
      const specialType = specialGridRef.current[p.r][p.c];
      if (specialType) {
        const targetCat = gridRef.current[p.r][p.c];
        let result;
        
        if (specialType === SPECIAL_TYPES.WHISKER_STREAK_H) {
          result = activateWhiskerStreak(p.r, p.c, 'horizontal', targetCat);
        } else if (specialType === SPECIAL_TYPES.WHISKER_STREAK_V) {
          result = activateWhiskerStreak(p.r, p.c, 'vertical', targetCat);
        } else if (specialType === SPECIAL_TYPES.BOX_CAT) {
          result = activateBoxCat(p.r, p.c, targetCat);
        } else if (specialType === SPECIAL_TYPES.CATNIP_BOMB) {
          result = activateCatnipBomb(p.r, p.c, targetCat);
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
      if (activePowerup) {
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
          audio.play?.('powerup_spawn', { volume: 0.8 });
          optimizedResolveCascades(g, specialGridRef.current, () => {});
          consumePowerup('bomb');
          setActivePowerup(null);
        }
        return;
      }

      // Regular drag behavior
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
  }, [cell, paused, settings?.haptics, activePowerup]);

  function trySwap(r1, c1, r2, c2) {
    if (timeLeft <= 0) return;
    if (Math.abs(r1 - r2) + Math.abs(c1 - c2) !== 1) return;

    const g = cloneGrid(gridRef.current);
    const sg = cloneGrid(specialGridRef.current);
    
    // Swap both regular and special grids
    [g[r1][c1], g[r2][c2]] = [g[r2][c2], g[r1][c1]];
    [sg[r1][c1], sg[r2][c2]] = [sg[r2][c2], sg[r1][c1]];
    
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
      audio.play?.("swap_invalid", { volume: 0.5 });
      setSel({ r: r1, c: c1 });
      setTimeout(() => setSel(null), 80);

      window.Telegram?.WebApp?.HapticFeedback?.notificationOccurred('error');
      return;
    }

    window.Telegram?.WebApp?.HapticFeedback?.impactOccurred('light');

    audio.play?.("swap", { volume: 0.6 });
    setMoveCount((prev) => prev + 1);
    setSwapping({ from: { r: r1, c: c1 }, to: { r: r2, c: c2 } });
    setTimeout(() => {
      setGrid(g);
      setSpecialGrid(sg);
      setSwapping(null);
      setMoves((m) => Math.max(0, m - 1));
      optimizedResolveCascades(g, sg, () => {
        if (timeLeftRef.current <= 0) finish();
      });
    }, 200);
  }

  // 🚀 ENHANCED: Phase 2 Cascade Resolution with Special Creation
  function optimizedResolveCascades(startGrid, startSpecialGrid, done) {
    setAnimating(true);
    let g = cloneGrid(startGrid);
    let sg = cloneGrid(startSpecialGrid);
    let cascadeSteps = 0;

    const step = () => {
      const matches = findMatches(g);
      if (matches.length === 0) {
        React.startTransition(() => {
          setGrid(g);
          setSpecialGrid(sg);
          setNewTiles(new Set());
          setFallDelay({});
          setCurrentCascadeLevel(0);

          // Add time bonus based on cascade steps
          if (cascadeSteps > 0) {
            addCascadeTimeBonus(cascadeSteps);
            setMaxComboAchieved(prev => {
              const newMax = Math.max(prev, cascadeSteps);
              maxComboAchievedRef.current = newMax;
              return newMax;
            });
          }

          setTimeout(() => setFx([]), 800);
          ensureSolvable();
          setAnimating(false);
          done && done();
        });
        return;
      }

      audio.play?.("match_pop", { volume: 0.5 });
      cascadeSteps++;
      setCurrentCascadeLevel(cascadeSteps);

      // 🆕 PHASE 2: Create specials from matches before clearing
      const newSpecials = [];
      
      // Detect 5-in-line first (Catnip Bomb)
      const bombSpecials = detect5InLine(matches);
      newSpecials.push(...bombSpecials);
      
      // Then detect L/T shapes (Box Cat)
      if (bombSpecials.length === 0) { // Only if no bomb was created
        const boxSpecials = detectLTShape(g, matches);
        newSpecials.push(...boxSpecials);
      }
      
      // Finally detect 4-match (Whisker-Streak)
      if (newSpecials.length === 0) { // Only if no other special was created
        const streakSpecials = detect4Match(matches);
        newSpecials.push(...streakSpecials);
      }

      const keys = matches.map(([r, c]) => `${r}:${c}`);
      setBlast(new Set(keys));

      const fxId = Date.now();
      setFx((prev) => [
        ...prev.slice(-5),
        ...matches.slice(0, 10).map((m, i) => ({
          id: fxId + i,
          x: m[1] * cell,
          y: m[0] * cell,
        })),
      ]);

      // Rush Mode Scoring System
      const matchSize = matches.length;
      let basePoints = 0;
      
      if (matchSize >= 5) {
        basePoints = RUSH_SCORING[5] * Math.floor(matchSize / 5) + RUSH_SCORING[3] * (matchSize % 5);
      } else if (matchSize >= 4) {
        basePoints = RUSH_SCORING[4] * Math.floor(matchSize / 4) + RUSH_SCORING[3] * (matchSize % 4);
      } else {
        basePoints = RUSH_SCORING[3] * Math.floor(matchSize / 3);
      }

      // Apply cascade multiplier
      const cascadeMultiplier = 1 + (cascadeSteps * RUSH_SCORING.CASCADE_MULTIPLIER);
      const pointsEarned = Math.floor(basePoints * cascadeMultiplier);
      
      setScore((s) => s + pointsEarned);

      // Clear matched tiles
      matches.forEach(([r, c]) => {
        g[r][c] = null;
        // Don't clear specials that were just created
        if (!newSpecials.some(special => special.r === r && special.c === c)) {
          sg[r][c] = null;
        }
      });

      // 🆕 PHASE 2: Place new specials AFTER clearing matches
      newSpecials.forEach(special => {
        // Keep the original cat at the special position
        if (g[special.r][special.c] === null) {
          g[special.r][special.c] = randCat(); // Generate new cat for the special
        }
        sg[special.r][special.c] = special.type;
        console.log(`✨ Special created: ${special.type} at (${special.r}, ${special.c})`);
      });

      setGrid(cloneGrid(g));
      setSpecialGrid(cloneGrid(sg));
      setTimeout(() => setBlast(new Set()), 80);

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
                delayMap[`${newR}-${c}`] = Math.min(0.03, dist * 0.008);
              }
            }
          }
        }

        applyGravity(g, sg); // Apply gravity to both grids
        const empties = new Set();
        for (let r = 0; r < ROWS; r++)
          for (let c = 0; c < COLS; c++) if (g[r][c] === null) empties.add(`${r}-${c}`);
        refill(g);

        React.startTransition(() => {
          setNewTiles(empties);
          setFallDelay(delayMap);
          setGrid(cloneGrid(g));
          setSpecialGrid(cloneGrid(sg));
        });

        setTimeout(() => {
          setNewTiles(new Set());
          setTimeout(step, 40);
        }, 80);
      }, 60);
    };
    step();
  }

  function doHint() {
    if (timeLeft <= 0) return;
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
    if (timeLeft <= 0) return;
    const g = shuffleToSolvable(gridRef.current);
    const sg = Array.from({ length: ROWS }, () => Array(COLS).fill(null)); // Reset specials
    setGrid(g);
    setSpecialGrid(sg);
    haptic(12);
  }

  function ensureSolvable() {
    if (!hasAnyMove(gridRef.current)) {
      const g = shuffleToSolvable(gridRef.current);
      const sg = Array.from({ length: ROWS }, () => Array(COLS).fill(null)); // Reset specials
      setGrid(g);
      setSpecialGrid(sg);
    }
  }

  async function finish() {
    setGameOverState('calculating');
    const finalScore = scoreRef.current;
    const finalMaxCombo = maxComboAchievedRef.current;
    
    const result = await submitGameScore(finalScore);

    const serverCoins = Math.max(0, Number(result?.coins_earned ?? 0));
    if (serverCoins > 0 && settings?.sound) {
      audio.play?.("coin", { volume: 0.7 });
    }
    if (settings?.sound) {
      if (finalScore > 0) audio.play?.("finish_win", { volume: 0.8 });
      else audio.play?.("finish_lose", { volume: 0.7 });
    }

    const gameResultWithSharing = {
      score: finalScore,
      coins: serverCoins,
      moves_used: moveCount,
      max_combo: finalMaxCombo,
      gameSubmitted: !!result,
      showSharing: true,
    };
    
    setTimeout(() => {
      onExit(gameResultWithSharing);
    }, 500);
  }

  function resetGame() {
    if (timeLeft <= 0 && !paused) return;
    setGrid(initSolvableGrid());
    setSpecialGrid(Array.from({ length: ROWS }, () => Array(COLS).fill(null)));
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
    setTotalTimeBonusEarned(0);
    setCurrentCascadeLevel(0);
    setFx([]);
    maxComboAchievedRef.current = 0;
    scoreRef.current = 0;
  }

  const handlePowerupSelect = (key) => {
    if (powerups[key] > 0) {
      if (key === 'shuffle') {
        shuffleBoard();
        consumePowerup('shuffle');
      } else {
        setActivePowerup(activePowerup === key ? null : key);
      }
      haptic(10);
    }
  };
  
  const handlePowerupDragStart = (e, key, icon) => {
    if (powerups[key] > 0 && key !== 'shuffle') {
      setDraggedPowerup({ key, icon });
      const empty = new Image();
      e.dataTransfer.setDragImage(empty, 0, 0);
      haptic(8);
    } else {
      e.preventDefault();
    }
  };

  const handlePowerupDragEnd = () => {
    setDraggedPowerup(null);
    setDraggedIconStyle({});
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    if (draggedPowerup) {
      setDraggedIconStyle({
        position: 'fixed',
        left: e.clientX,
        top: e.clientY,
        transform: 'translate(-50%, -50%)',
        pointerEvents: 'none',
        zIndex: 1000,
      });
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    if (!draggedPowerup || !boardRef.current) return;

    const rect = boardRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const r = Math.floor(y / cell);
    const c = Math.floor(x / cell);

    if (inBounds(r, c)) {
      applyPowerup(draggedPowerup.key, r, c);
    }
    handlePowerupDragEnd();
  };

  const applyPowerup = (key, r, c) => {
    const g = cloneGrid(gridRef.current);
    const sg = cloneGrid(specialGridRef.current);
    let applied = false;

    if (key === 'hammer') {
      const targetCat = g[r][c];
      if (CAT_SET.includes(targetCat)) {
        for (let row = 0; row < ROWS; row++) {
          for (let col = 0; col < COLS; col++) {
            if (g[row][col] === targetCat) {
              g[row][col] = null;
              sg[row][col] = null;
            }
          }
        }
        applied = true;
      }
    } else if (key === 'bomb') {
      for (let row = r - 1; row <= r + 1; row++) {
        for (let col = c - 1; col <= c + 1; col++) {
          if (inBounds(row, col)) {
            g[row][col] = null;
            sg[row][col] = null;
          }
        }
      }
      applied = true;
    }

    if (applied) {
      audio.play?.('powerup_spawn', { volume: 0.8 });
      optimizedResolveCascades(g, sg, () => {});
      consumePowerup(key);
    } else {
      haptic(8);
      audio.play?.("swap_invalid", { volume: 0.5 });
    }
  };

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
        const specialType = specialGrid[r] && specialGrid[r][c];

        return (
          <MemoizedTile
            key={tileKey}
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
            specialType={specialType}
          />
        );
      })
    );
  }, [grid, specialGrid, sel, hint, blast, swapping, newTiles, grabTile, shake, fallDelay, cell]);

  useEffect(() => {
    const cleanup = [];
    return () => {
      cleanup.forEach(clearTimeout);
      cleanup.forEach(clearInterval);
    };
  }, []);

  return (
    <div className="section board-wrap" ref={containerRef} onDragOver={handleDragOver}>
      {draggedPowerup && (
        <div className="powerup-drag-icon" style={draggedIconStyle}>
          {draggedPowerup.icon}
        </div>
      )}
      {gameOverState === 'calculating' && (
        <div className="calculating-overlay">
          <div className="calculating-content">
            <div className="calculating-icon">⏰</div>
            <div className="calculating-text">Time's Up!</div>
          </div>
        </div>
      )}
      
      {/* Rush Mode Timer Display */}
      <div
        className="timer-display rush-timer"
        style={{
          textAlign: "center",
          marginBottom: "12px",
          fontSize: "20px",
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
        ⚡ RUSH MODE ⚡ {formatTime(timeLeft)}
        {totalTimeBonusEarned > 0 && (
          <div style={{ fontSize: "12px", opacity: 0.8 }}>
            +{totalTimeBonusEarned.toFixed(1)}s bonus earned
          </div>
        )}
      </div>

      {/* 🆕 PHASE 2: Special Instructions */}
      <div className="special-instructions">
        <div className="instruction-text">
          ✨ Tap special cats to activate! ⚡ Line Clear • 💥 Area Blast • 🌟 Color Bomb
        </div>
      </div>

      {/* Hype Meter */}
      <HypeMeter currentScore={score} cascadeLevel={currentCascadeLevel} />

      {/* Enhanced Rush Mode Stats */}
      <div className="row rush-stats">
        <div>
          <span className="muted">Score</span> <b>{score.toLocaleString()}</b>
        </div>
        <div>
          <span className="muted">Swaps</span> <b>{moveCount}</b>
        </div>
        <div>
          <span className="muted">Best</span> <b>{maxComboAchieved}x</b>
        </div>
      </div>

      {/* Enhanced Cascade Celebration */}
      {currentCascadeLevel > 0 && (
        <div className="cascade-celebration">
          🌟 CASCADE COMBO x{currentCascadeLevel}! 🌟
        </div>
      )}

      <div
        ref={boardRef}
        className="board rush-board"
        style={{ width: boardW, height: boardH }}
        onDrop={handleDrop}
        onDragOver={(e) => e.preventDefault()}
      >
        <div
          className="gridlines"
          style={{
            backgroundImage:
              "linear-gradient(var(--line) 1px, transparent 1px), linear-gradient(90deg, var(--line) 1px, transparent 1px)",
            backgroundSize: `${cell}px ${cell}px`,
          }}
        />
        {optimizedGridRender}
      </div>

      <div className="powerup-tray">
        {Object.entries(POWERUP_DEFINITIONS).map(([key, def]) => (
          <button
            key={key}
            className={`powerup-btn ${activePowerup === key ? 'active' : ''}`}
            onClick={() => handlePowerupSelect(key)}
            draggable={powerups[key] > 0 && key !== 'shuffle'}
            onDragStart={(e) => handlePowerupDragStart(e, key, def.icon)}
            onDragEnd={handlePowerupDragEnd}
            disabled={!powerups[key] || powerups[key] <= 0}
            title={`${def.name} (Owned: ${powerups[key] || 0})`}
          >
            <div className="powerup-icon">{def.icon}</div>
            <div className="powerup-quantity">{powerups[key] || 0}</div>
          </button>
        ))}
      </div>

      <div className="row" style={{ gap: 8, marginTop: 12 }}>
        <button className="btn" onClick={() => doHint()} disabled={timeLeft <= 0}>
          💡 Hint
        </button>
        <button className="btn" onClick={() => shuffleBoard()} disabled={timeLeft <= 0}>
          🔀 Shuffle
        </button>
        <button className="btn" onClick={() => resetGame()}>
          ♻️ Reset
        </button>
        <button
          className="btn"
          onClick={() => setPaused((p) => !p)}
        >
          {paused ? "▶️ Resume" : "⏸ Pause"}
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

// ====== Helper Functions (Updated for Phase 2) ======

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
  const matches = [];

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

// 🆕 PHASE 2: Enhanced gravity that handles special grid
function applyGravity(g, sg) {
  for (let c = 0; c < COLS; c++) {
    for (let r = ROWS - 1; r >= 0; r--) {
      if (g[r][c] === null) {
        for (let rr = r - 1; rr >= 0; rr--) {
          if (g[rr][c] != null) {
            g[r][c] = g[rr][c];
            g[rr][c] = null;
            // Move specials too
            if (sg) {
              sg[r][c] = sg[rr][c];
              sg[rr][c] = null;
            }
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
      const dirs = [
        [0, 1],
        [1, 0],
      ];
      for (const [dr, dc] of dirs) {
        const r2 = r + dr;
        const c2 = c + dc;
        if (!inBounds(r2, c2)) continue;
        const ng = cloneGrid(g);
        [ng[r][c], ng[r2][c2]] = [ng[r2][c2], ng[r][c]];
        const m = findMatches(ng);
        if (m.length > 0) return true;
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
    for (let r = 0; r < ROWS; r++) {
      ng.push(flat.slice(r * COLS, r * COLS + COLS));
    }
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
      const dirs = [
        [0, 1],
        [1, 0],
      ];
      for (const [dr, dc] of dirs) {
        const r2 = r + dr;
        const c2 = c + dc;
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
