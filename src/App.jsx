// Path: frontend/src/App.jsx
// v20 — No loading screen on Profile:
// - ProfilePage is imported eagerly (not lazy) → no Suspense fallback on /profile
// - Other routes remain code-split
// - Init runs in background; WebApp.ready() on next frame

import React, { useEffect, lazy, Suspense } from 'react';
import { Routes, Route } from 'react-router-dom';
import BottomNav from './components/BottomNav';
import { initializeUser } from './utils/api';

// ✅ Eager-load Profile to avoid any "Loading…" fallback on that route
import ProfilePage from './pages/ProfilePage';

// ✅ Keep other pages lazy to preserve small entry chunk
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

  // Signal Telegram readiness on next frame (prevents early jank)
  useEffect(() => {
    const raf = requestAnimationFrame(() => {
      try { window.Telegram?.WebApp?.ready?.(); } catch {}
    });
    return () => cancelAnimationFrame(raf);
  }, []);

  // Minimal, neutral fallback for lazy route chunks (no big overlay)
  const RouteFallback = <div style={{ height: 1 }} />;

  return (
    <div className="h-screen w-screen flex flex-col font-sans overflow-hidden bg-background text-primary">
      <main className="flex-grow overflow-y-auto pb-20">
        <Suspense fallback={RouteFallback}>
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/profile" element={<ProfilePage />} /> {/* ← eager, no fallback */}
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
