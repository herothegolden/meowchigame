import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ShoppingCart, Star, LoaderCircle, PlusCircle, ChevronsUp, Badge } from 'lucide-react';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL;

// A mapping from the icon names we stored in the database to the actual React components.
const iconComponents = {
  PlusCircle: <PlusCircle size={28} />,
  ChevronsUp: <ChevronsUp size={28} />,
  Badge: <Badge size={28} />,
  Default: <Star size={28} /> // A fallback icon
};

const ShopItemCard = ({ item }) => {
  const Icon = iconComponents[item.icon_name] || iconComponents.Default;

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
      <button className="bg-accent text-background font-bold py-2 px-4 rounded-lg flex items-center transition-transform hover:scale-105">
        <Star className="w-4 h-4 mr-2" />
        {item.price.toLocaleString()}
      </button>
    </motion.div>
  );
};

const ShopPage = () => {
  const [items, setItems] = useState([]);
  const [userPoints, setUserPoints] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const tg = window.Telegram?.WebApp;

    const fetchData = async () => {
      try {
        // Fetch both shop items and user stats concurrently for speed
        const [itemsRes, statsRes] = await Promise.all([
          fetch(`${BACKEND_URL}/api/shop-items`),
          fetch(`${BACKEND_URL}/api/user-stats`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ initData: tg?.initData }),
          })
        ]);

        if (!itemsRes.ok) throw new Error('Failed to fetch shop items.');
        if (!statsRes.ok) throw new Error('Failed to fetch user points.');

        const itemsData = await itemsRes.json();
        const statsData = await statsRes.json();

        setItems(itemsData);
        setUserPoints(statsData.points);

      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
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
        <p>Could not load the shop.</p>
        <p className="text-sm text-secondary">{error}</p>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-6">
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
        <div className="bg-nav p-2 px-4 rounded-lg flex items-center">
          <Star className="w-5 h-5 mr-2 text-accent" />
          <span className="text-xl font-bold">{userPoints.toLocaleString()}</span>
        </div>
      </motion.div>

      <div className="space-y-4">
        {items.map(item => (
          <ShopItemCard key={item.id} item={item} />
        ))}
      </div>
    </div>
  );
};

export default ShopPage;
