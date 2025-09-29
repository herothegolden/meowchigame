import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Star, LoaderCircle, CheckCircle, Sparkles } from 'lucide-react';

const ShopItemCard = ({ 
  item, 
  userPoints, 
  onPurchase, 
  isOwned, 
  ownedQuantity = 0, 
  isPurchasing, 
  justPurchased,
  icon 
}) => {
  const canAfford = userPoints >= item.price;

  return (
    <motion.div
      className="bg-nav p-4 rounded-lg flex items-center justify-between border border-gray-700 relative overflow-hidden"
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.5 }}
      layout
    >
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
          {icon}
        </motion.div>
        <div>
          <p className="font-bold text-primary">{item.name}</p>
          <p className="text-sm text-secondary">{item.description}</p>
          {item.type === 'consumable' && ownedQuantity > 0 && (
            <motion.p 
              className="text-xs text-accent mt-1"
              key={ownedQuantity}
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

export default ShopItemCard;
