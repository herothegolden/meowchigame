import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import GameBoard from '../components/game/GameBoard';
import { Star, Clock, LoaderCircle, Play, RotateCcw, Bomb, ChevronsUp, Package, Zap, Timer, CheckCircle, Settings, BarChart3, History, Shuffle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import soundManager from '../utils/SoundManager'; // 🎵 SOUND INTEGRATION

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
  
  // TMA-compatible bomb dragging state
  const [isDraggingBomb, setIsDraggingBomb] = useState(false);
  const [ghostBombPosition, setGhostBombPosition] = useState({ x: 0, y: 0 });
  const [gameBoardRef, setGameBoardRef] = useState(null);
  
  const navigate = useNavigate();

  // Timer effect
  useEffect(() => {
    if (!gameStarted || isGameOver || timeLeft <= 0) return;

    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          setIsGameOver(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [gameStarted, isGameOver, timeLeft]);

  // 🎵 SOUND: Game over trigger
  useEffect(() => {
    if (isGameOver && !isSubmitting) {
      // Play game over sound
      soundManager.playCore('game_over', { volume: 1.0 });
    }
  }, [isGameOver, isSubmitting]);

  // Shuffle cooldown timer
  useEffect(() => {
    if (shuffleCooldown > 0 && gameStarted && !isGameOver) {
      const timer = setInterval(() => {
        setShuffleCooldown(prev => Math.max(0, prev - 1));
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [shuffleCooldown, gameStarted, isGameOver]);

  // Handle game over submission
  useEffect(() => {
    if (!isGameOver || isSubmitting) return;

    const submitScore = async () => {
      setIsSubmitting(true);
      
      // React overlay modal will handle the Game Over display
      const tg = window.Telegram?.WebApp;
      
      // Submit score silently in background (no popups)
      if (score > 0 && tg && tg.initData && BACKEND_URL) {
        try {
          const response = await fetch(`${BACKEND_URL}/api/update-score`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ initData: tg.initData, score: score }),
          });
          
          const data = await response.json();
          if (response.ok) {
            console.log('Score submitted successfully:', data);
          } else {
            console.error('Score submission failed:', data.error);
          }
        } catch (error) {
          console.error('Error submitting score:', error);
          // No popup - just log the error
        }
      }
      
      setIsSubmitting(false);
    };

    // Delay submission by 1 second to show final score
    const timeoutId = setTimeout(submitScore, 1000);
    return () => clearTimeout(timeoutId);
  }, [isGameOver, score, isSubmitting]);

  // Disable Telegram swipes during game
  useEffect(() => {
    const tg = window.Telegram?.WebApp;
    if (tg) {
      tg.disableVerticalSwipes();
      return () => tg.enableVerticalSwipes();
    }
  }, []);

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

  // NEW: Handle game board ref for bomb drop detection
  const handleGameBoardRef = useCallback((ref) => {
    setGameBoardRef(ref);
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

  // PHASE 3: Simplified loadInventory with basic statistics
  const loadInventory = async () => {
    const tg = window.Telegram?.WebApp;
    
    try {
      if (!tg || !tg.initData || !BACKEND_URL) {
        // Unified: No demo fallback. In Telegram-less/browser mode, expose empty inventory.
        console.warn('Inventory unavailable: missing Telegram initData or BACKEND_URL');
        setAvailableItems([]);
        setInventory([]);
        setInventoryStats({ totalItems: 0, totalValue: 0, mostUsedItem: 'None', efficiency: 0 });
        return;
      }

      console.log('Loading inventory from backend...');

      const res = await fetch(`${BACKEND_URL}/api/get-shop-data`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ initData: tg.initData }),
      });

      if (res.ok) {
        const shopData = await res.json();
        let userInventory = shopData.inventory || [];
        
        // FILTER OUT Extra Time +20s (item_id: 2) completely
        userInventory = userInventory.filter(item => item.item_id !== 2);
        
        console.log('Inventory loaded:', userInventory);
        
        setAvailableItems(userInventory);
        
        const consumableItems = userInventory.filter(item => 
          item.item_id === 4 && item.quantity > 0
        );
        setInventory(consumableItems);
        
        const pointMultiplier = shopData.boosterActive || false;
        if (pointMultiplier) {
          setActiveBoosts(prev => ({ ...prev, pointMultiplier: true }));
        }

        // Calculate basic inventory stats
        const totalItems = userInventory.reduce((sum, item) => sum + item.quantity, 0);
        const itemValues = { 1: 750, 3: 1000, 4: 1500 }; // REMOVED item 2
        const totalValue = userInventory.reduce((sum, item) => sum + (item.quantity * (itemValues[item.item_id] || 0)), 0);
        
        setInventoryStats({
          totalItems,
          totalValue,
          mostUsedItem: 'Double Points', // Simplified
          efficiency: Math.min(95, Math.max(50, totalItems * 10))
        });

      } else {
        console.error('Failed to fetch inventory:', res.status);
        setAvailableItems([]);
        setInventory([]);
      }

    } catch (error) {
      console.error('Error loading inventory:', error);
      setAvailableItems([]);
      setInventory([]);
    }
  };

  const configureGameWithSelectedItems = async () => {
    const tg = window.Telegram?.WebApp;
    setIsConfiguringGame(true);
    
    try {
      if (!tg || !tg.initData || !BACKEND_URL) {
        // Unified: No demo fallback. Use safe defaults and no boosters.
        console.warn('Game configuration unavailable: missing Telegram initData or BACKEND_URL');
        setGameConfig({ startTime: 30, startWithBomb: false });
        setActiveBoosts({ timeBoost: 0, bomb: false, pointMultiplier: false });
        return;
      }

      console.log('Configuring game with selected items:', Array.from(selectedItems));

      // FIXED: Use new endpoint only - no fallback to auto-consumption endpoint
      let sessionData = { startTime: 30, startWithBomb: false };
      
      const sessionRes = await fetch(`${BACKEND_URL}/api/start-game-session-with-items`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          initData: tg.initData, 
          selectedItems: Array.from(selectedItems)
        }),
      });
      
      if (sessionRes.ok) {
        sessionData = await sessionRes.json();
        console.log('Game configured with items:', sessionData);
      } else {
        console.error('Game session configuration failed:', sessionRes.status);
        // Use default values instead of auto-consuming items
        console.log('Using default game configuration - no items consumed');
        sessionData = { startTime: 30, startWithBomb: false };
      }
      
      setGameConfig(sessionData);
      
      const timeBoost = sessionData.startTime - 30;
      
      setActiveBoosts({
        timeBoost,
        bomb: sessionData.startWithBomb,
        pointMultiplier: selectedItems.has(4)
      });

    } catch (error) {
      console.error('Error configuring game:', error);
      // Use safe defaults on any error
      setGameConfig({ startTime: 30, startWithBomb: false });
      setActiveBoosts({ timeBoost: 0, bomb: false, pointMultiplier: false });
    } finally {
      setIsConfiguringGame(false);
    }
  };

  const handleActivateItem = async (itemId) => {
    const tg = window.Telegram?.WebApp;
    
    if (!tg || !tg.initData || !BACKEND_URL) {
      console.warn('Activation unavailable: missing Telegram initData or BACKEND_URL');
      return;
    }

    setIsActivatingItem(itemId);

    try {
      console.log('Activating item:', itemId);
      
      const res = await fetch(`${BACKEND_URL}/api/activate-item`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ initData: tg.initData, itemId }),
      });

      const result = await res.json();
      
      if (!res.ok) {
        throw new Error(result.error || 'Activation failed');
      }

      console.log('Item activated successfully:', result);

      if (itemId === 4) {
        setActiveBoosts(prev => ({ ...prev, pointMultiplier: true }));
        
        setInventory(prev => {
          return prev.map(item => 
            item.item_id === itemId && item.quantity > 1
              ? { ...item, quantity: item.quantity - 1 }
              : item
          ).filter(item => !(item.item_id === itemId && item.quantity <= 1));
        });
      }

      // Silent success - only haptic feedback, no popup
      tg.HapticFeedback?.notificationOccurred('success');

    } catch (error) {
      console.error('Activation error:', error);
      // Silent error handling - only haptic feedback, no popup
      tg?.HapticFeedback?.notificationOccurred('error');
    } finally {
      setIsActivatingItem(null);
    }
  };

  const handleItemSelection = (itemId) => {
    setSelectedItems(prev => {
      const newSet = new Set(prev);
      if (newSet.has(itemId)) {
        newSet.delete(itemId);
      } else {
        newSet.add(itemId);
      }
      return newSet;
    });
  };

  const startGame = async () => {
    // 🎵 SOUND: Game start
    soundManager.playCore('power_up', { volume: 0.8 });
    
    // Auto-configure with no selected items (skip item selection entirely)
    setSelectedItems(new Set());
    await configureGameWithSelectedItems();
    
    setGameStarted(true);
    setScore(0);
    setTimeLeft(gameConfig.startTime);
    setIsGameOver(false);
    setIsSubmitting(false);
    setShowInventory(false);
    
    // Reset shuffle state
    setShuffleNeeded(false);
    setShuffleCount(0);
    setShuffleCooldown(0);
  };

  const restartGame = async () => {
    console.log('Restarting game...');
    
    // 🎵 SOUND: Button click for restart
    soundManager.playUI('button_click', { volume: 0.8 });
    
    setGameStarted(false);
    setScore(0);
    setIsGameOver(false);
    setIsSubmitting(false);
    setShowInventory(false);
    setShowItemSelection(false);
    setShowInventoryStats(false);
    setSelectedItems(new Set());
    
    // Reset shuffle state
    setShuffleNeeded(false);
    setShuffleCount(0);
    setShuffleCooldown(0);
    setShuffleFunction(null);
    
    // Reset bomb drag state
    setIsDraggingBomb(false);
    setGhostBombPosition({ x: 0, y: 0 });
    
    await loadInventory();
  };

  // FIXED: Handle item usage during game with backend persistence
  const handleUseItem = async (itemId) => {
    const item = availableItems.find(item => item.item_id === itemId);
    if (!item || item.quantity <= 0) return;

    const tg = window.Telegram?.WebApp;
    setIsActivatingItem(itemId);

    try {
      if (itemId === 1) { // Extra Time +10s
        if (!tg || !tg.initData || !BACKEND_URL) {
          console.warn('Use item blocked: missing Telegram initData or BACKEND_URL');
          tg?.HapticFeedback?.notificationOccurred('error');
          return;
        }

        // Real mode - call backend to consume item
        const res = await fetch(`${BACKEND_URL}/api/use-time-booster`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ initData: tg.initData, seconds: 10 }),
        });

        const result = await res.json();
        if (!res.ok) throw new Error(result.error || 'Failed to use time booster');

        // SUCCESS: Apply time boost locally
        soundManager.playCore('power_up', { volume: 0.9 });
        setTimeLeft(prev => prev + 10);
        setAvailableItems(prev => 
          prev.map(invItem => 
            invItem.item_id === itemId 
              ? { ...invItem, quantity: invItem.quantity - 1 }
              : invItem
          ).filter(invItem => invItem.quantity > 0)
        );

        if (window.Telegram?.WebApp?.HapticFeedback) {
          window.Telegram.WebApp.HapticFeedback.impactOccurred('medium');
        }

        console.log('Used Extra Time +10s, added 10 seconds');

      } else if (itemId === 4) { // Double Points
        if (!tg || !tg.initData || !BACKEND_URL) {
          console.warn('Use item blocked: missing Telegram initData or BACKEND_URL');
          tg?.HapticFeedback?.notificationOccurred('error');
          return;
        }

        // Use existing backend logic
        const res = await fetch(`${BACKEND_URL}/api/activate-item`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ initData: tg.initData, itemId: 4 }),
        });

        const result = await res.json();
        if (!res.ok) throw new Error(result.error || 'Failed to activate Double Points');

        setActiveBoosts(prev => ({ ...prev, pointMultiplier: true }));
        setAvailableItems(prev => 
          prev.map(invItem => 
            invItem.item_id === 4 
              ? { ...invItem, quantity: Math.max(0, invItem.quantity - 1) }
              : invItem
          ).filter(invItem => invItem.quantity > 0)
        );

        window.Telegram?.WebApp?.HapticFeedback?.impactOccurred('medium');
        console.log('Activated Double Points');

      } else if (itemId === 3) { // Cookie Bomb
        if (!tg || !tg.initData || !BACKEND_URL) {
          console.warn('Use item blocked: missing Telegram initData or BACKEND_URL');
          tg?.HapticFeedback?.notificationOccurred('error');
          return;
        }

        // Real mode - call backend to consume bomb
        const res = await fetch(`${BACKEND_URL}/api/use-bomb`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ initData: tg.initData }),
        });

        const result = await res.json();
        if (!res.ok) throw new Error(result.error || 'Failed to use bomb');

        setAvailableItems(prev => 
          prev.map(invItem => 
            invItem.item_id === 3 
              ? { ...invItem, quantity: invItem.quantity - 1 }
              : invItem
          ).filter(invItem => invItem.quantity > 0)
        );
        console.log('Bomb consumed (backend)');

      }

    } catch (error) {
      console.error('Use item error:', error);
      window.Telegram?.WebApp?.HapticFeedback?.notificationOccurred('error');
    } finally {
      setIsActivatingItem(null);
    }
  };

  return (
    <div className="p-4 bg-background text-primary min-h-screen">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-2 bg-surface px-3 py-2 rounded-lg border border-gray-700">
            <Star className="w-4 h-4 text-yellow-400" />
            <span className="font-bold">{score}</span>
          </div>
          <div className="flex items-center space-x-2 bg-surface px-3 py-2 rounded-lg border border-gray-700">
            <Clock className="w-4 h-4 text-yellow-400" />
            <span className="font-bold">{String(Math.floor(timeLeft / 60)).padStart(1, '0')}:{String(timeLeft % 60).padStart(2, '0')}</span>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          {!gameStarted && (
            <button 
              onClick={async () => {
                setIsLoadingConfig(true);
                await loadInventory();
                await configureGameWithSelectedItems();
                setIsLoadingConfig(false);
              }}
              className="bg-accent text-background px-4 py-2 rounded-lg font-bold flex items-center"
            >
              {isLoadingConfig ? <LoaderCircle className="w-4 h-4 animate-spin mr-2" /> : <Settings className="w-4 h-4 mr-2" />}
              Configure
            </button>
          )}

          {!gameStarted ? (
            <button 
              onClick={startGame}
              className="bg-accent text-background px-4 py-2 rounded-lg font-bold flex items-center"
            >
              <Play className="w-4 h-4 mr-2" /> Start
            </button>
          ) : (
            <button 
              onClick={restartGame}
              className="bg-surface text-primary border border-gray-700 px-4 py-2 rounded-lg font-bold flex items-center"
            >
              <RotateCcw className="w-4 h-4 mr-2" /> Restart
            </button>
          )}
        </div>
      </div>

      {/* Game Board */}
      <div className="mb-4">
        <GameBoard
          onScoreChange={setScore}
          onTimeChange={setTimeLeft}
          onGameOver={() => setIsGameOver(true)}
          onShuffleNeeded={handleShuffleNeeded}
          onBoardReady={handleBoardReady}
          onGameBoardRef={handleGameBoardRef}
          gameStarted={gameStarted}
          activeBoosts={activeBoosts}
        />
      </div>

      {/* Controls & Inventory */}
      <div className="space-y-4">
        <div className="flex items-center justify-center">
          <button
            className={`px-6 py-3 rounded-lg font-bold flex items-center border ${shuffleCooldown > 0 || !gameStarted || isGameOver ? 'bg-gray-700 text-gray-400 border-gray-600 cursor-not-allowed' : 'bg-surface text-primary border-gray-700 hover:scale-105 transition-transform'}`}
            onClick={handleShuffle}
            disabled={shuffleCooldown > 0 || !gameStarted || isGameOver}
          >
            <Shuffle className="w-5 h-5 mr-2" />
            Shuffle
            {shuffleCooldown > 0 && (
              <span className="ml-2 text-secondary">({shuffleCooldown})</span>
            )}
          </button>
        </div>

        <div className="bg-surface rounded-xl p-4 border border-gray-700">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center space-x-2">
              <Package className="w-5 h-5 text-accent" />
              <h3 className="font-bold">Items</h3>
            </div>
            <button
              className="text-secondary text-sm underline"
              onClick={() => setShowInventory(prev => !prev)}
            >
              {showInventory ? 'Hide' : 'Show'}
            </button>
          </div>

          {showInventory && (
            <div className="grid grid-cols-2 gap-3">
              {/* Extra Time +10s */}
              <button
                onClick={() => handleUseItem(1)}
                disabled={!availableItems.some(i => i.item_id === 1)}
                className={`p-3 rounded-lg border flex items-center justify-between ${availableItems.some(i => i.item_id === 1) ? 'bg-nav border-gray-700' : 'bg-gray-800 border-gray-700 cursor-not-allowed opacity-60'}`}
              >
                <div className="flex items-center space-x-2">
                  <Timer className="w-5 h-5 text-blue-400" />
                  <span className="font-bold">+10s</span>
                </div>
                <span className="text-xs text-secondary">
                  {availableItems.find(i => i.item_id === 1)?.quantity || 0}
                </span>
              </button>

              {/* Double Points */}
              <button
                onClick={() => handleUseItem(4)}
                disabled={!availableItems.some(i => i.item_id === 4)}
                className={`p-3 rounded-lg border flex items-center justify-between ${availableItems.some(i => i.item_id === 4) ? 'bg-nav border-gray-700' : 'bg-gray-800 border-gray-700 cursor-not-allowed opacity-60'}`}
              >
                <div className="flex items-center space-x-2">
                  <ChevronsUp className="w-5 h-5 text-green-400" />
                  <span className="font-bold">2× Points</span>
                </div>
                <span className="text-xs text-secondary">
                  {availableItems.find(i => i.item_id === 4)?.quantity || 0}
                </span>
              </button>

              {/* Cookie Bomb */}
              <button
                onClick={() => handleUseItem(3)}
                disabled={!availableItems.some(i => i.item_id === 3)}
                className={`p-3 rounded-lg border flex items-center justify-between ${availableItems.some(i => i.item_id === 3) ? 'bg-nav border-gray-700' : 'bg-gray-800 border-gray-700 cursor-not-allowed opacity-60'}`}
              >
                <div className="flex items-center space-x-2">
                  <Bomb className="w-5 h-5 text-red-400" />
                  <span className="font-bold">Bomb</span>
                </div>
                <span className="text-xs text-secondary">
                  {availableItems.find(i => i.item_id === 3)?.quantity || 0}
                </span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Game Over Modal */}
      <AnimatePresence>
        {isGameOver && (
          <motion.div
            className="fixed inset-0 bg-black/60 flex items-center justify-center z-50"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="bg-surface border border-gray-700 rounded-2xl p-6 w-80 text-center"
              initial={{ y: 30, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 30, opacity: 0 }}
            >
              <h3 className="text-xl font-bold mb-2">Game Over</h3>
              <p className="text-secondary mb-4">Final Score: <span className="font-bold text-primary">{score}</span></p>
              <div className="flex items-center justify-center space-x-3">
                <button
                  onClick={restartGame}
                  className="bg-accent text-background px-4 py-2 rounded-lg font-bold flex items-center"
                >
                  <RotateCcw className="w-4 h-4 mr-2" /> Play Again
                </button>
                <button
                  onClick={() => navigate('/profile')}
                  className="bg-nav text-primary border border-gray-700 px-4 py-2 rounded-lg font-bold flex items-center"
                >
                  <BarChart3 className="w-4 h-4 mr-2" /> Profile
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default GamePage;
