import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ShoppingCart, Star, LoaderCircle, Clock, Timer, Bomb, ChevronsUp, Badge, Zap, Trophy, CheckCircle, Sparkles } from 'lucide-react';

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

const FALLBACK_SHOP_ITEMS = [
  { id: 1, name: 'Extra Time +10s', description: '+10 seconds to your next game', price: 750, icon_name: 'Clock', type: 'consumable', category: 'time' },
  { id: 3, name: 'Cookie Bomb', description: 'Start with a bomb that clears 3x3 area', price: 1000, icon_name: 'Bomb', type: 'consumable', category: 'bomb' },
  { id: 4, name: 'Double Points', description: '2x points for your next game', price: 1500, icon_name: 'ChevronsUp', type: 'consumable', category: 'multiplier' },
  { id: 5, name: 'Cookie Master', description: 'Golden cookie collectible', price: 5000, icon_name: 'Badge', type: 'permanent', category: 'badge' },
  { id: 6, name: 'Speed Demon', description: 'Lightning bolt collectible', price: 7500, icon_name: 'Zap', type: 'permanent', category: 'badge' },
  { id: 7, name: 'Champion', description: 'Trophy collectible', price: 10000, icon_name: 'Trophy', type: 'permanent', category: 'badge' }
];

const categoryConfig = {
  time: { name: 'Time Boosters', icon: '⏰', color: 'text-blue-400' },
  bomb: { name: 'Cookie Bombs', icon: '💣', color: 'text-red-400' },
  multiplier: { name: 'Point Multipliers', icon: '2️⃣', color: 'text-green-400' },
  badge: { name: 'Collectibles', icon: '🏆', color: 'text-yellow-400' }
};

const ShopItemCard = ({ item, userPoints, onPurchase, isOwned, ownedQuantity = 0, isPurchasing, justPurchased }) => {
  const Icon = iconComponents[item.icon_name] || iconComponents.Default;
  const canAfford = userPoints >= item.price;

  return (
    <motion.div
      className="bg-nav p-4 rounded-lg flex items-center justify-between border border-gray-700 relative overflow-hidden"
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.5 }}
      layout
    >
      {/* Purchase success animation */}
      <AnimatePresence>
        {justPurchased && (
          <motion.div
            className="absolute inset-0 bg-green-500/20 flex items-center justify-center z-10"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.2 }}
            transition={{ duration: 0.6 }}
          >
            <motion.div
              className="flex items-center text-green-400 font-bold"
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: -20, opacity: 0 }}
            >
              <Sparkles className="w-5 h-5 mr-2" />
              Purchased!
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex items-center">
        <motion.div 
          className="mr-4 text-accent"
          animate={isPurchasing ? { rotate: [0, 10, -10, 0] } : {}}
          transition={{ duration: 0.5, repeat: isPurchasing ? Infinity : 0 }}
        >
          {Icon}
        </motion.div>
        <div>
          <p className="font-bold text-primary">{item.name}</p>
          <p className="text-sm text-secondary">{item.description}</p>
          {item.type === 'consumable' && ownedQuantity > 0 && (
            <motion.p 
              className="text-xs text-accent mt-1"
              key={ownedQuantity} // Re-animate when quantity changes
              initial={{ scale: 1.2, color: '#10B981' }}
              animate={{ scale: 1, color: '#EAB308' }}
              transition={{ duration: 0.3 }}
            >
              Owned: {ownedQuantity}
            </motion.p>
          )}
        </div>
      </div>
      
      {isOwned && item.type === 'permanent' ? (
        <motion.div 
          className="flex items-center text-green-400 font-bold py-2 px-4"
          initial={{ scale: 0.8 }}
          animate={{ scale: 1 }}
          transition={{ duration: 0.3 }}
        >
          <CheckCircle className="w-5 h-5 mr-2" />
          Owned
        </motion.div>
      ) : (
        <motion.button 
          onClick={() => onPurchase(item.id)}
          disabled={!canAfford || isPurchasing}
          className={`font-bold py-2 px-4 rounded-lg flex items-center transition-all duration-200 ${
            canAfford 
              ? 'bg-accent text-background hover:scale-105' 
              : 'bg-gray-600 text-gray-400 cursor-not-allowed'
          }`}
          whileTap={canAfford ? { scale: 0.95 } : {}}
          whileHover={canAfford ? { scale: 1.05 } : {}}
        >
          {isPurchasing ? (
            <LoaderCircle className="w-5 h-5 animate-spin" />
          ) : (
            <>
              <Star className="w-4 h-4 mr-2" />
              {item.price.toLocaleString()}
            </>
          )}
        </motion.button>
      )}
    </motion.div>
  );
};

const CategorySection = ({ category, categoryData, items, userPoints, onPurchase, inventory, ownedBadges, purchasingId, justPurchasedId }) => {
  if (items.length === 0) return null;

  return (
    <motion.div 
      className="space-y-4"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      layout
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
              isPurchasing={purchasingId === item.id}
              justPurchased={justPurchasedId === item.id}
            />
          );
        })}
      </div>
    </motion.div>
  );
};

const ShopPage = () => {
  const [shopItems, setShopItems] = useState(FALLBACK_SHOP_ITEMS);
  const [userPoints, setUserPoints] = useState(4735);
  const [inventory, setInventory] = useState([]);
  const [ownedBadges, setOwnedBadges] = useState([]);
  const [loading, setLoading] = useState(true);
  const [connectionStatus, setConnectionStatus] = useState('Connecting...');
  const [purchasingId, setPurchasingId] = useState(null);
  const [justPurchasedId, setJustPurchasedId] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const tg = window.Telegram?.WebApp;

  // Demo state for offline mode
  const [demoPoints, setDemoPoints] = useState(4735);
  const [demoInventory, setDemoInventory] = useState([]);
  const [demoBadges, setDemoBadges] = useState([]);

  useEffect(() => {
    const loadShopData = async () => {
      try {
        if (tg && tg.initData && BACKEND_URL) {
          setConnectionStatus('Fetching shop data...');
          console.log('Connecting to backend:', BACKEND_URL);
          
          const res = await fetch(`${BACKEND_URL}/api/get-shop-data`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ initData: tg.initData }),
          });

          if (res.ok) {
            const data = await res.json();
            console.log('Shop data loaded:', data);
            
            if (data.items && data.items.length > 0) {
              const mappedItems = data.items.map(item => ({
                ...item,
                category: getCategoryFromItem(item)
              }));
              setShopItems(mappedItems);
            }
            
            setUserPoints(data.userPoints);
            setInventory(data.inventory || []);
            setOwnedBadges(data.ownedBadges || []);
            setConnectionStatus('Connected to server');
            setIsConnected(true);
          } else {
            throw new Error(`API Error: ${res.status}`);
          }
        } else {
          throw new Error('No Telegram data or backend URL');
        }
      } catch (error) {
        console.error('Failed to load shop data:', error);
        setConnectionStatus('Demo mode - purchases won\'t persist');
        setIsConnected(false);
        
        setShopItems(FALLBACK_SHOP_ITEMS);
        setUserPoints(demoPoints);
        setInventory(demoInventory);
        setOwnedBadges(demoBadges);
      } finally {
        setLoading(false);
      }
    };

    loadShopData();
  }, [tg, demoPoints, demoInventory, demoBadges]);

  const getCategoryFromItem = (item) => {
    if (item.name.includes('Time') || item.name.includes('time')) return 'time';
    if (item.name.includes('Bomb') || item.name.includes('bomb')) return 'bomb';
    if (item.name.includes('Points') || item.name.includes('Double') || item.name.includes('Booster')) return 'multiplier';
    if (item.name.includes('Badge') || item.type === 'permanent') return 'badge';
    return 'other';
  };

  // SMOOTH & FAST PURCHASE FUNCTION - NO MORE RELOADS!
  const handlePurchase = async (itemId) => {
    const item = shopItems.find(i => i.id === itemId);
    if (!item) return;

    setPurchasingId(itemId);

    try {
      if (isConnected && tg && tg.initData && BACKEND_URL) {
        console.log('Making real purchase for item:', itemId);
        
        const res = await fetch(`${BACKEND_URL}/api/buy-item`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ initData: tg.initData, itemId }),
        });

        const result = await res.json();
        
        if (!res.ok) {
          const errorMessage = result.error || `Error ${res.status}: ${res.statusText}`;
          throw new Error(errorMessage);
        }

        console.log('Purchase successful:', result);

        // INSTANT UI UPDATES - NO RELOAD!
        
        // 1. Update points immediately
        setUserPoints(result.newPoints);
        
        // 2. Update inventory/badges state locally
        if (item.category === 'badge') {
          setOwnedBadges(prev => [...prev, item.name]);
        } else {
          setInventory(prev => {
            const existingItem = prev.find(inv => inv.item_id === itemId);
            if (existingItem) {
              return prev.map(inv => 
                inv.item_id === itemId 
                  ? { ...inv, quantity: inv.quantity + 1 }
                  : inv
              );
            } else {
              return [...prev, { item_id: itemId, quantity: 1 }];
            }
          });
        }

        // 3. Show success animation
        setJustPurchasedId(itemId);
        setTimeout(() => setJustPurchasedId(null), 1500);

        // 4. Haptic feedback
        tg.HapticFeedback?.notificationOccurred('success');
        
        // 5. Show success popup (optional - can be removed for even smoother experience)
        tg.showPopup({
          title: 'Success!',
          message: result.message,
          buttons: [{ type: 'ok' }]
        });
        
      } else {
        console.log('Demo purchase for item:', itemId);
        
        // Demo mode - instant updates
        if (userPoints >= item.price) {
          const newPoints = userPoints - item.price;
          setUserPoints(newPoints);
          setDemoPoints(newPoints);
          
          // Update demo state instantly
          if (item.category === 'badge') {
            const newBadges = [...demoBadges, item.name];
            setOwnedBadges(newBadges);
            setDemoBadges(newBadges);
          } else {
            const existingItem = demoInventory.find(inv => inv.item_id === itemId);
            if (existingItem) {
              const newInventory = demoInventory.map(inv => 
                inv.item_id === itemId 
                  ? { ...inv, quantity: inv.quantity + 1 }
                  : inv
              );
              setInventory(newInventory);
              setDemoInventory(newInventory);
            } else {
              const newInventory = [...demoInventory, { item_id: itemId, quantity: 1 }];
              setInventory(newInventory);
              setDemoInventory(newInventory);
            }
          }
          
          // Show success animation
          setJustPurchasedId(itemId);
          setTimeout(() => setJustPurchasedId(null), 1500);
          
          const message = `Demo: Purchased ${item.name} for ${item.price} points!\n\n⚠️ This purchase is for demo only and won't persist.`;
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
    } finally {
      setPurchasingId(null);
    }
  };

  // Group items by category
  const itemsByCategory = shopItems.reduce((acc, item) => {
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
        <motion.div 
          className="bg-nav p-2 px-4 rounded-lg flex items-center border border-gray-700"
          key={userPoints} // Re-animate when points change
          initial={{ scale: 1.1, backgroundColor: '#10B981' }}
          animate={{ scale: 1, backgroundColor: '#212426' }}
          transition={{ duration: 0.4 }}
        >
          <Star className="w-5 h-5 mr-2 text-accent" />
          <span className="text-xl font-bold">{userPoints.toLocaleString()}</span>
        </motion.div>
      </motion.div>

      {/* Shop Categories */}
      <motion.div className="space-y-8" layout>
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
            purchasingId={purchasingId}
            justPurchasedId={justPurchasedId}
          />
        ))}
      </motion.div>
    </div>
  );
};

export default ShopPage;
