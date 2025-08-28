// src/StreakTracker.jsx
import React from 'react';

const REWARD_TRACK = [
  { day: 1, type: 'coins', amount: 100, icon: '💰' },
  { day: 2, type: 'coins', amount: 200, icon: '💰' },
  { day: 3, type: 'coins', amount: 300, icon: '💰' },
  { day: 4, type: 'powerup', item_id: 'shuffle', amount: 1, icon: '🐾' },
  { day: 5, type: 'coins', amount: 500, icon: '💰' },
  { day: 6, type: 'powerup', item_id: 'hammer', amount: 1, icon: '🍪' },
  { day: 7, type: 'powerup', item_id: 'bomb', amount: 1, icon: '💣' },
];

export default function StreakTracker({ streakData }) {
  if (!streakData) {
    // Render a skeleton or minimal state if data is not yet available
    return (
      <div className="streak-tracker">
        <h3 className="streak-title">🔥 Daily Streak Rewards</h3>
        <div className="streak-days">
          {REWARD_TRACK.map((reward) => (
            <div key={reward.day} className="streak-day">
              <div className="day-label">Day {reward.day}</div>
              <div className="day-reward">{reward.icon}</div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  const currentStreakDay = streakData.streak || 0;

  return (
    <div className="streak-tracker">
      <h3 className="streak-title">🔥 Daily Streak Rewards</h3>
      <div className="streak-days">
        {REWARD_TRACK.map((reward) => {
          const isClaimed = streakData.claimed_today
            ? currentStreakDay >= reward.day
            : currentStreakDay > reward.day;
          
          const isCurrent = currentStreakDay === reward.day && !streakData.claimed_today;

          let statusClass = '';
          if (isClaimed) statusClass = 'claimed';
          if (isCurrent) statusClass = 'current';

          return (
            <div key={reward.day} className={`streak-day ${statusClass}`}>
              <div className="day-label">Day {reward.day}</div>
              <div className="day-reward">{reward.icon}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
