import React, { useState, useEffect } from 'react';
import { apiCall, showSuccess, showError } from '../../utils/api';
import { ErrorState } from '../../components/ErrorState';
import { LoadingState } from '../../components/LoadingState';
import ShopHeader from './ShopHeader';
import CategorySection from './CategorySection';
import { ShoppingBag, Star } from 'lucide-react';
import { motion } from 'framer-motion';

const getCategoryFromItem = (item) => {
  if (item.name.includes('Time') || item.name.includes('time')) return 'time';
  if (item.name.includes('Bomb') || item.name.includes('bomb')) return 'bomb';
  if (item.name.includes('Points') || item.name.includes('Double') || item.name.includes('Booster')) return 'multiplier';
  if (item.name.includes('Badge') || item.type === 'permanent') return 'badge';
  return 'other';
};

// Physical products data (static for now)
const PHYSICAL_PRODUCTS = [
  {
    id: 'cookie-classic',
    name: 'Viral Classic',
    description: 'oreo & strawberry',
    price: 400, // Telegram Stars
    image: 'https://ik.imagekit.io/59r2kpz8r/Meowchi/3.webp?updatedAt=1758892681518',
    type: 'physical'
  },
  {
    id: 'cookie-matcha',
    name: 'Viral Matcha',
    description: 'matcha, oreo & strawberry',
    price: 400, // Telegram Stars
    image: 'https://ik.imagekit.io/59r2kpz8r/Meowchi/2.webp?updatedAt=1758888699837',
    type: 'physical'
  }
];

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

  const handlePhysicalProductPurchase = (productId) => {
    // Placeholder for Telegram Stars payment integration
    console.log('Physical product purchase:', productId);
    // TODO: Integrate Telegram Stars payment
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
      
      {/* Physical Products Section */}
      <motion.div 
        className="space-y-4"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div className="flex items-center space-x-3">
          <span className="text-2xl">🍪</span>
          <h2 className="text-xl font-bold text-amber-400">Meowchi Marshmallow 쫀득쿠키</h2>
        </div>
        
        <div className="space-y-3">
          {PHYSICAL_PRODUCTS.map((product, index) => (
            <motion.div
              key={product.id}
              className="bg-nav p-4 rounded-lg flex items-center justify-between border border-gray-700 relative overflow-hidden"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
            >
              <div className="flex items-center space-x-4 flex-1">
                {/* Product Image */}
                <div className="w-20 h-20 rounded-lg overflow-hidden bg-background flex-shrink-0">
                  <img 
                    src={product.image} 
                    alt={product.name}
                    className="w-full h-full object-cover"
                  />
                </div>
                
                {/* Product Info */}
                <div className="flex-1">
                  <p className="font-bold text-primary text-lg">{product.name}</p>
                  <p className="text-sm text-secondary">{product.description}</p>
                </div>
              </div>
              
              {/* Purchase Button with Telegram Stars */}
              <motion.button 
                onClick={() => handlePhysicalProductPurchase(product.id)}
                className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-5 rounded-lg flex items-center space-x-2 transition-all duration-200 shadow-lg"
                whileTap={{ scale: 0.95 }}
                whileHover={{ scale: 1.05 }}
              >
                <Star className="w-5 h-5 fill-yellow-400 text-yellow-400" />
                <span className="text-lg">{product.price}</span>
              </motion.button>
            </motion.div>
          ))}
        </div>
        
        {/* Info Badge */}
        <div className="bg-blue-600/10 border border-blue-500/30 rounded-lg p-3 flex items-start space-x-2">
          <ShoppingBag className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm text-blue-400 font-medium">Real Physical Cookies</p>
            <p className="text-xs text-secondary mt-1">
              Purchase with Telegram Stars • Delivery via Yandex Taxi in Tashkent
            </p>
          </div>
        </div>
      </motion.div>

      {/* Divider */}
      <div className="border-t border-gray-700 my-6"></div>

      {/* Digital Items Categories */}
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
