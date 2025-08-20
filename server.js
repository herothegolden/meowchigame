import express from "express";
import compression from "compression";
import helmet from "helmet";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";
import pg from 'pg';

const { Pool } = pg;
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// Database connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

// Test database connection
pool.query('SELECT NOW()', (err, res) => {
  if (err) {
    console.error('❌ Database connection failed:', err);
  } else {
    console.log('✅ Database connected at:', res.rows[0].now);
  }
});

// Add request logging
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
  next();
});

app.use(compression());
app.use(express.json()); // Parse JSON bodies

// Allow inline style (we inject a <style> tag) and Telegram WebApp script.
app.use(
  helmet({
    contentSecurityPolicy: {
      useDefaults: true,
      directives: {
        "default-src": ["'self'"],
        "script-src": ["'self'", "'unsafe-inline'", "https://telegram.org"],
        "style-src": ["'self'", "'unsafe-inline'"],
        "img-src": ["'self'", "data:", "https:"],
        "connect-src": ["'self'"],
        "frame-ancestors": ["'self'", "https://*.t.me", "https://web.telegram.org"]
      }
    }
  })
);

const dist = path.join(__dirname, "dist");

// Check if dist folder exists
if (!fs.existsSync(dist)) {
  console.error("❌ dist folder not found! Make sure the build completed successfully.");
  process.exit(1);
}

// Check if index.html exists
const indexPath = path.join(dist, "index.html");
if (!fs.existsSync(indexPath)) {
  console.error("❌ index.html not found in dist folder!");
  process.exit(1);
}

console.log("✅ Static files found, setting up server...");

app.use(express.static(dist, { maxAge: "1y", index: false }));

// ============= DATABASE SETUP ENDPOINT =============
app.get('/api/setup/database', async (req, res) => {
  try {
    console.log('🔧 Setting up database tables...');
    
    // Drop existing tables if they exist (clean slate)
    await pool.query('DROP TABLE IF EXISTS games CASCADE');
    await pool.query('DROP TABLE IF EXISTS users CASCADE');
    
    // Create users table
    await pool.query(`
      CREATE TABLE users (
        id SERIAL PRIMARY KEY,
        telegram_id BIGINT UNIQUE NOT NULL,
        display_name VARCHAR(50),
        country_flag VARCHAR(10),
        profile_completed BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `);
    
    // Create games table
    await pool.query(`
      CREATE TABLE games (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        score INTEGER NOT NULL CHECK (score >= 0 AND score <= 10000),
        coins_earned INTEGER DEFAULT 0,
        moves_used INTEGER CHECK (moves_used > 0 AND moves_used <= 50),
        max_combo INTEGER DEFAULT 0,
        game_duration INTEGER,
        played_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `);
    
    // Create indexes for fast queries
    await pool.query('CREATE INDEX idx_games_user_id ON games(user_id)');
    await pool.query('CREATE INDEX idx_games_played_at ON games(played_at)');
    await pool.query('CREATE INDEX idx_games_score ON games(score)');
    await pool.query('CREATE INDEX idx_users_telegram_id ON users(telegram_id)');
    
    // Create trigger function for updating updated_at
    await pool.query(`
      CREATE OR REPLACE FUNCTION update_updated_at_column()
      RETURNS TRIGGER AS $$
      BEGIN
          NEW.updated_at = NOW();
          RETURN NEW;
      END;
      $$ language 'plpgsql'
    `);
    
    // Create trigger
    await pool.query(`
      CREATE TRIGGER update_users_updated_at 
          BEFORE UPDATE ON users 
          FOR EACH ROW 
          EXECUTE FUNCTION update_updated_at_column()
    `);
    
    // Verify tables were created
    const tables = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name
    `);
    
    console.log('✅ Database setup complete!');
    
    res.json({
      success: true,
      message: 'Database tables created successfully!',
      tables: tables.rows.map(row => row.table_name),
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('❌ Database setup failed:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      message: 'Failed to create database tables'
    });
  }
});

// ============= LEADERBOARD API ROUTES =============

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

    // Create new user with Stray Cat name
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

    // Get user
    const user = await pool.query(
      'SELECT id, profile_completed FROM users WHERE telegram_id = $1',
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
      user_needs_profile: !user.rows[0].profile_completed 
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
    const { country, telegram_id } = req.query;
    
    let dateFilter = '';
    
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
            u.display_name,
            u.country_flag,
            SUM(g.score) as total_score,
            ROW_NUMBER() OVER (ORDER BY SUM(g.score) DESC) as rank
          FROM users u
          JOIN games g ON u.id = g.user_id
          WHERE u.profile_completed = true ${dateFilter} ${countryFilter}
          GROUP BY u.id, u.telegram_id, u.display_name, u.country_flag
        )
        SELECT * FROM ranked_users WHERE telegram_id = $1
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

// ============= EXISTING ROUTES =============

// Health check endpoint - more detailed
app.get("/health", (req, res) => {
  const health = {
    status: "ok",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    env: process.env.NODE_ENV || "development"
  };
  console.log("🥕 Health check requested:", health);
  res.json(health);
});

// Database health check
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

// API test endpoint
app.get("/api/test", (req, res) => {
  res.json({ message: "🍬 Candy Crush Cats API is working!" });
});

// SPA fallback with error handling
app.get("*", (req, res) => {
  try {
    console.log(`📄 Serving index.html for: ${req.url}`);
    res.sendFile(indexPath);
  } catch (error) {
    console.error("❌ Error serving index.html:", error);
    res.status(500).send("Internal Server Error");
  }
});

// Global error handler
app.use((err, req, res, next) => {
  console.error("💥 Global error handler:", err);
  res.status(500).json({ 
    error: "Internal Server Error",
    message: process.env.NODE_ENV === "development" ? err.message : "Something went wrong"
  });
});

const port = process.env.PORT || 3000;

const server = app.listen(port, "0.0.0.0", () => {
  console.log(`🍬 Candy Crush Cats server running on port ${port}`);
  console.log(`🌐 Local: http://localhost:${port}`);
  console.log(`🚀 Environment: ${process.env.NODE_ENV || "development"}`);
  console.log(`📁 Serving from: ${dist}`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('🛑 SIGTERM received, shutting down gracefully');
  server.close(() => {
    console.log('✅ Process terminated');
  });
});

process.on('SIGINT', () => {
  console.log('🛑 SIGINT received, shutting down gracefully');
  server.close(() => {
    console.log('✅ Process terminated');
  });
});

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
  console.error('💥 Uncaught Exception:', err);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('💥 Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});
