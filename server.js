// server.js
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
  crossOriginEmbedderPolicy: false,
}));

// ---------- Static dist ----------
const dist = path.join(__dirname, "dist");
const indexPath = path.join(dist, "index.html");
if (!fs.existsSync(indexPath)) {
  console.error("❌ index.html not found in dist folder!");
  process.exit(1);
}
console.log("✅ Static files found, setting up server...");
app.use(express.static(dist, { maxAge: "1y", index: false }));

// ---------- Database ----------
let pool = null;
let dbConnected = false;

if (process.env.DATABASE_URL) {
  pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DATABASE_URL.includes("localhost")
      ? false
      : { rejectUnauthorized: false },
    max: 10, // default pool size
  });
  pool.connect()
    .then(() => { dbConnected = true; console.log("✅ Database connected"); })
    .catch((err) => { dbConnected = false; console.error("❌ Database connection failed:", err.message); });
} else {
  console.warn("⚠️  DATABASE_URL not set. API routes will return 503.");
}

// ---------- Economy config ----------
const COIN_RATE = Number(process.env.COIN_RATE || 8);       // points per coin
const COIN_MIN  = Number(process.env.COIN_MIN  || 10);      // floor per game
const COIN_CAP  = process.env.COIN_CAP ? Number(process.env.COIN_CAP) : null; // optional cap
const COIN_EVENT_MULT = Number(process.env.COIN_EVENT_MULT || 1.0); // promo multiplier

function coinsFor(score) {
  const S = Math.max(0, Number(score) || 0);
  const base = Math.floor((COIN_EVENT_MULT * S) / Math.max(1, COIN_RATE));
  const withMin = Math.max(COIN_MIN, base);
  return COIN_CAP ? Math.min(withMin, COIN_CAP) : withMin;
}

// Public config for client to mirror Pending coins
app.get("/api/config", (_req, res) => {
  res.json({
    coins: {
      RATE: COIN_RATE,
      MIN: COIN_MIN,
      CAP: COIN_CAP,
      MULT: COIN_EVENT_MULT
    }
  });
});

function requireDB(req, res, next) {
  if (!pool || !dbConnected) {
    return res.status(503).json({ error: "Database unavailable" });
  }
  next();
}

// ---------- Setup endpoint (optional utility) ----------
app.get("/api/setup/database", async (req, res) => {
  if (!pool || !dbConnected) {
    return res.status(503).json({
      success: false,
      error: "Database not connected",
      message: "Please check your DATABASE_URL environment variable",
    });
  }

  try {
    console.log("🔧 Setting up database tables.");

    // Drop & recreate (idempotent setup for demos)
    await pool.query("DROP TABLE IF EXISTS games CASCADE");
    await pool.query("DROP TABLE IF EXISTS users CASCADE");

    await pool.query(`
      CREATE TABLE users (
        id SERIAL PRIMARY KEY,
        telegram_id BIGINT UNIQUE NOT NULL,
        display_name VARCHAR(50),
        country_flag TEXT,
        profile_picture TEXT,
        profile_completed BOOLEAN DEFAULT FALSE,
        name_changed BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `);

    await pool.query(`
      CREATE TABLE games (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        score INTEGER NOT NULL CHECK (score >= 0),
        coins_earned INTEGER NOT NULL DEFAULT 0,
        moves_used INTEGER,
        max_combo INTEGER DEFAULT 0,
        game_duration INTEGER,
        played_at TIMESTAMP DEFAULT NOW()
      );
    `);

    await pool.query("CREATE INDEX idx_games_user_id ON games(user_id)");
    await pool.query("CREATE INDEX idx_games_played_at ON games(played_at)");
    await pool.query("CREATE INDEX idx_games_score ON games(score)");
    await pool.query("CREATE INDEX idx_users_telegram_id ON users(telegram_id)");

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

    res.json({ user: result.rows[0] });
  } catch (err) {
    console.error("Register error:", err);
    res.status(500).json({ error: "Failed to register user" });
  }
});

// ---------- API: profile update ----------
app.put("/api/user/profile", requireDB, async (req, res) => {
  try {
    const { telegram_id, display_name, country_flag, profile_picture, name_changed } = req.body;
    if (!telegram_id) return res.status(400).json({ error: "telegram_id required" });

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
    res.json({ user: updated.rows[0] });
  } catch (error) {
    console.error("Profile update error:", error);
    res.status(500).json({ error: "Failed to update profile" });
  }
});

// ---------- API: save game (NO profile gating) ----------
app.post("/api/game/complete", requireDB, async (req, res) => {
  try {
    const { telegram_id, score, moves_used, max_combo, game_duration } = req.body;
    if (!telegram_id || score === undefined) {
      return res.status(400).json({ error: "Telegram ID and score are required" });
    }
    if (score < 0 || score > 10000) {
      return res.status(400).json({ error: "Invalid score range" });
    }

    // fetch only id (we do NOT care about profile_completed)
    const user = await pool.query(
      "SELECT id FROM users WHERE telegram_id = $1",
      [telegram_id]
    );
    if (user.rows.length === 0) return res.status(404).json({ error: "User not found" });

    const creditedCoins = coinsFor(score);

    const game = await pool.query(
      `INSERT INTO games (user_id, score, coins_earned, moves_used, max_combo, game_duration)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [user.rows[0].id, score, creditedCoins, moves_used ?? null, max_combo || 0, game_duration ?? null]
    );

    res.json({ message: "Game saved successfully", game: game.rows[0] });
  } catch (error) {
    console.error("Game save error:", error);
    res.status(500).json({ error: "Failed to save game" });
  }
});

// ---------- API: FIXED leaderboard endpoint ----------
app.get("/api/leaderboard/:type", requireDB, async (req, res) => {
  try {
    const { type } = req.params;
    const { country, telegram_id } = req.query;

    // Validate leaderboard type
    let dateFilter = "";
    switch (type) {
      case "daily":
        dateFilter = `AND DATE(g.played_at AT TIME ZONE 'Asia/Tashkent') = DATE(NOW() AT TIME ZONE 'Asia/Tashkent')`;
        break;
      case "weekly":
        dateFilter = `AND DATE_TRUNC('week', g.played_at AT TIME ZONE 'Asia/Tashkent') = DATE_TRUNC('week', NOW() AT TIME ZONE 'Asia/Tashkent')`;
        break;
      case "alltime":
        dateFilter = ``;
        break;
      default:
        return res.status(400).json({ error: "Invalid leaderboard type" });
    }

    // FIXED: Proper country filtering
    let countryFilter = "";
    let currentUserCountry = null;
    
    if (country && country !== "false" && telegram_id) {
      // Get current user's country
      const userResult = await pool.query(
        "SELECT country_flag FROM users WHERE telegram_id = $1",
        [telegram_id]
      );
      if (userResult.rows.length > 0 && userResult.rows[0].country_flag) {
        currentUserCountry = userResult.rows[0].country_flag;
        countryFilter = `AND u.country_flag = '${currentUserCountry.replace(/'/g, "''")}'`;
      }
    }

    const leaderboardQuery = `
      SELECT 
        u.display_name,
        u.country_flag,
        u.telegram_id,
        SUM(g.score) as total_score,
        COUNT(*) as games_played,
        MAX(g.score) as best_score
      FROM users u
      JOIN games g ON u.id = g.user_id
      WHERE 1=1
      ${dateFilter}
      ${countryFilter}
      GROUP BY u.id
      ORDER BY total_score DESC
      LIMIT 50;
    `;
    
    const leaderboard = await pool.query(leaderboardQuery);

    // Get current user's rank if needed
    let userRank = null;
    if (telegram_id) {
      const rankQuery = `
        SELECT rank FROM (
          SELECT u.telegram_id, SUM(g.score) as total_score,
                 RANK() OVER (ORDER BY SUM(g.score) DESC) as rank
          FROM users u
          JOIN games g ON u.id = g.user_id
          WHERE 1=1
          ${dateFilter}
          ${countryFilter}
          GROUP BY u.telegram_id
        ) ranked
        WHERE telegram_id = $1;
      `;
      const rankRes = await pool.query(rankQuery, [telegram_id]);
      if (rankRes.rows.length > 0) {
        userRank = Number(rankRes.rows[0].rank);
      }
    }

    const formattedLeaderboard = leaderboard.rows.map((row, idx) => ({
      rank: idx + 1,
      username: row.display_name || "Anonymous",
      country_flag: row.country_flag || null,
      total_score: Number(row.total_score || 0),
      games_played: Number(row.games_played || 0),
      best_score: Number(row.best_score || 0),
      telegram_id: String(row.telegram_id || ""),
    }));

    res.json({
      leaderboard: formattedLeaderboard,
      userRank: userRank,
      type,
      country: country === "true" ? currentUserCountry : null,
      timestamp: new Date().toISOString(),
    });

  } catch (error) {
    console.error("Leaderboard error:", error);
    res.status(500).json({ error: "Failed to fetch leaderboard" });
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
      GROUP BY u.id;
    `, [req.params.telegram_id]);

    res.json({ stats: stats.rows[0] || {} });
  } catch (error) {
    console.error("Stats error:", error);
    res.status(500).json({ error: "Failed to fetch user stats" });
  }
});

// ---------- Health ----------
app.get("/health", (_req, res) => {
  res.json({
    ok: true,
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
