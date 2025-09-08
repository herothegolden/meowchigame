// FIXED: GamePage.jsx - Only the shuffle-related parts that need fixing

import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import GameBoard from '../components/game/GameBoard';
import { Star, Clock, LoaderCircle, Play, RotateCcw, Bomb, ChevronsUp, Package, Zap, Timer, CheckCircle, Settings, BarChart3, History, Shuffle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

// Get the backend URL from the environment variables
const BACKEND_URL = import.meta.env.VITE_BACKEND_URL;

const GamePage = () => {
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(30);
  const [gameStarted, setGameStarted] = useState(false);
  const [isGameOver, setIsGameOver] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [gameConfig, setGameConfig] = useState({ startTime: 30, startWithBomb: false });
  const [activeBoosts, setActiveBoosts] = useState({ timeBoost: 0, bomb: false, pointMultiplier: false });
  const [isLoadingConfig, setIsLoadingConfig] = useState(false);
  
  // Phase 1 & 2: Inventory state
  const [inventory, setInventory] = useState([]);
  const [isActivatingItem, setIsActivatingItem] = useState(null);
  const [showInventory, setShowInventory] = useState(false);
  const [availableItems, setAvailableItems] = useState([]);
  const [selectedItems, setSelectedItems] = useState(new Set());
  const [showItemSelection, setShowItemSelection] = useState(false);
  const [isConfiguringGame, setIsConfiguringGame] = useState(false);
  
  // PHASE 3: Simplified inventory management
  const [inventoryStats, setInventoryStats] = useState({
    totalItems: 0,
    totalValue: 0,
    mostUsedItem: 'None',
    efficiency: 0
  });
  const [showInventoryStats, setShowInventoryStats] = useState(false);
  
  // FIXED: Improved shuffle state management
  const [shuffleNeeded, setShuffleNeeded] = useState(false);
  const [shuffleCount, setShuffleCount] = useState(0);
  const [shuffleCooldown, setShuffleCooldown] = useState(0);
  const [shuffleFunction, setShuffleFunction] = useState(null);
  
  const navigate = useNavigate();

  // ... (keeping all other existing code exactly the same) ...

  // FIXED: Stable shuffle needed handler - memoized to prevent infinite loops
  const handleShuffleNeeded = useCallback((needed) => {
    console.log(`🔍 Shuffle needed status: ${needed}`);
    setShuffleNeeded(needed);
  }, []);

  // FIXED: Improved board ready handler - properly stores function reference
  const handleBoardReady = useCallback((shuffleFn) => {
    console.log('🎮 Board ready, setting shuffle function');
    console.log('🔧 Shuffle function type:', typeof shuffleFn);
    
    // FIXED: Store function reference properly for React state
    setShuffleFunction(() => shuffleFn);
  }, []);

  // FIXED: Enhanced manual shuffle handler with better error handling
  const handleShuffle = useCallback(() => {
    console.log('🔀 Shuffle button clicked');
    console.log('🔧 Current state:', { 
      hasFunction: !!shuffleFunction, 
      functionType: typeof shuffleFunction,
      cooldown: shuffleCooldown, 
      gameStarted, 
      isGameOver 
    });
    
    if (!shuffleFunction) {
      console.log('🚫 No shuffle function available');
      return;
    }
    
    if (shuffleCooldown > 0) {
      console.log('🚫 Shuffle on cooldown:', shuffleCooldown);
      return;
    }
    
    if (!gameStarted || isGameOver) {
      console.log('🚫 Game not active:', { gameStarted, isGameOver });
      return;
    }
    
    console.log('🔀 Executing shuffle...');
    
    try {
      // Call the shuffle function and check if it was successful
      const shuffleResult = shuffleFunction();
      
      if (shuffleResult !== false) {
        // Shuffle was successful or attempted
        setShuffleCount(prev => {
          const newCount = prev + 1;
          console.log(`📊 Shuffle count: ${newCount}`);
          return newCount;
        });
        
        setShuffleCooldown(10); // 10 second cooldown
        setShuffleNeeded(false);
        
        console.log('✅ Shuffle executed successfully');
        
        // Haptic feedback
        if (window.Telegram?.WebApp?.HapticFeedback) {
          window.Telegram.WebApp.HapticFeedback.impactOccurred('heavy');
        }
      } else {
        console.log('⚠️ Shuffle was blocked or failed');
      }
    } catch (error) {
      console.error('🚨 Error executing shuffle:', error);
    }
  }, [shuffleFunction, shuffleCooldown, gameStarted, isGameOver]);

  // ... (keeping all other existing functions exactly the same) ...

  return (
    <div className="relative flex flex-col h-full p-4 space-y-4 bg-background text-primary">
      
      {/* Game Over Overlay */}
      {isGameOver && (
        <motion.div 
          className="absolute inset-0 bg-black/75 flex flex-col items-center justify-center z-50 p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3 }}
        >
          <div className="bg-nav rounded-2xl p-8 text-center max-w-sm w-full border border-gray-700">
            <h2 className="text-4xl font-bold text-primary mb-4">Game Over!</h2>
            <div className="text-6xl mb-4">🎉</div>
            <p className="text-2xl font-bold text-accent mb-2">
              {score.toLocaleString()} Points
            </p>
            {activeBoosts.pointMultiplier && (
              <p className="text-sm text-green-400 mb-2">🔥 Double Points Applied!</p>
            )}
            {shuffleCount > 0 && (
              <p className="text-sm text-blue-400 mb-2">🔀 Shuffles used: {shuffleCount}</p>
            )}
            
            {isSubmitting ? (
              <div className="flex items-center justify-center space-x-2 text-secondary mt-4">
                <LoaderCircle className="w-6 h-6 animate-spin" />
                <span>Saving score...</span>
              </div>
            ) : (
              <div className="flex space-x-3 mt-6">
                <button
                  onClick={restartGame}
                  className="flex-1 bg-accent text-background py-3 px-4 rounded-xl font-bold flex items-center justify-center space-x-2 hover:bg-accent/90 transition-colors"
                >
                  <RotateCcw size={20} />
                  <span>Play Again</span>
                </button>
                <button
                  onClick={() => navigate('/')}
                  className="flex-1 bg-nav border border-gray-700 text-primary py-3 px-4 rounded-xl font-bold hover:bg-gray-700 transition-colors"
                >
                  Home
                </button>
              </div>
            )}
          </div>
        </motion.div>
      )}

      {/* ... (keeping all other overlays and UI exactly the same) ... */}

      {/* Game Header - CLEAN, NO SHUFFLE BUTTON */}
      <motion.div 
        className="flex justify-between items-center"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div className="flex items-center space-x-2 bg-nav p-3 rounded-xl shadow-lg border border-gray-700">
          <Star className="w-6 h-6 text-accent" />
          <span className="text-xl font-bold text-primary">{score.toLocaleString()}</span>
          {activeBoosts.pointMultiplier && (
            <ChevronsUp className="w-5 h-5 text-green-400" />
          )}
        </div>
        
        <div className="flex items-center space-x-2">
          {/* ONLY inventory button and timer - NO SHUFFLE BUTTON */}
          {gameStarted && !isGameOver && availableItems.length > 0 && (
            <motion.button
              onClick={() => setShowInventory(!showInventory)}
              className="bg-nav p-3 rounded-xl shadow-lg border border-gray-700 hover:bg-gray-600 transition-colors relative"
              whileTap={{ scale: 0.95 }}
            >
              <Package className="w-6 h-6 text-accent" />
              {availableItems.length > 0 && (
                <span className="absolute -top-2 -right-2 bg-accent text-background text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                  {availableItems.reduce((sum, item) => sum + item.quantity, 0)}
                </span>
              )}
            </motion.button>
          )}
          
          <div className={`flex items-center space-x-2 bg-nav p-3 rounded-xl shadow-lg border border-gray-700 ${timeLeft <= 10 ? 'animate-pulse' : ''}`}>
            <Clock className={`w-6 h-6 ${timeLeft <= 10 ? 'text-red-500' : 'text-accent'}`} />
            <span className={`text-xl font-bold ${timeLeft <= 10 ? 'text-red-500' : 'text-primary'}`}>
              {formatTime(timeLeft)}
            </span>
          </div>
        </div>
      </motion.div>

      {/* Shuffle Alert ABOVE the board - ONLY VISUAL, NO CLICK */}
      <AnimatePresence>
        {shuffleNeeded && gameStarted && !isGameOver && shuffleCooldown === 0 && (
          <motion.div
            className="bg-red-600/90 backdrop-blur-sm rounded-xl p-3 border border-red-500 pointer-events-none"
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
          >
            <div className="flex items-center justify-center space-x-3 text-sm text-white">
              <Shuffle className="w-5 h-5" />
              <span className="font-bold">No moves available! Use shuffle button below</span>
              <Shuffle className="w-5 h-5" />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ... (keeping all other visual indicators and inventory panels exactly the same) ... */}

      {/* Game Board Container */}
      <motion.div 
        className="flex-1 flex flex-col items-center justify-center"
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, delay: 0.2 }}
      >
        <GameBoard 
          setScore={setScore} 
          gameStarted={gameStarted}
          startWithBomb={gameConfig.startWithBomb}
          onGameEnd={() => setIsGameOver(true)}
          onShuffleNeeded={handleShuffleNeeded}
          onBoardReady={handleBoardReady}
        />
      </motion.div>
      
      {/* FIXED: Enhanced Shuffle Button with better debugging */}
      {gameStarted && !isGameOver && (
        <motion.div 
          className="flex items-center justify-center"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.4 }}
        >
          <motion.button
            onClick={handleShuffle}
            disabled={shuffleCooldown > 0 || !shuffleFunction}
            className={`flex items-center space-x-3 px-6 py-3 rounded-xl shadow-lg border transition-all duration-200 relative ${
              shuffleNeeded && shuffleCooldown === 0 && shuffleFunction
                ? 'bg-red-600 hover:bg-red-700 border-red-500 animate-pulse text-white' 
                : shuffleCooldown > 0 || !shuffleFunction
                ? 'bg-gray-600 border-gray-500 cursor-not-allowed opacity-50 text-gray-300'
                : 'bg-nav border-gray-700 hover:bg-gray-600 text-primary'
            }`}
            whileTap={shuffleCooldown === 0 && shuffleFunction ? { scale: 0.95 } : {}}
            title={
              !shuffleFunction ? 'Shuffle function not ready' :
              shuffleNeeded ? 'No moves available! Click to shuffle' : 
              'Shuffle board when stuck'
            }
          >
            <Shuffle className={`w-6 h-6 ${
              shuffleNeeded && shuffleCooldown === 0 && shuffleFunction ? 'text-white' : 
              shuffleCooldown > 0 || !shuffleFunction ? 'text-gray-400' : 'text-accent'
            }`} />
            
            <span className="font-bold">
              {!shuffleFunction ? 'Loading...' :
               shuffleCooldown > 0 ? `Shuffle (${shuffleCooldown}s)` : 
               shuffleNeeded ? 'Shuffle Now!' : 'Shuffle'}
            </span>
            
            {shuffleCount > 0 && shuffleCooldown === 0 && shuffleFunction && (
              <span className="bg-blue-500 text-white text-xs font-bold rounded-full px-2 py-1 ml-2">
                {shuffleCount}
              </span>
            )}
            
            {/* FIXED: Debug indicator for function availability */}
            {!shuffleFunction && gameStarted && (
              <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-3 h-3 flex items-center justify-center">
                !
              </span>
            )}
          </motion.button>
        </motion.div>
      )}
      
      {/* Instructions */}
      {gameStarted && !isGameOver && (
        <motion.div 
          className="text-center text-secondary max-w-md mx-auto"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.6 }}
        >
          <p className="text-sm">
            Drag Meowchi pieces to adjacent spots to create matches of 3 or more! 🎯✨
          </p>
          <div className="flex items-center justify-center space-x-4 text-xs mt-2">
            {availableItems.length > 0 && (
              <span className="text-accent">Tap 📦 for items</span>
            )}
            {shuffleFunction && (
              <span className="text-blue-400">Shuffle ready 🔀</span>
            )}
          </div>
        </motion.div>
      )}
    </div>
  );
};

export default GamePage;
