import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { User, Star, Flame, ChevronRight, LoaderCircle } from 'lucide-react';

// Get the backend URL from the environment variables
const BACKEND_URL = import.meta.env.VITE_BACKEND_URL;

const HomePage = () => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchUserData = async () => {
      // Check if the Telegram Web App script is loaded
      if (!window.Telegram || !window.Telegram.WebApp) {
        setError('Telegram script not loaded. Make sure you are running in the Telegram app.');
        setLoading(false);
        return;
      }

      const tg = window.Telegram.WebApp;
      tg.ready(); // Inform Telegram that the app is ready

      // Check if initData is available
      if (!tg.initData) {
        setError('No initialization data found.');
        setLoading(false);
        return;
      }
      
      try {
        const res = await fetch(`${BACKEND_URL}/api/validate`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ initData: tg.initData }),
        });

        if (!res.ok) {
          throw new Error(`Server responded with status: ${res.status}`);
        }

        const userData = await res.json();
        setUser(userData);
      } catch (err) {
        setError(`Failed to fetch user data: ${err.message}`);
      } finally {
        setLoading(false);
      }
    };

    fetchUserData();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <LoaderCircle className="w-12 h-12 text-accent animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 text-center text-red-400">
        <p>Oops! Something went wrong.</p>
        <p className="text-sm text-secondary">{error}</p>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-6">
      
      {/* User Header */}
      <motion.div 
        className="flex items-center space-x-4"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div className="w-16 h-16 bg-nav rounded-full flex items-center justify-center">
          <User className="w-8 h-8 text-secondary" />
        </div>
        <div>
          <p className="text-secondary text-sm">Level {user.level}</p>
          <h1 className="text-2xl font-bold text-primary">Welcome, {user.first_name}!</h1>
        </div>
      </motion.div>

      {/* Points & Streak */}
      <motion.div 
        className="grid grid-cols-2 gap-4"
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, delay: 0.2 }}
      >
        <div className="bg-nav p-4 rounded-lg">
          <div className="flex items-center text-secondary mb-1">
            <Star className="w-4 h-4 mr-2" />
            <span className="text-sm">My Points</span>
          </div>
          <p className="text-2xl font-bold text-accent">{user.points.toLocaleString()}</p>
        </div>
        <div className="bg-nav p-4 rounded-lg">
          <div className="flex items-center text-secondary mb-1">
            <Flame className="w-4 h-4 mr-2" />
            <span className="text-sm">Daily Streak</span>
          </div>
          <p className="text-2xl font-bold text-accent">{user.daily_streak} Days</p>
        </div>
      </motion.div>
      
      {/* Featured Promotion Banner */}
      <motion.div 
        className="bg-accent text-background p-4 rounded-lg text-center"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.4 }}
      >
        <h2 className="font-bold text-lg">Marshmallow Madness!</h2>
        <p className="text-sm">Get double points on all games this weekend!</p>
      </motion.div>

      {/* Quick Game Launch Button */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5, delay: 0.6 }}
      >
        <button className="w-full bg-accent text-background font-bold py-4 rounded-lg flex items-center justify-center text-lg transition-transform hover:scale-105">
          Play Now!
          <ChevronRight className="w-6 h-6 ml-2" />
        </button>
      </motion.div>

    </div>
  );
};

export default HomePage;
