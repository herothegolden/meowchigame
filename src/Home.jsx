import React, { useState } from "react";
import "./home.css";

export default function Home({ coins = 0, onNavigate, userStats, userProfile, onProfileUpdate }) {
  const [isEditingName, setIsEditingName] = useState(false);
  const [tempName, setTempName] = useState('');
  
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

  // Handle name editing
  const startEditingName = () => {
    if (userProfile?.name_changed) {
      // Show message about paid name changes
      alert('You can only change your name once for free. Future changes will cost coins!');
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
          country_flag: userProfile?.country_flag,
          name_changed: true // Mark as changed
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

  // Check if user can change profile picture
  const canChangeProfilePicture = () => {
    return !userProfile?.picture_changed && 
           (!userProfile?.profile_picture || 
            userProfile?.profile_picture === "https://i.postimg.cc/wjQ5W8Zw/Meowchi-The-Cat-NBG.png");
  };

  // Handle profile picture upload
  const handleProfilePicUpload = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    // Check if user already changed their profile picture
    if (!canChangeProfilePicture()) {
      alert('You can only change your profile picture once for free. Future changes will cost coins!');
      return;
    }

    // Create preview URL
    const reader = new FileReader();
    reader.onload = async (e) => {
      const imageDataUrl = e.target.result;
      
      try {
        const response = await fetch('/api/user/profile', {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            telegram_id: userProfile?.telegram_id,
            profile_picture: imageDataUrl,
            country_flag: userProfile?.country_flag
          })
        });

        if (response.ok) {
          const result = await response.json();
          onProfileUpdate?.(result.user);
        }
      } catch (error) {
        console.error('Failed to update profile picture:', error);
        alert('Failed to update profile picture. Please try again.');
      }
    };
    
    reader.readAsDataURL(file);
  };

  return (
    <div className="home-root">
      <div className="home-center">
        <div className="profile-card">
          <div className="profile-header">
            <div className="profile-avatar-container">
              <div 
                className={`profile-avatar ${!canChangeProfilePicture() ? 'no-upload' : ''}`}
                onClick={() => canChangeProfilePicture() && document.getElementById('profile-pic-upload').click()}
              >
                <img
                  src={userProfile?.profile_picture || "https://i.postimg.cc/wjQ5W8Zw/Meowchi-The-Cat-NBG.png"}
                  alt="Profile"
                  onError={(e) => {
                    e.currentTarget.src = "https://i.postimg.cc/wjQ5W8Zw/Meowchi-The-Cat-NBG.png";
                  }}
                />
                <div className="avatar-upload-overlay">
                  <span>{canChangeProfilePicture() ? '📷' : '🚫'}</span>
                </div>
                {userProfile?.country_flag && (
                  <div className="country-flag-badge">
                    {userProfile.country_flag}
                  </div>
                )}
              </div>
              {canChangeProfilePicture() && (
                <input
                  id="profile-pic-upload"
                  type="file"
                  accept="image/*"
                  onChange={handleProfilePicUpload}
                  style={{ display: 'none' }}
                />
              )}
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
                    <button 
                      className={`edit-name-btn ${userProfile?.name_changed ? 'disabled' : ''}`}
                      onClick={startEditingName}
                      title={userProfile?.name_changed ? 'Name already changed (future changes cost coins)' : 'Click to edit name (free)'}
                    >
                      {userProfile?.name_changed ? '🚫' : '✏️'}
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
