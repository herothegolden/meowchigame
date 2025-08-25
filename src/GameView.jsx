import React, { useRef, useEffect, useState } from 'react'
import { useResizeCell } from './hooks/useResizeCell.js'
import { usePointer } from './hooks/usePointer.js'

const COLS = 6
const ROWS = 6

export default function GameView({ onExit }) {
  const containerRef = useRef(null)
  const [cell, setCell] = useState(56)
  useResizeCell(containerRef, setCell, { rows: ROWS, padding: 24, gaps: 5 })

  // Placeholder grid (emoji only) — keep your existing GameView.jsx to preserve mechanics
  const CANDY_SET = ['😺','🍓','🍪','🍡','🥨']
  const [grid, setGrid] = useState(() => Array.from({ length: ROWS }, () =>
    Array.from({ length: COLS }, () => CANDY_SET[Math.floor(Math.random()*CANDY_SET.length)])
  ))

  // capture pointer (demo only)
  usePointer(containerRef)

  return (
    <div className="container">
      <div className="section row">
        <button onClick={onExit} style={{ background: '#222' }}>Exit</button>
        <div className="muted">Demo board (replace with your full mechanics)</div>
      </div>
      <div className="section center">
        <div ref={containerRef} className="game-surface" style={{
          width: 'min(520px, 94vw)',
          height: 'min(660px, 86vh)',
          background: 'white',
          borderRadius: 16,
          boxShadow: '0 6px 28px rgba(0,0,0,0.08)',
          padding: 12,
          display: 'grid',
          gridTemplateColumns: `repeat(${COLS}, ${cell}px)`,
          gridTemplateRows: `repeat(${ROWS}, ${cell}px)`,
          gap: 5,
          placeContent: 'center'
        }}>
          {grid.flatMap((row, r) =>
            row.map((e, c) => (
              <div key={`${r}-${c}`} style={{
                width: cell, height: cell, display: 'grid', placeItems: 'center',
                fontSize: Math.floor(cell*0.86)+'px', background: '#f4f6ff', borderRadius: 12
              }}>{e}</div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
