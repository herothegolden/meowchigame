import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { User, Star, LoaderCircle } from 'lucide-react';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL;

const ProfilePage = () => {
  const [stats, setStats] = useState(null);
  const [inventory, setInventory] = useState([]);
  const [ownedBadges, setOwnedBadges] = useState([]);
  const [loading, setLoading] = useState(true);
  const [connectionStatus, setConnectionStatus] = useState('Connecting...');
  const tg = window.Telegram?.WebApp;

  useEffect(() => {
    const fetchProfileData = async () => {
      try {
        if (tg && tg.initData && BACKEND_URL) {
          setConnectionStatus('Fetching profile data...');
          const res = await fetch(`${BACKEND_URL}/api/get-user-stats`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ initData: tg.initData }),
          });

          if (res.ok) {
            const data = await res.json();
            setStats(data.stats || {});
            const normalizedInventory = (data.inventory || []).map(it => ({
              ...it,
              quantity: Number(it.quantity || 0)
            }));
            setInventory(normalizedInventory);
            setOwnedBadges(data.ownedBadges || []);
            setConnectionStatus('Connected to server');
          } else {
            throw new Error(`API Error: ${res.status}`);
          }
        } else {
          throw new Error('No Telegram data or backend URL');
        }
      } catch (error) {
        console.error('Failed to load profile data:', error);
        setConnectionStatus('Connection failed');
        setStats({});
        setInventory([]);
        setOwnedBadges([]);
      } finally {
        setLoading(false);
      }
    };

    fetchProfileData();
  }, [tg]);

  return (
    <div className="p-4 space-y-6 bg-background text-primary">
      <motion.div
        className="flex items-center justify-between"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div className="flex items-center">
          <User className="w-8 h-8 mr-3 text-secondary" />
          <h1 className="text-3xl font-bold">Profile</h1>
        </div>
        <motion.div
          className="bg-nav p-2 px-4 rounded-lg flex items-center border border-gray-700"
          key={stats?.points || 0}
          initial={{ scale: 1.1, backgroundColor: '#10B981' }}
          animate={{ scale: 1, backgroundColor: '#212426' }}
          transition={{ duration: 0.4 }}
        >
          <Star className="w-5 h-5 mr-2 text-accent" />
          <span className="text-xl font-bold">
            {(stats?.points || 0).toLocaleString()}
          </span>
        </motion.div>
      </motion.div>

      <p className="text-secondary">{connectionStatus}</p>

      {loading ? (
        <div className="flex justify-center items-center py-10">
          <LoaderCircle className="w-10 h-10 animate-spin text-secondary" />
        </div>
      ) : (
        <div className="space-y-6">
          {/* Stats Section */}
          <div>
            <h2 className="text-xl font-bold mb-2">Statistics</h2>
            <ul className="space-y-1">
              <li>Games Played: {stats?.gamesPlayed || 0}</li>
              <li>High Score: {stats?.highScore || 0}</li>
              <li>Total Points: {stats?.points || 0}</li>
            </ul>
          </div>

          {/* Inventory Section */}
          <div>
            <h2 className="text-xl font-bold mb-2">Inventory</h2>
            {inventory.length > 0 ? (
              <ul className="space-y-1">
                {inventory.map(item => (
                  <li key={item.item_id}>
                    {item.name} — {item.quantity}
                  </li>
                ))}
              </ul>
            ) : (
              <p>No items owned.</p>
            )}
          </div>

          {/* Badges Section */}
          <div>
            <h2 className="text-xl font-bold mb-2">Badges</h2>
            {ownedBadges.length > 0 ? (
              <ul className="space-y-1">
                {ownedBadges.map((badge, idx) => (
                  <li key={idx}>{badge}</li>
                ))}
              </ul>
            ) : (
              <p>No badges earned.</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default ProfilePage;
