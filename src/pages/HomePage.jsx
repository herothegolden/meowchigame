import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { User, Star, Flame, ChevronRight, LoaderCircle, AlertTriangle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL;

const MOCK_USER_DATA = {
  id: 1,
  telegram_id: 123456789,
  first_name: 'Dev User',
  last_name: '',
  username: 'devuser',
  points: 5000,
  level: 8,
  daily_streak: 4,
  dailyBonus: { points: 400, streak: 4 } // Mock bonus for browser testing
};

const HomePage = () => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  // --- CRITICAL FIX: Environment Variable Check ---
  // A "black screen" is often caused by the frontend not knowing where the backend is.
  // This check provides a clear error message if the .env file is missing.
  if (!BACKEND_URL) {
    return (
      <div className="p-4 text-center text-red-400 flex flex-col items-center justify-center h-full">
        <AlertTriangle className="w-16 h-16 mx-auto mb-4" />
        <h1 className="text-2xl font-bold">Configuration Error</h1>
        <p className="mt-2 text-secondary">The backend URL is not configured.</p>
        <div className="mt-4 text-left text-sm bg-nav p-4 rounded-lg">
          <p className="font-bold text-primary">To fix this:</p>
          <p className="mt-1">1. Create a file named <code className="font-mono text-accent">.env</code> in the root of your frontend project.</p>
          <p className="mt-1">2. Add this line to the file: <br />
             <code className="font-mono text-accent">VITE_BACKEND_URL=http://localhost:3000</code>
          </p>
           <p className="mt-2 text-xs text-secondary">(Adjust the URL if your backend runs on a different port or address).</p>
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

    if (!tg || !tg.initData) {
      console.log('Running in browser mode. Using mock data.');
      setUser(MOCK_USER_DATA);
      setLoading(false);
      showBonusPopup(MOCK_USER_DATA.dailyBonus); // Show mock bonus in browser
      return;
    }
    
    const fetchUserData = async () => {
      tg.ready();
      
      try {
        const res = await fetch(`${BACKEND_URL}/api/validate`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ initData: tg.initData }),
        });

        if (!res.ok) {
          throw new Error(`Server responded with status: ${res.status}`);
        }

        const userData = await res.json();
        setUser(userData);

        if (userData.dailyBonus) {
          showBonusPopup(userData.dailyBonus);
        }

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
  
  if (!user) {
    return (
        <div className="flex items-center justify-center h-full">
            <p className="text-secondary">Could not load user data.</p>
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
