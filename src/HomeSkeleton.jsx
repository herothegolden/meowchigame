// src/HomeSkeleton.jsx
import React from 'react';
import './home.css'; // Reuse styles from home.css for layout

export default function HomeSkeleton() {
  return (
    <div className="home-root">
      <div className="home-center">
        <div className="profile-card">
          <div className="profile-header">
            <div className="profile-avatar-container">
              <div className="profile-avatar skeleton" style={{ borderRadius: '24px' }}></div>
            </div>
            <div className="profile-info">
              <div className="profile-name-section">
                <div className="skeleton skeleton-text" style={{ width: '60%', height: '24px' }}></div>
              </div>
              <div className="skeleton skeleton-text" style={{ width: '40%', height: '14px', marginTop: '8px' }}></div>
            </div>
          </div>

          <div className="stats-grid">
            {Array(4).fill(0).map((_, i) => (
              <div key={i} className="stat-item">
                <div className="skeleton skeleton-text" style={{ width: '50%', height: '24px', margin: '0 auto 4px' }}></div>
                <div className="skeleton skeleton-text" style={{ width: '70%', height: '12px', margin: '0 auto' }}></div>
              </div>
            ))}
          </div>

          <div className="quick-actions">
            <div className="action-btn skeleton" style={{ height: '89px' }}></div>
            <div className="action-btn skeleton" style={{ height: '89px' }}></div>
          </div>
        </div>
      </div>
    </div>
  );
}
