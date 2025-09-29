import React from 'react';
import { motion } from 'framer-motion';
import { AlertTriangle } from 'lucide-react';

export const ErrorState = ({ error, onRetry }) => (
  <div className="p-4 min-h-screen bg-background text-primary flex items-center justify-center">
    <motion.div
      className="text-center max-w-md"
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3 }}
    >
      <div className="bg-red-600/20 border border-red-500 rounded-lg p-6">
        <AlertTriangle className="w-16 h-16 text-red-400 mx-auto mb-4" />
        <h1 className="text-xl font-bold text-primary mb-2">Connection Error</h1>
        <p className="text-secondary text-sm mb-4">{error}</p>
        <button
          onClick={onRetry}
          className="bg-accent hover:bg-accent/80 text-background px-4 py-2 rounded-lg font-bold transition-colors"
        >
          Retry
        </button>
      </div>
    </motion.div>
  </div>
);
