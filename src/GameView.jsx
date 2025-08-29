// src/GameView.jsx

import React, { useRef, useEffect } from 'react';
import * as PIXI from 'pixi.js';

const GameView = () => {
  // This ref will hold a reference to the container div for our PixiJS app
  const pixiContainer = useRef(null);

  useEffect(() => {
    // Create a new Pixi Application
    const app = new PIXI.Application({
      width: window.innerWidth, // Use the full window width
      height: window.innerHeight, // Use the full window height
      backgroundColor: 0x1a1a1a, // A dark gray background
      resolution: window.devicePixelRatio || 1, // Adjust for high-resolution screens
      autoDensity: true,
    });

    // Append the PixiJS canvas to our container div
    pixiContainer.current.appendChild(app.view);

    // --- Start of PixiJS specific code ---

    // Create a bunny sprite from a URL
    const bunny = PIXI.Sprite.from('https://pixijs.com/assets/bunny.png');

    // Center the sprite's anchor point
    bunny.anchor.set(0.5);

    // Move the sprite to the center of the screen
    bunny.x = app.screen.width / 2;
    bunny.y = app.screen.height / 2;

    // Add the bunny to the stage to make it visible
    app.stage.addChild(bunny);

    // Add a "ticker" function to animate the sprite on every frame
    app.ticker.add((delta) => {
      // Rotate the bunny
      bunny.rotation += 0.01 * delta;
    });

    // --- End of PixiJS specific code ---

    // Clean up function that runs when the component unmounts
    return () => {
      el.removeEventListener("pointerdown", down);
      el.removeEventListener("pointermove", move);
      el.removeEventListener("pointerup", up);
      el.removeEventListener("pointercancel", up);
    };
  }, [cell, paused, settings?.haptics, activePowerup]);

  function trySwap(r1, c1, r2, c2) {
    if (timeLeft <= 0 || animatingRef.current) return;
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
          setTimeout(() => setCombo(0), 1500);
        }

        setTimeout(() => setFx([]), 800);
        ensureSolvable();
        setAnimating(false);
        done && done();
        return;
      }

      audio.play?.("match_pop", { volume: 0.5 });

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

      const basePoints = 10 * matches.length;
      const comboMultiplier = Math.max(1, comboCount + 1);
      const pointsEarned = basePoints * comboMultiplier;
      setScore((s) => s + pointsEarned);

      // Clear matched tiles
      matches.forEach(([r, c]) => {
        g[r][c] = null;
      });

      setTimeout(() => setBlast(new Set()), 200);

      setTimeout(() => {
        // Apply gravity and refill in one step
        applyGravity(g);
        refill(g);
        
        // Calculate fall delays for animation
        const empties = new Set();
        const delayMap = {};
        for (let c = 0; c < COLS; c++) {
          let delay = 0;
          for (let r = ROWS - 1; r >= 0; r--) {
            const key = `${r}-${c}`;
            if (delay > 0) {
              empties.add(key);
              delayMap[key] = delay * 0.05;
            }
            if (g[r][c] === null) delay++;
          }
        }

        setGrid(cloneGrid(g));
        setNewTiles(empties);
        setFallDelay(delayMap);

        setTimeout(() => {
          setNewTiles(new Set());
          setFallDelay({});
          comboCount++;
          step();
        }, 400);
      }, 250);
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
        for (let col = c - 1; col <= c + 1; col++) {
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
          />
        );
      })
    );
  }, [grid, sel, hint, blast, swapping, newTiles, grabTile, shake, fallDelay, cell]);

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
            <div className="calculating-icon">...</div>
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
