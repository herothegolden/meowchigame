import React from 'react';
import { Routes, Route } from 'react-router-dom';
import BottomNav from './components/BottomNav';

// Import all page components
import HomePage from './pages/HomePage';
import ProfilePage from './pages/ProfilePage';
import GamePage from './pages/GamePage';
import ShopPage from './pages/ShopPage';
import TasksPage from './pages/TasksPage';
import PartnersPage from './pages/PartnersPage';
import LeaderboardsPage from './pages/LeaderboardsPage';

function App() {
  return (
    <div className="h-screen w-screen flex flex-col font-sans overflow-hidden">
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
