import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { ShoppingCart, Star, LoaderCircle, Clock, Timer, Bomb, ChevronsUp, Badge, Zap, Trophy, CheckCircle } from 'lucide-react';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL;

const iconComponents = {
  Clock: <Clock size={28} />,
  Timer: <Timer size={28} />,
  Bomb: <Bomb size={28} />,
  ChevronsUp: <ChevronsUp size={28} />,
  Badge: <Badge size={28} />,
  Zap: <Zap size={28} />,
  Trophy: <Trophy size={28} />,
  Default: <Star size={28} />
};

const categoryConfig = {
  time: { name: 'Time Boosters', icon: '⏰', color: 'text-blue-400' },
  bomb: { name: 'Cookie Bombs', icon: '💣', color: 'text-red-400' },
  multiplier: { name: 'Point Multipliers', icon: '2️⃣', color: 'text-green-400' },
  badge: { name: 'Profile Badges', icon: '🏆', color: 'text-yellow-400' }
};

const ShopItemCard = ({ item, userPoints, onPurchase, isOwned, ownedQuantity = 0 }) => {
  const Icon = iconComponents[item.icon_name] || iconComponents.Default;
  const canAfford = userPoints >= item.price;
  const [isBuying, setIsBuying] = useState(false);

  const handleBuyClick = async () => {
    setIsBuying(true);
    await onPurchase(item.id);
    setIsBuying(false);
  };

  return (
    <motion.div
      className="bg-nav p-4 rounded-lg flex items-center justify-between border border-gray-700"
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.5 }}
    >
      <div className="flex items-center">
        <div className="mr-4 text-accent">{Icon}</div>
        <div>
          <p className="font-bold text-primary">{item.name}</p>
          <p className="text-sm text-secondary">{item.description}</p>
          {item.type === 'consumable' && ownedQuantity > 0 && (
            <p className="text-xs text-accent mt-1">Owned: {ownedQuantity}</p>
          )}
        </div>
      </div>
      
      {isOwned && item.type === 'permanent' ? (
        <div className="flex items-center text-green-400 font-bold py-2 px-4">
          <CheckCircle className="w-5 h-5 mr-2" />
          Owned
        </div>
      ) : (
        <button 
          onClick={handleBuyClick}
          disabled={!canAfford || isBuying}
          className={`font-bold py-2 px-4 rounded-lg flex items-center transition-all duration-200 ${
            canAfford 
              ? 'bg-accent text-background hover:scale-105' 
              : 'bg-gray-600 text-gray-400 cursor-not-allowed'
          }`}
        >
          {isBuying ? (
            <LoaderCircle className="w-5 h-5 animate-spin" />
          ) : (
            <>
              <Star className="w-4 h-4 mr-2" />
              {item.price.toLocaleString()}
            </>
          )}
        </button>
      )}
    </motion.div>
  );
};

const CategorySection = ({ category, categoryData, items, userPoints, onPurchase, inventory, ownedBadges }) => {
  if (items.length === 0) return null;

  return (
    <motion.div 
      className="space-y-4"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <div className="flex items-center space-x-3">
        <span className="text-2xl">{categoryData.icon}</span>
        <h2 className={`text-xl font-bold ${categoryData.color}`}>{categoryData.name}</h2>
      </div>
      <div className="space-y-3">
        {items.map(item => {
          let isOwned = false;
          let ownedQuantity = 0;

          if (item.category === 'badge') {
            isOwned = ownedBadges.includes(item.name);
          } else {
            const inventoryItem = inventory.find(inv => inv.item_id === item.id);
            if (inventoryItem) {
              ownedQuantity = inventoryItem.quantity;
              isOwned = item.type === 'permanent';
            }
          }

          return (
            <ShopItemCard 
              key={item.id} 
              item={item} 
              userPoints={userPoints}
              onPurchase={onPurchase}
              isOwned={isOwned}
              ownedQuantity={ownedQuantity}
            />
          );
        })}
      </div>
    </motion.div>
  );
};

const ShopPage = () => {
  const [shopData, setShopData] = useState({ 
    items: [], 
    userPoints: 0, 
    inventory: [], 
    ownedBadges: [] 
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const tg = window.Telegram?.WebApp;

  const fetchShopData = useCallback(async () => {
    try {
      const res = await fetch(`${BACKEND_URL}/api/get-shop-data`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ initData: tg?.initData }),
      });

      if (!res.ok) throw new Error('Failed to fetch shop data.');
      
      const data = await res.json();
      setShopData(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [tg]);

  useEffect(() => {
    fetchShopData();
  }, [fetchShopData]);

  const handlePurchase = async (itemId) => {
    if (!tg) return;

    try {
      const res = await fetch(`${BACKEND_URL}/api/buy-item`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ initData: tg.initData, itemId }),
      });

      const result = await res.json();

      if (!res.ok) {
        throw new Error(result.error || 'Purchase failed.');
      }
      
      // Haptic feedback for success
      tg.HapticFeedback.notificationOccurred('success');

      // Show a success popup
      tg.showPopup({
        title: 'Success!',
        message: result.message,
        buttons: [{ type: 'ok' }]
      });
      
      // Refresh shop data
      fetchShopData();

    } catch (err) {
      // Haptic feedback for error
      tg.HapticFeedback.notificationOccurred('error');
      
      // Show an error popup
      tg.showPopup({
        title: 'Error',
        message: err.message,
        buttons: [{ type: 'ok' }]
      });
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center h-full"><LoaderCircle className="w-12 h-12 text-accent animate-spin" /></div>;
  }

  if (error) {
    return <div className="p-4 text-center text-red-400"><p>Could not load the shop.</p><p className="text-sm text-secondary">{error}</p></div>;
  }

  // Group items by category
  const itemsByCategory = shopData.items.reduce((acc, item) => {
    if (!acc[item.category]) acc[item.category] = [];
    acc[item.category].push(item);
    return acc;
  }, {});

  return (
    <div className="p-4 space-y-6 bg-background text-primary">
      <motion.div 
        className="flex items-center justify-between" 
        initial={{ opacity: 0, y: -20 }} 
        animate={{ opacity: 1, y: 0 }} 
        transition={{ duration: 0.5 }}
      >
        <div className="flex items-center">
          <ShoppingCart className="w-8 h-8 mr-3 text-secondary" />
          <h1 className="text-3xl font-bold">Shop</h1>
        </div>
        <div className="bg-nav p-2 px-4 rounded-lg flex items-center border border-gray-700">
          <Star className="w-5 h-5 mr-2 text-accent" />
          <span className="text-xl font-bold">{shopData.userPoints.toLocaleString()}</span>
        </div>
      </motion.div>

      <div className="space-y-8">
        {Object.entries(categoryConfig).map(([category, categoryData]) => (
          <CategorySection
            key={category}
            category={category}
            categoryData={categoryData}
            items={itemsByCategory[category] || []}
            userPoints={shopData.userPoints}
            onPurchase={handlePurchase}
            inventory={shopData.inventory}
            ownedBadges={shopData.ownedBadges}
          />
        ))}
      </div>
    </div>
  );
};

export default ShopPage;
