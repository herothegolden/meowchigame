// Path: frontend/src/App.jsx
// v21 — No black "Loading" screen on Profile (and anywhere else):
// - Eager-import ProfilePage so it never hits a route fallback
// - Use Suspense fallback={null} so the router never shows a blocking/loading UI
// - Init runs in background; WebApp.ready() on next frame for TMA

import React, { useEffect, lazy, Suspense } from 'react';
import { Routes, Route } from 'react-router-dom';
import BottomNav from './components/BottomNav';
import { initializeUser } from './utils/api';

// ✅ Eager: Profile never shows a router fallback
import ProfilePage from './pages/ProfilePage';

// ✅ Others remain lazy to keep entry small
const HomePage = lazy(() => import('./pages/HomePage'));
const GamePage = lazy(() => import('./pages/GamePage'));
const ShopPage = lazy(() => import('./pages/ShopPage'));
const TasksPage = lazy(() => import('./pages/TasksPage'));
const PartnersPage = lazy(() => import('./pages/PartnersPage'));
const LeaderboardsPage = lazy(() => import('./pages/LeaderboardsPage'));
const DevToolsPage = lazy(() => import('./pages/DevToolsPage'));
const OrderPage = lazy(() => import('./pages/OrderPage'));

function App() {
  // Background initialization (non-blocking)
  useEffect(() => {
    (async () => {
      try { await initializeUser(); } catch {}
    })();
  }, []);

  // TMA: signal readiness on next frame
  useEffect(() => {
    const raf = requestAnimationFrame(() => {
      try { window.Telegram?.WebApp?.ready?.(); } catch {}
    });
    return () => cancelAnimationFrame(raf);
  }, []);

  return (
    <div className="h-screen w-screen flex flex-col font-sans overflow-hidden bg-background text-primary">
      <main className="flex-grow overflow-y-auto pb-20">
        {/* 👇 No visual fallback anywhere */}
        <Suspense fallback={null}>
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/profile" element={<ProfilePage />} /> {/* eager, instant */}
            <Route path="/game" element={<GamePage />} />
            <Route path="/shop" element={<ShopPage />} />
            <Route path="/tasks" element={<TasksPage />} />
            <Route path="/partners" element={<PartnersPage />} />
            <Route path="/leaderboards" element={<LeaderboardsPage />} />
            <Route path="/dev-tools" element={<DevToolsPage />} />
            <Route path="/order" element={<OrderPage />} />
          </Routes>
        </Suspense>
      </main>

      <BottomNav />
    </div>
  );
}

export default App;
