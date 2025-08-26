// src/DailyTasks.jsx - Daily Tasks Component for Meowchi
import React, { useState, useEffect } from 'react';

// ... (DAILY_TASKS constant remains the same)
const DAILY_TASKS = [
  {
    id: 'play_3_games',
    title: 'Daily Player',
    description: 'Play 3 games today',
    reward: 200,
    icon: '🎮',
    target: 3,
    type: 'games_played'
  },
  {
    id: 'score_5000',
    title: 'High Scorer',
    description: 'Score 5,000+ points in one game',
    reward: 300,
    icon: '🎯',
    target: 5000,
    type: 'single_score'
  },
  {
    id: 'combo_5x',
    title: 'Combo Master',
    description: 'Get a 5x combo',
    reward: 400,
    icon: '🔥',
    target: 5,
    type: 'max_combo'
  },
  {
    id: 'invite_friend',
    title: 'Social Cat',
    description: 'Invite a friend to play',
    reward: 500,
    icon: '👥',
    target: 1,
    type: 'referrals'
  },
  {
    id: 'check_leaderboard',
    title: 'Competitive Spirit',
    description: 'Check the leaderboard',
    reward: 100,
    icon: '🏆',
    target: 1,
    type: 'page_visit'
  }
];

export default function DailyTasks({ userTelegramId, onTaskComplete }) {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [claimingId, setClaimingId] = useState(null); // NEW

  // Fetch daily tasks from server (unchanged)
  const fetchDailyTasks = async () => {
    if (!userTelegramId) return;

    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`/api/user/${userTelegramId}/daily-tasks`);
      const data = await response.json();

      if (response.ok) {
        setTasks(data.tasks || []);
      } else {
        throw new Error(data.error || 'Failed to fetch tasks');
      }
    } catch (err) {
      console.error('Failed to fetch daily tasks:', err);
      setError(err.message);
      // Fallback to showing tasks with no progress
      setTasks(DAILY_TASKS.map(task => ({ ...task, progress: 0, completed: false })));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDailyTasks();
    // Keep the auto-refresh behavior from the original file
    const interval = setInterval(fetchDailyTasks, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [userTelegramId]);

  // NEW: Claim button handler
  const handleClaim = async (taskId) => {
    if (claimingId || !userTelegramId) return;

    setClaimingId(taskId);
    try {
      const response = await fetch(`/api/user/${userTelegramId}/task-claim`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ task_id: taskId })
      });
      const result = await response.json();

      if (response.ok) {
        // Haptic feedback for success
        try {
          window.Telegram?.WebApp?.HapticFeedback?.notificationOccurred('success');
        } catch {}

        // Mark as claimed locally
        setTasks(prevTasks =>
          prevTasks.map(task => (task.id === taskId ? { ...task, claimed: true } : task))
        );

        // Inform parent to increase coin balance
        if (typeof onTaskComplete === 'function') {
          onTaskComplete(result.message, result.reward_earned);
        }
      } else {
        throw new Error(result.error || 'Failed to claim');
      }
    } catch (err) {
      console.error('Claim failed:', err);
      // Optionally show UI error here
    } finally {
      setClaimingId(null);
    }
  };

  // ---------- Loading state (unchanged) ----------
  if (loading) {
    return (
      <section className="section">
        <div className="title">📋 Daily Tasks</div>
        <div className="loading-state">
          <div className="loading-icon">😺</div>
          <div className="loading-text">Loading your daily tasks...</div>
        </div>
      </section>
    );
  }

  // ---------- Error state (unchanged) ----------
  if (error && tasks.length === 0) {
    return (
      <section className="section">
        <div className="title">📋 Daily Tasks</div>
        <div className="error-state">
          <div className="error-icon">😿</div>
          <div className="error-text">Failed to load tasks</div>
          <button className="btn" onClick={fetchDailyTasks}>
            Try Again
          </button>
        </div>
      </section>
    );
  }

  // ---------- Summary (UPDATED for 'claimed') ----------
  const completedTasks = tasks.filter(t => t.completed).length;
  const totalRewards = tasks.reduce((sum, t) => sum + (t.claimed ? t.reward : 0), 0);
  const availableRewards = tasks.reduce((sum, t) => sum + (!t.claimed && t.completed ? t.reward : 0), 0);

  return (
    <section className="section">
      <div className="title">📋 Daily Tasks</div>
      <div className="muted" style={{ marginBottom: '20px' }}>
        Complete tasks to earn bonus coins! Tasks reset daily.
      </div>

      {/* Summary Stats (unchanged layout) */}
      <div className="task-summary">
        <div className="summary-stat">
          <span className="summary-value">{completedTasks}/{tasks.length}</span>
          <span className="summary-label">Completed</span>
        </div>
        <div className="summary-stat">
          <span className="summary-value">{totalRewards}</span>
          <span className="summary-label">Coins Earned</span>
        </div>
        <div className="summary-stat">
          <span className="summary-value">{availableRewards}</span>
          <span className="summary-label">Still Available</span>
        </div>
      </div>

      {/* Tasks List */}
      <div className="tasks-list">
        {tasks.map((task) => (
          <div 
            key={task.id}
            className={`task-item ${task.completed ? 'completed' : ''} ${task.claimed ? 'claimed' : ''}`}
          >
            <div className="task-icon">{task.icon}</div>
            
            <div className="task-info">
              <div className="task-title">{task.title}</div>
              <div className="task-description">{task.description}</div>
              
              {/* Inline progress (kept consistent with original visuals) */}
              <div className="task-progress-container">
                <div className="task-progress-bar">
                  <div 
                    className="task-progress-fill" 
                    style={{ width: `${Math.min((task.progress / task.target) * 100, 100)}%` }}
                  ></div>
                </div>
                <div className="task-progress-text">
                  {Math.min(task.progress, task.target)}/{task.target}
                </div>
              </div>
            </div>
            
            {/* NEW: Claim/Claimed/Reward area */}
            <div className="task-reward-action">
              {task.claimed ? (
                <div className="claimed-badge">✅ Claimed</div>
              ) : task.completed ? (
                <button
                  className="btn primary claim-btn"
                  onClick={() => handleClaim(task.id)}
                  disabled={claimingId === task.id}
                >
                  {claimingId === task.id ? '...' : 'Claim'}
                </button>
              ) : (
                <>
                  <div className="reward-amount">+{task.reward}</div>
                  <div className="reward-currency">coins</div>
                </>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Empty state (unchanged) */}
      {tasks.length === 0 && !loading && (
        <div className="empty-state">
          <div className="empty-icon">📋</div>
          <div className="empty-text">No tasks available right now</div>
          <div className="muted small">Check back tomorrow for new tasks!</div>
        </div>
      )}

      {/* Styles (original retained; new rules appended) */}
      <style jsx>{`
        .task-summary {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 12px;
          margin-bottom: 24px;
        }

        .summary-stat {
          background: var(--surface);
          border-radius: 12px;
          padding: 12px;
          text-align: center;
          border: 1px solid var(--border);
        }

        .summary-value {
          display: block;
          font-size: 20px;
          font-weight: 800;
          color: var(--accent);
          margin-bottom: 2px;
        }

        .summary-label {
          font-size: 10px;
          color: var(--muted);
          font-weight: 600;
          text-transform: uppercase;
        }

        .tasks-list {
          display: grid;
          gap: 12px;
        }

        .task-item {
          display: flex;
          align-items: center;
          gap: 16px;
          padding: 16px;
          background: var(--card);
          border-radius: 16px;
          border: 1px solid var(--border);
          transition: all 0.2s ease;
        }

        .task-item:hover {
          background: var(--surface);
          transform: translateY(-1px);
        }

        .task-item.completed {
          background: var(--accent-light);
          border-color: var(--accent);
        }

        .task-icon {
          font-size: 28px;
          width: 44px;
          height: 44px;
          display: grid;
          place-items: center;
          background: var(--surface);
          border-radius: 12px;
          flex-shrink: 0;
        }

        .task-item.completed .task-icon {
          background: var(--accent);
        }

        .task-info {
          flex: 1;
          min-width: 0;
        }

        .task-title {
          font-size: 15px;
          font-weight: 700;
          color: var(--text);
          margin-bottom: 2px;
        }

        .task-description {
          font-size: 13px;
          color: var(--muted);
          margin-bottom: 8px;
        }

        .task-progress-container {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .task-progress-bar {
          flex: 1;
          height: 6px;
          background: var(--surface);
          border-radius: 3px;
          overflow: hidden;
          border: 1px solid var(--border);
        }

        .task-progress-fill {
          height: 100%;
          background: linear-gradient(90deg, var(--accent), var(--accent2));
          transition: width 0.3s ease;
          border-radius: 3px;
        }

        .task-progress-text {
          font-size: 11px;
          font-weight: 700;
          color: var(--muted);
          min-width: 35px;
        }

        .task-reward {
          text-align: center;
          flex-shrink: 0;
        }

        .reward-currency {
          font-size: 10px;
          color: var(--muted);
          font-weight: 600;
        }

        @media (max-width: 480px) {
          .task-summary {
            grid-template-columns: repeat(2, 1fr);
          }
          .summary-stat:nth-child(3) {
            grid-column: 1 / -1;
          }
          .task-item {
            padding: 12px;
            gap: 12px;
          }
          .task-icon {
            font-size: 24px;
            width: 36px;
            height: 36px;
          }
        }

        /* ===== NEW rules for claim mechanic ===== */
        .task-item.claimed {
          opacity: 0.7;
          background: var(--surface);
        }
        .task-reward-action {
          text-align: center;
          width: 90px;
          flex-shrink: 0;
        }
        .reward-amount {
          font-size: 16px;
          font-weight: 800;
          color: var(--accent);
        }
        .claim-btn {
          width: 100%;
          padding: 8px 12px;
          font-size: 14px;
        }
        .claimed-badge {
          font-size: 14px;
          font-weight: 700;
          color: var(--accent);
        }
      `}</style>
    </section>
  );
}
