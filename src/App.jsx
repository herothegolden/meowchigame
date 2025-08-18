setTimeout(() => {
      setSpinningEmojis(prev => ({
        ...prev,
        [emojiIndex]: false
      }));
    }, 1000);
  };

  const generateCatId = () => `cat_${Date.now()}_${Math.random()}`;

  const startGame = () => {
    triggerHaptic('medium');
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
    triggerHaptic('heavy');
    
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
    triggerHaptic('success');
    
    setTimeout(() => {
      setAnimations(prev => prev.filter(anim => anim.id !== explosionId));
    }, 2000);
  };

  const dropNewCat = (column) => {
    if (!gameState.isActive || dragState.isDragging) return;
    if (gameState.columns[column].length >= 6) {
      triggerHaptic('error');
      return;
    }

    triggerHaptic('light');
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
          
          updatedColumns[targetColumn] = [
            ...updatedColumns[targetColumn].slice(0, i-2),
            ...updatedColumns[targetColumn].slice(i+1)
          ];
          
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

  const handleDragStart = (e, catId, fromColumn) => {
    if (!gameState.isActive) return;
    
    e.preventDefault();
    e.stopPropagation();

    triggerHaptic('light');
    
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
  };

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
        setDragState(prev => {
          if (prev.highlightedColumn !== targetColumn && targetColumn) {
            triggerHaptic('light');
          }
          
          return {
            ...prev,
            dragPosition: { x: clientX, y: clientY },
            highlightedColumn: targetColumn
          };
        });
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
          if (gameState.columns[targetColumn].length < 6) {
            moveCat(targetColumn, dragState.draggedCat, dragState.fromColumn);
            triggerHaptic('medium');
          } else {
            triggerHaptic('error');
          }
        }
        resetDragState();
      };

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
  }, [dragState.isDragging, dragState.fromColumn, dragState.draggedCat, gameState.columns, triggerHaptic]);

  const moveCat = (targetColumn, draggedCat, fromColumn) => {
    setGameState(prev => {
      const newColumns = { ...prev.columns };
      
      if (newColumns[fromColumn]) {
        newColumns[fromColumn] = newColumns[fromColumn].filter(
          cat => cat.id !== draggedCat.id
        );
      }
      
      if (newColumns[targetColumn]) {
        newColumns[targetColumn] = [...newColumns[targetColumn], draggedCat];
      }
      
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

  const LoadingOverlay = () => (
    <div className={`hk-loading-overlay ${isLayoutReady ? 'hidden' : ''}`}>
      <div className="text-center relative w-full h-full flex flex-col items-center justify-center">
        <div className="mb-8 relative">
          <div className="text-6xl">😽</div>
          <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 text-2xl text-blue-300 animate-pulse">
            Zzz
          </div>
        </div>
        
        <h2 className="text-2xl font-bold text-yellow-400 mb-6">
          Waking up cats...
        </h2>
        
        <div className="w-64 h-1 bg-gray-800 rounded-full mb-8 overflow-hidden">
          <div 
            className="h-full bg-gradient-to-r from-yellow-400 to-orange-500 rounded-full transition-all duration-100"
            style={{ width: `${Math.min(loadingProgress, 100)}%` }}
          />
        </div>
        
        <div className="flex space-x-2">
          {[1, 2, 3].map((dot) => (
            <div
              key={dot}
              className={`w-3 h-3 rounded-full transition-all duration-300 ${
                loadingProgress > dot * 25 ? 'bg-yellow-400 scale-110' : 'bg-gray-600'
              }`}
            />
          ))}
        </div>
      </div>
    </div>
  );

  const DraggableCat = ({ cat, columnId }) => (
    <div
      className="hk-cat-emoji"
      onPointerDown={(e) => handleDragStart(e, cat.id, columnId)}
      onTouchStart={(e) => handleDragStart(e, cat.id, columnId)}
      onMouseDown={(e) => handleDragStart(e, cat.id, columnId)}
      style={{
        opacity: dragState.draggedCat?.id === cat.id && dragState.isDragging ? 0.5 : 1
      }}
    >
      {cat.emoji}
    </div>
  );

  const GameColumn = ({ columnId, cats }) => {
    const isFull = cats.length >= 6;
    const isHighlighted = dragState.highlightedColumn === columnId;
    
    return (
      <div
        data-column={columnId}
        className={`hk-game-column ${isHighlighted ? 'highlighted' : ''}`}
      >
        {cats.map((cat) => (
          <DraggableCat key={cat.id} cat={cat} columnId={columnId} />
        ))}
        
        {cats.length === 0 && (
          <div className="text-gray-400 text-xs text-center mt-4">Empty</div>
        )}
        
        {isFull && (
          <div className="text-red-500 text-xs text-center font-bold absolute top-2">FULL</div>
        )}
      </div>
    );
  };

  const ExplosionAnimation = ({ animation }) => (
    <div
      className="fixed pointer-events-none z-[200] animate-ping"
      style={{
        left: animation.x - 50,
        top: animation.y - 50,
        transform: 'translate(-50%, -50%)'
      }}
    >
      <div className="relative">
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-6xl animate-bounce">{animation.emoji}</div>
        </div>
        
        {[...Array(8)].map((_, i) => (
          <div
            key={i}
            className="absolute w-4 h-4 bg-yellow-400 rounded-full animate-ping"
            style={{
              left: 50 + Math.cos(i * Math.PI / 4) * 40,
              top: 50 + Math.sin(i * Math.PI / 4) * 40,
              animationDelay: `${i * 50}ms`,
              animationDuration: '1s'
            }}
          />
        ))}
        
        <div className="absolute left-1/2 transform -translate-x-1/2 -translate-y-8 text-2xl font-bold text-yellow-400 animate-bounce">
          +{animation.scoreGained}
        </div>
      </div>
    </div>
  );

  const BottomNavBar = () => {
    const navItems = [
      { id: 'play', icon: '🎮', label: 'Play' },
      { id: 'tasks', icon: '✅', label: 'Tasks' },
      { id: 'leaderboard', icon: '📊', label: 'Board' },
      { id: 'bonus', icon: '🎁', label: 'Bonus' },
      { id: 'account', icon: '👤', label: 'Account' }
    ];

    const handleTabClick = (tabId) => {
      triggerHaptic('light');
      setGameState(prev => ({ ...prev, currentTab: tabId }));
    };

    return (
      <div className="hk-bottom-nav">
        <div className="hk-nav-container">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => handleTabClick(item.id)}
              className={`hk-nav-item ${
                gameState.currentTab === item.id ? 'active' : ''
              }`}
            >
              <span className="hk-nav-icon">{item.icon}</span>
              <span className="hk-nav-label">{item.label}</span>
            </button>
          ))}
        </div>
      </div>
    );
  };

  const TasksScreen = () => (
    <div className="hk-app-container">
      <div className="hk-main-content">
        <div className="hk-scrollable-content">
          <div className="bg-blue-500 text-white p-6 text-center">
            <h1 className="text-xl font-bold">Tasks</h1>
          </div>
          <div className="p-6">
            <div className="bg-white rounded-2xl p-4 shadow-lg">
              <div className="flex items-center gap-4">
                <div className="text-4xl">🐱</div>
                <div className="flex-1">
                  <div className="font-bold text-gray-800">Join Telegram Channel</div>
                  <div className="text-yellow-600 text-sm">🪙 1,000 + ⏰ +5s</div>
                </div>
                <button className="bg-gray-300 text-gray-600 px-4 py-2 rounded-full font-bold">
                  Claim
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
      <BottomNavBar />
    </div>
  );

  const LeaderboardScreen = () => (
    <div className="hk-app-container">
      <div className="hk-main-content">
        <div className="hk-scrollable-content">
          <div className="bg-purple-500 text-white p-6 text-center">
            <h1 className="text-xl font-bold">Leaderboard</h1>
          </div>
          <div className="p-6 space-y-4">
            {leaderboard.length > 0 ? (
              leaderboard.map((player, index) => (
                <div key={index} className="bg-white rounded-2xl p-4 shadow-lg flex justify-between items-center">
                  <div className="flex items-center gap-4">
                    <span className="text-2xl">
                      {index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `#${index + 1}`}
                    </span>
                    <div>
                      <div className="font-bold text-gray-800">
                        {player.username ? `@${player.username}` : `${player.first_name} ${player.last_name || ''}`.trim()}
                      </div>
                      <div className="text-sm text-gray-500">{player.games_played} games</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-bold text-yellow-600">{player.best_score.toLocaleString()}</div>
                    <div className="text-xs text-gray-500">best</div>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-12">
                <div className="text-6xl mb-4">🐾</div>
                <div className="text-gray-500">No scores yet!</div>
              </div>
            )}
          </div>
        </div>
      </div>
      <BottomNavBar />
    </div>
  );

  const BonusScreen = () => (
    <div className="hk-app-container">
      <div className="hk-main-content">
        <div className="hk-scrollable-content">
          <div className="bg-green-500 text-white p-6 text-center">
            <h1 className="text-xl font-bold">Bonus Time</h1>
          </div>
          <div className="p-6">
            <div className="bg-white rounded-2xl p-6 shadow-lg text-center">
              <h3 className="font-bold text-gray-800 mb-4">Your Bonus Time</h3>
              <div className="text-4xl font-bold text-green-600">+25s</div>
            </div>
          </div>
        </div>
      </div>
      <BottomNavBar />
    </div>
  );

  const AccountScreen = () => (
    <div className="hk-app-container">
      <div className="hk-main-content">
        <div className="hk-scrollable-content">
          <div className="bg-gray-500 text-white p-6 text-center">
            <h1 className="text-xl font-bold">Account</h1>
          </div>
          <div className="p-6">
            <div className="bg-white rounded-2xl p-6 shadow-lg text-center">
              <div className="text-6xl mb-4">🐱</div>
              <h3 className="font-bold text-gray-800 mb-6">
                {userState.telegramUser ? 
                  (userState.telegramUser.username ? 
                    `@${userState.telegramUser.username}` : 
                    `${userState.telegramUser.first_name} ${userState.telegramUser.last_name || ''}`.trim()
                  ) : 
                  'Loading...'
                }
              </h3>
              
              {userState.stats && (
                <div className="space-y-3">
                  {[
                    ['Games Played', userState.stats.total_games || 0],
                    ['Best Score', userState.stats.best_score || 0],
                    ['Average Score', userState.stats.average_score || 0],
                    ['Total Matches', userState.stats.total_matches || 0],
                    ['Best Combo', userState.stats.best_combo || 0]
                  ].map(([label, value]) => (
                    <div key={label} className="flex justify-between items-center">
                      <span className="text-gray-600">{label}:</span>
                      <span className="font-bold">{typeof value === 'number' && label.includes('Score') ? value.toLocaleString() : value}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
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
      <div className="hk-app-container">
        <LoadingOverlay />
        
        <div className="hk-welcome-screen">
          <div className="hk-welcome-content">
            <h1 className="hk-title">MEOWCHI</h1>
            <h1 className="hk-title">CHAOS</h1>
            
            <p className="hk-subtitle">
              Drop cats. Cause mayhem.<br/>
              Match 3 before they scream.
            </p>
            
            <div className="hk-emoji-showcase">
              <div className="hk-emoji-row">
                {['😺', '😹', '🐈', '😻', '🐈‍⬛'].map((emoji, index) => (
                  <span 
                    key={index}
                    className={`hk-emoji-item ${
                      spinningEmojis[index] ? 'spinning' : ''
                    }`}
                    onClick={() => handleEmojiClick(index)}
                  >
                    {emoji}
                  </span>
                ))}
              </div>
              <p className="text-sm font-semibold text-gray-600">5 ridiculous cats to wrangle</p>
            </div>
            
            <div className="hk-game-stats">
              <div className="hk-stat">
                <div className="hk-stat-icon">⏱</div>
                <div className="hk-stat-text">60s panic</div>
              </div>
              <div className="hk-stat">
                <div className="hk-stat-icon">🐾</div>
                <div className="hk-stat-text">+1000 points</div>
              </div>
              <div className="hk-stat">
                <div className="hk-stat-icon">🔥</div>
                <div className="hk-stat-text">Combos = Catnado</div>
              </div>
            </div>

            {userState.bestScore && (
              <div className="hk-best-score">
                <div className="hk-best-score-label">Your Best Score</div>
                <div className="hk-best-score-value">{userState.bestScore.score.toLocaleString()}</div>
              </div>
            )}
            
            <button
              onClick={startGame}
              className="hk-start-button"
            >
              ▶️ LET'S GOOO!
            </button>
          </div>
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

    const isNewBest = userState.bestScore ? gameState.score > userState.bestScore.score : true;
    
    return (
      <div className="hk-app-container">
        <div className="hk-welcome-screen">
          <div className="hk-welcome-content">
            <h2 className="text-4xl font-black text-black mb-6">🎉 GAME OVER!</h2>
            
            {isNewBest && (
              <div className="bg-black bg-opacity-10 rounded-2xl p-4 mb-6">
                <div className="text-3xl">🏆</div>
                <div className="text-lg font-bold text-black">NEW BEST SCORE!</div>
              </div>
            )}
            
            <div className="text-6xl font-black text-black mb-4">{gameState.score.toLocaleString()}</div>
            <p className="text-black text-xl font-bold mb-6">Final Score</p>
            
            <div className="bg-black bg-opacity-10 rounded-2xl p-4 mb-6 space-y-2">
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
            
            <div className="space-y-3">
              <button
                onClick={startGame}
                className="hk-start-button"
              >
                😺 PLAY AGAIN
              </button>
              
              <button
                onClick={() => setGameState(prev => ({ ...prev, currentTab: 'leaderboard' }))}
                className="w-full bg-transparent border-2 border-black text-black font-bold py-4 px-6 rounded-2xl"
              >
                📊 LEADERBOARD
              </button>
            </div>
          </div>
        </div>
        <BottomNavBar />
      </div>
    );
  }

  return (
    <div className="hk-app-container">
      {animations.map((animation) => (
        <ExplosionAnimation key={animation.id} animation={animation} />
      ))}

      {dragState.isDragging && dragState.draggedCat && (
        <div
          className="hk-dragged-cat"
          style={{
            left: dragState.dragPosition.x,
            top: dragState.dragPosition.y,
          }}
        >
          {dragState.draggedCat.emoji}
        </div>
      )}

      <div className="hk-game-screen">
        <div className="hk-game-header">
          <h1 className="hk-tagline">{taglines[currentTagline]}</h1>
        </div>

        <div className="hk-score-bar">
          <div className={`hk-timer ${gameState.timeLeft <= 10 ? 'urgent' : ''}`}>
            <span>⏱</span>
            <span>{gameState.timeLeft}s</span>
          </div>
          <div className="hk-score">
            <span>🐾</span>
            <span>{gameState.score.toLocaleString()}</span>
          </div>
        </div>

        <div className="hk-next-section">
          <div className="hk-next-content">
            <span>NEXT:</span>
            <div className="hk-next-cat">
              <span>{gameState.nextCat}</span>
            </div>
          </div>
        </div>

        <div className="hk-game-board">
          <div className="hk-columns-container" ref={boardRef}>
            <GameColumn columnId="left" cats={gameState.columns.left} />
            <GameColumn columnId="center" cats={gameState.columns.center} />
            <GameColumn columnId="right" cats={gameState.columns.right} />
          </div>
        </div>

        <div className="hk-game-controls">
          <div className="hk-drop-buttons">
            {['left', 'center', 'right'].map((column) => {
              const isFull = gameState.columns[column].length >= 6;
              const isEnabled = gameState.isActive && !dragState.isDragging && !isFull;
              
              return (
                <button
                  key={column}
                  onClick={() => dropNewCat(column)}
                  disabled={!isEnabled}
                  className={`hk-drop-button ${
                    isEnabled ? 'enabled' : 'disabled'
                  }`}
                >
                  <span>🔽</span>
                  <span>{isFull ? 'FULL' : 'Drop'}</span>
                </button>
              );
            })}
          </div>
          
          <p className="hk-tip">
            💡 Drag cats between columns or use drop buttons!
          </p>
        </div>
      </div>

      <BottomNavBar />
    </div>
  );
}

export default App;import React, { useState, useEffect, useRef, useCallback } from 'react';

const CAT_EMOJIS = ['😺', '😻', '😼', '🐈', '🐈‍⬛'];
const INITIAL_TIME = 60;
const MATCH_SCORE = 1000;
const COMBO_BONUS = 500;

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
  const [loadingProgress, setLoadingProgress] = useState(0);
  
  const taglines = [
    "😼 Chaos Mode Activated",
    "🐾 Don't Blink, Human", 
    "🔥 Catnado Incoming"
  ];
  
  const gameTimerRef = useRef(null);
  const boardRef = useRef(null);

  const triggerHaptic = useCallback((type = 'light') => {
    if (window.Telegram?.WebApp?.HapticFeedback) {
      const tg = window.Telegram.WebApp;
      if (type === 'light') {
        tg.HapticFeedback.impactOccurred('light');
      } else if (type === 'medium') {
        tg.HapticFeedback.impactOccurred('medium');
      } else if (type === 'heavy') {
        tg.HapticFeedback.impactOccurred('heavy');
      } else if (type === 'success') {
        tg.HapticFeedback.notificationOccurred('success');
      } else if (type === 'error') {
        tg.HapticFeedback.notificationOccurred('error');
      }
    } else if (navigator.vibrate) {
      const patterns = {
        light: [10],
        medium: [20],
        heavy: [50],
        success: [10, 50, 10],
        error: [50, 100, 50]
      };
      navigator.vibrate(patterns[type] || patterns.light);
    }
  }, []);

  useEffect(() => {
    const initializeTelegramWebApp = () => {
      if (window.Telegram?.WebApp) {
        const tg = window.Telegram.WebApp;
        tg.ready();
        tg.expand();
        
        const user = tg.initDataUnsafe?.user;
        if (user) {
          setUserState(prev => ({ ...prev, telegramUser: user }));
          initializeUser(user);
        } else {
          const testUser = {
            id: Date.now(),
            username: 'testuser',
            first_name: 'Test',
            last_name: 'User'
          };
          setUserState(prev => ({ ...prev, telegramUser: testUser }));
          initializeUser(testUser);
        }
      } else {
        const testUser = {
          id: Date.now(),
          username: 'testuser',
          first_name: 'Test',
          last_name: 'User'
        };
        setUserState(prev => ({ ...prev, telegramUser: testUser }));
        initializeUser(testUser);
      }
    };

    initializeTelegramWebApp();
  }, []);

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

  const loadLeaderboard = async () => {
    const result = await apiCall('/leaderboard?limit=50');
    if (result.success) {
      setLeaderboard(result.leaderboard);
    }
  };

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
      triggerHaptic('success');
      loadUserData(userState.telegramUser.id);
    }
  };

  useEffect(() => {
    if (gameState.isActive && gameState.timeLeft > 0) {
      gameTimerRef.current = setTimeout(() => {
        setGameState(prev => ({ ...prev, timeLeft: prev.timeLeft - 1 }));
        
        if (gameState.timeLeft <= 10) {
          triggerHaptic('light');
        }
      }, 1000);
    } else if (gameState.timeLeft === 0 && gameState.isActive) {
      endGame();
    }
    return () => {
      if (gameTimerRef.current) {
        clearTimeout(gameTimerRef.current);
      }
    };
  }, [gameState.timeLeft, gameState.isActive, triggerHaptic]);

  useEffect(() => {
    if (gameState.isActive) {
      const taglineTimer = setInterval(() => {
        setCurrentTagline(prev => (prev + 1) % taglines.length);
      }, 2000);
      return () => clearInterval(taglineTimer);
    }
  }, [gameState.isActive]);

  useEffect(() => {
    if (gameState.currentTab === 'leaderboard') {
      loadLeaderboard();
    }
  }, [gameState.currentTab]);

  useEffect(() => {
    if (!gameState.gameStarted && gameState.currentTab === 'play') {
      setIsLayoutReady(false);
      setLoadingProgress(0);

      let progress = 0;
      const progressInterval = setInterval(() => {
        progress += 4;
        setLoadingProgress(progress);
      }, 80);

      setTimeout(() => {
        setIsLayoutReady(true);
        clearInterval(progressInterval);
      }, 2500);

      return () => {
        clearInterval(progressInterval);
      };
    }
  }, [gameState.gameStarted, gameState.currentTab]);

  useEffect(() => {
    if (!gameState.gameStarted && gameState.currentTab === 'play' && isLayoutReady) {
      setTimeout(() => {
        const emojiIndices = [0, 1, 2, 3, 4];
        emojiIndices.forEach((index, i) => {
          setTimeout(() => {
            setSpinningEmojis(prev => ({
              ...prev,
              [index]: true
            }));
            
            triggerHaptic('light');
            
            setTimeout(() => {
              setSpinningEmojis(prev => ({
                ...prev,
                [index]: false
              }));
            }, 1000);
          }, i * 150);
        });
      }, 800);
    }
  }, [gameState.gameStarted, gameState.currentTab, isLayoutReady, triggerHaptic]);

  const handleEmojiClick = (emojiIndex) => {
    setSpinningEmojis(prev => ({
      ...prev,
      [emojiIndex]: true
    }));
    
    triggerHaptic('light');
    
    setTimeout
