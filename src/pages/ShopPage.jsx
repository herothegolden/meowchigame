import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { ShoppingCart, Star, LoaderCircle, PlusCircle, ChevronsUp, Badge, CheckCircle, AlertTriangle } from 'lucide-react';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL;

const iconComponents = {
  Clock: <Clock size={28} />, // Using Clock icon for the item
  ChevronsUp: <ChevronsUp size={28} />,
  Badge: <Badge size={28} />,
  Default: <Star size={28} />
};

const ShopItemCard = ({ item, userPoints, onPurchase, isOwned }) => {
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
      className="bg-nav p-4 rounded-lg flex items-center justify-between"
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.5 }}
    >
      <div className="flex items-center">
        <div className="mr-4 text-accent">{Icon}</div>
        <div>
          <p className="font-bold text-primary">{item.name}</p>
          <p className="text-sm text-secondary">{item.description}</p>
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

const ShopPage = () => {
  const [shopData, setShopData] = useState({ items: [], userPoints: 0, inventory: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const tg = window.Telegram?.WebApp;

  const fetchShopData = useCallback(async () => {
    if (!tg?.initData) {
      setError("Telegram data not available.");
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const res = await fetch(`${BACKEND_URL}/api/get-shop-data`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ initData: tg.initData }),
      });

      if (!res.ok) throw new Error('Failed to fetch shop data from server.');
      
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
      
      tg.HapticFeedback.notificationOccurred('success');

      tg.showPopup({
        title: 'Success!',
        message: result.message, // Using the new message from the backend
        buttons: [{ type: 'ok' }]
      });
      
      // Refresh data to show new point total and inventory
      fetchShopData();

    } catch (err) {
      tg.HapticFeedback.notificationOccurred('error');
      
      // FIX: Provide a more specific error message for server failures.
      let errorMessage = 'An unexpected error occurred. Please try again.';
      if (err.message.toLowerCase().includes('failed to fetch')) {
          errorMessage = 'Could not connect to the server.';
      } else if (err.message.includes('JSON')) {
          errorMessage = 'Internal server error during purchase.';
      } else {
          errorMessage = err.message;
      }

      tg.showPopup({
        title: 'Error',
        message: errorMessage,
        buttons: [{ type: 'ok' }]
      });
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center h-full"><LoaderCircle className="w-12 h-12 text-accent animate-spin" /></div>;
  }

  if (error) {
    return (
        <div className="p-4 text-center text-red-400">
            <AlertTriangle className="w-12 h-12 mx-auto mb-2" />
            <h1 className="text-xl font-bold">Could not load the shop.</h1>
            <p className="text-sm text-secondary">{error}</p>
        </div>
    );
  }

  return (
    <div className="p-4 space-y-6">
      <motion.div className="flex items-center justify-between" initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
        <div className="flex items-center">
          <ShoppingCart className="w-8 h-8 mr-3 text-secondary" />
          <h1 className="text-3xl font-bold">Shop</h1>
        </div>
        <div className="bg-nav p-2 px-4 rounded-lg flex items-center">
          <Star className="w-5 h-5 mr-2 text-accent" />
          <span className="text-xl font-bold">{shopData.userPoints.toLocaleString()}</span>
        </div>
      </motion.div>

      <div className="space-y-4">
        {shopData.items.map(item => (
          <ShopItemCard 
            key={item.id} 
            item={item} 
            userPoints={shopData.userPoints}
            onPurchase={handlePurchase}
            isOwned={item.type === 'permanent' && shopData.inventory.includes(item.id)}
          />
        ))}
      </div>
    </div>
  );
};

export default ShopPage;
