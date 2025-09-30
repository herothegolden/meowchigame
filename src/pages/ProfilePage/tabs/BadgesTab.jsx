import React from 'react';
import { motion } from 'framer-motion';
import { Award } from 'lucide-react';

const badgeConfig = {
  'Cookie Master Badge': { 
    icon: '🍪', 
    title: 'Cookie Master', 
    description: 'Master of the cookies',
    color: 'text-yellow-400'
  },
  'Speed Demon Badge': { 
    icon: '⚡', 
    title: 'Speed Demon', 
    description: 'Lightning fast reflexes',
    color: 'text-blue-400'
  },
  'Champion Badge': { 
    icon: '🏆', 
    title: 'Champion', 
    description: 'Ultimate game champion',
    color: 'text-purple-400'
  }
};

const BadgeCard = ({ badgeName, isOwned }) => {
  const badge = badgeConfig[badgeName] || {
    icon: '🎖',
    title: badgeName,
    description: 'Special achievement',
    color: 'text-gray-400'
  };

  return (
    <motion.div
      className={`p-4 rounded-lg border-2 transition-all duration-200 ${
        isOwned 
          ? 'bg-nav border-accent shadow-accent/20' 
          : 'bg-gray-800 border-gray-600 opacity-50'
      }`}
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3 }}
      whileHover={{ scale: isOwned ? 1.05 : 1 }}
    >
      <div className="text-center">
        <div className="text-3xl mb-2">{badge.icon}</div>
        <h3 className={`font-bold ${isOwned ? badge.color : 'text-gray-500'}`}>
          {badge.title}
        </h3>
        <p className="text-xs text-secondary mt-1">{badge.description}</p>
        {isOwned && (
          <div className="flex items-center justify-center mt-2 text-accent">
            <Award className="w-4 h-4 mr-1" />
            <span className="text-xs font-bold">OWNED</span>
          </div>
        )}
      </div>
    </motion.div>
  );
};

const BadgesTab = ({ ownedBadges, badgeProgress }) => {
  const allBadges = ['Cookie Master Badge', 'Speed Demon Badge', 'Champion Badge'];
  const progress = badgeProgress?.progress || {};

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }}>
      <div className="space-y-4">
        <div className="bg-background/50 p-4 rounded-lg border border-gray-600">
          <h3 className="text-lg font-bold text-primary mb-2">Badge Progress</h3>
          <div className="grid grid-cols-3 gap-4 text-center text-sm">
            <div>
              <p className="text-secondary">Earned</p>
              <p className="text-accent font-bold">{ownedBadges.length}/3</p>
            </div>
            <div>
              <p className="text-secondary">Average Progress</p>
              <p className="text-accent font-bold">
                {Object.keys(progress).length > 0 
                  ? Math.round(Object.values(progress).reduce((a, b) => a + b, 0) / Object.values(progress).length)
                  : 0}%
              </p>
            </div>
            <div>
              <p className="text-secondary">Next Goal</p>
              <p className="text-accent font-bold">
                {ownedBadges.length < 3 ? `${3 - ownedBadges.length} badges` : 'Complete!'}
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3">
          {allBadges.map(badgeName => {
            const isOwned = ownedBadges.includes(badgeName);
            const progressValue = progress[badgeName] || 0;
            
            return (
              <div key={badgeName}>
                <BadgeCard badgeName={badgeName} isOwned={isOwned} />
                {!isOwned && progressValue > 0 && (
                  <div className="mt-2 px-4">
                    <div className="flex items-center justify-between text-xs text-secondary mb-1">
                      <span>Progress</span>
                      <span>{progressValue}%</span>
                    </div>
                    <div className="w-full bg-gray-700 rounded-full h-2">
                      <motion.div
                        className="bg-accent h-2 rounded-full"
                        initial={{ width: 0 }}
                        animate={{ width: `${progressValue}%` }}
                        transition={{ duration: 1, delay: 0.2 }}
                      />
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </motion.div>
  );
};

export default BadgesTab;
