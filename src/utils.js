// src/utils.js - Helper Functions for Meowchi App
// All the utilities needed for viral sharing, daily tasks, and popular app features

// === Telegram WebApp Utilities ===

export const telegram = {
  // Get Telegram WebApp instance
  getWebApp: () => {
    return window.Telegram?.WebApp;
  },

  // Check if running inside Telegram
  isInTelegram: () => {
    return !!(window.Telegram?.WebApp);
  },

  // Get user ID from Telegram
  getUserId: () => {
    const tg = telegram.getWebApp();
    return tg?.initDataUnsafe?.user?.id || null;
  },

  // Get user info from Telegram
  getUserInfo: () => {
    const tg = telegram.getWebApp();
    const user = tg?.initDataUnsafe?.user;
    
    if (!user) return null;
    
    return {
      id: user.id,
      firstName: user.first_name,
      lastName: user.last_name,
      username: user.username,
      languageCode: user.language_code,
      isPremium: user.is_premium,
      photoUrl: user.photo_url
    };
  },

  // Get start parameter (for referrals)
  getStartParam: () => {
    const tg = telegram.getWebApp();
    return tg?.initDataUnsafe?.start_param || null;
  },

  // Haptic feedback
  haptic: (type = 'medium') => {
    try {
      const tg = telegram.getWebApp();
      if (!tg?.HapticFeedback) return;

      switch (type) {
        case 'light':
          tg.HapticFeedback.impactOccurred('light');
          break;
        case 'heavy':
          tg.HapticFeedback.impactOccurred('heavy');
          break;
        case 'success':
          tg.HapticFeedback.notificationOccurred('success');
          break;
        case 'warning':
          tg.HapticFeedback.notificationOccurred('warning');
          break;
        case 'error':
          tg.HapticFeedback.notificationOccurred('error');
          break;
        case 'selection':
          tg.HapticFeedback.selectionChanged();
          break;
        default:
          tg.HapticFeedback.impactOccurred('medium');
      }
    } catch (error) {
      console.warn('Haptic feedback failed:', error);
    }
  },

  // Show main button
  showMainButton: (text, onClick) => {
    try {
      const tg = telegram.getWebApp();
      if (!tg?.MainButton) return;

      tg.MainButton.text = text;
      tg.MainButton.show();
      tg.MainButton.onClick(onClick);
    } catch (error) {
      console.warn('Main button failed:', error);
    }
  },

  // Hide main button
  hideMainButton: () => {
    try {
      const tg = telegram.getWebApp();
      if (!tg?.MainButton) return;
      tg.MainButton.hide();
    } catch (error) {
      console.warn('Hide main button failed:', error);
    }
  },

  // Close app
  close: () => {
    try {
      const tg = telegram.getWebApp();
      tg?.close();
    } catch (error) {
      console.warn('Close app failed:', error);
    }
  }
};

// === Viral Sharing Utilities ===

export const sharing = {
  // Share game result
  shareGameResult: (score, combo, coins, rank = null) => {
    const tg = telegram.getWebApp();
    if (!tg?.switchInlineQuery) {
      console.warn('Sharing not available');
      return false;
    }

    const messages = [
      `🐱 Just scored ${score.toLocaleString()} points in Meowchi! Can you beat my ${combo}x combo?`,
      `😺 Earned ${coins} $Meow coins in this adorable match-3 game! My best combo was ${combo}x!`,
      `🎮 Having a blast with Meowchi! Just got ${score.toLocaleString()} points with some sweet combos!`,
      `🔥 On fire in Meowchi! ${score.toLocaleString()} points and ${coins} coins earned! 🎯`
    ];

    if (rank && rank <= 10) {
      messages.push(`🏆 Scored ${score.toLocaleString()} and I'm rank #${rank} in Meowchi! Can you make top 10?`);
    }

    const message = messages[Math.floor(Math.random() * messages.length)];
    
    try {
      tg.switchInlineQuery(message, ['users', 'groups']);
      telegram.haptic('light');
      return true;
    } catch (error) {
      console.error('Share failed:', error);
      return false;
    }
  },

  // Share achievement
  shareAchievement: (achievementName, reward = null) => {
    const tg = telegram.getWebApp();
    if (!tg?.switchInlineQuery) return false;

    const messages = [
      `🏆 Just unlocked "${achievementName}" in Meowchi! This game is so addictive! 🐱`,
      `⭐ Achievement unlocked: "${achievementName}"! Who else is playing this cute match-3 game?`,
      `🎯 New milestone in Meowchi: "${achievementName}"! The cats are so adorable! 😺`
    ];

    if (reward) {
      messages.push(`🎉 Unlocked "${achievementName}" and earned ${reward} bonus coins! 💰`);
    }

    const message = messages[Math.floor(Math.random() * messages.length)];
    
    try {
      tg.switchInlineQuery(message, ['users', 'groups']);
      telegram.haptic('success');
      return true;
    } catch (error) {
      console.error('Achievement share failed:', error);
      return false;
    }
  },

  // Share leaderboard rank
  shareRank: (rank, score, isImprovement = false) => {
    const tg = telegram.getWebApp();
    if (!tg?.switchInlineQuery) return false;

    let message;
    if (rank === 1) {
      message = `👑 I'm #1 on the Meowchi leaderboard with ${score.toLocaleString()} points! Can you dethrone me? 🐱`;
    } else if (rank <= 3) {
      message = `🥉 Made it to the top 3 in Meowchi! Currently rank #${rank}! 🏆`;
    } else if (rank <= 10) {
      message = `🏆 Top 10 in Meowchi! Rank #${rank} with ${score.toLocaleString()} points! 🚀`;
    } else if (rank <= 100) {
      message = `📈 Climbing the Meowchi rankings! Currently #${rank} - top 100! 🎯`;
    } else {
      message = `🎮 Playing Meowchi and improving! Current rank: #${rank}! 😺`;
    }

    if (isImprovement && rank > 1) {
      message = `🚀 Just improved my Meowchi ranking to #${rank}! Who can beat me? 🐱`;
    }

    try {
      tg.switchInlineQuery(message, ['users', 'groups']);
      telegram.haptic('light');
      return true;
    } catch (error) {
      console.error('Rank share failed:', error);
      return false;
    }
  },

  // Challenge friends
  challengeFriends: (score, gameMode = 'classic') => {
    const tg = telegram.getWebApp();
    if (!tg?.switchInlineQuery) return false;

    const messages = [
      `🎯 I scored ${score.toLocaleString()} in Meowchi! Can you beat me? Let's see who's the better cat feeder! 🐱`,
      `⚔️ Challenge accepted? My Meowchi score: ${score.toLocaleString()}! Your turn! 😺`,
      `🔥 Think you can beat ${score.toLocaleString()} points in Meowchi? Prove it! 🎮`
    ];

    const message = messages[Math.floor(Math.random() * messages.length)];
    
    try {
      tg.switchInlineQuery(message, ['users']);
      telegram.haptic('medium');
      return true;
    } catch (error) {
      console.error('Challenge failed:', error);
      return false;
    }
  },

  // Generate referral link
  generateReferralLink: (userId) => {
    const botUsername = process.env.BOT_USERNAME || 'meowchi_game_bot';
    return `https://t.me/${botUsername}?start=ref_${userId}`;
  },

  // Share referral invitation
  shareInvite: (userId) => {
    const tg = telegram.getWebApp();
    if (!tg?.switchInlineQuery) return false;

    const messages = [
      `🐱 Join me in Meowchi - the cutest match-3 game! We both get bonus coins! 💰`,
      `😺 Playing this amazing cat game called Meowchi! Join me and get bonus coins! 🎮`,
      `🎯 Found the perfect game for cat lovers - Meowchi! Play with me and earn coins! ⭐`
    ];

    const message = messages[Math.floor(Math.random() * messages.length)];
    
    try {
      tg.switchInlineQuery(message, ['users', 'groups']);
      telegram.haptic('light');
      return true;
    } catch (error) {
      console.error('Invite share failed:', error);
      return false;
    }
  }
};

// === API Helper Functions ===

export const api = {
  // Base API URL
  baseUrl: process.env.NODE_ENV === 'production' ? '' : 'http://localhost:3000',

  // Generic API call
  call: async (endpoint, options = {}) => {
    const url = `${api.baseUrl}${endpoint}`;
    const config = {
      headers: {
        'Content-Type': 'application/json',
      },
      ...options,
    };

    try {
      const response = await fetch(url, config);
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || `HTTP ${response.status}`);
      }
      
      return data;
    } catch (error) {
      console.error(`API call failed: ${endpoint}`, error);
      throw error;
    }
  },

  // User registration
  registerUser: async (telegramId, username = null) => {
    return api.call('/api/user/register', {
      method: 'POST',
      body: JSON.stringify({
        telegram_id: telegramId,
        telegram_username: username
      })
    });
  },

  // Update user profile
  updateProfile: async (telegramId, profileData) => {
    return api.call('/api/user/profile', {
      method: 'PUT',
      body: JSON.stringify({
        telegram_id: telegramId,
        ...profileData
      })
    });
  },

  // Get user stats
  getUserStats: async (telegramId) => {
    return api.call(`/api/user/${telegramId}/stats`);
  },

  // Submit game result
  submitGame: async (telegramId, gameData) => {
    return api.call('/api/game/complete', {
      method: 'POST',
      body: JSON.stringify({
        telegram_id: telegramId,
        ...gameData
      })
    });
  },

  // Get daily tasks
  getDailyTasks: async (telegramId) => {
    return api.call(`/api/user/${telegramId}/daily-tasks`);
  },

  // Update task progress
  updateTaskProgress: async (telegramId, taskId, progressValue) => {
    return api.call(`/api/user/${telegramId}/task-progress`, {
      method: 'POST',
      body: JSON.stringify({
        task_id: taskId,
        progress_value: progressValue
      })
    });
  },

  // Get leaderboard
  getLeaderboard: async (type = 'daily', options = {}) => {
    const params = new URLSearchParams({
      ...options
    });
    
    return api.call(`/api/leaderboard/${type}?${params}`);
  },

  // Process referral
  processReferral: async (referrerId, referredId) => {
    return api.call('/api/user/refer', {
      method: 'POST',
      body: JSON.stringify({
        referrer_id: referrerId,
        referred_id: referredId
      })
    });
  },

  // Get referral stats
  getReferralStats: async (telegramId) => {
    return api.call(`/api/user/${telegramId}/referrals`);
  }
};

// === Local Storage Utilities ===

export const storage = {
  // Get item from localStorage
  get: (key, defaultValue = null) => {
    try {
      const item = localStorage.getItem(key);
      return item ? JSON.parse(item) : defaultValue;
    } catch (error) {
      console.warn(`Failed to get ${key} from storage:`, error);
      return defaultValue;
    }
  },

  // Set item in localStorage
  set: (key, value) => {
    try {
      localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch (error) {
      console.warn(`Failed to set ${key} in storage:`, error);
      return false;
    }
  },

  // Remove item from localStorage
  remove: (key) => {
    try {
      localStorage.removeItem(key);
      return true;
    } catch (error) {
      console.warn(`Failed to remove ${key} from storage:`, error);
      return false;
    }
  },

  // Clear all localStorage
  clear: () => {
    try {
      localStorage.clear();
      return true;
    } catch (error) {
      console.warn('Failed to clear storage:', error);
      return false;
    }
  }
};

// === Formatting Utilities ===

export const format = {
  // Format numbers with commas
  number: (num) => {
    return parseInt(num || 0).toLocaleString();
  },

  // Format large numbers (1K, 1M, etc.)
  compactNumber: (num) => {
    const number = parseInt(num || 0);
    if (number < 1000) return number.toString();
    if (number < 1000000) return (number / 1000).toFixed(1) + 'K';
    if (number < 1000000000) return (number / 1000000).toFixed(1) + 'M';
    return (number / 1000000000).toFixed(1) + 'B';
  },

  // Format time duration
  duration: (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  },

  // Format date relative to now
  timeAgo: (date) => {
    const now = new Date();
    const diff = Math.floor((now - new Date(date)) / 1000);
    
    if (diff < 60) return 'just now';
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    if (diff < 2592000) return `${Math.floor(diff / 86400)}d ago`;
    return `${Math.floor(diff / 2592000)}mo ago`;
  },

  // Format combo display (matches game logic)
  combo: (comboValue) => {
    const combo = parseInt(comboValue || 0);
    return combo === 0 ? '0' : `${combo + 1}`;
  }
};

// === Validation Utilities ===

export const validate = {
  // Validate email
  email: (email) => {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
  },

  // Validate display name
  displayName: (name) => {
    return name && name.trim().length >= 2 && name.trim().length <= 50;
  },

  // Validate score range
  gameScore: (score) => {
    const num = parseInt(score);
    return !isNaN(num) && num >= 0 && num <= 10000;
  },

  // Validate combo range
  gameCombo: (combo) => {
    const num = parseInt(combo);
    return !isNaN(num) && num >= 0 && num <= 50;
  },

  // Validate Telegram user ID
  telegramId: (id) => {
    const num = parseInt(id);
    return !isNaN(num) && num > 0;
  }
};

// === Game State Utilities ===

export const game = {
  // Calculate coins earned from score
  calculateCoins: (score, combo = 0) => {
    const RATE = 0.10;
    const MIN = 10;
    const CAP = 100;
    const COMBO_BONUS = 0.05;
    
    const comboSteps = Math.max(0, Math.min(20, combo));
    const bonusMult = 1 + comboSteps * COMBO_BONUS;
    let coins = Math.round(Math.max(0, score) * RATE * bonusMult);
    
    return Math.max(MIN, Math.min(coins, CAP));
  },

  // Check for milestone achievements
  checkMilestones: (score, previousBest = 0) => {
    const milestones = [100, 500, 1000, 2500, 5000, 10000];
    const achieved = [];
    
    for (const milestone of milestones) {
      if (score >= milestone && previousBest < milestone) {
        achieved.push({
          type: 'score',
          value: milestone,
          message: `🎯 ${milestone.toLocaleString()} Points!`,
          coins: Math.floor(milestone * 0.1)
        });
      }
    }
    
    return achieved;
  },

  // Check combo achievements
  checkComboAchievements: (combo, previousBest = 0) => {
    const comboMilestones = [5, 10, 15, 20];
    const achieved = [];
    
    for (const milestone of comboMilestones) {
      if (combo >= milestone && previousBest < milestone) {
        achieved.push({
          type: 'combo',
          value: milestone,
          message: `🔥 ${milestone}x Combo Master!`,
          coins: milestone * 50
        });
      }
    }
    
    return achieved;
  },

  // Generate game stats summary
  generateStatsSummary: (gameResult, userStats) => {
    const isPersonalBest = gameResult.score > (userStats?.best_score || 0);
    const isNewComboRecord = gameResult.max_combo > (userStats?.best_combo || 0);
    
    return {
      isPersonalBest,
      isNewComboRecord,
      improvement: isPersonalBest ? gameResult.score - (userStats?.best_score || 0) : 0,
      rank: userStats?.rank || null,
      totalGames: (userStats?.games_played || 0) + 1,
      achievements: [
        ...game.checkMilestones(gameResult.score, userStats?.best_score),
        ...game.checkComboAchievements(gameResult.max_combo, userStats?.best_combo)
      ]
    };
  }
};

// === Analytics Utilities ===

export const analytics = {
  // Track game events
  trackEvent: (eventName, properties = {}) => {
    try {
      // Here you could integrate with analytics services
      console.log('Analytics Event:', eventName, properties);
      
      // Example: Send to your analytics endpoint
      // api.call('/api/analytics', {
      //   method: 'POST',
      //   body: JSON.stringify({ event: eventName, properties })
      // });
      
    } catch (error) {
      console.warn('Analytics tracking failed:', error);
    }
  },

  // Track game completion
  trackGameComplete: (gameResult, duration) => {
    analytics.trackEvent('game_complete', {
      score: gameResult.score,
      combo: gameResult.max_combo,
      coins: gameResult.coins,
      duration,
      moves_used: gameResult.moves_used
    });
  },

  // Track sharing events
  trackShare: (type, content = {}) => {
    analytics.trackEvent('content_shared', {
      share_type: type,
      ...content
    });
  },

  // Track user actions
  trackUserAction: (action, context = {}) => {
    analytics.trackEvent('user_action', {
      action,
      timestamp: Date.now(),
      ...context
    });
  }
};

// === Utility Constants ===

export const constants = {
  // Game constants
  GAME: {
    MAX_SCORE: 10000,
    MAX_COMBO: 50,
    MIN_COINS: 10,
    MAX_COINS: 100,
    DEFAULT_TIME: 60
  },

  // Task types
  TASK_TYPES: {
    GAMES_PLAYED: 'games_played',
    SINGLE_SCORE: 'single_score',
    MAX_COMBO: 'max_combo',
    REFERRALS: 'referrals',
    PAGE_VISIT: 'page_visit'
  },

  // Achievement types
  ACHIEVEMENT_TYPES: {
    SCORE: 'score',
    COMBO: 'combo',
    GAMES: 'games',
    SOCIAL: 'social',
    STREAK: 'streak'
  },

  // Leaderboard types
  LEADERBOARD_TYPES: {
    DAILY: 'daily',
    WEEKLY: 'weekly',
    ALL_TIME: 'alltime'
  }
};

// === Export Default Object ===

export default {
  telegram,
  sharing,
  api,
  storage,
  format,
  validate,
  game,
  analytics,
  constants
};
