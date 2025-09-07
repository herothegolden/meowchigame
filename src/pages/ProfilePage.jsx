// src/pages/ProfilePage.jsx - Complete with audio integration and TMA optimization
import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { User, Star, Flame, Award, Calendar, Package, Zap, LoaderCircle, ChevronsUp, Badge, Trophy, Crown, Medal, Users, Clock, Wifi, CheckCircle, X } from 'lucide-react';
import { useAudio } from '../hooks/useAudio';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL;

// --- Helper Components ---
const StatCard = ({ icon, label, value, color }) => (
  <div className="bg-nav p-4 rounded-lg flex items-center border border-gray-700">
    <div className={`mr-4 text-${color}`}>{icon}</div>
    <div>
      <p className="text-sm text-secondary">{label}</p>
      <p className="text-lg font-bold text-primary">{value}</p>
    </div>
  </div>
);

const BadgeCard = ({ badgeName, isOwned }) => {
  const badgeConfig = {
    'Cookie Master Badge': { 
      icon: '🍪', 
      title: 'Cookie Master', 
      description: 'Master of the cookies',
      color: 'text-yellow-400'
    },
    'Speed Demon Badge': { 
      icon: '⚡', 
      title: 'Speed Demon', 
      description: 'Lightning fast reflexes',
      color: 'text-blue-400'
    },
    'Champion Badge': { 
      icon: '🏆', 
      title: 'Champion', 
      description: 'Ultimate game champion',
      color: 'text-purple-400'
    }
  };

  const badge = badgeConfig[badgeName] || {
    icon: '🏅',
    title: badgeName,
    description: 'Special achievement',
    color: 'text-gray-400'
  };

  return (
    <motion.div
      className={`p-4 rounded-lg border-2 transition-all duration-200 ${
        isOwned 
          ? 'bg-nav border-accent shadow-accent/20' 
          : 'bg-gray-800 border-gray-600 opacity-50'
      }`}
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3 }}
      whileHover={{ scale: isOwned ? 1.05 : 1 }}
    >
      <div className="text-center">
        <div className="text-3xl mb-2">{badge.icon}</div>
        <h3 className={`font-bold ${isOwned ? badge.color : 'text-gray-500'}`}>
          {badge.title}
        </h3>
        <p className="text-xs text-secondary mt-1">{badge.description}</p>
        {isOwned && (
          <div className="flex items-center justify-center mt-2 text-accent">
            <Award className="w-4 h-4 mr-1" />
            <span className="text-xs font-bold">OWNED</span>
          </div>
        )}
      </div>
    </motion.div>
  );
};

// --- Main Profile Page Component ---
const ProfilePage = () => {
  const [profileData, setProfileData] = useState({ 
    stats: null, 
    inventory: [], 
    shop_items: [], 
    boosterActive: false,
    owned_badges: []
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isConnected, setIsConnected] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');
  
  // LAZY LOADED: Leaderboard state
  const [leaderboardData, setLeaderboardData] = useState([]);
  const [leaderboardLoading, setLeaderboardLoading] = useState(false);
  const [leaderboardLoaded, setLeaderboardLoaded] = useState(false);
  const [leaderboardTab, setLeaderboardTab] = useState('global');
  
  // Friends system state
  const [friendUsername, setFriendUsername] = useState('');
  const [isAddingFriend, setIsAddingFriend] = useState(false);
  
  const tg = window.Telegram?.WebApp;

  // AUDIO INTEGRATION
  const { playButtonClick, playItemActivate } = useAudio();

  // Mock data for demo mode
  const MOCK_PROFILE = {
    stats: {
      first_name: 'Demo User',
      username: 'demouser',
      points: 4735,
      level: 1,
      daily_streak: 1,
      created_at: new Date().toISOString(),
      games_played: 4,
      high_score: 1455,
      total_play_time: 0,
      averageScore: 1183,
      totalPlayTime: '0h 0m'
    },
    inventory: [],
    shop_items: [
      { id: 4, name: 'Double Points', description: '2x points for your next game', category: 'multiplier' }
    ],
    boosterActive: false,
    owned_badges: []
  };

  const MOCK_LEADERBOARD = [
    { rank: 1, player: { name: 'Alex', level: 3 }, score: 12450, isCurrentUser: true, badge: 'Legend' },
    { rank: 2, player: { name: 'Maria', level: 4 }, score: 11200, isCurrentUser: false, badge: 'Epic' },
    { rank: 3, player: { name: 'John', level: 2 }, score: 9800, isCurrentUser: false, badge: 'Epic' },
    { rank: 4, player: { name: 'Sarah', level: 3 }, score: 8500, isCurrentUser: false, badge: 'Rare' },
    { rank: 5, player: { name: 'Mike', level: 2 }, score: 7200, isCurrentUser: false, badge: 'Rare' }
  ];

  // SINGLE OPTIMIZED API CALL
  const fetchProfileData = useCallback(async () => {
    try {
      if (!tg?.initData || !BACKEND_URL) {
        console.log('Demo mode: Using mock profile data');
        setProfileData(MOCK_PROFILE);
        setIsConnected(false);
        setLoading(false);
        return;
      }

      console.log('🚀 Fetching profile data...');

      // Try new optimized endpoint first
      let profileRes;
      try {
        profileRes = await fetch(`${BACKEND_URL}/api/profile-complete`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ initData: tg.initData }),
          signal: AbortSignal.timeout(8000)
        });
      } catch (error) {
        // Fallback to parallel calls only if new endpoint doesn't exist
        console.log('Using fallback profile loading...');
        const [statsRes, shopDataRes] = await Promise.all([
          fetch(`${BACKEND_URL}/api/user-stats`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ initData: tg.initData }),
            signal: AbortSignal.timeout(5000)
          }),
          fetch(`${BACKEND_URL}/api/get-shop-data`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ initData: tg.initData }),
            signal: AbortSignal.timeout(5000)
          })
        ]);

        if (!statsRes.ok || !shopDataRes.ok) {
          throw new Error('Failed to fetch profile data');
        }

        const [statsData, shopData] = await Promise.all([
          statsRes.json(),
          shopDataRes.json()
        ]);

        setProfileData({
          stats: statsData,
          inventory: shopData.inventory || [],
          shop_items: shopData.items || [],
          boosterActive: shopData.boosterActive || false,
          owned_badges: shopData.ownedBadges || []
        });
        
        setIsConnected(true);
        setLoading(false);
        return;
      }

      if (!profileRes.ok) {
        throw new Error(`HTTP ${profileRes.status}`);
      }

      const completeProfile = await profileRes.json();
      console.log('✅ Profile loaded');
      
      setProfileData(completeProfile);
      setIsConnected(true);

      // Success haptic feedback
      tg.HapticFeedback?.notificationOccurred('success');

    } catch (err) {
      console.warn('Profile fetch failed, using demo mode:', err.message);
      setError(err.message);
      
      // Fallback to demo data
      setProfileData(MOCK_PROFILE);
      setIsConnected(false);
      
      // Error haptic feedback
      tg?.HapticFeedback?.notificationOccurred('error');
    } finally {
      setLoading(false);
    }
  }, [tg]);

  // LAZY LOADED: Leaderboard fetch (only when needed)
  const fetchLeaderboard = async (type = 'global') => {
    if (leaderboardLoading) return;
    
    setLeaderboardLoading(true);
    
    try {
      if (!tg?.initData || !BACKEND_URL) {
        setLeaderboardData(MOCK_LEADERBOARD);
        setLeaderboardLoaded(true);
        return;
      }

      console.log(`🚀 Fetching ${type} leaderboard...`);
      
      const res = await fetch(`${BACKEND_URL}/api/get-leaderboard`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ initData: tg.initData, type }),
        signal: AbortSignal.timeout(5000)
      });

      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      
      const data = await res.json();
      setLeaderboardData(data.leaderboard || []);
      setLeaderboardLoaded(true);
      
    } catch (err) {
      console.warn('Leaderboard error:', err);
      setLeaderboardData(MOCK_LEADERBOARD);
      setLeaderboardLoaded(true);
    } finally {
      setLeaderboardLoading(false);
    }
  };

  // AUDIO-ENHANCED: Friend add with minimal state updates
  const handleAddFriend = async () => {
    if (!friendUsername.trim()) {
      // AUDIO: Error sound for invalid input
      playButtonClick();
      const message = 'Please enter a username';
      tg?.showPopup?.({ title: 'Error', message, buttons: [{ type: 'ok' }] }) || alert(message);
      return;
    }

    // AUDIO: Button click for friend add attempt
    playButtonClick();
    
    setIsAddingFriend(true);

    try {
      if (!isConnected || !tg?.initData || !BACKEND_URL) {
        // AUDIO: Success sound for demo mode
        setTimeout(() => playItemActivate(), 100);
        
        const message = `Demo: Added @${friendUsername} as friend!\n\n⚠️ This is demo mode only.`;
        tg?.showPopup?.({ title: 'Demo Mode', message, buttons: [{ type: 'ok' }] }) || alert(message);
        setFriendUsername('');
        return;
      }

      const res = await fetch(`${BACKEND_URL}/api/add-friend`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ initData: tg.initData, friendUsername: friendUsername.trim() }),
        signal: AbortSignal.timeout(5000)
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Failed to add friend');
      }

      const result = await res.json();

      // AUDIO: Success sound for successful friend add!
      playItemActivate();

      // Success feedback
      tg.HapticFeedback?.notificationOccurred('success');
      tg.showPopup({
        title: 'Success!',
        message: result.message,
        buttons: [{ type: 'ok' }]
      });

      // Clear input and refresh friends leaderboard if visible
      setFriendUsername('');
      if (leaderboardTab === 'friends') {
        setLeaderboardLoaded(false);
        fetchLeaderboard('friends');
      }

    } catch (error) {
      console.error('Add friend error:', error);
      tg?.HapticFeedback?.notificationOccurred('error');
      
      const message = error.message || 'Failed to add friend';
      tg?.showPopup?.({ title: 'Error', message, buttons: [{ type: 'ok' }] }) || alert(message);
    } finally {
      setIsAddingFriend(false);
    }
  };

  // AUDIO-ENHANCED: Item activation with minimal API calls
  const handleActivateItem = async (itemId) => {
    // AUDIO: Button click for activation attempt
    playButtonClick();
    
    try {
      if (!isConnected || !tg?.initData || !BACKEND_URL) {
        // AUDIO: Success sound for demo mode
        setTimeout(() => playItemActivate(), 100);
        
        const message = 'Demo: Double Points activated!\n\n⚠️ This is demo mode only.';
        tg?.showPopup?.({ title: 'Demo Activation', message, buttons: [{ type: 'ok' }] }) || alert(message);
        return;
      }

      const res = await fetch(`${BACKEND_URL}/api/activate-item`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ initData: tg.initData, itemId }),
        signal: AbortSignal.timeout(5000)
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Activation failed');
      }

      const result = await res.json();

      // AUDIO: Success sound for successful activation!
      playItemActivate();

      tg.HapticFeedback?.notificationOccurred('success');
      tg.showPopup({ 
        title: 'Success!', 
        message: result.message, 
        buttons: [{ type: 'ok' }] 
      });

      // OPTIMIZED: Only refresh profile data, don't clear entire cache
      fetchProfileData();

    } catch (err) {
      console.error('Activation error:', err);
      tg?.HapticFeedback?.notificationOccurred('error');
      
      const message = err.message || 'Activation failed';
      tg?.showPopup?.({ title: 'Error', message, buttons: [{ type: 'ok' }] }) || alert(message);
    }
  };

  // Initial load
  useEffect(() => {
    fetchProfileData();
  }, [fetchProfileData]);

  // LAZY LOAD: Only load leaderboard when actually viewed
  useEffect(() => {
    if (activeTab === 'leaderboard' && !leaderboardLoaded) {
      fetchLeaderboard(leaderboardTab);
    }
  }, [activeTab, leaderboardTab, leaderboardLoaded]);

  // Helper functions
  const getRankIcon = (rank) => {
    switch(rank) {
      case 1: return <Crown className="w-5 h-5 text-yellow-400" />;
      case 2: return <Medal className="w-5 h-5 text-gray-300" />;
      case 3: return <Medal className="w-5 h-5 text-amber-600" />;
      default: return <span className="w-5 h-5 flex items-center justify-center text-secondary font-bold text-sm">#{rank}</span>;
    }
  };

  const getBadgeColor = (badge) => {
    switch(badge) {
      case 'Legend': return 'text-purple-400 bg-purple-400/20';
      case 'Epic': return 'text-blue-400 bg-blue-400/20';
      case 'Rare': return 'text-green-400 bg-green-400/20';
      default: return 'text-gray-400 bg-gray-400/20';
    }
  };

  // AUDIO-ENHANCED Tab navigation
  const handleTabChange = (tabId) => {
    playButtonClick(); // Audio feedback for tab changes
    setActiveTab(tabId);
  };

  // AUDIO-ENHANCED Leaderboard tab changes
  const handleLeaderboardTabChange = (tabId) => {
    playButtonClick(); // Audio feedback
    setLeaderboardTab(tabId);
    setLeaderboardLoaded(false);
    fetchLeaderboard(tabId);
  };

  const renderTabContent = () => {
    switch(activeTab) {
      case 'overview':
        return (
          <motion.div 
            className="grid grid-cols-2 gap-4" 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            transition={{ duration: 0.2 }}
          >
            <StatCard icon={<Star size={24} />} label="Total Points" value={stats.points.toLocaleString()} color="accent" />
            <StatCard icon={<Flame size={24} />} label="Daily Streak" value={`${stats.daily_streak} Days`} color="accent" />
            <StatCard icon={<Trophy size={24} />} label="High Score" value={stats.high_score || 1455} color="primary" />
            <StatCard icon={<Package size={24} />} label="Games Played" value={stats.games_played || 4} color="primary" />
            <StatCard icon={<Award size={24} />} label="Average Score" value={stats.averageScore || Math.floor(stats.points / (stats.games_played || 1))} color="primary" />
            <StatCard icon={<Calendar size={24} />} label="Play Time" value={stats.totalPlayTime || '0h 0m'} color="primary" />
          </motion.div>
        );
      
      case 'badges':
        const allBadges = ['Cookie Master Badge', 'Speed Demon Badge', 'Champion Badge'];
        return (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.2 }}>
            <div className="grid grid-cols-2 gap-3">
              {allBadges.map(badgeName => (
                <BadgeCard
                  key={badgeName}
                  badgeName={badgeName}
                  isOwned={ownedBadges.includes(badgeName)}
                />
              ))}
            </div>
          </motion.div>
        );
      
      case 'leaderboard':
        return (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.2 }}>
            {/* Leaderboard Tabs */}
            <div className="flex bg-background rounded-lg border border-gray-600 p-1 mb-4">
              {[
                { id: 'global', label: 'Global', icon: Users },
                { id: 'weekly', label: 'Weekly', icon: Calendar },
                { id: 'friends', label: 'Friends', icon: Star }
              ].map((tab) => {
                const TabIcon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => handleLeaderboardTabChange(tab.id)}
                    className={`flex-1 flex items-center justify-center py-2 px-2 rounded-md transition-all duration-200 ${
                      leaderboardTab === tab.id 
                        ? 'bg-accent text-background' 
                        : 'text-secondary hover:text-primary'
                    }`}
                  >
                    <TabIcon className="w-4 h-4 mr-1" />
                    <span className="text-xs font-medium">{tab.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Add Friend Section */}
            {leaderboardTab === 'friends' && (
              <div className="bg-background rounded-lg border border-gray-600 p-3 mb-4">
                <h4 className="text-sm font-bold text-primary mb-2">Add Friend</h4>
                <div className="flex space-x-2">
                  <input
                    type="text"
                    value={friendUsername}
                    onChange={(e) => setFriendUsername(e.target.value)}
                    placeholder="Enter username (without @)"
                    className="flex-1 bg-nav border border-gray-500 rounded-lg px-3 py-2 text-sm text-primary placeholder-secondary focus:border-accent focus:outline-none"
                    disabled={isAddingFriend}
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') {
                        handleAddFriend();
                      }
                    }}
                  />
                  <button
                    onClick={handleAddFriend}
                    disabled={isAddingFriend || !friendUsername.trim()}
                    className="bg-accent text-background px-4 py-2 rounded-lg text-sm font-bold flex items-center transition-all duration-200 hover:bg-accent/90 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isAddingFriend ? (
                      <LoaderCircle className="w-4 h-4 animate-spin" />
                    ) : (
                      'Add'
                    )}
                  </button>
                </div>
              </div>
            )}

            {/* Leaderboard Content */}
            {leaderboardLoading ? (
              <div className="flex items-center justify-center py-8">
                <LoaderCircle className="w-6 h-6 text-accent animate-spin mr-2" />
                <span className="text-secondary text-sm">Loading...</span>
              </div>
            ) : leaderboardData.length === 0 ? (
              <div className="text-center py-8">
                <Trophy className="w-12 h-12 text-secondary mx-auto mb-3" />
                <h3 className="text-lg font-bold text-primary mb-2">
                  {leaderboardTab === 'friends' ? 'No Friends Yet' : 'No Players Yet'}
                </h3>
                <p className="text-secondary text-sm">
                  {leaderboardTab === 'friends' 
                    ? 'Add friends to see your private leaderboard!' 
                    : 'Be the first to climb the leaderboard!'
                  }
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {leaderboardData.slice(0, 10).map((entry, index) => (
                  <motion.div
                    key={`${leaderboardTab}-${entry.rank}`}
                    className={`flex items-center p-3 rounded-lg border transition-all duration-200 ${
                      entry.isCurrentUser 
                        ? 'bg-accent/20 border-accent' 
                        : 'bg-background border-gray-600'
                    }`}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.3, delay: index * 0.05 }}
                  >
                    {/* Rank */}
                    <div className="flex items-center justify-center w-8 h-8 mr-3">
                      {getRankIcon(entry.rank)}
                    </div>

                    {/* Player Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-2">
                        <p className={`font-medium text-sm truncate ${entry.isCurrentUser ? 'text-accent' : 'text-primary'}`}>
                          {entry.player.name}
                        </p>
                        {entry.isCurrentUser && (
                          <span className="text-xs bg-accent text-background px-2 py-0.5 rounded-full font-bold">
                            YOU
                          </span>
                        )}
                      </div>
                      <div className="flex items-center space-x-2 mt-1">
                        <span className="text-xs text-secondary">Lv.{entry.player.level}</span>
                        {entry.badge && (
                          <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${getBadgeColor(entry.badge)}`}>
                            {entry.badge}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Score */}
                    <div className="text-right">
                      <p className={`text-sm font-bold ${entry.isCurrentUser ? 'text-accent' : 'text-primary'}`}>
                        {entry.score.toLocaleString()}
                      </p>
                      <p className="text-xs text-secondary">pts</p>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </motion.div>
        );
      
      case 'inventory':
        const activatableItems = shop_items.filter(item => 
          item.id === 4 && // Double Points item
          inventory.some(inv => inv.item_id === item.id && inv.quantity > 0)
        );
        
        return (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.2 }}>
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
                    <div key={item.id} className="bg-nav p-4 rounded-lg flex items-center justify-between border border-gray-700">
                      <div className="flex items-center">
                        <div className="mr-4 text-accent"><ChevronsUp size={28} /></div>
                        <div>
                          <p className="font-bold text-primary">{item.name}</p>
                          <p className="text-sm text-secondary">{item.description}</p>
                          <p className="text-xs text-accent mt-1">Quantity: {quantity}</p>
                        </div>
                      </div>
                      <button 
                        onClick={() => handleActivateItem(item.id)}
                        disabled={boosterActive}
                        className={`font-bold py-2 px-4 rounded-lg flex items-center transition-all duration-200 ${
                          boosterActive 
                            ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
                            : 'bg-accent text-background hover:scale-105'
                        }`}
                      >
                        Activate
                      </button>
                    </div>
                  );
                })
              ) : (
                !boosterActive && (
                  <p className="text-secondary text-center p-4 bg-nav rounded-lg border border-gray-700">
                    You have no boosters. Visit the shop to buy some!
                  </p>
                )
              )}
            </div>
          </motion.div>
        );
      
      default:
        return null;
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-full">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          className="mb-4"
        >
          <LoaderCircle className="w-12 h-12 text-accent" />
        </motion.div>
        <p className="text-secondary">Loading profile...</p>
      </div>
    );
  }

  if (error && !profileData.stats) {
    return (
      <div className="p-4 text-center text-red-400">
        <p>Could not load profile.</p>
        <p className="text-sm text-secondary">{error}</p>
        <button 
          onClick={() => {
            playButtonClick();
            fetchProfileData();
          }}
          className="mt-4 bg-accent text-background py-2 px-4 rounded-lg font-bold"
        >
          Retry
        </button>
      </div>
    );
  }
  
  const { stats, inventory, shop_items, boosterActive, owned_badges: ownedBadges } = profileData;

  return (
    <div className="p-4 space-y-6 bg-background text-primary">
      {/* Connection status */}
      <div className={`text-xs text-center p-2 rounded flex items-center justify-center space-x-2 ${
        isConnected ? 'text-green-400 bg-green-900/20' : 'text-yellow-400 bg-yellow-900/20'
      }`}>
        <Wifi className="w-3 h-3" />
        <span>{isConnected ? 'Connected' : 'Demo Mode'}</span>
      </div>

      {/* User Header */}
      <motion.div 
        className="flex items-center space-x-4 p-4 bg-nav rounded-lg border border-gray-700" 
        initial={{ opacity: 0, y: -20 }} 
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <div className="w-16 h-16 bg-background rounded-full flex items-center justify-center border-2 border-gray-600 flex-shrink-0">
          <User className="w-8 h-8 text-secondary" />
        </div>
        
        <div className="flex-1 min-w-0">
          <h1 className="text-xl font-bold text-primary truncate">{stats.first_name}</h1>
          <p className="text-sm text-secondary truncate">@{stats.username || 'user'} • Level {stats.level}</p>
          <div className="flex items-center mt-1">
            <Star className="w-4 h-4 text-accent mr-1" />
            <span className="text-lg font-bold text-accent">{stats.points.toLocaleString()}</span>
          </div>
        </div>
      </motion.div>

      {/* Tab Navigation */}
      <motion.div 
        className="flex bg-nav rounded-lg border border-gray-700 p-1 overflow-hidden"
        initial={{ opacity: 0, scale: 0.95 }} 
        animate={{ opacity: 1, scale: 1 }} 
        transition={{ delay: 0.1, duration: 0.3 }}
      >
        {[
          { id: 'overview', label: 'Overview', icon: User },
          { id: 'badges', label: 'Badges', icon: Award },
          { id: 'leaderboard', label: 'Board', icon: Trophy },
          { id: 'inventory', label: 'Items', icon: Package }
        ].map((tab) => {
          const TabIcon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => handleTabChange(tab.id)}
              className={`flex-1 flex flex-col items-center justify-center py-2 px-1 rounded-md transition-all duration-200 ${
                activeTab === tab.id 
                  ? 'bg-accent text-background' 
                  : 'text-secondary hover:text-primary hover:bg-background/20'
              }`}
            >
              <TabIcon className="w-4 h-4 mb-1" />
              <span className="text-xs font-medium truncate">{tab.label}</span>
            </button>
          );
        })}
      </motion.div>

      {/* Tab Content */}
      <div className="min-h-[400px]">
        {renderTabContent()}
      </div>
    </div>
  );
};

export default ProfilePage;
