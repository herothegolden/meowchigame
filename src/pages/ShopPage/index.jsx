import React, { useState, useEffect, useRef } from 'react';
import { apiCall, showError } from '../../utils/api';
import { ErrorState } from '../../components/ErrorState';
import { LoadingState } from '../../components/LoadingState';
import ShopHeader from './ShopHeader';
import CategorySection from './CategorySection';
import { motion } from 'framer-motion';

const getCategoryFromItem = (item) => {
  if (item.name.includes('Time') || item.name.includes('time')) return 'time';
  if (item.name.includes('Bomb') || item.name.includes('bomb')) return 'bomb';
  if (item.name.includes('Points') || item.name.includes('Double') || item.name.includes('Booster')) return 'multiplier';
  if (item.name.includes('Badge') || item.type === 'permanent') return 'badge';
  return 'other';
};

const ShopPage = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [purchasing, setPurchasing] = useState(null);
  const [justPurchased, setJustPurchased] = useState(null);
  
  // FIXED: Use ref for immediate, render-independent purchase blocking
  const purchaseInProgress = useRef(new Set());

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      const result = await apiCall('/api/get-shop-data');
      
      const processedItems = (result.items || [])
        .filter(item => item.id !== 2)
        .map(item => ({
          ...item,
          category: getCategoryFromItem(item)
        }));

      setData({
        items: processedItems,
        userPoints: result.userPoints || 0,
        inventory: result.inventory || [],
        ownedBadges: result.ownedBadges || []
      });
    } catch (err) {
      console.error('Failed to load shop data:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const updateInventory = (inventory, itemId) => {
    const existingItem = inventory.find(inv => inv.item_id === itemId);
    if (existingItem) {
      return inventory.map(inv => 
        inv.item_id === itemId 
          ? { ...inv, quantity: inv.quantity + 1 }
          : inv
      );
    } else {
      return [...inventory, { item_id: itemId, quantity: 1 }];
    }
  };

  const updateBadges = (badges, itemId, items) => {
    const item = items.find(i => i.id === itemId);
    if (item && item.category === 'badge') {
      return [...badges, item.name];
    }
    return badges;
  };

  const handlePurchase = async (itemId) => {
    // FIXED: Immediate synchronous blocking using ref
    if (purchaseInProgress.current.has(itemId)) {
      console.log('Purchase blocked - already in progress for item:', itemId);
      return;
    }

    const item = data.items.find(i => i.id === itemId);
    if (!item) return;

    // FIXED: Immediately add to blocking set (synchronous, no race condition possible)
    purchaseInProgress.current.add(itemId);
    setPurchasing(itemId);

    try {
      console.log('Making purchase API call for item:', itemId);
      const result = await apiCall('/api/shop/purchase', { itemId });
      
      // Update local state with new data
      setData(prev => ({
        ...prev,
        userPoints: result.newPoints,
        inventory: updateInventory(prev.inventory, itemId),
        ownedBadges: updateBadges(prev.ownedBadges, itemId, prev.items)
      }));

      // Visual feedback without popup
      setJustPurchased(itemId);
      setTimeout(() => setJustPurchased(null), 800);

      console.log('Purchase completed successfully for item:', itemId);

    } catch (err) {
      console.error('Purchase error for item:', itemId, err);
      showError(err.message);
    } finally {
      // FIXED: Always remove from blocking set and clear purchasing state
      setTimeout(() => {
        purchaseInProgress.current.delete(itemId);
        setPurchasing(prevPurchasing => prevPurchasing === itemId ? null : prevPurchasing);
      }, 1000); // Longer delay to ensure no rapid re-purchases
    }
  };

  if (loading) return <LoadingState />;
  if (error) return <ErrorState error={error} onRetry={fetchData} />;
  if (!data) return <ErrorState error="No data available" onRetry={fetchData} />;

  const itemsByCategory = {
    time: data.items.filter(item => item.category === 'time'),
    bomb: data.items.filter(item => item.category === 'bomb'),
    multiplier: data.items.filter(item => item.category === 'multiplier'),
    badge: data.items.filter(item => item.category === 'badge')
  };

  return (
    <div className="p-4 space-y-6 bg-background text-primary">
      <ShopHeader points={data.userPoints} />

      {['time', 'bomb', 'multiplier', 'badge'].map(category => (
        <CategorySection
          key={category}
          category={category}
          items={itemsByCategory[category]}
          userPoints={data.userPoints}
          inventory={data.inventory}
          ownedBadges={data.ownedBadges}
          onPurchase={handlePurchase}
          purchasing={purchasing}
          justPurchased={justPurchased}
        />
      ))}
    </div>
  );
};

export default ShopPage;
