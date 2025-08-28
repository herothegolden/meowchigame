// src/SquadsSkeleton.jsx
import React from 'react';

const SkeletonMemberItem = () => (
  <div className="member-item" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
    <div className="member-rank skeleton skeleton-text" style={{ width: '30px', height: '20px', borderRadius: '6px' }}></div>
    <div className="member-avatar skeleton" style={{ width: '40px', height: '40px', borderRadius: '12px' }}></div>
    <div className="member-info" style={{ flex: 1 }}>
      <div className="skeleton skeleton-text" style={{ width: '60%', height: '16px', marginBottom: '4px' }}></div>
      <div className="skeleton skeleton-text" style={{ width: '40%', height: '12px' }}></div>
    </div>
  </div>
);

export default function SquadsSkeleton() {
  return (
    <section className="section">
      <div className="title skeleton skeleton-text" style={{ width: '40%', height: '24px', marginBottom: '16px' }}></div>
      <div className="squad-info-card" style={{ background: 'transparent', border: 'none', padding: 0 }}>
        <div className="squad-header">
          <div className="squad-icon skeleton" style={{ width: '50px', height: '50px' }}></div>
          <div>
            <div className="squad-name skeleton skeleton-text" style={{ width: '150px', height: '20px', marginBottom: '8px' }}></div>
            <div className="squad-stats skeleton skeleton-text" style={{ width: '200px', height: '14px' }}></div>
          </div>
        </div>
        <div className="squad-actions">
          <div className="btn skeleton" style={{ width: '120px', height: '45px' }}></div>
          <div className="btn skeleton" style={{ width: '120px', height: '45px' }}></div>
        </div>
        <div className="members-section" style={{ marginTop: 20 }}>
          <div className="members-title skeleton skeleton-text" style={{ width: '30%', height: '18px', marginBottom: '12px' }}></div>
          <div className="members-list">
            {Array(4).fill(0).map((_, i) => <SkeletonMemberItem key={i} />)}
          </div>
        </div>
      </div>
    </section>
  );
}
