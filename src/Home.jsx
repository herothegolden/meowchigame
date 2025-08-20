import React, { useState } from "react";
import "./home.css";

export default function Home({ coins = 0, onNavigate, userStats, userProfile, onProfileUpdate }) {
  const [isEditingName, setIsEditingName] = useState(false);
  const [tempName, setTempName] = useState('');
  
  // Format numbers with commas
  const formatNumber = (num) => {
    return parseInt(num || 0).toLocaleString();
  };

  // Get display name
  const getDisplayName = () => {
    if (userProfile?.display_name) {
      return userProfile.display_name;
    }
    return `Stray Cat #${userProfile?.telegram_id?.toString().slice(-5) || '00000'}`;
  };

  // Handle name editing
  const startEditingName = () => {
    if (userProfile?.name_changed) {
      // TODO: Show message about paid name changes
      return;
    }
    setTempName(getDisplayName());
    setIsEditingName(true);
  };

  const saveName = async () => {
    if (!tempName.trim() || tempName === getDisplayName()) {
      setIsEditingName(false);
      return;
    }

    try {
      const response = await fetch('/api/user/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          telegram_id: userProfile?.telegram_id,
          display_name: tempName.trim(),
          country_flag: userProfile?.country_flag
        })
      });

      if (response.ok) {
        const result = await response.json();
        onProfileUpdate?.(result.user);
      }
    } catch (error) {
      console.error('Failed to update name:', error);
    }
    
    setIsEditingName(false);
  };

  const cancelEdit = () => {
    setIsEditingName(false);
    setTempName('');
  };

  // Handle profile picture upload
  const handleProfilePicUpload = (event) => {
    const file = event.target.files[0];
    if (file) {
      // TODO: Implement image upload logic
      console.log('Profile picture upload:', file);
    }
  };

  return (
    <div className="home-root">
      <div className="home-center">
        <div className="profile-card">
          <div className="profile-header">
            <div className="profile-avatar-container">
              <div className="profile-avatar" onClick={() => document.getElementById('profile-pic-upload').click()}>
                <img
                  src={userProfile?.profile_picture || "https://i.postimg.cc/wjQ5W8Zw/Meowchi-The-Cat-NBG.png"}
                  alt="Profile"
                  onError={(e) => {
                    e.currentTarget.src = "https://i.postimg.cc/wjQ5W8Zw/Meowchi-The-Cat-NBG.png";
                  }}
                />
                <div className="avatar-upload-overlay">
                  <span>📷</span>
                </div>
                {userProfile?.country_flag && (
                  <div className="country-flag-badge">
                    {userProfile.country_flag}
                  </div>
                )}
              </div>
              <input
                id="profile-pic-upload"
                type="file"
                accept="image/*"
                onChange={handleProfilePicUpload}
                style={{ display: 'none' }}
              />
            </div>
            <div className="profile-info">
              <div className="profile-name-section">
                {isEditingName ? (
                  <div className="name-edit-container">
                    <input
                      type="text"
                      value={tempName}
                      onChange={(e) => setTempName(e.target.value)}
                      className="name-edit-input"
                      onBlur={saveName}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') saveName();
                        if (e.key === 'Escape') cancelEdit();
                      }}
                      autoFocus
                      maxLength={50}
                    />
                  </div>
                ) : (
                  <h2 className="profile-name" onClick={startEditingName}>
                    {getDisplayName()}
                    <button className="edit-name-btn" onClick={startEditingName}>
                      ✏️
                    </button>
                  </h2>
                )}
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
              <div className="stat-value">{formatNumber(userStats?.best_combo)}</div>
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
              and cupcakes 🧁 to create sweet combos and earn $Meow coins.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
