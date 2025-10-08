// Path: frontend/src/pages/ProfilePage/tabs/LeaderboardTab.jsx
// v5 — Restore global leaderboard visibility
// - Use apiCall again (auto-includes Telegram initData + correct URL)
// - Keep: versioned session cache, lazy avatars with fixed size, background prefetch
// - Simplify: remove AbortController (apiCall doesn't support signal)

import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Users, Calendar, Star, Trophy, Crown, Medal, LoaderCircle, User } from 'lucide-react';
import { apiCall, showSuccess, showError } from '../../../utils/api';

const CACHE_PREFIX = 'v2:leaderboard:'; // versioned cache key prefix

const LeaderboardTab = () => {
  const [leaderboard, setLeaderboard] = useState([]);
  const [loading, setLoading] = useState(false);
  const [activeType, setActiveType] = useState('global');
  const [friendUsername, setFriendUsername] = useState('');
  const [isAddingFriend, setIsAddingFriend] = useState(false);
  const [removingFriend, setRemovingFriend] = useState(null);

  // ✅ Synced helper: same as ProfileHeader
  const getAvatarUrl = (avatarData) => {
    if (!avatarData) return null;
    if (avatarData.startsWith('data:image/')) return avatarData;
    if (avatarData.startsWith('/uploads/')) {
      const BACKEND_URL = import.meta.env.VITE_BACKEND_URL;
      return `${BACKEND_URL}${avatarData}`;
    }
    if (avatarData.startsWith('http://') || avatarData.startsWith('https://')) return avatarData;
    return null;
  };

  useEffect(() => {
    fetchLeaderboard(activeType);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeType]);

  const fetchLeaderboard = async (type) => {
    const cacheKey = `${CACHE_PREFIX}${type}`;
    const cached = sessionStorage.getItem(cacheKey);

    if (cached) {
      try {
        setLeaderboard(JSON.parse(cached));
      } catch {
        sessionStorage.removeItem(cacheKey);
      }
    }

    if (!cached) setLoading(true);

    try {
      // 🔑 Use apiCall so initData and base URL logic are handled for us
      const result = await apiCall('/api/get-leaderboard', { type });
      const data = Array.isArray(result?.leaderboard) ? result.leaderboard : [];

      setLeaderboard(data);
      sessionStorage.setItem(cacheKey, JSON.stringify(data));
    } catch (error) {
      console.error('Failed to load leaderboard:', error);
      if (!cached) setLeaderboard([]);
    } finally {
      setLoading(false);
    }
  };

  // 🔹 Prefetch other tabs when idle
  useEffect(() => {
    if (activeType === 'global') {
      ['weekly', 'friends'].forEach((t) => {
        const cacheKey = `${CACHE_PREFIX}${t}`;
        if (!sessionStorage.getItem(cacheKey)) {
          apiCall('/api/get-leaderboard', { type: t })
            .then((r) => {
              if (Array.isArray(r?.leaderboard)) {
                sessionStorage.setItem(cacheKey, JSON.stringify(r.leaderboard));
              }
            })
            .catch(() => {});
        }
      });
    }
  }, [activeType]);

  const handleAddFriend = async () => {
    if (!friendUsername.trim()) return;
    setIsAddingFriend(true);
    try {
      const result = await apiCall('/api/add-friend', { friendUsername: friendUsername.trim() });
      setFriendUsername('');
      if (activeType === 'friends') fetchLeaderboard('friends');
      showSuccess(result.message);
    } catch (error) {
      showError(error.message);
    } finally {
      setIsAddingFriend(false);
    }
  };

  const handleRemoveFriend = async (username) => {
    setRemovingFriend(username);
    try {
      const result = await apiCall('/api/remove-friend', { friendUsername: username });
      fetchLeaderboard('friends');
      showSuccess(result.message);
    } catch (error) {
      showError(error.message);
    } finally {
      setRemovingFriend(null);
    }
  };

  const getRankIcon = (rank) => {
    switch (rank) {
      case 1: return <Crown className="w-5 h-5 text-yellow-400" />;
      case 2: return <Medal className="w-5 h-5 text-gray-300" />;
      case 3: return <Medal className="w-5 h-5 text-amber-600" />;
      default:
        return (
          <span className="w-5 h-5 flex items-center justify-center text-secondary font-bold text-sm">
            #{rank}
          </span>
        );
    }
  };

  const getBadgeColor = (badge) => {
    switch (badge) {
      case 'Legend': return 'text-purple-400 bg-purple-400/20';
      case 'Epic': return 'text-blue-400 bg-blue-400/20';
      case 'Rare': return 'text-green-400 bg-green-400/20';
      default: return 'text-gray-400 bg-gray-400/20';
    }
  };

  const tabs = [
    { id: 'global', label: 'Global', icon: Users },
    { id: 'weekly', label: 'Weekly', icon: Calendar },
    { id: 'friends', label: 'Friends', icon: Star },
  ];

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }}>
      <div className="flex bg-background rounded-lg border border-gray-600 p-1 mb-4">
        {tabs.map((tab) => {
          const TabIcon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveType(tab.id)}
              className={`flex-1 flex items-center justify-center py-2 px-2 rounded-md transition-all duration-200 ${
                activeType === tab.id
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

      {activeType === 'friends' && (
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
              onKeyPress={(e) => e.key === 'Enter' && handleAddFriend()}
            />
            <button
              onClick={handleAddFriend}
              disabled={isAddingFriend || !friendUsername.trim()}
              className="bg-accent text-background px-4 py-2 rounded-lg text-sm font-bold flex items-center transition-all duration-200 hover:bg-accent/90 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isAddingFriend ? <LoaderCircle className="w-4 h-4 animate-spin" /> : 'Add'}
            </button>
          </div>
        </div>
      )}

      {loading && leaderboard.length === 0 ? (
        <div className="flex items-center justify-center py-8">
          <LoaderCircle className="w-6 h-6 text-accent animate-spin mr-2" />
          <span className="text-secondary text-sm">Loading...</span>
        </div>
      ) : leaderboard.length === 0 ? (
        <div className="text-center py-8">
          <Trophy className="w-12 h-12 text-secondary mx-auto mb-3" />
          <h3 className="text-lg font-bold text-primary mb-2">
            {activeType === 'friends' ? 'No Friends Yet' : 'No Players Yet'}
          </h3>
          <p className="text-secondary text-sm">
            {activeType === 'friends'
              ? 'Add friends to see your private leaderboard!'
              : 'Be the first to climb the leaderboard!'}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {leaderboard.slice(0, 10).map((entry, index) => {
            const avatarUrl = getAvatarUrl(entry.player.avatarUrl || entry.player.avatar_url);

            return (
              <motion.div
                key={`${activeType}-${entry.rank}`}
                className={`flex items-center p-3 rounded-lg border transition-all duration-200 ${
                  entry.isCurrentUser
                    ? 'bg-accent/20 border-accent'
                    : 'bg-background border-gray-600'
                }`}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.3, delay: index * 0.05 }}
              >
                <div className="flex items-center justify-center w-8 h-8 mr-3">
                  {getRankIcon(entry.rank)}
                </div>

                {/* Avatar */}
                <div className="w-10 h-10 rounded-full overflow-hidden bg-accent/20 border-2 border-accent/50 flex items-center justify-center mr-3 flex-shrink-0">
                  {avatarUrl ? (
                    <img
                      loading="lazy"
                      decoding="async"
                      width={40}
                      height={40}
                      src={avatarUrl}
                      alt={entry.player.name}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        e.currentTarget.style.display = 'none';
                        const fallback = e.currentTarget.nextSibling;
                        if (fallback) fallback.style.display = 'block';
                      }}
                    />
                  ) : null}
                  <User
                    className="w-5 h-5 text-accent"
                    style={{ display: avatarUrl ? 'none' : 'block' }}
                  />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center space-x-2">
                    <p
                      className={`font-medium text-sm truncate ${
                        entry.isCurrentUser ? 'text-accent' : 'text-primary'
                      }`}
                    >
                      {entry.player.name}
                    </p>
                    {entry.isCurrentUser && (
                      <span className="text-xs bg-accent text-background px-2 py-0.5 rounded-full font-bold">
                        YOU
                      </span>
                    )}
                    {activeType === 'friends' && !entry.isCurrentUser && (
                      <span className="text-xs bg-green-600 text-white px-2 py-0.5 rounded-full font-bold">
                        FRIEND
                      </span>
                    )}
                  </div>
                  <div className="flex items-center space-x-2 mt-1">
                    <span className="text-xs text-secondary">Lv.{entry.player.level}</span>
                    {entry.badge && (
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full font-bold ${getBadgeColor(entry.badge)}`}
                      >
                        {entry.badge}
                      </span>
                    )}
                  </div>
                </div>

                <div className="text-right mr-2">
                  <p
                    className={`text-sm font-bold ${
                      entry.isCurrentUser ? 'text-accent' : 'text-primary'
                    }`}
                  >
                    {entry.score.toLocaleString()}
                  </p>
                  <p className="text-xs text-secondary">pts</p>
                </div>

                {activeType === 'friends' && !entry.isCurrentUser && (
                  <button
                    onClick={() => handleRemoveFriend(entry.player.username)}
                    disabled={removingFriend === entry.player.username}
                    className="bg-red-600 hover:bg-red-700 text-white px-2 py-1 rounded text-xs font-bold transition-colors disabled:opacity-50"
                  >
                    {removingFriend === entry.player.username ? (
                      <LoaderCircle className="w-3 h-3 animate-spin" />
                    ) : (
                      '✕'
                    )}
                  </button>
                )}
              </motion.div>
            );
          })}
        </div>
      )}
    </motion.div>
  );
};

export default LeaderboardTab;
