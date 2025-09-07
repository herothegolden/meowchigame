// src/App.jsx - FIXED with global audio persistence
import React, { useEffect } from 'react';
import { Routes, Route, useLocation } from 'react-router-dom';
import BottomNav from './components/BottomNav';
import AudioControls from './components/AudioControls';
import ImagePreloader from './components/ImagePreloader';

// Import all page components
import HomePage from './pages/HomePage';
import ProfilePage from './pages/ProfilePage';
import GamePage from './pages/GamePage';
import ShopPage from './pages/ShopPage';
import TasksPage from './pages/TasksPage';
import PartnersPage from './pages/PartnersPage';
import LeaderboardsPage from './pages/LeaderboardsPage';

function App() {
  const location = useLocation();
  const isGamePage = location.pathname === '/game';

  // Initialize TMA and audio early - ONE TIME ONLY
  useEffect(() => {
    const tg = window.Telegram?.WebApp;
    if (tg) {
      tg.ready();
      tg.expand();
      
      // Enable haptic feedback and closing confirmation
      tg.enableClosingConfirmation();
      
      // Configure TMA settings for better UX
      tg.headerColor = '#181A1B';
      tg.backgroundColor = '#181A1B';
      
      console.log('🎮 TMA initialized for Meowchi Cookie Club');
      console.log('🎮 TMA Version:', tg.version);
      console.log('🎮 Platform:', tg.platform);
    } else {
      console.log('🖥️ Running in browser mode');
    }

    // CRITICAL: Prevent audio reinitialization on navigation
    console.log('🎵 App mounted - global audio will persist across navigation');
    
  }, []); // Empty dependency array - only run once!

  return (
    <div className="h-screen w-screen flex flex-col font-sans overflow-hidden">
      {/* Preload images for better performance */}
      <ImagePreloader />
      
      {/* Global Audio Controls - Always available but only show on non-game pages */}
      {!isGamePage && <AudioControls />}
      
      {/* Main content area */}
      <main className="flex-grow overflow-y-auto pb-20 bg-background text-primary">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="/game" element={<GamePage />} />
          <Route path="/shop" element={<ShopPage />} />
          <Route path="/tasks" element={<TasksPage />} />
          <Route path="/partners" element={<PartnersPage />} />
          <Route path="/leaderboards" element={<LeaderboardsPage />} />
        </Routes>
      </main>

      {/* Bottom Navigation Bar */}
      <BottomNav />
    </div>
  );
}

export default App;
