import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { User, Star, Flame, Award, Calendar, LoaderCircle } from 'lucide-react';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL;

// Mock data for browser-based testing
const MOCK_STATS_DATA = {
  first_name: 'Dev User',
  username: 'devuser',
  points: 5400,
  level: 8,
  daily_streak: 5,
  created_at: new Date().toISOString(),
};

const StatCard = ({ icon, label, value, color }) => (
  <motion.div
    className="bg-nav p-4 rounded-lg flex items-center"
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.5 }}
  >
    <div className={`mr-4 ${color}`}>
      {icon}
    </div>
    <div>
      <p className="text-secondary text-sm">{label}</p>
      <p className="text-xl font-bold text-primary">{value}</p>
    </div>
  </motion.div>
);

const ProfilePage = () => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const tg = window.Telegram?.WebApp;

    if (!tg || !tg.initData) {
      console.log('Running in browser mode. Using mock profile data.');
      setStats(MOCK_STATS_DATA);
      setLoading(false);
      return;
    }

    const fetchUserStats = async () => {
      try {
        const res = await fetch(`${BACKEND_URL}/api/user-stats`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ initData: tg.initData }),
        });

        if (!res.ok) {
          throw new Error(`Server responded with status: ${res.status}`);
        }

        const data = await res.json();
        setStats(data);
      } catch (err) {
        setError(`Failed to fetch stats: ${err.message}`);
      } finally {
        setLoading(false);
      }
    };

    fetchUserStats();
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
        <p>Could not load profile.</p>
        <p className="text-sm text-secondary">{error}</p>
      </div>
    );
  }

  if (!stats) return null;

  return (
    <div className="p-4 space-y-6">
      <motion.div
        className="flex flex-col items-center"
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
      >
        <div className="w-24 h-24 bg-nav rounded-full flex items-center justify-center mb-4">
          <User className="w-12 h-12 text-secondary" />
        </div>
        <h1 className="text-3xl font-bold text-primary">{stats.first_name}</h1>
        <p className="text-secondary">@{stats.username || 'telegram_user'}</p>
      </motion.div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <StatCard 
          icon={<Star size={28} />} 
          label="Total Points" 
          value={stats.points.toLocaleString()} 
          color="text-accent"
        />
        <StatCard 
          icon={<Flame size={28} />} 
          label="Daily Streak" 
          value={`${stats.daily_streak} Days`} 
          color="text-accent"
        />
        <StatCard 
          icon={<Award size={28} />} 
          label="Current Level" 
          value={stats.level}
          color="text-secondary"
        />
        <StatCard 
          icon={<Calendar size={28} />} 
          label="Member Since" 
          value={new Date(stats.created_at).toLocaleDateString()}
          color="text-secondary"
        />
      </div>
    </div>
  );
};

export default ProfilePage;
