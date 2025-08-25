import React from 'react'

export default function Leaderboard({ onBack }) {
  const rows = [
    { rank: 1, name: 'Meowchi', score: 9999 },
    { rank: 2, name: 'Oreo', score: 7777 },
    { rank: 3, name: 'Boba', score: 5555 },
  ]
  return (
    <div className="container">
      <div className="section row">
        <button onClick={onBack} style={{ background: '#222' }}>Back</button>
      </div>
      <div className="section">
        <div className="card">
          <h3 style={{ marginTop: 0 }}>Top Scores</h3>
          <div className="col">
            {rows.map(r => (
              <div key={r.rank} className="row" style={{ justifyContent: 'space-between' }}>
                <div>#{r.rank} — <b>{r.name}</b></div>
                <div>{r.score.toLocaleString()}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
