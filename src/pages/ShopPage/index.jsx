import { useState, useEffect } from 'react';
import { apiCall } from '../utils/api';
import { ErrorState } from '../components/ErrorState';
import { LoadingState } from '../components/LoadingState';
import ShopHeader from './ShopHeader';
import CategorySection from './CategorySection';

const ShopPage = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [purchasing, setPurchasing] = useState(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      const result = await apiCall('/api/get-shop-data');
      setData(result);
      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const handlePurchase = async (itemId) => {
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

      showSuccess(result.message);
    } catch (err) {
      showError(err.message);
    } finally {
      setPurchasing(null);
    }
  };

  if (loading) return <LoadingState />;
  if (error) return <ErrorState error={error} onRetry={fetchData} />;

  return (
    <div className="p-4 space-y-6 bg-background text-primary">
      <ShopHeader points={data.userPoints} />
      {['time', 'bomb', 'multiplier', 'badge'].map(category => (
        <CategorySection
          key={category}
          category={category}
          items={filterByCategory(data.items, category)}
          userPoints={data.userPoints}
          inventory={data.inventory}
          ownedBadges={data.ownedBadges}
          onPurchase={handlePurchase}
          purchasing={purchasing}
        />
      ))}
    </div>
  );
};
