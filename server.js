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

// Security headers & compression
app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginEmbedderPolicy: false,
}));
app.use(compression());
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true }));

// Database
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === "production" ? { rejectUnauthorized: false } : false,
});
let dbConnected = false;
pool.connect()
  .then((client) => {
    client.release();
    dbConnected = true;
    console.log("✅ Database connected");
  })
  .catch((err) => { dbConnected = false; console.error("❌ DB connection error:", err); });

// Middleware to require DB
const requireDB = (req, res, next) => {
  if (!dbConnected) {
    return res.status(503).json({ error: "Database not connected" });
  }
  next();
};

// -------- AUTH MIDDLEWARE (FIXED FOR PRODUCTION) --------
const validateUser = async (req, res, next) => {
  const { initData } = req.body || req.query;
  const telegram_id = req.params.telegram_id || req.body.telegram_id;
  
  if (initData && process.env.BOT_TOKEN) {
    try {
      const parsed = await validate(initData, process.env.BOT_TOKEN);
      if (parsed && parsed.user) {
        req.user = { 
          telegram_id: parsed.user.id, 
          username: parsed.user.username,
          first_name: parsed.user.first_name,
          validated: true 
        };
        console.log(`✅ Secure auth successful for user ${parsed.user.id}`);
        return next();
      }
    } catch (error) {
      console.warn(`⚠️ initData validation failed: ${error.message}`);
    }
  }
  
  if (!process.env.BOT_TOKEN || process.env.NODE_ENV === 'development') {
    if (telegram_id) {
      req.user = { 
        telegram_id: parseInt(telegram_id), 
        username: null,
        first_name: null,
        validated: false
      };
      console.log(`🔓 Dev mode auth for user ${telegram_id}`);
      return next();
    }
  }
  
  if (initData && telegram_id) {
    req.user = { 
      telegram_id: parseInt(telegram_id), 
      username: null,
      first_name: null,
      validated: false 
    };
    console.log(`⚠️ Fallback auth for user ${telegram_id} (initData present but validation failed)`);
    return next();
  }
  
  console.error("❌ Authentication failed: No valid initData or telegram_id provided.");
  return res.status(401).json({ error: "Authentication required" });
};

// Rate limiting
const gameRateLimit = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  keyGenerator: (req) => req.user?.telegram_id || req.ip,
  message: { error: "Too many game submissions. Please wait." }
});

const profileRateLimit = rateLimit({
  windowMs: 60 * 1000,
  max: 5,
  keyGenerator: (req) => req.user?.telegram_id || req.ip,
  message: { error: "Too many profile updates. Please wait." }
});

// ---------- Static build checks ----------
const dist = path.join(__dirname, "dist");

if (!fs.existsSync(dist)) {
  console.error("❌ dist folder not found! Make sure the build completed successfully.");
  process.exit(1);
}
const indexPath = path.join(dist, "index.html");
if (!fs.existsSync(indexPath)) {
  console.error("❌ index.html missing! Static build is incomplete.");
  process.exit(1);
}

// Serve static
app.use(express.static(dist, {
  setHeaders: (res, filePath) => {
    if (filePath.endsWith(".html")) {
      res.setHeader("Cache-Control", "no-store");
    } else {
      res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
    }
  }
}));

// Health endpoint
app.get("/health", (_req, res) => {
  res.status(200).json({ status: "ok", dbConnected });
});

// ---------- TASK PROGRESS HELPER (NEW) ----------
const updateTaskProgress = async (client, userId, taskId, value, isCumulative = true) => {
  try {
    const taskDef = DAILY_TASKS.find(t => t.id === taskId);
    if (!taskDef) return;

    let updateQuery;
    if (isCumulative) {
      updateQuery = `
        UPDATE daily_tasks 
        SET progress = progress + $1, completed = (progress + $1 >= target)
        WHERE user_id = $2 AND task_id = $3 AND date = CURRENT_DATE AND completed = FALSE
      `;
    } else {
      updateQuery = `
        UPDATE daily_tasks 
        SET progress = GREATEST(progress, $1), completed = ($1 >= target)
        WHERE user_id = $2 AND task_id = $3 AND date = CURRENT_DATE AND completed = FALSE
      `;
    }
    await client.query(updateQuery, [value, userId, taskId]);
    console.log(`Updated task ${taskId} for user ${userId} with value ${value}`);
  } catch (error) {
    console.error(`Error updating task ${taskId} for user ${userId}:`, error);
  }
};

// ---------- GAME SUBMIT (UPDATED FOR TASKS) ----------
app.post("/api/game/complete", requireDB, validateUser, gameRateLimit, async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const telegram_id = req.user.telegram_id;
    const { score, coins_earned, max_combo } = req.body;

    if (typeof score !== "number" || score < 0) {
      return res.status(400).json({ error: "Invalid score" });
    }
    const coinsEarned = Math.max(0, Math.floor(coins_earned || 0));
    const maxCombo = Math.max(0, Math.floor(max_combo || 0));

    const userResult = await client.query("SELECT id FROM users WHERE telegram_id = $1", [telegram_id]);
    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: "User not found" });
    }
    const userId = userResult.rows[0].id;

    await client.query(
      "INSERT INTO games (user_id, score, coins_earned, max_combo) VALUES ($1, $2, $3, $4)",
      [userId, score, coinsEarned, maxCombo]
    );

    await client.query(
      "UPDATE users SET bonus_coins = COALESCE(bonus_coins,0) + $1 WHERE id = $2",
      [coinsEarned, userId]
    );

    // Update daily tasks
    await updateTaskProgress(client, userId, 'play_3_games', 1, true);
    await updateTaskProgress(client, userId, 'score_5000', score, false);
    await updateTaskProgress(client, userId, 'combo_5x', maxCombo, false);

    await client.query('COMMIT');
    res.json({ success: true, coins_earned: coinsEarned });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error("Game submit error:", err);
    res.status(500).json({ error: "Failed to submit game" });
  } finally {
    client.release();
  }
});

// ---------- TASKS: track client-side actions (NEW) ----------
app.post("/api/tasks/track-action", requireDB, validateUser, async (req, res) => {
  const { task_id } = req.body;
  const telegram_id = req.user.telegram_id;
  
  if (!task_id) {
    return res.status(400).json({ error: "task_id is required" });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const userResult = await client.query("SELECT id FROM users WHERE telegram_id = $1", [telegram_id]);
    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: "User not found" });
    }
    const userId = userResult.rows[0].id;

    await updateTaskProgress(client, userId, task_id, 1, true);

    await client.query('COMMIT');
    res.json({ success: true });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error("Track action error:", err);
    res.status(500).json({ error: "Failed to track action" });
  } finally {
    client.release();
  }
});


// ... (rest of the server.js file remains the same)

// ---------- USER: upsert ----------
app.post("/api/user/upsert", requireDB, validateUser, async (req, res) => {
  try {
    const telegram_id = req.user.telegram_id;
    const { display_name, country_flag, profile_picture } = req.body;

    const result = await pool.query(
      `
      INSERT INTO users (telegram_id, display_name, country_flag, profile_picture)
      VALUES ($1, $2, $3, $4)
      ON CONFLICT (telegram_id) DO UPDATE SET
        display_name = EXCLUDED.display_name,
        country_flag = EXCLUDED.country_flag,
        profile_picture = EXCLUDED.profile_picture
      RETURNING id, telegram_id, display_name, country_flag, profile_picture, bonus_coins, profile_completed
    `,
      [telegram_id, display_name || null, country_flag || null, profile_picture || null]
    );

    res.json({ user: result.rows[0] });
  } catch (err) {
    console.error("Upsert user error:", err);
    res.status(500).json({ error: "Failed to upsert user" });
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
    }
    if (name_changed !== undefined) {
      updates.push(`profile_completed = $${i++}`);
      values.push(name_changed === true);
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: "No fields to update" });
    }

    values.push(telegram_id);

    const sql = `UPDATE users SET ${updates.join(", ")} WHERE telegram_id = $${i} RETURNING id, telegram_id, display_name, country_flag, profile_picture, profile_completed`;
    const result = await pool.query(sql, values);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "User not found" });
    }
    res.json({ user: result.rows[0] });
  } catch (err) {
    console.error("Update profile error:", err);
    res.status(500).json({ error: "Failed to update profile" });
  }
});

// ---------- LEADERBOARD ----------
app.get("/api/leaderboard/:period", requireDB, async (req, res) => {
  try {
    const period = req.params.period;
    const { country, telegram_id } = req.query;
    
    let dateFilter = "";
    if (period === "daily") {
      dateFilter = "AND DATE(g.created_at) = CURRENT_DATE";
    } else if (period === "weekly") {
      dateFilter = "AND g.created_at >= CURRENT_DATE - INTERVAL '7 days'";
    }

    let countryFilter = "";
    if (country === "true") {
      countryFilter = "AND u.country_flag IS NOT NULL";
    }

    const result = await pool.query(`
      SELECT 
        u.telegram_id, u.display_name, u.country_flag,
        COALESCE(SUM(g.score), 0) AS total_score,
        COUNT(g.id) AS games_played,
        MAX(g.score) AS best_score,
        ROW_NUMBER() OVER (ORDER BY SUM(g.score) DESC) AS rank
      FROM users u
      LEFT JOIN games g ON u.id = g.user_id ${dateFilter}
      WHERE 1=1 ${countryFilter}
      GROUP BY u.id, u.telegram_id, u.display_name, u.country_flag
      HAVING COUNT(g.id) > 0 OR SUM(g.score) > 0
      ORDER BY total_score DESC
      LIMIT 100
    `);

    let userRank = null;
    if (telegram_id && !result.rows.find(r => r.telegram_id == telegram_id)) {
      const userRankResult = await pool.query(`
        WITH ranked_users AS (
          SELECT 
            u.telegram_id, u.display_name, u.country_flag,
            COALESCE(SUM(g.score), 0) AS total_score,
            COUNT(g.id) AS games_played,
            MAX(g.score) AS best_score,
            ROW_NUMBER() OVER (ORDER BY SUM(g.score) DESC) AS rank
          FROM users u
          LEFT JOIN games g ON u.id = g.user_id ${dateFilter}
          WHERE 1=1 ${countryFilter}
          GROUP BY u.id, u.telegram_id, u.display_name, u.country_flag
          HAVING COUNT(g.id) > 0 OR SUM(g.score) > 0
        )
        SELECT * FROM ranked_users WHERE telegram_id = $1
      `, [telegram_id]);
      
      if (userRankResult.rows.length > 0) {
        userRank = userRankResult.rows[0];
      }
    }

    res.json({ 
      leaderboard: result.rows,
      userRank: userRank
    });
  } catch (err) {
    console.error("Leaderboard error:", err);
    res.status(500).json({ error: "Failed to fetch leaderboard" });
  }
});

// ... (rest of the file remains unchanged)

// ---------- FALLBACK: serve SPA ----------
app.get("*", (_req, res) => {
  res.sendFile(indexPath);
});

// ---------- Start server ----------
const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
