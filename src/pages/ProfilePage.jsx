import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { User, Star, Flame, Award, Calendar, LoaderCircle, Badge, ChevronsUp, Clock, AlertTriangle } from 'lucide-react';

// A map to dynamically render icons for items
const iconMap = {
  Badge,
  ChevronsUp,
  Clock,
};

const ProfilePage = () => {
  const [profileData, setProfileData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  const tg = window.Telegram?.WebApp;

  const fetchProfileData = useCallback(async () => {
    if (!tg?.initData) {
      setError("Telegram data not available. Please open this app inside Telegram.");
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const res = await fetch(`/api/get-profile-data`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ initData: tg.initData }),
      });

      if (!res.ok) {
        throw new Error(`Server responded with ${res.status}`);
      }
      
      const data = await res.json();
      setProfileData(data);

    } catch (err) {
      setError(`Failed to fetch profile data: ${err.message}`);
    } finally {
      setLoading(false);
    }
  }, [tg]);

  useEffect(() => {
    fetchProfileData();
  }, [fetchProfileData]);
  
  const handleActivateItem = async (itemId) => {
    if(!tg?.initData) return;
    
    tg.HapticFeedback.impactOccurred('light');

    try {
        const res = await fetch(`/api/activate-item`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ initData: tg.initData, itemId }),
        });
        const result = await res.json();

        if (!res.ok || !result.success) {
            throw new Error(result.error || 'Failed to activate item.');
        }

        tg.showPopup({
            title: 'Success!',
            message: `Booster activated for your next game!`,
            buttons: [{ type: 'ok' }]
        });
        
        // Refresh data to show updated inventory and status
        fetchProfileData();

    } catch (err) {
        tg.showPopup({
            title: 'Activation Failed',
            message: err.message,
            buttons: [{ type: 'ok' }]
        });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <LoaderCircle className="w-12 h-12 text-accent animate-spin" />
      </div>
    );
  }

  if (error || !profileData) {
    return (
      <div className="p-4 text-center text-red-400">
        <AlertTriangle className="w-12 h-12 mx-auto mb-2" />
        <h1 className="text-xl font-bold">Could not load profile.</h1>
        <p className="text-sm text-secondary">{error}</p>
      </div>
    );
  }
  
  const { stats, inventory } = profileData;
  const consumableItems = inventory.filter(item => item.type === 'consumable');
  const permanentItems = inventory.filter(item => item.type === 'permanent');
  const boosterActive = stats.point_booster_active || stats.extra_time_active;

  return (
    <div className="p-4 space-y-6">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col items-center text-center space-y-2"
      >
        <div className="w-24 h-24 bg-nav rounded-full flex items-center justify-center">
          <User className="w-12 h-12 text-secondary" />
        </div>
        <div>
          <h1 className="text-3xl font-bold">{stats.first_name}</h1>
          {stats.username && <p className="text-secondary">@{stats.username}</p>}
        </div>
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0, transition: { delay: 0.2 } }} className="grid grid-cols-2 gap-4">
        <StatCard icon={Star} label="Total Points" value={stats.points.toLocaleString()} />
        <StatCard icon={Flame} label="Daily Streak" value={`${stats.daily_streak} Days`} />
        <StatCard icon={Award} label="Current Level" value={stats.level} />
        <StatCard icon={Calendar} label="Member Since" value={new Date(stats.created_at).toLocaleDateString()} />
      </motion.div>
      
      {boosterActive && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1, transition: { delay: 0.4 } }} className="bg-green-500/20 text-green-300 p-4 rounded-lg text-center font-bold">
              A booster is currently active for your next game!
          </motion.div>
      )}

      <div className="space-y-4">
        <h2 className="font-bold text-xl text-secondary">My Boosters</h2>
        {consumableItems.length > 0 ? (
            <div className="space-y-3">
                {consumableItems.map(item => {
                    const Icon = iconMap[item.icon_name];
                    return (
                        <motion.div key={item.id} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0, transition: { delay: 0.5 } }} className="bg-nav p-4 rounded-lg flex items-center justify-between">
                            <div className="flex items-center space-x-4">
                                {Icon && <Icon className="w-8 h-8 text-accent" />}
                                <span className="font-bold">{item.name}</span>
                            </div>
                            <button onClick={() => handleActivateItem(item.id)} disabled={boosterActive} className="bg-accent text-background font-bold py-2 px-4 rounded-lg disabled:bg-gray-600 disabled:cursor-not-allowed">
                                Activate
                            </button>
                        </motion.div>
                    );
                })}
            </div>
        ) : (
            <p className="text-secondary text-center py-4">No boosters in your inventory. Visit the shop!</p>
        )}
      </div>

       <div className="space-y-4">
        <h2 className="font-bold text-xl text-secondary">My Items</h2>
        {permanentItems.length > 0 ? (
            <div className="space-y-3">
                {permanentItems.map(item => {
                     const Icon = iconMap[item.icon_name];
                     return (
                        <motion.div key={item.id} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0, transition: { delay: 0.6 } }} className="bg-nav p-4 rounded-lg flex items-center space-x-4">
                            {Icon && <Icon className="w-8 h-8 text-secondary" />}
                            <span className="font-bold">{item.name}</span>
                        </motion.div>
                    );
                })}
            </div>
        ) : (
             <p className="text-secondary text-center py-4">No permanent items yet.</p>
        )}
      </div>

    </div>
  );
};

const StatCard = ({ icon: Icon, label, value }) => (
  <div className="bg-nav p-4 rounded-lg">
    <div className="flex items-center text-secondary mb-1">
      <Icon className="w-4 h-4 mr-2" />
      <span className="text-sm">{label}</span>
    </div>
    <p className="text-2xl font-bold text-primary">{value}</p>
  </div>
);

export default ProfilePage;

