// src/GameOver.jsx
import React, { useState, useEffect } from 'react';
import ShareButtons from './ShareButtons.jsx';

const StatItem = ({ label, value, isNewBest }) => (
  <div className={`result-stat ${isNewBest ? 'new-best' : ''}`}>
    <div className="stat-label">{label}</div>
    <div className="stat-value">
      {value}
      {isNewBest && <span className="new-best-badge">NEW BEST!</span>}
    </div>
  </div>
);

export default function GameOver({ gameResult, userStats, onNavigate }) {
  const [calculating, setCalculating] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setCalculating(false);
      try {
        window.Telegram?.WebApp?.HapticFeedback?.notificationOccurred('success');
      } catch (e) {}
    }, 1800); // Simulate calculation time

    return () => clearTimeout(timer);
  }, []);

  if (calculating) {
    return (
      <div className="calculating-overlay">
        <div className="calculating-content">
          <div className="calculating-icon">...</div>
          <div className="calculating-text">Calculating Results...</div>
        </div>
      </div>
    );
  }

  const isNewBestScore = gameResult.score > (userStats?.best_score || 0);
  const isNewBestCombo = gameResult.max_combo > (userStats?.best_combo || 0);

  return (
    <section className="section game-over-screen">
      <div className="game-over-title">Level Complete!</div>

      <div className="results-grid">
        <StatItem label="Final Score" value={gameResult.score.toLocaleString()} isNewBest={isNewBestScore} />
        <StatItem label="$Meow Earned" value={gameResult.coins.toLocaleString()} />
        <StatItem label="Best Combo" value={`x${gameResult.max_combo + 1}`} isNewBest={isNewBestCombo} />
      </div>

      <ShareButtons
        variant="game-over"
        score={gameResult.score}
        combo={gameResult.max_combo + 1}
        coins={gameResult.coins}
        userTelegramId={userStats?.telegram_id}
      />

      <div className="game-over-actions">
        <button className="btn" onClick={() => onNavigate("home")}>
           Home
        </button>
        <button className="btn primary" onClick={() => onNavigate("game")}>
           Play Again
        </button>
      </div>

      <div className="shop-cta">
        <div className="cta-text">
          <strong>Want to score higher?</strong>
          <p>Get power-ups from the shop to boost your game!</p>
        </div>
        <button className="btn" onClick={() => onNavigate("shop")}>
           Visit Shop
        </button>
      </div>
    </section>
  );
}
