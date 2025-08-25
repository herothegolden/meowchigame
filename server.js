// server.js
import express from "express";
import compression from "compression";
import helmet from "helmet";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import { Pool } from "pg";
import { validate } from "@telegram-apps/init-data-node";
import rateLimit from "express-rate-limit";

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
    .then(() => { dbConnected = true; console.log("✅ Database connected"); })
    .catch((err) => { dbConnected = false; console.error("❌ Database connection failed:", err.message); });
} else {
  console.warn("⚠️  DATABASE_URL not set. API routes will return 503.");
}

function requireDB(req, res, next) {
  if (!pool || !dbConnected) {
    return res.status(503).json({ error: "Database unavailable" });
  }
  next();
}

// Authentication middleware - supports both old and new methods during migration
const validateUser = async (req, res, next) => {
  try {
    const { initData, telegram_id } = req.body;
    
    if (initData) {
      // New secure method - validate with bot token
      const parsed = validate(initData, process.env.BOT_TOKEN);
      if (!parsed.user) {
        return res.status(401).json({ error: "Invalid Telegram authentication" });
      }
      req.user = { 
        telegram_id: parsed.user.id, 
        username: parsed.user.username,
        first_name: parsed.user.first_name,
        validated: true 
      };
    } else if (telegram_id && process.env.LEGACY_AUTH !== 'false') {
      // Legacy method during migration (will be removed later)
      console.warn(`⚠️ Legacy auth used for user ${telegram_id}`);
      req.user = { 
        telegram_id, 
        validated: false 
      };
    } else {
      return res.status(401).json({ error: "Authentication required" });
    }
    
    next();
  } catch (error) {
    console.error("Authentication error:", error);
    return res.status(401).json({ error: "Invalid authentication data" });
  }
};

// Rate limiting for game endpoints
const gameRateLimit = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 10, // limit each user to 10 games per minute
  keyGenerator: (req) => req.user?.telegram_id || req.ip,
  message: { error: "Too many games submitted. Please wait." }
});

// Rate limiting for profile updates
const profileRateLimit = rateLimit({
  windowMs: 60 * 1000, // 1 minute  
  max: 5, // limit each user to 5 profile updates per minute
  keyGenerator: (req) => req.user?.telegram_id || req.ip,
  message: { error: "Too many profile updates. Please wait." }
});

// ---------- Static build checks ----------
const dist = path.join(__dirname, "dist");

// Fail fast if build missing (helps Railway/Nixpacks)
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

// ========== 📋 DAILY TASKS (added exactly as requested) ==========
const DAILY_TASKS = [
  {
    id: 'play_3_games',
    title: 'Play 3 Games',
    description: 'Complete 3 matches today',
    reward: 200,
    icon: '🎮',
    target: 3,
    type: 'games_played'
  },
  {
    id: 'score_5000',
    title: 'Score 5,000 Points',
    description: 'Get 5,000+ points in a single game',
    reward: 300,
    icon: '🎯',
    target: 5000,
    type: 'single_score'
  },
  {
    id: 'combo_5x',
    title: '5x Combo Master',
    description: 'Achieve a 5x combo in any game',
    reward: 400,
    icon: '🔥',
    target: 5,
    type: 'max_combo'
  },
  {
    id: 'invite_friend',
    title: 'Invite a Friend',
    description: 'Share with friends and get them to play',
    reward: 500,
    icon: '👥',
    target: 1,
    type: 'referrals'
  },
  {
    id: 'leaderboard_check',
    title: 'Check Rankings',
    description: 'Visit the leaderboard',
    reward: 100,
    icon: '🏆',
    target: 1,
    type: 'page_visit'
  }
];
// ================================================================

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
        country_flag VARCHAR(10),
        profile_picture TEXT,
        profile_completed BOOLEAN DEFAULT FALSE,
        name_changed BOOLEAN DEFAULT FALSE,
        picture_changed BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `);

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

    await pool.query("CREATE INDEX idx_games_user_id ON games(user_id)");
    await pool.query("CREATE INDEX idx_games_played_at ON games(played_at)");
    await pool.query("CREATE INDEX idx_games_score ON games(score)");
    await pool.query("CREATE INDEX idx_users_telegram_id ON users(telegram_id)");

    // 🔹 DAILY TASKS TABLE (added exactly as requested)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS daily_tasks (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        task_id VARCHAR(50) NOT NULL,
        progress INTEGER DEFAULT 0,
        completed BOOLEAN DEFAULT FALSE,
        completed_at TIMESTAMP WITH TIME ZONE,
        task_date DATE DEFAULT CURRENT_DATE,
        UNIQUE(user_id, task_id, task_date)
      );
    `);
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_daily_tasks_user_date
      ON daily_tasks(user_id, task_date);
    `);

    res.json({ success: true, message: "Database tables created successfully!" });
  } catch (error) {
    console.error("❌ Database setup failed:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ---------- API: user register/upsert ----------
app.post("/api/user/register", requireDB, validateUser, async (req, res) => {
  try {
    const user = req.user; // From validateUser middleware
    
    const result = await pool.query(
      `
      INSERT INTO users (telegram_id, display_name)
      VALUES ($1, $2)
      ON CONFLICT (telegram_id)
      DO UPDATE SET updated_at = NOW()
      RETURNING *;
      `,
      [user.telegram_id, user.username || user.first_name || null]
    );

    res.json({ user: result.rows[0], auth_method: user.validated ? 'secure' : 'legacy' });
  } catch (err) {
    console.error("Register error:", err);
    res.status(500).json({ error: "Failed to register user" });
  }
});

// ---------- API: update profile ----------
app.put("/api/user/profile", requireDB, validateUser, profileRateLimit, async (req, res) => {
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
    res.json({ user: updated.rows[0] });
  } catch (error) {
    console.error("Profile update error:", error);
    res.status(500).json({ error: "Failed to update profile" });
  }
});

// ---------- API: save game (NO profile gating) ----------
app.post("/api/game/complete", requireDB, validateUser, gameRateLimit, async (req, res) => {
  try {
    const { telegram_id, score, coins_earned, moves_used, max_combo, game_duration } = req.body;
// --- Server-authoritative coin calculation ---
const RATE = parseFloat(process.env.COIN_RATE ?? '0.10');        // coins per point
const MIN  = parseInt(process.env.COIN_MIN ?? '10', 10);         // minimum per completed game
const CAP  = parseInt(process.env.COIN_CAP ?? '100', 10);        // cap per game
const COMBO_BONUS = parseFloat(process.env.COIN_COMBO_BONUS ?? '0.05'); // +5% per combo step

const comboSteps = Math.max(0, Math.min(20, Number(max_combo || 0))); // safety clamp
const bonusMult = 1 + comboSteps * COMBO_BONUS;
let computedCoins = Math.round(Math.max(0, Number(score || 0)) * RATE * bonusMult);
computedCoins = Math.max(MIN, Math.min(computedCoins, CAP));
// ---------------------------------------------

    const telegramIdFromAuth = req.user.telegram_id; // From validateUser middleware

    if (score === undefined) {
      return res.status(400).json({ error: "Score is required" });
    }
    if (score < 0 || score > 10000) {
      return res.status(400).json({ error: "Invalid score range" });
    }

    // Add basic anti-cheat checks
    const duration = game_duration || 0;
    if (duration > 0 && duration < 10) {
      return res.status(400).json({ error: "Game duration too short" });
    }
    if (score > 0 && (moves_used || 0) < 1) {
      return res.status(400).json({ error: "Invalid moves count" });
    }

    const user = await pool.query(
      "SELECT id FROM users WHERE telegram_id = $1",
      [telegramIdFromAuth]
    );
    if (user.rows.length === 0) return res.status(404).json({ error: "User not found" });

    const game = await pool.query(
      `INSERT INTO games (user_id, score, coins_earned, moves_used, max_combo, game_duration)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [user.rows[0].id, score, computedCoins, moves_used ?? null, max_combo || 0, game_duration ?? null]
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

    let countryFilter = "";
    let currentUserCountry = null;
    
    if (country && country !== "false" && telegram_id) {
      const userResult = await pool.query(
        "SELECT country_flag FROM users WHERE telegram_id = $1",
        [telegram_id]
      );
      
      if (userResult.rows.length > 0 && userResult.rows[0].country_flag) {
        currentUserCountry = userResult.rows[0].country_flag;
        countryFilter = `AND u.country_flag = '${currentUserCountry}'`;
      } else {
        countryFilter = `AND u.country_flag IS NULL AND 1=0`;
      }
    }

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
      WHERE 1=1 ${dateFilter} ${countryFilter}
      GROUP BY u.id, u.display_name, u.country_flag, u.telegram_id
      ORDER BY total_score DESC
      LIMIT 100
    `);

    let userRank = null;
    if (telegram_id) {
      const userInTop100 = leaderboard.rows.find(row => row.telegram_id == telegram_id);
      if (!userInTop100) {
        const userRankQuery = await pool.query(`
          WITH ranked_users AS (
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
            WHERE 1=1 ${dateFilter} ${countryFilter}
            GROUP BY u.id, u.display_name, u.country_flag, u.telegram_id
          )
          SELECT * FROM ranked_users WHERE telegram_id = $1
        `, [telegram_id]);

        if (userRankQuery.rows.length > 0) {
          userRank = userRankQuery.rows[0];
        }
      }
    }

    const formattedLeaderboard = leaderboard.rows.map(user => ({
      ...user,
      display_name: user.display_name || `Stray Cat #${user.telegram_id.toString().slice(-5)}`,
      total_score: parseInt(user.total_score),
      games_played: parseInt(user.games_played),
      best_score: parseInt(user.best_score),
      best_combo: parseInt(user.best_combo),
      rank: parseInt(user.rank)
    }));

    if (userRank) {
      userRank.display_name = userRank.display_name || `Stray Cat #${userRank.telegram_id.toString().slice(-5)}`;
      userRank.total_score = parseInt(userRank.total_score);
      userRank.games_played = parseInt(userRank.games_played);
      userRank.best_score = parseInt(userRank.best_score);
      userRank.best_combo = parseInt(userRank.best_combo);
      userRank.rank = parseInt(userRank.rank);
    }

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
app.get("/api/user/:telegram_id/stats", requireDB, validateUser, async (req, res) => {
  try {
    const telegram_id = req.user.telegram_id; // Use authenticated user ID
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
    console.error("User stats error:", error);
    res.status(500).json({ error: "Failed to fetch user stats" });
  }
});

// ========== 📋 DAILY TASKS ENDPOINTS (added exactly as requested) ==========

// Get user's daily tasks
app.get("/api/user/:telegram_id/daily-tasks", requireDB, validateUser, async (req, res) => {
  try {
    const telegram_id = req.user.telegram_id; // Use authenticated user ID
    const today = new Date().toISOString().split('T')[0];

    const user = await pool.query("SELECT id FROM users WHERE telegram_id = $1", [telegram_id]);
    if (user.rows.length === 0) return res.status(404).json({ error: "User not found" });
    const userId = user.rows[0].id;

    const userTasks = await pool.query(`
      SELECT task_id, progress, completed, completed_at
      FROM daily_tasks 
      WHERE user_id = $1 AND task_date = $2
    `, [userId, today]);

    const tasksWithProgress = DAILY_TASKS.map(task => {
      const userTask = userTasks.rows.find(ut => ut.task_id === task.id);
      return {
        ...task,
        progress: userTask?.progress || 0,
        completed: userTask?.completed || false,
        completed_at: userTask?.completed_at || null
      };
    });

    const totalRewards = tasksWithProgress.reduce((sum, t) => sum + (t.completed ? t.reward : 0), 0);
    const availableRewards = tasksWithProgress.reduce((sum, t) => sum + (!t.completed ? t.reward : 0), 0);

    res.json({
      tasks: tasksWithProgress,
      summary: {
        total_tasks: DAILY_TASKS.length,
        completed_tasks: tasksWithProgress.filter(t => t.completed).length,
        total_rewards_earned: totalRewards,
        available_rewards: availableRewards
      }
    });
  } catch (error) {
    console.error("Daily tasks error:", error);
    res.status(500).json({ error: "Failed to fetch daily tasks" });
  }
});

// Update task progress
app.post("/api/user/:telegram_id/task-progress", requireDB, validateUser, async (req, res) => {
  try {
    const telegram_id = req.user.telegram_id; // Use authenticated user ID
    const { task_id, progress_value } = req.body;

    const user = await pool.query("SELECT id FROM users WHERE telegram_id = $1", [telegram_id]);
    if (user.rows.length === 0) return res.status(404).json({ error: "User not found" });
    const userId = user.rows[0].id;

    const today = new Date().toISOString().split('T')[0];
    const task = DAILY_TASKS.find(t => t.id === task_id);
    if (!task) return res.status(400).json({ error: "Invalid task" });

    const isCompleted = progress_value >= task.target;

    await pool.query(`
      INSERT INTO daily_tasks (user_id, task_id, progress, completed, completed_at, task_date)
      VALUES ($1, $2, $3, $4, $5, $6)
      ON CONFLICT (user_id, task_id, task_date)
      DO UPDATE SET 
        progress = GREATEST(daily_tasks.progress, $3),
        completed = $4,
        completed_at = CASE WHEN $4 AND NOT daily_tasks.completed THEN $5 ELSE daily_tasks.completed_at END
    `, [userId, task_id, progress_value, isCompleted, isCompleted ? new Date() : null, today]);

    if (isCompleted) {
      await pool.query(
        "UPDATE users SET bonus_coins = bonus_coins + $1 WHERE id = $2",
        [task.reward, userId]
      );

      res.json({ 
        success: true, 
        task_completed: true,
        reward_earned: task.reward,
        message: `🎉 Task completed! +${task.reward} coins!`
      });
    } else {
      res.json({ 
        success: true, 
        task_completed: false,
        progress: progress_value,
        target: task.target
      });
    }
  } catch (error) {
    console.error("Task progress error:", error);
    res.status(500).json({ error: "Failed to update task progress" });
  }
});
// ==========================================================================

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
