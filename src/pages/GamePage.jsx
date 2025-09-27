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
        // Browser mode - use mock data
        console.log('Browser mode: Using mock inventory with stats');
        const mockItems = [
          { item_id: 1, quantity: 2 },
          { item_id: 4, quantity: 1 },
          { item_id: 3, quantity: 1 }
        ];
        setAvailableItems(mockItems);
        setInventory(mockItems.filter(item => item.item_id === 4));
        
        // Calculate mock stats
        setInventoryStats({
          totalItems: 4,
          totalValue: 3750,
          mostUsedItem: 'Extra Time +10s',
          efficiency: 85
        });
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
        const userInventory = shopData.inventory || [];
        
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
        const itemValues = { 1: 750, 2: 1500, 3: 1000, 4: 1500 }; // Hard-coded for simplicity
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
        // Browser mode - simulate item usage
        console.log('Browser mode: Simulating item configuration');
        
        let totalTimeBonus = 0;
        let hasBomb = false;
        
        selectedItems.forEach(itemId => {
          if (itemId === 1) totalTimeBonus += 10;
          if (itemId === 2) totalTimeBonus += 20;
          if (itemId === 3) hasBomb = true;
        });
        
        setGameConfig({ 
          startTime: 30 + totalTimeBonus, 
          startWithBomb: hasBomb 
        });
        
        setActiveBoosts({
          timeBoost: totalTimeBonus,
          bomb: hasBomb,
          pointMultiplier: selectedItems.has(4)
        });
        
        return;
      }

      console.log('Configuring game with selected items:', Array.from(selectedItems));

      // Try new endpoint first, fallback to old one
      let sessionData = { startTime: 30, startWithBomb: false };
      
      try {
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
          throw new Error('New endpoint not available');
        }
      } catch (newEndpointError) {
        console.log('Using fallback game session endpoint');
        const fallbackRes = await fetch(`${BACKEND_URL}/api/start-game-session`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ initData: tg.initData }),
        });
        
        if (fallbackRes.ok) {
          sessionData = await fallbackRes.json();
        }
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
      setGameConfig({ startTime: 30, startWithBomb: false });
      setActiveBoosts({ timeBoost: 0, bomb: false, pointMultiplier: false });
    } finally {
      setIsConfiguringGame(false);
    }
  };

  const handleActivateItem = async (itemId) => {
    const tg = window.Telegram?.WebApp;
    
    if (!tg || !tg.initData || !BACKEND_URL) {
      alert('Demo mode: Item activation not available');
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

  // Handle item usage during game
  const handleUseItem = async (itemId) => {
    const item = availableItems.find(item => item.item_id === itemId);
    if (!item || item.quantity <= 0) return;

    const details = getItemDetails(itemId);
    
    // Handle Extra Time items
    if (itemId === 1) { // Extra Time +10s
      setTimeLeft(prev => prev + 10);
      
      // Update inventory locally
      setAvailableItems(prev => 
        prev.map(invItem => 
          invItem.item_id === itemId 
            ? { ...invItem, quantity: invItem.quantity - 1 }
            : invItem
        ).filter(invItem => invItem.quantity > 0)
      );
      
      // Haptic feedback
      if (window.Telegram?.WebApp?.HapticFeedback) {
        window.Telegram.WebApp.HapticFeedback.impactOccurred('medium');
      }
      
      console.log('Used Extra Time +10s, added 10 seconds');
    }
  };

  // TMA-compatible bomb dragging implementation
  const startDraggingBomb = useCallback((e) => {
    const bombItem = availableItems.find(item => item.item_id === 3);
    if (!bombItem || bombItem.quantity <= 0 || isDraggingBomb) return;

    console.log('Starting bomb drag');
    setIsDraggingBomb(true);
    
    // Get initial pointer position
    const clientX = e.clientX || (e.touches && e.touches[0]?.clientX) || 0;
    const clientY = e.clientY || (e.touches && e.touches[0]?.clientY) || 0;
    
    setGhostBombPosition({ x: clientX, y: clientY });
    
    // Haptic feedback
    if (window.Telegram?.WebApp?.HapticFeedback) {
      window.Telegram.WebApp.HapticFeedback.impactOccurred('medium');
    }
    
    // Prevent default to avoid selection
    e.preventDefault();
  }, [availableItems, isDraggingBomb]);

  // Handle pointer move during bomb drag
  const handlePointerMove = useCallback((e) => {
    if (!isDraggingBomb) return;
    
    const clientX = e.clientX || (e.touches && e.touches[0]?.clientX) || 0;
    const clientY = e.clientY || (e.touches && e.touches[0]?.clientY) || 0;
    
    setGhostBombPosition({ x: clientX, y: clientY });
    e.preventDefault();
  }, [isDraggingBomb]);

  // Handle pointer release - bomb drop
  const handlePointerUp = useCallback((e) => {
    if (!isDraggingBomb) return;
    
    console.log('Ending bomb drag');
    setIsDraggingBomb(false);
    
    // Get drop position
    const clientX = e.clientX || (e.changedTouches && e.changedTouches[0]?.clientX) || 0;
    const clientY = e.clientY || (e.changedTouches && e.changedTouches[0]?.clientY) || 0;
    
    // Find element under pointer
    const elementUnder = document.elementFromPoint(clientX, clientY);
    
    if (elementUnder && gameBoardRef) {
      // Check if we're over the game board
      const boardElement = gameBoardRef.getBoardElement ? gameBoardRef.getBoardElement() : null;
      
      if (boardElement && boardElement.contains(elementUnder)) {
        // Calculate board position
        const boardRect = boardElement.getBoundingClientRect();
        const cellSize = boardRect.width / 6; // Assuming 6x6 board
        
        const relativeX = clientX - boardRect.left;
        const relativeY = clientY - boardRect.top;
        
        const col = Math.floor(relativeX / cellSize);
        const row = Math.floor(relativeY / cellSize);
        
        // Validate position
        if (row >= 0 && row < 6 && col >= 0 && col < 6) {
          console.log('Dropping bomb at:', { row, col });
          
          // Consume bomb from inventory
          setAvailableItems(prev => 
            prev.map(invItem => 
              invItem.item_id === 3 
                ? { ...invItem, quantity: invItem.quantity - 1 }
                : invItem
            ).filter(invItem => invItem.quantity > 0)
          );
          
          // Trigger bomb drop on game board
          if (gameBoardRef && gameBoardRef.handleBombDrop) {
            gameBoardRef.handleBombDrop({ row, col });
          }
          
          // Heavy haptic feedback for successful drop
          if (window.Telegram?.WebApp?.HapticFeedback) {
            window.Telegram.WebApp.HapticFeedback.impactOccurred('heavy');
          }
        }
      }
    }
    
    e.preventDefault();
  }, [isDraggingBomb, gameBoardRef, availableItems]);

  // Add global pointer event listeners during drag
  useEffect(() => {
    if (isDraggingBomb) {
      document.addEventListener('pointermove', handlePointerMove, { passive: false });
      document.addEventListener('pointerup', handlePointerUp, { passive: false });
      document.addEventListener('touchmove', handlePointerMove, { passive: false });
      document.addEventListener('touchend', handlePointerUp, { passive: false });
      
      return () => {
        document.removeEventListener('pointermove', handlePointerMove);
        document.removeEventListener('pointerup', handlePointerUp);
        document.removeEventListener('touchmove', handlePointerMove);
        document.removeEventListener('touchend', handlePointerUp);
      };
    }
  }, [isDraggingBomb, handlePointerMove, handlePointerUp]);

  // Load inventory on component mount
  useEffect(() => {
    loadInventory();
  }, []);

  const formatTime = (seconds) => {
    return `0:${seconds.toString().padStart(2, '0')}`;
  };

  // Get item details helper
  const getItemDetails = (itemId) => {
    const itemMap = {
      1: { name: 'Extra Time +10s', icon: Clock, color: 'text-blue-400', description: '+10 seconds', value: 750 },
      2: { name: 'Extra Time +20s', icon: Timer, color: 'text-blue-400', description: '+20 seconds', value: 1500 },
      3: { name: 'Cookie Bomb', icon: Bomb, color: 'text-red-400', description: 'Start with bomb', value: 1000 },
      4: { name: 'Double Points', icon: ChevronsUp, color: 'text-green-400', description: '2x score multiplier', value: 1500 }
    };
    return itemMap[itemId] || { name: 'Unknown Item', icon: Package, color: 'text-gray-400', description: 'Unknown effect', value: 0 };
  };

  return (
    <div className="relative flex flex-col h-full p-4 space-y-4 bg-background text-primary">
      
      {/* Ghost Bomb Element - follows pointer during drag */}
      {isDraggingBomb && (
        <motion.div
          className="fixed pointer-events-none z-50 w-12 h-12 bg-red-600 rounded-full flex items-center justify-center shadow-lg border-2 border-red-400"
          style={{
            left: ghostBombPosition.x - 24,
            top: ghostBombPosition.y - 24,
          }}
          initial={{ scale: 0.8, opacity: 0.8 }}
          animate={{ scale: 1, opacity: 1 }}
        >
          <Bomb className="w-6 h-6 text-white" />
        </motion.div>
      )}
      
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
          </div>
        </motion.div>
      )}

      {/* Pre-game Setup */}
      {!gameStarted && !isGameOver && (
        <motion.div 
          className="absolute inset-0 bg-black/50 flex flex-col items-center justify-center z-40 p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3 }}
        >
          <div className="bg-nav rounded-2xl p-8 text-center max-w-sm w-full border border-gray-700">
            <h2 className="text-3xl font-bold text-primary mb-4">Ready to Play?</h2>
            <div className="flex justify-center mb-6">
              <img 
                src="https://ik.imagekit.io/59r2kpz8r/Meowchi%202%20/MeowchiCat.webp?updatedAt=1758909417672" 
                alt="Meowchi Cat" 
                className="w-20 h-20 object-contain"
              />
            </div>
            
            <div className="bg-background/50 p-4 rounded-xl mb-6 border border-gray-700">
              <p className="text-lg font-bold text-accent mb-2">Meowchi Match Game</p>
              <p className="text-sm text-secondary">Match 3 or more pieces to score points!</p>
            </div>
            
            <button
              onClick={startGame}
              className="w-full py-4 rounded-xl font-bold text-xl flex items-center justify-center space-x-2 bg-accent text-background hover:bg-accent/90 transition-colors"
            >
              <Play size={24} />
              <span>Start Game</span>
            </button>
          </div>
        </motion.div>
      )}

      {/* Game Header - CLEANED UP (no inventory button) */}
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

      {/* Visual Boost Indicators */}
      <AnimatePresence>
        {gameStarted && !isGameOver && (activeBoosts.timeBoost > 0 || activeBoosts.bomb || activeBoosts.pointMultiplier) && (
          <motion.div
            className="bg-nav/90 backdrop-blur-sm rounded-xl p-3 border border-gray-700"
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
          >
            <div className="flex items-center justify-center space-x-4 text-sm">
              {activeBoosts.timeBoost > 0 && (
                <div className="flex items-center space-x-1 text-blue-400">
                  <Clock className="w-4 h-4" />
                  <span>+{activeBoosts.timeBoost}s Time</span>
                </div>
              )}
              {activeBoosts.bomb && (
                <div className="flex items-center space-x-1 text-red-400">
                  <Bomb className="w-4 h-4" />
                  <span>Bomb Ready</span>
                </div>
              )}
              {activeBoosts.pointMultiplier && (
                <motion.div 
                  className="flex items-center space-x-1 text-green-400"
                  animate={{ scale: [1, 1.1, 1] }}
                  transition={{ duration: 2, repeat: Infinity }}
                >
                  <ChevronsUp className="w-4 h-4" />
                  <span>2x Points</span>
                </motion.div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

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
          onGameBoardRef={handleGameBoardRef}
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
            
            {/* Debug indicator for function availability */}
            {!shuffleFunction && gameStarted && (
              <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-3 h-3 flex items-center justify-center">
                !
              </span>
            )}
          </motion.button>
        </motion.div>
      )}

      {/* Inline Items Toolbar - TMA-Compatible with Pointer Events */}
      {gameStarted && !isGameOver && availableItems.length > 0 && (
        <motion.div 
          className="flex items-center justify-center space-x-4 p-3 bg-nav rounded-xl border border-gray-700 mx-4"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.6 }}
        >
          {availableItems.map((item) => {
            const details = getItemDetails(item.item_id);
            const ItemIcon = details.icon;
            
            return (
              <motion.button
                key={item.item_id}
                onClick={() => {
                  if (item.item_id === 1) {
                    handleUseItem(item.item_id);
                  }
                }}
                onPointerDown={(e) => {
                  if (item.item_id === 3) {
                    startDraggingBomb(e);
                  }
                }}
                className={`flex flex-col items-center p-3 rounded-lg border transition-all duration-200 relative ${
                  item.item_id === 1 
                    ? 'bg-blue-600/20 border-blue-500 hover:bg-blue-600/30 cursor-pointer'
                    : item.item_id === 3
                    ? 'bg-red-600/20 border-red-500 hover:bg-red-600/30 cursor-grab'
                    : 'bg-gray-600/20 border-gray-600 opacity-50'
                }`}
                whileTap={item.item_id === 1 ? { scale: 0.95 } : {}}
                disabled={item.quantity <= 0}
                style={{ touchAction: 'none' }}
              >
                <ItemIcon className={`w-6 h-6 mb-1 ${details.color}`} />
                <span className="text-xs text-primary font-medium">{item.quantity}</span>
                
                {/* Usage hint */}
                <div className="absolute -top-2 -right-2 text-xs">
                  {item.item_id === 1 && '⏰'}
                  {item.item_id === 3 && '💥'}
                </div>
              </motion.button>
            );
          })}
        </motion.div>
      )}
    </div>
  );
};

export default GamePage;
