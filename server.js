import express from "express";
import compression from "compression";
import helmet from "helmet";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// --------------------- Database setup ---------------------
let pool = null;
let dbConnected = false;

async function initDatabase() {
  try {
    if (!process.env.DATABASE_URL) {
      console.log("⚠️ No DATABASE_URL found, running without database");
      return;
    }

    // dynamic import for ESM
    const pg = await import("pg");
    const { Pool } = pg.default || pg;

    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.NODE_ENV === "production" ? { rejectUnauthorized: false } : false,
    });

    const result = await pool.query("SELECT NOW()");
    console.log("✅ Database connected at:", result.rows[0].now);
    dbConnected = true;
  } catch (error) {
    console.error("❌ Database connection failed:", error.message);
    console.log("⚠️ Continuing without database...");
    dbConnected = false;
    pool = null;
  }
}
initDatabase();

// --------------------- Middleware ---------------------
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
  next();
});

app.use(compression());
app.use(express.json());

app.use(
  helmet({
    contentSecurityPolicy: {
      useDefaults: true,
      directives: {
        "default-src": ["'self'"],
        "script-src": ["'self'", "'unsafe-inline'", "https://telegram.org"],
        "style-src": ["'self'", "'unsafe-inline'"],
        "img-src": ["'self'", "data:", "https:"],
        "connect-src": ["'self'", "https://ipapi.co"],
        "frame-ancestors": ["'self'", "https://*.t.me", "https://web.telegram.org"],
      },
    },
  })
);

// --------------------- Static files ---------------------
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

// --------------------- Helpers ---------------------
const requireDB = (req, res, next) => {
  if (!pool || !dbConnected) {
    return res.status(503).json({
      error: "Database not available",
      message: "Leaderboard and user features require database connection",
    });
  }
  next();
};

// --------------------- One-time setup endpoint ---------------------
// WARNING: Drops and recreates tables (use once after deploying with DATABASE_URL)
app.get("/api/setup/database", requireDB, async (req, res) => {
  try {
    console.log("🔧 Setting up database tables... (dropping existing)");
    await pool.query("DROP TABLE IF EXISTS games CASCADE");
    await pool.query("DROP TABLE IF EXISTS users CASCADE");

    // users table
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
      )
    `);

    // games table (constraints relaxed to avoid rejecting legit results)
    await pool.query(`
      CREATE TABLE games (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        score INTEGER NOT NULL CHECK (score >= 0),
        coins_earned INTEGER DEFAULT 0,
        moves_used INTEGER CHECK (moves_used >= 0 AND moves_used <= 200),
        max_combo INTEGER DEFAULT 0,
        game_duration INTEGER,
        played_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `);

    await pool.query("CREATE INDEX idx_games_user_id ON games(user_id)");
    await pool.query("CREATE INDEX idx_games_played_at ON games(played_at)");
    await pool.query("CREATE INDEX idx_games_score ON games(score)");
    await pool.query("CREATE INDEX idx_users_telegram_id ON users(telegram_id)");

    const tables = await pool.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      ORDER BY table_name
    `);

    console.log("✅ Database setup complete!");
    res.json({
      success: true,
      message: "Database tables created successfully!",
      tables: tables.rows.map((r) => r.table_name),
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("❌ Database setup failed:", error);
    res.status(500).json({
      success: false,
      error: error.message,
      message: "Failed to create database tables",
    });
  }
});

// --------------------- API: users ---------------------
app.post("/api/user/register", requireDB, async (req, res) => {
  try {
    const { telegram_id, telegram_username } = req.body;
    if (!telegram_id) return res.status(400).json({ error: "Telegram ID is required" });

    const existing = await pool.query("SELECT * FROM users WHERE telegram_id = $1", [telegram_id]);
    if (existing.rows.length > 0) {
      return res.json({ user: existing.rows[0] });
    }

    const display = `Stray Cat #${telegram_id.toString().slice(-5)}`;
    const created = await pool.query(
      "INSERT INTO users (telegram_id, display_name, profile_completed) VALUES ($1, $2, $3) RETURNING *",
      [telegram_id, display, false]
    );

    res.json({ user: created.rows[0] });
  } catch (error) {
    console.error("User registration error:", error);
    res.status(500).json({ error: "Failed to register user" });
  }
});

// FIXED: parameterized update with proper $ placeholders
app.put("/api/user/profile", requireDB, async (req, res) => {
  try {
    const { telegram_id, display_name, country_flag, profile_picture, name_changed } = req.body;
    if (!telegram_id) return res.status(400).json({ error: "Telegram ID is required" });

    const sets = [];
    const values = [];
    let i = 1;

    if (display_name !== undefined) {
      sets.push(`display_name = $${i++}`);
      values.push(display_name);
    }
    if (country_flag !== undefined) {
      sets.push(`country_flag = $${i++}`);
      values.push(country_flag);
    }
    if (profile_picture !== undefined) {
      sets.push(`profile_picture = $${i++}`);
      values.push(profile_picture);
      if (profile_picture !== "https://i.postimg.cc/wjQ5W8Zw/Meowchi-The-Cat-NBG.png") {
        sets.push(`picture_changed = true`);
      }
    }
    if (name_changed !== undefined) {
      sets.push(`name_changed = $${i++}`);
      values.push(name_changed);
    }

    sets.push(`updated_at = NOW()`);
    values.push(telegram_id);

    const sql = `UPDATE users SET ${sets.join(", ")} WHERE telegram_id = $${i} RETURNING *`;
    const updated = await pool.query(sql, values);

    if (updated.rows.length === 0) return res.status(404).json({ error: "User not found" });
    res.json({ user: updated.rows[0] });
  } catch (error) {
    console.error("Profile update error:", error);
    res.status(500).json({ error: "Failed to update profile" });
  }
});

// --------------------- API: games ---------------------
app.post("/api/game/complete", requireDB, async (req, res) => {
  try {
    const { telegram_id, score, coins_earned, moves_used, max_combo, game_duration } = req.body;

    if (!telegram_id || score === undefined) {
      return res.status(400).json({ error: "Telegram ID and score are required" });
    }

    // Relaxed anti-cheat to avoid rejecting legit sessions
    if (score < 0 || score > 1_000_000) {
      return res.status(400).json({ error: "Invalid score range" });
    }
    if (moves_used < 0 || moves_used > 200) {
      return res.status(400).json({ error: "Invalid moves_used" });
    }

    const user = await pool.query("SELECT id FROM users WHERE telegram_id = $1", [telegram_id]);
    if (user.rows.length === 0) {
      return res.status(404).json({ error: "User not found" });
    }

    const game = await pool.query(
      `INSERT INTO games (user_id, score, coins_earned, moves_used, max_combo, game_duration)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [user.rows[0].id, score, coins_earned || 0, moves_used ?? 0, max_combo || 0, game_duration ?? null]
    );

    res.json({ message: "Game saved successfully", game: game.rows[0] });
  } catch (error) {
    console.error("Game save error:", error);
    res.status(500).json({ error: "Failed to save game" });
  }
});

// --------------------- API: leaderboard & stats ---------------------
app.get("/api/leaderboard/:type", requireDB, async (req, res) => {
  try {
    const { type } = req.params;
    const { country, telegram_id } = req.query;

    let dateFilter = "";
    switch (type) {
      case "daily":
        dateFilter = `AND DATE(g.played_at AT TIME ZONE 'Asia/Tashkent') = DATE(NOW() AT TIME ZONE 'Asia/Tashkent')`;
        break;
      case "weekly":
        dateFilter = `AND DATE_TRUNC('week', g.played_at AT TIME ZONE 'Asia/Tashkent') = DATE_TRUNC('week', NOW() AT TIME ZONE 'Asia/Tashkent')`;
        break;
      case "alltime":
        dateFilter = "";
        break;
      default:
        return res.status(400).json({ error: "Invalid leaderboard type" });
    }

    const countryFilter = country && country !== "false" ? "AND u.country_flag IS NOT NULL" : "";

    const leaderboard = await pool.query(
      `
      SELECT 
        u.display_name,
        u.country_flag,
        u.telegram_id,
        SUM(g.score) AS total_score,
        COUNT(g.id) AS games_played,
        MAX(g.score) AS best_score,
        MAX(g.max_combo) AS best_combo,
        ROW_NUMBER() OVER (ORDER BY SUM(g.score) DESC) AS rank
      FROM users u
      JOIN games g ON u.id = g.user_id
      WHERE 1=1 ${dateFilter} ${countryFilter}
      GROUP BY u.id, u.display_name, u.country_flag, u.telegram_id
      ORDER BY total_score DESC
      LIMIT 100
    `
    );

    // Optional: compute userRank if telegram_id provided
    let userRank = null;
    if (telegram_id) {
      const ur = await pool.query(
        `
        WITH totals AS (
          SELECT u.id, SUM(g.score) AS total_score
          FROM users u
          JOIN games g ON u.id = g.user_id
          WHERE 1=1 ${dateFilter}
          GROUP BY u.id
        )
        SELECT rnk FROM (
          SELECT id, RANK() OVER (ORDER BY total_score DESC) AS rnk
          FROM totals
        ) x
        JOIN users u ON u.id = x.id
        WHERE u.telegram_id = $1
        `,
        [telegram_id]
      );
      userRank = ur.rows[0]?.rnk ?? null;
    }

    res.json({
      leaderboard: leaderboard.rows,
      userRank,
      type,
      country: country || null,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Leaderboard error:", error);
    res.status(500).json({ error: "Failed to fetch leaderboard" });
  }
});

app.get("/api/user/:telegram_id/stats", requireDB, async (req, res) => {
  try {
    const { telegram_id } = req.params;

    const stats = await pool.query(
      `
      SELECT 
        u.display_name,
        u.country_flag,
        u.profile_completed,
        COUNT(g.id) AS games_played,
        COALESCE(SUM(g.score), 0) AS total_score,
        COALESCE(MAX(g.score), 0) AS best_score,
        COALESCE(MAX(g.max_combo), 0) AS best_combo,
        COALESCE(SUM(g.coins_earned), 0) AS total_coins_earned
      FROM users u
      LEFT JOIN games g ON u.id = g.user_id
      WHERE u.telegram_id = $1
      GROUP BY u.id, u.display_name, u.country_flag, u.profile_completed
    `,
      [telegram_id]
    );

    if (stats.rows.length === 0) return res.status(404).json({ error: "User not found" });
    res.json({ stats: stats.rows[0] });
  } catch (error) {
    console.error("User stats error:", error);
    res.status(500).json({ error: "Failed to fetch user stats" });
  }
});

// --------------------- Health & SPA fallback ---------------------
app.get("/health", (req, res) => {
  const health = {
    status: "ok",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    env: process.env.NODE_ENV || "development",
    database: dbConnected ? "connected" : "disconnected",
  };
  console.log("🏥 Health check requested:", health);
  res.json(health);
});

app.get("/api/db/health", async (req, res) => {
  if (!pool || !dbConnected) {
    return res.status(503).json({
      status: "unhealthy",
      database: "disconnected",
      error: "No database connection",
    });
  }
  try {
    const result = await pool.query("SELECT NOW() as server_time");
    res.json({ status: "healthy", database: "connected", server_time: result.rows[0].server_time });
  } catch (error) {
    console.error("Database health check failed:", error);
    res.status(500).json({
      status: "unhealthy",
      database: "disconnected",
      error: error.message,
    });
  }
});

// SPA fallback
app.get("*", (req, res) => {
  try {
    console.log(`📄 Serving index.html for: ${req.url}`);
    res.sendFile(indexPath);
  } catch (error) {
    console.error("❌ Error serving index.html:", error);
    res.status(500).send("Internal Server Error");
  }
});

// --------------------- Server start & shutdown ---------------------
const port = process.env.PORT || 3000;
const server = app.listen(port, "0.0.0.0", () => {
  console.log(`🍬 Candy Crush Cats server running on port ${port}`);
  console.log(`🌐 Local: http://localhost:${port}`);
  console.log(`🚀 Environment: ${process.env.NODE_ENV || "development"}`);
  console.log(`📁 Serving from: ${dist}`);
  console.log(`🗄️ Database: ${dbConnected ? "Connected" : "Not available"}`);
});

process.on("SIGTERM", () => {
  console.log("🛑 SIGTERM received, shutting down gracefully");
  server.close(() => {
    console.log("✅ Process terminated");
  });
});

process.on("SIGINT", () => {
  console.log("🛑 SIGINT received, shutting down gracefully");
  server.close(() => {
    console.log("✅ Process terminated");
  });
});

process.on("uncaughtException", (err) => {
  console.error("💥 Uncaught Exception:", err);
  process.exit(1);
});

process.on("unhandledRejection", (reason, promise) => {
  console.error("💥 Unhandled Rejection at:", promise, "reason:", reason);
  process.exit(1);
});
