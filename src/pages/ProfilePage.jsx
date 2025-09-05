import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { User, Star, Flame, Award, Calendar, Package, Zap, LoaderCircle, ChevronsUp, ShieldAlert } from 'lucide-react';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL;

// --- Helper Components ---

const StatCard = ({ icon, label, value, color }) => (
  <div className="bg-nav p-4 rounded-lg flex items-center">
    <div className={`mr-4 text-${color}`}>{icon}</div>
    <div>
      <p className="text-sm text-secondary">{label}</p>
      <p className="text-lg font-bold text-primary">{value}</p>
    </div>
  </div>
);

const InventoryItemCard = ({ item, onActivate, disabled }) => {
  const [isActivating, setIsActivating] = useState(false);

  const handleActivate = async () => {
    setIsActivating(true);
    await onActivate(item.id);
    setIsActivating(false);
  };

  return (
    <div className="bg-nav p-4 rounded-lg flex items-center justify-between">
      <div className="flex items-center">
        <div className="mr-4 text-accent"><ChevronsUp size={28} /></div>
        <div>
          <p className="font-bold text-primary">{item.name}</p>
          <p className="text-sm text-secondary">{item.description}</p>
        </div>
      </div>
      <button 
        onClick={handleActivate}
        disabled={disabled || isActivating}
        className={`font-bold py-2 px-4 rounded-lg flex items-center transition-all duration-200 ${
          disabled 
            ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
            : 'bg-accent text-background hover:scale-105'
        }`}
      >
        {isActivating ? <LoaderCircle className="w-5 h-5 animate-spin" /> : 'Activate'}
      </button>
    </div>
  );
};


// --- Main Profile Page Component ---

const ProfilePage = () => {
  const [profileData, setProfileData] = useState({ stats: null, inventory: [], allItems: [], boosterActive: false });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const tg = window.Telegram?.WebApp;

  const fetchProfileData = useCallback(async () => {
    if (!tg?.initData) {
      setError("Telegram data not available.");
      setLoading(false);
      return;
    }
    try {
      // Fetch both user stats and shop/inventory data in parallel
      const [statsRes, shopDataRes] = await Promise.all([
        fetch(`${BACKEND_URL}/api/user-stats`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ initData: tg.initData }),
        }),
        fetch(`${BACKEND_URL}/api/get-shop-data`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ initData: tg.initData }),
        })
      ]);

      if (!statsRes.ok || !shopDataRes.ok) {
        throw new Error('Failed to fetch profile data.');
      }

      const stats = await statsRes.json();
      const shopData = await shopDataRes.json();
      
      setProfileData({
        stats,
        inventory: shopData.inventory,
        allItems: shopData.items,
        boosterActive: shopData.boosterActive,
      });

    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [tg]);

  useEffect(() => {
    fetchProfileData();
  }, [fetchProfileData]);

  const handleActivateItem = async (itemId) => {
    try {
      const res = await fetch(`${BACKEND_URL}/api/activate-item`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ initData: tg.initData, itemId }),
      });

      const result = await res.json();
      if (!res.ok) throw new Error(result.error || 'Activation failed.');

      tg.HapticFeedback.notificationOccurred('success');
      tg.showPopup({ title: 'Success!', message: result.message, buttons: [{ type: 'ok' }] });

      // Instantly update UI
      setProfileData(prev => ({
        ...prev,
        inventory: prev.inventory.filter(id => id !== itemId),
        boosterActive: true,
      }));

    } catch (err) {
      tg.HapticFeedback.notificationOccurred('error');
      tg.showPopup({ title: 'Error', message: err.message, buttons: [{ type: 'ok' }] });
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center h-full"><LoaderCircle className="w-12 h-12 text-accent animate-spin" /></div>;
  }

  if (error || !profileData.stats) {
    return <div className="p-4 text-center text-red-400"><p>Could not load profile.</p><p className="text-sm text-secondary">{error}</p></div>;
  }
  
  const { stats, inventory, allItems, boosterActive } = profileData;
  const ownedConsumables = allItems.filter(item => item.type === 'consumable' && inventory.includes(item.id));

  return (
    <div className="p-4 space-y-6">
      {/* --- User Header --- */}
      <motion.div className="flex flex-col items-center text-center space-y-2" initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}>
        <div className="w-24 h-24 bg-nav rounded-full flex items-center justify-center">
          <User className="w-12 h-12 text-secondary" />
        </div>
        <div>
          <h1 className="text-3xl font-bold text-primary">{stats.first_name}</h1>
          <p className="text-secondary">@{stats.username || 'user'}</p>
        </div>
      </motion.div>

      {/* --- Stats Grid --- */}
      <motion.div className="grid grid-cols-2 gap-4" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.2 }}>
        <StatCard icon={<Star size={24} />} label="Total Points" value={stats.points.toLocaleString()} color="accent" />
        <StatCard icon={<Flame size={24} />} label="Daily Streak" value={`${stats.daily_streak} Days`} color="accent" />
        <StatCard icon={<Award size={24} />} label="Current Level" value={stats.level} color="primary" />
        <StatCard icon={<Calendar size={24} />} label="Member Since" value={new Date(stats.created_at).toLocaleDateString()} color="primary" />
      </motion.div>

      {/* --- My Boosters Section --- */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }}>
        <h2 className="text-xl font-bold mb-3 flex items-center"><Package className="w-6 h-6 mr-2 text-secondary"/> My Boosters</h2>
        <div className="space-y-3">
          {boosterActive && (
            <div className="bg-green-800/50 border border-green-500 text-green-300 p-3 rounded-lg flex items-center">
              <Zap className="w-5 h-5 mr-3"/>
              <span>A Point Booster is active for your next game!</span>
            </div>
          )}

          {ownedConsumables.length > 0 ? (
            ownedConsumables.map(item => (
              <InventoryItemCard key={item.id} item={item} onActivate={handleActivateItem} disabled={boosterActive} />
            ))
          ) : (
            !boosterActive && <p className="text-secondary text-center p-4 bg-nav rounded-lg">You have no boosters. Visit the shop to buy some!</p>
          )}
        </div>
      </motion.div>

    </div>
  );
};

export default ProfilePage;
