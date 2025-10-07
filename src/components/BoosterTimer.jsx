// src/components/BoosterTimer.jsx
import React from "react";
import { motion } from "framer-motion";
import { ChevronsUp } from "lucide-react";

/**
 * BoosterTimer
 * Animated display for 2x score booster countdown.
 */
export default function BoosterTimer({ boosterTimeLeft }) {
  return (
    <motion.div
      className="flex items-center space-x-2 bg-green-600/20 border border-green-500 p-2 rounded-lg shadow-lg"
      initial={{ opacity: 0, y: -10, scale: 0.9 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -10, scale: 0.9 }}
      transition={{ duration: 0.3 }}
    >
      <ChevronsUp className="w-4 h-4 text-green-400" />
      <span className="text-sm font-bold text-green-400">2x {boosterTimeLeft}s</span>
    </motion.div>
  );
}
