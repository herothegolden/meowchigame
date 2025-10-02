import React from 'react';
import { motion } from 'framer-motion';
import { Lock } from 'lucide-react';

const STARTER_BADGES = [
  { id: 1, name: 'The First Paw', icon: '🐾', requirement: 'First login' },
  { id: 2, name: 'Cookie Lover', icon: '🍪', requirement: 'Play your first game' },
  { id: 3, name: 'Double Snack', icon: '🎁', requirement: 'Buy your first Meowchi 쫀득쿠키' },
  { id: 4, name: '7-Day Streak', icon: '📅', requirement: 'Log in 7 days in a row' },
  { id: 5, name: 'Cat Challenger', icon: '🎮', requirement: 'Play game 7 days in a row' },
];

const StarterBadges = () => {
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
            className="relative group"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.3, delay: 0.15 + index * 0.05 }}
          >
            {/* Badge Container */}
            <div
              className="bg-background rounded-lg border border-gray-600 p-2 sm:p-3 flex flex-col items-center justify-center aspect-square relative overflow-hidden opacity-50 grayscale"
              title={`${badge.name}: ${badge.requirement}`}
            >
              {/* Badge Icon */}
              <div className="text-2xl sm:text-3xl mb-1 filter brightness-50">
                {badge.icon}
              </div>

              {/* Lock Overlay */}
              <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                <Lock className="w-4 h-4 sm:w-5 sm:h-5 text-gray-400" />
              </div>
            </div>

            {/* Badge Name (below icon) */}
            <p className="text-[10px] sm:text-xs text-secondary text-center mt-1 truncate">
              {badge.name}
            </p>

            {/* Tooltip on Hover (Desktop) */}
            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block z-10 pointer-events-none">
              <div className="bg-gray-900 text-white text-xs rounded-lg py-2 px-3 shadow-lg border border-gray-700 whitespace-nowrap">
                <p className="font-bold text-accent mb-1">{badge.name}</p>
                <p className="text-gray-300">{badge.requirement}</p>
                <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-1">
                  <div className="border-4 border-transparent border-t-gray-900"></div>
                </div>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
};

export default StarterBadges;
