// src/ShareButtons.jsx - Viral Sharing Component for Meowchi
import React, { useState } from 'react';

export default function ShareButtons({ 
  score = 0, 
  combo = 0, 
  coins = 0, 
  rank = null,
  gameResult = null,
  userTelegramId = null,
  variant = 'game-over' // 'game-over', 'achievement', 'leaderboard', 'general'
}) {
  const [sharing, setSharing] = useState(false);
  const [copied, setCopied] = useState(false);

  const getTelegramWebApp = () => {
    return window.Telegram?.WebApp;
  };

  // Generate share messages based on context
  const getShareMessages = () => {
    const messages = {
      'game-over': [
        `🐱 Just scored ${score.toLocaleString()} points in Meowchi! Can you beat my ${combo}x combo?`,
        `😺 Earned ${coins} $Meow coins in this adorable match-3 game! My best combo was ${combo}x!`,
        `🎮 Having a blast with Meowchi! Just got ${score.toLocaleString()} points with some sweet combos!`,
        `🔥 On fire in Meowchi! ${score.toLocaleString()} points and ${coins} coins earned! 🎯`
      ],
      'achievement': [
        `🏆 Just unlocked a new achievement in Meowchi! This game is addictive! 🐱`,
        `⭐ Achievement unlocked in Meowchi! Who else is playing this cute match-3 game?`,
        `🎯 Reached a new milestone in Meowchi! The cats are so adorable! 😺`
      ],
      'leaderboard': [
        rank <= 10 
          ? `👑 I'm rank #${rank} on the Meowchi leaderboard! Can you make it to the top 10?`
          : `📈 Climbing the Meowchi rankings! Currently at #${rank}! 🚀`,
        `🏆 Check out my ranking in Meowchi! This match-3 game is so fun! 🐱`
      ],
      'general': [
        `🐱 Playing Meowchi - the cutest match-3 game on Telegram! Join me! 😺`,
        `🎮 Found this amazing cat-themed match-3 game called Meowchi! So addictive! 🔥`,
        `😻 Meowchi is the perfect game for cat lovers! Match treats and earn coins! 💰`
      ]
    };
    
    return messages[variant] || messages['general'];
  };

  // Share to Telegram chats
  const shareToChats = () => {
    const tg = getTelegramWebApp();
    if (!tg || !tg.switchInlineQuery) {
      console.warn('Telegram WebApp not available');
      return;
    }

    setSharing(true);
    
    try {
      const messages = getShareMessages();
      const randomMessage = messages[Math.floor(Math.random() * messages.length)];
      
      // Use Telegram's inline sharing
      tg.switchInlineQuery(randomMessage, ['users', 'groups', 'channels']);
      
      // Haptic feedback
      try {
        tg.HapticFeedback?.impactOccurred('medium');
      } catch {}
      
    } catch (error) {
      console.error('Share failed:', error);
      alert('Sharing not available. Please try again.');
    } finally {
      setTimeout(() => setSharing(false), 1000);
    }
  };

  // Challenge specific friends
  const challengeFriends = () => {
    const tg = getTelegramWebApp();
    if (!tg) return;

    const challengeText = `🎯 I scored ${score.toLocaleString()} in Meowchi! Can you beat me? Let's see who's the better cat feeder! 🐱`;
    
    try {
      // Try to use inline sharing first
      if (tg.switchInlineQuery) {
        tg.switchInlineQuery(challengeText, ['users']);
      } else {
        // Fallback to opening share dialog
        const botUsername = 'meowchi_game_bot'; // Replace with your actual bot username
        const shareUrl = `https://t.me/share/url?url=https://t.me/${botUsername}&text=${encodeURIComponent(challengeText)}`;
        tg.openTelegramLink?.(shareUrl);
      }
      
      // Haptic feedback
      try {
        tg.HapticFeedback?.impactOccurred('light');
      } catch {}
      
    } catch (error) {
      console.error('Challenge failed:', error);
    }
  };

  // Generate referral link
  const generateReferralLink = () => {
    const botUsername = 'meowchi_game_bot'; // Replace with your actual bot username
    return `https://t.me/${botUsername}?start=ref_${userTelegramId}`;
  };

  // Copy referral link
  const copyReferralLink = async () => {
    const link = generateReferralLink();
    
    try {
      if (navigator.clipboard) {
        await navigator.clipboard.writeText(link);
      } else {
        // Fallback for older browsers
        const textarea = document.createElement('textarea');
        textarea.value = link;
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
      }
      
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      
      // Haptic feedback
      try {
        getTelegramWebApp()?.HapticFeedback?.notificationOccurred('success');
      } catch {}
      
    } catch (error) {
      console.error('Copy failed:', error);
      alert('Could not copy link. Please try again.');
    }
  };

  // Share with custom message
  const shareCustomMessage = (message) => {
    const tg = getTelegramWebApp();
    if (!tg?.switchInlineQuery) return;
    
    try {
      tg.switchInlineQuery(message, ['users', 'groups']);
    } catch (error) {
      console.error('Custom share failed:', error);
    }
  };

  // Different layouts based on variant
  const renderGameOverButtons = () => (
    <div className="share-buttons-container game-over">
      <div className="share-title">📤 Share Your Score!</div>
      <div className="share-buttons-grid">
        <button 
          className="share-btn primary"
          onClick={shareToChats}
          disabled={sharing}
        >
          <span className="share-icon">📢</span>
          <span className="share-text">Share to Chats</span>
        </button>
        
        <button 
          className="share-btn"
          onClick={challengeFriends}
          disabled={sharing}
        >
          <span className="share-icon">⚔️</span>
          <span className="share-text">Challenge Friends</span>
        </button>
      </div>
      
      <div className="share-stats">
        <span className="share-stat">🎯 {score.toLocaleString()} points</span>
        <span className="share-stat">🔥 {combo}x combo</span>
        <span className="share-stat">💰 {coins} coins</span>
      </div>
    </div>
  );

  const renderLeaderboardButtons = () => (
    <div className="share-buttons-container leaderboard">
      <button 
        className="share-btn compact"
        onClick={shareToChats}
        disabled={sharing}
      >
        <span className="share-icon">🏆</span>
        <span className="share-text">Share My Rank</span>
      </button>
    </div>
  );

  const renderGeneralButtons = () => (
    <div className="share-buttons-container general">
      <div className="share-title">🐱 Invite Friends to Meowchi</div>
      <div className="share-buttons-grid">
        <button 
          className="share-btn primary"
          onClick={shareToChats}
          disabled={sharing}
        >
          <span className="share-icon">📤</span>
          <span className="share-text">Share Game</span>
        </button>
        
        <button 
          className="share-btn"
          onClick={copyReferralLink}
          disabled={sharing}
        >
          <span className="share-icon">{copied ? '✅' : '🔗'}</span>
          <span className="share-text">{copied ? 'Copied!' : 'Copy Link'}</span>
        </button>
      </div>
    </div>
  );

  const renderAchievementButtons = () => (
    <div className="share-buttons-container achievement">
      <button 
        className="share-btn celebration"
        onClick={shareToChats}
        disabled={sharing}
      >
        <span className="share-icon">🎉</span>
        <span className="share-text">Share Achievement</span>
      </button>
    </div>
  );

  // Render based on variant
  const renderButtons = () => {
    switch (variant) {
      case 'game-over':
        return renderGameOverButtons();
      case 'leaderboard':
        return renderLeaderboardButtons();
      case 'achievement':
        return renderAchievementButtons();
      case 'general':
      default:
        return renderGeneralButtons();
    }
  };

  return (
    <>
      {renderButtons()}
      
      {/* Styles */}
      <style jsx>{`
        .share-buttons-container {
          margin: 16px 0;
        }

        .share-title {
          text-align: center;
          font-size: 16px;
          font-weight: 700;
          color: var(--text);
          margin-bottom: 12px;
        }

        .share-buttons-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 12px;
          margin-bottom: 12px;
        }

        .share-buttons-container.general .share-buttons-grid,
        .share-buttons-container.game-over .share-buttons-grid {
          grid-template-columns: 1fr 1fr;
        }

        .share-buttons-container.leaderboard,
        .share-buttons-container.achievement {
          text-align: center;
        }

        .share-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          padding: 12px 16px;
          border: 1px solid var(--border);
          border-radius: 12px;
          background: var(--card);
          color: var(--text);
          font-weight: 600;
          font-size: 14px;
          cursor: pointer;
          transition: all 0.2s ease;
          user-select: none;
        }

        .share-btn:hover {
          background: var(--surface);
          border-color: var(--accent);
          transform: translateY(-1px);
        }

        .share-btn:active {
          transform: translateY(0);
        }

        .share-btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
          transform: none;
        }

        .share-btn.primary {
          background: linear-gradient(135deg, var(--accent), var(--accent2));
          border: none;
          color: white;
          box-shadow: 0 4px 12px rgba(212, 175, 55, 0.3);
        }

        .share-btn.primary:hover {
          box-shadow: 0 6px 16px rgba(212, 175, 55, 0.4);
          background: linear-gradient(135deg, var(--accent), var(--accent2));
        }

        .share-btn.compact {
          padding: 8px 12px;
          font-size: 12px;
          border-radius: 8px;
        }

        .share-btn.celebration {
          background: linear-gradient(135deg, #ff6b6b, #ffd93d);
          border: none;
          color: white;
          animation: celebration-pulse 2s ease-in-out infinite;
        }

        @keyframes celebration-pulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.05); }
        }

        .share-icon {
          font-size: 18px;
        }

        .share-btn.compact .share-icon {
          font-size: 14px;
        }

        .share-text {
          white-space: nowrap;
        }

        .share-stats {
          display: flex;
          justify-content: center;
          gap: 16px;
          flex-wrap: wrap;
          margin-top: 8px;
        }

        .share-stat {
          font-size: 12px;
          color: var(--muted);
          font-weight: 600;
          background: var(--surface);
          padding: 4px 8px;
          border-radius: 6px;
        }

        @media (max-width: 480px) {
          .share-buttons-grid {
            grid-template-columns: 1fr;
            gap: 8px;
          }
          
          .share-stats {
            gap: 8px;
            font-size: 11px;
          }
          
          .share-btn {
            padding: 10px 12px;
            font-size: 13px;
          }
        }
      `}</style>
    </>
  );
}

// Export helper functions for use in other components
export const shareUtils = {
  // Share game completion
  shareGameResult: (score, combo, coins) => {
    const tg = window.Telegram?.WebApp;
    if (!tg?.switchInlineQuery) return false;
    
    const message = `🐱 Just scored ${score.toLocaleString()} in Meowchi with a ${combo}x combo! Can you beat me? 😺`;
    tg.switchInlineQuery(message, ['users', 'groups']);
    return true;
  },

  // Share achievement
  shareAchievement: (achievement) => {
    const tg = window.Telegram?.WebApp;
    if (!tg?.switchInlineQuery) return false;
    
    const message = `🏆 Just unlocked "${achievement}" in Meowchi! This game is so addictive! 🐱`;
    tg.switchInlineQuery(message, ['users', 'groups']);
    return true;
  },

  // Share leaderboard position
  shareRank: (rank, score) => {
    const tg = window.Telegram?.WebApp;
    if (!tg?.switchInlineQuery) return false;
    
    let message;
    if (rank === 1) {
      message = `👑 I'm #1 on the Meowchi leaderboard! Can you dethrone me? 🐱`;
    } else if (rank <= 10) {
      message = `🏆 Made it to top 10 in Meowchi! Currently rank #${rank}! 🚀`;
    } else {
      message = `📈 Climbing the Meowchi rankings! Currently #${rank}! 🎯`;
    }
    
    tg.switchInlineQuery(message, ['users', 'groups']);
    return true;
  },

  // Generate referral link
  generateReferralLink: (telegramId) => {
    const botUsername = 'meowchi_game_bot'; // Replace with your actual bot username
    return `https://t.me/${botUsername}?start=ref_${telegramId}`;
  },

  // Check if sharing is available
  isShareAvailable: () => {
    return !!(window.Telegram?.WebApp?.switchInlineQuery);
  },

  // Trigger haptic feedback
  haptic: (type = 'medium') => {
    try {
      const tg = window.Telegram?.WebApp;
      if (tg?.HapticFeedback) {
        if (type === 'light') tg.HapticFeedback.impactOccurred('light');
        else if (type === 'heavy') tg.HapticFeedback.impactOccurred('heavy');
        else tg.HapticFeedback.impactOccurred('medium');
      }
    } catch (error) {
      console.warn('Haptic feedback not available:', error);
    }
  }
};
