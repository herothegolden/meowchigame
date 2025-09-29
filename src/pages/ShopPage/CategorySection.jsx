import React from 'react';
import { motion } from 'framer-motion';
import { Clock, Timer, Bomb, ChevronsUp, Badge, Zap, Trophy } from 'lucide-react';
import ShopItemCard from './ShopItemCard';

const iconComponents = {
  Clock: <Clock size={28} />,
  Timer: <Timer size={28} />,
  Bomb: <Bomb size={28} />,
  ChevronsUp: <ChevronsUp size={28} />,
  Badge: <Badge size={28} />,
  Zap: <Zap size={28} />,
  Trophy: <Trophy size={28} />
};

const categoryConfig = {
  time: { name: 'Time Boosters', icon: '⏰', color: 'text-blue-400' },
  bomb: { name: 'Cookie Bombs', icon: '💣', color: 'text-red-400' },
  multiplier: { name: 'Point Multipliers', icon: '2️⃣', color: 'text-green-400' },
  badge: { name: 'Collectibles', icon: '🏆', color: 'text-yellow-400' }
};

const CategorySection = ({ 
  category, 
  items, 
  userPoints, 
  inventory, 
  ownedBadges, 
  onPurchase, 
  purchasing, 
  justPurchased 
}) => {
  if (!items || items.length === 0) return null;

  const categoryData = categoryConfig[category];
  if (!categoryData) return null;

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

          if (category === 'badge') {
            isOwned = ownedBadges.includes(item.name);
          } else {
            const inventoryItem = inventory.find(inv => inv.item_id === item.id);
            if (inventoryItem) {
              ownedQuantity = Number(inventoryItem.quantity) || 0;
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
              isPurchasing={purchasing === item.id}
              justPurchased={justPurchased === item.id}
              icon={iconComponents[item.icon_name] || iconComponents.Badge}
            />
          );
        })}
      </div>
    </motion.div>
  );
};

export default CategorySection;
