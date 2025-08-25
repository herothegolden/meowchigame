// src/GameView.jsx
import React, { useEffect, useRef, useState } from "react";
import * as audio from "./audio"; // minimal sound hooks
import ShareButtons from "./ShareButtons.jsx";

const COLS = 6;  // keep as in your working file
const ROWS = 6;
const CELL_MIN = 36;
const CELL_MAX = 88;
const GAME_DURATION = 60;
const EMOJI_SIZE = 0.8;

const CANDY_SET = ["😺", "🥨", "🍓", "🍪", "🍡"];
const randEmoji = () =>
  CANDY_SET[Math.floor(Math.random() * Math.random() * CANDY_SET.length)] || CANDY_SET[(Math.random() * CANDY_SET.length) | 0];

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
    if (paused) return;
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          setTimeout(() => {
            finish();
          }, 100);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [paused]);

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
      return { user_needs_profile: false };
    }

    const gameScore = Math.max(finalScore, 0);
    const currentMaxCombo = maxComboAchievedRef.current;

    try {
      const tg = window.Telegram?.WebApp;
      const gameData = {
        telegram_id: userTelegramId,
        score: gameScore,
        moves_used: Math.max(1, moveCount),
        max_combo: currentMaxCombo,
        game_duration: Math.floor((Date.now() - gameStartTime) / 1000),
      };

      // Add secure initData if available
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
        return { user_needs_profile: false };
      }
      return result;
    } catch (error) {
      console.error("Error submitting score:", error);
      return { user_needs_profile: false };
    }
  }

  // ========= 🔥 VIRAL SHARING HELPERS (added exactly as requested) =========

  // 1. SHARE TO CHATS (Like Hamster Kombat)
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

  // 2. CHALLENGE FRIENDS (Like Notcoin)
  const challengeFriend = (score) => {
    const tg = window.Telegram?.WebApp;
    const challengeUrl = `https://t.me/your_bot_username?start=challenge_${userTelegramId}_${score}`;
    
    if (tg?.openTelegramLink) {
      tg.openTelegramLink(`https://t.me/share/url?url=${encodeURIComponent(challengeUrl)}&text=${encodeURIComponent(`🎯 I scored ${score.toLocaleString()} in Meowchi! Can you beat me?`)}`);
    }
  };

  // 3. AUTO-SHARE ON BIG ACHIEVEMENTS (Like all popular apps)
  const autoShareMilestone = (achievement) => {
    const milestones = {
      first_1000: "🎉 Just hit 1,000 points in Meowchi for the first time!",
      combo_5: "🔥 Got a 5x combo in Meowchi! This game is addictive!",
      daily_streak_7: "🗓️ 7 days straight playing Meowchi! Who's joining me?",
      coins_1000: "💰 Earned 1,000 $Meow coins! This cat game pays!"
    };
    
    const tg = window.Telegram?.WebApp;
    if (tg?.switchInlineQuery && milestones[achievement]) {
      // Auto-suggest sharing (user can still cancel)
      setTimeout(() => {
        if (confirm("🎉 Amazing achievement! Share with friends?")) {
          tg.switchInlineQuery(milestones[achievement], ['users', 'groups']);
        }
      }, 1500);
    }
  };

  // 4. LEADERBOARD SHARING (What Hamster Kombat does)
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
      return;
    }

    // valid swap
    audio.play?.("swap", { volume: 0.6 });
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

  // Cascade resolution with combo tracking + light sounds
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

        if (comboCount > 0) {
          setMaxComboAchieved(prev => {
            const newMax = Math.max(prev, comboCount);
            maxComboAchievedRef.current = newMax;
            return newMax;
          });
          setCombo(comboCount);
          // play capped combo sound 1..4
          const n = Math.min(4, Math.max(1, comboCount + 1));
          audio.play?.(`combo_x${n}`, { volume: 0.6 });
          setTimeout(() => setCombo(0), 1500);
        }

        setTimeout(() => setFx([]), 1200);
        ensureSolvable();
        setAnimating(false);
        done && done();
        return;
      }

      // one earcon per cascade step
      audio.play?.("match_pop", { volume: 0.5 });
      audio.play?.("cascade_tick", { volume: 0.3 });

      // blast fx
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

      // scoring
      const basePoints = 10 * matches.length;
      const comboMultiplier = Math.max(1, comboCount + 1);
      const pointsEarned = basePoints * comboMultiplier;
      setScore((s) => s + pointsEarned);

      // clear
      matches.forEach(([r, c]) => {
        g[r][c] = null;
      });
      setGrid(cloneGrid(g));
      setTimeout(() => setBlast(new Set()), 100);

      // gravity + refill
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
          comboCount++;
          setTimeout(step, 60);
        }, 120);
      }, 100);
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

  // Finish
  async function finish() {
    const finalScore = scoreRef.current;
    const finalMaxCombo = maxComboAchievedRef.current;
    const result = await submitGameScore(finalScore);

    const serverCoins = Math.max(0, Number(result?.game?.coins_earned ?? 0));
    if (serverCoins > 0 && settings?.sound) {
      audio.play?.("coin", { volume: 0.7 });
    }
    if (settings?.sound) {
      if (finalScore > 0) audio.play?.("finish_win", { volume: 0.8 });
      else audio.play?.("finish_lose", { volume: 0.7 });
    }

    onCoins?.(serverCoins);

    // Show share buttons instead of auto-sharing
    const gameResultWithSharing = {
      score: finalScore,
      coins: serverCoins,
      moves_used: moveCount,
      max_combo: finalMaxCombo,
      gameSubmitted: !!result,
      showSharing: true, // Flag to show sharing in game over screen
    };
    onExit(gameResultWithSharing);
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
    setFx([]);
    maxComboAchievedRef.current = 0;
    scoreRef.current = 0;
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

      {/* Combo banner */}
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
                className={`tile ${isSelected ? "sel" : ""} ${isHinted ? "hint" : ""} ${isSwapping ? "swapping" : ""} ${isBlasting ? "blasting" : ""} ${isNewTile ? "drop-in" : ""} ${isGrab ? "grab" : ""} ${isShake ? "shake" : ""}`}
                style={{
                  left: c * cell,
                  top: r * cell,
                  width: cell,
                  height: cell,
                  transform: swapTransform || undefined,
                  zIndex: isBlasting ? 10 : isGrab ? 5 : 1,
                  transition: isSwapping
                    ? "transform 0.16s ease"
                    : delaySeconds
                    ? `top 0.16s ease ${delaySeconds}s`
                    : "top 0.16s ease",
                }}
              >
                <div
                  className={`emoji ${isGrab ? "grab" : ""} ${isShake ? "shake" : ""}`}
                  style={{ fontSize: Math.floor(cell * EMOJI_SIZE) }}
                >
                  {v}
                </div>
                {/* small blast sparkles */}
                {isBlasting && (
                  <div className="blast">
                    ✨
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Controls */}
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

      {/* Share buttons appear after finish via parent */}
      {/* GameView only emits results; sharing UI is in parent Game Over screen */}

      {/* Overlay timer bar */}
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
  // Ensure no initial 3-in-a-row
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
  // Shuffle until at least one move exists
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

  // rows
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

  // cols
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
        // find above
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
  // try swap neighbors
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
    // remove immediate matches
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
  return g; // fallback
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
