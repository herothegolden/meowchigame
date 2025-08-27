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

// Replace your validateUser function in server.js with this improved version:
const validateUser = async (req, res, next) => {
  console.log('🔐 validateUser called');
  console.log('📋 Headers:', Object.keys(req.headers));
  console.log('🎯 X-Telegram-Init-Data header present:', !!req.headers['x-telegram-init-data']);
  
  // Safely check headers, body, and query for auth data
  const initData = req.headers['x-telegram-init-data'] || (req.body && req.body.initData) || (req.query && req.query.initData);
  const telegram_id = req.params.telegram_id || (req.body && req.body.telegram_id);

  console.log('📱 initData present:', !!initData);
  console.log('🆔 telegram_id present:', !!telegram_id);

  if (initData && process.env.BOT_TOKEN) {
    try {
      const parsed = validate(initData, process.env.BOT_TOKEN);
      if (parsed && parsed.user) {
        console.log('✅ Telegram validation successful');
        req.user = { 
          telegram_id: parsed.user.id, 
          username: parsed.user.username,
          first_name: parsed.user.first_name,
          validated: true 
        };
        return next();
      }
    } catch (error) {
      console.warn(`⚠️ initData validation failed: ${error.message}`);
    }
  }

  if (telegram_id) {
    console.log('🔓 Using fallback telegram_id authentication');
    req.user = { 
      telegram_id, 
      validated: false 
    };
    return next();
  }

  // TEMPORARY: Allow development/testing without authentication
  if (process.env.NODE_ENV === 'development') {
    console.log('🚧 Development mode: allowing request without auth');
    req.user = {
      telegram_id: '12345', // Replace with your test user ID
      validated: false
    };
    return next();
  }

  console.error("❌ Authentication failed: No valid initData or telegram_id provided.");
  return res.status(401).json({ error: "Authentication required" });
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


// ---------- Setup endpoint (UPDATED) ----------
app.get("/api/setup/database", async (req, res) => {
  if (!pool || !dbConnected) {
    return res.status(503).json({ success: false, error: "Database not connected" });
  }
  try {
    console.log("🔧 Setting up database tables.");
    
    // Drop tables in correct order
    await pool.query("DROP TABLE IF EXISTS squad_members CASCADE");
    await pool.query("DROP TABLE IF EXISTS squads CASCADE");
    await pool.query("DROP TABLE IF EXISTS user_powerups CASCADE");
    await pool.query("DROP TABLE IF EXISTS daily_tasks CASCADE");
    await pool.query("DROP TABLE IF EXISTS games CASCADE");
    await pool.query("DROP TABLE IF EXISTS users CASCADE");

    // Create tables
    await pool.query(`
      CREATE TABLE users (
        id SERIAL PRIMARY KEY,
        telegram_id BIGINT UNIQUE NOT NULL,
        display_name VARCHAR(50),
        country_flag VARCHAR(10),
        profile_picture TEXT,
        bonus_coins INTEGER DEFAULT 0,
        profile_completed BOOLEAN DEFAULT FALSE,
        name_changed BOOLEAN DEFAULT FALSE,
        picture_changed BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `);
    
    // NEW: Squads Table
    await pool.query(`
      CREATE TABLE squads (
        id SERIAL PRIMARY KEY,
        name VARCHAR(50) UNIQUE NOT NULL,
        icon VARCHAR(10),
        invite_code VARCHAR(10) UNIQUE NOT NULL,
        created_by INTEGER REFERENCES users(id),
        member_limit INTEGER DEFAULT 11,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `);
    
    // NEW: Squad Members Table
    await pool.query(`
      CREATE TABLE squad_members (
        id SERIAL PRIMARY KEY,
        squad_id INTEGER REFERENCES squads(id) ON DELETE CASCADE,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE UNIQUE, -- User can only be in one squad
        joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `);

    await pool.query(`
      CREATE TABLE games (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        score INTEGER NOT NULL CHECK (score >= 0 AND score <= 10000),
        coins_earned INTEGER DEFAULT 0,
        moves_used INTEGER,
        max_combo INTEGER DEFAULT 0,
        game_duration INTEGER,
        played_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `);
    
    await pool.query(`
      CREATE TABLE IF NOT EXISTS daily_tasks (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        task_id VARCHAR(50) NOT NULL,
        progress INTEGER DEFAULT 0,
        completed BOOLEAN DEFAULT FALSE,
        claimed BOOLEAN DEFAULT FALSE,
        completed_at TIMESTAMP WITH TIME ZONE,
        task_date DATE DEFAULT CURRENT_DATE,
        UNIQUE(user_id, task_id, task_date)
      );
    `);
    
    await pool.query(`
      CREATE TABLE IF NOT EXISTS user_powerups (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        powerup_id VARCHAR(50) NOT NULL,
        quantity INTEGER NOT NULL DEFAULT 0,
        UNIQUE(user_id, powerup_id)
      );
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
      RETURNING *, (created_at = updated_at) as is_new_user;
      `,
      [user.telegram_id, user.username || user.first_name || null]
    );

    const dbUser = result.rows[0];
    const shouldPromptProfile = dbUser.is_new_user && !dbUser.profile_completed;

    res.json({ user: dbUser, shouldPromptProfile, auth_method: user.validated ? 'secure' : 'legacy' });
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

    // NEW: Mark profile as completed if name and country are set
    if (display_name && country_flag) {
      updates.push(`profile_completed = $${i++}`);
      values.push(true);
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


// CHANGE 2: Update /api/game/complete to add coins to the user's main balance
app.post("/api/game/complete", requireDB, validateUser, gameRateLimit, async (req, res) => {
  try {
    const { score, moves_used, max_combo, game_duration } = req.body;
    const telegramIdFromAuth = req.user.telegram_id;

    // --- Validation & anti-cheat (unchanged essentials) ---
    if (score === undefined) {
      return res.status(400).json({ error: "Score is required" });
    }
    if (score < 0 || score > 10000) {
      return res.status(400).json({ error: "Invalid score range" });
    }
    const duration = game_duration || 0;
    if (duration > 0 && duration < 10) {
      return res.status(400).json({ error: "Game duration too short" });
    }
    if (score > 0 && (moves_used || 0) < 1) {
      return res.status(400).json({ error: "Invalid moves count" });
    }

    // --- Server-authoritative coin calculation ---
    const RATE = parseFloat(process.env.COIN_RATE ?? '0.10');
    const MIN  = parseInt(process.env.COIN_MIN ?? '10', 10);
    const CAP  = parseInt(process.env.COIN_CAP ?? '100', 10);
    const COMBO_BONUS = parseFloat(process.env.COIN_COMBO_BONUS ?? '0.05');
    const comboSteps = Math.max(0, Math.min(20, Number(max_combo || 0)));
    const bonusMult = 1 + comboSteps * COMBO_BONUS;
    let computedCoins = Math.round(Math.max(0, Number(score || 0)) * RATE * bonusMult);
    computedCoins = Math.max(MIN, Math.min(computedCoins, CAP));

    const userResult = await pool.query("SELECT id FROM users WHERE telegram_id = $1", [telegramIdFromAuth]);
    if (userResult.rows.length === 0) return res.status(404).json({ error: "User not found" });
    const userId = userResult.rows[0].id;

    // Save the game and update user coins atomically
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const game = await client.query(
        `INSERT INTO games (user_id, score, coins_earned, moves_used, max_combo, game_duration)
         VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
        [userId, score, computedCoins, moves_used ?? null, max_combo || 0, game_duration ?? null]
      );

      await client.query(
        `UPDATE users SET bonus_coins = COALESCE(bonus_coins, 0) + $1 WHERE id = $2`,
        [computedCoins, userId]
      );

      await client.query('COMMIT');
      res.json({ message: "Game saved successfully", game: game.rows[0] });
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }
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


// ========== 🐾 SQUADS ENDPOINTS (FULLY IMPLEMENTED) ==========

// GET top squads leaderboard (UNCHANGED BEHAVIOR; REPLACED VERBATIM)
app.get("/api/squads/leaderboard", requireDB, async (_req, res) => {
  try {
    const lb = await pool.query(`
      SELECT 
        s.id, 
        s.name, 
        s.icon, 
        s.invite_code,
        COUNT(DISTINCT sm.user_id) as member_count,
        COALESCE(SUM(g.score), 0) as total_score
      FROM squads s
      LEFT JOIN squad_members sm ON s.id = sm.squad_id
      LEFT JOIN games g ON g.user_id = sm.user_id
      GROUP BY s.id, s.name, s.icon, s.invite_code
      ORDER BY total_score DESC
      LIMIT 100
    `);
    
    res.json({
      leaderboard: lb.rows.map(r => ({
        ...r,
        member_count: Number(r.member_count || 0),
        total_score: Number(r.total_score || 0)
      }))
    });
  } catch (error) {
    console.error("CRASH in /api/squads/leaderboard:", error);
    res.status(500).json({ error: "Internal Server Error", details: error.message });
  }
});

// ADD THIS NEW ENDPOINT to server.js

// REPLACE the entire dashboard endpoint in server.js with this corrected version
app.get("/api/squads/dashboard", requireDB, validateUser, async (req, res) => {
  try {
    const telegram_id = req.user.telegram_id;

    // First, get the user's squad ID
    const squadIdResult = await pool.query(`
      SELECT sm.squad_id 
      FROM squad_members sm
      JOIN users u ON sm.user_id = u.id
      WHERE u.telegram_id = $1
    `, [telegram_id]);

    if (squadIdResult.rows.length === 0) {
      return res.json({ squad: null }); // User is not in a squad
    }

    const squadId = squadIdResult.rows[0].squad_id;

    // Now, fetch the full details for that squad ID (similar to the :squadId endpoint)
    const head = await pool.query(
      `SELECT s.id, s.name, s.icon, s.invite_code, s.created_at, s.created_by, s.member_limit,
              u_creator.telegram_id as creator_telegram_id,
              (SELECT COUNT(*) FROM squad_members sm WHERE sm.squad_id = s.id) as member_count,
              (SELECT COALESCE(SUM(g.score),0) 
                 FROM games g JOIN squad_members sm ON g.user_id = sm.user_id 
                WHERE sm.squad_id = s.id) as total_score
       FROM squads s
       LEFT JOIN users u_creator ON s.created_by = u_creator.id
       WHERE s.id = $1`,
      [squadId]
    );

    if (head.rows.length === 0) return res.status(404).json({ error: "Squad not found" });

    const members = await pool.query(
      `SELECT u.id as user_id, u.display_name, u.country_flag, u.telegram_id, u.profile_picture,
              COALESCE(SUM(g.score),0) as total_score
       FROM squad_members sm
       JOIN users u ON u.id = sm.user_id
       LEFT JOIN games g ON g.user_id = u.id
       WHERE sm.squad_id = $1
       GROUP BY u.id, u.display_name, u.country_flag, u.telegram_id, u.profile_picture
       ORDER BY total_score DESC`,
      [squadId]
    );

    const s = head.rows[0];
    const squadData = {
      ...s,
      member_count: Number(s.member_count || 0),
      total_score: Number(s.total_score || 0),
      members: members.rows.map(m => ({ ...m, total_score: Number(m.total_score || 0) }))
    };

    res.json({ squad: squadData });
  } catch (error) {
    console.error("CRASH in /api/squads/dashboard:", error);
    res.status(500).json({ error: "Failed to fetch squad dashboard" });
  }
});

// GET squad details and members (UPDATED WITH CREATOR INFO & LIMITS)
// REPLACED with corrected, explicit subquery to avoid alias issues
app.get("/api/squads/:squadId", requireDB, async (req, res) => {
  try {
    const { squadId } = req.params;
    const head = await pool.query(
      `SELECT s.id, s.name, s.icon, s.invite_code, s.created_at, s.created_by, s.member_limit,
              u_creator.telegram_id as creator_telegram_id,
              u_creator.display_name as creator_name,
              (SELECT COUNT(*) FROM squad_members sm WHERE sm.squad_id = s.id) as member_count,
              (SELECT COALESCE(SUM(g.score),0) 
                 FROM games g JOIN squad_members sm ON g.user_id = sm.user_id 
                WHERE sm.squad_id = s.id) as total_score
       FROM squads s
       LEFT JOIN users u_creator ON s.created_by = u_creator.id
       WHERE s.id = $1`,
      [squadId]
    );
  if (head.rows.length === 0) return res.status(404).json({ error: "Squad not found" });

    const members = await pool.query(
      `SELECT u.id as user_id, u.display_name, u.country_flag, u.telegram_id, u.profile_picture,
              sm.joined_at,
              COALESCE(SUM(g.score),0) as total_score,
              COUNT(g.id) as games_played
       FROM squad_members sm
       JOIN users u ON u.id = sm.user_id
       LEFT JOIN games g ON g.user_id = u.id
       WHERE sm.squad_id = $1
       GROUP BY u.id, u.display_name, u.country_flag, u.telegram_id, u.profile_picture, sm.joined_at
       ORDER BY total_score DESC, sm.joined_at ASC`,
      [squadId]
    );

    const s = head.rows[0];
    res.json({
      squad: {
        id: s.id, name: s.name, icon: s.icon, invite_code: s.invite_code, created_at: s.created_at,
        creator_telegram_id: s.creator_telegram_id, creator_name: s.creator_name,
        member_count: Number(s.member_count || 0), member_limit: Number(s.member_limit || 11),
        total_score: Number(s.total_score || 0),
        members: members.rows.map(m => ({ ...m, total_score: Number(m.total_score || 0), games_played: Number(m.games_played || 0), display_name: m.display_name || `Stray Cat #${m.telegram_id.toString().slice(-5)}` }))
      }
    });
  } catch (error) {
    console.error("Get squad details failed:", error);
    res.status(500).json({ error: "Failed to get squad details" });
  }
});

// GET user's current squad
app.get("/api/user/:telegram_id/squad", requireDB, validateUser, async (req, res) => {
  try {
    const telegram_id = req.user.telegram_id;
    const result = await pool.query(`
      SELECT s.id, s.name, s.icon, s.invite_code,
             (SELECT COUNT(*) FROM squad_members sm WHERE sm.squad_id = s.id) as member_count,
             (SELECT COALESCE(SUM(g.score), 0) FROM games g 
                JOIN squad_members sm ON g.user_id = sm.user_id 
              WHERE sm.squad_id = s.id) as total_score
      FROM squads s
      JOIN squad_members sm ON s.id = sm.squad_id
      JOIN users u ON sm.user_id = u.id
      WHERE u.telegram_id = $1
    `, [telegram_id]);
    if (result.rows.length === 0) { return res.json({ squad: null }); }
    res.json({ squad: result.rows[0] });
  } catch (error) {
    console.error("Failed to get user squad:", error);
    res.status(500).json({ error: "Failed to get user squad" });
  }
});

// POST to create a new squad (FIXED ERROR HANDLING)
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

    const newSquad = await client.query(
      `INSERT INTO squads (name, icon, invite_code, created_by) VALUES ($1, $2, $3, $4) RETURNING id`,
      [name, icon, invite_code, userId]
    );
    const squadId = newSquad.rows[0].id;

    await client.query(
      `INSERT INTO squad_members (squad_id, user_id) VALUES ($1, $2)`,
      [squadId, userId]
    );

    await client.query('COMMIT');
    res.status(201).json({ success: true, message: "Squad created!" });
  } catch (error) {
    await client.query('ROLLBACK');
    // **THIS IS THE FIX**: Check for the unique violation error code
    if (error.code === '23505') { // '23505' is the code for unique_violation
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
    
    if (parseInt(memberCount.rows[0].count) >= memberLimit) {
      return res.status(400).json({ error: "Squad is full (maximum 11 members)." });
    }

    await client.query(
      `INSERT INTO squad_members (squad_id, user_id) VALUES ($1, $2)`,
      [squadId, userId]
    );

    await client.query('COMMIT');
    res.json({ success: true, message: "Successfully joined squad!" });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error("Failed to join squad:", error);
    res.status(500).json({ error: "Failed to join squad" });
  } finally {
    client.release();
  }
});

// POST to kick a member from squad (creator only)
app.post("/api/squads/kick-member", requireDB, validateUser, async (req, res) => {
  const { member_telegram_id } = req.body;
  const creator_telegram_id = req.user.telegram_id;

  if (!member_telegram_id) {
    return res.status(400).json({ error: "Member telegram_id required" });
  }

  if (member_telegram_id === creator_telegram_id) {
    return res.status(400).json({ error: "Cannot kick yourself from the squad" });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Get creator user ID
    const creatorResult = await client.query("SELECT id FROM users WHERE telegram_id = $1", [creator_telegram_id]);
    if (creatorResult.rows.length === 0) throw new Error("Creator not found");
    const creatorId = creatorResult.rows[0].id;

    // Get member user ID
    const memberResult = await client.query("SELECT id FROM users WHERE telegram_id = $1", [member_telegram_id]);
    if (memberResult.rows.length === 0) {
      return res.status(404).json({ error: "Member not found" });
    }
    const memberId = memberResult.rows[0].id;

    // Verify creator owns a squad and member is in that squad
    const squadCheck = await client.query(`
      SELECT s.id as squad_id, s.name as squad_name
      FROM squads s
      JOIN squad_members sm ON s.id = sm.squad_id
      WHERE s.created_by = $1 AND sm.user_id = $2
    `, [creatorId, memberId]);

    if (squadCheck.rows.length === 0) {
      return res.status(403).json({ error: "Member not found in your squad or you're not the squad creator" });
    }

    // Remove member from squad
    const kickResult = await client.query(
      "DELETE FROM squad_members WHERE squad_id = $1 AND user_id = $2",
      [squadCheck.rows[0].squad_id, memberId]
    );

    if (kickResult.rowCount === 0) {
      return res.status(404).json({ error: "Member not found in squad" });
    }

    await client.query('COMMIT');
    res.json({ 
      success: true, 
      message: `Member kicked from ${squadCheck.rows[0].squad_name}` 
    });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error("Failed to kick member:", error);
    res.status(500).json({ error: "Failed to kick member" });
  } finally {
    client.release();
  }
});

// ========== 🔥 STREAKS ENDPOINT ==========
// REPLACED with safe 501 to prevent crashes due to missing user_streaks table
app.post("/api/user/check-in", requireDB, validateUser, async (req, res) => {
  // This endpoint references a user_streaks table that is not created in the setup script.
  // It is disabled to prevent server crashes.
  res.status(501).json({ error: "Streaks feature not implemented" });
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

// ---------- SPA fallback with proper caching headers ----------
app.get("/", (_req, res) => {
  // Disable caching for HTML (Telegram WebApp requirement)
  res.set('Cache-Control', 'no-store, must-revalidate');
  res.set('Pragma', 'no-cache');
  res.set('Expires', '0');
  res.sendFile(indexPath);
});

app.get("*", (_req, res) => {
  // Disable caching for HTML fallback routes too
  res.set('Cache-Control', 'no-store, must-revalidate');
  res.set('Pragma', 'no-cache');  
  res.set('Expires', '0');
  res.sendFile(indexPath);
});

// ---------- Start ----------
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 Server listening on port ${PORT}`));
