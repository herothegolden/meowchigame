import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  User, Edit2, Save, X, Crown, Star, Trophy, Clock, Target, Users, 
  Gamepad2, Medal, Shield, Zap, Award, Plus, Trash2, LoaderCircle, 
  RefreshCw, Upload, Camera, Flame, Package, Calendar, ChevronsUp, Badge, CheckSquare
} from 'lucide-react';
import TasksPage from './TasksPage';

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
    'Cookie Master': { 
      icon: '🍪', 
      title: 'Cookie Master', 
      description: 'Master of the cookies',
      color: 'text-yellow-400'
    },
    'Speed Demon': { 
      icon: '⚡', 
      title: 'Speed Demon', 
      description: 'Lightning fast reflexes',
      color: 'text-blue-400'
    },
    'Champion': { 
      icon: '🏆', 
      title: 'Champion', 
      description: 'Ultimate game champion',
      color: 'text-purple-400'
    }
  };

  const badge = badgeConfig[badgeName] || {
    icon: '🎖',
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
  const [profileData, setProfileData] = useState(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  
  // Profile editing states
  const [isEditingName, setIsEditingName] = useState(false);
  const [editNameValue, setEditNameValue] = useState('');
  const [isUpdatingName, setIsUpdatingName] = useState(false);
  const [displayName, setDisplayName] = useState('');
  
  // Leaderboard states
  const [leaderboardData, setLeaderboardData] = useState([]);
  const [leaderboardLoading, setLeaderboardLoading] = useState(false);
  const [leaderboardTab, setLeaderboardTab] = useState('global');
  
  // Friend management states
  const [friendUsername, setFriendUsername] = useState('');
  const [isAddingFriend, setIsAddingFriend] = useState(false);
  const [removingFriendId, setRemovingFriendId] = useState(null);
  
  // Badge progress states
  const [badgeProgress, setBadgeProgress] = useState({});
  const [badgeProgressLoading, setBadgeProgressLoading] = useState(false);
  
  const tg = window.Telegram?.WebApp;

  // Get Telegram user data
  const telegramUser = tg?.initDataUnsafe?.user;
  const telegramPhotoUrl = telegramUser?.photo_url;
  const telegramFirstName = telegramUser?.first_name;

  // Fetch profile data from backend
  const fetchProfileData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      if (!tg?.initData || !BACKEND_URL) {
        throw new Error('Connection not available. Please check your internet connection and try again.');
      }

      console.log('Fetching profile data...');
      
      const [statsRes, shopDataRes] = await Promise.all([
        fetch(`${BACKEND_URL}/api/get-user-stats`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ initData: tg.initData }),
        }),
        fetch(`${BACKEND_URL}/api/get-shop-data`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ initData: tg.initData }),
        })
      ]);

      if (!statsRes.ok || !shopDataRes.ok) {
        throw new Error('Failed to fetch profile data. Please try again.');
      }

      const stats = await statsRes.json();
      const shopData = await shopDataRes.json();
      
      console.log('Profile data loaded:', { stats, shopData });
      
      setProfileData({
        stats,
        inventory: shopData.inventory,
        allItems: shopData.items,
        boosterActive: shopData.boosterActive,
        ownedBadges: shopData.ownedBadges || []
      });
      
      setIsConnected(true);

    } catch (err) {
      console.error('Profile fetch error:', err);
      setError(err.message);
      setIsConnected(false);
    } finally {
      setLoading(false);
    }
  }, [tg]);

  useEffect(() => {
    fetchProfileData();
  }, [fetchProfileData]);

  // Load leaderboard when leaderboard tab is accessed
  useEffect(() => {
    if (activeTab === 'leaderboard' && leaderboardData.length === 0) {
      fetchLeaderboard(leaderboardTab);
    }
  }, [activeTab]);

  // Load badge progress when badges tab is accessed
  useEffect(() => {
    if (activeTab === 'badges' && Object.keys(badgeProgress).length === 0) {
      fetchBadgeProgress();
    }
  }, [activeTab]);

  const handleActivateItem = async (itemId) => {
    try {
      if (!isConnected || !tg?.initData || !BACKEND_URL) {
        throw new Error('Connection not available. Cannot activate items offline.');
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

      // Refresh profile data
      fetchProfileData();

    } catch (error) {
      console.error('Activation error:', error);
      tg?.HapticFeedback?.notificationOccurred('error');
      tg?.showPopup({
        title: 'Error',
        message: error.message,
        buttons: [{ type: 'ok' }]
      });
    }
  };

  const fetchBadgeProgress = async () => {
    setBadgeProgressLoading(true);
    
    try {
      if (!tg?.initData || !BACKEND_URL) {
        throw new Error('Connection not available');
      }

      const res = await fetch(`${BACKEND_URL}/api/get-badge-progress`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ initData: tg.initData }),
      });

      if (res.ok) {
        const data = await res.json();
        setBadgeProgress(data.progress || {});
      } else {
        throw new Error('Failed to fetch badge progress');
      }
    } catch (err) {
      console.error('Badge progress fetch error:', err);
      setBadgeProgress({});
    } finally {
      setBadgeProgressLoading(false);
    }
  };

  // Profile name update handler
  const handleUpdateProfile = async () => {
    if (!editNameValue.trim() || editNameValue.trim() === displayName) {
      setIsEditingName(false);
      return;
    }

    setIsUpdatingName(true);

    try {
      if (!isConnected || !tg?.initData || !BACKEND_URL) {
        throw new Error('Connection not available. Cannot update profile offline.');
      }

      const res = await fetch(`${BACKEND_URL}/api/update-profile`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ initData: tg.initData, firstName: editNameValue.trim() }),
      });

      const result = await res.json();
      if (!res.ok) throw new Error(result.error || 'Update failed');

      // Update local state
      setProfileData(prev => ({
        ...prev,
        stats: { ...prev.stats, first_name: result.firstName }
      }));
      
      setDisplayName(result.firstName);
      setIsEditingName(false);
      tg.HapticFeedback?.notificationOccurred('success');
      tg.showPopup({
        title: 'Success!',
        message: result.message,
        buttons: [{ type: 'ok' }]
      });

    } catch (error) {
      console.error('Profile update error:', error);
      tg?.HapticFeedback?.notificationOccurred('error');
      tg?.showPopup({
        title: 'Error',
        message: error.message,
        buttons: [{ type: 'ok' }]
      });
    } finally {
      setIsUpdatingName(false);
    }
  };

  // Friend removal handler
  const handleRemoveFriend = async (friendUsername) => {
    setRemovingFriendId(friendUsername);

    try {
      if (!isConnected || !tg?.initData || !BACKEND_URL) {
        throw new Error('Connection not available. Cannot manage friends offline.');
      }

      const res = await fetch(`${BACKEND_URL}/api/remove-friend`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ initData: tg.initData, friendUsername }),
      });

      const result = await res.json();
      if (!res.ok) throw new Error(result.error || 'Remove failed');

      // Refresh friends leaderboard
      fetchLeaderboard('friends');

      tg.HapticFeedback?.notificationOccurred('success');
      tg.showPopup({
        title: 'Success!',
        message: result.message,
        buttons: [{ type: 'ok' }]
      });

    } catch (error) {
      console.error('Remove friend error:', error);
      tg?.HapticFeedback?.notificationOccurred('error');
      tg?.showPopup({
        title: 'Error',
        message: error.message,
        buttons: [{ type: 'ok' }]
      });
    } finally {
      setRemovingFriendId(null);
    }
  };

  const fetchLeaderboard = async (type = 'global') => {
    setLeaderboardLoading(true);
    
    try {
      if (!tg?.initData || !BACKEND_URL) {
        throw new Error('Connection not available');
      }

      const res = await fetch(`${BACKEND_URL}/api/get-leaderboard`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ initData: tg.initData, type }),
      });

      if (res.ok) {
        const data = await res.json();
        setLeaderboardData(data.leaderboard || []);
      } else {
        throw new Error('Failed to fetch leaderboard');
      }
    } catch (err) {
      console.error('Leaderboard fetch error:', err);
      setLeaderboardData([]);
    } finally {
      setLeaderboardLoading(false);
    }
  };

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
      if (!isConnected || !tg?.initData || !BACKEND_URL) {
        throw new Error('Connection not available. Cannot add friends offline.');
      }

      console.log('Adding friend:', friendUsername);

      const res = await fetch(`${BACKEND_URL}/api/add-friend`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          initData: tg.initData, 
          friendUsername: friendUsername.trim() 
        }),
      });

      const result = await res.json();

      if (!res.ok) {
        throw new Error(result.error || 'Failed to add friend');
      }

      console.log('Friend added successfully:', result);

      // Success feedback
      tg.HapticFeedback?.notificationOccurred('success');
      tg.showPopup({
        title: 'Success!',
        message: result.message,
        buttons: [{ type: 'ok' }]
      });

      // Clear input and refresh friends leaderboard
      setFriendUsername('');
      if (leaderboardTab === 'friends') {
        fetchLeaderboard('friends');
      }

    } catch (error) {
      console.error('Add friend error:', error);
      tg?.HapticFeedback?.notificationOccurred('error');
      tg?.showPopup({
        title: 'Error',
        message: error.message,
        buttons: [{ type: 'ok' }]
      });
    } finally {
      setIsAddingFriend(false);
    }
  };

  // Initialize display name when profile data loads
  useEffect(() => {
    if (profileData?.stats?.first_name) {
      setDisplayName(profileData.stats.first_name);
      setEditNameValue(profileData.stats.first_name);
    }
  }, [profileData]);

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

  // Show loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
        >
          <LoaderCircle className="w-8 h-8 text-accent" />
        </motion.div>
      </div>
    );
  }

  // Show error state
  if (error) {
    return (
      <div className="p-4 min-h-screen bg-background text-primary flex items-center justify-center">
        <motion.div
          className="text-center max-w-md"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.3 }}
        >
          <div className="bg-red-600/20 border border-red-500 rounded-lg p-6">
            <Trophy className="w-16 h-16 text-red-400 mx-auto mb-4" />
            <h1 className="text-xl font-bold text-primary mb-2">Connection Error</h1>
            <p className="text-secondary text-sm mb-4">{error}</p>
            <button
              onClick={fetchProfileData}
              className="bg-accent hover:bg-accent/80 text-background px-4 py-2 rounded-lg font-bold transition-colors flex items-center space-x-2 mx-auto"
            >
              <RefreshCw className="w-4 h-4" />
              <span>Retry</span>
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  const { stats, inventory, allItems, boosterActive, ownedBadges } = profileData;
  
  // Get activatable items (Double Points only)
  const activatableItems = allItems.filter(item => 
    item.id === 4 && // Double Points item
    inventory.some(inv => inv.item_id === item.id && inv.quantity > 0)
  );

  // Get all possible badges
  const allBadges = [
    'Cookie Master',
    'Speed Demon', 
    'Champion'
  ];

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
            {badgeProgressLoading ? (
              <div className="flex items-center justify-center py-8">
                <LoaderCircle className="w-6 h-6 text-accent animate-spin mr-2" />
                <span className="text-secondary text-sm">Loading progress...</span>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Badge Progress Summary */}
                <div className="bg-background/50 p-4 rounded-lg border border-gray-600">
                  <h3 className="text-lg font-bold text-primary mb-2">Badge Progress</h3>
                  <div className="grid grid-cols-3 gap-4 text-center text-sm">
                    <div>
                      <p className="text-secondary">Earned</p>
                      <p className="text-accent font-bold">{ownedBadges.length}/3</p>
                    </div>
                    <div>
                      <p className="text-secondary">Average Progress</p>
                      <p className="text-accent font-bold">
                        {Object.keys(badgeProgress).length > 0 
                          ? Math.round(Object.values(badgeProgress).reduce((a, b) => a + b, 0) / Object.values(badgeProgress).length)
                          : 0}%
                      </p>
                    </div>
                    <div>
                      <p className="text-secondary">Next Goal</p>
                      <p className="text-accent font-bold">
                        {ownedBadges.length < 3 ? `${3 - ownedBadges.length} badges` : 'Complete!'}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Badge Cards with Progress */}
                <div className="grid grid-cols-1 gap-3">
                  {allBadges.map(badgeName => {
                    const isOwned = ownedBadges.includes(badgeName);
                    const progress = badgeProgress[badgeName] || 0;
                    
                    return (
                      <div key={badgeName}>
                        <BadgeCard badgeName={badgeName} isOwned={isOwned} />
                        {!isOwned && progress > 0 && (
                          <div className="mt-2 px-4">
                            <div className="flex items-center justify-between text-xs text-secondary mb-1">
                              <span>Progress</span>
                              <span>{progress}%</span>
                            </div>
                            <div className="w-full bg-gray-700 rounded-full h-2">
                              <motion.div
                                className="bg-accent h-2 rounded-full"
                                initial={{ width: 0 }}
                                animate={{ width: `${progress}%` }}
                                transition={{ duration: 1, delay: 0.2 }}
                              />
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
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
                    <div className="text-right mr-2">
                      <p className={`text-sm font-bold ${entry.isCurrentUser ? 'text-accent' : 'text-primary'}`}>
                        {entry.score.toLocaleString()}
                      </p>
                      <p className="text-xs text-secondary">pts</p>
                    </div>

                    {/* Remove Friend Button (only in friends tab for non-current users) */}
                    {leaderboardTab === 'friends' && !entry.isCurrentUser && (
                      <button
                        onClick={() => handleRemoveFriend(entry.player.name.toLowerCase())}
                        disabled={removingFriendId === entry.player.name.toLowerCase()}
                        className="bg-red-600 hover:bg-red-700 text-white px-2 py-1 rounded text-xs font-bold transition-colors disabled:opacity-50 flex items-center"
                        title="Remove friend"
                      >
                        {removingFriendId === entry.player.name.toLowerCase() ? (
                          <LoaderCircle className="w-3 h-3 animate-spin" />
                        ) : (
                          '✕'
                        )}
                      </button>
                    )}
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
      
      case 'tasks':
        return (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }}>
            <TasksPage />
          </motion.div>
        );
      
      default:
        return null;
    }
  };

  return (
    <div className="p-4 space-y-6 bg-background text-primary min-h-screen">
      {/* Profile Header */}
      <motion.div 
        className="p-4 bg-nav rounded-lg border border-gray-700" 
        initial={{ opacity: 0, y: -20 }} 
        animate={{ opacity: 1, y: 0 }}
      >
        {/* Profile Section */}
        <div className="flex items-center space-x-4">
          {/* Profile Photo */}
          <div className="relative flex-shrink-0">
            <div className="w-16 h-16 bg-background rounded-full flex items-center justify-center border-2 border-gray-600 overflow-hidden">
              <img
                src={telegramPhotoUrl || '/default-avatar.png'}
                alt="Profile"
                className="w-full h-full object-cover"
                onError={(e) => { e.currentTarget.src = '/default-avatar.png'; }}
              />
            </div>
          </div>
          
          {/* User Info */}
          <div className="flex-1 min-w-0">
            {isEditingName ? (
              <div className="flex items-center space-x-2">
                <input
                  type="text"
                  value={editNameValue}
                  onChange={(e) => setEditNameValue(e.target.value)}
                  className="bg-background border border-gray-500 rounded px-2 py-1 text-primary text-lg font-bold flex-1 min-w-0"
                  maxLength={50}
                  autoFocus
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') handleUpdateProfile();
                    if (e.key === 'Escape') setIsEditingName(false);
                  }}
                />
                <button
                  onClick={handleUpdateProfile}
                  disabled={isUpdatingName}
                  className="bg-accent text-background px-3 py-1 rounded font-bold hover:bg-accent/90 transition-colors disabled:opacity-50 flex items-center"
                >
                  {isUpdatingName ? <LoaderCircle className="w-4 h-4 animate-spin" /> : <CheckSquare className="w-4 h-4" />}
                </button>
                <button
                  onClick={() => setIsEditingName(false)}
                  className="bg-gray-600 text-white px-3 py-1 rounded font-bold hover:bg-gray-700 transition-colors flex items-center"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div className="flex items-center space-x-2">
                <h1 className="text-xl font-bold text-primary truncate">{displayName}</h1>
                <button
                  onClick={() => {
                    setEditNameValue(displayName || '');
                    setIsEditingName(true);
                  }}
                  className="text-secondary hover:text-accent transition-colors p-1"
                  title="Edit name"
                >
                  <User className="w-4 h-4" />
                </button>
                {/* Dev Tools Button - Only for authorized developer */}
                {telegramUser?.id === 6998637798 && (
                  <button 
                    onClick={() => window.location.href = '/dev-tools'}
                    className="bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded text-xs font-bold transition-colors"
                    title="Developer Tools"
                  >
                    Dev Tools
                  </button>
                )}
              </div>
            )}
            <p className="text-sm text-secondary truncate">@{stats.username || 'user'} • Level {stats.level}</p>
            <div className="flex items-center mt-1">
              <Star className="w-4 h-4 text-accent mr-1" />
              <span className="text-lg font-bold text-accent">{stats.points.toLocaleString()}</span>
            </div>
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
          { id: 'tasks', label: 'Tasks', icon: CheckSquare }
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
