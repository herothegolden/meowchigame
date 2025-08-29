// src/GameView.jsx
import React, { useEffect, useRef, useState, useCallback, useMemo } from "react";
import * as audio from "./audio"; // minimal sound hooks
import ShareButtons from "./ShareButtons.jsx";
import { game } from "./utils.js";
import { useStore } from "./store.js"; // NEW: Import Zustand store

// 1) OPTIMIZE: Memoized tile component
const MemoizedTile = React.memo(({
  r, c, value, cell, isSelected, isHinted, isSwapping,
  isNewTile, isGrab, isShake, swapTransform, delaySeconds, EMOJI_SIZE
}) => {
  return (
    <div
      key={`tile-${r}-${c}`}
      className={`tile ${isSelected ? "sel" : ""} ${isHinted ? "...op-in" : ""} ${isGrab ? "grab" : ""} ${isShake ? "shake" : ""}`}
      style={{
        left: c * cell,
        top: r * cell,
        width: cell,
        height: cell,
        transform: swapTransform || undefined,
        zIndex: isGrab ? 5 : 1,
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
}, (prevProps, nextProps) => {
  return (
    prevProps.value === nextProps.value &&
    prevProps.isSelected === nextProps.isSelected &&
    prevProps.isHinted === nextProps.isHinted &&
    prevProps.isSwapping === nextProps.isSwapping &&
    prevProps.isNewTile === nextProps.isNewTile &&
    prevProps.isGrab === nextProps.isGrab &&
    prevProps.isShake === nextProps.isShake &&
    prevProps.swapTransform === nextProps.swapTransform
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

const COLS = 6;  // keep as in your working file
const ROWS = 6;
const CELL_MIN = 36;
const CELL_MAX = 88;
const GAME_DURATION = 60;
const EMOJI_SIZE = 0.8;

const CANDY_SET = ["\u{1F63A}", "\u{1F968}", "\u{1F353}", "\u{1F36A}", "\u{1F361}"];
const randEmoji = () =>
  CANDY_SET[Math.floor(Math.random() * Math.random() * CANDY_SET.length)] || CANDY_SET[(Math.random() * CANDY_SET.length) | 0];

// NEW: Power-up definitions
const POWERUP_DEFINITIONS = {
  shuffle: { name: "Paw-sitive Swap", icon: "\u{1F43E}" },
  hammer: { name: "Catnip Cookie", icon: "\u{1F36A}" },
  bomb: { name: "Marshmallow Bomb", icon: "\u{1F4A3}" },
};

// Canvas-based particle system
class ParticleSystem {
  constructor(canvas, ctx) {
    this.canvas = canvas;
    this.ctx = ctx;
    this.particles = [];
  }

  addBlastEffect(x, y, cell) {
    // Create explosion particles
    const particleCount = 8;
    const colors = ['#FFD700', '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4'];
    
    for (let i = 0; i < particleCount; i++) {
      const angle = (Math.PI * 2 * i) / particleCount;
      const velocity = 50 + Math.random() * 100;
      
      this.particles.push({
        x: x + cell / 2,
        y: y + cell / 2,
        vx: Math.cos(angle) * velocity,
        vy: Math.sin(angle) * velocity,
        size: 4 + Math.random() * 6,
        color: colors[Math.floor(Math.random() * colors.length)],
        life: 1.0,
        decay: 0.02 + Math.random() * 0.02
      });
    }

    // Add center flash effect
    this.particles.push({
      x: x + cell / 2,
      y: y + cell / 2,
      vx: 0,
      vy: 0,
      size: cell * 0.8,
      color: '#FFFFFF',
      life: 1.0,
      decay: 0.1,
      isFlash: true
    });
  }

  update(deltaTime) {
    const dt = deltaTime / 1000; // Convert to seconds

    this.particles = this.particles.filter(particle => {
      // Update position
      particle.x += particle.vx * dt;
      particle.y += particle.vy * dt;
      
      // Apply gravity to non-flash particles
      if (!particle.isFlash) {
        particle.vy += 200 * dt; // Gravity
        particle.vx *= 0.98; // Air resistance
      }
      
      // Update life
      particle.life -= particle.decay;
      
      return particle.life > 0;
    });
  }

  render() {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    
    this.particles.forEach(particle => {
      this.ctx.save();
      
      if (particle.isFlash) {
        // Render flash effect
        const alpha = particle.life * 0.5;
        this.ctx.globalAlpha = alpha;
        this.ctx.fillStyle = particle.color;
        this.ctx.beginPath();
        this.ctx.arc(particle.x, particle.y, particle.size * particle.life, 0, Math.PI * 2);
        this.ctx.fill();
      } else {
        // Render particle
        const alpha = particle.life;
        this.ctx.globalAlpha = alpha;
        this.ctx.fillStyle = particle.color;
        this.ctx.beginPath();
        this.ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
        this.ctx.fill();
      }
      
      this.ctx.restore();
    });
  }

  clear() {
    this.particles = [];
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
  }
}

export default function GameView({
  onExit,
  settings,
  userTelegramId,
}) {
  const containerRef = useRef(null);
  const boardRef = useRef(null);
  const canvasRef = useRef(null); // NEW: Canvas for particle effects
  const particleSystemRef = useRef(null);
  const animationFrameRef = useRef(null);
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
  
  const [gameOverState, setGameOverState] = useState(null); // 'calculating' or 'results'
  const [draggedPowerup, setDraggedPowerup] = useState(null);
  const [draggedIconStyle, setDraggedIconStyle] = useState({});

  // NEW: State for explosion emojis
  const [explosions, setExplosions] = useState([]);

  // Power-up state
  const [activePowerup, setActivePowerup] = useState(null);
  const powerups = useStore(s => s.powerups);
  const setPowerups = useStore(s => s.setPowerups);

  // NEW: Initialize canvas particle system
  useEffect(() => {
    if (canvasRef.current) {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      particleSystemRef.current = new ParticleSystem(canvas, ctx);

      // Animation loop for particles
      const animate = (currentTime) => {
        if (particleSystemRef.current) {
          const deltaTime = currentTime - (animationFrameRef.current || currentTime);
          particleSystemRef.current.update(deltaTime);
          particleSystemRef.current.render();
        }
        animationFrameRef.current = requestAnimationFrame(animate);
      };
      
      animationFrameRef.current = requestAnimationFrame(animate);

      return () => {
        if (animationFrameRef.current) {
          cancelAnimationFrame(animationFrameRef.current);
        }
      };
    }
  }, []);

  // Update canvas size when cell size changes
  useEffect(() => {
    if (canvasRef.current && cell > 0) {
      const canvas = canvasRef.current;
      const boardW = cell * COLS;
      const boardH = cell * ROWS;
      canvas.width = boardW;
      canvas.height = boardH;
      canvas.style.width = `${boardW}px`;
      canvas.style.height = `${boardH}px`;
    }
  }, [cell]);

  // NEW: Function to create explosion emoji animation
  const createExplosionEmoji = useCallback((r, c) => {
    const explosionId = `explosion-${r}-${c}-${Date.now()}`;
    const explosion = {
      id: explosionId,
      r,
      c,
      x: c * cell + cell / 2,
      y: r * cell + cell / 2,
    };
    
    setExplosions(prev => [...prev, explosion]);
    
    // Remove explosion after animation completes
    setTimeout(() => {
      setExplosions(prev => prev.filter(e => e.id !== explosionId));
    }, 600); // Match CSS animation duration
    
    return explosion;
  }, [cell]);

  // NEW: Function to consume a power-up
  const consumePowerup = async (powerupKey) => {
    try {
      // Optimistically update the UI
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
        // Revert UI on failure
        setPowerups(powerups);
        console.error("Failed to consume power-up on server");
      }
    } catch (error) {
      // Revert UI on failure
      setPowerups(powerups);
      console.error("Error consuming powerup:", error);
    }
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

  // Timer
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

  // Timer tick sounds (very light)
  const lastTickRef = useRef(null);
  useEffect(() => {
    if (!settings?.sound) return;
    if (timeLeftRef.current <= 0) return;
    if (timeLeftRef.current <= 10) {
      if (lastTickRef.current !== timeLeftRef.current) {
        lastTickRef.current = timeLeftRef.current;
        audio.play?.("timer_tick", { volume: 0.25 });
      }
    }
    if (timeLeftRef.current === 5) {
      audio.play?.("timer_hurry", { volume: 0.5 });
    }
  }, [timeLeft, settings?.sound]);

  function haptic(ms = 12) {
    if (!settings?.haptics) return;
    try {
      navigator.vibrate?.(ms);
    } catch {}
  }

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

  const shareGameResult = (score, combo, coins) => {
    const tg = window.Telegram?.WebApp;
    if (tg?.switchInlineQuery) {
      const messages = [
        `🐱 Just scored ${score.toLocaleString()} in Meowchi! Can you beat my combo of x${combo}?`,
        `😺 Earned ${coins} $Meow coins in Meowchi! My best combo was x${combo}!`,
        `🎮 Playing Meowchi and loving it! Just got ${score.toLocaleString()} points!`,
        `🔥 On fire in Meowchi! ${score.toLocaleString()} points with x${combo} combo!`
      ];
      const randomMessage = messages[Math.floor(Math.random() * messages.length)];
      tg.switchInlineQuery(randomMessage, ['users', 'groups', 'channels']);
    }
  };

  const challengeFriend = (score) => {
    const tg = window.Telegram?.WebApp;
    const challengeUrl = `https://t.me/your_bot_username?start=challenge_${userTelegramId}_${score}`;

    if (tg?.openTelegramLink) {
      tg.openTelegramLink(`https://t.me/share/url?url=${encodeURIComponent(challengeUrl)}&text=${encodeURIComponent(`🎯 I scored ${score.toLocaleString()} in Meowchi! Can you beat me?`)}`);
    }
  };

  const autoShareMilestone = (achievement) => {
    const milestones = {
      first_1000: "🎉 Just hit 1,000 points in Meowchi for the first time!",
      combo_5: "🔥 Got a 5x combo in Meowchi! This game is addictive!",
      daily_streak_7: "🗓️ 7 days straight playing Meowchi! Who's joining me?",
      coins_1000: "💰 Earned 1,000 $Meow coins! This cat game pays!"
    };

    const tg = window.Telegram?.WebApp;
    if (tg?.switchInlineQuery && milestones[achievement]) {
      setTimeout(() => {
        if (confirm("🎉 Amazing achievement! Share with friends?")) {
          tg.switchInlineQuery(milestones[achievement], ['users', 'groups']);
        }
      }, 1500);
    }
  };

  const shareLeaderboardPosition = (rank, score) => {
    const tg = window.Telegram?.WebApp;
    const messages = {
      top1: `👑 I'm #1 on the Meowchi leaderboard with ${score.toLocaleString()} points!`,
      top10: `🏆 Made it to top 10 in Meowchi! Rank #${rank} with ${score.toLocaleString()} points!`,
      top100: `📈 Climbing the Meowchi ranks! Currently #${rank}!`,
      improved: `⬆️ Just improved my Meowchi ranking to #${rank}!`
    };

    let message = messages.improved;
    if (rank === 1) message = messages.top1;
    else if (rank <= 10) message = messages.top10;
    else if (rank <= 100) message = messages.top100;

    if (tg?.switchInlineQuery) {
      tg.switchInlineQuery(message, ['users', 'groups']);
    }
  };

  // Pointer interactions
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

      if (activePowerup) {
        const g = cloneGrid(gridRef.current);
        if (activePowerup === 'hammer') {
          const targetCookie = g[p.r][p.c];
          if (CANDY_SET.includes(targetCookie)) {
            for (let r = 0; r < ROWS; r++) {
              for (let c = 0; c < COLS; c++) {
                if (g[r][c] === targetCookie) g[r][c] = null;
              }
            }
            audio.play?.('powerup_spawn', { volume: 0.7 });
            optimizedResolveCascades(g, () => {});
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
          optimizedResolveCascades(g, () => {});
          consumePowerup('bomb');
          setActivePowerup(null);
        }
        return;
      }

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
      setSwapping(null);
      setMoves((m) => Math.max(0, m - 1));
      optimizedResolveCascades(g, () => {
        if (timeLeftRef.current <= 0) finish();
      });
    }, 200);
  }

  function optimizedResolveCascades(start, done) {
    setAnimating(true);
    let g = cloneGrid(start);
    let comboCount = 0;

    const step = () => {
      const matches = findMatches(g);
      if (matches.length === 0) {
        React.startTransition(() => {
          setGrid(g);
          setNewTiles(new Set());
          setFallDelay({});

          if (comboCount > 0) {
            setMaxComboAchieved(prev => {
              const newMax = Math.max(prev, comboCount);
              maxComboAchievedRef.current = newMax;
              return newMax;
            });
            setCombo(comboCount);
            const n = Math.min(4, Math.max(1, comboCount + 1));
            audio.play?.(`combo_x${n}`, { volume: 0.6 });
            requestAnimationFrame(() => {
              setTimeout(() => setCombo(0), 1500);
            });
          }

          ensureSolvable();
          setAnimating(false);
          done && done();
        });
        return;
      }

      audio.play?.("match_pop", { volume: 0.5 });

      // NEW: Create explosion emoji animations FIRST
      matches.forEach(([r, c]) => {
        createExplosionEmoji(r, c);
        
        // Also create particle effects
        if (particleSystemRef.current) {
          const x = c * cell;
          const y = r * cell;
          particleSystemRef.current.addBlastEffect(x, y, cell);
        }
      });

      const basePoints = 10 * matches.length;
      const comboMultiplier = Math.max(1, comboCount + 1);
      const pointsEarned = basePoints * comboMultiplier;
      setScore((s) => s + pointsEarned);

      // Wait for explosion animation to play before removing items
      setTimeout(() => {
        matches.forEach(([r, c]) => {
          g[r][c] = null;
        });
        setGrid(cloneGrid(g));

        // Wait a bit more before applying gravity for better visual flow
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
                  // Improved staggered falling delays
                  delayMap[`${newR}-${c}`] = Math.min(0.1, dist * 0.02);
                }
              }
            }
          }

          applyGravity(g);
          const empties = new Set();
          for (let r = 0; r < ROWS; r++)
            for (let c = 0; c < COLS; c++) if (g[r][c] === null) empties.add(`${r}-${c}`);
          refill(g);

          React.startTransition(() => {
            setNewTiles(empties);
            setFallDelay(delayMap);
            setGrid(cloneGrid(g));
          });

          // Wait longer for falling animation to complete
          setTimeout(() => {
            setNewTiles(new Set());
            comboCount++;
            setTimeout(step, 60);
          }, 150);
        }, 100);
      }, 300); // Wait for explosion emoji animation
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
    setGrid(g);
    haptic(12);
  }

  function ensureSolvable() {
    if (!hasAnyMove(gridRef.current))
      setGrid(shuffleToSolvable(gridRef.current));
  }

  async function finish() {
    setGameOverState('calculating');
    const finalScore = scoreRef.current;
    const finalMaxCombo = maxComboAchievedRef.current;
    
    // Clear particle effects
    if (particleSystemRef.current) {
      particleSystemRef.current.clear();
    }
    
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
    
    // Wait a bit for the "calculating" animation before exiting
    setTimeout(() => {
      onExit(gameResultWithSharing);
    }, 500);
  }

  function resetGame() {
    if (timeLeft <= 0 && !paused) return;
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
    maxComboAchievedRef.current = 0;
    scoreRef.current = 0;
    setExplosions([]); // Clear explosions
    
    // Clear particle effects
    if (particleSystemRef.current) {
      particleSystemRef.current.clear();
    }
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
    let applied = false;

    if (key === 'hammer') {
      const targetCookie = g[r][c];
      if (CANDY_SET.includes(targetCookie)) {
        for (let row = 0; row < ROWS; row++) {
          for (let col = 0; col < COLS; col++) {
            if (g[row][col] === targetCookie) g[row][col] = null;
          }
        }
        applied = true;
      }
    } else if (key === 'bomb') {
      for (let row = r - 1; row <= r + 1; row++) {
        for (let col = c - 1; c <= c + 1; col++) {
          if (inBounds(row, col)) g[row][col] = null;
        }
      }
      applied = true;
    }

    if (applied) {
      audio.play?.('powerup_spawn', { volume: 0.8 });
      optimizedResolveCascades(g, () => {});
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
          <MemoizedTile
            key={tileKey}
            r={r}
            c={c}
            value={v}
            cell={cell}
            isSelected={isSelected}
            isHinted={isHinted}
            isSwapping={isSwapping}
            isNewTile={isNewTile}
            isGrab={isGrab}
            isShake={isShake}
            swapTransform={swapTransform}
            delaySeconds={delaySeconds}
            EMOJI_SIZE={EMOJI_SIZE}
          />
        );
      })
    );
  }, [grid, sel, hint, swapping, newTiles, grabTile, shake, fallDelay, cell]);

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
            <div className="calculating-icon">⏳</div>
            <div className="calculating-text">Time's Up!</div>
          </div>
        </div>
      )}
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
        <div className="combo-meter-container">
          <div className="combo-meter-bar">
            <div
              className="combo-meter-fill"
              style={{ width: `${Math.min((combo / 5) * 100, 100)}%` }}
            ></div>
          </div>
          <b>{combo > 0 ? `🔥 COMBO x${combo + 1}` : "Combo"}</b>
        </div>
        <div>
          <span className="muted">Moves</span> <b>{moves}</b>
        </div>
      </div>

      {combo > 0 && (
        <div className="combo-celebration">
          💥 🍬 Sweet Combo x{combo + 1}! 🍬 💥
        </div>
      )}

      <div
        ref={boardRef}
        className="board"
        style={{ width: boardW, height: boardH, position: 'relative' }}
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
        
        {/* NEW: Explosion emoji animations */}
        {explosions.map((explosion) => (
          <div
            key={explosion.id}
            className="explosion-emoji"
            style={{
              left: explosion.x,
              top: explosion.y,
            }}
          >
            💥
          </div>
        ))}
        
        {/* Canvas layer for particle effects */}
        <canvas
          ref={canvasRef}
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            pointerEvents: 'none',
            zIndex: 100
          }}
        />
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
        className="progress"
        style={{
          width: `${(timeLeft / GAME_DURATION) * 100}%`,
          height: 6,
          background: getTimerColor(),
          borderRadius: 6,
          marginTop: 10,
        }}
      />
    </div>
  );
}

// ====== Helpers (unchanged) ======

function initSolvableGrid() {
  const g = Array.from({ length: ROWS }, () =>
    Array.from({ length: COLS }, () => randEmoji())
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
  const choices = CANDY_SET.filter((x) => x !== curr);
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
      if (g[r][c] === null) g[r][c] = randEmoji();
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
