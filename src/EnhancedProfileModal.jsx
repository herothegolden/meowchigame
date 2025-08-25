import React from 'react'

export default function EnhancedProfileModal({ onClose }) {
  return (
    <div className="container center">
      <div className="card" style={{ width: 'min(520px, 92vw)' }}>
        <h3 style={{ marginTop: 0 }}>Profile</h3>
        <div className="muted">This is a placeholder. Plug in your current profile modal here.</div>
        <div style={{ height: 16 }} />
        <button onClick={onClose}>Close</button>
      </div>
    </div>
  )
}
