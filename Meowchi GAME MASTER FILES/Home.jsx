import React from "react";
import "./home.css";

export default function Home({ 
  coins = 0, 
  onNavigate, 
  userStats, 
  userProfile, 
  onProfileUpdate,
  onOpenProfileModal 
}) {
  // Format numbers with commas
  const formatNumber = (num) => {
    return parseInt(num || 0).toLocaleString();
  };

  // FIXED: Format combo display to match game logic
  const formatCombo = (comboValue) => {
    const combo = parseInt(comboValue || 0);
    // Game shows "x3" for comboCount=2, so homepage should show the display value they saw
    // If combo > 0, show what they saw in game (combo + 1)
    // If combo = 0, they never got combos, so show 0
    return combo === 0 ? '0' : `${combo + 1}`;
  };

  // Get display name
  const getDisplayName = () => {
    if (userProfile?.display_name) {
      return userProfile.display_name;
    }
    return `Stray Cat #${userProfile?.telegram_id?.toString().slice(-5) || '00000'}`;
  };

  return (
    <div className="home-root">
      <div className="home-center">
        <div className="profile-card">
          <div className="profile-header">
            <div className="profile-avatar-container">
              <div className="profile-avatar">
                <img
                  src={userProfile?.profile_picture || "https://i.postimg.cc/wjQ5W8Zw/Meowchi-The-Cat-NBG.png"}
                  alt="Profile"
                  onError={(e) => {
                    e.currentTarget.src = "https://i.postimg.cc/wjQ5W8Zw/Meowchi-The-Cat-NBG.png";
                  }}
                />
                {userProfile?.country_flag && (
                  <div className="country-flag-badge">
                    {userProfile.country_flag}
                  </div>
                )}
              </div>
            </div>
            <div className="profile-info">
              <div className="profile-name-section">
                <h2 className="profile-name">
                  {getDisplayName()}
                  <button 
                    className="edit-name-btn"
                    onClick={onOpenProfileModal}
                    title="Edit profile"
                  >
                    ✏️
                  </button>
                </h2>
              </div>
              <p className="profile-subtitle">
                ID: {userProfile?.telegram_id || 'Loading...'}
              </p>
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
              <div className="stat-value">{formatCombo(userStats?.best_combo)}</div>
              <div className="stat-label">Best Combo</div>
            </div>
          </div>

          <div className="quick-actions">
            <button className="action-btn primary" onClick={() => onNavigate?.("game")}>
              <div className="action-icon">🎮</div>
              <div className="action-text">
                <div className="action-title">Play Game</div>
                <div className="action-desc">Start matching treats</div>
              </div>
            </button>

            <button className="action-btn" onClick={() => onNavigate?.("leaderboard")}>
              <div className="action-icon">🏆</div>
              <div className="action-text">
                <div className="action-title">Rankings</div>
                <div className="action-desc">See top players</div>
              </div>
            </button>
          </div>

          <div className="game-info">
            <h3 className="info-title">✨ About Meowchi</h3>
            <p className="info-description">
              Match 3 or more treats to help feed the hungry cats! 
              Combine cats 😺, pretzels 🥨, strawberries 🍓, cookies 🍪, 
              and marshmallows 🍡 to create sweet combos and earn $Meow coins.
            </p>
            
            {/* DEBUGGING: Show raw stats values */}
            {userStats && process.env.NODE_ENV === 'development' && (
              <details style={{ marginTop: '16px', fontSize: '12px', opacity: 0.7 }}>
                <summary>🔍 Debug Info</summary>
                <div style={{ marginTop: '8px', fontFamily: 'monospace' }}>
                  <div>Raw best_combo: {userStats.best_combo}</div>
                  <div>Formatted combo: {formatCombo(userStats.best_combo)}</div>
                  <div>Raw best_score: {userStats.best_score}</div>
                  <div>Raw games_played: {userStats.games_played}</div>
                </div>
              </details>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
