import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Lock } from 'lucide-react';

const STARTER_BADGES = [
  { id: 1, name: 'The First Paw', icon: '🐾', requirement: 'First login' },
  { id: 2, name: 'Cookie Lover', icon: '🍪', requirement: 'Play your first game' },
  { id: 3, name: 'Double Snack', icon: '🎁', requirement: 'Buy your first Meowchi 쫀득쿠키' },
  { id: 4, name: '7-Day Streak', icon: '📅', requirement: 'Log in 7 days in a row' },
  { id: 5, name: 'Cat Challenger', icon: '🎮', requirement: 'Play game 7 days in a row' },
];

const StarterBadges = () => {
  const [activeBadge, setActiveBadge] = useState(null);

  const handleBadgeClick = (badge) => {
    setActiveBadge(activeBadge?.id === badge.id ? null : badge);
  };

  return (
    <div>
      {/* Tooltip Area - Shows ABOVE the badges section */}
      <AnimatePresence>
        {activeBadge && (
          <motion.div
            className="mb-4"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
          >
            <div className="bg-gray-900 text-white rounded-lg py-3 px-4 shadow-2xl border border-gray-700">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="text-3xl">{activeBadge.icon}</div>
                  <div>
                    <p className="font-bold text-accent">{activeBadge.name}</p>
                    <p className="text-sm text-gray-300">{activeBadge.requirement}</p>
                  </div>
                </div>
                <div className="text-xs text-gray-400 flex items-center">
                  <Lock className="w-3 h-3 mr-1" />
                  Locked
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Badges Section */}
      <motion.div
        className="bg-nav p-4 rounded-lg border border-gray-700"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.1 }}
      >
        <div className="mb-3">
          <h3 className="text-sm font-bold text-primary flex items-center">
            <span className="text-accent mr-2">🌟</span>
            Level 1: Starter Badges
          </h3>
          <p className="text-xs text-secondary mt-1">Complete tasks to unlock your first badges</p>
        </div>

        <div className="grid grid-cols-5 gap-2 sm:gap-3">
          {STARTER_BADGES.map((badge, index) => (
            <motion.div
              key={badge.id}
              onClick={() => handleBadgeClick(badge)}
              className="bg-background rounded-lg border border-gray-600 p-2 sm:p-3 flex flex-col items-center justify-center aspect-square relative overflow-hidden opacity-50 grayscale cursor-pointer active:scale-95 transition-transform"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.3, delay: 0.15 + index * 0.05 }}
            >
              {/* Badge Icon */}
              <div className="text-2xl sm:text-3xl filter brightness-50">
                {badge.icon}
              </div>

              {/* Lock Overlay */}
              <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                <Lock className="w-4 h-4 sm:w-5 sm:h-5 text-gray-400" />
              </div>
            </motion.div>
          ))}
        </div>
      </motion.div>

      {/* Backdrop to close tooltip */}
      {activeBadge && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setActiveBadge(null)}
        />
      )}
    </div>
  );
};

export default StarterBadges;
