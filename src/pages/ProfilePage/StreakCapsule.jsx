// Path: frontend/src/pages/ProfilePage/StreakCapsule.jsx

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Flame, CheckCircle, LoaderCircle, AlertTriangle } from 'lucide-react';
import { claimStreak, showSuccess, showError } from '../../utils/api';

const StreakCapsule = ({ streakInfo, onClaimed }) => {
  const [isClaiming, setIsClaiming] = useState(false);
  const [showAnimation, setShowAnimation] = useState(false);
  const [animationData, setAnimationData] = useState(null);

  const handleClaim = async () => {
    setIsClaiming(true);
    
    try {
      const result = await claimStreak();
      
      // Set animation data
      setAnimationData({
        pointsEarned: result.streak.pointsEarned,
        newStreak: result.streak.daily
      });
      
      // Show success animation
      setShowAnimation(true);
      
      // Hide animation after 700ms
      setTimeout(() => {
        setShowAnimation(false);
      }, 700);
      
      // Call parent callback to refresh profile data
      setTimeout(() => {
        onClaimed();
      }, 800);
      
      // Show success toast
      showSuccess(result.message);
      
    } catch (error) {
      // Handle "already claimed" error gracefully
      if (error.message.includes('already claimed')) {
        showError('You already claimed your streak today!');
      } else {
        showError(error.message || 'Failed to claim streak');
      }
    } finally {
      setIsClaiming(false);
    }
  };

  // Determine if this is a streak reset (missed days)
  const isReset = streakInfo.canClaim && streakInfo.potentialBonus === 100 && streakInfo.currentStreak > 0;

  return (
    <motion.div
      className="bg-nav p-4 rounded-lg border border-gray-700 relative overflow-hidden"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: 0.05 }}
    >
      {/* Streak Display - Always Visible */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center space-x-3">
          <div className="bg-orange-500/20 p-2 rounded-full">
            <Flame className="w-6 h-6 text-orange-500" />
          </div>
          <div>
            <p className="text-xs text-secondary">Daily Streak</p>
            <p className="text-xl font-bold text-primary">
              {streakInfo.currentStreak} {streakInfo.currentStreak === 1 ? 'Day' : 'Days'}
            </p>
          </div>
        </div>

        {/* Streak Status/Button */}
        <div>
          {streakInfo.state === 'CLAIMED' ? (
            // Already claimed today - Disabled state
            <button
              disabled
              className="bg-green-600/20 text-green-400 px-4 py-2 rounded-lg text-sm font-bold flex items-center space-x-2 border border-green-600/30 cursor-not-allowed"
            >
              <CheckCircle className="w-4 h-4" />
              <span>Claimed</span>
            </button>
          ) : streakInfo.canClaim ? (
            // Can claim - Active state
            <button
              onClick={handleClaim}
              disabled={isClaiming}
              className="bg-accent hover:bg-accent/90 text-background px-4 py-2 rounded-lg text-sm font-bold flex items-center space-x-2 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed active:scale-95"
            >
              {isClaiming ? (
                <>
                  <LoaderCircle className="w-4 h-4 animate-spin" />
                  <span>Claiming...</span>
                </>
              ) : (
                <>
                  <Flame className="w-4 h-4" />
                  <span>+{streakInfo.potentialBonus} pts</span>
                </>
              )}
            </button>
          ) : null}
        </div>
      </div>

      {/* Reset Warning - Show if missed days */}
      {isReset && (
        <div className="flex items-center space-x-2 bg-yellow-500/10 border border-yellow-500/30 rounded-lg px-3 py-2 mt-2">
          <AlertTriangle className="w-4 h-4 text-yellow-500 flex-shrink-0" />
          <p className="text-xs text-yellow-500">
            You missed a day. Claiming will reset your streak to 1.
          </p>
        </div>
      )}

      {/* Helper Text */}
      <p className="text-xs text-secondary mt-2">
        {streakInfo.message}
      </p>

      {/* Success Animation Overlay */}
      <AnimatePresence>
        {showAnimation && animationData && (
          <motion.div
            className="absolute inset-0 bg-accent/95 flex flex-col items-center justify-center z-10"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            transition={{ duration: 0.3 }}
          >
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.1 }}
              className="text-center"
            >
              <Flame className="w-12 h-12 text-background mx-auto mb-2" />
              <p className="text-2xl font-bold text-background mb-1">
                +{animationData.pointsEarned} Points!
              </p>
              <p className="text-sm text-background/80">
                {animationData.newStreak} Day Streak
              </p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default StreakCapsule;
