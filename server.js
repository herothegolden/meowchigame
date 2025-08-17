import express from 'express';
import cors from 'cors';
import pg from 'pg';
import path from 'path';
import { fileURLToPath } from 'url';

const { Pool } = pg;
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = process.env.PORT || 3000;

// Database connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('dist'));

// Initialize database tables
async function initDatabase() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        telegram_id BIGINT UNIQUE,
        username VARCHAR(255),
        first_name VARCHAR(255),
        last_name VARCHAR(255),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS game_scores (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id),
        score INTEGER NOT NULL,
        game_duration INTEGER,
        matches_made INTEGER,
        max_combo INTEGER,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_game_scores_user_id ON game_scores(user_id);
      CREATE INDEX IF NOT EXISTS idx_game_scores_score ON game_scores(score DESC);
      CREATE INDEX IF NOT EXISTS idx_users_telegram_id ON users(telegram_id);
    `);

    console.log('Database tables initialized successfully');
  } catch (error) {
    console.error('Error initializing database:', error);
  }
}

// API Routes

// Get or create user
app.post('/api/user', async (req, res) => {
  try {
    const { telegram_id, username, first_name, last_name } = req.body;
    
    // Check if user exists
    let result = await pool.query(
      'SELECT * FROM users WHERE telegram_id = $1',
      [telegram_id]
    );
    
    if (result.rows.length === 0) {
      // Create new user
      result = await pool.query(
        `INSERT INTO users (telegram_id, username, first_name, last_name) 
         VALUES ($1, $2, $3, $4) 
         RETURNING *`,
        [telegram_id, username, first_name, last_name]
      );
    } else {
      // Update existing user info
      result = await pool.query(
        `UPDATE users 
         SET username = $2, first_name = $3, last_name = $4, updated_at = CURRENT_TIMESTAMP
         WHERE telegram_id = $1 
         RETURNING *`,
        [telegram_id, username, first_name, last_name]
      );
    }
    
    res.json({ success: true, user: result.rows[0] });
  } catch (error) {
    console.error('Error managing user:', error);
    res.status(500).json({ success: false, error: 'Database error' });
  }
});

// Save game score
app.post('/api/score', async (req, res) => {
  try {
    const { telegram_id, score, game_duration, matches_made, max_combo } = req.body;
    
    // Get user ID
    const userResult = await pool.query(
      'SELECT id FROM users WHERE telegram_id = $1',
      [telegram_id]
    );
    
    if (userResult.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }
    
    const userId = userResult.rows[0].id;
    
    // Save score
    const scoreResult = await pool.query(
      `INSERT INTO game_scores (user_id, score, game_duration, matches_made, max_combo)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [userId, score, game_duration, matches_made, max_combo]
    );
    
    res.json({ success: true, score: scoreResult.rows[0] });
  } catch (error) {
    console.error('Error saving score:', error);
    res.status(500).json({ success: false, error: 'Database error' });
  }
});

// Get user's best score
app.get('/api/user/:telegram_id/best-score', async (req, res) => {
  try {
    const { telegram_id } = req.params;
    
    const result = await pool.query(
      `SELECT gs.* FROM game_scores gs
       JOIN users u ON gs.user_id = u.id
       WHERE u.telegram_id = $1
       ORDER BY gs.score DESC
       LIMIT 1`,
      [telegram_id]
    );
    
    res.json({ 
      success: true, 
      bestScore: result.rows.length > 0 ? result.rows[0] : null 
    });
  } catch (error) {
    console.error('Error getting best score:', error);
    res.status(500).json({ success: false, error: 'Database error' });
  }
});

// Get leaderboard
app.get('/api/leaderboard', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 100;
    
    const result = await pool.query(
      `SELECT 
         u.username,
         u.first_name,
         u.last_name,
         MAX(gs.score) as best_score,
         COUNT(gs.id) as games_played,
         MAX(gs.created_at) as last_played
       FROM users u
       JOIN game_scores gs ON u.id = gs.user_id
       GROUP BY u.id, u.username, u.first_name, u.last_name
       ORDER BY best_score DESC
       LIMIT $1`,
      [limit]
    );
    
    res.json({ success: true, leaderboard: result.rows });
  } catch (error) {
    console.error('Error getting leaderboard:', error);
    res.status(500).json({ success: false, error: 'Database error' });
  }
});

// Get user stats
app.get('/api/user/:telegram_id/stats', async (req, res) => {
  try {
    const { telegram_id } = req.params;
    
    const result = await pool.query(
      `SELECT 
         COUNT(*) as total_games,
         MAX(score) as best_score,
         ROUND(AVG(score)) as average_score,
         SUM(matches_made) as total_matches,
         MAX(max_combo) as best_combo
       FROM game_scores gs
       JOIN users u ON gs.user_id = u.id
       WHERE u.telegram_id = $1`,
      [telegram_id]
    );
    
    res.json({ success: true, stats: result.rows[0] });
  } catch (error) {
    console.error('Error getting user stats:', error);
    res.status(500).json({ success: false, error: 'Database error' });
  }
});

// Health check
app.get('/api/health', async (req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({ success: true, message: 'API and database are healthy' });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Database connection failed' });
  }
});

// Serve React app for all other routes
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

// Initialize database and start server
initDatabase().then(() => {
  app.listen(port, '0.0.0.0', () => {
    console.log(`Server running on port ${port}`);
  });
});

export default app;
