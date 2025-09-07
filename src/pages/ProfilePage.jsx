import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { User, Star, Flame, Award, Calendar, Package, Zap, LoaderCircle, ChevronsUp, Badge, Trophy, Crown, Medal, Users, Clock, Wifi } from 'lucide-react';
import { PerformanceMonitor } from '../utils/performance';
import { OptimizedAPIService } from '../utils/apiService';

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

const InventoryItemCard = ({ item, quantity, onActivate, disabled }) => {
  const [isActivating, setIsActivating] = useState(false);

  const handleActivate = async () => {
    setIsActivating(true);
    await onActivate(item.id);
    setIsActivating(false);
  };

  const getItemIcon = (itemId) => {
    switch(itemId) {
      case 4: return <ChevronsUp size={28} />; // Double Points
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
    shop_items: [], 
    boosterActive: false,
    owned_badges: []
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isConnected, setIsConnected] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');
  
  // Leaderboard state
  const [leaderboardData, setLeaderboardData] = useState([]);
  const [leaderboardLoading, setLeaderboardLoading] = useState(false);
  const [leaderboardTab, setLeaderboardTab] = useState('global');
  
  // Friends system state
  const [friendUsername, setFriendUsername] = useState('');
  const [isAddingFriend, setIsAddingFriend] = useState(false);
  
  const tg = window.Telegram?.WebApp;

  // Mock data for demo mode
  const MOCK_STATS = {
    first_name: 'Demo User',
    username: 'demouser',
    points: 4735,
    level: 1,
    daily_streak: 1,
    created_at: new Date().toISOString(),
    games_played: 4,
    high_score: 1455,
    total_play_time: 0
  };

  const MOCK_ITEMS = [
    { id: 4, name: 'Double Points', description: '2x points for your next game', category: 'multiplier' }
  ];

  const MOCK_LEADERBOARD = [
    { rank: 1, player: { name: 'Alex', level: 3 }, score: 12450, isCurrentUser: true, badge: 'Legend' },
    { rank: 2, player: { name: 'Maria', level: 4 }, score: 11200, isCurrentUser: false, badge: 'Epic' },
    { rank: 3, player: { name: 'John', level: 2 }, score: 9800, isCurrentUser: false, badge: 'Epic' },
    { rank: 4, player: { name: 'Sarah', level: 3 }, score: 8500, isCurrentUser: false, badge: 'Rare' },
    { rank: 5, player: { name: 'Mike', level: 2 }, score: 7200, isCurrentUser: false, badge: 'Rare' },
    { rank: 6, player: { name: 'Emma', level: 1 }, score: 6100, isCurrentUser: false, badge: null },
    { rank: 7, player: { name: 'David', level: 2 }, score: 5800, isCurrentUser: false, badge: null },
    { rank: 8, player: { name: 'Lisa', level: 1 }, score: 4900, isCurrentUser: false, badge: null }
  ];

  // Leaderboard helper functions
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

  // OPTIMIZATION: Single API call instead of parallel calls
  const fetchProfileData = useCallback(async () => {
    try {
      PerformanceMonitor.startTimer('ProfilePage_SingleAPICall');
      
      if (!tg?.initData) {
        console.log('Demo mode: Using mock profile data');
        setProfileData({
          stats: MOCK_STATS,
          inventory: [],
          shop_items: MOCK_ITEMS,
          boosterActive: false,
          owned_badges: []
        });
        setIsConnected(false);
        setLoading(false);
        PerformanceMonitor.endTimer('ProfilePage_SingleAPICall');
        return;
      }

      console.log('🚀 Fetching complete profile data...');

      // Try new optimized endpoint first, fallback to old endpoints
      let completeProfile;
      try {
        completeProfile = await OptimizedAPIService.getProfileData(tg.initData);
      } catch (error) {
        console.log('⚠️ New endpoint failed, using fallback...');
        // Fallback to existing endpoints
        const [statsRes, shopDataRes] = await Promise.all([
          OptimizedAPIService.request('/api/user-stats', {
            body: JSON.stringify({ initData: tg.initData })
          }),
          OptimizedAPIService.request('/api/get-shop-data', {
            body: JSON.stringify({ initData: tg.initData })
          })
        ]);
        
        completeProfile = {
          stats: statsRes,
          inventory: shopDataRes.inventory || [],
          shop_items: shopDataRes.items || [],
          boosterActive: shopDataRes.boosterActive || false,
          owned_badges: shopDataRes.ownedBadges || []
        };
      }
      
      PerformanceMonitor.endTimer('ProfilePage_SingleAPICall');
      
      console.log('✅ Complete profile loaded:', completeProfile);
      
      setProfileData({
        stats: completeProfile.stats,
        inventory: completeProfile.inventory || [],
        shop_items: completeProfile.shop_items || completeProfile.items || [],
        boosterActive: completeProfile.boosterActive || false,
        owned_badges: completeProfile.owned_badges || completeProfile.ownedBadges || []
      });
      
      setIsConnected(true);

      // Success haptic feedback
      if (tg.HapticFeedback) {
        tg.HapticFeedback.notificationOccurred('success');
      }

    } catch (err) {
      console.error('ProfilePage fetch error:', err);
      setError(err.message);
      
      // Fallback to demo data
      setProfileData({
        stats: MOCK_STATS,
        inventory: [],
        shop_items: MOCK_ITEMS,
        boosterActive: false,
        owned_badges: []
      });
      setIsConnected(false);
      
      // Error haptic feedback
      if (tg?.HapticFeedback) {
        tg.HapticFeedback.notificationOccurred('error');
      }
    } finally {
      setLoading(false);
      
      // Performance report
      setTimeout(() => {
        const report = PerformanceMonitor.getReport();
        console.log('📊 ProfilePage Performance Report:', report);
        
        // Alert if still slow
        if (report.averageLoadTime > 300 && tg?.showAlert) {
          tg.showAlert(`Profile Load: ${report.averageLoadTime}ms`);
        }
      }, 1000);
    }
  }, [tg]);

  // OPTIMIZATION: Cached leaderboard fetch
  const fetchLeaderboard = async (type = 'global') => {
    setLeaderboardLoading(true);
    
    try {
      if (!tg?.initData) {
        setLeaderboardData(MOCK_LEADERBOARD);
        setLeaderboardLoading(false);
        return;
      }

      console.log(`🚀 Fetching ${type} leaderboard...`);
      const start = performance.now();
      
      const data = await OptimizedAPIService.getLeaderboard(tg.initData, type);
      
      const duration = Math.round(performance.now() - start);
      console.log(`✅ Leaderboard ${type}: ${duration}ms`);
      
      setLeaderboardData(data.leaderboard || []);
    } catch (err) {
      console.error('Leaderboard error:', err);
      setLeaderboardData(MOCK_LEADERBOARD);
    } finally {
      setLeaderboardLoading(false);
    }
  };

  // OPTIMIZATION: Debounced friend add with retry
  const handleAddFriend = async () => {
    if (!friendUsername.trim()) {
      if (tg && tg.showPopup) {
        tg.showPopup({
          title: 'Error',
          message: 'Please enter a username',
          buttons: [{ type: 'ok' }]
        });
      } else {
        alert('Please enter a username');
      }
      return;
    }

    setIsAddingFriend(true);

    try {
      if (!isConnected || !tg?.initData) {
        // Demo mode
        console.log('Demo: Adding friend:', friendUsername);
        const message = `Demo: Added @${friendUsername} as friend!\n\n⚠️ This is demo mode only.`;
        if (tg && tg.showPopup) {
          tg.showPopup({
            title: 'Demo Mode',
            message: message,
            buttons: [{ type: 'ok' }]
          });
        } else {
          alert(message);
        }
        setFriendUsername('');
        setIsAddingFriend(false);
        return;
      }

      console.log('Adding friend:', friendUsername);

      const result = await OptimizedAPIService.request('/api/add-friend', {
        body: JSON.stringify({ 
          initData: tg.initData, 
          friendUsername: friendUsername.trim() 
        })
      });

      console.log('Friend added successfully:', result);

      // Success feedback
      tg.HapticFeedback?.notificationOccurred('success');
      tg.showPopup({
        title: 'Success!',
        message: result.message,
        buttons: [{ type: 'ok' }]
      });

      // Clear input and refresh leaderboard
      setFriendUsername('');
      fetchLeaderboard('friends');

    } catch (error) {
      console.error('Add friend error:', error);
      tg?.HapticFeedback?.notificationOccurred('error');
      
      if (tg && tg.showPopup) {
        tg.showPopup({
          title: 'Error',
          message: error.message,
          buttons: [{ type: 'ok' }]
        });
      } else {
        alert(error.message);
      }
    } finally {
      setIsAddingFriend(false);
    }
  };

  // OPTIMIZATION: Fast item activation
  const handleActivateItem = async (itemId) => {
    try {
      if (!isConnected || !tg?.initData) {
        // Demo mode
        console.log('Demo: Activating item', itemId);
        
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
      
      const result = await OptimizedAPIService.request('/api/activate-item', {
        body: JSON.stringify({ initData: tg.initData, itemId })
      });

      console.log('Item activated successfully:', result);

      tg.HapticFeedback?.notificationOccurred('success');
      tg.showPopup({ 
        title: 'Success!', 
        message: result.message, 
        buttons: [{ type: 'ok' }] 
      });

      // Refresh profile data
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

  // Initial load
  useEffect(() => {
    fetchProfileData();
  }, [fetchProfileData]);

  // Load leaderboard when tab is accessed
  useEffect(() => {
    if (activeTab === 'leaderboard' && leaderboardData.length === 0) {
      fetchLeaderboard(leaderboardTab);
    }
  }, [activeTab]);

  const renderTabContent = () => {
    switch(activeTab) {
      case 'overview':
        return (
          <motion.div 
            className="grid grid-cols-2 gap-4" 
            initial={{ opacity: 0, scale: 0.95 }} 
            animate={{ opacity: 1, scale: 1 }} 
            transition={{ delay: 0.2 }}
          >
            {/* Total Points */}
            <div className="bg-nav p-4 rounded-lg flex items-center border border-gray-700">
              <div className="mr-4 text-accent"><Star size={24} /></div>
              <div>
                <p className="text-sm text-secondary">Total Points</p>
                <p className="text-lg font-bold text-primary">{stats.points.toLocaleString()}</p>
                <p className="text-xs text-green-400 mt-1">+15% this week</p>
              </div>
            </div>

            {/* Daily Streak */}
            <div className="bg-nav p-4 rounded-lg flex items-center border border-gray-700">
              <div className="mr-4 text-accent"><Flame size={24} /></div>
              <div>
                <p className="text-sm text-secondary">Daily Streak</p>
                <p className="text-lg font-bold text-primary">{stats.daily_streak} Days</p>
                <p className="text-xs text-green-400 mt-1">Personal best!</p>
              </div>
            </div>

            {/* High Score */}
            <div className="bg-nav p-4 rounded-lg flex items-center border border-gray-700">
              <div className="mr-4 text-primary"><Trophy size={24} /></div>
              <div>
                <p className="text-sm text-secondary">High Score</p>
                <p className="text-lg font-bold text-primary">{stats.high_score || 1455}</p>
                <p className="text-xs text-green-400 mt-1">New record!</p>
              </div>
            </div>

            {/* Games Played */}
            <div className="bg-nav p-4 rounded-lg flex items-center border border-gray-700">
              <div className="mr-4 text-primary"><Package size={24} /></div>
              <div>
                <p className="text-sm text-secondary">Games Played</p>
                <p className="text-lg font-bold text-primary">{stats.games_played || 4}</p>
                <p className="text-xs text-green-400 mt-1">+5 this week</p>
              </div>
            </div>

            {/* Average Score */}
            <div className="bg-nav p-4 rounded-lg flex items-center border border-gray-700">
              <div className="mr-4 text-primary"><Award size={24} /></div>
              <div>
                <p className="text-sm text-secondary">Average Score</p>
                <p className="text-lg font-bold text-primary">{stats.averageScore || Math.floor(stats.points / (stats.games_played || 1))}</p>
                <p className="text-xs text-green-400 mt-1">Improving!</p>
              </div>
            </div>

            {/* Play Time */}
            <div className="bg-nav p-4 rounded-lg flex items-center border border-gray-700">
              <div className="mr-4 text-primary"><Calendar size={24} /></div>
              <div>
                <p className="text-sm text-secondary">Play Time</p>
                <p className="text-lg font-bold text-primary">{stats.totalPlayTime || '0h 0m'}</p>
                <p className="text-xs text-green-400 mt-1">Getting better!</p>
              </div>
            </div>
          </motion.div>
        );
      
      case 'badges':
        return (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }}>
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
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }}>
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
                    onClick={() => {
                      setLeaderboardTab(tab.id);
                      fetchLeaderboard(tab.id);
                    }}
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

            {/* Add Friend Section - Only show in Friends tab */}
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
                <p className="text-xs text-secondary mt-2">
                  Add friends by their Telegram username to compete together
                </p>
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
                        {leaderboardTab === 'friends' && !entry.isCurrentUser && (
                          <span className="text-xs bg-green-600 text-white px-2 py-0.5 rounded-full font-bold">
                            FRIEND
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

            {/* Stats Footer */}
            {!leaderboardLoading && leaderboardData.length > 0 && (
              <div className="bg-background rounded-lg p-3 border border-gray-600 text-center mt-4">
                <div className="flex items-center justify-center space-x-4 text-xs text-secondary">
                  <div className="flex items-center">
                    <Users className="w-3 h-3 mr-1" />
                    <span>
                      {leaderboardTab === 'friends' 
                        ? `${leaderboardData.length} Friends` 
                        : `${leaderboardData.length} Players`
                      }
                    </span>
                  </div>
                  <div className="flex items-center">
                    <Clock className="w-3 h-3 mr-1" />
                    <span>Updates hourly</span>
                  </div>
                </div>
              </div>
            )}
          </motion.div>
        );
      
      case 'inventory':
        return (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }}>
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
          transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
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
          onClick={fetchProfileData}
          className="mt-4 bg-accent text-background py-2 px-4 rounded-lg font-bold"
        >
          Retry
        </button>
      </div>
    );
  }
  
  const { stats, inventory, shop_items, boosterActive, owned_badges: ownedBadges } = profileData;
  
  // Get activatable items (Double Points only)
  const activatableItems = shop_items.filter(item => 
    item.id === 4 && // Double Points item
    inventory.some(inv => inv.item_id === item.id && inv.quantity > 0)
  );

  // Get all possible badges
  const allBadges = [
    'Cookie Master Badge',
    'Speed Demon Badge', 
    'Champion Badge'
  ];

  return (
    <div className="p-4 space-y-6 bg-background text-primary">
      {/* Connection status with performance indicator */}
      <div className={`text-xs text-center p-2 rounded flex items-center justify-center space-x-2 ${
        isConnected ? 'text-green-400 bg-green-900/20' : 'text-yellow-400 bg-yellow-900/20'
      }`}>
        <Wifi className="w-3 h-3" />
        <span>{isConnected ? '🟢 Connected - Optimized API' : '🔴 Demo mode - data won\'t persist'}</span>
      </div>

      {/* User Header */}
      <motion.div 
        className="flex items-center space-x-4 p-4 bg-nav rounded-lg border border-gray-700" 
        initial={{ opacity: 0, y: -20 }} 
        animate={{ opacity: 1, y: 0 }}
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
        transition={{ delay: 0.1 }}
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
              onClick={() => setActiveTab(tab.id)}
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
