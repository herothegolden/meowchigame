import React, { useState, useEffect } from 'react';
import ShareButtons from './ShareButtons.jsx'; // Import the sharing component

// COUNTRY_FLAGS constant remains the same, so it's omitted here for brevity.
// Just make sure it's still at the top of your file.
const COUNTRY_FLAGS = [
  { flag: '🇺🇸', name: 'United States' }, { flag: '🇬🇧', name: 'United Kingdom' },
  { flag: '🇨🇦', name: 'Canada' }, { flag: '🇦🇺', name: 'Australia' },
  { flag: '🇩🇪', name: 'Germany' }, { flag: '🇫🇷', name: 'France' },
  { flag: '🇮�', name: 'Italy' }, { flag: '🇪🇸', name: 'Spain' },
  { flag: '🇯🇵', name: 'Japan' }, { flag: '🇰🇷', name: 'South Korea' },
  { flag: '🇨🇳', name: 'China' }, { flag: '🇮🇳', name: 'India' },
  { flag: '🇧🇷', name: 'Brazil' }, { flag: '🇲🇽', name: 'Mexico' },
  { flag: '🇷🇺', name: 'Russia' }, { flag: '🇺🇿', name: 'Uzbekistan' },
  { flag: '🇹🇷', name: 'Turkey' }, { flag: '🇸🇦', name: 'Saudi Arabia' },
  { flag: '🇦🇪', name: 'UAE' }, { flag: '🇳🇱', name: 'Netherlands' },
  { flag: '🇸🇪', name: 'Sweden' }, { flag: '🇳🇴', name: 'Norway' },
  { flag: '🇩🇰', name: 'Denmark' }, { flag: '🇵🇱', name: 'Poland' },
  { flag: '🇨🇿', name: 'Czech Republic' }, { flag: '🇭🇺', name: 'Hungary' },
  { flag: '🇦🇹', name: 'Austria' }, { flag: '🇨🇭', name: 'Switzerland' },
  { flag: '🇧🇪', name: 'Belgium' }, { flag: '🇵🇹', name: 'Portugal' },
  { flag: '🇬🇷', name: 'Greece' }, { flag: '🇮🇱', name: 'Israel' },
  { flag: '🇪🇬', name: 'Egypt' }, { flag: '🇿🇦', name: 'South Africa' },
  { flag: '🇳🇬', name: 'Nigeria' }, { flag: '🇰🇪', name: 'Kenya' },
  { flag: '🇲🇦', name: 'Morocco' }, { flag: '🇦🇷', name: 'Argentina' },
  { flag: '🇨🇱', name: 'Chile' }, { flag: '🇨🇴', name: 'Colombia' },
  { flag: '🇵🇪', name: 'Peru' }, { flag: '🇻🇪', name: 'Venezuela' },
  { flag: '🇹🇭', name: 'Thailand' }, { flag: '🇻🇳', name: 'Vietnam' },
  { flag: '🇮🇩', name: 'Indonesia' }, { flag: '🇲🇾', name: 'Malaysia' },
  { flag: '🇸🇬', name: 'Singapore' }, { flag: '🇵🇭', name: 'Philippines' },
  { flag: '🇧🇩', name: 'Bangladesh' }, { flag: '🇵🇰', name: 'Pakistan' },
  { flag: '🇱🇰', name: 'Sri Lanka' }, { flag: '🇳🇵', name: 'Nepal' },
];


export default function Leaderboard({ userTelegramId, userNeedsProfile }) {
  const [rankingType, setRankingType] = useState('players');
  const [timeFilter, setTimeFilter] = useState('daily');
  
  const [showCountryOnly, setShowCountryOnly] = useState(false);
  const [leaderboardData, setLeaderboardData] = useState([]);
  const [userRank, setUserRank] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [universeTime, setUniverseTime] = useState('');
  const [currentUserCountry, setCurrentUserCountry] = useState(null);

  // NEW: Track leaderboard visit for daily task
  useEffect(() => {
    const trackVisit = async () => {
      if (userTelegramId) {
        try {
          await fetch('/api/tasks/track-action', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              telegram_id: userTelegramId,
              task_id: 'check_leaderboard',
              initData: window.Telegram?.WebApp?.initData
            }),
          });
        } catch (err) {
          console.error("Failed to track leaderboard visit:", err);
        }
      }
    };
    trackVisit();
  }, [userTelegramId]);

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const time = new Intl.DateTimeFormat('en-US', {
        timeZone: 'Asia/Tashkent',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
      }).format(now);
      setUniverseTime(time);
    };

    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  const fetchLeaderboard = async () => {
    setLoading(true);
    setError(null);
    try {
      let endpoint, params;
      
      if (rankingType === 'squads') {
        endpoint = '/api/squads/leaderboard';
        params = new URLSearchParams();
      } else {
        endpoint = `/api/leaderboard/${timeFilter}`;
        params = new URLSearchParams({
          country: showCountryOnly ? 'true' : 'false',
          ...(userTelegramId && { telegram_id: userTelegramId })
        });
      }

      const response = await fetch(`${endpoint}?${params}`);
      if (!response.ok) throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      
      const data = await response.json();
      if (data.error) throw new Error(data.error);

      setLeaderboardData(data.leaderboard || []);
      setUserRank(rankingType === 'players' ? data.userRank : null);
      setCurrentUserCountry(rankingType === 'players' ? data.country : null);
      setLastUpdated(new Date());

    } catch (err) {
      console.error('Leaderboard fetch error:', err);
      setError(err.message || 'Failed to load leaderboard');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLeaderboard();
  }, [rankingType, timeFilter, showCountryOnly, userTelegramId]);


  const getRankDisplay = (rank) => {
    switch (rank) {
      case 1: return '🥇'; case 2: return '🥈'; case 3: return '🥉';
      default: return `#${rank}`;
    }
  };

  const formatScore = (score) => (parseInt(score) || 0).toLocaleString();
  const getDisplayName = (player) => player.display_name || `Stray Cat #${player.telegram_id?.toString().slice(-5) || '00000'}`;
  const getLoadingMessage = () => "Purr-cessing rankings...";
  const getEmptyMessage = () => {
      if(rankingType === 'squads') return "No squads have ranked yet. Create one!";
      return "No cats have played today... be the first! 😺";
  };

  const isUserInTop100 = () => leaderboardData.some(p => p.telegram_id == userTelegramId);

  return (
    <section className="section">
      <div className="leaderboard-header">
        <div className="title-row">
          <div className="title">🏆 Rankings</div>
          <div className="tashkent-time">
            <span className="time-icon">🕐</span>
            <span className="time-text">{universeTime} Meowchi Universe Time</span>
          </div>
        </div>
      </div>

      <div className="ranking-type-switch">
        <button 
          className={`switch-btn ${rankingType === 'players' ? 'active' : ''}`}
          onClick={() => setRankingType('players')}
        >
          Players
        </button>
        <button 
          className={`switch-btn ${rankingType === 'squads' ? 'active' : ''}`}
          onClick={() => setRankingType('squads')}
        >
          Squads
        </button>
      </div>

      {rankingType === 'players' && (
        <div className="tabs">
          {[ { key: 'daily', label: 'Daily' }, { key: 'weekly', label: 'Weekly' }, { key: 'alltime', label: 'All Time' } ]
          .map((tab) => (
            <div
              key={tab.key}
              className={`tab ${timeFilter === tab.key ? 'active' : ''}`}
              onClick={() => setTimeFilter(tab.key)}
            >
              {tab.label}
            </div>
          ))}
        </div>
      )}

      <div className="filters">
        {rankingType === 'players' && (
          <label className="country-filter">
            <input type="checkbox" checked={showCountryOnly} onChange={(e) => setShowCountryOnly(e.target.checked)} />
            <span className="checkbox-custom"></span>
            <span className="filter-text">My Country Only {showCountryOnly && currentUserCountry && `(${currentUserCountry})`}</span>
          </label>
        )}
        {lastUpdated && <div className="last-updated">Updated: {lastUpdated.toLocaleTimeString()}</div>}
      </div>

      {loading && <div className="loading-state"><div className="loading-icon">😺</div><div className="loading-text">{getLoadingMessage()}</div></div>}
      {error && !loading && <div className="error-state"><div className="error-icon">😿</div><div className="error-text">{error}</div><button className="btn" onClick={fetchLeaderboard}>Try Again</button></div>}
      {!loading && !error && (
        <>
          {leaderboardData.length > 0 ? (
            <div className="leaderboard-list">
              {rankingType === 'players' ? (
                leaderboardData.map((player) => (
                  <div key={player.telegram_id} className={`leaderboard-item ${player.telegram_id == userTelegramId ? 'current-user' : ''}`}>
                    <div className="rank-display">{getRankDisplay(player.rank)}</div>
                    <div className="player-info">
                      <div className="player-name">
                        {player.country_flag && <span className="country-flag">{player.country_flag}</span>}
                        <span className="name">{getDisplayName(player)}</span>
                      </div>
                      <div className="player-stats">{formatScore(player.games_played)} games • Best: {formatScore(player.best_score)}</div>
                    </div>
                    <div className="player-score">{formatScore(player.total_score)}</div>
                  </div>
                ))
              ) : (
                leaderboardData.map((squad, index) => (
                  <div key={squad.id} className="leaderboard-item">
                    <div className="rank-display">{getRankDisplay(index + 1)}</div>
                    <div className="player-info">
                      <div className="player-name">
                        <span className="squad-icon">{squad.icon}</span>
                        <span className="name">{squad.name}</span>
                      </div>
                      <div className="player-stats">{squad.member_count} members</div>
                    </div>
                    <div className="player-score">{formatScore(squad.total_score)}</div>
                  </div>
                ))
              )}
            </div>
          ) : (
            <div className="empty-state"><div className="empty-icon">😸</div><div className="empty-text">{getEmptyMessage()}</div></div>
          )}

          {rankingType === 'players' && userRank && !isUserInTop100() && (
            <div className="user-rank-section">
              <div className="section-divider"><span className="divider-text">Your Rank</span></div>
              <div className="leaderboard-item current-user">
                <div className="rank-display">#{userRank.rank}</div>
                <div className="player-info">
                  <div className="player-name">
                    {userRank.country_flag && <span className="country-flag">{userRank.country_flag}</span>}
                    <span className="name">{getDisplayName(userRank)}</span>
                  </div>
                  <div className="player-stats">{formatScore(userRank.games_played)} games • Best: {formatScore(userRank.best_score)}</div>
                </div>
                <div className="player-score">{formatScore(userRank.total_score)}</div>
              </div>
              <ShareButtons
                variant="leaderboard"
                rank={userRank.rank}
                score={userRank.total_score}
                userTelegramId={userTelegramId}
              />
            </div>
          )}
        </>
      )}

      <style jsx>{`
        .ranking-type-switch {
          display: flex;
          background: var(--surface);
          border-radius: 12px;
          padding: 4px;
          margin-bottom: 16px;
        }
        .switch-btn {
          flex: 1;
          padding: 10px;
          border: none;
          background: transparent;
          border-radius: 9px;
          font-size: 14px;
          font-weight: 600;
          color: var(--muted);
          cursor: pointer;
          transition: all 0.2s ease;
        }
        .switch-btn.active {
          background: var(--card);
          color: var(--text);
          box-shadow: 0 2px 4px rgba(0,0,0,0.05);
        }
        .squad-icon {
          font-size: 16px;
          margin-right: 8px;
        }
      `}</style>
    </section>
  );
}
�
