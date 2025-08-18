// Initialize Telegram Web App and user
  useEffect(() => {
    // Enhanced responsive system - like Hamster Kombat
    const setResponsiveScale = () => {
      const width = window.innerWidth;
      const height = window.innerHeight;
      
      // Calculate optimal scale based on screen size
      const widthScale = width / 375; // Base width (iPhone 6/7/8)
      const heightScale = height / 667; // Base height (iPhone 6/7/8)
      const optimalScale = Math.min(widthScale, heightScale, 1.3); // Max 1.3x scale
      
      // Set CSS custom properties for unified responsive system
      document.documentElement.style.setProperty('--app-scale', Math.max(optimalScale, 0.7).toString());
      document.documentElement.style.setProperty('--screen-width', `${width}px`);
      document.documentElement.style.setProperty('--screen-height', `${height}px`);
    };

    if (window.Telegram?.WebApp) {
      const tg = window.Telegram.WebApp;
      tg.ready();
      tg.expand(); // Get maximum stable height
      
      // Set up viewport handling with enhanced responsive scaling
      const updateViewport = () => {
        setTelegramViewport({
          height: tg.viewportHeight || window.innerHeight,
          stableHeight: tg.viewportStableHeight || window.innerHeight
        });
        
        // Update responsive scaling when viewport changes
        setResponsiveScale();
      };
      
      updateViewport();
      tg.onEvent?.('viewportChanged', updateViewport);
      
      // Set CSS custom properties for consistent sizing
      document.documentElement.style.setProperty('--app-height', `${tg.viewportStableHeight || window.innerHeight}px`);
      
      if (tg.backgroundColor) {
        document.body.style.backgroundColor = tg.backgroundColor;
      }

      // Get Telegram user data
      const user = tg.initDataUnsafe?.user;
      if (user) {
        setUserState(prev => ({ ...prev, telegramUser: user }));
        initializeUser(user);
      } else {
        // Fallback for testing outside Telegram
        const testUser = {
          id: 123456789,
          username: 'testuser',
          first_name: 'Test',
          last_name: 'User'
        };
        setUserState(prev => ({ ...prev, telegramUser: testUser }));
        initializeUser(testUser);
      }
    } else {
      // Fallback for development with responsive scaling
      setResponsiveScale();
      document.documentElement.style.setProperty('--app-height', `${window.innerHeight}px`);
      
      const testUser = {
        id: 123456789,
        username: 'testuser',
        first_name: 'Test',
        last_name: 'User'
      };
      setUserState(prev => ({ ...prev, telegramUser: testUser }));
      initializeUser(testUser);
    }

    // Listen for resize events and update scaling
    const handleResize = () => {
      setResponsiveScale();
    };
    
    window.addEventListener('resize', handleResize);
    window.addEventListener('orientationchange', handleResize);
    
    // Initial scale setting
    setResponsiveScale();
    
    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('orientationchange', handleResize);
    };
  }, []);import React, { useState, useEffect, useRef } from 'react';

const CAT_EMOJIS = ['😺', '😻', '😼', '🐈', '🐈‍⬛'];
const INITIAL_TIME = 60;
const MATCH_SCORE = 1000;
const COMBO_BONUS = 500;

// API helper functions
const API_BASE = window.location.origin;

const apiCall = async (endpoint, options = {}) => {
  try {
    const response = await fetch(`${API_BASE}/api${endpoint}`, {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    });
    return await response.json();
  } catch (error) {
    console.error('API call failed:', error);
    return { success: false, error: error.message };
  }
};

function App() {
  const [gameState, setGameState] = useState({
    timeLeft: INITIAL_TIME,
    score: 0,
    columns: { left: [], center: [], right: [] },
    isActive: false,
    consecutiveMatches: 0,
    gameStarted: false,
    nextCat: CAT_EMOJIS[Math.floor(Math.random() * CAT_EMOJIS.length)],
    currentTab: 'play',
    matchesMade: 0,
    maxCombo: 0
  });

  const [userState, setUserState] = useState({
    telegramUser: null,
    bestScore: null,
    stats: null,
    isLoading: true
  });

  const [leaderboard, setLeaderboard] = useState([]);

  const [dragState, setDragState] = useState({
    isDragging: false,
    draggedCat: null,
    fromColumn: null,
    dragPosition: { x: 0, y: 0 },
    highlightedColumn: null,
    startPosition: { x: 0, y: 0 }
  });

  const [animations, setAnimations] = useState([]);
  const [currentTagline, setCurrentTagline] = useState(0);
  const [spinningEmojis, setSpinningEmojis] = useState({});
  const [isLayoutReady, setIsLayoutReady] = useState(false);
  const [telegramViewport, setTelegramViewport] = useState({
    height: window.innerHeight,
    stableHeight: window.innerHeight
  });
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [pawPositions, setPawPositions] = useState([]);
  const taglines = [
    "😼 Chaos Mode Activated",
    "🐾 Don't Blink, Human", 
    "🔥 Catnado Incoming"
  ];
  
  const gameTimerRef = useRef(null);
  const boardRef = useRef(null);
  const dragThreshold = 15;

  // Initialize Telegram Web App and user
  useEffect(() => {
    if (window.Telegram?.WebApp) {
      const tg = window.Telegram.WebApp;
      tg.ready();
      tg.expand(); // Get maximum stable height
      
      // Set up viewport handling
      const updateViewport = () => {
        setTelegramViewport({
          height: tg.viewportHeight || window.innerHeight,
          stableHeight: tg.viewportStableHeight || window.innerHeight
        });
      };
      
      updateViewport();
      tg.onEvent?.('viewportChanged', updateViewport);
      
      // Set CSS custom properties for consistent sizing
      const screenWidth = window.innerWidth;
      const baseFontSize = Math.min(Math.max(screenWidth / 375 * 16, 12), 20);
      document.documentElement.style.setProperty('--base-font-size', `${baseFontSize}px`);
      document.documentElement.style.setProperty('--app-height', `${tg.viewportStableHeight || window.innerHeight}px`);
      
      if (tg.backgroundColor) {
        document.body.style.backgroundColor = tg.backgroundColor;
      }

      // Get Telegram user data
      const user = tg.initDataUnsafe?.user;
      if (user) {
        setUserState(prev => ({ ...prev, telegramUser: user }));
        initializeUser(user);
      } else {
        // Fallback for testing outside Telegram
        const testUser = {
          id: 123456789,
          username: 'testuser',
          first_name: 'Test',
          last_name: 'User'
        };
        setUserState(prev => ({ ...prev, telegramUser: testUser }));
        initializeUser(testUser);
      }
    } else {
      // Fallback for development
      const screenWidth = window.innerWidth;
      const baseFontSize = Math.min(Math.max(screenWidth / 375 * 16, 12), 20);
      document.documentElement.style.setProperty('--base-font-size', `${baseFontSize}px`);
      document.documentElement.style.setProperty('--app-height', `${window.innerHeight}px`);
      
      const testUser = {
        id: 123456789,
        username: 'testuser',
        first_name: 'Test',
        last_name: 'User'
      };
      setUserState(prev => ({ ...prev, telegramUser: testUser }));
      initializeUser(testUser);
    }
  }, []);

  // Initialize user in database
  const initializeUser = async (user) => {
    const result = await apiCall('/user', {
      method: 'POST',
      body: JSON.stringify({
        telegram_id: user.id,
        username: user.username,
        first_name: user.first_name,
        last_name: user.last_name
      })
    });

    if (result.success) {
      loadUserData(user.id);
    }
  };

  // Load user data
  const loadUserData = async (telegramId) => {
    try {
      const [bestScoreResult, statsResult] = await Promise.all([
        apiCall(`/user/${telegramId}/best-score`),
        apiCall(`/user/${telegramId}/stats`)
      ]);

      setUserState(prev => ({
        ...prev,
        bestScore: bestScoreResult.success ? bestScoreResult.bestScore : null,
        stats: statsResult.success ? statsResult.stats : null,
        isLoading: false
      }));
    } catch (error) {
      console.error('Error loading user data:', error);
      setUserState(prev => ({ ...prev, isLoading: false }));
    }
  };

  // Load leaderboard
  const loadLeaderboard = async () => {
    const result = await apiCall('/leaderboard?limit=50');
    if (result.success) {
      setLeaderboard(result.leaderboard);
    }
  };

  // Save game score
  const saveGameScore = async (finalScore, duration, matches, maxCombo) => {
    if (!userState.telegramUser) return;

    const result = await apiCall('/score', {
      method: 'POST',
      body: JSON.stringify({
        telegram_id: userState.telegramUser.id,
        score: finalScore,
        game_duration: duration,
        matches_made: matches,
        max_combo: maxCombo
      })
    });

    if (result.success) {
      // Refresh user data after saving score
      loadUserData(userState.telegramUser.id);
    }
  };

  // Game timer
  useEffect(() => {
    if (gameState.isActive && gameState.timeLeft > 0) {
      gameTimerRef.current = setTimeout(() => {
        setGameState(prev => ({ ...prev, timeLeft: prev.timeLeft - 1 }));
      }, 1000);
    } else if (gameState.timeLeft === 0 && gameState.isActive) {
      endGame();
    }
    return () => {
      if (gameTimerRef.current) {
        clearTimeout(gameTimerRef.current);
      }
    };
  }, [gameState.timeLeft, gameState.isActive]);

  // Tagline rotation
  useEffect(() => {
    if (gameState.isActive) {
      const taglineTimer = setInterval(() => {
        setCurrentTagline(prev => (prev + 1) % taglines.length);
      }, 2000);
      return () => clearInterval(taglineTimer);
    }
  }, [gameState.isActive]);

  // Load leaderboard when leaderboard tab is opened
  useEffect(() => {
    if (gameState.currentTab === 'leaderboard') {
      loadLeaderboard();
    }
  }, [gameState.currentTab]);

  // Auto-spin emojis on welcome screen load - AFTER loading screen disappears
  useEffect(() => {
    if (!gameState.gameStarted && gameState.currentTab === 'play' && isLayoutReady) {
      // Only trigger auto-spin AFTER welcome screen is visible
      setTimeout(() => {
        const emojiIndices = [0, 1, 2, 3, 4];
        emojiIndices.forEach((index, i) => {
          setTimeout(() => {
            setSpinningEmojis(prev => ({
              ...prev,
              [index]: true
            }));
            
            // Remove spinning state after animation completes
            setTimeout(() => {
              setSpinningEmojis(prev => ({
                ...prev,
                [index]: false
              }));
            }, 1000);
          }, i * 100); // Staggered delay: 0ms, 100ms, 200ms, 300ms, 400ms
        });
      }, 500); // Wait 500ms after welcome screen appears
    }
  }, [gameState.gameStarted, gameState.currentTab, isLayoutReady]);

  // Simple loading management - Telegram style
  useEffect(() => {
    if (!gameState.gameStarted && gameState.currentTab === 'play') {
      setIsLayoutReady(false);
      setLoadingProgress(0);
      
      // Simple walking paw animation
      const generateSimplePawPath = () => {
        const path = [];
        for (let i = 0; i <= 8; i++) {
          const progress = i / 8;
          const x = 15 + progress * 70; // 15% to 85% of screen width
          const y = 40 + Math.sin(progress * Math.PI) * 5; // Gentle arc
          path.push({ x, y, visible: false });
        }
        return path;
      };

      setPawPositions(generateSimplePawPath());

      // Walking animation
      let pawStep = 0;
      const walkingInterval = setInterval(() => {
        setPawPositions(prev => prev.map((paw, index) => ({
          ...paw,
          visible: index === pawStep || index === pawStep - 1
        })));
        
        pawStep = (pawStep + 1) % 9;
      }, 600);

      // Progress tracking
      let progress = 0;
      const progressInterval = setInterval(() => {
        progress += 3;
        setLoadingProgress(progress);
      }, 100);

      // Simple 3-second loading with Telegram viewport ready check
      setTimeout(() => {
        // Layout is ready after Telegram viewport is stable
        setIsLayoutReady(true);
        clearInterval(walkingInterval);
        clearInterval(progressInterval);
      }, 3000);

      return () => {
        clearInterval(walkingInterval);
        clearInterval(progressInterval);
      };
    }
  }, [gameState.gameStarted, gameState.currentTab]);

  // Handle emoji spinning - more responsive
  const handleEmojiClick = (emojiIndex) => {
    // Immediately start spinning
    setSpinningEmojis(prev => ({
      ...prev,
      [emojiIndex]: true
    }));
    
    // Remove spinning state after animation completes
    setTimeout(() => {
      setSpinningEmojis(prev => ({
        ...prev,
        [emojiIndex]: false
      }));
    }, 1000);
    
    // Add haptic feedback if available
    if (navigator.vibrate) {
      navigator.vibrate(50);
    }
  };

  const generateCatId = () => `cat_${Date.now()}_${Math.random()}`;

  const startGame = () => {
    setGameState(prev => ({
      ...prev,
      timeLeft: INITIAL_TIME,
      score: 0,
      columns: { left: [], center: [], right: [] },
      isActive: true,
      consecutiveMatches: 0,
      gameStarted: true,
      currentTab: 'play',
      nextCat: CAT_EMOJIS[Math.floor(Math.random() * CAT_EMOJIS.length)],
      matchesMade: 0,
      maxCombo: 0
    }));
    setAnimations([]);
    resetDragState();
  };

  const endGame = () => {
    const finalScore = gameState.score;
    const gameDuration = INITIAL_TIME - gameState.timeLeft;
    const matches = gameState.matchesMade;
    const maxCombo = gameState.maxCombo;

    setGameState(prev => ({ ...prev, isActive: false }));
    
    // Save score to database
    saveGameScore(finalScore, gameDuration, matches, maxCombo);
  };

  const createExplosion = (x, y, emoji, scoreGained) => {
    const explosionId = `explosion_${Date.now()}_${Math.random()}`;
    const screenCenterX = window.innerWidth / 2;
    const screenCenterY = window.innerHeight / 2;
    const newAnimation = {
      id: explosionId,
      x: screenCenterX,
      y: screenCenterY,
      emoji,
      scoreGained,
      timestamp: Date.now()
    };
    setAnimations(prev => [...prev, newAnimation]);
    setTimeout(() => {
      setAnimations(prev => prev.filter(anim => anim.id !== explosionId));
    }, 2000);
  };

  const dropNewCat = (column) => {
    if (!gameState.isActive || dragState.isDragging) return;
    if (gameState.columns[column].length >= 6) return;

    const newCat = { id: generateCatId(), emoji: gameState.nextCat };
    const nextNextCat = CAT_EMOJIS[Math.floor(Math.random() * CAT_EMOJIS.length)];

    setGameState(prev => {
      const newColumns = { ...prev.columns };
      newColumns[column] = [...newColumns[column], newCat];
      const { updatedColumns, scoreGained, matchFound } = checkMatches(newColumns, column, prev.consecutiveMatches);
      
      const newConsecutiveMatches = scoreGained > 0 ? prev.consecutiveMatches + 1 : 0;
      const newMaxCombo = Math.max(prev.maxCombo, newConsecutiveMatches);
      
      return {
        ...prev,
        columns: updatedColumns,
        score: prev.score + scoreGained,
        consecutiveMatches: newConsecutiveMatches,
        nextCat: nextNextCat,
        matchesMade: prev.matchesMade + (matchFound ? 1 : 0),
        maxCombo: newMaxCombo
      };
    });
  };

  const checkMatches = (columns, targetColumn, consecutiveMatches) => {
    const updatedColumns = { ...columns };
    let scoreGained = 0;
    let matchFound = false;
    const column = updatedColumns[targetColumn];
    
    if (column.length >= 3) {
      for (let i = column.length - 1; i >= 2; i--) {
        if (column[i].emoji === column[i-1].emoji && column[i].emoji === column[i-2].emoji) {
          scoreGained = MATCH_SCORE + (consecutiveMatches * COMBO_BONUS);
          matchFound = true;
          const matchedEmoji = column[i].emoji;
          
          // Remove matched cats immediately
          updatedColumns[targetColumn] = [
            ...updatedColumns[targetColumn].slice(0, i-2),
            ...updatedColumns[targetColumn].slice(i+1)
          ];
          
          // Create explosion effect
          setTimeout(() => {
            createExplosion(0, 0, matchedEmoji, scoreGained);
          }, 100);
          break;
        }
      }
    }
    return { updatedColumns, scoreGained, matchFound };
  };

  const getColumnFromPosition = (x, y) => {
    if (!boardRef.current) return null;
    const columns = boardRef.current.querySelectorAll('[data-column]');
    for (let i = 0; i < columns.length; i++) {
      const column = columns[i];
      const rect = column.getBoundingClientRect();
      if (x >= rect.left && x <= rect.right) {
        return column.getAttribute('data-column');
      }
    }
    return null;
  };

  const getDistanceMoved = (startPos, currentPos) => {
    const dx = currentPos.x - startPos.x;
    const dy = currentPos.y - startPos.y;
    return Math.sqrt(dx * dx + dy * dy);
  };

  const handleDragStart = (e, catId, fromColumn) => {
    if (!gameState.isActive) return;
    
    e.preventDefault();
    e.stopPropagation();

    // Set pointer capture if available
    if (e.pointerId && e.currentTarget.setPointerCapture) {
      e.currentTarget.setPointerCapture(e.pointerId);
    }
    
    let clientX, clientY;
    if (e.touches) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }
    
    const cat = gameState.columns[fromColumn].find(c => c.id === catId);
    
    setDragState({
      isDragging: true,
      draggedCat: cat,
      fromColumn: fromColumn,
      dragPosition: { x: clientX, y: clientY },
      startPosition: { x: clientX, y: clientY },
      highlightedColumn: null
    });
    
    if (navigator.vibrate) {
      navigator.vibrate(50);
    }
  };

  // Global drag event handlers for WebView
  useEffect(() => {
    if (dragState.isDragging) {
      const handleGlobalMove = (e) => {
        e.preventDefault();
        let clientX, clientY;
        
        if (e.touches) {
          clientX = e.touches[0].clientX;
          clientY = e.touches[0].clientY;
        } else {
          clientX = e.clientX;
          clientY = e.clientY;
        }
        
        const targetColumn = getColumnFromPosition(clientX, clientY);
        setDragState(prev => ({
          ...prev,
          dragPosition: { x: clientX, y: clientY },
          highlightedColumn: targetColumn
        }));
      };

      const handleGlobalEnd = (e) => {
        e.preventDefault();
        let clientX, clientY;
        
        if (e.changedTouches) {
          clientX = e.changedTouches[0].clientX;
          clientY = e.changedTouches[0].clientY;
        } else {
          clientX = e.clientX;
          clientY = e.clientY;
        }
        
        const targetColumn = getColumnFromPosition(clientX, clientY);
        if (targetColumn && targetColumn !== dragState.fromColumn && dragState.draggedCat) {
          // Check if target column is full before allowing drop
          if (gameState.columns[targetColumn].length < 6) {
            moveCat(targetColumn, dragState.draggedCat, dragState.fromColumn);
            if (navigator.vibrate) {
              navigator.vibrate(100);
            }
          }
        }
        resetDragState();
      };

      // Add global listeners
      document.addEventListener('touchmove', handleGlobalMove, { passive: false });
      document.addEventListener('touchend', handleGlobalEnd, { passive: false });
      document.addEventListener('touchcancel', resetDragState, { passive: false });
      document.addEventListener('pointermove', handleGlobalMove, { passive: false });
      document.addEventListener('pointerup', handleGlobalEnd, { passive: false });
      document.addEventListener('pointercancel', resetDragState, { passive: false });
      
      return () => {
        document.removeEventListener('touchmove', handleGlobalMove);
        document.removeEventListener('touchend', handleGlobalEnd);
        document.removeEventListener('touchcancel', resetDragState);
        document.removeEventListener('pointermove', handleGlobalMove);
        document.removeEventListener('pointerup', handleGlobalEnd);
        document.removeEventListener('pointercancel', resetDragState);
      };
    }
  }, [dragState.isDragging, dragState.fromColumn, dragState.draggedCat, gameState.columns]);

  const moveCat = (targetColumn, draggedCat, fromColumn) => {
    setGameState(prev => {
      const newColumns = { ...prev.columns };
      
      // Remove cat from source column
      if (newColumns[fromColumn]) {
        newColumns[fromColumn] = newColumns[fromColumn].filter(
          cat => cat.id !== draggedCat.id
        );
      }
      
      // Add cat to target column  
      if (newColumns[targetColumn]) {
        newColumns[targetColumn] = [...newColumns[targetColumn], draggedCat];
      }
      
      // Check matches
      const { updatedColumns, scoreGained, matchFound } = checkMatches(newColumns, targetColumn, prev.consecutiveMatches);
      
      const newConsecutiveMatches = scoreGained > 0 ? prev.consecutiveMatches + 1 : 0;
      const newMaxCombo = Math.max(prev.maxCombo, newConsecutiveMatches);
      
      return {
        ...prev,
        columns: updatedColumns,
        score: prev.score + scoreGained,
        consecutiveMatches: newConsecutiveMatches,
        matchesMade: prev.matchesMade + (matchFound ? 1 : 0),
        maxCombo: newMaxCombo
      };
    });
  };

  const resetDragState = () => {
    setDragState({
      isDragging: false,
      draggedCat: null,
      fromColumn: null,
      dragPosition: { x: 0, y: 0 },
      startPosition: { x: 0, y: 0 },
      highlightedColumn: null
    });
  };

  const LoadingOverlay = () => {
    const [zzzVisible, setZzzVisible] = useState(true); // Start visible
    const [activeDots, setActiveDots] = useState(1);

    // Zzz animation effect - simple toggle every 2 seconds
    useEffect(() => {
      const zzzTimer = setInterval(() => {
        setZzzVisible(prev => {
          console.log('Zzz toggle:', !prev);
          return !prev;
        });
      }, 2000);

      return () => clearInterval(zzzTimer);
    }, []);

    // Progressive dots animation - 1, 2, 3, repeat
    useEffect(() => {
      const dotsTimer = setInterval(() => {
        setActiveDots(prev => {
          const next = prev >= 3 ? 1 : prev + 1;
          console.log(`Dots changing: ${prev} -> ${next}`);
          return next;
        });
      }, 1000); // Slower for easier debugging

      return () => clearInterval(dotsTimer);
    }, []);

    return (
      <div 
        className={`fixed inset-0 z-50 flex flex-col items-center justify-center bg-black text-white transition-opacity duration-1000 ${
          isLayoutReady ? 'opacity-0 pointer-events-none' : 'opacity-100'
        }`}
        style={{ height: '100dvh' }}
      >
        <div className="text-center relative w-full h-full">
          {/* Walking paw prints */}
          {pawPositions.map((paw, index) => (
            <div
              key={index}
              className={`absolute text-3xl transition-opacity duration-500 ${
                paw.visible ? 'opacity-100' : 'opacity-0'
              }`}
              style={{
                left: `${paw.x}%`,
                top: `${paw.y}%`,
                transform: 'translate(-50%, -50%)'
              }}
            >
              🐾
            </div>
          ))}
          
          {/* Main content centered */}
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <div className="mb-8 relative h-20">
              {/* Sleeping cat */}
              <div className="text-6xl">😽</div>
              
              {/* Zzz - SIMPLE positioning */}
              <div 
                className={`absolute top-0 left-1/2 transform -translate-x-1/2 -translate-y-12 text-4xl text-blue-300 font-bold transition-opacity duration-1000 ${
                  zzzVisible ? 'opacity-100' : 'opacity-30'
                }`}
              >
                Zzz
              </div>
            </div>
            
            <h2 className="text-2xl font-bold text-yellow-400 animate-pulse mb-4">
              Waking up cats...
            </h2>
            
            {/* Progress bar */}
            <div className="w-48 h-2 bg-gray-700 rounded-full mb-6">
              <div 
                className="h-full bg-yellow-400 rounded-full transition-all duration-100"
                style={{ width: `${Math.min(loadingProgress, 100)}%` }}
              ></div>
            </div>
            
            {/* SIMPLE dots - show state clearly */}
            <div className="flex justify-center space-x-3">
              <div className={`w-4 h-4 rounded-full ${activeDots >= 1 ? 'bg-yellow-400' : 'bg-gray-600'}`}></div>
              <div className={`w-4 h-4 rounded-full ${activeDots >= 2 ? 'bg-yellow-400' : 'bg-gray-600'}`}></div>
              <div className={`w-4 h-4 rounded-full ${activeDots >= 3 ? 'bg-yellow-400' : 'bg-gray-600'}`}></div>
            </div>
            
            {/* Debug info */}
            <div className="mt-4 text-sm text-gray-400">
              Dots: {activeDots} | Zzz: {zzzVisible ? 'ON' : 'OFF'}
            </div>
          </div>
        </div>
      </div>
    );
  };

  const DraggableCat = ({ cat, columnId }) => {
    return (
      <div
        className="tg-cat-emoji"
        onPointerDown={(e) => handleDragStart(e, cat.id, columnId)}
        onTouchStart={(e) => handleDragStart(e, cat.id, columnId)}
        onMouseDown={(e) => handleDragStart(e, cat.id, columnId)}
        style={{
          userSelect: 'none',
          WebkitUserSelect: 'none',
          MozUserSelect: 'none',
          msUserSelect: 'none',
          WebkitTouchCallout: 'none',
          WebkitTapHighlightColor: 'transparent',
          touchAction: 'none',
          opacity: dragState.draggedCat?.id === cat.id && dragState.isDragging ? 0.5 : 1
        }}
      >
        {cat.emoji}
      </div>
    );
  };

  const GameColumn = ({ columnId, cats }) => {
    const isFull = cats.length >= 6;
    const isHighlighted = dragState.highlightedColumn === columnId;
    
    return (
      <div
        data-column={columnId}
        className={`tg-game-column ${
          isHighlighted ? 'column-highlighted' : ''
        }`}
      >
        {cats.map((cat, index) => (
          <DraggableCat key={cat.id} cat={cat} columnId={columnId} />
        ))}
        
        {cats.length === 0 && (
          <div className="column-empty-text">Empty</div>
        )}
        
        {isFull && (
          <div className="column-full-text">FULL</div>
        )}
      </div>
    );
  };

  const ExplosionAnimation = ({ animation }) => {
    return (
      <div
        className="fixed pointer-events-none z-[100] animate-ping"
        style={{
          left: animation.x - 50,
          top: animation.y - 50,
          transform: 'translate(-50%, -50%)'
        }}
      >
        <div className="relative">
          <div className="absolute inset-0 flex items-center justify-center z-[110]">
            <div className="cat-emoji-xl animate-bounce">{animation.emoji}</div>
          </div>
          
          {[...Array(8)].map((_, i) => (
            <div
              key={i}
              className="absolute w-4 h-4 bg-yellow-400 rounded-full animate-ping z-[105]"
              style={{
                left: 50 + Math.cos(i * Math.PI / 4) * 40,
                top: 50 + Math.sin(i * Math.PI / 4) * 40,
                animationDelay: `${i * 50}ms`,
                animationDuration: '1s'
              }}
            />
          ))}
          
          <div 
            className="absolute left-1/2 transform -translate-x-1/2 -translate-y-8 text-3xl font-bold text-yellow-500 animate-bounce z-[120]"
            style={{ animationDuration: '0.5s' }}
          >
            +{animation.scoreGained}
          </div>
          
          <div className="absolute inset-0 border-4 border-yellow-400 rounded-full animate-ping opacity-75 z-[108]" />
          <div 
            className="absolute inset-0 border-4 border-orange-400 rounded-full animate-ping opacity-50 z-[107]"
            style={{ animationDelay: '0.2s' }}
          />
        </div>
      </div>
    );
  };

  const BottomNavBar = () => {
    const navItems = [
      { id: 'play', icon: '🎮', label: 'Play', color: 'orange' },
      { id: 'tasks', icon: '✅', label: 'Tasks', color: 'blue' },
      { id: 'leaderboard', icon: '📊', label: 'Board', color: 'purple' },
      { id: 'bonus', icon: '🎁', label: 'Bonus', color: 'green' },
      { id: 'account', icon: '👤', label: 'Account', color: 'gray' }
    ];

    const handleTabClick = (tabId) => {
      setGameState(prev => ({ ...prev, currentTab: tabId }));
      if (tabId === 'play' && !gameState.gameStarted) {
        setGameState(prev => ({ ...prev, gameStarted: true }));
      }
    };

    const getActiveClass = (color) => {
      switch(color) {
        case 'orange': return 'bg-orange-500 shadow-lg scale-105';
        case 'blue': return 'bg-blue-500 shadow-lg scale-105';
        case 'purple': return 'bg-purple-500 shadow-lg scale-105';
        case 'green': return 'bg-green-500 shadow-lg scale-105';
        default: return 'bg-gray-500 shadow-lg scale-105';
      }
    };

    return (
      <div className="fixed bottom-0 left-0 right-0 bg-gray-800 border-t border-gray-600 px-4 py-3">
        <div className="flex justify-around items-center max-w-md mx-auto">
          {navItems.map((item) => {
            const isActive = gameState.currentTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => handleTabClick(item.id)}
                className={`flex flex-col items-center justify-center px-3 py-2 rounded-lg min-w-16 transition-all duration-200 ${
                  isActive ? getActiveClass(item.color) : 'bg-gray-700 hover:bg-gray-600'
                }`}
              >
                <span className="text-xl mb-1">{item.icon}</span>
                <span className={`text-xs font-medium ${isActive ? 'text-white' : 'text-gray-300'}`}>
                  {item.label}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    );
  };

  const TasksScreen = () => (
    <div className="min-h-screen bg-white" style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 5rem)' }}>
      <div className="bg-blue-500 text-white p-4 flex items-center gap-3">
        <div className="w-8 h-8 bg-white rounded-full flex items-center justify-center">✅</div>
        <h1 className="text-lg font-semibold">Tasks</h1>
      </div>
      <div className="p-4 space-y-6">
        <div>
          <h2 className="text-gray-800 text-xl font-bold mb-4">Main Tasks</h2>
          <div className="space-y-4">
            <div className="bg-gray-50 rounded-2xl p-4 flex items-center justify-between border border-gray-200 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="text-4xl">🐱</div>
                <div>
                  <div className="text-gray-800 font-semibold">Join Our Telegram Channel</div>
                  <div className="flex items-center gap-2 text-yellow-600">
                    <span className="text-sm">🪙 1,000</span>
                    <span className="text-sm">⏰ +5s</span>
                  </div>
                </div>
              </div>
              <button className="bg-gray-300 text-gray-500 px-6 py-2 rounded-full font-semibold">
                Claim
              </button>
            </div>
          </div>
        </div>
      </div>
      <BottomNavBar />
    </div>
  );

  const LeaderboardScreen = () => (
    <div className="min-h-screen bg-gray-100" style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 5rem)' }}>
      <div className="bg-purple-500 text-white p-4 flex items-center gap-3">
        <div className="w-8 h-8 bg-white rounded-full flex items-center justify-center">📊</div>
        <h1 className="text-lg font-semibold">Leaderboard</h1>
      </div>
      <div className="p-4 space-y-3">
        <div className="bg-white rounded-lg p-4 shadow-sm">
          <h3 className="font-semibold text-gray-800 mb-3">🏆 Top Players</h3>
          <div className="space-y-3">
            {leaderboard.length > 0 ? (
              leaderboard.map((player, index) => (
                <div key={index} className="flex justify-between items-center p-2 rounded-lg bg-gray-50">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">
                      {index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `#${index + 1}`}
                    </span>
                    <div>
                      <div className="font-semibold text-gray-800">
                        {player.username ? `@${player.username}` : `${player.first_name} ${player.last_name || ''}`.trim()}
                      </div>
                      <div className="text-sm text-gray-500">{player.games_played} games played</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-bold text-yellow-600">{player.best_score.toLocaleString()}</div>
                    <div className="text-xs text-gray-500">best score</div>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center text-gray-500 py-4">
                <div className="text-4xl mb-2">🐾</div>
                <div>No scores yet! Be the first to play!</div>
              </div>
            )}
          </div>
        </div>
      </div>
      <BottomNavBar />
    </div>
  );

  const BonusScreen = () => (
    <div className="min-h-screen bg-gray-100" style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 5rem)' }}>
      <div className="bg-green-500 text-white p-4 flex items-center gap-3">
        <div className="w-8 h-8 bg-white rounded-full flex items-center justify-center">🎁</div>
        <h1 className="text-lg font-semibold">Bonus Time</h1>
      </div>
      <div className="p-4 space-y-3">
        <div className="bg-white rounded-lg p-4 shadow-sm text-center">
          <h3 className="font-semibold text-gray-800 mb-2">Your Bonus Time</h3>
          <div className="text-3xl font-bold text-green-600 mb-2">+25s</div>
        </div>
      </div>
      <BottomNavBar />
    </div>
  );

  const AccountScreen = () => (
    <div className="min-h-screen bg-gray-100" style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 5rem)' }}>
      <div className="bg-gray-500 text-white p-4 flex items-center gap-3">
        <div className="w-8 h-8 bg-white rounded-full flex items-center justify-center">👤</div>
        <h1 className="text-lg font-semibold">Account</h1>
      </div>
      <div className="p-4 space-y-3">
        <div className="bg-white rounded-lg p-4 shadow-sm text-center">
          <div className="text-4xl mb-2">🐱</div>
          <h3 className="font-semibold text-gray-800">
            {userState.telegramUser ? 
              (userState.telegramUser.username ? 
                `@${userState.telegramUser.username}` : 
                `${userState.telegramUser.first_name} ${userState.telegramUser.last_name || ''}`.trim()
              ) : 
              'Loading...'
            }
          </h3>
          
          {userState.stats && (
            <div className="mt-4 space-y-2">
              <div className="flex justify-between">
                <span className="text-gray-600">Games Played:</span>
                <span className="font-semibold">{userState.stats.total_games || 0}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Best Score:</span>
                <span className="font-semibold text-yellow-600">{userState.stats.best_score || 0}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Average Score:</span>
                <span className="font-semibold">{userState.stats.average_score || 0}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Total Matches:</span>
                <span className="font-semibold">{userState.stats.total_matches || 0}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Best Combo:</span>
                <span className="font-semibold">{userState.stats.best_combo || 0}</span>
              </div>
            </div>
          )}
        </div>
      </div>
      <BottomNavBar />
    </div>
  );

  if (gameState.currentTab === 'tasks') return <TasksScreen />;
  if (gameState.currentTab === 'leaderboard') return <LeaderboardScreen />;
  if (gameState.currentTab === 'bonus') return <BonusScreen />;
  if (gameState.currentTab === 'account') return <AccountScreen />;

  if (!gameState.gameStarted && gameState.currentTab === 'play') {
    return (
      <div className="tg-app-container">
        {/* Welcome screen - Telegram style layout */}
        <div className="tg-welcome-screen" data-welcome-container>
          <div className="tg-welcome-content">
            <div className="tg-welcome-paws">🐾</div>
            <h1 className="tg-welcome-title">MEOWCHI</h1>
            <h1 className="tg-welcome-title">CHAOS</h1>
            
            <div className="tg-welcome-subtitle">
              <p>Drop cats. Cause mayhem.</p>
              <p>Match 3 before they scream.</p>
            </div>
            
            <div className="tg-emoji-section">
              <div className="tg-emoji-row">
                {['😺', '😹', '🐈', '😻', '🐈‍⬛'].map((emoji, index) => (
                  <span 
                    key={index}
                    className={`tg-welcome-emoji ${
                      spinningEmojis[index] ? 'spinning' : ''
                    }`}
                    onClick={() => handleEmojiClick(index)}
                  >
                    {emoji}
                  </span>
                ))}
              </div>
              <p className="tg-emoji-text">5 ridiculous cats to wrangle.</p>
            </div>
            
            <div className="tg-game-info">
              <div>⏱ 60 seconds of panic</div>
              <div>🐾 +1000 purr-points</div>
              <div>🔥 Combos = Catnado</div>
            </div>

            {userState.bestScore && (
              <div className="tg-best-score">
                <div className="tg-best-score-label">Your Best Score</div>
                <div className="tg-best-score-value">{userState.bestScore.score.toLocaleString()}</div>
              </div>
            )}
            
            <button
              onClick={startGame}
              className="tg-start-button"
              data-welcome-button
            >
              ▶️ LET'S GOOO!
            </button>
          </div>
        </div>
        
        {/* Loading overlay */}
        <LoadingOverlay />
        <BottomNavBar />
      </div>
    );
  }

  if (!gameState.isActive && gameState.gameStarted) {
    let flavorText = "🐾 That's tragic. Even my paw is better at this.";
    if (gameState.score > 5000) {
      flavorText = "🔥 Absolute CatGod. Touch grass, maybe?";
    } else if (gameState.score > 2000) {
      flavorText = "😼 Not bad. You may live another round.";
    }

    const isNewBest = userState.bestScore ? gameState.score > userState.bestScore.score : true;
    
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4" 
           style={{backgroundColor: '#FFD700', paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 5rem)'}}>
        <div className="text-center bg-yellow-400 rounded-2xl shadow-xl p-4 max-w-sm" style={{backgroundColor: '#FFD700'}}>
          <h2 className="text-5xl font-black text-black mb-6">🎉 GAME OVER, HUMAN!</h2>
          
          {isNewBest && (
            <div className="bg-black bg-opacity-10 rounded-lg p-4 mb-4">
              <div className="text-xl">🏆</div>
              <div className="text-lg font-bold text-black">NEW BEST SCORE!</div>
            </div>
          )}
          
          <div className="text-8xl font-black text-black mb-4">{gameState.score.toLocaleString()}</div>
          <p className="text-black text-xl font-bold mb-4">Final Score</p>
          
          <div className="bg-black bg-opacity-10 rounded-lg p-4 mb-4 text-sm">
            <div className="flex justify-between">
              <span>Matches:</span>
              <span className="font-bold">{gameState.matchesMade}</span>
            </div>
            <div className="flex justify-between">
              <span>Best Combo:</span>
              <span className="font-bold">{gameState.maxCombo}</span>
            </div>
            <div className="flex justify-between">
              <span>Time Played:</span>
              <span className="font-bold">{INITIAL_TIME - gameState.timeLeft}s</span>
            </div>
          </div>
          
          <p className="text-lg text-black font-bold mb-4">
            😿 "Meowchi is disappointed but still cute."
          </p>
          <p className="text-base text-black font-bold mb-8">
            {flavorText}
          </p>
          
          <div className="space-y-4">
            <button
              onClick={startGame}
              className="w-full bg-black text-white font-bold py-4 px-6 rounded-full shadow-lg hover:shadow-xl transition-all duration-200 text-xl"
            >
              😺 PLAY AGAIN
            </button>
            
            <button
              onClick={() => setGameState(prev => ({ ...prev, currentTab: 'leaderboard' }))}
              className="w-full bg-yellow-400 border-2 border-black text-black font-bold py-4 px-6 rounded-full hover:bg-yellow-300 transition-all duration-200 text-xl"
              style={{backgroundColor: '#FFD700'}}
            >
              📊 LEADERBOARD
            </button>
          </div>
        </div>
        <BottomNavBar />
      </div>
    );
  }

  return (
    <div className="tg-app-container">
      {animations.map((animation) => (
        <ExplosionAnimation key={animation.id} animation={animation} />
      ))}

      {dragState.isDragging && dragState.draggedCat && (
        <div
          className="tg-dragged-cat"
          style={{
            left: dragState.dragPosition.x,
            top: dragState.dragPosition.y,
          }}
        >
          {dragState.draggedCat.emoji}
        </div>
      )}

      <div className="tg-game-header">
        <h1 className="tg-tagline">{taglines[currentTagline]}</h1>
      </div>

      <div className="tg-score-bar">
        <div className="tg-timer">
          <span>⏱</span>
          <span className={gameState.timeLeft <= 10 ? 'timer-urgent' : ''}>{gameState.timeLeft}s</span>
        </div>
        <div className="tg-score">
          <span>🐾</span>
          <span>{gameState.score.toLocaleString()}</span>
        </div>
      </div>

      <div className="tg-next-section">
        <div className="tg-next-content">
          <span>NEXT:</span>
          <div className="tg-next-cat">
            <span>{gameState.nextCat}</span>
          </div>
        </div>
      </div>

      <div className="tg-game-board">
        <div className="tg-columns-container" ref={boardRef}>
          <GameColumn columnId="left" cats={gameState.columns.left} />
          <GameColumn columnId="center" cats={gameState.columns.center} />
          <GameColumn columnId="right" cats={gameState.columns.right} />
        </div>
      </div>

      <div className="tg-controls">
        <div className="tg-drop-buttons">
          <button
            onClick={() => dropNewCat('left')}
            disabled={!gameState.isActive || dragState.isDragging || gameState.columns.left.length >= 6}
            className={`tg-drop-button ${
              gameState.isActive && !dragState.isDragging && gameState.columns.left.length < 6
                ? 'enabled' : 'disabled'
            }`}
          >
            <span>🔽</span>
            <span>{gameState.columns.left.length >= 6 ? 'FULL' : 'Drop'}</span>
          </button>
          
          <button
            onClick={() => dropNewCat('center')}
            disabled={!gameState.isActive || dragState.isDragging || gameState.columns.center.length >= 6}
            className={`tg-drop-button ${
              gameState.isActive && !dragState.isDragging && gameState.columns.center.length < 6
                ? 'enabled' : 'disabled'
            }`}
          >
            <span>🔽</span>
            <span>{gameState.columns.center.length >= 6 ? 'FULL' : 'Drop'}</span>
          </button>
          
          <button
            onClick={() => dropNewCat('right')}
            disabled={!gameState.isActive || dragState.isDragging || gameState.columns.right.length >= 6}
            className={`tg-drop-button ${
              gameState.isActive && !dragState.isDragging && gameState.columns.right.length < 6
                ? 'enabled' : 'disabled'
            }`}
          >
            <span>🔽</span>
            <span>{gameState.columns.right.length >= 6 ? 'FULL' : 'Drop'}</span>
          </button>
        </div>
        
        <p className="tg-tip">
          💡 Tip: Drag top cats between columns or use drop buttons!
        </p>
      </div>

      <BottomNavBar />
    </div>
  );
}

export default App;
