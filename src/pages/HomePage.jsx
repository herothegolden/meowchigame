// src/pages/HomePage.jsx - Complete with audio integration and TMA optimization
import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { User, Star, Flame, ChevronRight, LoaderCircle, Wifi, WifiOff } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAudio } from '../hooks/useAudio';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL;

const MOCK_USER_DATA = {
  id: 1,
  telegram_id: 123456789,
  first_name: 'Demo User',
  last_name: '',
  username: 'demouser',
  points: 4735,
  level: 1,
  daily_streak: 1,
  dailyBonus: null
};

const HomePage = () => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isConnected, setIsConnected] = useState(false);
  const navigate = useNavigate();

  // AUDIO INTEGRATION
  const { playButtonClick } = useAudio();

  useEffect(() => {
    const tg = window.Telegram?.WebApp;

    const showBonusPopup = (bonus) => {
      if (tg && bonus) {
        tg.showPopup({
          title: 'Daily Bonus!',
          message: `You earned ${bonus.points} points for your ${bonus.streak}-day streak! Keep it up!`,
          buttons: [{ text: 'Awesome!', type: 'ok' }]
        });
      }
    };

    const fetchUserData = async () => {
      try {
        // IMMEDIATE: Check if TMA data exists
        if (!tg || !tg.initData) {
          console.log('Using demo mode');
          setUser(MOCK_USER_DATA);
          setIsConnected(false);
          setLoading(false);
          showBonusPopup(MOCK_USER_DATA.dailyBonus);
          return;
        }

        console.log('🚀 Fetching user data...');
        tg.ready(); // Initialize TMA immediately
        
        // SINGLE FAST CALL: No retries, no prefetch, no delays
        const response = await fetch(`${BACKEND_URL}/api/validate`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ initData: tg.initData }),
          signal: AbortSignal.timeout(5000) // 5s timeout only
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }

        const userData = await response.json();
        console.log('✅ User data received');
        
        setUser(userData);
        setIsConnected(true);

        // Show daily bonus
        if (userData.dailyBonus) {
          showBonusPopup(userData.dailyBonus);
        }

        // Success haptic
        tg.HapticFeedback?.notificationOccurred('success');

      } catch (err) {
        console.warn('Connection failed, using demo mode:', err.message);
        
        // INSTANT FALLBACK: No retries, immediate demo mode
        setError(`Offline mode: ${err.message}`);
        setUser(MOCK_USER_DATA);
        setIsConnected(false);
        
        // Error haptic
        tg?.HapticFeedback?.notificationOccurred('error');
      } finally {
        setLoading(false);
      }
    };

    fetchUserData();
  }, []);

  // AUDIO-ENHANCED: Manual retry function
  const handleRetry = () => {
    playButtonClick(); // Audio feedback
    window.location.reload();
  };

  // AUDIO-ENHANCED: Play Now navigation
  const handlePlayNow = () => {
    playButtonClick(); // Audio feedback for main game button
    
    // Haptic feedback for main action
    if (window.Telegram?.WebApp?.HapticFeedback) {
      window.Telegram.WebApp.HapticFeedback.impactOccurred('medium');
    }
    
    navigate('/game');
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-4">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          className="mb-4"
        >
          <LoaderCircle className="w-12 h-12 text-accent" />
        </motion.div>
        <p className="text-secondary">Loading...</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="p-4 text-center">
        <div className="bg-red-900/20 border border-red-500 rounded-lg p-4 mb-4">
          <WifiOff className="w-8 h-8 text-red-400 mx-auto mb-2" />
          <p className="text-red-400 font-medium">Connection Failed</p>
          <p className="text-sm text-secondary mt-1">{error}</p>
        </div>
        <button 
          onClick={handleRetry}
          className="bg-accent text-background py-2 px-4 rounded-lg font-bold hover:bg-accent/90 transition-colors"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-6">
      
      {/* Connection status */}
      <div className={`text-xs text-center p-2 rounded flex items-center justify-center space-x-2 ${
        isConnected ? 'text-green-400 bg-green-900/20' : 'text-yellow-400 bg-yellow-900/20'
      }`}>
        {isConnected ? <Wifi className="w-3 h-3" /> : <WifiOff className="w-3 h-3" />}
        <span>{isConnected ? 'Connected' : 'Demo Mode'}</span>
      </div>

      {/* User header */}
      <motion.div 
        className="flex items-center space-x-4"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <div className="w-16 h-16 bg-nav rounded-full flex items-center justify-center border border-gray-700">
          <User className="w-8 h-8 text-secondary" />
        </div>
        <div>
          <p className="text-secondary text-sm">Level {user.level}</p>
          <h1 className="text-2xl font-bold text-primary">Welcome, {user.first_name}!</h1>
        </div>
      </motion.div>

      {/* Stats grid */}
      <motion.div 
        className="grid grid-cols-2 gap-4"
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.3, delay: 0.1 }}
      >
        <div className="bg-nav p-4 rounded-lg border border-gray-700">
          <div className="flex items-center text-secondary mb-1">
            <Star className="w-4 h-4 mr-2" />
            <span className="text-sm">My Points</span>
          </div>
          <p className="text-2xl font-bold text-accent">{user.points.toLocaleString()}</p>
        </div>
        <div className="bg-nav p-4 rounded-lg border border-gray-700">
          <div className="flex items-center text-secondary mb-1">
            <Flame className="w-4 h-4 mr-2" />
            <span className="text-sm">Daily Streak</span>
          </div>
          <p className="text-2xl font-bold text-accent">{user.daily_streak} Days</p>
        </div>
      </motion.div>
      
      {/* Promo banner */}
      <motion.div 
        className="bg-accent text-background p-4 rounded-lg text-center"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.2 }}
      >
        <h2 className="font-bold text-lg">Marshmallow Madness!</h2>
        <p className="text-sm">Get double points on all games this weekend!</p>
      </motion.div>

      {/* Play button with audio feedback */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3, delay: 0.3 }}
      >
        <button 
          onClick={handlePlayNow}
          className="w-full bg-accent text-background font-bold py-4 rounded-lg flex items-center justify-center text-lg transition-transform hover:scale-105 active:scale-95"
        >
          Play Now!
          <ChevronRight className="w-6 h-6 ml-2" />
        </button>
      </motion.div>

    </div>
  );
};

export default HomePage;
