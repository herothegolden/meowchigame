import React from 'react';
import { Routes, Route } from 'react-router-dom';
import BottomNav from './components/BottomNav';

// We'll create these page components in the next step
const HomePage = () => <div className="p-4">Home Page</div>;
const ProfilePage = () => <div className="p-4">Profile Page</div>;
const GamePage = () => <div className="p-4">Game Page</div>;
const ShopPage = () => <div className="p-4">Shop Page</div>;
const TasksPage = () => <div className="p-4">Tasks Page</div>;
const PartnersPage = () => <div className="p-4">Partners Page</div>;
const LeaderboardsPage = () => <div className="p-4">Leaderboards Page</div>;

function App() {
  return (
    <div className="h-screen w-screen flex flex-col font-sans">
      {/* Main content area */}
      <main className="flex-grow overflow-y-auto pb-20">
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
