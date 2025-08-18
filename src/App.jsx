import React, { useState, useEffect, useRef } from 'react';

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
  const [welcomeStyles, setWelcomeStyles] = useState({
    titleSize: 'text-5xl',
    textSize: 'text-xl', 
    emojiSize: 'text-5xl',
    buttonSize: 'text-xl',
    containerPadding: 'p-4',
    spacing: 'mb-4'
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
      window.Telegram.WebApp.ready();
      window.Telegram.WebApp.expand();
      const tg = window.Telegram.WebApp;
      
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

  // Auto-spin emojis on welcome screen load
  useEffect(() => {
    if (!gameState.gameStarted && gameState.currentTab === 'play') {
      // Trigger auto-spin for all emojis on welcome screen load
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
    }
  }, [gameState.gameStarted, gameState.currentTab]);

  // Bulletproof layout calculation and loading management
  useEffect(() => {
    if (!gameState.gameStarted && gameState.currentTab === 'play') {
      setIsLayoutReady(false);
      setLoadingProgress(0);
      
      // Walking paw animation setup - 2 paws, slower, wider area
      const generatePawPath = () => {
        const path = [];
        // Create walking path: wider area (10% to 90% of screen)
        for (let i = 0; i <= 12; i++) {
          const progress = i / 12;
          const x = 10 + progress * 80; // 10% to 90% of screen width
          const y = 35 + Math.sin(progress * 2 * Math.PI) * 8; // Gentle wave
          path.push({ x, y, visible: false });
        }
        return path;
      };

      setPawPositions(generatePawPath());

      // Start walking animation - slower, 2 paws max
      let pawStep = 0;
      const walkingInterval = setInterval(() => {
        setPawPositions(prev => prev.map((paw, index) => ({
          ...paw,
          visible: index === pawStep || index === pawStep - 1 // Only 2 paws visible
        })));
        
        pawStep = (pawStep + 1) % 13;
      }, 500); // Slower: 500ms instead of 200ms

      // Progress tracking
      let progress = 0;
      const progressInterval = setInterval(() => {
        progress += 1.5;
        setLoadingProgress(progress);
      }, 60);

      // Mathematical perfect-fit calculation
      setTimeout(() => {
        const calculatePerfectFit = () => {
          // Measure exact available screen real estate
          const viewportHeight = window.innerHeight;
          const telegramHeader = 60; // More accurate estimate
          const bottomNav = 80; // Bottom navigation height
          const availableHeight = viewportHeight - telegramHeader - bottomNav;
          
          // Base content measurements (in relative units)
          const baseContentHeight = {
            pawIcon: 60,        // 🐾 icon
            title: 120,         // MEOWCHI + CHAOS combined
            subtitle: 80,       // Drop cats text (2 lines)
            emojis: 60,         // Cat emojis row
            emojiText: 30,      // "5 ridiculous cats"
            gameInfo: 90,       // 3 lines of game info
            bestScore: 70,      // Best score box (if present)
            button: 60,         // LET'S GOOO button
            spacing: 80         // Minimal spacing
          };
          
          // Calculate total content height needed
          let totalBaseHeight = Object.values(baseContentHeight).reduce((sum, height) => sum + height, 0);
          
          // If no best score, subtract that height
          if (!userState.bestScore) {
            totalBaseHeight -= baseContentHeight.bestScore;
          }
          
          // Calculate scale factor - AGGRESSIVE UTILIZATION
          const targetUtilization = 0.9; // Use 90% of available space
          const targetHeight = availableHeight * targetUtilization;
          const scaleFactor = targetHeight / totalBaseHeight;
          
          console.log(`Viewport: ${viewportHeight}px, Available: ${availableHeight}px, Target: ${targetHeight}px, Scale: ${scaleFactor.toFixed(2)}`);
          
          // Apply AGGRESSIVE scaling - grow UP when we have space
          let styles = {
            titleSize: 'text-5xl',
            textSize: 'text-xl', 
            emojiSize: 'text-5xl',
            buttonSize: 'text-xl',
            containerPadding: 'p-4',
            spacing: 'mb-4'
          };

          if (scaleFactor >= 1.4) {
            // EXTRA LARGE - use the space!
            styles = {
              titleSize: 'text-7xl',
              textSize: 'text-3xl',
              emojiSize: 'text-7xl',
              buttonSize: 'text-2xl',
              containerPadding: 'p-6',
              spacing: 'mb-6'
            };
          } else if (scaleFactor >= 1.2) {
            // LARGE - bigger fonts for bigger screens
            styles = {
              titleSize: 'text-6xl',
              textSize: 'text-2xl',
              emojiSize: 'text-6xl',
              buttonSize: 'text-xl',
              containerPadding: 'p-5',
              spacing: 'mb-5'
            };
          } else if (scaleFactor >= 1.0) {
            // STANDARD - original size
            styles = {
              titleSize: 'text-5xl',
              textSize: 'text-xl',
              emojiSize: 'text-5xl',
              buttonSize: 'text-xl',
              containerPadding: 'p-4',
              spacing: 'mb-4'
            };
          } else if (scaleFactor >= 0.85) {
            // MEDIUM reduction
            styles = {
              titleSize: 'text-4xl',
              textSize: 'text-lg',
              emojiSize: 'text-4xl',
              buttonSize: 'text-lg',
              containerPadding: 'p-3',
              spacing: 'mb-3'
            };
          } else if (scaleFactor >= 0.7) {
            // SMALL reduction
            styles = {
              titleSize: 'text-3xl',
              textSize: 'text-base',
              emojiSize: 'text-3xl',
              buttonSize: 'text-base',
              containerPadding: 'p-2',
              spacing: 'mb-2'
            };
          } else if (scaleFactor >= 0.6) {
            // COMPACT
            styles = {
              titleSize: 'text-2xl',
              textSize: 'text-sm',
              emojiSize: 'text-2xl',
              buttonSize: 'text-sm',
              containerPadding: 'p-2',
              spacing: 'mb-1'
            };
          } else {
            // ULTRA-COMPACT emergency mode
            styles = {
              titleSize: 'text-xl',
              textSize: 'text-xs',
              emojiSize: 'text-xl',
              buttonSize: 'text-xs',
              containerPadding: 'p-1',
              spacing: 'mb-1'
            };
          }

          setWelcomeStyles(styles);
        };

        calculatePerfectFit();
        
        // Multiple verification passes with real DOM measurement
        const verificationPasses = [1000, 2000, 3000, 3800];
        verificationPasses.forEach(delay => {
          setTimeout(() => {
            calculatePerfectFit();
            
            // Final DOM-based verification at 3.8 seconds
            if (delay === 3800) {
              setTimeout(() => {
                requestAnimationFrame(() => {
                  const container = document.querySelector('[data-welcome-container]');
                  const button = document.querySelector('[data-welcome-button]');
                  
                  if (container && button) {
                    const containerRect = container.getBoundingClientRect();
                    const buttonRect = button.getBoundingClientRect();
                    
                    console.log(`Button bottom: ${buttonRect.bottom}, Window height: ${window.innerHeight}`);
                    
                    // Final check: is button truly visible with 20px margin?
                    if (buttonRect.bottom > window.innerHeight - 20) {
                      console.log('Emergency size reduction triggered');
                      // Emergency ultra-compact mode
                      setWelcomeStyles({
                        titleSize: 'text-lg',
                        textSize: 'text-xs',
                        emojiSize: 'text-lg',
                        buttonSize: 'text-xs',
                        containerPadding: 'p-1',
                        spacing: 'mb-1'
                      });
                      
                      setTimeout(() => setIsLayoutReady(true), 200);
                    } else {
                      console.log('Layout verification passed');
                      setIsLayoutReady(true);
                    }
                  } else {
                    setIsLayoutReady(true);
                  }
                });
              }, 100);
            }
          }, delay);
        });
      }, 200);

      // Cleanup intervals
      const cleanup = () => {
        clearInterval(walkingInterval);
        clearInterval(progressInterval);
      };

      // Minimum 4 seconds, then cleanup
      setTimeout(cleanup, 4200);
      
      return cleanup;
    }
  }, [gameState.gameStarted, gameState.currentTab, userState.bestScore]);

  // Handle emoji spinning
  const handleEmojiClick = (emojiIndex) => {
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
    const [zzzVisible, setZzzVisible] = useState(false);
    const [activeDots, setActiveDots] = useState(1);

    // Zzz animation effect - slow fade in/out
    useEffect(() => {
      const zzzInterval = setInterval(() => {
        setZzzVisible(prev => !prev);
      }, 2000); // Slower: 2 seconds for each fade cycle

      return () => clearInterval(zzzInterval);
    }, []);

    // Progressive dots animation - 1, 2, 3, repeat
    useEffect(() => {
      const dotsInterval = setInterval(() => {
        setActiveDots(prev => prev === 3 ? 1 : prev + 1);
      }, 800); // Change every 800ms

      return () => clearInterval(dotsInterval);
    }, []);

    return (
      <div 
        className={`fixed inset-0 z-50 flex flex-col items-center justify-center bg-black text-white transition-opacity duration-1000 ${
          isLayoutReady ? 'opacity-0 pointer-events-none' : 'opacity-100'
        }`}
        style={{ height: '100dvh' }}
      >
        <div className="text-center relative w-full h-full">
          {/* Walking paw prints - 2 paws, slower movement */}
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
            <div className="mb-8 relative">
              {/* Sleeping cat */}
              <div className="text-6xl mb-4">😽</div>
              
              {/* Floating Zzz animation - positioned above cat */}
              <div 
                className={`absolute -top-8 left-1/2 transform -translate-x-1/2 text-3xl text-blue-300 transition-all duration-1000 ${
                  zzzVisible ? 'opacity-100 -translate-y-2' : 'opacity-0 translate-y-0'
                }`}
                style={{ 
                  textShadow: '0 0 10px rgba(147, 197, 253, 0.5)' // Soft glow effect
                }}
              >
                Zzz
              </div>
            </div>
            
            <h2 className="text-2xl font-bold text-yellow-400 animate-pulse mb-4">
              Waking up cats...
            </h2>
            
            {/* Progress bar */}
            <div className="w-48 h-2 bg-gray-700 rounded-full mb-4">
              <div 
                className="h-full bg-yellow-400 rounded-full transition-all duration-100"
                style={{ width: `${Math.min(loadingProgress, 100)}%` }}
              ></div>
            </div>
            
            {/* Interactive loading dots - progressive animation */}
            <div className="flex justify-center space-x-1">
              {[1, 2, 3].map((dotNumber) => (
                <div 
                  key={dotNumber}
                  className={`w-2 h-2 rounded-full transition-all duration-300 ${
                    dotNumber <= activeDots 
                      ? 'bg-yellow-400 scale-110' 
                      : 'bg-gray-600 scale-100'
                  }`}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  };

  const DraggableCat = ({ cat, columnId }) => {
    return (
      <div
        className="cat-emoji select-none transition-all duration-200 p-1 cursor-grab active:cursor-grabbing hover:scale-105"
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
        className={`flex-1 max-w-20 border-2 rounded-lg p-responsive transition-all duration-200 flex flex-col-reverse items-center gap-1 bg-white overflow-hidden h-full ${
          isHighlighted ? 'border-blue-500 bg-blue-50' : 'border-gray-300'
        }`}
      >
        {cats.map((cat, index) => (
          <DraggableCat key={cat.id} cat={cat} columnId={columnId} />
        ))}
        
        {cats.length === 0 && (
          <div className="text-gray-300 text-responsive-xs text-center mt-2">Empty</div>
        )}
        
        {isFull && (
          <div className="text-red-400 text-responsive-xs text-center font-bold">FULL</div>
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
            className="absolute left-1/2 transform -translate-x-1/2 -translate-y-8 text-responsive-2xl font-bold text-yellow-500 animate-bounce z-[120]"
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
      <div className="fixed bottom-0 left-0 right-0 bg-gray-800 border-t border-gray-600 px-responsive py-responsive">
        <div className="flex justify-around items-center max-w-md mx-auto">
          {navItems.map((item) => {
            const isActive = gameState.currentTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => handleTabClick(item.id)}
                className={`flex flex-col items-center justify-center px-responsive py-responsive rounded-lg min-w-16 transition-all duration-200 ${
                  isActive ? getActiveClass(item.color) : 'bg-gray-700 hover:bg-gray-600'
                }`}
              >
                <span className="text-responsive-lg mb-1">{item.icon}</span>
                <span className={`text-responsive-xs font-medium ${isActive ? 'text-white' : 'text-gray-300'}`}>
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
      <div className="bg-blue-500 text-white p-responsive flex items-center gap-responsive">
        <div className="w-8 h-8 bg-white rounded-full flex items-center justify-center">✅</div>
        <h1 className="text-responsive-lg font-semibold">Tasks</h1>
      </div>
      <div className="p-responsive space-y-6">
        <div>
          <h2 className="text-gray-800 text-responsive-xl font-bold mb-4">Main Tasks</h2>
          <div className="space-y-4">
            <div className="bg-gray-50 rounded-2xl p-responsive flex items-center justify-between border border-gray-200 shadow-sm">
              <div className="flex items-center gap-responsive">
                <div className="cat-emoji-large">🐱</div>
                <div>
                  <div className="text-gray-800 font-semibold text-responsive-base">Join Our Telegram Channel</div>
                  <div className="flex items-center gap-2 text-yellow-600">
                    <span className="text-responsive-sm">🪙 1,000</span>
                    <span className="text-responsive-sm">⏰ +5s</span>
                  </div>
                </div>
              </div>
              <button className="bg-gray-300 text-gray-500 btn-responsive rounded-full font-semibold">
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
      <div className="bg-purple-500 text-white p-responsive flex items-center gap-responsive">
        <div className="w-8 h-8 bg-white rounded-full flex items-center justify-center">📊</div>
        <h1 className="text-responsive-lg font-semibold">Leaderboard</h1>
      </div>
      <div className="p-responsive space-y-3">
        <div className="bg-white rounded-lg p-responsive shadow-sm">
          <h3 className="font-semibold text-gray-800 mb-3 text-responsive-base">🏆 Top Players</h3>
          <div className="space-y-3">
            {leaderboard.length > 0 ? (
              leaderboard.map((player, index) => (
                <div key={index} className="flex justify-between items-center p-2 rounded-lg bg-gray-50">
                  <div className="flex items-center gap-responsive">
                    <span className="text-responsive-xl">
                      {index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `#${index + 1}`}
                    </span>
                    <div>
                      <div className="font-semibold text-gray-800 text-responsive-sm">
                        {player.username ? `@${player.username}` : `${player.first_name} ${player.last_name || ''}`.trim()}
                      </div>
                      <div className="text-responsive-xs text-gray-500">{player.games_played} games played</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-bold text-yellow-600 text-responsive-sm">{player.best_score.toLocaleString()}</div>
                    <div className="text-responsive-xs text-gray-500">best score</div>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center text-gray-500 py-4">
                <div className="cat-emoji-large mb-2">🐾</div>
                <div className="text-responsive-base">No scores yet! Be the first to play!</div>
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
      <div className="bg-green-500 text-white p-responsive flex items-center gap-responsive">
        <div className="w-8 h-8 bg-white rounded-full flex items-center justify-center">🎁</div>
        <h1 className="text-responsive-lg font-semibold">Bonus Time</h1>
      </div>
      <div className="p-responsive space-y-3">
        <div className="bg-white rounded-lg p-responsive shadow-sm text-center">
          <h3 className="font-semibold text-gray-800 mb-2 text-responsive-base">Your Bonus Time</h3>
          <div className="text-responsive-3xl font-bold text-green-600 mb-2">+25s</div>
        </div>
      </div>
      <BottomNavBar />
    </div>
  );

  const AccountScreen = () => (
    <div className="min-h-screen bg-gray-100" style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 5rem)' }}>
      <div className="bg-gray-500 text-white p-responsive flex items-center gap-responsive">
        <div className="w-8 h-8 bg-white rounded-full flex items-center justify-center">👤</div>
        <h1 className="text-responsive-lg font-semibold">Account</h1>
      </div>
      <div className="p-responsive space-y-3">
        <div className="bg-white rounded-lg p-responsive shadow-sm text-center">
          <div className="cat-emoji-large mb-2">🐱</div>
          <h3 className="font-semibold text-gray-800 text-responsive-base">
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
                <span className="text-gray-600 text-responsive-sm">Games Played:</span>
                <span className="font-semibold text-responsive-sm">{userState.stats.total_games || 0}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600 text-responsive-sm">Best Score:</span>
                <span className="font-semibold text-yellow-600 text-responsive-sm">{userState.stats.best_score || 0}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600 text-responsive-sm">Average Score:</span>
                <span className="font-semibold text-responsive-sm">{userState.stats.average_score || 0}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600 text-responsive-sm">Total Matches:</span>
                <span className="font-semibold text-responsive-sm">{userState.stats.total_matches || 0}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600 text-responsive-sm">Best Combo:</span>
                <span className="font-semibold text-responsive-sm">{userState.stats.best_combo || 0}</span>
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
      <div className="relative">
        {/* Welcome screen - always rendered with calculated styles */}
        <div 
          className="h-screen flex flex-col p-2"
          style={{backgroundColor: '#FFD700', height: '100dvh'}}
          data-welcome-container
        >
          <div className="flex-1 flex flex-col justify-center items-center">
            <div className={`text-center bg-yellow-400 rounded-2xl shadow-xl ${welcomeStyles.containerPadding} max-w-sm w-full`} style={{backgroundColor: '#FFD700'}}>
              <div className="text-6xl mb-4">🐾</div>
              <h1 className={`${welcomeStyles.titleSize} font-black text-black mb-2`}>MEOWCHI</h1>
              <h1 className={`${welcomeStyles.titleSize} font-black text-black ${welcomeStyles.spacing}`}>CHAOS</h1>
              <div className={welcomeStyles.spacing}>
                <p className={`text-black ${welcomeStyles.textSize} font-bold mb-2`}>
                  Drop cats. Cause mayhem.
                </p>
                <p className={`text-black ${welcomeStyles.textSize} font-bold ${welcomeStyles.spacing}`}>
                  Match 3 before they scream.
                </p>
              </div>
              
              <div className={welcomeStyles.spacing}>
                <div className="flex justify-center gap-3 mb-3">
                  {['😺', '😹', '🐈', '😻', '🐈‍⬛'].map((emoji, index) => (
                    <span 
                      key={index}
                      className={`${welcomeStyles.emojiSize} cursor-pointer transition-transform hover:scale-110 ${
                        spinningEmojis[index] ? 'animate-spin' : ''
                      }`}
                      onClick={() => handleEmojiClick(index)}
                      style={{
                        animation: spinningEmojis[index] ? 'spin 1s ease-in-out' : 'none',
                        display: 'inline-block'
                      }}
                    >
                      {emoji}
                    </span>
                  ))}
                </div>
                <p className={`${welcomeStyles.textSize} text-black font-bold`}>5 ridiculous cats to wrangle.</p>
              </div>
              
              <div className={`${welcomeStyles.spacing} ${welcomeStyles.textSize} text-black font-bold leading-relaxed space-y-1`}>
                <div>⏱ 60 seconds of panic</div>
                <div>🐾 +1000 purr-points</div>
                <div>🔥 Combos = Catnado</div>
              </div>

              {userState.bestScore && (
                <div className={`${welcomeStyles.spacing} p-3 bg-black bg-opacity-10 rounded-lg`}>
                  <div className="text-sm text-black font-bold">Your Best Score</div>
                  <div className={`${welcomeStyles.textSize} font-black text-black`}>{userState.bestScore.score.toLocaleString()}</div>
                </div>
              )}
              
              <button
                onClick={startGame}
                className={`bg-black text-white font-bold py-3 px-8 rounded-full shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-105 ${welcomeStyles.buttonSize} w-full`}
                data-welcome-button
              >
                ▶️ LET'S GOOO!
              </button>
            </div>
          </div>
          <BottomNavBar />
        </div>
        
        {/* Loading overlay - fades out when ready */}
        <LoadingOverlay />
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
      <div className="min-h-screen flex flex-col items-center justify-center p-responsive" 
           style={{backgroundColor: '#FFD700', paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 5rem)'}}>
        <div className="text-center bg-yellow-400 rounded-2xl shadow-xl p-responsive max-w-sm" style={{backgroundColor: '#FFD700'}}>
          <h2 className="text-responsive-5xl font-black text-black mb-6">🎉 GAME OVER, HUMAN!</h2>
          
          {isNewBest && (
            <div className="bg-black bg-opacity-10 rounded-lg p-responsive mb-4">
              <div className="text-responsive-xl">🏆</div>
              <div className="text-responsive-lg font-bold text-black">NEW BEST SCORE!</div>
            </div>
          )}
          
          <div className="text-responsive-8xl font-black text-black mb-4">{gameState.score.toLocaleString()}</div>
          <p className="text-black text-responsive-xl font-bold mb-4">Final Score</p>
          
          <div className="bg-black bg-opacity-10 rounded-lg p-responsive mb-4 text-responsive-sm">
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
          
          <p className="text-responsive-lg text-black font-bold mb-4">
            😿 "Meowchi is disappointed but still cute."
          </p>
          <p className="text-responsive-base text-black font-bold mb-8">
            {flavorText}
          </p>
          
          <div className="space-y-4">
            <button
              onClick={startGame}
              className="w-full bg-black text-white font-bold btn-responsive-large rounded-full shadow-lg hover:shadow-xl transition-all duration-200"
            >
              😺 PLAY AGAIN
            </button>
            
            <button
              onClick={() => setGameState(prev => ({ ...prev, currentTab: 'leaderboard' }))}
              className="w-full bg-yellow-400 border-2 border-black text-black font-bold btn-responsive-large rounded-full hover:bg-yellow-300 transition-all duration-200"
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
    <div className="h-screen bg-gray-100 flex flex-col relative overflow-hidden" 
         style={{ height: '100dvh' }}>
      {animations.map((animation) => (
        <ExplosionAnimation key={animation.id} animation={animation} />
      ))}

      {dragState.isDragging && dragState.draggedCat && (
        <div
          className="fixed pointer-events-none z-40 cat-emoji-xl transform -translate-x-1/2 -translate-y-1/2 rotate-12 scale-110 drop-shadow-lg"
          style={{
            left: dragState.dragPosition.x,
            top: dragState.dragPosition.y,
          }}
        >
          {dragState.draggedCat.emoji}
        </div>
      )}

      <div className="bg-blue-500 text-white p-responsive flex items-center justify-center">
        <h1 className="text-responsive-lg font-bold animate-pulse">{taglines[currentTagline]}</h1>
      </div>

      <div className="bg-white p-responsive flex justify-between items-center border-b shadow-sm">
        <div className="flex items-center gap-2">
          <span className="text-responsive-xl">⏱</span>
          <span className={`text-responsive-xl font-black ${gameState.timeLeft <= 10 ? 'text-red-500 animate-pulse' : 'text-gray-800'}`}>
            {gameState.timeLeft}s
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-responsive-xl">🐾</span>
          <span className="text-responsive-xl font-black text-purple-600">{gameState.score.toLocaleString()}</span>
        </div>
      </div>

      <div className="p-responsive bg-gradient-to-r from-purple-500 to-blue-500">
        <div className="flex items-center justify-center gap-responsive text-white">
          <span className="font-semibold text-responsive-base">NEXT:</span>
          <div className="w-12 h-12 bg-white rounded-lg flex items-center justify-center">
            <span className="cat-emoji-xl">{gameState.nextCat}</span>
          </div>
        </div>
      </div>

      <div className="flex-1 p-responsive min-h-0 game-board-container">
        <div 
          ref={boardRef} 
          className="flex justify-center gap-responsive h-full"
          style={{
            touchAction: 'none',
            overscrollBehavior: 'contain'
          }}
        >
          <GameColumn columnId="left" cats={gameState.columns.left} />
          <GameColumn columnId="center" cats={gameState.columns.center} />
          <GameColumn columnId="right" cats={gameState.columns.right} />
        </div>
      </div>

      <div className="p-responsive bg-white border-t" 
           style={{ marginBottom: 'calc(env(safe-area-inset-bottom, 0px) + 5rem)' }}>
        <div className="flex gap-2 mb-2">
          <button
            onClick={() => dropNewCat('left')}
            disabled={!gameState.isActive || dragState.isDragging || gameState.columns.left.length >= 6}
            className={`flex-1 btn-responsive rounded-lg font-bold transition-all flex items-center justify-center gap-1 ${
              gameState.isActive && !dragState.isDragging && gameState.columns.left.length < 6
                ? 'bg-green-500 hover:bg-green-600 text-white shadow-md' 
                : 'bg-gray-300 text-gray-500 cursor-not-allowed'
            }`}
          >
            <span className="text-responsive-xl">🔽</span>
            <span className="text-responsive-base">{gameState.columns.left.length >= 6 ? 'FULL' : 'Drop'}</span>
          </button>
          
          <button
            onClick={() => dropNewCat('center')}
            disabled={!gameState.isActive || dragState.isDragging || gameState.columns.center.length >= 6}
            className={`flex-1 btn-responsive rounded-lg font-bold transition-all flex items-center justify-center gap-1 ${
              gameState.isActive && !dragState.isDragging && gameState.columns.center.length < 6
                ? 'bg-green-500 hover:bg-green-600 text-white shadow-md' 
                : 'bg-gray-300 text-gray-500 cursor-not-allowed'
            }`}
          >
            <span className="text-responsive-xl">🔽</span>
            <span className="text-responsive-base">{gameState.columns.center.length >= 6 ? 'FULL' : 'Drop'}</span>
          </button>
          
          <button
            onClick={() => dropNewCat('right')}
            disabled={!gameState.isActive || dragState.isDragging || gameState.columns.right.length >= 6}
            className={`flex-1 btn-responsive rounded-lg font-bold transition-all flex items-center justify-center gap-1 ${
              gameState.isActive && !dragState.isDragging && gameState.columns.right.length < 6
                ? 'bg-green-500 hover:bg-green-600 text-white shadow-md' 
                : 'bg-gray-300 text-gray-500 cursor-not-allowed'
            }`}
          >
            <span className="text-responsive-xl">🔽</span>
            <span className="text-responsive-base">{gameState.columns.right.length >= 6 ? 'FULL' : 'Drop'}</span>
          </button>
        </div>
        
        <p className="text-center text-gray-500 text-responsive-sm font-medium">
          💡 Tip: Drag top cats between columns or use drop buttons!
        </p>
      </div>

      <BottomNavBar />
    </div>
  );
}

export default App;
