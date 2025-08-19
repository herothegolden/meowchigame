import React from "react";
import "./home.css";

/**
 * Home screen – UI only. Beige single background, no gradient.
 * Buttons call back into App via onNavigate() to preserve your routing.
 */
export default function Home({ coins = 0, onNavigate }) {
  return (
    <div className="home-root">
      <div className="home-center">
        <div className="home-card">
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

          <div className="home-title">
            <h1>Welcome to Meowchi!</h1>
            <p>Match cute treats and help the cats</p>
          </div>

          <div className="home-menu">
            <button className="home-item primary" onClick={() => onNavigate?.("game")}>
              <div className="home-icon">🎮</div><div className="home-text">Play Game</div>
            </button>

            <button className="home-item" onClick={() => onNavigate?.("shop")}>
              <div className="home-icon">🛍️</div><div className="home-text">Shop</div>
            </button>

            <button className="home-item" onClick={() => onNavigate?.("leaderboard")}>
              <div className="home-icon">🏆</div><div className="home-text">Leaderboard</div>
            </button>

            <button className="home-item" onClick={() => onNavigate?.("daily")}>
              <div className="home-icon">🎁</div><div className="home-text">Daily Treats</div>
            </button>

            <button className="home-item" onClick={() => onNavigate?.("invite")}>
              <div className="home-icon">💝</div><div className="home-text">Share & Invite</div>
            </button>

            <button className="home-item" onClick={() => onNavigate?.("settings")}>
              <div className="home-icon">⚙️</div><div className="home-text">Settings</div>
            </button>
          </div>

          <div className="home-instructions">
            <h3><span className="home-emoji">✨</span> How to Play</h3>
            <p>
              Swipe to match 3 or more treats in a row! Match cats <span className="home-emoji">😺</span>,
              pretzels <span className="home-emoji">🥨</span>, strawberries <span className="home-emoji">🍓</span>,
              cookies <span className="home-emoji">🍪</span>, and marshmallows <span className="home-emoji">🍡</span>.
              Create combos for bonus points and help feed all the hungry cats!
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
