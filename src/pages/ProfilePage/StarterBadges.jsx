import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Lock } from 'lucide-react';

const STARTER_BADGES = [
  { id: 1, name: 'The First Paw', icon: '�', requirement: 'First login' },
  { id: 2, name: 'Cookie Lover', icon: '🍪', requirement: 'Play your first game' },
  { id: 3, name: 'Double Snack', icon: '🎁', requirement: 'Buy your first Meowchi 쫀더쿠키' },
  { id: 4, name: '7-Day Streak', icon: '📅', requirement: 'Log in 7 days in a row' },
  { id: 5, name: 'Cat Challenger', icon: '🎮', requirement: 'Play game 7 days in a row' },
];

const StarterBadges = () => {
  const [activeBadge, setActiveBadge] = useState(null);

  // Auto-dismiss tooltip after 2 seconds
  useEffect(() => {
    if (activeBadge === null) return;

    const timer = setTimeout(() => {
      setActiveBadge(null);
    }, 2000);

    return () => clearTimeout(timer);
  }, [activeBadge]);

  const handleBadgeClick = (badgeId) => {
    setActiveBadge(badgeId);
  };

  // Get tooltip positioning class based on badge index
  const getTooltipPositionClass = (index) => {
    if (index === 0) {
      // First badge - center but nudge right with margin
      return 'left-1/2 -translate-x-1/2 ml-12';
    } else if (index === 4) {
      // Last badge - center but nudge left with margin
      return 'left-1/2 -translate-x-1/2 mr-12';
    } else {
      // Middle badges - perfectly centered
      return 'left-1/2 -translate-x-1/2';
    }
  };

  return (
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
            className="relative"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.3, delay: 0.15 + index * 0.05 }}
          >
            {/* Badge Container */}
            <div
              onClick={() => handleBadgeClick(badge.id)}
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

            {/* Tooltip - Shown Below Badge */}
            <AnimatePresence>
              {activeBadge === badge.id && (
                <motion.div
                  className={`absolute top-full mt-2 z-50 pointer-events-none ${getTooltipPositionClass(index)}`}
                  initial={{ opacity: 0, y: -5 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -5 }}
                  transition={{ duration: 0.2 }}
                >
                  <div className="bg-gray-900 text-white text-xs rounded-lg py-3 px-3 shadow-2xl border border-gray-700 min-w-[140px] max-w-[160px]">
                    <p className="font-bold text-accent mb-1.5 text-center leading-tight">{badge.name}</p>
                    <p className="text-gray-300 text-center leading-tight">{badge.requirement}</p>
                    <div className="absolute -top-1.5 left-1/2 -translate-x-1/2">
                      <div className="w-3 h-3 bg-gray-900 border-l border-t border-gray-700 rotate-45"></div>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        ))}
      </div>

      {/* Backdrop to close tooltip on tap outside */}
      {activeBadge && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setActiveBadge(null)}
        />
      )}
    </motion.div>
  );
};

export default StarterBadges;
