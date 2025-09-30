import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';

const GlobalPulse = () => {
  // State for each metric
  const [justSold, setJustSold] = useState('Viral Classic');
  const [totalEaten, setTotalEaten] = useState(0);
  const [activePlayers, setActivePlayers] = useState(Math.floor(Math.random() * (150 - 37 + 1)) + 37);
  const [newPlayers, setNewPlayers] = useState(0);
  
  // Pulsate animation states
  const [pulsateJustSold, setPulsateJustSold] = useState(false);
  const [pulsateTotalEaten, setPulsateTotalEaten] = useState(false);
  const [pulsateActivePlayers, setPulsateActivePlayers] = useState(false);
  const [pulsateNewPlayers, setPulsateNewPlayers] = useState(false);
  
  // Refs for cleanup
  const justSoldTimeoutRef = useRef(null);
  const activePlayersTimeoutRef = useRef(null);
  const newPlayersTimeoutRef = useRef(null);
  
  // Check if current time is within active hours (10AM-10PM)
  const isActiveHours = () => {
    const hour = new Date().getHours();
    return hour >= 10 && hour < 22;
  };
  
  // Trigger pulsate animation
  const triggerPulsate = (setter) => {
    setter(true);
    setTimeout(() => setter(false), 600);
  };
  
  // Daily reset at midnight
  useEffect(() => {
    const checkDailyReset = () => {
      const now = new Date();
      const hour = now.getHours();
      const minute = now.getMinutes();
      
      // Reset at midnight (00:00)
      if (hour === 0 && minute === 0) {
        setTotalEaten(0);
        setNewPlayers(0);
      }
    };
    
    // Check every minute
    const interval = setInterval(checkDailyReset, 60000);
    
    return () => clearInterval(interval);
  }, []);
  
  // Just Sold updater (coupled with Total Eaten)
  useEffect(() => {
    const scheduleNextUpdate = () => {
      // Only schedule if within active hours
      if (!isActiveHours()) {
        // Check again in 10 minutes
        justSoldTimeoutRef.current = setTimeout(scheduleNextUpdate, 600000);
        return;
      }
      
      // Random interval between 1 min (60000ms) and 20 min (1200000ms)
      const interval = Math.floor(Math.random() * (1200000 - 60000 + 1)) + 60000;
      
      justSoldTimeoutRef.current = setTimeout(() => {
        // Alternate product randomly
        const products = ['Viral Matcha', 'Viral Classic'];
        setJustSold(products[Math.floor(Math.random() * products.length)]);
        setTotalEaten(prev => prev + 1);
        
        triggerPulsate(setPulsateJustSold);
        triggerPulsate(setPulsateTotalEaten);
        
        // Schedule next update
        scheduleNextUpdate();
      }, interval);
    };
    
    scheduleNextUpdate();
    
    return () => {
      if (justSoldTimeoutRef.current) {
        clearTimeout(justSoldTimeoutRef.current);
      }
    };
  }, []);
  
  // Active Players updater
  useEffect(() => {
    const scheduleNextUpdate = () => {
      // Only schedule if within active hours
      if (!isActiveHours()) {
        // Check again in 10 minutes
        activePlayersTimeoutRef.current = setTimeout(scheduleNextUpdate, 600000);
        return;
      }
      
      // Random interval between 5 min (300000ms) and 15 min (900000ms)
      const interval = Math.floor(Math.random() * (900000 - 300000 + 1)) + 300000;
      
      activePlayersTimeoutRef.current = setTimeout(() => {
        // Only update if still within active hours
        if (isActiveHours()) {
          const newCount = Math.floor(Math.random() * (150 - 37 + 1)) + 37;
          setActivePlayers(newCount);
          triggerPulsate(setPulsateActivePlayers);
        }
        
        // Schedule next update
        scheduleNextUpdate();
      }, interval);
    };
    
    scheduleNextUpdate();
    
    return () => {
      if (activePlayersTimeoutRef.current) {
        clearTimeout(activePlayersTimeoutRef.current);
      }
    };
  }, []);
  
  // New Players updater (independent)
  useEffect(() => {
    const scheduleNextUpdate = () => {
      // Random interval between 2 min (120000ms) and 30 min (1800000ms)
      const interval = Math.floor(Math.random() * (1800000 - 120000 + 1)) + 120000;
      
      newPlayersTimeoutRef.current = setTimeout(() => {
        // Increment up to max 90 per day
        setNewPlayers(prev => {
          if (prev < 90) {
            triggerPulsate(setPulsateNewPlayers);
            return prev + 1;
          }
          return prev;
        });
        
        // Schedule next update
        scheduleNextUpdate();
      }, interval);
    };
    
    scheduleNextUpdate();
    
    return () => {
      if (newPlayersTimeoutRef.current) {
        clearTimeout(newPlayersTimeoutRef.current);
      }
    };
  }, []);
  
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
            {justSold}
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
            {totalEaten}
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
            {activePlayers}
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
            {newPlayers}
          </motion.span>
        </div>
      </div>
    </div>
  );
};

export default GlobalPulse;
