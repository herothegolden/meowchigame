// src/LeaderboardSkeleton.jsx
import React from 'react';

const SkeletonLeaderboardItem = () => (
  <div className="leaderboard-item" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
    <div className="rank-display skeleton skeleton-text" style={{ width: 55, height: 28, borderRadius: '8px' }}></div>
    <div className="member-avatar skeleton" style={{ width: 40, height: 40, borderRadius: '12px' }}></div>
    <div className="player-info">
      <div className="skeleton skeleton-text" style={{ width: '70%', height: '16px', marginBottom: '6px' }}></div>
      <div className="skeleton skeleton-text" style={{ width: '50%', height: '12px' }}></div>
    </div>
    <div className="player-score skeleton skeleton-text" style={{ width: '60px', height: '20px', borderRadius: '8px' }}></div>
  </div>
);

export default function LeaderboardSkeleton() {
  return (
    <section className="section">
      <div className="title skeleton skeleton-text" style={{ width: '30%', height: '24px', marginBottom: '20px' }}></div>
      <div className="tabs" style={{ marginBottom: '20px' }}>
        <div className="tab skeleton" style={{ width: '80px', height: '35px', borderRadius: '20px' }}></div>
        <div className="tab skeleton" style={{ width: '80px', height: '35px', borderRadius: '20px' }}></div>
        <div className="tab skeleton" style={{ width: '80px', height: '35px', borderRadius: '20px' }}></div>
      </div>
      <div className="leaderboard-list">
        {Array(7).fill(0).map((_, i) => <SkeletonLeaderboardItem key={i} />)}
      </div>
    </section>
  );
}
