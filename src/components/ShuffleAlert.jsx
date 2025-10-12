// src/components/ShuffleAlert.jsx
import React from "react";
import { motion } from "framer-motion";
import { Shuffle } from "lucide-react";

/**
 * ShuffleAlert
 * Displays red animated banner when no moves are available.
 * Fully matches the existing design and animation in GamePage.jsx.
 */
export default function ShuffleAlert({ visible }) {
  if (!visible) return null;

  return (
    <motion.div
      className="bg-red-600/90 backdrop-blur-sm rounded-xl p-3 border border-red-500 pointer-events-none"
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.3 }}
    >
      <div className="flex items-center justify-center space-x-3 text-sm text-white">
        <Shuffle className="w-5 h-5" />
        <span className="font-bold">
          No moves available! Use shuffle button below
        </span>
        <Shuffle className="w-5 h-5" />
      </div>
    </motion.div>
  );
}
