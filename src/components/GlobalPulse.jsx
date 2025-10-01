import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL;
const POLL_INTERVAL = 15000; // Poll every 15 seconds

const GlobalPulse = () => {
  // State for stats from backend
  const [stats, setStats] = useState({
    just_sold: 'Viral Classic',
    total_eaten_today: 0,
    active_players: 0,
    new_players_today: 0
  });
  
  // Loading and error states
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Previous stats for detecting changes
  const prevStatsRef = useRef(stats);
  
  // Pulsate animation states
  const [pulsateJustSold, setPulsateJustSold] = useState(false);
  const [pulsateTotalEaten, setPulsateTotalEaten] = useState(false);
  const [pulsateActivePlayers, setPulsateActivePlayers] = useState(false);
  const [pulsateNewPlayers, setPulsateNewPlayers] = useState(false);
  
  // Trigger pulsate animation
  const triggerPulsate = (setter) => {
    setter(true);
    setTimeout(() => setter(false), 600);
  };
  
  // Fetch stats from backend
  const fetchStats = async () => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/global-stats`);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      
      const data = await response.json();
      
      // Detect changes and trigger animations
      const prevStats = prevStatsRef.current;
      
      if (data.just_sold !== prevStats.just_sold) {
        triggerPulsate(setPulsateJustSold);
      }
      
      if (data.total_eaten_today !== prevStats.total_eaten_today) {
        triggerPulsate(setPulsateTotalEaten);
      }
      
      if (data.active_players !== prevStats.active_players) {
        triggerPulsate(setPulsateActivePlayers);
      }
      
      if (data.new_players_today !== prevStats.new_players_today) {
        triggerPulsate(setPulsateNewPlayers);
      }
      
      // Update stats
      prevStatsRef.current = data;
      setStats(data);
      setLoading(false);
      setError(null);
      
    } catch (err) {
      console.error('Failed to fetch global stats:', err);
      setError('Unable to load stats');
      setLoading(false);
    }
  };
  
  // Initial fetch on mount
  useEffect(() => {
    fetchStats();
  }, []);
  
  // Poll for updates every 15 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      fetchStats();
    }, POLL_INTERVAL);
    
    return () => clearInterval(interval);
  }, []);
  
  // Loading state
  if (loading) {
    return (
      <div className="space-y-4 text-center mb-6">
        <h2 className="text-2xl font-extrabold tracking-widest text-gray-200">
          GLOBAL PULSE
        </h2>
        <div className="text-gray-400 animate-pulse">Loading stats...</div>
      </div>
    );
  }
  
  // Error state
  if (error) {
    return (
      <div className="space-y-4 text-center mb-6">
        <h2 className="text-2xl font-extrabold tracking-widest text-gray-200">
          GLOBAL PULSE
        </h2>
        <div className="text-red-400 text-sm">{error}</div>
      </div>
    );
  }
  
  return (
    <div className="space-y-4 text-center mb-6">
      <h2 className="text-2xl font-extrabold tracking-widest text-gray-200">
        GLOBAL PULSE
      </h2>
      
      <div className="space-y-3">
        {/* Just Sold */}
        <div className="flex items-center justify-center gap-2 text-lg">
          <span className="text-gray-400">🛒 Just Sold:</span>
          <motion.span
            className="font-bold text-emerald-400"
            animate={pulsateJustSold ? { scale: [1, 1.15, 1], opacity: [1, 0.8, 1] } : {}}
            transition={{ duration: 0.6 }}
          >
            {stats.just_sold}
          </motion.span>
        </div>
        
        {/* Total Eaten */}
        <div className="flex items-center justify-center gap-2 text-lg">
          <span className="text-gray-400">🍪 Meowchis Eaten Today:</span>
          <motion.span
            className="font-bold text-purple-400"
            animate={pulsateTotalEaten ? { scale: [1, 1.15, 1], opacity: [1, 0.8, 1] } : {}}
            transition={{ duration: 0.6 }}
          >
            {stats.total_eaten_today}
          </motion.span>
        </div>
        
        {/* Active Players */}
        <div className="flex items-center justify-center gap-2 text-lg">
          <span className="text-gray-400">👥 Active Players Online:</span>
          <motion.span
            className="font-bold text-blue-400"
            animate={pulsateActivePlayers ? { scale: [1, 1.15, 1], opacity: [1, 0.8, 1] } : {}}
            transition={{ duration: 0.6 }}
          >
            {stats.active_players}
          </motion.span>
        </div>
        
        {/* New Players */}
        <div className="flex items-center justify-center gap-2 text-lg">
          <span className="text-gray-400">🎉 New Players Joined:</span>
          <motion.span
            className="font-bold text-pink-400"
            animate={pulsateNewPlayers ? { scale: [1, 1.15, 1], opacity: [1, 0.8, 1] } : {}}
            transition={{ duration: 0.6 }}
          >
            {stats.new_players_today}
          </motion.span>
        </div>
      </div>
    </div>
  );
};

export default GlobalPulse;
