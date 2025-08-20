// Add these routes to your existing server.js
// This extends your current Express server with leaderboard functionality

import pg from 'pg';
const { Pool } = pg;

// Database connection (add to your server.js after existing imports)
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

// Add these routes BEFORE your existing "app.get('*')" catch-all route

// Get or create user by Telegram ID
app.post('/api/user/register', async (req, res) => {
  try {
    const { telegram_id, telegram_username } = req.body;
    
    if (!telegram_id) {
      return res.status(400).json({ error: 'Telegram ID is required' });
    }

    // Check if user exists
    const existingUser = await pool.query(
      'SELECT * FROM users WHERE telegram_id = $1',
      [telegram_id]
    );

    if (existingUser.rows.length > 0) {
      return res.json({ user: existingUser.rows[0] });
    }

    // Create new user
    const newUser = await pool.query(
      'INSERT INTO users (telegram_id, display_name, profile_completed) VALUES ($1, $2, $3) RETURNING *',
      [telegram_id, `Stray Cat #${telegram_id.toString().slice(-5)}`, false]
    );

    res.json({ user: newUser.rows[0] });
  } catch (error) {
    console.error('User registration error:', error);
    res.status(500).json({ error: 'Failed to register user' });
  }
});

// Update user profile
app.put('/api/user/profile', async (req, res) => {
  try {
    const { telegram_id, display_name, country_flag } = req.body;
    
    if (!telegram_id) {
      return res.status(400).json({ error: 'Telegram ID is required' });
    }

    const updatedUser = await pool.query(
      'UPDATE users SET display_name = $1, country_flag = $2, profile_completed = $3 WHERE telegram_id = $4 RETURNING *',
      [display_name, country_flag, true, telegram_id]
    );

    if (updatedUser.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ user: updatedUser.rows[0] });
  } catch (error) {
    console.error('Profile update error:', error);
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

// Submit game score
app.post('/api/game/complete', async (req, res) => {
  try {
    const { telegram_id, score, coins_earned, moves_used, max_combo, game_duration } = req.body;
    
    // Input validation
    if (!telegram_id || score === undefined) {
      return res.status(400).json({ error: 'Telegram ID and score are required' });
    }

    // Anti-cheat validation
    if (score < 0 || score > 10000) {
      return res.status(400).json({ error: 'Invalid score range' });
    }
    
    if (moves_used && (moves_used <= 0 || moves_used > 50)) {
      return res.status(400).json({ error: 'Invalid moves count' });
    }
    
    if (game_duration && game_duration < 30) {
      return res.status(400).json({ error: 'Game too short - minimum 30 seconds' });
    }

    // Get user ID
    const user = await pool.query(
      'SELECT id FROM users WHERE telegram_id = $1',
      [telegram_id]
    );

    if (user.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Rate limiting - max 10 games per hour
    const recentGames = await pool.query(
      'SELECT COUNT(*) FROM games WHERE user_id = $1 AND played_at > NOW() - INTERVAL \'1 hour\'',
      [user.rows[0].id]
    );

    if (parseInt(recentGames.rows[0].count) >= 10) {
      return res.status(429).json({ error: 'Too many games played recently. Please wait.' });
    }

    // Save game
    const game = await pool.query(
      'INSERT INTO games (user_id, score, coins_earned, moves_used, max_combo, game_duration) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
      [user.rows[0].id, score, coins_earned || 0, moves_used, max_combo || 0, game_duration]
    );

    res.json({ 
      message: 'Game saved successfully', 
      game: game.rows[0],
      user_needs_profile: !user.rows[0]?.profile_completed 
    });
  } catch (error) {
    console.error('Game save error:', error);
    res.status(500).json({ error: 'Failed to save game' });
  }
});

// Get leaderboard (daily/weekly/alltime)
app.get('/api/leaderboard/:type', async (req, res) => {
  try {
    const { type } = req.params;
    const { country } = req.query;
    const { telegram_id } = req.query; // To find user's rank
    
    let dateFilter = '';
    let groupBy = '';
    
    // Convert to Tashkent time (UTC+5)
    const tashkentOffset = "AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Tashkent'";
    
    switch (type) {
      case 'daily':
        dateFilter = `AND DATE(g.played_at ${tashkentOffset}) = DATE(NOW() ${tashkentOffset})`;
        break;
      case 'weekly':
        dateFilter = `AND DATE_TRUNC('week', g.played_at ${tashkentOffset}) = DATE_TRUNC('week', NOW() ${tashkentOffset})`;
        break;
      case 'alltime':
        dateFilter = '';
        break;
      default:
        return res.status(400).json({ error: 'Invalid leaderboard type' });
    }

    let countryFilter = '';
    if (country && country !== 'false') {
      countryFilter = 'AND u.country_flag IS NOT NULL';
      if (country !== 'true') {
        countryFilter += ` AND u.country_flag = '${country}'`;
      }
    }

    // Get top 100 players
    const leaderboard = await pool.query(`
      SELECT 
        u.display_name,
        u.country_flag,
        u.telegram_id,
        SUM(g.score) as total_score,
        COUNT(g.id) as games_played,
        MAX(g.score) as best_score,
        MAX(g.max_combo) as best_combo,
        ROW_NUMBER() OVER (ORDER BY SUM(g.score) DESC) as rank
      FROM users u
      JOIN games g ON u.id = g.user_id
      WHERE u.profile_completed = true ${dateFilter} ${countryFilter}
      GROUP BY u.id, u.display_name, u.country_flag, u.telegram_id
      ORDER BY total_score DESC
      LIMIT 100
    `);

    // Get user's specific rank if not in top 100
    let userRank = null;
    if (telegram_id) {
      const userRankQuery = await pool.query(`
        WITH ranked_users AS (
          SELECT 
            u.telegram_id,
            SUM(g.score) as total_score,
            ROW_NUMBER() OVER (ORDER BY SUM(g.score) DESC) as rank
          FROM users u
          JOIN games g ON u.id = g.user_id
          WHERE u.profile_completed = true ${dateFilter} ${countryFilter}
          GROUP BY u.id, u.telegram_id
        )
        SELECT rank, total_score FROM ranked_users WHERE telegram_id = $1
      `, [telegram_id]);
      
      if (userRankQuery.rows.length > 0) {
        userRank = userRankQuery.rows[0];
      }
    }

    res.json({ 
      leaderboard: leaderboard.rows,
      userRank,
      type,
      country: country || null,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Leaderboard error:', error);
    res.status(500).json({ error: 'Failed to fetch leaderboard' });
  }
});

// Get user stats
app.get('/api/user/:telegram_id/stats', async (req, res) => {
  try {
    const { telegram_id } = req.params;
    
    const stats = await pool.query(`
      SELECT 
        u.display_name,
        u.country_flag,
        u.profile_completed,
        COUNT(g.id) as games_played,
        COALESCE(SUM(g.score), 0) as total_score,
        COALESCE(MAX(g.score), 0) as best_score,
        COALESCE(MAX(g.max_combo), 0) as best_combo,
        COALESCE(SUM(g.coins_earned), 0) as total_coins_earned
      FROM users u
      LEFT JOIN games g ON u.id = g.user_id
      WHERE u.telegram_id = $1
      GROUP BY u.id, u.display_name, u.country_flag, u.profile_completed
    `, [telegram_id]);

    if (stats.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ stats: stats.rows[0] });
  } catch (error) {
    console.error('User stats error:', error);
    res.status(500).json({ error: 'Failed to fetch user stats' });
  }
});

// Health check for database
app.get('/api/db/health', async (req, res) => {
  try {
    const result = await pool.query('SELECT NOW() as server_time');
    res.json({ 
      status: 'healthy', 
      database: 'connected',
      server_time: result.rows[0].server_time 
    });
  } catch (error) {
    console.error('Database health check failed:', error);
    res.status(500).json({ 
      status: 'unhealthy', 
      database: 'disconnected',
      error: error.message 
    });
  }
});

// Export pool for other modules to use
export { pool };
