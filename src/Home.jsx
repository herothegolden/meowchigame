import React from "react";
import "./home.css";

export default function Home({ coins = 0, onNavigate }) {
  return (
    <div className="home-root">
      <div className="home-center">
        <div className="profile-card">
          <div className="profile-header">
            <div className="profile-avatar">
              <img
                src="https://i.postimg.cc/wjQ5W8Zw/Meowchi-The-Cat-NBG.png"
                alt="Meowchi-The-Cat"
                onError={(e) => {
                  e.currentTarget.style.display = "none";
                  e.currentTarget.parentElement.textContent = "😺";
                }}
              />
            </div>
            <div className="profile-info">
              <h2 className="profile-name">Meowchi Player</h2>
              <p className="profile-subtitle">Sweet Match Master</p>
            </div>
          </div>

          <div className="stats-grid">
            <div className="stat-item">
              <div className="stat-value">{coins}</div>
              <div className="stat-label">$Meow Coins</div>
            </div>
            <div className="stat-item">
              <div className="stat-value">127</div>
              <div className="stat-label">Games Played</div>
            </div>
            <div className="stat-item">
              <div className="stat-value">2,450</div>
              <div className="stat-label">Best Score</div>
            </div>
            <div className="stat-item">
              <div className="stat-value">15</div>
              <div className="stat-label">Win Streak</div>
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
                <div className="action-title">Leaderboard</div>
                <div className="action-desc">See top players</div>
              </div>
            </button>
          </div>

          <div className="game-info">
            <h3 className="info-title">About Meowchi</h3>
            <p className="info-description">
              Match 3 or more treats to help feed the hungry cats! 
              Combine cats 😺, pretzels 🥨, strawberries 🍓, cookies 🍪, 
              and marshmallows 🡠to create sweet combos and earn $Meow coins.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
