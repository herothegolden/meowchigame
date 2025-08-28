// src/DailyTasksSkeleton.jsx
import React from 'react';

export default function DailyTasksSkeleton() {
  return (
    <section className="section">
      <div className="title skeleton skeleton-text" style={{ width: '40%', height: '20px' }}></div>
      <div className="muted skeleton skeleton-text" style={{ width: '80%', height: '14px', marginBottom: '20px' }}></div>
      
      <div className="tasks-list" style={{ display: 'grid', gap: '12px' }}>
        {Array(5).fill(0).map((_, i) => (
          <div key={i} className="task-item skeleton" style={{ height: '95px', background: 'var(--surface)' }}>
          </div>
        ))}
      </div>
    </section>
  );
}
