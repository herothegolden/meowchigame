// src/pages/HomePage.jsx - Optimized for TMA performance
import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { User, Star, Flame, ChevronRight, LoaderCircle, Wifi, WifiOff } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { PerformanceMonitor } from '../utils/performance';
import { OptimizedAPIService } from '../utils/apiService';

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
  const [connectionStatus, setConnectionStatus] = useState('Connecting...');
  const [isConnected, setIsConnected] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const navigate = useNavigate();

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

    const fetchUserData = async (attempt = 1) => {
      try {
        PerformanceMonitor.startTimer('HomePage_TotalLoad');
        
        if (!tg || !tg.initData) {
          console.log('Running in browser mode. Using mock data.');
          setConnectionStatus('Demo mode - using mock data');
          setUser(MOCK_USER_DATA);
          setIsConnected(false);
          setLoading(false);
          PerformanceMonitor.endTimer('HomePage_TotalLoad');
          showBonusPopup(MOCK_USER_DATA.dailyBonus);
          return;
        }
        
        console.log(`🚀 Attempt ${attempt}: Fetching user data...`);
        setConnectionStatus(`Connecting... (${attempt}/3)`);
        
        // OPTIMIZATION: Prefetch critical data in background
        if (attempt === 1) {
          OptimizedAPIService.prefetchCriticalData(tg.initData);
        }
        
        PerformanceMonitor.startTimer('HomePage_FastValidation');
        tg.ready();
        
        const userData = await OptimizedAPIService.validateUser(tg.initData);
        
        PerformanceMonitor.endTimer('HomePage_FastValidation');
        PerformanceMonitor.endTimer('HomePage_TotalLoad');
        
        console.log('✅ User data received:', userData);
        
        setUser(userData);
        setConnectionStatus('🟢 Connected to server');
        setIsConnected(true);

        // Check for and display the daily bonus
        if (userData.dailyBonus) {
          showBonusPopup(userData.dailyBonus);
        }

        // Success haptic feedback
        if (tg.HapticFeedback) {
          tg.HapticFeedback.notificationOccurred('success');
        }

      } catch (err) {
        console.error(`❌ Attempt ${attempt} failed:`, err);
        
        const isTimeout = err.message.includes('timeout');
        const isNetworkError = err.message.includes('fetch') || err.message.includes('network');
        
        if (attempt < 3 && (isTimeout || isNetworkError)) {
          console.log(`🔄 Retrying in ${attempt}s... (${attempt}/3)`);
          setConnectionStatus(`Retrying... (${attempt}/3)`);
          setRetryCount(attempt);
          
          // Exponential backoff: 1s, 2s, 4s
          setTimeout(() => {
            fetchUserData(attempt + 1);
          }, attempt * 1000);
          
          return;
        }
        
        // Final fallback after 3 attempts
        console.log('⚠️ All attempts failed, using demo mode');
        setError(`Connection failed: ${err.message}`);
        setConnectionStatus('🔴 Offline - Using demo mode');
        
        // Fallback to mock data
        setUser(MOCK_USER_DATA);
        setIsConnected(false);
        
        // Error haptic feedback
        if (tg?.HapticFeedback) {
          tg.HapticFeedback.notificationOccurred('error');
        }
      } finally {
        setLoading(false);
        PerformanceMonitor.endTimer('HomePage_TotalLoad');
        
        // Show performance report in console
        setTimeout(() => {
          const report = PerformanceMonitor.getReport();
          console.log('📊 HomePage Performance Report:', report);
          
          // Show performance alert in TMA (optional)
          if (report.averageLoadTime > 500 && tg?.showAlert) {
            tg.showAlert(`Performance: ${report.averageLoadTime}ms (Target: <200ms)`);
          }
        }, 1000);
      }
    };

    fetchUserData();
  }, []);

  // Manual retry function
  const handleRetry = () => {
    setLoading(true);
    setError('');
    setRetryCount(0);
    window.location.reload(); // Simple reload for TMA
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-4">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
          className="mb-4"
        >
          <LoaderCircle className="w-12 h-12 text-accent" />
        </motion.div>
        <p className="text-secondary text-center">{connectionStatus}</p>
        {retryCount > 0 && (
          <p className="text-xs text-yellow-400 mt-2">
            Retrying... ({retryCount}/3)
          </p>
        )}
      </div>
    );
  }

  if (error && !user) {
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
          Retry Connection
        </button>
      </div>
    );
  }
  
  if (!user) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-secondary">Could not load user data.</p>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-6">
      
      {/* Connection status with visual indicator */}
      <div className={`text-xs text-center p-2 rounded flex items-center justify-center space-x-2 ${
        isConnected ? 'text-green-400 bg-green-900/20' : 'text-yellow-400 bg-yellow-900/20'
      }`}>
        {isConnected ? <Wifi className="w-3 h-3" /> : <WifiOff className="w-3 h-3" />}
        <span>{connectionStatus}</span>
      </div>

      <motion.div 
        className="flex items-center space-x-4"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div className="w-16 h-16 bg-nav rounded-full flex items-center justify-center border border-gray-700">
          <User className="w-8 h-8 text-secondary" />
        </div>
        <div>
          <p className="text-secondary text-sm">Level {user.level}</p>
          <h1 className="text-2xl font-bold text-primary">Welcome, {user.first_name}!</h1>
        </div>
      </motion.div>

      <motion.div 
        className="grid grid-cols-2 gap-4"
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, delay: 0.2 }}
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
      
      <motion.div 
        className="bg-accent text-background p-4 rounded-lg text-center"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.4 }}
      >
        <h2 className="font-bold text-lg">Marshmallow Madness!</h2>
        <p className="text-sm">Get double points on all games this weekend!</p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5, delay: 0.6 }}
      >
        <button 
          onClick={() => navigate('/game')} 
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
