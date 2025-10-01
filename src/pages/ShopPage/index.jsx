import React, { useState, useEffect } from 'react';
import { apiCall, showSuccess, showError } from '../../utils/api';
import { ErrorState } from '../../components/ErrorState';
import { LoadingState } from '../../components/LoadingState';
import ShopHeader from './ShopHeader';
import CategorySection from './CategorySection';

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

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      const result = await apiCall('/api/get-shop-data');
      
      // Filter out deprecated item ID 2 and add categories
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
    const item = data.items.find(i => i.id === itemId);
    if (!item) return;

    setPurchasing(itemId);

    try {
      const result = await apiCall('/api/buy-item', { itemId });
      
      // Update local state
      setData(prev => ({
        ...prev,
        userPoints: result.newPoints,
        inventory: updateInventory(prev.inventory, itemId),
        ownedBadges: updateBadges(prev.ownedBadges, itemId, prev.items)
      }));

      // Success animation
      setJustPurchased(itemId);
      setTimeout(() => setJustPurchased(null), 1500);

      showSuccess(result.message);
    } catch (err) {
      console.error('Purchase error:', err);
      showError(err.message);
    } finally {
      setPurchasing(null);
    }
  };

  if (loading) return <LoadingState />;
  if (error) return <ErrorState error={error} onRetry={fetchData} />;
  if (!data) return <ErrorState error="No data available" onRetry={fetchData} />;

  // Group items by category
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
