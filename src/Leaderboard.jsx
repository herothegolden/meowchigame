import React, { useState, useEffect } from 'react';

// Country flags for the dropdown
const COUNTRY_FLAGS = [
  { flag: '🇺🇸', name: 'United States' },
  { flag: '🇬🇧', name: 'United Kingdom' },
  { flag: '🇨🇦', name: 'Canada' },
  { flag: '🇦🇺', name: 'Australia' },
  { flag: '🇩🇪', name: 'Germany' },
  { flag: '🇫🇷', name: 'France' },
  { flag: '🇮🇹', name: 'Italy' },
  { flag: '🇪🇸', name: 'Spain' },
  { flag: '🇯🇵', name: 'Japan' },
  { flag: '🇰🇷', name: 'South Korea' },
  { flag: '🇨🇳', name: 'China' },
  { flag: '🇮🇳', name: 'India' },
  { flag: '🇧🇷', name: 'Brazil' },
  { flag: '🇲🇽', name: 'Mexico' },
  { flag: '🇷🇺', name: 'Russia' },
  { flag: '🇺🇿', name: 'Uzbekistan' },
  { flag: '🇹🇷', name: 'Turkey' },
  { flag: '🇸🇦', name: 'Saudi Arabia' },
  { flag: '🇦🇪', name: 'UAE' },
  { flag: '🇳🇱', name: 'Netherlands' },
  { flag: '🇸🇪', name: 'Sweden' },
  { flag: '🇳🇴', name: 'Norway' },
  { flag: '🇩🇰', name: 'Denmark' },
  { flag: '🇵🇱', name: 'Poland' },
  { flag: '🇨🇿', name: 'Czech Republic' },
  { flag: '🇭🇺', name: 'Hungary' },
  { flag: '🇦🇹', name: 'Austria' },
  { flag: '🇨🇭', name: 'Switzerland' },
  { flag: '🇧🇪', name: 'Belgium' },
  { flag: '🇵🇹', name: 'Portugal' },
  { flag: '🇬🇷', name: 'Greece' },
  { flag: '🇮🇱', name: 'Israel' },
  { flag: '🇪🇬', name: 'Egypt' },
  { flag: '🇿🇦', name: 'South Africa' },
  { flag: '🇳🇬', name: 'Nigeria' },
  { flag: '🇰🇪', name: 'Kenya' },
  { flag: '🇲🇦', name: 'Morocco' },
  { flag: '🇦🇷', name: 'Argentina' },
  { flag: '🇨🇱', name: 'Chile' },
  { flag: '🇨🇴', name: 'Colombia' },
  { flag: '🇵🇪', name: 'Peru' },
  { flag: '🇻🇪', name: 'Venezuela' },
  { flag: '🇹🇭', name: 'Thailand' },
  { flag: '🇻🇳', name: 'Vietnam' },
  { flag: '🇮🇩', name: 'Indonesia' },
  { flag: '🇲🇾', name: 'Malaysia' },
  { flag: '🇸🇬', name: 'Singapore' },
  { flag: '🇵🇭', name: 'Philippines' },
  { flag: '🇧🇩', name: 'Bangladesh' },
  { flag: '🇵🇰', name: 'Pakistan' },
  { flag: '🇱🇰', name: 'Sri Lanka' },
  { flag: '🇳🇵', name: 'Nepal' },
];

export default function Leaderboard({ userTelegramId, userNeedsProfile }) {
  const [leaderboardType, setLeaderboardType] = useState('daily');
  const [showCountryOnly, setShowCountryOnly] = useState(false);
  const [leaderboardData, setLeaderboardData] = useState([]);
  const [userRank, setUserRank] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [tashkentTime, setTashkentTime] = useState('');
  const [currentUserCountry, setCurrentUserCountry] = useState(null);

  // Tashkent time clock
  useEffect(() => {
    const updateTashkentTime = () => {
      const now = new Date();
      const tashkentTime = new Intl.DateTimeFormat('en-US', {
        timeZone: 'Asia/Tashkent',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
      }).format(now);
      setTashkentTime(tashkentTime);
    };

    updateTashkentTime();
    const interval = setInterval(updateTashkentTime, 1000);
    return () => clearInterval(interval);
  }, []);

  // Fetch leaderboard data
  const fetchLeaderboard = async () => {
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams({
        country: showCountryOnly ? 'true' : 'false',
        ...(userTelegramId && { telegram_id: userTelegramId })
      });

      const response = await fetch(`/api/leaderboard/${leaderboardType}?${params}`);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();

      if (data.error) {
        throw new Error(data.error);
      }

      // Validate response structure
      if (!Array.isArray(data.leaderboard)) {
        console.warn('Invalid leaderboard data structure:', data);
        setLeaderboardData([]);
      } else {
        setLeaderboardData(data.leaderboard);
      }
      
      setUserRank(data.userRank || null);
      setCurrentUserCountry(data.country || null);
      setLastUpdated(new Date());

    } catch (err) {
      console.error('Leaderboard fetch error:', err);
      setError(err.message || 'Failed to load leaderboard');
      setLeaderboardData([]);
      setUserRank(null);
    } finally {
      setLoading(false);
    }
  };

  // Initial load and updates when dependencies change
  useEffect(() => {
    fetchLeaderboard();
  }, [leaderboardType, showCountryOnly, userTelegramId]);

  // Auto-refresh every 30 seconds
  useEffect(() => {
    const interval = setInterval(fetchLeaderboard, 30000);
    return () => clearInterval(interval);
  }, [leaderboardType, showCountryOnly, userTelegramId]);

  // Get medal or rank display
  const getRankDisplay = (rank) => {
    switch (rank) {
      case 1: return '🥇';
      case 2: return '🥈'; 
      case 3: return '🥉';
      default: return `#${rank}`;
    }
  };

  // Format score with commas
  const formatScore = (score) => {
    const num = parseInt(score) || 0;
    return num.toLocaleString();
  };

  // Safe display name with fallback
  const getDisplayName = (player) => {
    return player.display_name || `Stray Cat #${player.telegram_id?.toString().slice(-5) || '00000'}`;
  };

  // Loading messages
  const getLoadingMessage = () => {
    const messages = [
      "Cats are calculating...",
      "Meowchi is counting treats...",
      "Organizing the leaderboard...",
      "Feeding the database cats...",
      "Purr-cessing rankings..."
    ];
    return messages[Math.floor(Math.random() * messages.length)];
  };

  // Empty state messages
  const getEmptyMessage = () => {
    if (showCountryOnly) {
      const countryName = currentUserCountry ? 
        COUNTRY_FLAGS.find(c => c.flag === currentUserCountry)?.name || 'your country' :
        'your country';
      return `No players from ${countryName} yet... be the first! 😺`;
    }
    
    switch (leaderboardType) {
      case 'daily':
        return "No cats have played today... be the first! 😺";
      case 'weekly':
        return "This week's rankings are empty... start playing! 🐱";
      case 'alltime':
        return "No all-time champions yet... make history! 👑";
      default:
        return "No players found... time to play! 🎮";
    }
  };

  // Check if user is in top 100
  const isUserInTop100 = () => {
    return leaderboardData.some(p => p.telegram_id == userTelegramId);
  };

  return (
    <section className="section">
      <div className="leaderboard-header">
        <div className="title-row">
          <div className="title">🏆 Rankings</div>
          <div className="tashkent-time">
            <span className="time-icon">🕐</span>
            <span className="time-text">{tashkentTime} Tashkent</span>
          </div>
        </div>
      </div>

      {/* Tabs for Daily/Weekly/All-time */}
      <div className="tabs">
        {[
          { key: 'daily', label: 'Daily' },
          { key: 'weekly', label: 'Weekly' },
          { key: 'alltime', label: 'All Time' }
        ].map((tab) => (
          <div
            key={tab.key}
            className={`tab ${leaderboardType === tab.key ? 'active' : ''}`}
            onClick={() => setLeaderboardType(tab.key)}
          >
            {tab.label}
          </div>
        ))}
      </div>

      {/* Country filter and last updated */}
      <div className="filters">
        <label className="country-filter">
          <input
            type="checkbox"
            checked={showCountryOnly}
            onChange={(e) => setShowCountryOnly(e.target.checked)}
          />
          <span className="checkbox-custom"></span>
          <span className="filter-text">
            My Country Only
            {showCountryOnly && currentUserCountry && (
              <span style={{ marginLeft: '8px' }}>
                {currentUserCountry}
              </span>
            )}
          </span>
        </label>
        
        {lastUpdated && (
          <div className="last-updated">
            Updated: {lastUpdated.toLocaleTimeString()}
          </div>
        )}
      </div>

      {/* Loading state */}
      {loading && (
        <div className="loading-state">
          <div className="loading-icon">😺</div>
          <div className="loading-text">{getLoadingMessage()}</div>
        </div>
      )}

      {/* Error state */}
      {error && !loading && (
        <div className="error-state">
          <div className="error-icon">😿</div>
          <div className="error-text">Oops! {error}</div>
          <button className="btn" onClick={fetchLeaderboard}>
            Try Again
          </button>
        </div>
      )}

      {/* Leaderboard content */}
      {!loading && !error && (
        <>
          {/* Top 100 players */}
          {leaderboardData.length > 0 ? (
            <div className="leaderboard-list">
              {leaderboardData.map((player, index) => (
                <div 
                  key={`${player.telegram_id}-${index}`}
                  className={`leaderboard-item ${player.telegram_id == userTelegramId ? 'current-user' : ''}`}
                >
                  <div className="rank-display">
                    {getRankDisplay(player.rank)}
                  </div>
                  
                  <div className="player-info">
                    <div className="player-name">
                      {player.country_flag && (
                        <span className="country-flag">{player.country_flag}</span>
                      )}
                      <span className="name">{getDisplayName(player)}</span>
                    </div>
                    <div className="player-stats">
                      {formatScore(player.games_played)} games • Best: {formatScore(player.best_score)}
                    </div>
                  </div>
                  
                  <div className="player-score">
                    {formatScore(player.total_score)}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="empty-state">
              <div className="empty-icon">😸</div>
              <div className="empty-text">{getEmptyMessage()}</div>
            </div>
          )}

          {/* User's rank if not in top 100 */}
          {userRank && !isUserInTop100() && (
            <div className="user-rank-section">
              <div className="section-divider">
                <span className="divider-text">Your Rank</span>
              </div>
              
              <div className="leaderboard-item current-user">
                <div className="rank-display">
                  #{userRank.rank}
                </div>
                
                <div className="player-info">
                  <div className="player-name">
                    {userRank.country_flag && (
                      <span className="country-flag">{userRank.country_flag}</span>
                    )}
                    <span className="name">{getDisplayName(userRank)}</span>
                  </div>
                  <div className="player-stats">
                    {formatScore(userRank.games_played)} games • Best: {formatScore(userRank.best_score)}
                  </div>
                </div>
                
                <div className="player-score">
                  {formatScore(userRank.total_score)}
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </section>
  );
}
