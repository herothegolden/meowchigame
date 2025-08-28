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

export default function GameOver({ gameResult, userStats, userProfile, onNavigate, onOpenProfileModal }) {
  const [calculating, setCalculating] = useState(true);
  const [showOnboarding, setShowOnboarding] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setCalculating(false);
      
      // Check if user needs profile setup after first game
      const isFirstTime = !userStats?.games_played || userStats.games_played <= 1;
      const needsProfile = !userProfile?.profile_completed;
      
      if (isFirstTime && needsProfile) {
        setShowOnboarding(true);
      }
      
      try {
        window.Telegram?.WebApp?.HapticFeedback?.notificationOccurred('success');
      } catch (e) {}
    }, 1800); // Simulate calculation time

    return () => clearTimeout(timer);
  }, [userStats, userProfile]);

  // NEW: Manage Telegram Main Button
  useEffect(() => {
    const tg = window.Telegram?.WebApp;
    if (!tg?.MainButton) return;

    if (!calculating && !showOnboarding) {
      // Show "Play Again" main button
      tg.MainButton.setText("🎮 Play Again");
      tg.MainButton.show();
      tg.MainButton.onClick(() => {
        onNavigate("game");
      });

      // Style the button
      tg.MainButton.setParams({
        color: "#d4af37",
        text_color: "#ffffff"
      });
    } else {
      tg.MainButton.hide();
    }

    return () => {
      if (tg.MainButton.isVisible) {
        tg.MainButton.hide();
      }
    };
  }, [calculating, showOnboarding, onNavigate]);

  const handleOnboardingComplete = () => {
    setShowOnboarding(false);
    onOpenProfileModal();
  };

  const handleOnboardingSkip = () => {
    setShowOnboarding(false);
  };

  if (calculating) {
    return (
      <div className="calculating-overlay">
        <div className="calculating-content">
          <div className="calculating-icon">⏳</div>
          <div className="calculating-text">Calculating Results...</div>
        </div>
      </div>
    );
  }

  if (showOnboarding) {
    return (
      <section className="section game-over-screen">
        <div className="onboarding-container">
          <div className="onboarding-icon">🎉</div>
          <h2 className="onboarding-title">Great Game!</h2>
          <p className="onboarding-subtitle">You scored {gameResult.score.toLocaleString()} points</p>
          
          <div className="onboarding-prompt">
            <div className="prompt-icon">🏆</div>
            <h3 className="prompt-title">Ready for the Leaderboard?</h3>
            <p className="prompt-text">
              Set your name and country to appear on the rankings and compete with other players!
            </p>
          </div>

          <div className="onboarding-actions">
            <button 
              className="btn primary onboarding-btn"
              onClick={handleOnboardingComplete}
            >
              🐱 Set Up Profile
            </button>
            <button 
              className="btn onboarding-btn-secondary"
              onClick={handleOnboardingSkip}
            >
              Maybe Later
            </button>
          </div>

          <div className="onboarding-benefits">
            <div className="benefit-item">
              <span className="benefit-icon">📊</span>
              <span className="benefit-text">Track your progress</span>
            </div>
            <div className="benefit-item">
              <span className="benefit-icon">🌍</span>
              <span className="benefit-text">Compete globally</span>
            </div>
            <div className="benefit-item">
              <span className="benefit-icon">👥</span>
              <span className="benefit-text">Join squads</span>
            </div>
          </div>
        </div>

        <style jsx>{`
          .onboarding-container {
            text-align: center;
            max-width: 400px;
            margin: 0 auto;
            padding: 20px;
          }

          .onboarding-icon {
            font-size: 64px;
            margin-bottom: 16px;
            animation: bounce 2s infinite;
          }

          @keyframes bounce {
            0%, 20%, 50%, 80%, 100% { transform: translateY(0); }
            40% { transform: translateY(-10px); }
            60% { transform: translateY(-5px); }
          }

          .onboarding-title {
            font-size: 28px;
            font-weight: 800;
            color: var(--text);
            margin: 0 0 8px 0;
          }

          .onboarding-subtitle {
            font-size: 16px;
            color: var(--muted);
            margin: 0 0 32px 0;
          }

          .onboarding-prompt {
            background: var(--surface);
            border: 1px solid var(--border);
            border-radius: 16px;
            padding: 24px;
            margin-bottom: 24px;
          }

          .prompt-icon {
            font-size: 40px;
            margin-bottom: 12px;
          }

          .prompt-title {
            font-size: 20px;
            font-weight: 700;
            color: var(--text);
            margin: 0 0 12px 0;
          }

          .prompt-text {
            font-size: 14px;
            color: var(--muted);
            line-height: 1.5;
            margin: 0;
          }

          .onboarding-actions {
            display: flex;
            flex-direction: column;
            gap: 12px;
            margin-bottom: 32px;
          }

          .onboarding-btn {
            width: 100%;
            padding: 16px;
            font-size: 16px;
            font-weight: 700;
          }

          .onboarding-btn-secondary {
            background: transparent;
            color: var(--muted);
            border: 1px solid var(--border);
            padding: 12px;
            font-size: 14px;
          }

          .onboarding-btn-secondary:hover {
            background: var(--surface);
            color: var(--text);
          }

          .onboarding-benefits {
            display: flex;
            justify-content: space-around;
            gap: 16px;
          }

          .benefit-item {
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 8px;
            flex: 1;
          }

          .benefit-icon {
            font-size: 24px;
          }

          .benefit-text {
            font-size: 12px;
            color: var(--muted);
            font-weight: 600;
            text-align: center;
          }

          @media (max-width: 480px) {
            .onboarding-benefits {
              flex-direction: column;
              gap: 12px;
            }
            
            .benefit-item {
              flex-direction: row;
              justify-content: center;
            }
          }
        `}</style>
      </section>
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
          🏠 Home
        </button>
        {/* Note: Play Again is now handled by Telegram Main Button */}
        <div className="main-button-hint">
          <span className="hint-icon">👆</span>
          <span className="hint-text">Tap the button below to play again!</span>
        </div>
      </div>

      <div className="shop-cta">
        <div className="cta-text">
          <strong>Want to score higher?</strong>
          <p>Get power-ups from the shop to boost your game!</p>
        </div>
        <button className="btn" onClick={() => onNavigate("shop")}>
          🛒 Visit Shop
        </button>
      </div>

      <style jsx>{`
        .main-button-hint {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 4px;
          padding: 12px;
          background: var(--accent-light);
          border-radius: 12px;
          border: 1px solid rgba(212, 175, 55, 0.3);
          animation: pulse-hint 2s infinite;
        }

        .hint-icon {
          font-size: 24px;
          animation: bounce-hint 1s infinite;
        }

        .hint-text {
          font-size: 12px;
          color: var(--accent);
          font-weight: 600;
          text-align: center;
        }

        @keyframes pulse-hint {
          0%, 100% { opacity: 0.8; transform: scale(1); }
          50% { opacity: 1; transform: scale(1.02); }
        }

        @keyframes bounce-hint {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-3px); }
        }
      `}</style>
    </section>
  );
}
