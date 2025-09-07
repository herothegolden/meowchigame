import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { User, Star, Flame, Award, Calendar, Package, Zap, LoaderCircle, ChevronsUp, Badge, Trophy, Crown, TrendingUp, Users, Medal, Target, Sparkles } from 'lucide-react';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL;

// --- Enhanced Helper Components ---

const StatCard = ({ icon, label, value, color, trend, trendValue }) => (
  <motion.div 
    className="bg-nav p-4 rounded-lg flex items-center border border-gray-700 relative overflow-hidden"
    whileHover={{ scale: 1.02 }}
    transition={{ duration: 0.2 }}
  >
    <div className={`mr-4 text-${color}`}>{icon}</div>
    <div className="flex-1">
      <p className="text-sm text-secondary">{label}</p>
      <p className="text-lg font-bold text-primary">{value}</p>
      {trend && (
        <div className={`flex items-center text-xs mt-1 ${trend === 'up' ? 'text-green-400' : trend === 'down' ? 'text-red-400' : 'text-gray-400'}`}>
          {trend === 'up' && <TrendingUp className="w-3 h-3 mr-1" />}
          {trend === 'down' && <TrendingUp className="w-3 h-3 mr-1 rotate-180" />}
          <span>{trendValue}</span>
        </div>
      )}
    </div>
  </motion.div>
);

const EnhancedBadgeCard = ({ badgeName, isOwned, rarity, unlockedAt, progress }) => {
  const badgeConfig = {
    'Cookie Master Badge': { 
      icon: '🍪', 
      title: 'Cookie Master', 
      description: 'Master of the cookies',
      color: 'text-yellow-400',
      rarity: 'rare',
      requirement: 'Score 5,000+ points in a single game'
    },
    'Speed Demon Badge': { 
      icon: '⚡', 
      title: 'Speed Demon', 
      description: 'Lightning fast reflexes',
      color: 'text-blue-400',
      rarity: 'epic',
      requirement: 'Complete a game in under 20 seconds'
    },
    'Champion Badge': { 
      icon: '🏆', 
      title: 'Champion', 
      description: 'Ultimate game champion',
      color: 'text-purple-400',
      rarity: 'legendary',
      requirement: 'Reach top 10 on global leaderboard'
    },
    'Streak Master': {
      icon: '🔥',
      title: 'Streak Master',
      description: 'Consistency is key',
      color: 'text-orange-400',
      rarity: 'rare',
      requirement: 'Maintain 10-day login streak'
    },
    'Bomb Expert': {
      icon: '💣',
      title: 'Bomb Expert',
      description: 'Explosive gameplay',
      color: 'text-red-400',
      rarity: 'uncommon',
      requirement: 'Use 50 cookie bombs'
    }
  };

  const badge = badgeConfig[badgeName] || {
    icon: '🏅',
    title: badgeName,
    description: 'Special achievement',
    color: 'text-gray-400',
    rarity: 'common',
    requirement: 'Complete special challenge'
  };

  const rarityColors = {
    common: 'border-gray-500',
    uncommon: 'border-green-500',
    rare: 'border-blue-500',
    epic: 'border-purple-500',
    legendary: 'border-yellow-500'
  };

  return (
    <motion.div
      className={`p-4 rounded-lg border-2 transition-all duration-200 relative overflow-hidden ${
        isOwned 
          ? `bg-nav ${rarityColors[badge.rarity]} shadow-lg` 
          : 'bg-gray-800 border-gray-600 opacity-50'
      }`}
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3 }}
      whileHover={{ scale: isOwned ? 1.05 : 1, y: isOwned ? -2 : 0 }}
    >
      {/* Rarity glow effect */}
      {isOwned && badge.rarity !== 'common' && (
        <div className={`absolute inset-0 bg-gradient-to-r opacity-10 ${
          badge.rarity === 'legendary' ? 'from-yellow-400 to-orange-400' :
          badge.rarity === 'epic' ? 'from-purple-400 to-pink-400' :
          badge.rarity === 'rare' ? 'from-blue-400 to-cyan-400' :
          'from-green-400 to-emerald-400'
        }`} />
      )}
      
      <div className="text-center relative z-10">
        <div className="text-3xl mb-2">{badge.icon}</div>
        <h3 className={`font-bold ${isOwned ? badge.color : 'text-gray-500'}`}>
          {badge.title}
        </h3>
        <p className="text-xs text-secondary mt-1">{badge.description}</p>
        
        {/* Rarity indicator */}
        <div className="flex items-center justify-center mt-2">
          <span className={`text-xs px-2 py-1 rounded uppercase font-bold ${
            badge.rarity === 'legendary' ? 'bg-yellow-500/20 text-yellow-400' :
            badge.rarity === 'epic' ? 'bg-purple-500/20 text-purple-400' :
            badge.rarity === 'rare' ? 'bg-blue-500/20 text-blue-400' :
            badge.rarity === 'uncommon' ? 'bg-green-500/20 text-green-400' :
            'bg-gray-500/20 text-gray-400'
          }`}>
            {badge.rarity}
          </span>
        </div>
        
        {isOwned ? (
          <div className="flex items-center justify-center mt-2 text-accent">
            <Award className="w-4 h-4 mr-1" />
            <span className="text-xs font-bold">UNLOCKED</span>
            {unlockedAt && (
              <span className="text-xs text-secondary ml-1">
                {new Date(unlockedAt).toLocaleDateString()}
              </span>
            )}
          </div>
        ) : (
          <div className="mt-2">
            <p className="text-xs text-secondary">{badge.requirement}</p>
            {progress && (
              <div className="mt-2">
                <div className="bg-gray-600 rounded-full h-2">
                  <div 
                    className="bg-accent rounded-full h-2 transition-all duration-300"
                    style={{ width: `${Math.min(progress, 100)}%` }}
                  />
                </div>
                <p className="text-xs text-accent mt-1">{progress}% complete</p>
              </div>
            )}
          </div>
        )}
      </div>
    </motion.div>
  );
};

const LeaderboardCard = ({ rank, player, score, isCurrentUser, badge }) => (
  <motion.div
    className={`flex items-center justify-between p-4 rounded-lg border transition-all duration-200 ${
      isCurrentUser 
        ? 'bg-accent/20 border-accent' 
        : 'bg-nav border-gray-700 hover:border-gray-600'
    }`}
    initial={{ opacity: 0, x: -20 }}
    animate={{ opacity: 1, x: 0 }}
    transition={{ duration: 0.3, delay: rank * 0.05 }}
    whileHover={{ scale: 1.02 }}
  >
    <div className="flex items-center space-x-4">
      {/* Rank with special styling for top 3 */}
      <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold ${
        rank === 1 ? 'bg-yellow-500 text-black' :
        rank === 2 ? 'bg-gray-400 text-black' :
        rank === 3 ? 'bg-amber-600 text-black' :
        'bg-gray-600 text-white'
      }`}>
        {rank <= 3 ? (
          <Crown className="w-4 h-4" />
        ) : (
          rank
        )}
      </div>
      
      {/* Player info */}
      <div>
        <p className={`font-medium ${isCurrentUser ? 'text-accent' : 'text-primary'}`}>
          {player.name}
          {isCurrentUser && <span className="text-xs ml-2">(You)</span>}
        </p>
        <div className="flex items-center space-x-2 text-xs text-secondary">
          <span>Level {player.level}</span>
          {badge && (
            <span className="bg-accent/20 text-accent px-2 py-0.5 rounded">
              {badge}
            </span>
          )}
        </div>
      </div>
    </div>
    
    {/* Score */}
    <div className="text-right">
      <p className="font-bold text-accent">{score.toLocaleString()}</p>
      <p className="text-xs text-secondary">points</p>
    </div>
  </motion.div>
);

const InventoryItemCard = ({ item, quantity, onActivate, disabled }) => {
  const [isActivating, setIsActivating] = useState(false);

  const handleActivate = async () => {
    setIsActivating(true);
    await onActivate(item.id);
    setIsActivating(false);
  };

  const getItemIcon = (itemId) => {
    switch(itemId) {
      case 4: return <ChevronsUp size={28} />;
      default: return <Star size={28} />;
    }
  };

  return (
    <div className="bg-nav p-4 rounded-lg flex items-center justify-between border border-gray-700">
      <div className="flex items-center">
        <div className="mr-4 text-accent">{getItemIcon(item.id)}</div>
        <div>
          <p className="font-bold text-primary">{item.name}</p>
          <p className="text-sm text-secondary">{item.description}</p>
          <p className="text-xs text-accent mt-1">Quantity: {quantity}</p>
        </div>
      </div>
      <button 
        onClick={handleActivate}
        disabled={disabled || isActivating}
        className={`font-bold py-2 px-4 rounded-lg flex items-center transition-all duration-200 ${
          disabled 
            ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
            : 'bg-accent text-background hover:scale-105'
        }`}
      >
        {isActivating ? <LoaderCircle className="w-5 h-5 animate-spin" /> : 'Activate'}
      </button>
    </div>
  );
};

// --- Main Profile Page Component ---

const ProfilePage = () => {
  const [profileData, setProfileData] = useState({ 
    stats: null, 
    inventory: [], 
    allItems: [], 
    boosterActive: false,
    ownedBadges: []
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isConnected, setIsConnected] = useState(false);
  const [currentView, setCurrentView] = useState('overview'); // 'overview', 'badges', 'leaderboard', 'inventory'
  
  // PHASE 3: Leaderboard state
  const [leaderboardData, setLeaderboardData] = useState([]);
  const [leaderboardType, setLeaderboardType] = useState('global'); // 'global', 'weekly', 'friends'
  const [loadingLeaderboard, setLoadingLeaderboard] = useState(false);
  
  // PHASE 3: Enhanced badge state
  const [badgeProgress, setBadgeProgress] = useState({});
  const [badgeStats, setBadgeStats] = useState({});
  
  const tg = window.Telegram?.WebApp;

  // Mock data for demo mode
  const MOCK_STATS = {
    first_name: 'Demo User',
    username: 'demouser',
    points: 4735,
    level: 1,
    daily_streak: 1,
    created_at: new Date().toISOString(),
    gamesPlayed: 42,
    highScore: 3250,
    averageScore: 1875,
    totalPlayTime: '12h 34m'
  };

  const MOCK_LEADERBOARD = [
    { rank: 1, player: { name: 'CookieMaster', level: 15 }, score: 8750, badge: 'Legend' },
    { rank: 2, player: { name: 'SpeedRunner', level: 12 }, score: 7230, badge: 'Epic' },
    { rank: 3, player: { name: 'MatchMaker', level: 10 }, score: 6890, badge: 'Rare' },
    { rank: 4, player: { name: 'Demo User', level: 1 }, score: 4735, badge: null, isCurrentUser: true },
    { rank: 5, player: { name: 'Puzzle Pro', level: 8 }, score: 4120, badge: 'Rare' }
  ];

  const MOCK_ITEMS = [
    { id: 4, name: 'Double Points', description: '2x points for your next game', category: 'multiplier' }
  ];

  const fetchProfileData = useCallback(async () => {
    try {
      if (!tg?.initData || !BACKEND_URL) {
        console.log('Demo mode: Using mock profile data');
        setProfileData({
          stats: MOCK_STATS,
          inventory: [],
          allItems: MOCK_ITEMS,
          boosterActive: false,
          ownedBadges: ['Cookie Master Badge']
        });
        setBadgeProgress({
          'Speed Demon Badge': 75,
          'Champion Badge': 25,
          'Streak Master': 60
        });
        setBadgeStats({
          totalBadges: 5,
          unlockedBadges: 1,
          rarityBreakdown: { common: 0, uncommon: 1, rare: 0, epic: 0, legendary: 0 }
        });
        setIsConnected(false);
        setLoading(false);
        return;
      }

      console.log('Fetching enhanced profile data...');

      // Fetch profile, badges, and leaderboard data in parallel
      const [statsRes, shopDataRes, badgeProgressRes] = await Promise.all([
        fetch(`${BACKEND_URL}/api/user-stats`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ initData: tg.initData }),
        }),
        fetch(`${BACKEND_URL}/api/get-shop-data`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ initData: tg.initData }),
        }),
        fetch(`${BACKEND_URL}/api/get-badge-progress`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ initData: tg.initData }),
        }).catch(() => ({ ok: false })) // Optional endpoint
      ]);

      if (!statsRes.ok || !shopDataRes.ok) {
        throw new Error('Failed to fetch profile data.');
      }

      const stats = await statsRes.json();
      const shopData = await shopDataRes.json();
      
      // Enhanced stats with additional metrics
      const enhancedStats = {
        ...stats,
        gamesPlayed: stats.gamesPlayed || Math.floor(stats.points / 500),
        highScore: stats.highScore || Math.floor(stats.points * 0.6),
        averageScore: stats.averageScore || Math.floor(stats.points / (stats.gamesPlayed || 1)),
        totalPlayTime: stats.totalPlayTime || `${Math.floor((stats.gamesPlayed || 1) * 1.5)}h ${((stats.gamesPlayed || 1) * 30) % 60}m`
      };
      
      console.log('Enhanced profile data loaded:', { enhancedStats, shopData });
      
      setProfileData({
        stats: enhancedStats,
        inventory: shopData.inventory,
        allItems: shopData.items,
        boosterActive: shopData.boosterActive,
        ownedBadges: shopData.ownedBadges || []
      });

      // Process badge progress if available
      if (badgeProgressRes.ok) {
        const badgeProgressData = await badgeProgressRes.json();
        setBadgeProgress(badgeProgressData.progress || {});
        setBadgeStats(badgeProgressData.stats || {});
      }
      
      setIsConnected(true);

    } catch (err) {
      console.error('Profile fetch error:', err);
      setError(err.message);
      
      // Fallback to demo data
      setProfileData({
        stats: MOCK_STATS,
        inventory: [],
        allItems: MOCK_ITEMS,
        boosterActive: false,
        ownedBadges: ['Cookie Master Badge']
      });
      setIsConnected(false);
    } finally {
      setLoading(false);
    }
  }, [tg]);

  // PHASE 3: Fetch leaderboard data
  const fetchLeaderboard = useCallback(async (type = 'global') => {
    setLoadingLeaderboard(true);
    
    try {
      if (!tg?.initData || !BACKEND_URL) {
        console.log('Demo mode: Using mock leaderboard');
        setLeaderboardData(MOCK_LEADERBOARD);
        setLoadingLeaderboard(false);
        return;
      }

      console.log(`Fetching ${type} leaderboard...`);
      
      const res = await fetch(`${BACKEND_URL}/api/get-leaderboard`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ initData: tg.initData, type }),
      });

      if (res.ok) {
        const data = await res.json();
        console.log('Leaderboard loaded:', data);
        setLeaderboardData(data.leaderboard || []);
      } else {
        throw new Error('Failed to fetch leaderboard');
      }

    } catch (error) {
      console.error('Leaderboard fetch error:', error);
      setLeaderboardData(MOCK_LEADERBOARD);
    } finally {
      setLoadingLeaderboard(false);
    }
  }, [tg]);

  useEffect(() => {
    fetchProfileData();
  }, [fetchProfileData]);

  useEffect(() => {
    if (currentView === 'leaderboard') {
      fetchLeaderboard(leaderboardType);
    }
  }, [currentView, leaderboardType, fetchLeaderboard]);

  const handleActivateItem = async (itemId) => {
    try {
      if (!isConnected || !tg?.initData || !BACKEND_URL) {
        const message = 'Demo: Double Points activated!\n\n⚠️ This is demo mode only.';
        if (tg && tg.showPopup) {
          tg.showPopup({ 
            title: 'Demo Activation', 
            message: message, 
            buttons: [{ type: 'ok' }] 
          });
        } else {
          alert(message);
        }
        return;
      }

      console.log('Activating item:', itemId);
      
      const res = await fetch(`${BACKEND_URL}/api/activate-item`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ initData: tg.initData, itemId }),
      });

      const result = await res.json();
      if (!res.ok) throw new Error(result.error || 'Activation failed.');

      console.log('Item activated successfully:', result);

      tg.HapticFeedback?.notificationOccurred('success');
      tg.showPopup({ 
        title: 'Success!', 
        message: result.message, 
        buttons: [{ type: 'ok' }] 
      });

      fetchProfileData();

    } catch (err) {
      console.error('Activation error:', err);
      tg?.HapticFeedback?.notificationOccurred('error');
      tg?.showPopup({ 
        title: 'Error', 
        message: err.message, 
        buttons: [{ type: 'ok' }] 
      });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <LoaderCircle className="w-12 h-12 text-accent animate-spin" />
      </div>
    );
  }

  if (error && !profileData.stats) {
    return (
      <div className="p-4 text-center text-red-400">
        <p>Could not load profile.</p>
        <p className="text-sm text-secondary">{error}</p>
        <button 
          onClick={fetchProfileData}
          className="mt-4 bg-accent text-background py-2 px-4 rounded-lg font-bold"
        >
          Retry
        </button>
      </div>
    );
  }
  
  const { stats, inventory, allItems, boosterActive, ownedBadges } = profileData;
  
  // Get activatable items (Double Points only)
  const activatableItems = allItems.filter(item => 
    item.id === 4 && 
    inventory.some(inv => inv.item_id === item.id && inv.quantity > 0)
  );

  // All possible badges with enhanced data
  const allBadges = [
    'Cookie Master Badge',
    'Speed Demon Badge', 
    'Champion Badge',
    'Streak Master',
    'Bomb Expert'
  ];

  return (
    <div className="p-4 space-y-6 bg-background text-primary">
      {/* Connection status */}
      <div className={`text-xs text-center p-2 rounded ${isConnected ? 'text-green-400' : 'text-yellow-400'}`}>
        {isConnected ? 'Connected to server' : 'Demo mode - data won\'t persist'}
      </div>

      {/* --- User Header --- */}
      <motion.div 
        className="flex flex-col items-center text-center space-y-2" 
        initial={{ opacity: 0, y: -20 }} 
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="w-24 h-24 bg-nav rounded-full flex items-center justify-center border border-gray-700 relative">
          <User className="w-12 h-12 text-secondary" />
          {ownedBadges.length > 0 && (
            <div className="absolute -top-2 -right-2 bg-accent text-background rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold">
              {ownedBadges.length}
            </div>
          )}
        </div>
        <div>
          <h1 className="text-3xl font-bold text-primary">{stats.first_name}</h1>
          <p className="text-secondary">@{stats.username || 'user'} • Level {stats.level}</p>
          <div className="flex items-center justify-center space-x-2 mt-2">
            <Star className="w-4 h-4 text-accent" />
            <span className="text-accent font-bold">{stats.points.toLocaleString()} points</span>
          </div>
        </div>
      </motion.div>

      {/* --- Navigation Tabs --- */}
      <div className="flex space-x-1 bg-nav rounded-lg p-1 border border-gray-700">
        {[
          { id: 'overview', label: 'Overview', icon: User },
          { id: 'badges', label: 'Badges', icon: Award },
          { id: 'leaderboard', label: 'Leaderboard', icon: Trophy },
          { id: 'inventory', label: 'Inventory', icon: Package }
        ].map((tab) => {
          const TabIcon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setCurrentView(tab.id)}
              className={`flex-1 flex items-center justify-center space-x-2 py-3 px-2 rounded-lg font-medium transition-all duration-200 ${
                currentView === tab.id
                  ? 'bg-accent text-background'
                  : 'text-secondary hover:text-primary'
              }`}
            >
              <TabIcon className="w-4 h-4" />
              <span className="text-sm">{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* --- Content Area --- */}
      <AnimatePresence mode="wait">
        {currentView === 'overview' && (
          <motion.div
            key="overview"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
            className="space-y-6"
          >
            {/* Enhanced Stats Grid */}
            <div className="grid grid-cols-2 gap-4">
              <StatCard 
                icon={<Star size={24} />} 
                label="Total Points" 
                value={stats.points.toLocaleString()} 
                color="accent"
                trend="up"
                trendValue="+15% this week"
              />
              <StatCard 
                icon={<Flame size={24} />} 
                label="Daily Streak" 
                value={`${stats.daily_streak} Days`} 
                color="accent"
                trend="up"
                trendValue="Personal best!"
              />
              <StatCard 
                icon={<Trophy size={24} />} 
                label="High Score" 
                value={stats.highScore?.toLocaleString() || 'N/A'} 
                color="primary"
                trend="up"
                trendValue="New record!"
              />
              <StatCard 
                icon={<Target size={24} />} 
                label="Games Played" 
                value={stats.gamesPlayed || 0} 
                color="primary"
                trend="up"
                trendValue="+5 this week"
              />
              <StatCard 
                icon={<TrendingUp size={24} />} 
                label="Average Score" 
                value={stats.averageScore?.toLocaleString() || 'N/A'} 
                color="secondary"
              />
              <StatCard 
                icon={<Calendar size={24} />} 
                label="Play Time" 
                value={stats.totalPlayTime || '0h 0m'} 
                color="secondary"
              />
            </div>

            {/* Quick Badge Preview */}
            <div className="bg-nav p-4 rounded-lg border border-gray-700">
              <h3 className="font-bold text-primary mb-3 flex items-center">
                <Sparkles className="w-5 h-5 mr-2 text-accent" />
                Recent Achievements
              </h3>
              <div className="grid grid-cols-3 gap-3">
                {allBadges.slice(0, 3).map(badgeName => (
                  <EnhancedBadgeCard
                    key={badgeName}
                    badgeName={badgeName}
                    isOwned={ownedBadges.includes(badgeName)}
                    progress={badgeProgress[badgeName]}
                  />
                ))}
              </div>
            </div>
          </motion.div>
        )}

        {currentView === 'badges' && (
          <motion.div
            key="badges"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
            className="space-y-6"
          >
            {/* Badge Collection Header */}
            <div className="bg-nav p-4 rounded-lg border border-gray-700">
              <h2 className="text-xl font-bold mb-3 flex items-center">
                <Trophy className="w-6 h-6 mr-2 text-accent"/> 
                Badge Collection
              </h2>
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <p className="text-2xl font-bold text-accent">{ownedBadges.length}</p>
                  <p className="text-xs text-secondary">Unlocked</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-primary">{allBadges.length}</p>
                  <p className="text-xs text-secondary">Total</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-green-400">
                    {Math.round((ownedBadges.length / allBadges.length) * 100)}%
                  </p>
                  <p className="text-xs text-secondary">Complete</p>
                </div>
              </div>
            </div>
            
            {/* Badge Grid */}
            <div className="grid grid-cols-2 gap-4">
              {allBadges.map(badgeName => (
                <EnhancedBadgeCard
                  key={badgeName}
                  badgeName={badgeName}
                  isOwned={ownedBadges.includes(badgeName)}
                  progress={badgeProgress[badgeName]}
                  unlockedAt={ownedBadges.includes(badgeName) ? new Date().toISOString() : null}
                />
              ))}
            </div>
          </motion.div>
        )}

        {currentView === 'leaderboard' && (
          <motion.div
            key="leaderboard"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
            className="space-y-6"
          >
            {/* Leaderboard Header */}
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold flex items-center">
                <Crown className="w-6 h-6 mr-2 text-accent" />
                Leaderboard
              </h2>
              <div className="flex space-x-2">
                {['global', 'weekly', 'friends'].map((type) => (
                  <button
                    key={type}
                    onClick={() => setLeaderboardType(type)}
                    className={`px-3 py-1 text-sm rounded font-medium transition-colors ${
                      leaderboardType === type
                        ? 'bg-accent text-background'
                        : 'bg-nav text-secondary hover:text-primary'
                    }`}
                  >
                    {type.charAt(0).toUpperCase() + type.slice(1)}
                  </button>
                ))}
              </div>
            </div>

            {/* Leaderboard List */}
            <div className="space-y-3">
              {loadingLeaderboard ? (
                <div className="flex items-center justify-center py-8">
                  <LoaderCircle className="w-8 h-8 text-accent animate-spin" />
                </div>
              ) : (
                leaderboardData.map((entry, index) => (
                  <LeaderboardCard
                    key={index}
                    rank={entry.rank}
                    player={entry.player}
                    score={entry.score}
                    isCurrentUser={entry.isCurrentUser}
                    badge={entry.badge}
                  />
                ))
              )}
            </div>

            {!loadingLeaderboard && leaderboardData.length === 0 && (
              <div className="text-center py-8 text-secondary">
                <Users className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>No leaderboard data available</p>
              </div>
            )}
          </motion.div>
        )}

        {currentView === 'inventory' && (
          <motion.div
            key="inventory"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
            className="space-y-6"
          >
            {/* My Boosters Section */}
            <div>
              <h2 className="text-xl font-bold mb-3 flex items-center">
                <Package className="w-6 h-6 mr-2 text-secondary"/> My Boosters
              </h2>
              <div className="space-y-3">
                {boosterActive && (
                  <div className="bg-green-800/50 border border-green-500 text-green-300 p-3 rounded-lg flex items-center">
                    <Zap className="w-5 h-5 mr-3"/>
                    <span>A Point Booster is active for your next game!</span>
                  </div>
                )}

                {activatableItems.length > 0 ? (
                  activatableItems.map(item => {
                    const inventoryItem = inventory.find(inv => inv.item_id === item.id);
                    const quantity = inventoryItem ? inventoryItem.quantity : 0;
                    
                    return (
                      <InventoryItemCard 
                        key={item.id} 
                        item={item} 
                        quantity={quantity}
                        onActivate={handleActivateItem} 
                        disabled={boosterActive} 
                      />
                    );
                  })
                ) : (
                  !boosterActive && (
                    <p className="text-center text-secondary text-sm py-4 bg-nav rounded-lg border border-gray-700">
                      You have no boosters. Visit the shop to buy some!
                    </p>
                  )
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default ProfilePage;
