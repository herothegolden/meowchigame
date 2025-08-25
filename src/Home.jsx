import React from 'react'

export default function Home({ onPlay, onLeaderboard, onProfile }) {
  return (
    <div className="container">
      <div className="section">
        <div className="card">
          <h2 style={{ margin: 0 }}>Welcome to Meowchi</h2>
          <p className="muted">Candy‑crush‑style mini app. Tap to play.</p>
          <div className="row">
            <button onClick={onPlay}>Play Game</button>
            <button onClick={onLeaderboard} style={{ background: '#222' }}>Leaderboard</button>
            <button onClick={onProfile} style={{ background: '#5b6b84' }}>Profile</button>
          </div>
        </div>
      </div>
    </div>
  )
}
