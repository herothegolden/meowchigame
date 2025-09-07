import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { User, Star, Flame, ChevronRight, LoaderCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { PerformanceMonitor } from '../utils/performance';

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
  const [connectionStatus, setConnectionStatus] = useState('Connecting...');
  const [isConnected, setIsConnected] = useState(false);
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

    const fetchUserData = async () => {
      try {
        PerformanceMonitor.startTimer('HomePage_TotalLoad');
        
        if (!tg || !tg.initData || !BACKEND_URL) {
          console.log('Running in browser mode. Using mock data.');
          setConnectionStatus('Demo mode - using mock data');
          setUser(MOCK_USER_DATA);
          setIsConnected(false);
          setLoading(false);
          PerformanceMonitor.endTimer('HomePage_TotalLoad');
          showBonusPopup(MOCK_USER_DATA.dailyBonus);
          return;
        }
        
        console.log('Fetching user data from backend...');
        setConnectionStatus('Fetching user data...');
        
        // Test network latency first
        await PerformanceMonitor.testNetworkLatency();
        
        PerformanceMonitor.startTimer('HomePage_APICall');
        tg.ready();
        
        const res = await fetch(`${BACKEND_URL}/api/validate`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ initData: tg.initData }),
        });
        
        PerformanceMonitor.endTimer('HomePage_APICall');

        if (!res.ok) {
          throw new Error(`Server responded with status: ${res.status}`);
        }

        PerformanceMonitor.startTimer('HomePage_DataProcessing');
        const userData = await res.json();
        console.log('User data received:', userData);
        
        setUser(userData);
        setConnectionStatus('Connected to server');
        setIsConnected(true);
        PerformanceMonitor.endTimer('HomePage_DataProcessing');

        // Check for and display the daily bonus
        if (userData.dailyBonus) {
          showBonusPopup(userData.dailyBonus);
        }

      } catch (err) {
        console.error('Error fetching user data:', err);
        setError(`Failed to fetch user data: ${err.message}`);
        setConnectionStatus(`Error: ${err.message} - Using demo mode`);
        
        // Fallback to mock data
        setUser(MOCK_USER_DATA);
        setIsConnected(false);
      } finally {
        setLoading(false);
        PerformanceMonitor.endTimer('HomePage_TotalLoad');
        
        // Show performance report in console
        setTimeout(() => {
          const report = PerformanceMonitor.getReport();
          console.log('📊 HomePage Performance Report:', report);
        }, 1000);
      }
    };

    fetchUserData();
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-full">
        <LoaderCircle className="w-12 h-12 text-accent animate-spin mb-4" />
        <p className="text-secondary">{connectionStatus}</p>
      </div>
    );
  }

  if (error && !user) {
    return (
      <div className="p-4 text-center text-red-400">
        <p>Oops! Something went wrong.</p>
        <p className="text-sm text-secondary">{error}</p>
        <button 
          onClick={() => window.location.reload()}
          className="mt-4 bg-accent text-background py-2 px-4 rounded-lg font-bold"
        >
          Retry
        </button>
      </div>
    );
  }
  
  // This can happen if the API call finishes but userData is not set
  if (!user) {
    return (
        <div className="flex items-center justify-center h-full">
            <p className="text-secondary">Could not load user data.</p>
        </div>
    )
  }

  return (
    <div className="p-4 space-y-6">
      
      {/* Connection status */}
      <div className={`text-xs text-center p-2 rounded ${isConnected ? 'text-green-400' : 'text-yellow-400'}`}>
        {connectionStatus}
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
          className="w-full bg-accent text-background font-bold py-4 rounded-lg flex items-center justify-center text-lg transition-transform hover:scale-105"
        >
          Play Now!
          <ChevronRight className="w-6 h-6 ml-2" />
        </button>
      </motion.div>

    </div>
  );
};

export default HomePage;
