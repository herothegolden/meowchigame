// server.js - COMPLETE FIXED VERSION WITH LEADERBOARD FIX
import express from "express";
import compression from "compression";
import helmet from "helmet";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import { Pool } from "pg";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(express.json({ limit: "5mb" }));
app.use(compression());
app.use(helmet({
  contentSecurityPolicy: false,
}));

// ---------- Database ----------
const DATABASE_URL = process.env.DATABASE_URL;
let pool = null;
let dbConnected = false;

if (DATABASE_URL) {
  pool = new Pool({
    connectionString: DATABASE_URL,
    ssl: DATABASE_URL.includes("localhost") ? false : { rejectUnauthorized: false },
  });
  pool.connect()
    .then(() => { 
      dbConnected = true; 
      console.log("✅ Database connected");
      // Auto-setup database on startup
      setupDatabaseIfNeeded();
    })
    .catch((err) => { 
      dbConnected = false; 
      console.error("❌ Database connection failed:", err.message); 
    });
} else {
  console.warn("⚠️  DATABASE_URL not set. API routes will return 503.");
}

function requireDB(req, res, next) {
  if (!pool || !dbConnected) {
    return res.status(503).json({ error: "Database unavailable" });
  }
  next();
}

// ---------- Static build checks ----------
const dist = path.join(__dirname, "dist");

if (!fs.existsSync(dist)) {
  console.error("❌ dist folder not found! Make sure the build completed successfully.");
  process.exit(1);
}
const indexPath = path.join(dist, "index.html");
if (!fs.existsSync(indexPath)) {
  console.error("❌ index.html not found in dist folder!");
  process.exit(1);
}
console.log("✅ Static files found, setting up server...");
app.use(express.static(dist, { maxAge: "1y", index: false }));

// Auto-setup database function
async function setupDatabaseIfNeeded() {
  try {
    console.log("🔧 Checking if database setup is needed...");
    
    // Check if tables exist
    const tablesCheck = await pool.query(`
      SELECT table_name FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_name IN ('users', 'games')
    `);
    
    if (tablesCheck.rows.length < 2) {
      console.log("🔧 Tables missing. Setting up database...");
      await setupDatabase();
    } else {
      console.log("✅ Database tables already exist");
    }
  } catch (error) {
    console.error("❌ Database setup check failed:", error);
  }
}

// Database setup function
async function setupDatabase() {
  try {
    console.log("🔧 Setting up database tables...");

    // Drop existing tables if they exist
    await pool.query("DROP TABLE IF EXISTS games CASCADE");
    await pool.query("DROP TABLE IF EXISTS users CASCADE");

    // Create users table
    await pool.query(`
      CREATE TABLE users (
        id SERIAL PRIMARY KEY,
        telegram_id BIGINT UNIQUE NOT NULL,
        display_name VARCHAR(50),
        country_flag VARCHAR(10),
        profile_picture TEXT,
        profile_completed BOOLEAN DEFAULT FALSE,
        name_changed BOOLEAN DEFAULT FALSE,
        picture_changed BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
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
      );
    `);

    // Create indexes
    await pool.query("CREATE INDEX idx_games_user_id ON games(user_id)");
    await pool.query("CREATE INDEX idx_games_played_at ON games(played_at)");
    await pool.query("CREATE INDEX idx_games_score ON games(score)");
    await pool.query("CREATE INDEX idx_users_telegram_id ON users(telegram_id)");

    console.log("✅ Database setup completed successfully");
    
    // Insert test data for development
    if (process.env.NODE_ENV !== 'production') {
      await insertTestData();
    }
    
  } catch (error) {
    console.error("❌ Database setup failed:", error);
    throw error;
  }
}

// Insert test data for development
async function insertTestData() {
  try {
    console.log("🔧 Inserting test data...");
    
    // Insert test users
    const testUsers = [
      { telegram_id: 123456789, display_name: 'Test Player 1', country_flag: '🇺🇸' },
      { telegram_id: 987654321, display_name: 'Test Player 2', country_flag: '🇬🇧' },
      { telegram_id: 456789123, display_name: 'Test Player 3', country_flag: '🇺🇿' },
      { telegram_id: 111222333, display_name: 'Test Player 4', country_flag: '🇫🇷' },
      { telegram_id: 444555666, display_name: 'Test Player 5', country_flag: '🇩🇪' },
    ];

    for (const user of testUsers) {
      const result = await pool.query(
        'INSERT INTO users (telegram_id, display_name, country_flag) VALUES ($1, $2, $3) ON CONFLICT (telegram_id) DO NOTHING RETURNING id',
        [user.telegram_id, user.display_name, user.country_flag]
      );
      
      if (result.rows.length > 0) {
        const userId = result.rows[0].id;
        
        // Insert test games for each user
        const testGames = [
          { score: 1500, coins_earned: 225, moves_used: 15, max_combo: 3 },
          { score: 2100, coins_earned: 315, moves_used: 18, max_combo: 5 },
          { score: 890, coins_earned: 133, moves_used: 12, max_combo: 2 },
          { score: 3200, coins_earned: 480, moves_used: 20, max_combo: 7 },
        ];
        
        for (const game of testGames) {
          await pool.query(
            'INSERT INTO games (user_id, score, coins_earned, moves_used, max_combo, played_at) VALUES ($1, $2, $3, $4, $5, $6)',
            [userId, game.score, game.coins_earned, game.moves_used, game.max_combo, new Date()]
          );
        }
      }
    }
    
    console.log("✅ Test data inserted successfully");
  } catch (error) {
    console.error("❌ Test data insertion failed:", error);
  }
}

// Helper function to get country name from flag emoji
function getCountryName(flag) {
  const countryMap = {
    '🇺🇸': 'United States', '🇬🇧': 'United Kingdom', '🇨🇦': 'Canada', '🇦🇺': 'Australia',
    '🇩🇪': 'Germany', '🇫🇷': 'France', '🇮🇹': 'Italy', '🇪🇸': 'Spain',
    '🇯🇵': 'Japan', '🇰🇷': 'South Korea', '🇨🇳': 'China', '🇮🇳': 'India',
    '🇧🇷': 'Brazil', '🇲🇽': 'Mexico', '🇷🇺': 'Russia', '🇺🇿': 'Uzbekistan',
    '🇹🇷': 'Turkey', '🇸🇦': 'Saudi Arabia', '🇦🇪': 'UAE', '🇳🇱': 'Netherlands',
    '🇸🇪': 'Sweden', '🇳🇴': 'Norway', '🇩🇰': 'Denmark', '🇵🇱': 'Poland',
    '🇨🇿': 'Czech Republic', '🇭🇺': 'Hungary', '🇦🇹': 'Austria', '🇨🇭': 'Switzerland',
    '🇧🇪': 'Belgium', '🇵🇹': 'Portugal', '🇬🇷': 'Greece', '🇮🇱': 'Israel',
    '🇪🇬': 'Egypt', '🇿🇦': 'South Africa', '🇳🇬': 'Nigeria', '🇰🇪': 'Kenya',
    '🇲🇦': 'Morocco', '🇦🇷': 'Argentina', '🇨🇱': 'Chile', '🇨🇴': 'Colombia',
    '🇵🇪': 'Peru', '🇻🇪': 'Venezuela', '🇹🇭': 'Thailand', '🇻🇳': 'Vietnam',
    '🇮🇩': 'Indonesia', '🇲🇾': 'Malaysia', '🇸🇬': 'Singapore', '🇵🇭': 'Philippines',
    '🇧🇩': 'Bangladesh', '🇵🇰': 'Pakistan', '🇱🇰': 'Sri Lanka', '🇳🇵': 'Nepal'
  };
  return countryMap[flag] || 'Unknown';
}

// ---------- Setup endpoint ----------
app.get("/api/setup/database", async (req, res) => {
  if (!pool || !dbConnected) {
    return res.status(503).json({
      success: false,
      error: "Database not connected",
      message: "Please check your DATABASE_URL environment variable",
    });
  }

  try {
    await setupDatabase();
    res.json({ success: true, message: "Database tables created successfully!" });
  } catch (error) {
    console.error("❌ Database setup failed:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ---------- API: user register/upsert ----------
app.post("/api/user/register", requireDB, async (req, res) => {
  try {
    const { telegram_id, telegram_username } = req.body;
    if (!telegram_id) return res.status(400).json({ error: "telegram_id required" });

    console.log(`🔧 Registering user with telegram_id: ${telegram_id}`);

    const result = await pool.query(
      `
      INSERT INTO users (telegram_id, display_name)
      VALUES ($1, $2)
      ON CONFLICT (telegram_id)
      DO UPDATE SET updated_at = NOW()
      RETURNING *;
      `,
      [telegram_id, telegram_username ? String(telegram_username).slice(0, 50) : null]
    );

    console.log(`✅ User registered/updated:`, result.rows[0]);
    res.json({ user: result.rows[0] });
  } catch (err) {
    console.error("❌ Register error:", err);
    res.status(500).json({ error: "Failed to register user" });
  }
});

// ---------- API: update profile ----------
app.put("/api/user/profile", requireDB, async (req, res) => {
  try {
    const { telegram_id, display_name, country_flag, profile_picture, name_changed } = req.body;
    if (!telegram_id) return res.status(400).json({ error: "telegram_id required" });

    console.log(`🔧 Updating profile for telegram_id: ${telegram_id}`);

    const updates = [];
    const values = [];
    let i = 1;

    if (display_name !== undefined) {
      updates.push(`display_name = $${i++}`);
      values.push(display_name);
    }
    if (country_flag !== undefined) {
      updates.push(`country_flag = $${i++}`);
      values.push(country_flag);
    }
    if (profile_picture !== undefined) {
      updates.push(`profile_picture = $${i++}`);
      values.push(profile_picture);
      if (profile_picture !== "https://i.postimg.cc/wjQ5W8Zw/Meowchi-The-Cat-NBG.png") {
        updates.push(`picture_changed = $${i++}`);
        values.push(true);
      }
    }
    if (name_changed !== undefined) {
      updates.push(`name_changed = $${i++}`);
      values.push(name_changed);
    }

    updates.push(`updated_at = NOW()`);
    const whereParam = `$${i}`;
    values.push(telegram_id);

    const q = `UPDATE users SET ${updates.join(", ")} WHERE telegram_id = ${whereParam} RETURNING *;`;
    const updated = await pool.query(q, values);

    if (updated.rows.length === 0) return res.status(404).json({ error: "User not found" });
    
    console.log(`✅ Profile updated:`, updated.rows[0]);
    res.json({ user: updated.rows[0] });
  } catch (error) {
    console.error("❌ Profile update error:", error);
    res.status(500).json({ error: "Failed to update profile" });
  }
});

// ---------- API: save game WITH EXTENSIVE LOGGING ----------
app.post("/api/game/complete", requireDB, async (req, res) => {
  try {
    const { telegram_id, score, coins_earned, moves_used, max_combo, game_duration } = req.body;
    
    console.log(`🎯 Game completion request:`, {
      telegram_id,
      score,
      coins_earned,
      moves_used,
      max_combo,
      game_duration
    });

    if (!telegram_id || score === undefined) {
      console.log(`❌ Missing required fields: telegram_id=${telegram_id}, score=${score}`);
      return res.status(400).json({ error: "Telegram ID and score are required" });
    }
    
    if (score < 0 || score > 10000) {
      console.log(`❌ Invalid score range: ${score}`);
      return res.status(400).json({ error: "Invalid score range" });
    }

    // Find user
    const user = await pool.query(
      "SELECT id FROM users WHERE telegram_id = $1",
      [telegram_id]
    );
    
    if (user.rows.length === 0) {
      console.log(`❌ User not found for telegram_id: ${telegram_id}`);
      return res.status(404).json({ error: "User not found" });
    }

    console.log(`✅ Found user with id: ${user.rows[0].id}`);

    // Insert game
    const game = await pool.query(
      `INSERT INTO games (user_id, score, coins_earned, moves_used, max_combo, game_duration)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [user.rows[0].id, score, coins_earned || 0, moves_used ?? null, max_combo || 0, game_duration ?? null]
    );

    console.log(`✅ Game saved successfully:`, game.rows[0]);

    // Verify the game was saved by checking total games count
    const gamesCount = await pool.query(
      "SELECT COUNT(*) as total FROM games WHERE user_id = $1",
      [user.rows[0].id]
    );
    
    console.log(`✅ User now has ${gamesCount.rows[0].total} total games`);

    res.json({ 
      message: "Game saved successfully", 
      game: game.rows[0],
      totalGames: gamesCount.rows[0].total
    });
  } catch (error) {
    console.error("❌ Game save error:", error);
    res.status(500).json({ error: "Failed to save game" });
  }
});

// ---------- API: COMPLETELY FIXED LEADERBOARD ----------
app.get("/api/leaderboard/:type", requireDB, async (req, res) => {
  try {
    const { type } = req.params;
    const { country, telegram_id } = req.query;

    console.log(`🏆 Leaderboard request: type=${type}, country=${country}, telegram_id=${telegram_id}`);

    // Validate leaderboard type
    if (!['daily', 'weekly', 'alltime'].includes(type)) {
      return res.status(400).json({ error: "Invalid leaderboard type" });
    }

    // Build date filter - COMPLETELY FIXED
    let dateFilter = "";
    
    switch (type) {
      case "daily":
        // Get games from today (last 24 hours)
        dateFilter = `AND g.played_at >= CURRENT_DATE`;
        break;
      case "weekly":
        // Get games from this week (last 7 days)
        dateFilter = `AND g.played_at >= CURRENT_DATE - INTERVAL '7 days'`;
        break;
      case "alltime":
        // No filter - get all games
        dateFilter = ``;
        break;
    }

    console.log(`🔧 Date filter: ${dateFilter}`);

    // Get user's country if country filtering is requested
    let userCountry = null;
    let countryFilter = "";
    const queryParams = [];
    
    if (country && country !== "false" && telegram_id) {
      try {
        const userCountryResult = await pool.query(
          "SELECT country_flag FROM users WHERE telegram_id = $1",
          [telegram_id]
        );
        
        if (userCountryResult.rows.length > 0 && userCountryResult.rows[0].country_flag) {
          userCountry = userCountryResult.rows[0].country_flag;
          countryFilter = "AND u.country_flag = $1";
          queryParams.push(userCountry);
          console.log(`🔧 Filtering by country: ${userCountry}`);
        }
      } catch (err) {
        console.error("❌ Error getting user country:", err);
      }
    }

    // COMPLETELY FIXED LEADERBOARD QUERY
    const baseQuery = `
      SELECT 
        u.display_name,
        u.country_flag,
        u.telegram_id,
        COALESCE(SUM(g.score), 0) as total_score,
        COUNT(g.id) as games_played,
        COALESCE(MAX(g.score), 0) as best_score,
        COALESCE(MAX(g.max_combo), 0) as best_combo
      FROM users u
      LEFT JOIN games g ON u.id = g.user_id ${dateFilter}
      WHERE 1=1 ${countryFilter}
      GROUP BY u.id, u.display_name, u.country_flag, u.telegram_id
      HAVING COUNT(g.id) > 0
      ORDER BY total_score DESC, best_score DESC
    `;

    console.log(`🔧 Executing query:`, baseQuery);
    console.log(`🔧 Query params:`, queryParams);

    // Get leaderboard data
    const allResults = await pool.query(baseQuery, queryParams);
    
    console.log(`🔧 Raw query results: ${allResults.rows.length} rows`);
    
    if (allResults.rows.length > 0) {
      console.log(`🔧 First few results:`, allResults.rows.slice(0, 3));
    }

    // Add ranks to all results
    const allResultsWithRank = allResults.rows.map((row, index) => ({
      ...row,
      rank: index + 1,
      total_score: parseInt(row.total_score || 0),
      games_played: parseInt(row.games_played || 0),
      best_score: parseInt(row.best_score || 0),
      best_combo: parseInt(row.best_combo || 0)
    }));

    // Get top 100 for display
    const top100 = allResultsWithRank.slice(0, 100);

    // Find user's rank if not in top 100
    let userRank = null;
    if (telegram_id) {
      const userResult = allResultsWithRank.find(row => 
        row.telegram_id.toString() === telegram_id.toString()
      );
      
      if (userResult && userResult.rank > 100) {
        userRank = {
          rank: userResult.rank,
          display_name: userResult.display_name,
          country_flag: userResult.country_flag,
          telegram_id: userResult.telegram_id,
          total_score: userResult.total_score,
          games_played: userResult.games_played,
          best_score: userResult.best_score
        };
      }
    }

    console.log(`✅ Leaderboard compiled: ${allResultsWithRank.length} total players, top 100 returned, userRank: ${userRank ? userRank.rank : 'none'}`);

    // Response
    res.json({
      leaderboard: top100,
      userRank: userRank,
      type: type,
      country: userCountry,
      countryName: userCountry ? getCountryName(userCountry) : null,
      totalPlayers: allResultsWithRank.length,
      timestamp: new Date().toISOString(),
    });

  } catch (error) {
    console.error("❌ Leaderboard error:", error);
    res.status(500).json({ 
      error: "Failed to fetch leaderboard",
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// ---------- DEBUG ENDPOINT - Check database status ----------
app.get("/api/debug/database", requireDB, async (req, res) => {
  try {
    // Check tables exist
    const tables = await pool.query(`
      SELECT table_name FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_name IN ('users', 'games')
    `);

    // Count users
    const userCount = await pool.query("SELECT COUNT(*) as count FROM users");
    
    // Count games
    const gameCount = await pool.query("SELECT COUNT(*) as count FROM games");
    
    // Get sample data
    const sampleUsers = await pool.query("SELECT telegram_id, display_name, country_flag FROM users LIMIT 5");
    const sampleGames = await pool.query(`
      SELECT g.score, g.coins_earned, g.max_combo, u.display_name 
      FROM games g 
      JOIN users u ON g.user_id = u.id 
      ORDER BY g.played_at DESC 
      LIMIT 5
    `);

    // Test leaderboard query directly
    const leaderboardTest = await pool.query(`
      SELECT 
        u.display_name,
        u.country_flag,
        u.telegram_id,
        COALESCE(SUM(g.score), 0) as total_score,
        COUNT(g.id) as games_played,
        COALESCE(MAX(g.score), 0) as best_score,
        COALESCE(MAX(g.max_combo), 0) as best_combo
      FROM users u
      LEFT JOIN games g ON u.id = g.user_id
      WHERE 1=1
      GROUP BY u.id, u.display_name, u.country_flag, u.telegram_id
      HAVING COUNT(g.id) > 0
      ORDER BY total_score DESC
      LIMIT 10
    `);

    res.json({
      tablesExist: tables.rows.map(t => t.table_name),
      userCount: parseInt(userCount.rows[0].count),
      gameCount: parseInt(gameCount.rows[0].count),
      sampleUsers: sampleUsers.rows,
      sampleGames: sampleGames.rows,
      leaderboardTest: leaderboardTest.rows,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error("❌ Debug database error:", error);
    res.status(500).json({ error: error.message });
  }
});

// ---------- API: user stats ----------
app.get("/api/user/:telegram_id/stats", requireDB, async (req, res) => {
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

    if (stats.rows.length === 0) return res.status(404).json({ error: "User not found" });
    res.json({ stats: stats.rows[0] });
  } catch (error) {
    console.error("❌ User stats error:", error);
    res.status(500).json({ error: "Failed to fetch user stats" });
  }
});

// ---------- Health ----------
app.get("/api/db/health", async (_req, res) => {
  if (!pool || !dbConnected) {
    return res.status(503).json({ status: "unhealthy", database: "disconnected" });
  }
  try {
    await pool.query("SELECT 1");
    res.json({ status: "healthy", database: "connected" });
  } catch (e) {
    res.status(500).json({ status: "unhealthy", error: e.message });
  }
});

app.get("/health", (_req, res) => {
  res.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    env: process.env.NODE_ENV || "development",
    database: dbConnected ? "connected" : "disconnected",
  });
});

// ---------- SPA fallback ----------
app.get("*", (_req, res) => {
  res.sendFile(indexPath);
});

// ---------- Start ----------
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 Server listening on port ${PORT}`));
