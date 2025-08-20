import React from "react";
import "./home.css";

export default function Home({ coins = 0, onNavigate, userStats, userProfile }) {
  // Format numbers with commas
  const formatNumber = (num) => {
    return parseInt(num || 0).toLocaleString();
  };

  // Get display name
  const getDisplayName = () => {
    if (userProfile?.display_name && userProfile?.profile_completed) {
      return userProfile.display_name;
    }
    return userProfile?.display_name || "Meowchi Player";
  };

  // Get subtitle based on profile status
  const getSubtitle = () => {
    if (userProfile?.profile_completed) {
      return "Sweet Match Master";
    }
    return "Complete profile to join rankings";
  };

  return (
    <div className="home-root">
      <div className="home-center">
        <div className="profile-card">
          <div className="profile-header">
            <div className="profile-avatar">
              <img
                src="https://i.postimg.cc/wjQ5W8Zw/Meowchi-The-Cat-NBG.png"
                alt="Meowchi Player"
                onError={(e) => {
                  e.currentTarget.style.display = "none";
                  e.currentTarget.parentElement.textContent = "😺";
                }}
              />
            </div>
            <div className="profile-info">
              <h2 className="profile-name">
                {userProfile?.country_flag && (
                  <span style={{ marginRight: '8px' }}>{userProfile.country_flag}</span>
                )}
                {getDisplayName()}
              </h2>
              <p className="profile-subtitle">{getSubtitle()}</p>
            </div>
          </div>

          <div className="stats-grid">
            <div className="stat-item">
              <div className="stat-value">{formatNumber(coins)}</div>
              <div className="stat-label">$Meow Coins</div>
            </div>
            <div className="stat-item">
              <div className="stat-value">{formatNumber(userStats?.games_played)}</div>
              <div className="stat-label">Games Played</div>
            </div>
            <div className="stat-item">
              <div className="stat-value">{formatNumber(userStats?.best_score)}</div>
              <div className="stat-label">Best Score</div>
            </div>
            <div className="stat-item">
              <div className="stat-value">{formatNumber(userStats?.best_combo)}</div>
              <div className="stat-label">Best Combo</div>
            </div>
          </div>

          <div className="quick-actions">
            <button className="action-btn primary" onClick={() => onNavigate?.("game")}>
              <div class="action-icon">🎮</div>
              <div class="action-text">
                <div class="action-title">Play Game</div>
                <div class="action-desc">Start matching treats</div>
              </div>
            </button>

            <button className="action-btn" onClick={() => onNavigate?.("leaderboard")}>
              <div class="action-icon">🏆</div>
              <div class="action-text">
                <div class="action-title">Rankings</div>
                <div class="action-desc">See top players</div>
              </div>
            </button>
          </div>

          <div className="game-info">
            <h3 className="info-title">✨ About Meowchi</h3>
            <p className="info-description">
              Match 3 or more treats to help feed the hungry cats! 
              Combine cats 😺, pretzels 🥨, strawberries 🍓, cookies 🍪, 
              and marshmallows 🡠to create sweet combos and earn $Meow coins.
              {!userProfile?.profile_completed && (
                <strong style={{ display: 'block', marginTop: '12px', color: 'var(--accent)' }}>
                  💡 Complete your profile to join the global leaderboard and compete with players worldwide!
                </strong>
              )}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
