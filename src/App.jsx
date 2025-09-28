import React, { useState, useEffect } from 'react';
import { Routes, Route } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import BottomNav from './components/BottomNav';

// Import all page components
import HomePage from './pages/HomePage';
import ProfilePage from './pages/ProfilePage';
import GamePage from './pages/GamePage';
import ShopPage from './pages/ShopPage';
import TasksPage from './pages/TasksPage';
import PartnersPage from './pages/PartnersPage';
import LeaderboardsPage from './pages/LeaderboardsPage';
import DevToolsPage from './pages/DevToolsPage';

function App() {
  const [isLoading, setIsLoading] = useState(true);
  const [currentTextIndex, setCurrentTextIndex] = useState(1); // Start from second message

  // Chaotic loading text messages
  const loadingTexts = [
    "Summoning sprinkle storms…", // This shows in static loading
    "Oops! Dropped a marshmallow (again).",
    "Whisking up Pi secrets…",
    "Meowchi is hiding your cookies (don't tell).",
    "Glitter detonation in 3… 2… 💥"
  ];

  // Cycle through chaotic text every 2 seconds (faster since we have less time)
  useEffect(() => {
    if (!isLoading) return;

    const textInterval = setInterval(() => {
      setCurrentTextIndex((prev) => (prev + 1) % loadingTexts.length);
    }, 2000); // Reduced from 2500ms to 2000ms

    return () => clearInterval(textInterval);
  }, [isLoading, loadingTexts.length]);

  // React takes over from instant loading
  useEffect(() => {
    // Start React loading immediately (instant loading will fade out automatically)
    const loadingTimer = setTimeout(() => {
      setIsLoading(false);
    }, 2500); // Total loading time

    return () => clearTimeout(loadingTimer);
  }, []);

  return (
    <div className="h-screen w-screen flex flex-col font-sans overflow-hidden relative">
      <AnimatePresence mode="wait">
        {isLoading ? (
          // Loading Screen - matches body pastel background
          <motion.div
            key="loading"
            className="absolute inset-0 flex flex-col items-center justify-center z-50"
            style={{ backgroundColor: '#FDF6E3' }} // Matches body background
            initial={{ opacity: 1 }}
            exit={{
              opacity: 0,
              scale: 0.8,
              filter: "blur(10px)",
              clipPath: [
                "polygon(0% 0%, 100% 0%, 100% 100%, 0% 100%)",
                "polygon(10% 10%, 90% 5%, 85% 90%, 15% 95%)",
                "polygon(20% 20%, 80% 15%, 75% 80%, 25% 85%)",
                "polygon(30% 30%, 70% 25%, 65% 70%, 35% 75%)",
                "polygon(40% 40%, 60% 35%, 55% 60%, 45% 65%)",
                "circle(0% at 50% 50%)"
              ]
            }}
            transition={{ 
              duration: 1.2, 
              ease: "easeInOut",
              clipPath: { duration: 1.2, times: [0, 0.2, 0.4, 0.6, 0.8, 1] }
            }}
          >
            {/* Meowchi Image */}
            <motion.div
              className="mb-8"
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.6, ease: "easeOut" }}
            >
              <img
                src="/3f4ea614-4f4d-47f5-9569-a5a81818cc6f.png"
                alt="Meowchi Loading"
                className="w-32 h-32 object-contain rounded-2xl"
                onError={(e) => {
                  // Fallback if local image fails
                  e.target.src = "https://ik.imagekit.io/59r2kpz8r/Meowchi%202%20/MeowchiCat.webp?updatedAt=1758909417672";
                }}
              />
            </motion.div>

            {/* Cycling Chaotic Text */}
            <motion.div
              className="text-center px-6 max-w-sm"
              key={currentTextIndex}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.4 }}
            >
              <p className="text-lg font-bold text-amber-600 mb-2">
                {loadingTexts[currentTextIndex]}
              </p>
            </motion.div>

            {/* Loading Indicator */}
            <motion.div
              className="mt-8 flex space-x-2"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
            >
              {[0, 1, 2].map((i) => (
                <motion.div
                  key={i}
                  className="w-3 h-3 bg-amber-500 rounded-full"
                  animate={{
                    scale: [1, 1.2, 1],
                    opacity: [0.6, 1, 0.6]
                  }}
                  transition={{
                    duration: 1.5,
                    repeat: Infinity,
                    delay: i * 0.2,
                    ease: "easeInOut"
                  }}
                />
              ))}
            </motion.div>

            {/* Floating Cookie Crumbs for Effect */}
            <motion.div
              className="absolute inset-0 pointer-events-none"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1 }}
            >
              {[...Array(12)].map((_, i) => (
                <motion.div
                  key={i}
                  className="absolute w-2 h-2 bg-amber-400 rounded-full opacity-60"
                  style={{
                    left: `${Math.random() * 100}%`,
                    top: `${Math.random() * 100}%`,
                  }}
                  animate={{
                    y: [0, -20, 0],
                    x: [0, Math.random() * 40 - 20, 0],
                    opacity: [0.6, 0.3, 0.6],
                    scale: [1, 0.8, 1]
                  }}
                  transition={{
                    duration: 3 + Math.random() * 2,
                    repeat: Infinity,
                    delay: Math.random() * 2,
                    ease: "easeInOut"
                  }}
                />
              ))}
            </motion.div>
          </motion.div>
        ) : (
          // Main App Content
          <motion.div
            key="app"
            className="h-full w-full bg-background"
            initial={{ opacity: 0, scale: 1.1 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
          >
            {/* Main content area */}
            <main className="flex-grow overflow-y-auto pb-20 bg-background text-primary h-screen">
              <Routes>
                <Route path="/" element={<HomePage />} />
                <Route path="/profile" element={<ProfilePage />} />
                <Route path="/game" element={<GamePage />} />
                <Route path="/shop" element={<ShopPage />} />
                <Route path="/tasks" element={<TasksPage />} />
                <Route path="/partners" element={<PartnersPage />} />
                <Route path="/leaderboards" element={<LeaderboardsPage />} />
                <Route path="/dev-tools" element={<DevToolsPage />} />
              </Routes>
            </main>

            {/* Bottom Navigation Bar */}
            <BottomNav />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default App;
