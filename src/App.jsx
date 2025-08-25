import React, { useEffect, useState, useMemo } from 'react'
import Splash from './Splash.jsx'
import Home from './Home.jsx'
import GameView from './GameView.jsx'
import Leaderboard from './Leaderboard.jsx'
import EnhancedProfileModal from './EnhancedProfileModal.jsx'
import { tg, initTelegram, addPlatformClass } from './lib/telegram.js'

export default function App() {
  const [view, setView] = useState('splash') // 'splash' | 'home' | 'game' | 'leaderboard' | 'profile'

  // Telegram init once
  useEffect(() => {
    initTelegram()
    addPlatformClass()
    // short splash, then home
    const t = setTimeout(() => setView('home'), 900)
    return () => clearTimeout(t)
  }, [])

  const goHome = () => setView('home')
  const goGame = () => setView('game')
  const goBoard = () => setView('leaderboard')
  const goProfile = () => setView('profile')

  return (
    <div className="container">
      {view === 'splash' && <Splash />}
      {view === 'home' && <Home onPlay={goGame} onLeaderboard={goBoard} onProfile={goProfile} />}
      {view === 'game' && <GameView onExit={goHome} />}
      {view === 'leaderboard' && <Leaderboard onBack={goHome} />}
      {view === 'profile' && <EnhancedProfileModal onClose={goHome} />}
    </div>
  )
}
