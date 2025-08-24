// src/GameView.jsx
import React, { useEffect, useRef, useState } from "react";

const COLS = 6;  // CHANGED: 8 → 6
const ROWS = 6;  // CHANGED: 8 → 6
const CELL_MIN = 36;
const CELL_MAX = 88;
const GAME_DURATION = 60;
const EMOJI_SIZE = 0.8;  // FIXED: Further reduced to fit properly in cells

const CANDY_SET = ["😺", "🥨", "🍓", "🍪", "🍡"];
const randEmoji = () =>
  CANDY_SET[Math.floor(Math.random() * CANDY_SET.length)];

// ---- Coin economy helpers ----
const DEFAULT_COIN_CONF = { RATE: 8, MIN: 10, CAP: 600, MULT: 1 };
function coinsFor(S, conf = DEFAULT_COIN_CONF) {
  const rate = Number(conf.RATE ?? DEFAULT_COIN_CONF.RATE);
  const min = Number(conf.MIN ?? DEFAULT_COIN_CONF.MIN);
  const cap = (conf.CAP ?? DEFAULT_COIN_CONF.CAP);
  const mult = Number(conf.MULT ?? DEFAULT_COIN_CONF.MULT);
  const base = Math.floor((mult * (S || 0)) / Math.max(1, rate));
  const withMin = Math.max(min, base);
  return cap ? Math.min(withMin, Number(cap)) : withMin;
}

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

  // FIXED: Keep refs for proper state access during async operations
  const movesRef = useRef(moves);
  movesRef.current = moves;
  const timeLeftRef = useRef(timeLeft);
  timeLeftRef.current = timeLeft;
  const scoreRef = useRef(score);
  scoreRef.current = score;
  const maxComboAchievedRef = useRef(maxComboAchieved);
  maxComboAchievedRef.current = maxComboAchieved;

  // Coin config fetched from server for consistent Pending coins
  const [coinConf, setCoinConf] = useState(DEFAULT_COIN_CONF);
  useEffect(() => {
    let mounted = true;
    fetch("/api/config")
      .then(r => r.ok ? r.json() : null)
      .then(data => { if (mounted && data && data.coins) setCoinConf(data.coins); })
      .catch(()=>{});
    return () => { mounted = false; };
  }, []);

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
      if (ro) ro.disconnect();
      window.removeEventListener("resize", compute);
    };
  }, []);

  // ... (rest of logic unchanged: grid init, matching, gravity, etc.)
  // Only coins logic is changed: we removed drip increments.

  async function submitGameScore(finalScore) {
    if (!userTelegramId) {
      console.log("No Telegram ID, skipping score submission");
      return { user_needs_profile: false };
    }

    const gameScore = Math.max(finalScore, 0);
    const currentMaxCombo = maxComboAchievedRef.current;

    try {
      const gameData = {
        telegram_id: userTelegramId,
        score: gameScore,
        // coins_earned is computed server-side now
        moves_used: Math.max(1, moveCount),
        max_combo: currentMaxCombo, // FIXED: Use ref value
        game_duration: Math.floor((Date.now() - gameStartTime) / 1000),
      };

      console.log("🎯 Submitting game score:", gameData);

      const response = await fetch("/api/game/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(gameData),
      });

      const result = await response.json();
      if (!response.ok) {
        console.error("❌ Failed to save game:", result?.error || response.status);
      } else {
        console.log("✅ Game saved:", result);
      }
      return result;
    } catch (error) {
      console.error("Game submission error:", error);
      return { error: "network" };
    }
  }

  // ... match detection, gravity, refill, input handlers remain the same ...
  // Inside your cascade resolution where we previously dripped coins, the drip call was removed.

  async function finish() {
    const finalScore = scoreRef.current;
    const finalMaxCombo = maxComboAchievedRef.current;
    console.log('🎮 Game finishing with score:', finalScore, 'Max combo achieved:', finalMaxCombo);

    // Compute local preview coins using current config (server remains authoritative)
    const previewCoins = coinsFor(finalScore, coinConf);

    // Submit score to backend
    const result = await submitGameScore(finalScore);

    // Send results to parent
    const credited = result?.game?.coins_earned ?? previewCoins;
    const gameResult = {
      score: finalScore,
      coins: credited,
      moves_used: Math.max(1, moveCount),
      max_combo: finalMaxCombo,
      duration: Math.floor((Date.now() - gameStartTime) / 1000),
    };
    console.log('🏁 Game complete! Final result:', gameResult);
    onExit(gameResult);
  }

  function resetGame() {
    if (timeLeft <= 0 && !paused) return; // Only prevent reset after game over
    console.log('🔄 Resetting game...');
    setGrid(initSolvableGrid());
    setScore(0);
    setMoves(20);
    setCombo(0);
    setFx([]);
    setBlast(new Set());
    setNewTiles(new Set());
    setFallDelay({});
    setTimeLeft(GAME_DURATION);
    setGameStartTime(Date.now());
    setMoveCount(0);
    setMaxComboAchieved(0);
  }

  // ... UI (board rendering etc.) ...

  return (
    <div className="game-shell" ref={containerRef}>
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
        <div>
          <span className="muted">$Meow (pending)</span> <b>{coinsFor(score, coinConf)}</b>
        </div>
      </div>

      {/* MOVED: Combo explosion above the stats */}
      {combo > 0 && (
        <div className="combo-celebration">
          💥 🍬 Sweet Combo x{combo + 1}! 🍬 💥
        </div>
      )}

      {/* ...rest of your component unchanged... */}
    </div>
  );
}

// --- helpers below (initSolvableGrid, findMatches, applyGravity, etc.) ---
// (kept exactly as in your code; only coin drip lines removed)
