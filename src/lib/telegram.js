// Telegram WebApp wrapper + platform helpers
export const tg = (typeof window !== 'undefined') ? (window.Telegram?.WebApp || null) : null

export function initTelegram() {
  try {
    if (tg) {
      tg.ready()
      if (tg.expand) tg.expand()
      // optional: set background color from theme
      const bg = tg.themeParams?.bg_color
      if (bg) document.body.style.backgroundColor = '#' + bg
    }
  } catch (e) {
    console.warn('Telegram init failed:', e)
  }
}

export function addPlatformClass() {
  const ua = (typeof navigator !== 'undefined') ? navigator.userAgent.toLowerCase() : ''
  const isIOS = /iphone|ipad|ipod/.test(ua)
  const isAndroid = /android/.test(ua)
  document.documentElement.classList.toggle('ios', isIOS)
  document.documentElement.classList.toggle('android', isAndroid)
}
