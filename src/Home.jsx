import React, { useState, useEffect, useRef } from "react";
import "./home.css";
import StreakTracker from "./StreakTracker.jsx";

const CountUp = ({ end }) => {
  const [count, setCount] = useState(0);
  const endValue = parseInt(end || 0);
  const ref = useRef(0);

  useEffect(() => {
    const start = ref.current;
    const duration = 1200;
    let startTime = null;

    const animate = (timestamp) => {
      if (!startTime) startTime = timestamp;
      const progress = Math.min((timestamp - startTime) / duration, 1);
      const current = Math.floor(progress * (endValue - start) + start);
      setCount(current);

      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        ref.current = endValue;
      }
    };
    
    requestAnimationFrame(animate);
    
    return () => {
      ref.current = endValue;
    };
  }, [endValue]);

  return <>{count.toLocaleString()}</>;
};

export default function Home({ 
  coins = 0, 
  onNavigate, 
  userStats, 
  userProfile, 
  onOpenProfileModal,
  streakData
}) {
  const formatCombo = (comboValue) => {
    const combo = parseInt(comboValue || 0);
    return combo === 0 ? '0' : `x${combo + 1}`;
  };

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
                  src={`${userProfile?.profile_picture || "https://ik.imagekit.io/59r2kpz8r/Meowchi/Meowchi.webp"}?tr=w-160,h-160,f-auto`}
                  alt="Profile"
                  onError={(e) => {
                    e.currentTarget.src = "https://ik.imagekit.io/59r2kpz8r/Meowchi/Meowchi.webp?tr=w-160,h-160,f-auto";
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
                    onClick={() => {
                      try { window.Telegram?.WebApp?.HapticFeedback?.selectionChanged(); } catch (e) {}
                      onOpenProfileModal();
                    }}
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
              <div className="stat-value"><CountUp end={coins} /></div>
              <div className="stat-label">$Meow Coins</div>
            </div>
            <div className="stat-item">
              <div className="stat-value"><CountUp end={userStats?.games_played} /></div>
              <div className="stat-label">Games Played</div>
            </div>
            <div className="stat-item">
              <div className="stat-value"><CountUp end={userStats?.best_score} /></div>
              <div className="stat-label">Best Score</div>
            </div>
            <div className="stat-item">
              <div className="stat-value">🔥 {streakData?.streak || 0}</div>
              <div className="stat-label">Day Streak</div>
            </div>
            <div className="stat-item">
              <div className="stat-value">{formatCombo(userStats?.best_combo)}</div>
              <div className="stat-label">Best Combo</div>
            </div>
          </div>
          
          <StreakTracker streakData={streakData} />

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
        </div>
      </div>
    </div>
  );
}
