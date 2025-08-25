import { useEffect } from 'react'

// Centralize pointer capture + prevent webview scroll stealing
export function usePointer(ref) {
  useEffect(() => {
    const el = ref.current
    if (!el) return
    function onDown(e) {
      el.setPointerCapture?.(e.pointerId)
    }
    el.addEventListener('pointerdown', onDown, { passive: true })
    // prevent context menu long-press
    const prevent = e => e.preventDefault()
    el.addEventListener('contextmenu', prevent)
    return () => {
      el.removeEventListener('pointerdown', onDown)
      el.removeEventListener('contextmenu', prevent)
    }
  }, [ref])
}
