// src/DailyRewardModal.jsx
import React, { useState } from 'react';

const REWARD_TRACK = [
  { day: 1, type: 'coins', amount: 100, icon: '💰' },
  { day: 2, type: 'coins', amount: 200, icon: '💰' },
  { day: 3, type: 'coins', amount: 300, icon: '💰' },
  { day: 4, type: 'powerup', item_id: 'shuffle', amount: 1, icon: '🐾' },
  { day: 5, type: 'coins', amount: 500, icon: '💰' },
  { day: 6, type: 'powerup', item_id: 'hammer', amount: 1, icon: '🍪' },
  { day: 7, type: 'powerup', item_id: 'bomb', amount: 1, icon: '💣' },
];

export default function DailyRewardModal({ show, onClose, onClaim, streakData, userTelegramId }) {
  const [claiming, setClaiming] = useState(false);
  const [error, setError] = useState(null);

  const handleClaim = async () => {
    if (claiming || streakData.claimed_today) return;
    setClaiming(true);
    setError(null);
    try {
      const tg = window.Telegram?.WebApp;
      const response = await fetch('/api/user/claim-reward', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          telegram_id: userTelegramId,
          initData: tg?.initData,
        }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Failed to claim reward');
      
      onClaim(result);
    } catch (err) {
      setError(err.message);
      try { window.Telegram?.WebApp?.HapticFeedback?.notificationOccurred('error'); } catch (e) {}
    } finally {
      setClaiming(false);
    }
  };

  if (!show) return null;

  const currentStreakDay = streakData.streak;

  return (
    <div className="modal-overlay">
      <div className="modal-content profile-modal daily-reward-modal">
        <div className="modal-header">
          <h2 className="modal-title">🔥 Daily Streak Reward</h2>
          <p className="modal-subtitle">Log in every day for bigger prizes!</p>
        </div>
        <div className="modal-body">
          {error && <div className="error-message">{error}</div>}
          <div className="streak-days-visual">
            {REWARD_TRACK.map((reward) => {
              const isClaimed = currentStreakDay > reward.day;
              const isCurrent = currentStreakDay === reward.day && !streakData.claimed_today;
              const isFuture = currentStreakDay < reward.day;
              
              let statusClass = '';
              if (isClaimed) statusClass = 'claimed';
              if (isCurrent) statusClass = 'current';

              return (
                <div key={reward.day} className={`reward-day-item ${statusClass}`}>
                  <div className="day-label">Day {reward.day}</div>
                  <div className="reward-icon">{reward.icon}</div>
                  <div className="reward-amount">
                    {reward.type === 'coins' ? `+${reward.amount}` : `+${reward.amount} ${reward.item_id}`}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
        <div className="modal-footer" style={{ flexDirection: 'column', gap: '8px' }}>
          <button
            className="btn primary"
            onClick={handleClaim}
            disabled={claiming || streakData.claimed_today}
          >
            {claiming ? 'Claiming...' : streakData.claimed_today ? 'Claimed for Today!' : 'Claim Reward'}
          </button>
          {!streakData.claimed_today && <button className="btn" onClick={onClose}>Claim Later</button>}
        </div>
      </div>
    </div>
  );
}
