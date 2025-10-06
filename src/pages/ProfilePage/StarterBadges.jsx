// Path: frontend/src/pages/ProfilePage/components/StarterBadges.jsx
// v4 — Fixed import path for api utils (build error)

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Lock } from 'lucide-react';
import { apiCall, showSuccess, showError } from '../../utils/api'; // ✅ fixed path

const STARTER_BADGES = [
  { id: 1, name: 'The First Paw', icon: '🐾', requirement: 'First login', condition: (stats) => stats?.games_played >= 0 },
  { id: 2, name: 'Cookie Lover', icon: '🍪', requirement: 'Play your first game', condition: (stats) => stats?.games_played > 0 },
  { id: 3, name: 'Double Snack', icon: '🎁', requirement: 'Buy your first Meowchi 쫀더쿠키', condition: (stats) => stats?.purchases > 0 },
  { id: 4, name: '7-Day Streak', icon: '📅', requirement: 'Log in 7 days in a row', condition: (stats) => stats?.daily_streak >= 7 },
  { id: 5, name: 'Cat Challenger', icon: '🎮', requirement: 'Play game 7 days in a row', condition: (stats) => stats?.games_played >= 7 },
];

const StarterBadges = ({ stats = {}, ownedBadges = [], onUpdate }) => {
  const [activeBadge, setActiveBadge] = useState(null);
  const [tooltipPosition, setTooltipPosition] = useState({ left: '50%', transform: 'translateX(-50%)' });
  const [arrowPosition, setArrowPosition] = useState({ left: '50%', transform: 'translateX(-50%)' });
  const [eligibleBadges, setEligibleBadges] = useState([]);
  const [claiming, setClaiming] = useState(null);
  const badgeRefs = useRef({});
  const tooltipRef = useRef(null);
  const containerRef = useRef(null);

  // Auto-dismiss tooltip
  useEffect(() => {
    if (activeBadge === null) return;
    const timer = setTimeout(() => setActiveBadge(null), 2000);
    return () => clearTimeout(timer);
  }, [activeBadge]);

  // Detect eligible badges
  useEffect(() => {
    const eligible = STARTER_BADGES.filter(
      (b) => b.condition(stats) && !ownedBadges.includes(b.name)
    ).map((b) => b.id);
    setEligibleBadges(eligible);
  }, [stats, ownedBadges]);

  // Tooltip position
  useEffect(() => {
    if (activeBadge === null || !tooltipRef.current || !containerRef.current) return;
    const badgeElement = badgeRefs.current[activeBadge];
    if (!badgeElement) return;

    const container = containerRef.current;
    const tooltip = tooltipRef.current;
    const containerRect = container.getBoundingClientRect();
    const badgeRect = badgeElement.getBoundingClientRect();
    const tooltipRect = tooltip.getBoundingClientRect();
    const badgeCenterX = badgeRect.left - containerRect.left + badgeRect.width / 2;
    const tooltipLeft = badgeCenterX - tooltipRect.width / 2;
    const tooltipRight = tooltipLeft + tooltipRect.width;
    let finalLeft = tooltipLeft;

    if (tooltipLeft < 0) finalLeft = 8;
    else if (tooltipRight > containerRect.width)
      finalLeft = containerRect.width - tooltipRect.width - 8;

    const arrowLeft = badgeCenterX - finalLeft;
    setTooltipPosition({ left: `${finalLeft}px`, transform: 'none' });
    setArrowPosition({ left: `${arrowLeft}px`, transform: 'translateX(-50%)' });
  }, [activeBadge]);

  const handleBadgeClick = (badgeId) => {
    setActiveBadge(badgeId);
  };

  // 🎉 Claim + sparkle
  const handleClaimBadge = async (badge) => {
    if (claiming) return;
    setClaiming(badge.id);
    try {
      showSuccess(`+100 points! ${badge.name} unlocked!`);
      await apiCall('/api/unlock-badge', { badgeName: badge.name });
      // short delay for sparkle animation
      setTimeout(() => {
        setClaiming(null);
        onUpdate?.();
      }, 900);
    } catch (err) {
      setClaiming(null);
      showError(err.message);
    }
  };

  return (
    <motion.div
      ref={containerRef}
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
        <p className="text-xs text-secondary mt-1">
          Complete tasks to unlock your first badges
        </p>
      </div>

      <div className="grid grid-cols-5 gap-2 sm:gap-3 relative">
        {STARTER_BADGES.map((badge, index) => {
          const isOwned = ownedBadges.includes(badge.name);
          const isUnlockable = eligibleBadges.includes(badge.id);
          const isClaiming = claiming === badge.id;

          return (
            <motion.div
              key={badge.id}
              ref={(el) => (badgeRefs.current[badge.id] = el)}
              className="relative"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.3, delay: 0.15 + index * 0.05 }}
            >
              {/* 🎉 Floating Emoji (Claim Button) */}
              <AnimatePresence>
                {isUnlockable && !isOwned && !isClaiming && (
                  <motion.div
                    onClick={() => handleClaimBadge(badge)}
                    className="absolute -top-5 left-1/2 -translate-x-1/2 text-2xl cursor-pointer z-10 select-none"
                    initial={{ y: -6 }}
                    animate={{ y: [-6, -2, -6] }}
                    transition={{ repeat: Infinity, duration: 1.5 }}
                    whileTap={{ scale: 1.4, rotate: [0, 15, -15, 0] }}
                  >
                    🎉
                  </motion.div>
                )}

                {isClaiming && (
                  <motion.div
                    key="sparkle"
                    className="absolute -top-5 left-1/2 -translate-x-1/2 text-2xl z-10 select-none"
                    initial={{ scale: 1, opacity: 1, color: '#FFD700' }}
                    animate={{
                      scale: [1, 1.8, 0],
                      opacity: [1, 1, 0],
                      color: ['#FFD700', '#FF9A00', '#FFFFFF'],
                    }}
                    transition={{ duration: 0.9, ease: 'easeOut' }}
                  >
                    ✨
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Badge Container */}
              <div
                onClick={() => handleBadgeClick(badge.id)}
                className={`rounded-lg border p-2 sm:p-3 flex flex-col items-center justify-center aspect-square relative overflow-hidden transition-transform active:scale-95
                  ${
                    isOwned
                      ? 'bg-background border-accent/50 opacity-100 grayscale-0'
                      : 'bg-background border-gray-600 opacity-50 grayscale cursor-pointer'
                  }`}
              >
                <div
                  className={`text-2xl sm:text-3xl ${
                    isOwned ? 'brightness-100' : 'brightness-50'
                  }`}
                >
                  {badge.icon}
                </div>

                {!isOwned && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                    <Lock className="w-4 h-4 sm:w-5 sm:h-5 text-gray-400" />
                  </div>
                )}
              </div>
            </motion.div>
          );
        })}

        {/* Tooltip */}
        <AnimatePresence>
          {activeBadge && (
            <motion.div
              ref={tooltipRef}
              className="absolute z-50 pointer-events-none"
              style={{ top: '100%', marginTop: '8px', ...tooltipPosition }}
              initial={{ opacity: 0, y: -5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -5 }}
              transition={{ duration: 0.2 }}
            >
              <div className="bg-gray-900 text-white text-xs rounded-lg py-3 px-3 shadow-2xl border border-gray-700 min-w-[140px] max-w-[160px]">
                <p className="font-bold text-accent mb-1.5 text-center leading-tight">
                  {STARTER_BADGES.find((b) => b.id === activeBadge)?.name}
                </p>
                <p className="text-gray-300 text-center leading-tight">
                  {STARTER_BADGES.find((b) => b.id === activeBadge)?.requirement}
                </p>
                <div
                  className="absolute -top-1.5 w-3 h-3 bg-gray-900 border-l border-t border-gray-700 rotate-45"
                  style={arrowPosition}
                />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
};

export default StarterBadges;
