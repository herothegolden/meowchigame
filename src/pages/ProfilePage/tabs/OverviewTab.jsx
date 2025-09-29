import React from 'react';
import { motion } from 'framer-motion';
import { Star, Flame, Trophy, Package, Award, Calendar } from 'lucide-react';

const OverviewTab = ({ stats }) => {
  return (
    <motion.div 
      className="grid grid-cols-2 gap-4" 
      initial={{ opacity: 0, scale: 0.95 }} 
      animate={{ opacity: 1, scale: 1 }} 
      transition={{ delay: 0.2 }}
    >
      <div className="bg-nav p-4 rounded-lg flex items-center border border-gray-700">
        <div className="mr-4 text-accent"><Star size={24} /></div>
        <div>
          <p className="text-sm text-secondary">Total Points</p>
          <p className="text-lg font-bold text-primary">{stats.points.toLocaleString()}</p>
          <p className="text-xs text-green-400 mt-1">+15% this week</p>
        </div>
      </div>

      <div className="bg-nav p-4 rounded-lg flex items-center border border-gray-700">
        <div className="mr-4 text-accent"><Flame size={24} /></div>
        <div>
          <p className="text-sm text-secondary">Daily Streak</p>
          <p className="text-lg font-bold text-primary">{stats.daily_streak} Days</p>
          <p className="text-xs text-green-400 mt-1">Personal best!</p>
        </div>
      </div>

      <div className="bg-nav p-4 rounded-lg flex items-center border border-gray-700">
        <div className="mr-4 text-primary"><Trophy size={24} /></div>
        <div>
          <p className="text-sm text-secondary">High Score</p>
          <p className="text-lg font-bold text-primary">{stats.high_score || 0}</p>
          <p className="text-xs text-green-400 mt-1">New record!</p>
        </div>
      </div>

      <div className="bg-nav p-4 rounded-lg flex items-center border border-gray-700">
        <div className="mr-4 text-primary"><Package size={24} /></div>
        <div>
          <p className="text-sm text-secondary">Games Played</p>
          <p className="text-lg font-bold text-primary">{stats.games_played || 0}</p>
          <p className="text-xs text-green-400 mt-1">+5 this week</p>
        </div>
      </div>

      <div className="bg-nav p-4 rounded-lg flex items-center border border-gray-700">
        <div className="mr-4 text-primary"><Award size={24} /></div>
        <div>
          <p className="text-sm text-secondary">Average Score</p>
          <p className="text-lg font-bold text-primary">{stats.averageScore || 0}</p>
          <p className="text-xs text-green-400 mt-1">Improving!</p>
        </div>
      </div>

      <div className="bg-nav p-4 rounded-lg flex items-center border border-gray-700">
        <div className="mr-4 text-primary"><Calendar size={24} /></div>
        <div>
          <p className="text-sm text-secondary">Play Time</p>
          <p className="text-lg font-bold text-primary">{stats.totalPlayTime || '0h 0m'}</p>
          <p className="text-xs text-green-400 mt-1">Getting better!</p>
        </div>
      </div>
    </motion.div>
  );
};

export default OverviewTab;
