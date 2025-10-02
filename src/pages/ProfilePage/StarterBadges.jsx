import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Lock } from 'lucide-react';

const STARTER_BADGES = [
  { id: 1, name: 'The First Paw', icon: '🐾', requirement: 'First login' },
  { id: 2, name: 'Cookie Lover', icon: '🍪', requirement: 'Play your first game' },
  { id: 3, name: 'Double Snack', icon: '🎁', requirement: 'Buy your first Meowchi 쫀더쿠키' },
  { id: 4, name: '7-Day Streak', icon: '📅', requirement: 'Log in 7 days in a row' },
  { id: 5, name: 'Cat Challenger', icon: '🎮', requirement: 'Play game 7 days in a row' },
];

const StarterBadges = () => {
  const [activeBadge, setActiveBadge] = useState(null);
  const [tooltipPosition, setTooltipPosition] = useState({ left: '50%', transform: 'translateX(-50%)' });
  const [arrowPosition, setArrowPosition] = useState({ left: '50%', transform: 'translateX(-50%)' });
  const badgeRefs = useRef({});
  const tooltipRef = useRef(null);
  const containerRef = useRef(null);

  // Auto-dismiss tooltip after 2 seconds
  useEffect(() => {
    if (activeBadge === null) return;

    const timer = setTimeout(() => {
      setActiveBadge(null);
    }, 2000);

    return () => clearTimeout(timer);
  }, [activeBadge]);

  // Calculate tooltip position when active badge changes
  useEffect(() => {
    if (activeBadge === null || !tooltipRef.current || !containerRef.current) return;

    const badgeElement = badgeRefs.current[activeBadge];
    if (!badgeElement) return;

    const container = containerRef.current;
    const tooltip = tooltipRef.current;
    
    const containerRect = container.getBoundingClientRect();
    const badgeRect = badgeElement.getBoundingClientRect();
    const tooltipRect = tooltip.getBoundingClientRect();

    // Calculate badge center relative to container
    const badgeCenterX = badgeRect.left - containerRect.left + (badgeRect.width / 2);
    
    // Calculate tooltip position (centered under badge)
    const tooltipLeft = badgeCenterX - (tooltipRect.width / 2);
    const tooltipRight = tooltipLeft + tooltipRect.width;

    // Check if tooltip overflows container
    let finalLeft = tooltipLeft;
    
    if (tooltipLeft < 0) {
      // Overflow on left - shift right
      finalLeft = 8; // 8px padding from edge
    } else if (tooltipRight > containerRect.width) {
      // Overflow on right - shift left
      finalLeft = containerRect.width - tooltipRect.width - 8;
    }

    // Calculate arrow position relative to tooltip
    const arrowLeft = badgeCenterX - finalLeft;

    setTooltipPosition({
      left: `${finalLeft}px`,
      transform: 'none'
    });

    setArrowPosition({
      left: `${arrowLeft}px`,
      transform: 'translateX(-50%)'
    });
  }, [activeBadge]);

  const handleBadgeClick = (badgeId) => {
    setActiveBadge(badgeId);
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
        <p className="text-xs text-secondary mt-1">Complete tasks to unlock your first badges</p>
      </div>

      <div className="grid grid-cols-5 gap-2 sm:gap-3 relative">
        {STARTER_BADGES.map((badge, index) => (
          <motion.div
            key={badge.id}
            ref={(el) => (badgeRefs.current[badge.id] = el)}
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
          </motion.div>
        ))}

        {/* Single Tooltip - Positioned Absolutely in Grid */}
        <AnimatePresence>
          {activeBadge && (
            <motion.div
              ref={tooltipRef}
              className="absolute z-50 pointer-events-none"
              style={{
                top: '100%',
                marginTop: '8px',
                ...tooltipPosition
              }}
              initial={{ opacity: 0, y: -5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -5 }}
              transition={{ duration: 0.2 }}
            >
              <div className="bg-gray-900 text-white text-xs rounded-lg py-3 px-3 shadow-2xl border border-gray-700 min-w-[140px] max-w-[160px]">
                <p className="font-bold text-accent mb-1.5 text-center leading-tight">
                  {STARTER_BADGES.find(b => b.id === activeBadge)?.name}
                </p>
                <p className="text-gray-300 text-center leading-tight">
                  {STARTER_BADGES.find(b => b.id === activeBadge)?.requirement}
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
