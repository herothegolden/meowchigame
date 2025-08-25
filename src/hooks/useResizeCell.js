import { useEffect } from 'react'

// Compute a fixed-size cell given a container height so ROWS fit perfectly
export function useResizeCell(containerRef, setCell, { rows = 6, padding = 24, gaps = 5 } = {}) {
  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const ro = new ResizeObserver(() => {
      const h = el.clientHeight
      const cell = Math.max(36, Math.min(88, Math.floor((h - padding - gaps*rows) / rows)))
      setCell(cell)
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [containerRef, setCell, rows, padding, gaps])
}
