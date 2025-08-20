import React from "react";
import "./home.css";

/**
 * UI-only refresh for Home. Routes preserved:
 * - Play Game -> "game"
 * - Leaderboard -> "leaderboard"
 * - Daily Treats -> "daily"
 * - Bottom nav: Profile (-> settings), Shop, Share, Settings
 * No game mechanics touched.
 */
export default function Home({ coins = 0, onNavigate }) {
  return (
    <div className="home-root">
      <div className="home-center">
        <div className="home-card">
          {/* Header */}
          <div className="home-topbar">
            <div className="home-logo">
              <div className="home-logo-icon">
                <img
                  src="https://i.postimg.cc/wjQ5W8Zw/Meowchi-The-Cat-NBG.png"
                  alt="Meowchi-The-Cat"
                  onError={(e) => {
                    e.currentTarget.style.display = "none";
                    e.currentTarget.parentElement.textContent = "🐱";
                  }}
                />
              </div>
              <div className="home-logo-text">Meowchi</div>
            </div>
            <div className="home-currency">$Meow {coins}</div>
          </div>

          {/* Title + ranking pill */}
          <div className="home-title">
            <div className="home-ranking">
              <div className="home-ranking-text">🏆 Rank #1,247 — Novice Hunter</div>
            </div>
            <h1>Welcome to Meowchi!</h1>
            <p>Match cute treats and help the cats</p>
          </div>

          {/* Main menu */}
          <div className="home-menu">
            <button className="home-item primary" onClick={() => onNavigate?.("game")}>
              <div className="home-icon">🎮</div>
              <div className="home-text">Play Game</div>
            </button>

            <button className="home-item" onClick={() => onNavigate?.("leaderboard")}>
              <div className="home-icon">🏆</div>
              <div className="home-text">Leaderboard</div>
            </button>

            <button className="home-item" onClick={() => onNavigate?.("daily")}>
              <div className="home-icon">🎁</div>
              <div className="home-text">Daily Treats</div>
            </button>
          </div>

          {/* How to play */}
          <div className="home-instructions">
            <h3>
              <span className="home-emoji">✨</span> How to Play
            </h3>
            <p>
              Swipe to match 3 or more treats in a row! Match cats <span className="home-emoji">😺</span>,
              pretzels <span className="home-emoji">🥨</span>, strawberries <span className="home-emoji">🍓</span>,
              cookies <span className="home-emoji">🍪</span>, and marshmallows <span className="home-emoji">🍡</span>.
              Create combos for bonus points and help feed all the hungry cats!
            </p>
          </div>

          {/* Bottom nav */}
          <div className="home-bottom-nav">
            <button className="home-nav-item" onClick={() => onNavigate?.("settings")}>
              <div className="home-nav-icon">👤</div>
              <div className="home-nav-text">Profile</div>
            </button>
            <button className="home-nav-item" onClick={() => onNavigate?.("shop")}>
              <div className="home-nav-icon">🛍️</div>
              <div className="home-nav-text">Shop</div>
            </button>
            <button className="home-nav-item" onClick={() => onNavigate?.("invite")}>
              <div className="home-nav-icon">💝</div>
              <div className="home-nav-text">Share</div>
            </button>
            <button className="home-nav-item" onClick={() => onNavigate?.("settings")}>
              <div className="home-nav-icon">⚙️</div>
              <div className="home-nav-text">Settings</div>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
