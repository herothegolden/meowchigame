import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Trophy, Crown, Medal, Star, Users, Calendar, Clock, LoaderCircle, Award, Zap } from 'lucide-react';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL;

const LeaderboardsPage = () => {
  const [leaderboardData, setLeaderboardData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('global');
  const [error, setError] = useState('');
  const [isConnected, setIsConnected] = useState(false);
  const tg = window.Telegram?.WebApp;

  // Mock data for demo mode
  const MOCK_LEADERBOARD = [
    { rank: 1, player: { name: 'Alex', level: 3 }, score: 12450, isCurrentUser: true, badge: 'Legend' },
    { rank: 2, player: { name: 'Maria', level: 4 }, score: 11200, isCurrentUser: false, badge: 'Epic' },
    { rank: 3, player: { name: 'John', level: 2 }, score: 9800, isCurrentUser: false, badge: 'Epic' },
    { rank: 4, player: { name: 'Sarah', level: 3 }, score: 8500, isCurrentUser: false, badge: 'Rare' },
    { rank: 5, player: { name: 'Mike', level: 2 }, score: 7200, isCurrentUser: false, badge: 'Rare' },
    { rank: 6, player: { name: 'Emma', level: 1 }, score: 6100, isCurrentUser: false, badge: null },
    { rank: 7, player: { name: 'David', level: 2 }, score: 5800, isCurrentUser: false, badge: null },
    { rank: 8, player: { name: 'Lisa', level: 1 }, score: 4900, isCurrentUser: false, badge: null },
    { rank: 9, player: { name: 'Tom', level: 1 }, score: 4200, isCurrentUser: false, badge: null },
    { rank: 10, player: { name: 'Anna', level: 1 }, score: 3800, isCurrentUser: false, badge: null }
  ];

  const fetchLeaderboard = async (type = 'global') => {
    setLoading(true);
    setError('');
    
    try {
      if (!tg?.initData || !BACKEND_URL) {
        console.log('Demo mode: Using mock leaderboard data');
        setLeaderboardData(MOCK_LEADERBOARD);
        setIsConnected(false);
        setLoading(false);
        return;
      }

      console.log(`Fetching ${type} leaderboard...`);
      
      const res = await fetch(`${BACKEND_URL}/api/get-leaderboard`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ initData: tg.initData, type }),
      });

      if (res.ok) {
        const data = await res.json();
        console.log('Leaderboard data:', data);
        setLeaderboardData(data.leaderboard || []);
        setIsConnected(true);
      } else {
        throw new Error(`Failed to fetch leaderboard: ${res.status}`);
      }
    } catch (err) {
      console.error('Leaderboard fetch error:', err);
      setError(err.message);
      
      // Fallback to mock data
      setLeaderboardData(MOCK_LEADERBOARD);
      setIsConnected(false);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLeaderboard(activeTab);
  }, [activeTab]);

  const getRankIcon = (rank) => {
    switch(rank) {
      case 1: return <Crown className="w-6 h-6 text-yellow-400" />;
      case 2: return <Medal className="w-6 h-6 text-gray-300" />;
      case 3: return <Medal className="w-6 h-6 text-amber-600" />;
      default: return <span className="w-6 h-6 flex items-center justify-center text-secondary font-bold">#{rank}</span>;
    }
  };

  const getBadgeColor = (badge) => {
    switch(badge) {
      case 'Legend': return 'text-purple-400 bg-purple-400/20';
      case 'Epic': return 'text-blue-400 bg-blue-400/20';
      case 'Rare': return 'text-green-400 bg-green-400/20';
      default: return 'text-gray-400 bg-gray-400/20';
    }
  };

  const getTabConfig = () => [
    { id: 'global', label: 'Global', icon: Users, description: 'All time leaders' },
    { id: 'weekly', label: 'Weekly', icon: Calendar, description: 'This week\'s top players' },
    { id: 'friends', label: 'Friends', icon: Star, description: 'Compare with friends' }
  ];

  const LeaderboardEntry = ({ entry, index }) => {
    const isTopThree = entry.rank <= 3;
    const isCurrentUser = entry.isCurrentUser;
    
    return (
      <motion.div
        className={`flex items-center p-4 rounded-lg border transition-all duration-200 ${
          isCurrentUser 
            ? 'bg-accent/20 border-accent shadow-accent/20' 
            : 'bg-nav border-gray-700 hover:border-gray-600'
        }`}
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.3, delay: index * 0.05 }}
        whileHover={{ scale: 1.02 }}
      >
        {/* Rank */}
        <div className="flex items-center justify-center w-12 h-12 mr-4">
          {getRankIcon(entry.rank)}
        </div>

        {/* Player Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center space-x-2">
            <p className={`font-bold truncate ${isCurrentUser ? 'text-accent' : 'text-primary'}`}>
              {entry.player.name}
            </p>
            {isCurrentUser && (
              <span className="text-xs bg-accent text-background px-2 py-1 rounded-full font-bold">
                YOU
              </span>
            )}
          </div>
          <div className="flex items-center space-x-2 mt-1">
            <span className="text-xs text-secondary">Level {entry.player.level}</span>
            {entry.badge && (
              <span className={`text-xs px-2 py-1 rounded-full font-bold ${getBadgeColor(entry.badge)}`}>
                {entry.badge}
              </span>
            )}
          </div>
        </div>

        {/* Score */}
        <div className="text-right">
          <p className={`text-lg font-bold ${isCurrentUser ? 'text-accent' : 'text-primary'}`}>
            {entry.score.toLocaleString()}
          </p>
          <p className="text-xs text-secondary">points</p>
        </div>

        {/* Top 3 decoration */}
        {isTopThree && (
          <motion.div
            className="absolute -right-2 -top-2 w-6 h-6 bg-gradient-to-r from-yellow-400 to-orange-500 rounded-full flex items-center justify-center"
            animate={{ rotate: [0, 10, -10, 0] }}
            transition={{ duration: 2, repeat: Infinity }}
          >
            <Zap className="w-3 h-3 text-white" />
          </motion.div>
        )}
      </motion.div>
    );
  };

  const EmptyState = () => (
    <motion.div
      className="text-center py-12"
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.5 }}
    >
      <Trophy className="w-16 h-16 text-secondary mx-auto mb-4" />
      <h3 className="text-xl font-bold text-primary mb-2">No Players Yet</h3>
      <p className="text-secondary">Be the first to climb the leaderboard!</p>
    </motion.div>
  );

  return (
    <div className="p-4 space-y-6 bg-background text-primary">
      {/* Header */}
      <motion.div 
        className="text-center"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div className="flex items-center justify-center mb-2">
          <Trophy className="w-8 h-8 mr-3 text-accent" />
          <h1 className="text-3xl font-bold">Leaderboards</h1>
        </div>
        <p className="text-secondary">Compete with players worldwide</p>
      </motion.div>

      {/* Connection Status */}
      <div className={`text-xs text-center p-2 rounded ${isConnected ? 'text-green-400' : 'text-yellow-400'}`}>
        {isConnected ? 'Connected to server' : 'Demo mode - showing sample data'}
      </div>

      {/* Tab Navigation */}
      <motion.div
        className="flex bg-nav rounded-lg border border-gray-700 p-1"
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.1 }}
      >
        {getTabConfig().map((tab) => {
          const TabIcon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 flex flex-col items-center justify-center py-3 px-2 rounded-md transition-all duration-200 ${
                activeTab === tab.id 
                  ? 'bg-accent text-background' 
                  : 'text-secondary hover:text-primary hover:bg-background/20'
              }`}
            >
              <TabIcon className="w-5 h-5 mb-1" />
              <span className="text-sm font-medium">{tab.label}</span>
            </button>
          );
        })}
      </motion.div>

      {/* Tab Description */}
      <motion.div
        className="text-center"
        key={activeTab}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3 }}
      >
        <p className="text-sm text-secondary">
          {getTabConfig().find(tab => tab.id === activeTab)?.description}
        </p>
      </motion.div>

      {/* Leaderboard Content */}
      <motion.div
        className="space-y-3"
        layout
      >
        <AnimatePresence mode="wait">
          {loading ? (
            <motion.div
              key="loading"
              className="flex items-center justify-center py-12"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <LoaderCircle className="w-8 h-8 text-accent animate-spin mr-3" />
              <span className="text-secondary">Loading leaderboard...</span>
            </motion.div>
          ) : error && leaderboardData.length === 0 ? (
            <motion.div
              key="error"
              className="text-center py-8"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <p className="text-red-400 mb-4">{error}</p>
              <button
                onClick={() => fetchLeaderboard(activeTab)}
                className="bg-accent text-background py-2 px-4 rounded-lg font-bold hover:bg-accent/90 transition-colors"
              >
                Retry
              </button>
            </motion.div>
          ) : leaderboardData.length === 0 ? (
            <motion.div key="empty">
              <EmptyState />
            </motion.div>
          ) : (
            <motion.div
              key="leaderboard"
              className="space-y-3"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              {leaderboardData.map((entry, index) => (
                <LeaderboardEntry
                  key={`${activeTab}-${entry.rank}-${entry.player.name}`}
                  entry={entry}
                  index={index}
                />
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* Stats Footer */}
      {!loading && leaderboardData.length > 0 && (
        <motion.div
          className="bg-nav rounded-lg p-4 border border-gray-700 text-center"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
        >
          <div className="flex items-center justify-center space-x-6 text-sm text-secondary">
            <div className="flex items-center">
              <Users className="w-4 h-4 mr-1" />
              <span>{leaderboardData.length} Players</span>
            </div>
            <div className="flex items-center">
              <Clock className="w-4 h-4 mr-1" />
              <span>Updates every hour</span>
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
};

export default LeaderboardsPage;
