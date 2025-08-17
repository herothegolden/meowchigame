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

  const [animations, setAnimations] = useState([]);
  const [currentTagline, setCurrentTagline] = useState(0);
  const taglines = [
    "😼 Chaos Mode Activated",
    "🐾 Don't Blink, Human", 
    "🔥 Catnado Incoming"
  ];
  
  const gameTimerRef = useRef(null);
  const boardRef = useRef(null);

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
    if (!gameState.isActive) return;
    if (gameState.columns[column].length >= 6) return;

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

  const DraggableCat = ({ cat, columnId, index }) => {
    const isTopCat = index === gameState.columns[columnId].length - 1;
    
    return (
      <div
        className="text-6xl select-none transition-all duration-200 p-1 hover:scale-105"
        onTouchStart={() => {
          if (isTopCat && navigator.vibrate) {
            navigator.vibrate(50);
          }
        }}
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
    const isFull = cats.length >= 6;
    
    return (
      <div className="flex-1 max-w-20 border-2 border-gray-300 rounded-lg p-2 transition-all duration-200 flex flex-col-reverse items-center gap-1 bg-white overflow-hidden h-full">
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
      <div className="fixed bottom-0 left-0 right-0 bg-gray-800 border-t border-gray-600 px-2 py-3">
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
    <div className="min-h-screen bg-white pb-20">
      <div className="bg-blue-500 text-white p-4 flex items-center gap-3">
        <div className="w-8 h-8 bg-white rounded-full flex items-center justify-center">✅</div>
        <h1 className="text-lg font-semibold">Tasks</h1>
      </div>
      <div className="p-4">
        <p>Tasks coming soon!</p>
      </div>
      <BottomNavBar />
    </div>
  );

  const LeaderboardScreen = () => (
    <div className="min-h-screen bg-gray-100 pb-20">
      <div className="bg-purple-500 text-white p-4 flex items-center gap-3">
        <div className="w-8 h-8 bg-white rounded-full flex items-center justify-center">📊</div>
        <h1 className="text-lg font-semibold">Leaderboard</h1>
      </div>
      <div className="p-4">
        <p>Leaderboard coming soon!</p>
      </div>
      <BottomNavBar />
    </div>
  );

  const BonusScreen = () => (
    <div className="min-h-screen bg-gray-100 pb-20">
      <div className="bg-green-500 text-white p-4 flex items-center gap-3">
        <div className="w-8 h-8 bg-white rounded-full flex items-center justify-center">🎁</div>
        <h1 className="text-lg font-semibold">Bonus Time</h1>
      </div>
      <div className="p-4">
        <p>Bonus features coming soon!</p>
      </div>
      <BottomNavBar />
    </div>
  );

  const AccountScreen = () => (
    <div className="min-h-screen bg-gray-100 pb-20">
      <div className="bg-gray-500 text-white p-4 flex items-center gap-3">
        <div className="w-8 h-8 bg-white rounded-full flex items-center justify-center">👤</div>
        <h1 className="text-lg font-semibold">Account</h1>
      </div>
      <div className="p-4">
        <p>Account features coming soon!</p>
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

      <div className="bg-blue-500 text-white p-3 flex items-center justify-center">
        <h1 className="text-lg font-bold animate-pulse">{taglines[currentTagline]}</h1>
      </div>

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

      <div className="p-3 bg-gradient-to-r from-purple-500 to-blue-500">
        <div className="flex items-center justify-center gap-3 text-white">
          <span className="font-semibold">NEXT:</span>
          <div className="w-12 h-12 bg-white rounded-lg flex items-center justify-center">
            <span className="text-2xl">{gameState.nextCat}</span>
          </div>
        </div>
      </div>

      <div className="flex-1 p-3 min-h-0">
        <div ref={boardRef} className="flex justify-center gap-3 h-full">
          <GameColumn columnId="left" cats={gameState.columns.left} />
          <GameColumn columnId="center" cats={gameState.columns.center} />
          <GameColumn columnId="right" cats={gameState.columns.right} />
        </div>
      </div>

      <div className="p-3 bg-white border-t">
        <div className="flex gap-2 mb-2">
          <button
            onClick={() => dropNewCat('left')}
            disabled={!gameState.isActive || gameState.columns.left.length >= 6}
            className={`flex-1 py-3 rounded-lg font-bold transition-all flex items-center justify-center gap-1 text-sm ${
              gameState.isActive && gameState.columns.left.length < 6
                ? 'bg-green-500 hover:bg-green-600 text-white shadow-md' 
                : 'bg-gray-300 text-gray-500 cursor-not-allowed'
            }`}
          >
            <span className="text-red-500">🔽</span>
            <span>{gameState.columns.left.length >= 6 ? 'FULL' : 'Drop'}</span>
          </button>
          
          <button
            onClick={() => dropNewCat('center')}
            disabled={!gameState.isActive || gameState.columns.center.length >= 6}
            className={`flex-1 py-3 rounded-lg font-bold transition-all flex items-center justify-center gap-1 text-sm ${
              gameState.isActive && gameState.columns.center.length < 6
                ? 'bg-green-500 hover:bg-green-600 text-white shadow-md' 
                : 'bg-gray-300 text-gray-500 cursor-not-allowed'
            }`}
          >
            <span className="text-red-500">🔽</span>
            <span>{gameState.columns.center.length >= 6 ? 'FULL' : 'Drop'}</span>
          </button>
          
          <button
            onClick={() => dropNewCat('right')}
            disabled={!gameState.isActive || gameState.columns.right.length >= 6}
            className={`flex-1 py-3 rounded-lg font-bold transition-all flex items-center justify-center gap-1 text-sm ${
              gameState.isActive && gameState.columns.right.length < 6
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

export default MeowChiGame;
