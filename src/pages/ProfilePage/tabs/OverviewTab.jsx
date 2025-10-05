import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Star, Flame, Trophy, Package, Award, Calendar } from 'lucide-react';
import { claimStreak, showSuccess, showError } from '../../utils/api';

const OverviewTab = ({ stats, streakInfo, onUpdate }) => {
  const [isClaiming, setIsClaiming] = useState(false);
  const [showSuccessAnim, setShowSuccessAnim] = useState(false);
  const [earnedPoints, setEarnedPoints] = useState(0);

  const handleFireClick = async () => {
    if (isClaiming || !streakInfo?.canClaim) return;

    // Haptic feedback
    const tg = window.Telegram?.WebApp;
    if (tg?.HapticFeedback) {
      tg.HapticFeedback.impactOccurred('soft');
    }

    setIsClaiming(true);

    try {
      const result = await claimStreak();
      
      // Show success animation
      setEarnedPoints(result.streak.pointsEarned);
      setShowSuccessAnim(true);

      // Hide animation after 2 seconds
      setTimeout(() => {
        setShowSuccessAnim(false);
      }, 2000);

      // Refresh profile data
      setTimeout(() => {
        onUpdate();
      }, 2100);

      showSuccess(result.message);
    } catch (error) {
      if (error.message.includes('already claimed')) {
        showError('Already claimed today!');
      } else {
        showError(error.message || 'Failed to claim streak');
      }
    } finally {
      setIsClaiming(false);
    }
  };

  return (
    <motion.div 
      className="grid grid-cols-2 gap-4 relative" 
      initial={{ opacity: 0, scale: 0.95 }} 
      animate={{ opacity: 1, scale: 1 }} 
      transition={{ delay: 0.2 }}
    >
      <div className="bg-nav p-4 rounded-lg flex items-center border border-gray-700">
        <div className="mr-4 text-accent"><Star size={24} /></div>
        <div>
          <p className="text-sm text-secondary">Total Points</p>
          <p className="text-lg font-bold text-primary">{stats.points.toLocaleString()}</p>
          <p className="text-xs text-green-400 mt-1">Keep earning!</p>
        </div>
      </div>

      <div className="bg-nav p-4 rounded-lg flex items-center border border-gray-700 relative">
        <div className="mr-4 text-accent"><Flame size={24} /></div>
        <div>
          <p className="text-sm text-secondary">Daily Streak</p>
          <p className="text-lg font-bold text-primary">{stats.daily_streak} Days</p>
          <p className="text-xs text-green-400 mt-1">Stay consistent!</p>
        </div>

        {/* Floating Fire Emoji - Only show if can claim */}
        {streakInfo?.canClaim && !isClaiming && !showSuccessAnim && (
          <motion.div
            className="absolute -top-3 -right-3 cursor-pointer"
            onClick={handleFireClick}
            initial={{ scale: 0 }}
            animate={{ 
              scale: [1, 1.2, 1],
              rotate: [0, -10, 10, -10, 0]
            }}
            transition={{
              scale: {
                duration: 1,
                repeat: Infinity,
                ease: "easeInOut"
              },
              rotate: {
                duration: 2,
                repeat: Infinity,
                ease: "easeInOut"
              }
            }}
            whileTap={{ scale: 0.8 }}
          >
            <div className="text-4xl drop-shadow-lg">🔥</div>
          </motion.div>
        )}

        {/* Success Animation - Green +X pts */}
        <AnimatePresence>
          {showSuccessAnim && (
            <motion.div
              className="absolute -top-8 left-1/2 -translate-x-1/2 pointer-events-none"
              initial={{ opacity: 0, y: 10, scale: 0.5 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -20, scale: 0.8 }}
              transition={{ duration: 0.4 }}
            >
              <div className="bg-green-500 text-white px-4 py-2 rounded-full font-bold text-sm shadow-lg whitespace-nowrap">
                +{earnedPoints} pts
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="bg-nav p-4 rounded-lg flex items-center border border-gray-700">
        <div className="mr-4 text-primary"><Trophy size={24} /></div>
        <div>
          <p className="text-sm text-secondary">High Score</p>
          <p className="text-lg font-bold text-primary">{stats.high_score || 0}</p>
          <p className="text-xs text-green-400 mt-1">Beat your record!</p>
        </div>
      </div>

      <div className="bg-nav p-4 rounded-lg flex items-center border border-gray-700">
        <div className="mr-4 text-primary"><Package size={24} /></div>
        <div>
          <p className="text-sm text-secondary">Games Played</p>
          <p className="text-lg font-bold text-primary">{stats.games_played || 0}</p>
          <p className="text-xs text-green-400 mt-1">Keep playing!</p>
        </div>
      </div>

      <div className="bg-nav p-4 rounded-lg flex items-center border border-gray-700">
        <div className="mr-4 text-primary"><Award size={24} /></div>
        <div>
          <p className="text-sm text-secondary">Average Score</p>
          <p className="text-lg font-bold text-primary">{stats.averageScore || 0}</p>
          <p className="text-xs text-green-400 mt-1">Nice work!</p>
        </div>
      </div>

      <div className="bg-nav p-4 rounded-lg flex items-center border border-gray-700">
        <div className="mr-4 text-primary"><Calendar size={24} /></div>
        <div>
          <p className="text-sm text-secondary">Play Time</p>
          <p className="text-lg font-bold text-primary">{stats.totalPlayTime || '0h 0m'}</p>
          <p className="text-xs text-green-400 mt-1">Time well spent!</p>
        </div>
      </div>
    </motion.div>
  );
};

export default OverviewTab;
