import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import GameBoard from '../components/game/GameBoard';
import { Star, Clock, LoaderCircle, Play, RotateCcw, Bomb, ChevronsUp, Package, Zap, Timer, CheckCircle, Settings } from 'lucide-react';
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
  
  // PHASE 1: Inventory state
  const [inventory, setInventory] = useState([]);
  const [isActivatingItem, setIsActivatingItem] = useState(null);
  const [showInventory, setShowInventory] = useState(false);
  
  // PHASE 2: NEW Pre-game item selection state
  const [availableItems, setAvailableItems] = useState([]);
  const [selectedItems, setSelectedItems] = useState(new Set());
  const [showItemSelection, setShowItemSelection] = useState(false);
  const [isConfiguringGame, setIsConfiguringGame] = useState(false);
  
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

  // Handle game over submission
  useEffect(() => {
    if (!isGameOver || isSubmitting) return;

    const submitScore = async () => {
      setIsSubmitting(true);
      
      if (score > 0) {
        const tg = window.Telegram?.WebApp;
        
        if (tg && tg.initData && BACKEND_URL) {
          try {
            console.log('Submitting score:', score);
            
            const response = await fetch(`${BACKEND_URL}/api/update-score`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ initData: tg.initData, score: score }),
            });
            
            const data = await response.json();
            
            if (response.ok) {
              console.log('Score submitted successfully:', data);
              
              const multiplierText = activeBoosts.pointMultiplier ? '\n🔥 Double Points Applied!' : '';
              const finalScore = data.score_awarded || score;
              
              // Show success popup
              tg.showPopup({
                title: 'Game Over!',
                message: `🎉 You scored ${finalScore.toLocaleString()} points!${multiplierText}\n\nTotal points: ${data.new_points?.toLocaleString() || 'Unknown'}`,
                buttons: [
                  { text: 'Play Again', type: 'default', id: 'play_again' },
                  { text: 'Home', type: 'default', id: 'home' }
                ]
              }, (buttonId) => {
                if (buttonId === 'play_again') {
                  restartGame();
                } else {
                  navigate('/');
                }
              });
            } else {
              throw new Error(data.error || 'Failed to submit score');
            }
          } catch (error) {
            console.error('Error submitting score:', error);
            
            tg.showPopup({
              title: 'Error',
              message: 'Could not save your score. Please try again later.',
              buttons: [{ text: 'OK', type: 'ok' }]
            }, () => navigate('/'));
          }
        } else {
          // Browser mode - just show score
          console.log(`Game Over! Final Score: ${score}`);
          setTimeout(() => {
            const message = `Game Over!\n\nFinal Score: ${score.toLocaleString()}${activeBoosts.pointMultiplier ? '\n🔥 Double Points Applied!' : ''}\n\nPlay again?`;
            if (confirm(message)) {
              restartGame();
            } else {
              navigate('/');
            }
          }, 1000);
        }
      } else {
        // No score to submit
        setTimeout(() => navigate('/'), 1500);
      }
      
      setIsSubmitting(false);
    };

    // Delay submission by 1 second to show final score
    const timeoutId = setTimeout(submitScore, 1000);
    return () => clearTimeout(timeoutId);
  }, [isGameOver, score, navigate, isSubmitting, activeBoosts.pointMultiplier]);

  // Disable Telegram swipes during game
  useEffect(() => {
    const tg = window.Telegram?.WebApp;
    if (tg) {
      tg.disableVerticalSwipes();
      return () => tg.enableVerticalSwipes();
    }
  }, []);

  // PHASE 2: ENHANCED loadInventory - Gets available items for selection
  const loadInventory = async () => {
    const tg = window.Telegram?.WebApp;
    
    try {
      if (!tg || !tg.initData || !BACKEND_URL) {
        // Browser mode - use mock data
        console.log('Browser mode: Using mock inventory');
        setAvailableItems([
          { item_id: 1, quantity: 2 },
          { item_id: 4, quantity: 1 }
        ]);
        setInventory([]);
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
        
        // Set available items (for pre-game selection)
        setAvailableItems(userInventory);
        
        // Set active inventory (consumables like Double Points)
        const consumableItems = userInventory.filter(item => 
          item.item_id === 4 && item.quantity > 0 // Only Double Points for in-game use
        );
        setInventory(consumableItems);
        
        // Check if point multiplier is already active
        const pointMultiplier = shopData.boosterActive || false;
        if (pointMultiplier) {
          setActiveBoosts(prev => ({ ...prev, pointMultiplier: true }));
        }
        
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

  // PHASE 2: NEW configureGameWithSelectedItems
  const configureGameWithSelectedItems = async () => {
    const tg = window.Telegram?.WebApp;
    setIsConfiguringGame(true);
    
    try {
      if (!tg || !tg.initData || !BACKEND_URL) {
        // Browser mode - simulate item usage
        console.log('Browser mode: Simulating item configuration');
        
        let totalTimeBonus = 0;
        let hasBomb = false;
        
        // Calculate effects based on selected items
        selectedItems.forEach(itemId => {
          if (itemId === 1) totalTimeBonus += 10; // +10s Time
          if (itemId === 2) totalTimeBonus += 20; // +20s Time  
          if (itemId === 3) hasBomb = true;       // Cookie Bomb
          // Double Points (4) is handled separately in-game
        });
        
        setGameConfig({ 
          startTime: 30 + totalTimeBonus, 
          startWithBomb: hasBomb 
        });
        
        setActiveBoosts({
          timeBoost: totalTimeBonus,
          bomb: hasBomb,
          pointMultiplier: selectedItems.has(4) // If Double Points selected
        });
        
        return;
      }

      console.log('Configuring game with selected items:', Array.from(selectedItems));

      // Send selected items to backend for consumption
      const sessionRes = await fetch(`${BACKEND_URL}/api/start-game-session-with-items`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          initData: tg.initData, 
          selectedItems: Array.from(selectedItems)
        }),
      });

      let sessionData = { startTime: 30, startWithBomb: false };
      
      if (sessionRes.ok) {
        sessionData = await sessionRes.json();
        console.log('Game configured with items:', sessionData);
      } else {
        // Fallback to old endpoint if new one doesn't exist
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
      
      // Calculate applied boosts
      const timeBoost = sessionData.startTime - 30;
      
      setActiveBoosts({
        timeBoost,
        bomb: sessionData.startWithBomb,
        pointMultiplier: selectedItems.has(4) // Double Points selected
      });

    } catch (error) {
      console.error('Error configuring game:', error);
      setGameConfig({ startTime: 30, startWithBomb: false });
      setActiveBoosts({ timeBoost: 0, bomb: false, pointMultiplier: false });
    } finally {
      setIsConfiguringGame(false);
    }
  };

  // PHASE 1: Activate item handler (for in-game Double Points)
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

      // Update local state immediately
      if (itemId === 4) { // Double Points
        setActiveBoosts(prev => ({ ...prev, pointMultiplier: true }));
        
        // Remove from inventory
        setInventory(prev => {
          return prev.map(item => 
            item.item_id === itemId && item.quantity > 1
              ? { ...item, quantity: item.quantity - 1 }
              : item
          ).filter(item => !(item.item_id === itemId && item.quantity <= 1));
        });
      }

      // Success feedback
      tg.HapticFeedback?.notificationOccurred('success');
      tg.showPopup({
        title: 'Success!',
        message: result.message,
        buttons: [{ type: 'ok' }]
      });

    } catch (error) {
      console.error('Activation error:', error);
      tg?.HapticFeedback?.notificationOccurred('error');
      tg?.showPopup({
        title: 'Error',
        message: error.message,
        buttons: [{ type: 'ok' }]
      });
    } finally {
      setIsActivatingItem(null);
    }
  };

  // PHASE 2: NEW handleItemSelection
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

  // PHASE 2: NEW startGameWithConfiguration
  const startGameWithConfiguration = async () => {
    if (availableItems.length > 0) {
      setShowItemSelection(true);
    } else {
      // No items to configure, start normally
      await configureGameWithSelectedItems();
      setGameStarted(true);
      setScore(0);
      setTimeLeft(gameConfig.startTime);
      setIsGameOver(false);
      setIsSubmitting(false);
      setShowInventory(false);
    }
  };

  // PHASE 2: NEW confirmGameStart
  const confirmGameStart = async () => {
    setShowItemSelection(false);
    await configureGameWithSelectedItems();
    
    setGameStarted(true);
    setScore(0);
    setTimeLeft(gameConfig.startTime);
    setIsGameOver(false);
    setIsSubmitting(false);
    setShowInventory(false);
  };

  const restartGame = async () => {
    console.log('Restarting game...');
    setGameStarted(false);
    setScore(0);
    setIsGameOver(false);
    setIsSubmitting(false);
    setShowInventory(false);
    setShowItemSelection(false);
    setSelectedItems(new Set());
    
    // Reload inventory for new game
    await loadInventory();
  };

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
      1: { name: 'Extra Time +10s', icon: Clock, color: 'text-blue-400', description: '+10 seconds' },
      2: { name: 'Extra Time +20s', icon: Timer, color: 'text-blue-400', description: '+20 seconds' },
      3: { name: 'Cookie Bomb', icon: Bomb, color: 'text-red-400', description: 'Start with bomb' },
      4: { name: 'Double Points', icon: ChevronsUp, color: 'text-green-400', description: '2x score multiplier' }
    };
    return itemMap[itemId] || { name: 'Unknown Item', icon: Package, color: 'text-gray-400', description: 'Unknown effect' };
  };

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

      {/* PHASE 2: NEW Item Selection Overlay */}
      <AnimatePresence>
        {showItemSelection && (
          <motion.div 
            className="absolute inset-0 bg-black/75 flex flex-col items-center justify-center z-40 p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3 }}
          >
            <div className="bg-nav rounded-2xl p-6 text-center max-w-md w-full border border-gray-700">
              <h2 className="text-2xl font-bold text-primary mb-4 flex items-center justify-center">
                <Settings className="w-6 h-6 mr-2 text-accent" />
                Select Items
              </h2>
              <p className="text-sm text-secondary mb-6">Choose which items to use for this game:</p>
              
              <div className="space-y-3 mb-6 max-h-64 overflow-y-auto">
                {availableItems.map((item) => {
                  const details = getItemDetails(item.item_id);
                  const ItemIcon = details.icon;
                  const isSelected = selectedItems.has(item.item_id);
                  
                  return (
                    <motion.button
                      key={item.item_id}
                      onClick={() => handleItemSelection(item.item_id)}
                      className={`w-full p-4 rounded-lg border-2 transition-all duration-200 ${
                        isSelected 
                          ? 'border-accent bg-accent/20' 
                          : 'border-gray-600 bg-background/50 hover:border-gray-500'
                      }`}
                      whileTap={{ scale: 0.98 }}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <ItemIcon className={`w-6 h-6 ${details.color}`} />
                          <div className="text-left">
                            <p className="font-medium text-primary">{details.name}</p>
                            <p className="text-xs text-secondary">{details.description}</p>
                            <p className="text-xs text-accent">Available: {item.quantity}</p>
                          </div>
                        </div>
                        {isSelected && <CheckCircle className="w-6 h-6 text-accent" />}
                      </div>
                    </motion.button>
                  );
                })}
              </div>
              
              <div className="flex space-x-3">
                <button
                  onClick={() => setShowItemSelection(false)}
                  className="flex-1 bg-gray-600 text-primary py-3 px-4 rounded-xl font-bold hover:bg-gray-700 transition-colors"
                >
                  Skip
                </button>
                <button
                  onClick={confirmGameStart}
                  disabled={isConfiguringGame}
                  className="flex-1 bg-accent text-background py-3 px-4 rounded-xl font-bold flex items-center justify-center space-x-2 hover:bg-accent/90 transition-colors disabled:opacity-50"
                >
                  {isConfiguringGame ? (
                    <LoaderCircle className="w-5 h-5 animate-spin" />
                  ) : (
                    <>
                      <Play size={20} />
                      <span>Start Game</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Pre-game Setup */}
      {!gameStarted && !isGameOver && !showItemSelection && (
        <motion.div 
          className="absolute inset-0 bg-black/50 flex flex-col items-center justify-center z-40 p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3 }}
        >
          <div className="bg-nav rounded-2xl p-8 text-center max-w-sm w-full border border-gray-700">
            <h2 className="text-3xl font-bold text-primary mb-4">Ready to Play?</h2>
            <div className="text-6xl mb-6">🍪</div>
            
            <div className="bg-background/50 p-4 rounded-xl mb-6 border border-gray-700">
              <p className="text-lg font-bold text-accent mb-2">Cookie Match Game</p>
              <p className="text-sm text-secondary">Match 3 or more pieces to score points!</p>
              
              {availableItems.length > 0 && (
                <p className="text-xs text-accent mt-2">
                  You have {availableItems.length} item{availableItems.length !== 1 ? 's' : ''} available
                </p>
              )}
            </div>
            
            <button
              onClick={startGameWithConfiguration}
              className="w-full py-4 rounded-xl font-bold text-xl flex items-center justify-center space-x-2 bg-accent text-background hover:bg-accent/90 transition-colors"
            >
              <Play size={24} />
              <span>
                {availableItems.length > 0 ? 'Configure & Start' : 'Start Game'}
              </span>
            </button>
          </div>
        </motion.div>
      )}

      {/* Game Header */}
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
          {/* Inventory toggle button */}
          {gameStarted && !isGameOver && inventory.length > 0 && (
            <motion.button
              onClick={() => setShowInventory(!showInventory)}
              className="bg-nav p-3 rounded-xl shadow-lg border border-gray-700 hover:bg-gray-600 transition-colors"
              whileTap={{ scale: 0.95 }}
            >
              <Package className="w-6 h-6 text-accent" />
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

      {/* PHASE 2: NEW Visual Boost Indicators */}
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

      {/* Floating Inventory Panel */}
      <AnimatePresence>
        {showInventory && gameStarted && !isGameOver && (
          <motion.div
            className="absolute top-20 right-4 bg-nav rounded-xl p-4 shadow-2xl border border-gray-700 z-30 min-w-64"
            initial={{ opacity: 0, x: 100, scale: 0.8 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 100, scale: 0.8 }}
            transition={{ duration: 0.3 }}
          >
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-bold text-primary flex items-center">
                <Package className="w-5 h-5 mr-2 text-accent" />
                Inventory
              </h3>
              <button
                onClick={() => setShowInventory(false)}
                className="text-secondary hover:text-primary"
              >
                ✕
              </button>
            </div>
            
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {inventory.map((item) => {
                const details = getItemDetails(item.item_id);
                const ItemIcon = details.icon;
                const canActivate = item.item_id === 4 && !activeBoosts.pointMultiplier; // Only Double Points can be activated
                
                return (
                  <div
                    key={item.item_id}
                    className="flex items-center justify-between p-3 bg-background/50 rounded-lg border border-gray-600"
                  >
                    <div className="flex items-center space-x-3">
                      <ItemIcon className={`w-5 h-5 ${details.color}`} />
                      <div>
                        <p className="text-sm font-medium text-primary">{details.name}</p>
                        <p className="text-xs text-secondary">Qty: {item.quantity}</p>
                      </div>
                    </div>
                    
                    {canActivate && (
                      <motion.button
                        onClick={() => handleActivateItem(item.item_id)}
                        disabled={isActivatingItem === item.item_id}
                        className="bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded text-xs font-bold transition-colors disabled:opacity-50"
                        whileTap={{ scale: 0.95 }}
                      >
                        {isActivatingItem === item.item_id ? (
                          <LoaderCircle className="w-4 h-4 animate-spin" />
                        ) : (
                          'USE'
                        )}
                      </motion.button>
                    )}
                    
                    {item.item_id === 4 && activeBoosts.pointMultiplier && (
                      <span className="text-xs text-green-400 font-bold">ACTIVE</span>
                    )}
                  </div>
                );
              })}
              
              {inventory.length === 0 && (
                <p className="text-center text-secondary text-sm py-4">
                  No items available
                </p>
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
        />
      </motion.div>
      
      {/* Instructions */}
      {gameStarted && !isGameOver && (
        <motion.div 
          className="text-center text-secondary max-w-md mx-auto"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.6 }}
        >
          <p className="text-sm">
            Drag emojis to adjacent spots to create matches of 3 or more! 🍪✨
          </p>
          {inventory.length > 0 && (
            <p className="text-xs mt-1 text-accent">
              Tap 📦 to access your items
            </p>
          )}
        </motion.div>
      )}
    </div>
  );
};

export default GamePage;
