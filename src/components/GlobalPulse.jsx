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
  
  // Clock state
  const [currentTime, setCurrentTime] = useState(new Date());
  
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
  
  // Update clock every second
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    
    return () => clearInterval(timer);
  }, []);
  
  // Format time as HH:MM:SS
  const formatTime = (date) => {
    return date.toLocaleTimeString('en-GB', { 
      hour: '2-digit', 
      minute: '2-digit', 
      second: '2-digit',
      hour12: false 
    });
  };
  
  // Loading state
  if (loading) {
    return (
      <div className="space-y-4 text-center mb-6">
        <h2 className="text-2xl font-extrabold tracking-widest text-pink-400">
          🌍 MEOWCHI PULSE
        </h2>
        <div className="text-gray-400 animate-pulse">Loading stats...</div>
      </div>
    );
  }
  
  // Error state
  if (error) {
    return (
      <div className="space-y-4 text-center mb-6">
        <h2 className="text-2xl font-extrabold tracking-widest text-pink-400">
          🌍 MEOWCHI PULSE
        </h2>
        <div className="text-red-400 text-sm">{error}</div>
      </div>
    );
  }
  
  return (
    <div className="space-y-6 mb-6">
      {/* Digital Clock Section */}
      <div className="space-y-2 text-center pb-8 border-b border-white/5">
        <p className="text-sm text-gray-500 font-medium uppercase tracking-wider">
          🕒 Meowchiverse Time
        </p>
        <div className="text-4xl md:text-5xl font-mono font-bold text-pink-400" style={{textShadow: '0 0 20px rgba(249, 168, 212, 0.4)'}}>
          {formatTime(currentTime)}
        </div>
      </div>
      
      {/* Section Title */}
      <h2 className="text-2xl md:text-3xl font-extrabold tracking-widest text-center text-pink-400 uppercase">
        🌍 MEOWCHI PULSE
      </h2>
      
      {/* Stats - LEFT-RIGHT SPLIT LAYOUT */}
      <div className="space-y-6 md:space-y-8">
        {/* Stat 1: Just Ordered (NO NUMBER) */}
        <motion.div
          className="flex items-center justify-between gap-6 p-5 md:p-6 rounded-xl bg-white/[0.02] hover:bg-white/[0.04] transition-all"
          animate={pulsateJustSold ? { x: [0, 4, 0] } : {}}
          transition={{ duration: 0.6 }}
        >
          <div className="flex-1 space-y-1">
            <div className="text-sm md:text-base text-gray-400 font-medium">
              🛒 Только что заказали
            </div>
            <motion.div
              className="text-base md:text-lg font-bold text-pink-400 leading-snug"
              animate={pulsateJustSold ? { scale: [1, 1.05, 1], opacity: [1, 0.8, 1] } : {}}
              transition={{ duration: 0.6 }}
            >
              {stats.just_sold} 쫀득 Cookie
            </motion.div>
          </div>
        </motion.div>
        
        {/* Stat 2: Eaten Today */}
        <motion.div
          className="flex items-center justify-between gap-6 p-5 md:p-6 rounded-xl bg-white/[0.02] hover:bg-white/[0.04] transition-all"
          animate={pulsateTotalEaten ? { x: [0, 4, 0] } : {}}
          transition={{ duration: 0.6 }}
        >
          <div className="flex-1 space-y-1">
            <div className="text-sm md:text-base text-gray-400 font-medium">
              🍪 Съедено сегодня
            </div>
            <div className="text-base md:text-lg font-bold text-pink-400 leading-snug">
              Meowchi (и счётчик растёт 👀)
            </div>
          </div>
          <motion.div
            className="text-5xl md:text-6xl font-extrabold text-white leading-none min-w-[80px] md:min-w-[100px] text-right"
            animate={pulsateTotalEaten ? { scale: [1, 1.15, 1], opacity: [1, 0.8, 1] } : {}}
            transition={{ duration: 0.6 }}
          >
            {stats.total_eaten_today}
          </motion.div>
        </motion.div>
        
        {/* Stat 3: Active Players */}
        <motion.div
          className="flex items-center justify-between gap-6 p-5 md:p-6 rounded-xl bg-white/[0.02] hover:bg-white/[0.04] transition-all"
          animate={pulsateActivePlayers ? { x: [0, 4, 0] } : {}}
          transition={{ duration: 0.6 }}
        >
          <div className="flex-1 space-y-1">
            <div className="text-sm md:text-base text-gray-400 font-medium">
              👥 Сейчас на сайте
            </div>
            <div className="text-base md:text-lg font-bold text-pink-400 leading-snug">
              игроков наслаждаются боунси-вибами
            </div>
          </div>
          <motion.div
            className="text-5xl md:text-6xl font-extrabold text-white leading-none min-w-[80px] md:min-w-[100px] text-right"
            animate={pulsateActivePlayers ? { scale: [1, 1.15, 1], opacity: [1, 0.8, 1] } : {}}
            transition={{ duration: 0.6 }}
          >
            {stats.active_players}
          </motion.div>
        </motion.div>
        
        {/* Stat 4: New Players */}
        <motion.div
          className="flex items-center justify-between gap-6 p-5 md:p-6 rounded-xl bg-white/[0.02] hover:bg-white/[0.04] transition-all"
          animate={pulsateNewPlayers ? { x: [0, 4, 0] } : {}}
          transition={{ duration: 0.6 }}
        >
          <div className="flex-1 space-y-1">
            <div className="text-sm md:text-base text-gray-400 font-medium">
              🎉 Новых участников
            </div>
            <div className="text-base md:text-lg font-bold text-pink-400 leading-snug">
              добро пожаловать в текстурный рай!
            </div>
          </div>
          <motion.div
            className="text-5xl md:text-6xl font-extrabold text-white leading-none min-w-[80px] md:min-w-[100px] text-right"
            animate={pulsateNewPlayers ? { scale: [1, 1.15, 1], opacity: [1, 0.8, 1] } : {}}
            transition={{ duration: 0.6 }}
          >
            {stats.new_players_today}
          </motion.div>
        </motion.div>
      </div>
    </div>
  );
};

export default GlobalPulse;
