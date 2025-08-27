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
  // Get auth data from body (for POST/PUT) or query (for GET)
  const { initData } = req.body || req.query;
  // Get telegram_id from params (for GET routes like /user/:id/...) or body (for POST)
  const telegram_id = req.params.telegram_id || req.body.telegram_id;
  
  // Try secure authentication first if initData is present
  if (initData && process.env.BOT_TOKEN) {
    try {
      // Validate the initData
      const parsed = validate(initData, process.env.BOT_TOKEN);
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
      // Fall through to check if we're in development or have telegram_id
    }
  }
  
  // DEVELOPMENT FALLBACK: If no BOT_TOKEN or in development, allow with telegram_id
  if (!process.env.BOT_TOKEN || process.env.NODE_ENV === 'development') {
    if (telegram_id) {
      req.user = { 
        telegram_id: parseInt(telegram_id), 
        username: null,
        first_name: null,
        validated: false  // Mark as unvalidated for logging
      };
      console.log(`🔓 Dev mode auth for user ${telegram_id}`);
      return next();
    }
  }
  
  // PRODUCTION FALLBACK: Try to extract telegram_id from initData even if validation failed
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
  
  // No valid authentication provided
  console.error("❌ Authentication failed: No valid initData or telegram_id provided.");
  return res.status(401).json({ error: "Authentication required" });
};

// Rate limiting for game endpoints
const gameRateLimit = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 10, // limit each user to 10 games per minute
  keyGenerator: (req) => req.user?.telegram_id || req.ip,
  message: { error: "Too many game submissions. Please wait." }
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

// Health endpoint (used by Railway)
app.get("/health", (_req, res) => res.json({ ok: true, dbConnected }));

// ---------- Setup endpoint (UPDATED) ----------
app.get("/api/setup/database", async (req, res) => {
  if (!pool || !dbConnected) {
    return res.status(503).json({ success: false, error: "Database not connected" });
  }
  try {
    console.log("🔧 Setting up database tables.");
    
    // Drop tables in correct order
    await pool.query("DROP TABLE IF EXISTS user_streaks CASCADE");
    await pool.query("DROP TABLE IF EXISTS squad_members CASCADE");
    await pool.query("DROP TABLE IF EXISTS squads CASCADE");
    await pool.query("DROP TABLE IF EXISTS user_powerups CASCADE");
    await pool.query("DROP TABLE IF EXISTS daily_tasks CASCADE");
    await pool.query("DROP TABLE IF EXISTS games CASCADE");
    await pool.query("DROP TABLE IF EXISTS users CASCADE");

    // Create users table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        telegram_id BIGINT UNIQUE NOT NULL,
        display_name TEXT,
        country_flag TEXT,
        profile_picture TEXT,
        profile_completed BOOLEAN DEFAULT FALSE,
        bonus_coins INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    // Create games table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS games (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        score INTEGER NOT NULL,
        coins_earned INTEGER DEFAULT 0,
        max_combo INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    // Create daily tasks table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS daily_tasks (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        task_id TEXT NOT NULL,
        progress INTEGER DEFAULT 0,
        target INTEGER DEFAULT 0,
        completed BOOLEAN DEFAULT FALSE,
        claimed BOOLEAN DEFAULT FALSE,
        date DATE DEFAULT CURRENT_DATE,
        UNIQUE (user_id, task_id, date)
      )
    `);

    // Create powerups table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS user_powerups (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        type TEXT NOT NULL,
        quantity INTEGER DEFAULT 0,
        updated_at TIMESTAMP DEFAULT NOW(),
        UNIQUE (user_id, type)
      )
    `);

    // Create user_streaks table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS user_streaks (
        id SERIAL PRIMARY KEY,
        user_id INTEGER UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        current_streak INTEGER DEFAULT 0,
        last_check_in_date DATE,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);
    
    // Create squads table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS squads (
        id SERIAL PRIMARY KEY,
        name TEXT UNIQUE NOT NULL,
        icon TEXT,
        invite_code TEXT UNIQUE NOT NULL,
        owner_user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        member_limit INTEGER DEFAULT 11,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    // Create squad_members table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS squad_members (
        id SERIAL PRIMARY KEY,
        squad_id INTEGER REFERENCES squads(id) ON DELETE CASCADE,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        role TEXT DEFAULT 'member',
        joined_at TIMESTAMP DEFAULT NOW(),
        UNIQUE (squad_id, user_id)
      )
    `);

    console.log("✅ Database tables created.");
    res.json({ success: true });
  } catch (err) {
    console.error("❌ Setup error:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

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

// ---------- GAME SUBMIT ----------
app.post("/api/game/complete", requireDB, validateUser, gameRateLimit, async (req, res) => {
  try {
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

    await pool.query(
      "INSERT INTO games (user_id, score, coins_earned, max_combo) VALUES ($1, $2, $3, $4)",
      [userId, score, coinsEarned, maxCombo]
    );

    await pool.query(
      "UPDATE users SET bonus_coins = COALESCE(bonus_coins,0) + $1 WHERE id = $2",
      [coinsEarned, userId]
    );

    res.json({ success: true, coins_earned: coinsEarned });
  } catch (err) {
    console.error("Game submit error:", err);
    res.status(500).json({ error: "Failed to submit game" });
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

    // Get user's rank if not in top 100
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

app.get("/api/squads/leaderboard", requireDB, async (_req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        s.id, s.name, s.icon,
        COUNT(sm.user_id) AS member_count,
        COALESCE(SUM(user_scores.total_score), 0) AS total_score
      FROM squads s
      LEFT JOIN squad_members sm ON sm.squad_id = s.id
      LEFT JOIN (
        SELECT user_id, SUM(score) as total_score
        FROM games
        GROUP BY user_id
      ) user_scores ON user_scores.user_id = sm.user_id
      GROUP BY s.id
      ORDER BY total_score DESC
      LIMIT 100
    `);
    res.json({ leaderboard: result.rows });
  } catch (err) {
    console.error("Squad leaderboard error:", err);
    res.status(500).json({ error: "Failed to fetch squad leaderboard" });
  }
});

// The DETAILS endpoint (intentionally placed after leaderboard)
app.get("/api/squads/:squadId", requireDB, async (req, res) => {
  try {
    const squadId = parseInt(req.params.squadId, 10);
    if (isNaN(squadId)) return res.status(400).json({ error: "Invalid squad ID" });

    const result = await pool.query(`
      SELECT 
        s.id, s.name, s.icon, s.invite_code, s.member_limit, s.created_at,
        u.telegram_id AS creator_telegram_id,
        u.display_name AS creator_name
      FROM squads s
      LEFT JOIN users u ON u.id = s.owner_user_id
      WHERE s.id = $1
    `, [squadId]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Squad not found" });
    }

    const members = await pool.query(`
      SELECT 
        u.telegram_id, u.display_name, u.country_flag, u.profile_picture,
        sm.role, sm.joined_at,
        COALESCE(user_scores.total_score, 0) AS total_score
      FROM squad_members sm
      JOIN users u ON u.id = sm.user_id
      LEFT JOIN (
        SELECT user_id, SUM(score) as total_score
        FROM games
        GROUP BY user_id
      ) user_scores ON user_scores.user_id = u.id
      WHERE sm.squad_id = $1
      ORDER BY total_score DESC, sm.joined_at ASC
    `, [squadId]);

    const squad = result.rows[0];
    squad.member_count = members.rows.length;
    squad.members = members.rows;

    res.json({ squad });
  } catch (err) {
    console.error("Squad details error:", err);
    res.status(500).json({ error: "Failed to fetch squad details" });
  }
});

// Get user's squad info
app.get("/api/user/:telegram_id/squad", requireDB, validateUser, async (req, res) => {
  try {
    const telegram_id = req.user.telegram_id;

    const result = await pool.query(`
      SELECT s.id, s.name, s.icon
      FROM squads s
      JOIN squad_members sm ON sm.squad_id = s.id
      JOIN users u ON u.id = sm.user_id
      WHERE u.telegram_id = $1
    `, [telegram_id]);

    if (result.rows.length === 0) {
      return res.json({ squad: null });
    }

    res.json({ squad: result.rows[0] });
  } catch (err) {
    console.error("User squad error:", err);
    res.status(500).json({ error: "Failed to fetch user squad" });
  }
});

// ---------- SQUADS: create ----------
app.post("/api/squads/create", requireDB, validateUser, async (req, res) => {
  const { name, icon } = req.body;
  const telegram_id = req.user.telegram_id;

  if (!name || name.length < 3 || name.length > 50) {
    return res.status(400).json({ error: "Squad name must be between 3 and 50 characters." });
  }

  const invite_code = Math.random().toString(36).substring(2, 8).toUpperCase();

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const userResult = await client.query("SELECT id FROM users WHERE telegram_id = $1", [telegram_id]);
    if (userResult.rows.length === 0) throw new Error("User not found");
    const userId = userResult.rows[0].id;

    const existingSquad = await client.query("SELECT id FROM squad_members WHERE user_id = $1", [userId]);
    if (existingSquad.rows.length > 0) {
      return res.status(400).json({ error: "You are already in a squad." });
    }

    const squadInsert = await client.query(
      `INSERT INTO squads (name, icon, invite_code, owner_user_id) 
       VALUES ($1, $2, $3, $4) RETURNING id`,
      [name, icon || null, invite_code, userId]
    );
    const squadId = squadInsert.rows[0].id;

    await client.query(
      `INSERT INTO squad_members (squad_id, user_id) VALUES ($1, $2)`,
      [squadId, userId]
    );

    await client.query('COMMIT');
    res.status(201).json({ success: true, message: "Squad created!" });
  } catch (error) {
    await client.query('ROLLBACK');
    if (error.code === '23505') {
      return res.status(400).json({ error: "A squad with this name already exists." });
    }
    console.error("Failed to create squad:", error);
    res.status(500).json({ error: "Failed to create squad" });
  } finally {
    client.release();
  }
});

// POST to join a squad (UPDATED WITH MEMBER LIMIT)
app.post("/api/squads/join", requireDB, validateUser, async (req, res) => {
  const { invite_code } = req.body;
  const telegram_id = req.user.telegram_id;

  if (!invite_code || invite_code.length !== 6) {
    return res.status(400).json({ error: "Invalid invite code." });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const userResult = await client.query("SELECT id FROM users WHERE telegram_id = $1", [telegram_id]);
    if (userResult.rows.length === 0) throw new Error("User not found");
    const userId = userResult.rows[0].id;

    const existingSquad = await client.query("SELECT id FROM squad_members WHERE user_id = $1", [userId]);
    if (existingSquad.rows.length > 0) {
      return res.status(400).json({ error: "You are already in a squad." });
    }

    const squadResult = await client.query("SELECT id, member_limit FROM squads WHERE invite_code = $1", [invite_code.toUpperCase()]);
    if (squadResult.rows.length === 0) {
      return res.status(404).json({ error: "Squad not found with this invite code." });
    }
    const squadId = squadResult.rows[0].id;
    const memberLimit = squadResult.rows[0].member_limit || 11;

    // Check member limit
    const memberCount = await client.query(
      "SELECT COUNT(*) as count FROM squad_members WHERE squad_id = $1",
      [squadId]
    );
    const count = parseInt(memberCount.rows[0].count, 10) || 0;
    if (count >= memberLimit) {
      return res.status(400).json({ error: "This squad is full." });
    }

    await client.query(
      "INSERT INTO squad_members (squad_id, user_id) VALUES ($1, $2)",
      [squadId, userId]
    );

    await client.query('COMMIT');
    res.json({ success: true, message: "Joined squad!" });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error("Join squad error:", err);
    res.status(500).json({ error: "Failed to join squad" });
  } finally {
    client.release();
  }
});

// ---------- DAILY TASKS ----------
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
    description: 'Bring one friend to play Meowchi',
    reward: 500,
    icon: '👫',
    target: 1,
    type: 'invites'
  }
];

// Fetch daily tasks (GET)
app.get("/api/user/:telegram_id/daily-tasks", requireDB, validateUser, async (req, res) => {
  try {
    const telegram_id = req.user.telegram_id;

    // Ensure user exists
    const userResult = await pool.query("SELECT id FROM users WHERE telegram_id = $1", [telegram_id]);
    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: "User not found" });
    }
    const userId = userResult.rows[0].id;

    // Ensure tasks for today exist (insert if missing)
    for (const t of DAILY_TASKS) {
      await pool.query(
        `
        INSERT INTO daily_tasks (user_id, task_id, target, date)
        VALUES ($1, $2, $3, CURRENT_DATE)
        ON CONFLICT (user_id, task_id, date) DO NOTHING
        `,
        [userId, t.id, t.target]
      );
    }

    // Fetch today's tasks
    const tasksRes = await pool.query(
      `
      SELECT task_id, progress, target, completed, claimed
      FROM daily_tasks
      WHERE user_id = $1 AND date = CURRENT_DATE
      ORDER BY task_id ASC
      `,
      [userId]
    );

    const tasks = tasksRes.rows.map(row => {
      const def = DAILY_TASKS.find(d => d.id === row.task_id);
      return {
        id: row.task_id,
        title: def?.title || row.task_id,
        description: def?.description || "",
        reward: def?.reward || 0,
        icon: def?.icon || "⭐",
        progress: parseInt(row.progress || 0, 10),
        target: parseInt(row.target || 0, 10),
        completed: row.completed,
        claimed: row.claimed
      };
    });

    res.json({ tasks });
  } catch (err) {
    console.error("Fetch daily tasks error:", err);
    res.status(500).json({ error: "Failed to fetch daily tasks" });
  }
});

// Claim a task (POST)
app.post("/api/user/:telegram_id/task-claim", requireDB, validateUser, async (req, res) => {
  try {
    const telegram_id = req.user.telegram_id;
    const { task_id } = req.body;

    if (!task_id) return res.status(400).json({ error: "task_id is required" });

    const userResult = await pool.query("SELECT id FROM users WHERE telegram_id = $1", [telegram_id]);
    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: "User not found" });
    }
    const userId = userResult.rows[0].id;

    const taskRes = await pool.query(
      `
      SELECT id, completed, claimed FROM daily_tasks
      WHERE user_id = $1 AND task_id = $2 AND date = CURRENT_DATE
      `,
      [userId, task_id]
    );
    if (taskRes.rows.length === 0) {
      return res.status(404).json({ error: "Task not found for today" });
    }
    const task = taskRes.rows[0];
    if (!task.completed) {
      return res.status(400).json({ error: "Task not completed yet" });
    }
    if (task.claimed) {
      return res.status(400).json({ error: "Task already claimed" });
    }

    await pool.query(
      "UPDATE daily_tasks SET claimed = TRUE WHERE id = $1",
      [task.id]
    );

    const reward = DAILY_TASKS.find(t => t.id === task_id)?.reward || 0;
    await pool.query(
      "UPDATE users SET bonus_coins = COALESCE(bonus_coins,0) + $1 WHERE id = $2",
      [reward, userId]
    );

    res.json({ success: true, reward_earned: reward, message: "Task claimed successfully!" });
  } catch (err) {
    console.error("Claim task error:", err);
    res.status(500).json({ error: "Failed to claim task" });
  }
});

// ---------- STATS (POST - SINGLE IMPLEMENTATION) ----------
app.post("/api/user/:telegram_id/stats", requireDB, validateUser, async (req, res) => {
  try {
    const telegram_id = req.user.telegram_id;
    
    const userResult = await pool.query(`
      SELECT 
        u.id, u.telegram_id, u.display_name, u.country_flag, u.profile_picture, u.bonus_coins,
        u.profile_completed, u.created_at,
        COALESCE(g.total_score, 0) as total_score,
        COALESCE(g.games_played, 0) as games_played,
        COALESCE(g.best_score, 0) as best_score,
        COALESCE(g.best_combo, 0) as best_combo
      FROM users u
      LEFT JOIN (
        SELECT 
          user_id,
          SUM(score) as total_score,
          COUNT(*) as games_played,
          MAX(score) as best_score,
          MAX(max_combo) as best_combo
        FROM games 
        GROUP BY user_id
      ) g ON g.user_id = u.id
      WHERE u.telegram_id = $1
    `, [telegram_id]);

    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: "User not found" });
    }

    const user = userResult.rows[0];
    user.display_name = user.display_name || `Stray Cat #${user.telegram_id.toString().slice(-5)}`;

    res.json({ 
      user: {
        ...user,
        total_score: parseInt(user.total_score || 0),
        games_played: parseInt(user.games_played || 0),
        best_score: parseInt(user.best_score || 0),
        best_combo: parseInt(user.best_combo || 0),
        bonus_coins: parseInt(user.bonus_coins || 0),
        total_coins_earned: parseInt(user.bonus_coins || 0),
      }
    });
  } catch (err) {
    console.error("User stats error:", err);
    res.status(500).json({ error: "Failed to get user stats" });
  }
});

// ---------- CHECK-IN (ENABLED & CORRECTED) ----------
app.post("/api/user/check-in", requireDB, validateUser, async (req, res) => {
  const telegram_id = req.user.telegram_id;
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');

    const userResult = await client.query("SELECT id FROM users WHERE telegram_id = $1", [telegram_id]);
    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: "User not found" });
    }
    const userId = userResult.rows[0].id;

    const streakResult = await client.query(
      "SELECT current_streak, last_check_in_date FROM user_streaks WHERE user_id = $1",
      [userId]
    );

    const today = new Date().toISOString().split('T')[0];
    let newStreak = 1;

    if (streakResult.rows.length > 0) {
      const streakData = streakResult.rows[0];
      
      const lastCheckIn = streakData.last_check_in_date ? new Date(streakData.last_check_in_date).toISOString().split('T')[0] : null;
      
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = yesterday.toISOString().split('T')[0];

      if (lastCheckIn === today) {
        newStreak = streakData.current_streak;
      } else if (lastCheckIn === yesterdayStr) {
        newStreak = streakData.current_streak + 1;
      }
    }

    const updatedStreak = await client.query(`
      INSERT INTO user_streaks (user_id, current_streak, last_check_in_date, updated_at)
      VALUES ($1, $2, CURRENT_DATE, NOW())
      ON CONFLICT (user_id) DO UPDATE SET
        current_streak = EXCLUDED.current_streak,
        last_check_in_date = EXCLUDED.last_check_in_date,
        updated_at = NOW()
      RETURNING current_streak
    `, [userId, newStreak]);

    await client.query('COMMIT');
    res.json({ success: true, streak: updatedStreak.rows[0].current_streak });

  } catch (err) {
    await client.query('ROLLBACK');
    console.error("Check-in error:", err);
    res.status(500).json({ error: "Failed to process check-in" });
  } finally {
    client.release();
  }
});

// ---------- SHOP ----------
app.post("/api/shop/buy", requireDB, validateUser, async (req, res) => {
  try {
    const telegram_id = req.user.telegram_id;
    const { item_id } = req.body;

    const userResult = await pool.query("SELECT id, bonus_coins FROM users WHERE telegram_id = $1", [telegram_id]);
    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: "User not found" });
    }
    
    const user = userResult.rows[0];
    const userId = user.id;
    const currentCoins = parseInt(user.bonus_coins || 0);

    // Define shop items with prices
    const items = {
      "shuffle": { name: "The Paw-sitive Swap", price: 50 },
      "hammer": { name: "The Catnip Cookie", price: 75 },
      "bomb": { name: "The Marshmallow Bomb", price: 100 },
    };

    const item = items[item_id];
    if (!item) {
      return res.status(400).json({ error: "Invalid item" });
    }

    if (currentCoins < item.price) {
      return res.status(400).json({ error: "Not enough coins" });
    }

    // Deduct coins and add powerup
    const newCoins = currentCoins - item.price;
    await pool.query("UPDATE users SET bonus_coins = $1 WHERE id = $2", [newCoins, userId]);
    
    await pool.query(`
      INSERT INTO user_powerups (user_id, type, quantity)
      VALUES ($1, $2, 1)
      ON CONFLICT (user_id, type) DO UPDATE SET
        quantity = user_powerups.quantity + 1,
        updated_at = NOW()
    `, [userId, item_id]);

    res.json({ success: true, newCoinBalance: newCoins, message: `Purchased ${item.name}!` });
  } catch (err) {
    console.error("Shop purchase error:", err);
    res.status(500).json({ error: "Failed to process purchase" });
  }
});

// ---------- FALLBACK: serve SPA ----------
// IMPORTANT: This must be LAST, after all API routes
app.get("*", (_req, res) => {
  res.sendFile(indexPath);
});

// ---------- Start server ----------
const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
