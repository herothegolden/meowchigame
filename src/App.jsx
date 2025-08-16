import React, { useState, useEffect, useRef } from 'react';

const CAT_EMOJIS = ['😺', '😻', '😼', '🐈', '🐈‍⬛'];
const INITIAL_TIME = 60;
const MATCH_SCORE = 1000;
const COMBO_BONUS = 500;

function MeowChiGame() {
  const [gameState, setGameState] = useState({
    timeLeft: INITIAL_TIME,
    score: 0,
    columns: { left: [], center: [], right: [] },
    isActive: false,
    consecutiveMatches: 0,
    gameStarted: false,
    nextCat: CAT_EMOJIS[Math.floor(Math.random() * CAT_EMOJIS.length)],
    currentTab: 'play'
  });

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
  const taglines = [
    "😼 Chaos Mode Activated",
    "🐾 Don't Blink, Human", 
    "🔥 Catnado Incoming"
  ];
  
  const gameTimerRef = useRef(null);
  const boardRef = useRef(null);
  const dragThreshold = 15;

  // Initialize Telegram Web App
  useEffect(() => {
    if (window.Telegram?.WebApp) {
      window.Telegram.WebApp.ready();
      window.Telegram.WebApp.expand();
      const tg = window.Telegram.WebApp;
      if (tg.backgroundColor) {
        document.body.style.backgroundColor = tg.backgroundColor;
      }
    }
  }, []);

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
      nextCat: CAT_EMOJIS[Math.floor(Math.random() * CAT_EMOJIS.length)]
    }));
    setAnimations([]);
  };

  const endGame = () => {
    setGameState(prev => ({ ...prev, isActive: false }));
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
    if (gameState.columns[column].length >= 6) return; // Hard limit at 6

    const newCat = { id: generateCatId(), emoji: gameState.nextCat };
    const nextNextCat = CAT_EMOJIS[Math.floor(Math.random() * CAT_EMOJIS.length)];

    setGameState(prev => {
      const newColumns = { ...prev.columns };
      newColumns[column] = [...newColumns[column], newCat];
      const { updatedColumns, scoreGained } = checkMatches(newColumns, column);
      return {
        ...prev,
        columns: updatedColumns,
        score: prev.score + scoreGained,
        consecutiveMatches: scoreGained > 0 ? prev.consecutiveMatches + 1 : 0,
        nextCat: nextNextCat
      };
    });
  };

  const checkMatches = (columns, targetColumn) => {
    const updatedColumns = { ...columns };
    let scoreGained = 0;
    const column = updatedColumns[targetColumn];
    
    if (column.length >= 3) {
      for (let i = column.length - 1; i >= 2; i--) {
        if (column[i].emoji === column[i-1].emoji && column[i].emoji === column[i-2].emoji) {
          scoreGained = MATCH_SCORE + (gameState.consecutiveMatches * COMBO_BONUS);
          setTimeout(() => {
            setGameState(prev => {
              const delayedColumns = { ...prev.columns };
              delayedColumns[targetColumn] = [
                ...delayedColumns[targetColumn].slice(0, i-2),
                ...delayedColumns[targetColumn].slice(i+1)
              ];
              return { ...prev, columns: delayedColumns };
            });
            createExplosion(0, 0, column[i].emoji, scoreGained);
          }, 500);
          break;
        }
      }
    }
    return { updatedColumns, scoreGained };
  };

  const getColumnFromPosition = (x, y) => {
    if (!boardRef.current) return null;
    const columns = boardRef.current.querySelectorAll('[data-column]');
    for (let i = 0; i < columns.length; i++) {
      const column = columns[i];
      const rect = column.getBoundingClientRect();
      if (x >= rect.left - 20 && x <= rect.right + 20) {
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

  const handleTouchStart = (e, catId, fromColumn) => {
    if (!gameState.isActive) return;
    e.preventDefault();
    e.stopPropagation();
    const touch = e.touches[0];
    const cat = gameState.columns[fromColumn].find(c => c.id === catId);
    setDragState({
      isDragging: false,
      draggedCat: cat,
      fromColumn: fromColumn,
      dragPosition: { x: touch.clientX, y: touch.clientY },
      startPosition: { x: touch.clientX, y: touch.clientY },
      highlightedColumn: null
    });
    // Add haptic feedback if available
    if (navigator.vibrate) {
      navigator.vibrate(50);
    }
  };

  const handleTouchMove = (e) => {
    if (!dragState.draggedCat) return;
    e.preventDefault();
    e.stopPropagation();
    const touch = e.touches[0];
    const currentPos = { x: touch.clientX, y: touch.clientY };
    
    if (!dragState.isDragging && getDistanceMoved(dragState.startPosition, currentPos) > dragThreshold) {
      setDragState(prev => ({ ...prev, isDragging: true }));
    }
    
    if (dragState.isDragging) {
      const targetColumn = getColumnFromPosition(touch.clientX, touch.clientY);
      setDragState(prev => ({
        ...prev,
        dragPosition: { x: touch.clientX, y: touch.clientY },
        highlightedColumn: targetColumn && targetColumn !== prev.fromColumn ? targetColumn : null
      }));
    }
  };

  const handleTouchEnd = (e) => {
    if (!dragState.draggedCat) return;
    e.preventDefault();
    e.stopPropagation();
    
    if (dragState.isDragging) {
      const touch = e.changedTouches[0];
      const targetColumn = getColumnFromPosition(touch.clientX, touch.clientY);
      if (targetColumn && targetColumn !== dragState.fromColumn && gameState.columns[targetColumn].length < 6) {
        moveCat(targetColumn);
        // Add success haptic feedback
        if (navigator.vibrate) {
          navigator.vibrate(100);
        }
      }
    }
    resetDragState();
  };

  const handleMouseDown = (e, catId, fromColumn) => {
    if (!gameState.isActive) return;
    e.preventDefault();
    e.stopPropagation();
    const cat = gameState.columns[fromColumn].find(c => c.id === catId);
    setDragState({
      isDragging: false,
      draggedCat: cat,
      fromColumn: fromColumn,
      dragPosition: { x: e.clientX, y: e.clientY },
      startPosition: { x: e.clientX, y: e.clientY },
      highlightedColumn: null
    });
  };

  const handleMouseMove = (e) => {
    if (!dragState.draggedCat) return;
    const currentPos = { x: e.clientX, y: e.clientY };
    
    if (!dragState.isDragging && getDistanceMoved(dragState.startPosition, currentPos) > dragThreshold) {
      setDragState(prev => ({ ...prev, isDragging: true }));
    }
    
    if (dragState.isDragging) {
      const targetColumn = getColumnFromPosition(e.clientX, e.clientY);
      setDragState(prev => ({
        ...prev,
        dragPosition: { x: e.clientX, y: e.clientY },
        highlightedColumn: targetColumn && targetColumn !== prev.fromColumn ? targetColumn : null
      }));
    }
  };

  const handleMouseUp = (e) => {
    if (!dragState.draggedCat) return;
    if (dragState.isDragging) {
      const targetColumn = getColumnFromPosition(e.clientX, e.clientY);
      if (targetColumn && targetColumn !== dragState.fromColumn) {
        moveCat(targetColumn);
      }
    }
    resetDragState();
  };

  const moveCat = (targetColumn) => {
    if (gameState.columns[targetColumn].length >= 6) return; // Hard limit at 6
    setGameState(prev => {
      const newColumns = { ...prev.columns };
      newColumns[dragState.fromColumn] = newColumns[dragState.fromColumn].filter(
        cat => cat.id !== dragState.draggedCat.id
      );
      newColumns[targetColumn] = [...newColumns[targetColumn], dragState.draggedCat];
      const { updatedColumns, scoreGained } = checkMatches(newColumns, targetColumn);
      return {
        ...prev,
        columns: updatedColumns,
        score: prev.score + scoreGained,
        consecutiveMatches: scoreGained > 0 ? prev.consecutiveMatches + 1 : 0
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

  useEffect(() => {
    if (dragState.draggedCat) {
      const handleGlobalMouseMove = (e) => handleMouseMove(e);
      const handleGlobalMouseUp = (e) => handleMouseUp(e);
      const handleGlobalTouchMove = (e) => handleTouchMove(e);
      const handleGlobalTouchEnd = (e) => handleTouchEnd(e);
      
      document.addEventListener('mousemove', handleGlobalMouseMove, { passive: false });
      document.addEventListener('mouseup', handleGlobalMouseUp);
      document.addEventListener('touchmove', handleGlobalTouchMove, { passive: false });
      document.addEventListener('touchend', handleGlobalTouchEnd, { passive: false });
      
      return () => {
        document.removeEventListener('mousemove', handleGlobalMouseMove);
        document.removeEventListener('mouseup', handleGlobalMouseUp);
        document.removeEventListener('touchmove', handleGlobalTouchMove);
        document.removeEventListener('touchend', handleGlobalTouchEnd);
      };
    }
  }, [dragState.draggedCat, dragState.isDragging]);

  // Component definitions
  const DraggableCat = ({ cat, columnId, index }) => {
    const isDraggedCat = dragState.draggedCat?.id === cat.id;
    
    return (
      <div
        className={`text-6xl select-none transition-all duration-200 p-1 cursor-grab active:cursor-grabbing ${
          isDraggedCat && dragState.isDragging ? 'opacity-30' : 'hover:scale-105'
        } ${gameState.isActive ? '' : 'cursor-default'}`}
        onMouseDown={(e) => handleMouseDown(e, cat.id, columnId)}
        onTouchStart={(e) => handleTouchStart(e, cat.id, columnId)}
        style={{
          userSelect: 'none',
          WebkitUserSelect: 'none',
          MozUserSelect: 'none',
          msUserSelect: 'none',
          WebkitTouchCallout: 'none',
          WebkitTapHighlightColor: 'transparent'
        }}
      >
        {cat.emoji}
      </div>
    );
  };

  const GameColumn = ({ columnId, cats }) => {
    const isHighlighted = dragState.highlightedColumn === columnId;
    const isFull = cats.length >= 6;
    
    return (
      <div
        data-column={columnId}
        className={`flex-1 max-w-20 border-2 rounded-lg p-2 transition-all duration-200 flex flex-col-reverse items-center gap-1 bg-white overflow-hidden h-full ${
          isHighlighted && !isFull
            ? 'border-blue-400 bg-blue-50 shadow-lg scale-105 ring-2 ring-blue-300' 
            : isFull
            ? 'border-red-300 bg-red-50'
            : 'border-gray-300'
        }`}
      >
        {cats.map((cat, index) => (
          <DraggableCat key={cat.id} cat={cat} columnId={columnId} index={index} />
        ))}
        
        {cats.length === 0 && (
          <div className="text-gray-300 text-xs text-center mt-8">Empty</div>
        )}
        
        {isFull && (
          <div className="text-red-400 text-xs text-center font-bold mt-2">FULL</div>
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
            <div className="text-6xl animate-bounce">{animation.emoji}</div>
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

   return (
     <div className="fixed bottom-0 left-0 right-0 bg-gray-800 border-t border-gray-600 px-2 py-3">
       <div className="flex justify-around items-center max-w-md mx-auto">
         {navItems.map((item) => {
           const isActive = gameState.currentTab === item.id;
           return (
             <button
               key={item.id}
               onClick={() => handleTabClick(item.id)}
               className={`flex flex-col items-center justify-center px-3 py-2 rounded-lg min-w-16 transition-all duration-200 ${
                 isActive 
                   ? (item.color === 'orange' ? 'bg-orange-500' : 
                      item.color === 'blue' ? 'bg-blue-500' : 
                      item.color === 'purple' ? 'bg-purple-500' : 
                      item.color === 'green' ? 'bg-green-500' : 'bg-gray-500') + ' shadow-lg scale-105'
                   : 'bg-gray-700 hover:bg-gray-600'
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
   <div className="min-h-screen bg-white pb-20">
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
               <div className="flex items-center gap-2">
                 <div className="w-4 h-4 bg-blue-400 rounded-full flex items-center justify-center">
                   <span className="text-xs">💙</span>
                 </div>
                 <div>
                   <div className="text-gray-800 font-semibold">Join Our Telegram Channel</div>
                   <div className="flex items-center gap-2 text-yellow-600">
                     <span className="text-sm">🪙 1,000</span>
                     <span className="text-sm">⏰ +5s</span>
                   </div>
                 </div>
               </div>
             </div>
             <button className="bg-gray-300 text-gray-500 px-6 py-2 rounded-full font-semibold">
               Claim
             </button>
           </div>

           <div className="bg-gray-50 rounded-2xl p-4 flex items-center justify-between border border-gray-200 shadow-sm">
             <div className="flex items-center gap-3">
               <div className="text-4xl">🐱</div>
               <div className="flex items-center gap-2">
                 <div className="w-4 h-4 bg-pink-400 rounded-full flex items-center justify-center">
                   <span className="text-xs">💙</span>
                 </div>
                 <div>
                   <div className="text-gray-800 font-semibold">Join Our Instagram</div>
                   <div className="flex items-center gap-2 text-yellow-600">
                     <span className="text-sm">🪙 1,000</span>
                     <span className="text-sm">⏰ +5s</span>
                   </div>
                 </div>
               </div>
             </div>
             <button className="bg-gray-300 text-gray-500 px-6 py-2 rounded-full font-semibold">
               Claim
             </button>
           </div>

           <div className="bg-gray-50 rounded-2xl p-4 flex items-center justify-between border border-gray-200 shadow-sm">
             <div className="flex items-center gap-3">
               <div className="text-4xl">🐱</div>
               <div className="flex items-center gap-2">
                 <div className="w-4 h-4 bg-red-400 rounded-full flex items-center justify-center">
                   <span className="text-xs">💙</span>
                 </div>
                 <div>
                   <div className="text-gray-800 font-semibold">Join Our YouTube</div>
                   <div className="flex items-center gap-2 text-yellow-600">
                     <span className="text-sm">🪙 1,000</span>
                     <span className="text-sm">⏰ +5s</span>
                   </div>
                 </div>
               </div>
             </div>
             <button className="bg-gray-300 text-gray-500 px-6 py-2 rounded-full font-semibold">
               Claim
             </button>
           </div>
         </div>

         <div className="space-y-4 mt-6">
           {[
             { friends: 1, reward: 2500 },
             { friends: 3, reward: 10000 },
             { friends: 10, reward: 35000 },
             { friends: 15, reward: 50000 }
           ].map((task) => (
             <div key={task.friends} className="bg-gray-50 rounded-2xl p-4 border border-gray-200 shadow-sm">
               <div className="flex items-center justify-between mb-2">
                 <div className="flex items-center gap-3">
                   <div className="text-4xl">🐱</div>
                   <div className="flex items-center gap-2">
                     <div className="w-4 h-4 bg-blue-400 rounded-full flex items-center justify-center">
                       <span className="text-xs">💙</span>
                     </div>
                     <div>
                       <div className="text-gray-800 font-semibold">Invite {task.friends} Friend{task.friends > 1 ? 's' : ''}</div>
                       <div className="flex items-center gap-2 text-yellow-600">
                         <span className="text-sm">🪙 {task.reward.toLocaleString()}</span>
                       </div>
                     </div>
                   </div>
                 </div>
                 <button className="bg-gray-300 text-gray-500 px-6 py-2 rounded-full font-semibold">
                   Claim
                 </button>
               </div>
               <div className="w-full bg-gray-200 h-2 rounded-full">
                 <div className="bg-gray-400 h-2 rounded-full" style={{width: '0%'}}></div>
               </div>
             </div>
           ))}
         </div>
       </div>

       <div>
         <h2 className="text-gray-800 text-xl font-bold mb-4">Daily Tasks</h2>
         
         <div className="space-y-4">
           <div className="bg-gray-50 rounded-2xl p-4 border border-gray-200 shadow-sm">
             <div className="flex items-center justify-between mb-2">
               <div className="flex items-center gap-3">
                 <div className="text-4xl">🐱</div>
                 <div className="flex items-center gap-2">
                   <div className="w-4 h-4 bg-pink-400 rounded-full flex items-center justify-center">
                     <span className="text-xs">💙</span>
                   </div>
                   <div>
                     <div className="text-gray-800 font-semibold">Like & Comment on Instagram</div>
                     <div className="flex items-center gap-2 text-yellow-600">
                       <span className="text-sm">🪙 1,000</span>
                     </div>
                   </div>
                 </div>
               </div>
               <button className="bg-gray-300 text-gray-500 px-6 py-2 rounded-full font-semibold">
                 Claim
               </button>
             </div>
             <div className="w-full bg-gray-200 h-2 rounded-full">
               <div className="bg-gray-400 h-2 rounded-full" style={{width: '0%'}}></div>
             </div>
           </div>

           <div className="bg-gray-50 rounded-2xl p-4 border border-gray-200 shadow-sm">
             <div className="flex items-center justify-between mb-2">
               <div className="flex items-center gap-3">
                 <div className="text-4xl">🐱</div>
                 <div className="flex items-center gap-2">
                   <div className="w-4 h-4 bg-blue-400 rounded-full flex items-center justify-center">
                     <span className="text-xs">💙</span>
                   </div>
                   <div>
                     <div className="text-gray-800 font-semibold">Like & Comment on Telegram</div>
                     <div className="flex items-center gap-2 text-yellow-600">
                       <span className="text-sm">🪙 1,000</span>
                     </div>
                   </div>
                 </div>
               </div>
               <button className="bg-gray-300 text-gray-500 px-6 py-2 rounded-full font-semibold">
                 Claim
               </button>
             </div>
             <div className="w-full bg-gray-200 h-2 rounded-full">
               <div className="bg-gray-400 h-2 rounded-full" style={{width: '0%'}}></div>
             </div>
           </div>
         </div>
       </div>
     </div>
   </div>
 );

 const LeaderboardScreen = () => (
   <div className="min-h-screen bg-gray-100 pb-20">
     <div className="bg-purple-500 text-white p-4 flex items-center gap-3">
       <div className="w-8 h-8 bg-white rounded-full flex items-center justify-center">📊</div>
       <h1 className="text-lg font-semibold">Leaderboard</h1>
     </div>
     <div className="p-4 space-y-3">
       <div className="bg-white rounded-lg p-4 shadow-sm">
         <h3 className="font-semibold text-gray-800 mb-3">🌟 All-Time Champions</h3>
         <div className="space-y-2">
           <div className="flex justify-between items-center">
             <span>👑 @champion1</span>
             <span className="font-bold text-purple-600">50,000 pts</span>
           </div>
           <div className="flex justify-between items-center">
             <span>⭐ @champion2</span>
             <span className="font-bold text-blue-600">45,000 pts</span>
           </div>
         </div>
       </div>
     </div>
   </div>
 );

 const BonusScreen = () => (
   <div className="min-h-screen bg-gray-100 pb-20">
     <div className="bg-green-500 text-white p-4 flex items-center gap-3">
       <div className="w-8 h-8 bg-white rounded-full flex items-center justify-center">🎁</div>
       <h1 className="text-lg font-semibold">Bonus Time</h1>
     </div>
     <div className="p-4 space-y-3">
       <div className="bg-white rounded-lg p-4 shadow-sm text-center">
         <h3 className="font-semibold text-gray-800 mb-2">Your Bonus Time</h3>
         <div className="text-3xl font-bold text-green-600 mb-2">+25s</div>
         <p className="text-gray-600 text-sm">Added to your game timer!</p>
       </div>
       <div className="bg-white rounded-lg p-4 shadow-sm">
         <h3 className="font-semibold text-gray-800 mb-3">Earn More Time</h3>
         <div className="space-y-3">
           <div className="flex justify-between items-center">
             <span>📱 Share with friends</span>
             <span className="text-green-600 font-bold">+10s each</span>
           </div>
           <div className="flex justify-between items-center">
             <span>📺 Join Telegram channel</span>
             <span className="text-green-600 font-bold">+10s</span>
           </div>
           <div className="flex justify-between items-center">
             <span>📷 Follow Instagram</span>
             <span className="text-green-600 font-bold">+10s</span>
           </div>
         </div>
       </div>
     </div>
   </div>
 );

 const AccountScreen = () => (
   <div className="min-h-screen bg-gray-100 pb-20">
     <div className="bg-gray-500 text-white p-4 flex items-center gap-3">
       <div className="w-8 h-8 bg-white rounded-full flex items-center justify-center">👤</div>
       <h1 className="text-lg font-semibold">Account</h1>
     </div>
     <div className="p-4 space-y-3">
       <div className="bg-white rounded-lg p-4 shadow-sm text-center">
         <div className="text-4xl mb-2">🐱</div>
         <h3 className="font-semibold text-gray-800">@username</h3>
         <p className="text-gray-600 text-sm">MeowChi Player</p>
       </div>
       <div className="bg-white rounded-lg p-4 shadow-sm">
         <h3 className="font-semibold text-gray-800 mb-3">Your Stats</h3>
         <div className="space-y-2">
           <div className="flex justify-between items-center">
             <span>Games Played</span>
             <span className="font-bold">127</span>
           </div>
           <div className="flex justify-between items-center">
             <span>Best Score</span>
             <span className="font-bold text-purple-600">15,000</span>
           </div>
           <div className="flex justify-between items-center">
             <span>Total Matches</span>
             <span className="font-bold">1,234</span>
           </div>
           <div className="flex justify-between items-center">
             <span>Friends Invited</span>
             <span className="font-bold text-green-600">8</span>
           </div>
         </div>
       </div>
     </div>
   </div>
 );

 // Main render logic
 if (gameState.currentTab === 'tasks') return <><TasksScreen /><BottomNavBar /></>;
 if (gameState.currentTab === 'leaderboard') return <><LeaderboardScreen /><BottomNavBar /></>;
 if (gameState.currentTab === 'bonus') return <><BonusScreen /><BottomNavBar /></>;
 if (gameState.currentTab === 'account') return <><AccountScreen /><BottomNavBar /></>;

if (!gameState.gameStarted && gameState.currentTab === 'play') {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 pb-20" style={{backgroundColor: '#FFD700'}}>
      <div className="text-center bg-yellow-400 rounded-2xl shadow-xl p-8 max-w-sm" style={{backgroundColor: '#FFD700'}}>
        <h1 className="text-6xl font-black text-black mb-4">🐾 MEOWCHI CHAOS</h1>
        <p className="text-black text-xl font-bold mb-8">
          Drop cats. Cause mayhem. Match 3 before they scream.
        </p>
        
        <div className="mb-8">
          <div className="flex justify-center gap-3 mb-4">
            <span className="text-5xl animate-spin" style={{animation: 'spin 1s ease-in-out'}}>😺</span>
            <span className="text-5xl animate-spin" style={{animation: 'spin 1s ease-in-out', animationDelay: '0.1s'}}>😹</span>
            <span className="text-5xl animate-spin" style={{animation: 'spin 1s ease-in-out', animationDelay: '0.2s'}}>🐈</span>
            <span className="text-5xl animate-spin" style={{animation: 'spin 1s ease-in-out', animationDelay: '0.3s'}}>😻</span>
            <span className="text-5xl animate-spin" style={{animation: 'spin 1s ease-in-out', animationDelay: '0.4s'}}>🐈‍⬛</span>
          </div>
          <p className="text-lg text-black font-bold">5 ridiculous cats to wrangle.</p>
        </div>
        
        <div className="mb-8 text-lg text-black font-bold leading-relaxed">
          <div>⏱ 60 seconds of panic</div>
          <div>🐾 +1000 purr-points</div>
          <div>🔥 Combos = Catnado</div>
        </div>
        
        <button
          onClick={startGame}
          className="bg-black text-white font-bold py-4 px-10 rounded-full shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-105 text-xl"
        >
          ▶️ LET'S GOOO!
        </button>
      </div>
      <BottomNavBar />
    </div>
  );
}

if (!gameState.isActive && gameState.gameStarted) {
  // Dynamic flavor text based on score
  let flavorText = "🐾 That's tragic. Even my paw is better at this.";
  if (gameState.score > 5000) {
    flavorText = "🔥 Absolute CatGod. Touch grass, maybe?";
  } else if (gameState.score > 2000) {
    flavorText = "😼 Not bad. You may live another round.";
  }
  
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 pb-20" style={{backgroundColor: '#FFD700'}}>
      <div className="text-center bg-yellow-400 rounded-2xl shadow-xl p-8 max-w-sm" style={{backgroundColor: '#FFD700'}}>
        <h2 className="text-5xl font-black text-black mb-6">🎉 GAME OVER, HUMAN!</h2>
        <div className="text-8xl font-black text-black mb-4">{gameState.score}</div>
        <p className="text-black text-xl font-bold mb-4">Final Score</p>
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
            onClick={() => setGameState(prev => ({ ...prev, gameStarted: false, currentTab: 'play' }))}
            className="w-full bg-yellow-400 border-2 border-black text-black font-bold py-4 px-6 rounded-full hover:bg-yellow-300 transition-all duration-200 text-xl"
            style={{backgroundColor: '#FFD700'}}
          >
            📊 BOARD
          </button>
        </div>
      </div>
      <BottomNavBar />
    </div>
  );
}

 return (
   <div className="h-screen bg-gray-100 flex flex-col relative overflow-hidden">
     {animations.map((animation) => (
       <ExplosionAnimation key={animation.id} animation={animation} />
     ))}

     {dragState.isDragging && dragState.draggedCat && (
       <div
         className="fixed pointer-events-none z-40 text-6xl transform -translate-x-1/2 -translate-y-1/2 rotate-12 scale-110 drop-shadow-lg"
         style={{
           left: dragState.dragPosition.x,
           top: dragState.dragPosition.y,
         }}
       >
         {dragState.draggedCat.emoji}
       </div>
     )}

     {/* Header with rotating tagline */}
     <div className="bg-blue-500 text-white p-3 flex items-center justify-center">
       <h1 className="text-lg font-bold animate-pulse">{taglines[currentTagline]}</h1>
     </div>

     {/* Timer and Score - Big and Bold */}
     <div className="bg-white p-3 flex justify-between items-center border-b shadow-sm">
       <div className="flex items-center gap-2">
         <span className="text-2xl">⏱</span>
         <span className={`text-2xl font-black ${gameState.timeLeft <= 10 ? 'text-red-500 animate-pulse' : 'text-gray-800'}`}>
           {gameState.timeLeft}s
         </span>
       </div>
       <div className="flex items-center gap-2">
         <span className="text-2xl">🐾</span>
         <span className="text-2xl font-black text-purple-600">{gameState.score}</span>
       </div>
     </div>

     {/* Next Cat - Compact */}
     <div className="p-3 bg-gradient-to-r from-purple-500 to-blue-500">
       <div className="flex items-center justify-center gap-3 text-white">
         <span className="font-semibold">NEXT:</span>
         <div className="w-12 h-12 bg-white rounded-lg flex items-center justify-center">
           <span className="text-2xl">{gameState.nextCat}</span>
         </div>
       </div>
     </div>

     {/* Game Board - Flexible height */}
     <div className="flex-1 p-3 min-h-0">
       <div ref={boardRef} className="flex justify-center gap-3 h-full">
         <GameColumn columnId="left" cats={gameState.columns.left} />
         <GameColumn columnId="center" cats={gameState.columns.center} />
         <GameColumn columnId="right" cats={gameState.columns.right} />
       </div>
     </div>

     {/* Drop Buttons - Fixed at bottom */}
     <div className="p-3 bg-white border-t">
       <div className="flex gap-2 mb-2">
         <button
           onClick={() => dropNewCat('left')}
           disabled={!gameState.isActive || dragState.isDragging || gameState.columns.left.length >= 6}
           className={`flex-1 py-3 rounded-lg font-bold transition-all flex items-center justify-center gap-1 text-sm ${
             gameState.isActive && !dragState.isDragging && gameState.columns.left.length < 6
               ? 'bg-green-500 hover:bg-green-600 text-white shadow-md' 
               : 'bg-gray-300 text-gray-500 cursor-not-allowed'
           }`}
         >
           <span className="text-red-500">🔽</span>
           <span>{gameState.columns.left.length >= 6 ? 'FULL' : 'Drop'}</span>
         </button>
         
         <button
           onClick={() => dropNewCat('center')}
           disabled={!gameState.isActive || dragState.isDragging || gameState.columns.center.length >= 6}
           className={`flex-1 py-3 rounded-lg font-bold transition-all flex items-center justify-center gap-1 text-sm ${
             gameState.isActive && !dragState.isDragging && gameState.columns.center.length < 6
               ? 'bg-green-500 hover:bg-green-600 text-white shadow-md' 
               : 'bg-gray-300 text-gray-500 cursor-not-allowed'
           }`}
         >
           <span className="text-red-500">🔽</span>
           <span>{gameState.columns.center.length >= 6 ? 'FULL' : 'Drop'}</span>
         </button>
         
         <button
           onClick={() => dropNewCat('right')}
           disabled={!gameState.isActive || dragState.isDragging || gameState.columns.right.length >= 6}
           className={`flex-1 py-3 rounded-lg font-bold transition-all flex items-center justify-center gap-1 text-sm ${
             gameState.isActive && !dragState.isDragging && gameState.columns.right.length < 6
               ? 'bg-green-500 hover:bg-green-600 text-white shadow-md' 
               : 'bg-gray-300 text-gray-500 cursor-not-allowed'
           }`}
         >
           <span className="text-red-500">🔽</span>
           <span>{gameState.columns.right.length >= 6 ? 'FULL' : 'Drop'}</span>
         </button>
       </div>
       
       <p className="text-center text-gray-500 text-xs">
         💡 Tip: Drag top cats between columns!
       </p>
     </div>

     <BottomNavBar />
   </div>
 );
}

export default MeowChiGame;<h3 className="font-semibold text-gray-800 mb-3">🏆 Today's Top Players</h3>
         <div className="space-y-2">
           <div className="flex justify-between items-center">
             <span>🥇 @player1</span>
             <span className="font-bold text-yellow-600">15,000 pts</span>
           </div>
           <div className="flex justify-between items-center">
             <span>🥈 @player2</span>
             <span className="font-bold text-gray-500">12,500 pts</span>
           </div>
           <div className="flex justify-between items-center">
             <span>🥉 @player3</span>
             <span className="font-bold text-orange-500">10,000 pts</span>
           </div>
         </div>
       </div>
       <div className="bg-white rounded-lg p-4 shadow-sm">
