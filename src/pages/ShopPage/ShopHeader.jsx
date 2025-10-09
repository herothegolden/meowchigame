// Path: src/pages/ShopPage/ShopHeader.jsx
import React from 'react';
import { motion } from 'framer-motion';
import { ShoppingCart, Star } from 'lucide-react';

const ShopHeader = ({ points }) => {
  return (
    <motion.div
      className="flex items-center justify-between"
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      {/* Left: Title */}
      <div className="flex items-center">
        <ShoppingCart className="w-8 h-8 mr-3 text-secondary" />
        <h1 className="text-3xl font-bold">Shop</h1>
      </div>

      {/* Right: Points chip (BETA note moved to AnnouncementBar) */}
      <div className="flex items-center gap-3">
        <motion.div
          className="bg-nav p-2 px-4 rounded-lg flex items-center border border-gray-700"
          key={points}
          initial={{ scale: 1.1, backgroundColor: '#10B981' }}
          animate={{ scale: 1, backgroundColor: '#212426' }}
          transition={{ duration: 0.4 }}
        >
          <Star className="w-5 h-5 mr-2 text-accent" />
          <span className="text-xl font-bold">
            {typeof points === 'number' ? points.toLocaleString() : '0'}
          </span>
        </motion.div>
      </div>
    </motion.div>
  );
};

export default ShopHeader;
