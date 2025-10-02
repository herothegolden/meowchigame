import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Lock, X } from 'lucide-react';

const STARTER_BADGES = [
  { id: 1, name: 'The First Paw', icon: '🐾', requirement: 'First login' },
  { id: 2, name: 'Cookie Lover', icon: '🍪', requirement: 'Play your first game' },
  { id: 3, name: 'Double Snack', icon: '🎁', requirement: 'Buy your first Meowchi 쫀득쿠키' },
  { id: 4, name: '7-Day Streak', icon: '📅', requirement: 'Log in 7 days in a row' },
  { id: 5, name: 'Cat Challenger', icon: '🎮', requirement: 'Play game 7 days in a row' },
];

const StarterBadges = () => {
  const [selectedBadge, setSelectedBadge] = useState(null);

  const handleBadgeClick = (badge) => {
    setSelectedBadge(selectedBadge?.id === badge.id ? null : badge);
  };

  return (
    <motion.div
      className="bg-nav p-4 rounded-lg border border-gray-700 relative"
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
            className="relative"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.3, delay: 0.15 + index * 0.05 }}
          >
            {/* Badge Container */}
            <div
              onClick={() => handleBadgeClick(badge)}
              className="bg-background rounded-lg border border-gray-600 p-2 sm:p-3 flex flex-col items-center justify-center aspect-square relative overflow-hidden opacity-50 grayscale cursor-pointer active:scale-95 transition-transform"
            >
              {/* Badge Icon */}
              <div className="text-2xl sm:text-3xl filter brightness-50">
                {badge.icon}
              </div>

              {/* Lock Overlay */}
              <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                <Lock className="w-4 h-4 sm:w-5 sm:h-5 text-gray-400" />
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Tooltip Modal - Shown on Tap/Click */}
      <AnimatePresence>
        {selectedBadge && (
          <>
            {/* Backdrop */}
            <motion.div
              className="fixed inset-0 bg-black/50 z-40"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedBadge(null)}
            />
            
            {/* Tooltip Card */}
            <motion.div
              className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 bg-gray-900 text-white rounded-lg p-4 shadow-2xl border border-gray-700 max-w-[280px] w-[90vw]"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ duration: 0.2 }}
            >
              <button
                onClick={() => setSelectedBadge(null)}
                className="absolute top-2 right-2 text-gray-400 hover:text-white transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
              
              <div className="text-center">
                <div className="text-4xl mb-3">{selectedBadge.icon}</div>
                <h4 className="font-bold text-accent text-lg mb-2">{selectedBadge.name}</h4>
                <p className="text-gray-300 text-sm">{selectedBadge.requirement}</p>
                <div className="mt-3 pt-3 border-t border-gray-700">
                  <p className="text-xs text-gray-400">🔒 Locked</p>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default StarterBadges;
