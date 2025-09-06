import React, { useState, useEffect } from 'react';
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

// Always available shop items
const SHOP_ITEMS = [
  { id: 1, name: 'Extra Time +10s', description: '+10 seconds to your next game', price: 750, icon_name: 'Clock', type: 'consumable', category: 'time' },
  { id: 2, name: 'Extra Time +20s', description: '+20 seconds to your next game', price: 1500, icon_name: 'Timer', type: 'consumable', category: 'time' },
  { id: 3, name: 'Cookie Bomb', description: 'Start with a bomb that clears 3x3 area', price: 1000, icon_name: 'Bomb', type: 'consumable', category: 'bomb' },
  { id: 4, name: 'Double Points', description: '2x points for your next game', price: 1500, icon_name: 'ChevronsUp', type: 'consumable', category: 'multiplier' },
  { id: 5, name: 'Cookie Master Badge', description: 'Golden cookie profile badge', price: 5000, icon_name: 'Badge', type: 'permanent', category: 'badge' },
  { id: 6, name: 'Speed Demon Badge', description: 'Lightning bolt profile badge', price: 7500, icon_name: 'Zap', type: 'permanent', category: 'badge' },
  { id: 7, name: 'Champion Badge', description: 'Trophy profile badge', price: 10000, icon_name: 'Trophy', type: 'permanent', category: 'badge' }
];

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
  const [userPoints, setUserPoints] = useState(4735); // Use the points shown in your screenshot
  const [inventory, setInventory] = useState([]);
  const [ownedBadges, setOwnedBadges] = useState([]);
  const [loading, setLoading] = useState(true);
  const [connectionStatus, setConnectionStatus] = useState('Connecting...');
  const tg = window.Telegram?.WebApp;

  useEffect(() => {
    const loadShopData = async () => {
      try {
        // Try to fetch real data first
        if (tg && tg.initData && BACKEND_URL) {
          setConnectionStatus('Fetching shop data...');
          
          const res = await fetch(`${BACKEND_URL}/api/get-shop-data`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ initData: tg.initData }),
          });

          if (res.ok) {
            const data = await res.json();
            setUserPoints(data.userPoints);
            setInventory(data.inventory || []);
            setOwnedBadges(data.ownedBadges || []);
            setConnectionStatus('Connected to server');
          } else {
            throw new Error(`API Error: ${res.status}`);
          }
        } else {
          setConnectionStatus('Using offline mode');
        }
      } catch (error) {
        console.error('Failed to load shop data:', error);
        setConnectionStatus(`Offline mode: ${error.message}`);
      } finally {
        setLoading(false);
      }
    };

    loadShopData();
  }, [tg]);

  const handlePurchase = async (itemId) => {
    const item = SHOP_ITEMS.find(i => i.id === itemId);
    if (!item) return;

    try {
      if (tg && tg.initData && BACKEND_URL) {
        // Try real purchase
        const res = await fetch(`${BACKEND_URL}/api/buy-item`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ initData: tg.initData, itemId }),
        });

        const result = await res.json();
        if (!res.ok) throw new Error(result.error);

        // Success
        tg.HapticFeedback?.notificationOccurred('success');
        tg.showPopup({
          title: 'Success!',
          message: result.message,
          buttons: [{ type: 'ok' }]
        });

        // Update local state
        setUserPoints(result.newPoints);
        
      } else {
        // Demo mode
        if (userPoints >= item.price) {
          setUserPoints(prev => prev - item.price);
          
          // Show success message
          const message = `Demo: Purchased ${item.name} for ${item.price} points!`;
          if (tg && tg.showPopup) {
            tg.showPopup({
              title: 'Demo Purchase',
              message: message,
              buttons: [{ type: 'ok' }]
            });
          } else {
            alert(message);
          }
        } else {
          const message = 'Not enough points!';
          if (tg && tg.showPopup) {
            tg.showPopup({
              title: 'Error',
              message: message,
              buttons: [{ type: 'ok' }]
            });
          } else {
            alert(message);
          }
        }
      }
    } catch (error) {
      console.error('Purchase error:', error);
      tg?.HapticFeedback?.notificationOccurred('error');
      
      const message = error.message || 'Purchase failed';
      if (tg && tg.showPopup) {
        tg.showPopup({
          title: 'Error',
          message: message,
          buttons: [{ type: 'ok' }]
        });
      } else {
        alert(message);
      }
    }
  };

  // Group items by category
  const itemsByCategory = SHOP_ITEMS.reduce((acc, item) => {
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
          <span className="text-xl font-bold">{userPoints.toLocaleString()}</span>
        </div>
      </motion.div>

      {/* Connection status */}
      <div className="text-xs text-center text-secondary">
        {loading ? (
          <div className="flex items-center justify-center space-x-2">
            <LoaderCircle className="w-4 h-4 animate-spin" />
            <span>{connectionStatus}</span>
          </div>
        ) : (
          <span>{connectionStatus}</span>
        )}
      </div>

      {/* Shop Categories */}
      <div className="space-y-8">
        {Object.entries(categoryConfig).map(([category, categoryData]) => (
          <CategorySection
            key={category}
            category={category}
            categoryData={categoryData}
            items={itemsByCategory[category] || []}
            userPoints={userPoints}
            onPurchase={handlePurchase}
            inventory={inventory}
            ownedBadges={ownedBadges}
          />
        ))}
      </div>
    </div>
  );
};

export default ShopPage;
