import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { User, Star, Flame, ChevronRight, LoaderCircle, AlertTriangle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || '';

// --- THIS FUNCTION PREVENTS THE BLACK SCREEN ---
// It checks if the URL is valid before the app tries to use it.
const isValidUrl = (urlString) => {
  // The URL must be a valid https URL and must NOT contain "google.com"
  if (!urlString || !urlString.startsWith('https://') || urlString.includes('google.com')) {
    return false;
  }
  try {
    // This will throw an error if the URL is malformed.
    new URL(urlString);
    return true;
  } catch (e) {
    return false;
  }
};

const HomePage = () => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const navigate = useNavigate();
  
  // --- THIS IS THE DEFINITIVE FIX FOR THE BLACK SCREEN ---
  // If the URL is missing or invalid, this error screen is shown instead of a crash.
  if (import.meta.env.PROD && !isValidUrl(BACKEND_URL)) {
     return (
      <div className="p-4 text-center text-red-400 flex flex-col items-center justify-center h-full">
        <AlertTriangle className="w-16 h-16 mx-auto mb-4" />
        <h1 className="text-2xl font-bold">CRITICAL CONFIGURATION ERROR</h1>
        <p className="mt-2 text-secondary">The app cannot load because the backend URL is invalid.</p>
        <div className="mt-4 text-left text-sm bg-nav p-4 rounded-lg w-full max-w-md">
          <p className="font-bold text-primary">Your Current Invalid URL:</p>
          <code className="font-mono text-red-500 text-xs break-all">{BACKEND_URL}</code>
          <p className="mt-4 font-bold text-primary">How to Fix:</p>
          <p className="mt-1">1. Create a file named <code className="font-mono text-accent">.env</code> in your frontend's root directory.</p>
          <p className="mt-1">2. Add the following line, replacing the example with your real backend URL:</p>
          <code className="font-mono text-accent text-xs break-all mt-1 block">VITE_BACKEND_URL=https://your-backend-name.up.railway.app</code>
        </div>
      </div>
    );
  }

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
      if (!tg || !tg.initData) {
        console.warn('Running in browser mode. App requires Telegram.');
        setLoading(false);
        return;
      }

      tg.ready();
      
      try {
        const res = await fetch(`${BACKEND_URL}/api/validate`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ initData: tg.initData }),
        });

        if (!res.ok) {
          const errorText = await res.text();
          throw new Error(`Server responded with status: ${res.status}. Details: ${errorText}`);
        }

        const userData = await res.json();
        setUser(userData);

        if (userData.dailyBonus) {
          showBonusPopup(userData.dailyBonus);
        }

      } catch (err) {
        console.error("Full fetch error:", err);
        setError(`Could not connect to the server. Please verify the backend URL and your network connection.`);
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
        <AlertTriangle className="w-10 h-10 mx-auto mb-3" />
        <p className="font-bold">Oops! Something went wrong.</p>
        <p className="text-sm text-secondary mt-1 px-4">{error}</p>
      </div>
    );
  }
  
  if (!user) {
    return (
      <div className="p-4 text-center text-secondary flex flex-col items-center justify-center h-full">
          <h1 className="text-xl font-bold text-primary mb-2">Welcome!</h1>
          <p>This app is designed to be used inside Telegram.</p>
          <p className="text-xs mt-4">(If you are in Telegram and see this, please try restarting the app).</p>
      </div>
    )
  }

  return (
    <div className="p-4 space-y-6">
      
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
        <button onClick={() => navigate('/game')} className="w-full bg-accent text-background font-bold py-4 rounded-lg flex items-center justify-center text-lg transition-transform hover:scale-105">
          Play Now!
          <ChevronRight className="w-6 h-6 ml-2" />
        </button>
      </motion.div>

    </div>
  );
};

export default HomePage;

