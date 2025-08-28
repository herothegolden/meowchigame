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

// Daily Tasks Configuration
const DAILY_TASKS = [
  {
    id: 'play_3_games',
    title: 'Daily Player',
    description: 'Play 3 games today',
    reward: 200,
    icon: '🎮',
    target: 3,
    type: 'games_played'
  },
  {
    id: 'score_5000',
    title: 'High Scorer',
    description: 'Score 5,000+ points in one game',
    reward: 300,
    icon: '🎯',
    target: 5000,
    type: 'single_score'
  },
  {
    id: 'combo_5x',
    title: 'Combo Master',
    description: 'Get a 5x combo',
    reward: 400,
    icon: '🔥',
    target: 5,
    type: 'max_combo'
  },
  {
    id: 'invite_friend',
    title: 'Social Cat',
    description: 'Invite a friend to play',
    reward: 500,
    icon: '👥',
    target: 1,
    type: 'referrals'
  },
  {
    id: 'check_leaderboard',
    title: 'Competitive Spirit',
    description: 'Check the leaderboard',
    reward: 100,
    icon: '🏆',
    target: 1,
    type: 'page_visit'
  }
];

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

const shopRateLimit = rateLimit({
  windowMs: 60 * 1000,
  max: 20,
  keyGenerator: (req) => req.user?.telegram_id || req.ip,
  message: { error: "Too many shop requests. Please wait." }
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

// ---------- TASK PROGRESS HELPER ----------
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

// Initialize daily tasks for user
const initializeDailyTasks = async (client, userId) => {
  try {
    for (const task of DAILY_TASKS) {
      await client.query(`
        INSERT INTO daily_tasks (user_id, task_id, date, target, progress, completed, claimed)
        VALUES ($1, $2, CURRENT_DATE, $3, 0, FALSE, FALSE)
        ON CONFLICT (user_id, task_id, date) DO NOTHING
      `, [userId, task.id, task.target]);
    }
  } catch (error) {
    console.error('Error initializing daily tasks:', error);
  }
};

// ---------- USER: upsert ----------
app.post("/api/user/upsert", requireDB, validateUser, async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    const telegram_id = req.user.telegram_id;
    const { display_name, country_flag, profile_picture } = req.body;

    const result = await client.query(
      `
      INSERT INTO users (telegram_id, display_name, country_flag, profile_picture)
      VALUES ($1, $2, $3, $4)
      ON CONFLICT (telegram_id) DO UPDATE SET
        display_name = EXCLUDED.display_name,
        country_flag = EXCLUDED.country_flag,
        profile_picture = EXCLUDED.profile_picture,
        updated_at = NOW()
      RETURNING id, telegram_id, display_name, country_flag, profile_picture, bonus_coins, profile_completed
    `,
      [telegram_id, display_name || null, country_flag || null, profile_picture || null]
    );

    const user = result.rows[0];
    
    // Initialize daily tasks
    await initializeDailyTasks(client, user.id);

    await client.query('COMMIT');
    res.json({ user });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error("Upsert user error:", err);
    res.status(500).json({ error: "Failed to upsert user" });
  } finally {
    client.release();
  }
});

// ---------- USER STATS ----------
app.post("/api/user/:telegram_id/stats", requireDB, validateUser, async (req, res) => {
  try {
    const telegram_id = parseInt(req.params.telegram_id);
    
    const result = await pool.query(`
      SELECT 
        u.id, u.telegram_id, u.display_name, u.country_flag, u.profile_picture, 
        u.bonus_coins, u.profile_completed,
        COALESCE(COUNT(g.id), 0) as games_played,
        COALESCE(MAX(g.score), 0) as best_score,
        COALESCE(MAX(g.max_combo), 0) as best_combo,
        COALESCE(SUM(g.score), 0) as total_score,
        COALESCE(us.current_streak, 0) as streak
      FROM users u
      LEFT JOIN games g ON u.id = g.user_id
      LEFT JOIN user_streaks us ON u.id = us.user_id
      WHERE u.telegram_id = $1
      GROUP BY u.id, us.current_streak
    `, [telegram_id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "User not found" });
    }

    res.json({ user: result.rows[0] });
  } catch (err) {
    console.error("Get user stats error:", err);
    res.status(500).json({ error: "Failed to get user stats" });
  }
});

// ---------- USER CHECK-IN (STREAK) ----------
app.post("/api/user/check-in", requireDB, validateUser, async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    const telegram_id = req.user.telegram_id;
    
    const userResult = await client.query("SELECT id FROM users WHERE telegram_id = $1", [telegram_id]);
    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: "User not found" });
    }

    const userId = userResult.rows[0].id;
    
    // Get current streak data
    const streakResult = await client.query(
      "SELECT current_streak, last_check_in FROM user_streaks WHERE user_id = $1",
      [userId]
    );

    const today = new Date().toDateString();
    let currentStreak = 1;
    
    if (streakResult.rows.length > 0) {
      const streak = streakResult.rows[0];
      const lastCheckIn = streak.last_check_in ? new Date(streak.last_check_in).toDateString() : null;
      
      if (lastCheckIn === today) {
        // Already checked in today
        currentStreak = streak.current_streak || 1;
      } else if (lastCheckIn) {
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        if (lastCheckIn === yesterday.toDateString()) {
          // Consecutive day
          currentStreak = (streak.current_streak || 0) + 1;
        }
      }

      // Update existing streak
      await client.query(
        "UPDATE user_streaks SET current_streak = $1, last_check_in = CURRENT_DATE WHERE user_id = $2",
        [currentStreak, userId]
      );
    } else {
      // Create new streak record
      await client.query(
        "INSERT INTO user_streaks (user_id, current_streak, last_check_in) VALUES ($1, $2, CURRENT_DATE)",
        [userId, currentStreak]
      );
    }

    await client.query('COMMIT');
    res.json({ success: true, streak: currentStreak });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error("Check-in error:", err);
    res.status(500).json({ error: "Failed to check in" });
  } finally {
    client.release();
  }
});

// ---------- POWERUPS ----------
app.get("/api/user/:telegram_id/powerups", requireDB, async (req, res) => {
  try {
    const telegram_id = parseInt(req.params.telegram_id);
    
    const result = await pool.query(`
      SELECT up.item_id, COALESCE(up.quantity, 0) as quantity
      FROM users u
      LEFT JOIN user_powerups up ON u.id = up.user_id
      WHERE u.telegram_id = $1
    `, [telegram_id]);

    const powerups = {};
    result.rows.forEach(row => {
      if (row.item_id) {
        powerups[row.item_id] = row.quantity;
      }
    });

    // Ensure all powerup types exist
    ['shuffle', 'hammer', 'bomb'].forEach(item => {
      if (!(item in powerups)) {
        powerups[item] = 0;
      }
    });

    res.json({ powerups });
  } catch (err) {
    console.error("Get powerups error:", err);
    res.status(500).json({ error: "Failed to get powerups" });
  }
});

// ---------- SHOP ----------
app.post("/api/shop/buy", requireDB, validateUser, shopRateLimit, async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    const { item_id } = req.body;
    const telegram_id = req.user.telegram_id;
    
    const items = {
      shuffle: { price: 50, name: "Paw-sitive Swap" },
      hammer: { price: 75, name: "Catnip Cookie" },
      bomb: { price: 100, name: "Marshmallow Bomb" }
    };

    if (!items[item_id]) {
      return res.status(400).json({ error: "Invalid item" });
    }

    const item = items[item_id];
    
    // Get user
    const userResult = await client.query("SELECT id, bonus_coins FROM users WHERE telegram_id = $1", [telegram_id]);
    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: "User not found" });
    }

    const user = userResult.rows[0];
    const currentCoins = user.bonus_coins || 0;

    if (currentCoins < item.price) {
      return res.status(400).json({ error: "Insufficient coins" });
    }

    // Deduct coins
    const newBalance = currentCoins - item.price;
    await client.query("UPDATE users SET bonus_coins = $1 WHERE id = $2", [newBalance, user.id]);

    // Add powerup
    await client.query(`
      INSERT INTO user_powerups (user_id, item_id, quantity)
      VALUES ($1, $2, 1)
      ON CONFLICT (user_id, item_id)
      DO UPDATE SET quantity = user_powerups.quantity + 1
    `, [user.id, item_id]);

    await client.query('COMMIT');
    res.json({ 
      success: true, 
      newCoinBalance: newBalance,
      item: item.name 
    });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error("Shop buy error:", err);
    res.status(500).json({ error: "Failed to purchase item" });
  } finally {
    client.release();
  }
});

// ---------- USE POWERUP ----------
app.post("/api/powerups/use", requireDB, validateUser, async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    const { item_id } = req.body;
    const telegram_id = req.user.telegram_id;
    
    const userResult = await client.query("SELECT id FROM users WHERE telegram_id = $1", [telegram_id]);
    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: "User not found" });
    }

    const userId = userResult.rows[0].id;
    
    // Check if user has powerup
    const powerupResult = await client.query(
      "SELECT quantity FROM user_powerups WHERE user_id = $1 AND item_id = $2",
      [userId, item_id]
    );

    if (powerupResult.rows.length === 0 || powerupResult.rows[0].quantity <= 0) {
      return res.status(400).json({ error: "No powerups available" });
    }

    // Use powerup
    await client.query(
      "UPDATE user_powerups SET quantity = quantity - 1 WHERE user_id = $1 AND item_id = $2",
      [userId, item_id]
    );

    await client.query('COMMIT');
    res.json({ success: true });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error("Use powerup error:", err);
    res.status(500).json({ error: "Failed to use powerup" });
  } finally {
    client.release();
  }
});

// ---------- DAILY TASKS ----------
app.get("/api/user/:telegram_id/daily-tasks", requireDB, async (req, res) => {
  try {
    const telegram_id = parseInt(req.params.telegram_id);
    
    // Get user
    const userResult = await pool.query("SELECT id FROM users WHERE telegram_id = $1", [telegram_id]);
    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: "User not found" });
    }
    const userId = userResult.rows[0].id;
    
    // Initialize tasks if needed
    const client = await pool.connect();
    try {
      await initializeDailyTasks(client, userId);
    } finally {
      client.release();
    }

    // Get tasks with progress
    const result = await pool.query(`
      SELECT dt.task_id, dt.progress, dt.completed, dt.claimed
      FROM daily_tasks dt
      WHERE dt.user_id = $1 AND dt.date = CURRENT_DATE
    `, [userId]);

    const tasks = DAILY_TASKS.map(taskDef => {
      const taskProgress = result.rows.find(r => r.task_id === taskDef.id) || 
                          { progress: 0, completed: false, claimed: false };
      
      return {
        ...taskDef,
        progress: taskProgress.progress,
        completed: taskProgress.completed,
        claimed: taskProgress.claimed
      };
    });

    res.json({ tasks });
  } catch (err) {
    console.error("Get daily tasks error:", err);
    res.status(500).json({ error: "Failed to get daily tasks" });
  }
});

// ---------- CLAIM TASK REWARD ----------
app.post("/api/user/:telegram_id/task-claim", requireDB, validateUser, async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    const { task_id } = req.body;
    const telegram_id = parseInt(req.params.telegram_id);
    
    const userResult = await pool.query("SELECT id, bonus_coins FROM users WHERE telegram_id = $1", [telegram_id]);
    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: "User not found" });
    }
    const user = userResult.rows[0];

    // Check if task is completed and not claimed
    const taskResult = await pool.query(
      "SELECT completed, claimed FROM daily_tasks WHERE user_id = $1 AND task_id = $2 AND date = CURRENT_DATE",
      [user.id, task_id]
    );

    if (taskResult.rows.length === 0) {
      return res.status(404).json({ error: "Task not found" });
    }

    const task = taskResult.rows[0];
    if (!task.completed) {
      return res.status(400).json({ error: "Task not completed" });
    }
    if (task.claimed) {
      return res.status(400).json({ error: "Task already claimed" });
    }

    // Find task definition
    const taskDef = DAILY_TASKS.find(t => t.id === task_id);
    if (!taskDef) {
      return res.status(404).json({ error: "Task definition not found" });
    }

    // Award coins and mark as claimed
    const newCoins = (user.bonus_coins || 0) + taskDef.reward;
    await client.query("UPDATE users SET bonus_coins = $1 WHERE id = $2", [newCoins, user.id]);
    await client.query(
      "UPDATE daily_tasks SET claimed = TRUE WHERE user_id = $1 AND task_id = $2 AND date = CURRENT_DATE",
      [user.id, task_id]
    );

    await client.query('COMMIT');
    res.json({ 
      success: true, 
      reward_earned: taskDef.reward,
      message: `Claimed ${taskDef.reward} coins for ${taskDef.title}!`
    });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error("Claim task error:", err);
    res.status(500).json({ error: "Failed to claim task" });
  } finally {
    client.release();
  }
});

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

    const userResult = await pool.query("SELECT id FROM users WHERE telegram_id = $1", [telegram_id]);
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

// ---------- TASKS: track client-side actions ----------
app.post("/api/tasks/track-action", requireDB, validateUser, async (req, res) => {
  const { task_id } = req.body;
  const telegram_id = req.user.telegram_id;
  
  if (!task_id) {
    return res.status(400).json({ error: "task_id is required" });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const userResult = await pool.query("SELECT id FROM users WHERE telegram_id = $1", [telegram_id]);
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

// ---------- SQUADS ----------
app.get("/api/user/:telegram_id/squad", requireDB, async (req, res) => {
  try {
    const telegram_id = parseInt(req.params.telegram_id);
    
    const result = await pool.query(`
      SELECT s.id, s.name, s.icon, s.invite_code, s.creator_telegram_id
      FROM squad_members sm
      JOIN squads s ON sm.squad_id = s.id
      JOIN users u ON sm.user_id = u.id
      WHERE u.telegram_id = $1
    `, [telegram_id]);

    if (result.rows.length === 0) {
      return res.json({ squad: null });
    }

    res.json({ squad: result.rows[0] });
  } catch (err) {
    console.error("Get user squad error:", err);
    res.status(500).json({ error: "Failed to get squad" });
  }
});

app.get("/api/squads/:squad_id", requireDB, async (req, res) => {
  try {
    const squad_id = parseInt(req.params.squad_id);
    
    const squadResult = await pool.query(
      "SELECT * FROM squads WHERE id = $1", 
      [squad_id]
    );

    if (squadResult.rows.length === 0) {
      return res.status(404).json({ error: "Squad not found" });
    }

    const membersResult = await pool.query(`
      SELECT 
        u.telegram_id, u.display_name, u.country_flag, u.profile_picture,
        COALESCE(SUM(g.score), 0) as total_score
      FROM squad_members sm
      JOIN users u ON sm.user_id = u.id
      LEFT JOIN games g ON u.id = g.user_id
      WHERE sm.squad_id = $1
      GROUP BY u.id, u.telegram_id, u.display_name, u.country_flag, u.profile_picture
      ORDER BY total_score DESC
    `, [squad_id]);

    const squad = squadResult.rows[0];
    squad.members = membersResult.rows;
    squad.member_count = membersResult.rows.length;

    res.json({ squad });
  } catch (err) {
    console.error("Get squad details error:", err);
    res.status(500).json({ error: "Failed to get squad details" });
  }
});

app.post("/api/squads/create", requireDB, validateUser, async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    const { name, icon } = req.body;
    const telegram_id = req.user.telegram_id;

    if (!name || !icon) {
      return res.status(400).json({ error: "Name and icon required" });
    }

    const userResult = await client.query("SELECT id FROM users WHERE telegram_id = $1", [telegram_id]);
    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: "User not found" });
    }
    const userId = userResult.rows[0].id;

    // Generate invite code
    const inviteCode = Math.random().toString(36).substring(2, 8).toUpperCase();

    const squadResult = await client.query(`
      INSERT INTO squads (name, icon, creator_telegram_id, invite_code)
      VALUES ($1, $2, $3, $4)
      RETURNING id
    `, [name, icon, telegram_id, inviteCode]);

    const squadId = squadResult.rows[0].id;

    // Add creator as member
    await client.query(
      "INSERT INTO squad_members (squad_id, user_id) VALUES ($1, $2)",
      [squadId, userId]
    );

    await client.query('COMMIT');
    res.json({ success: true, squad_id: squadId });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error("Create squad error:", err);
    res.status(500).json({ error: "Failed to create squad" });
  } finally {
    client.release();
  }
});

app.post("/api/squads/join", requireDB, validateUser, async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    const { invite_code } = req.body;
    const telegram_id = req.user.telegram_id;

    if (!invite_code) {
      return res.status(400).json({ error: "Invite code required" });
    }

    const userResult = await client.query("SELECT id FROM users WHERE telegram_id = $1", [telegram_id]);
    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: "User not found" });
    }
    const userId = userResult.rows[0].id;

    const squadResult = await client.query("SELECT id FROM squads WHERE invite_code = $1", [invite_code]);
    if (squadResult.rows.length === 0) {
      return res.status(404).json({ error: "Invalid invite code" });
    }
    const squadId = squadResult.rows[0].id;

    // Check if already member
    const memberResult = await client.query(
      "SELECT id FROM squad_members WHERE squad_id = $1 AND user_id = $2",
      [squadId, userId]
    );
    if (memberResult.rows.length > 0) {
      return res.status(400).json({ error: "Already a member" });
    }

    await client.query(
      "INSERT INTO squad_members (squad_id, user_id) VALUES ($1, $2)",
      [squadId, userId]
    );

    await client.query('COMMIT');
    res.json({ success: true });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error("Join squad error:", err);
    res.status(500).json({ error: "Failed to join squad" });
  } finally {
    client.release();
  }
});

app.get("/api/squads/leaderboard", requireDB, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        s.id, s.name, s.icon,
        COUNT(sm.user_id) as member_count,
        COALESCE(SUM(user_scores.total_score), 0) as total_score
      FROM squads s
      LEFT JOIN squad_members sm ON s.id = sm.squad_id
      LEFT JOIN (
        SELECT u.id, COALESCE(SUM(g.score), 0) as total_score
        FROM users u
        LEFT JOIN games g ON u.id = g.user_id
        WHERE g.created_at >= CURRENT_DATE - INTERVAL '7 days'
        GROUP BY u.id
      ) user_scores ON sm.user_id = user_scores.id
      GROUP BY s.id, s.name, s.icon
      HAVING COUNT(sm.user_id) > 0
      ORDER BY total_score DESC
      LIMIT 50
    `);

    res.json({ leaderboard: result.rows });
  } catch (err) {
    console.error("Squad leaderboard error:", err);
    res.status(500).json({ error: "Failed to fetch squad leaderboard" });
  }
});

// ---------- FALLBACK: serve SPA ----------
app.get("*", (_req, res) => {
  res.sendFile(indexPath);
});

// ---------- Start server ----------
const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
