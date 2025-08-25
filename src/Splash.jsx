import React from 'react'

export default function Splash() {
  return (
    <div className="container center" style={{ background: '#eaf2ff' }}>
      <div className="card" style={{ width: 'min(480px, 86vw)' }}>
        <div style={{ fontSize: 28, fontWeight: 800, letterSpacing: 1 }}>MEOWCHI</div>
        <div style={{ height: 8 }} />
        <div className="muted">loading sweetness…</div>
        <div style={{ height: 14 }} />
        <div style={{ width: '10ch', height: 8, background: '#cfd8ff', borderRadius: 9999, overflow: 'hidden' }}>
          <div style={{ width: '65%', height: '100%', background: '#1f55ff' }} />
        </div>
      </div>
    </div>
  )
}
