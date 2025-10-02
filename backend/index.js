import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import pg from 'pg';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { validate } from './utils.js';
import devToolsRoutes from './devToolsRoutes.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const { Pool } = pg;

// ---- ENV VARS ----
const {
  PORT = 3000,
  DATABASE_URL,
  BOT_TOKEN
} = process.env;

if (!DATABASE_URL || !BOT_TOKEN) {
  console.error("⛔ Missing DATABASE_URL or BOT_TOKEN environment variables");
  process.exit(1);
}

// ---- DATABASE ----
export const pool = new Pool({
  connectionString: DATABASE_URL,
});

// ---- EXPRESS APP ----
const app = express();
app.use(cors());
app.use(express.json());

// ---- DEV TOOLS ROUTES ----
app.use('/api/dev', devToolsRoutes);

// ---- MIDDLEWARE ----
const validateUser = (req, res, next) => {
  const { initData } = req.body;
  if (!initData) {
    return res.status(400).json({ error: 'initData is required' });
  }

  if (!validate(initData, BOT_TOKEN)) {
    return res.status(401).json({ error: 'Invalid data' });
  }

  const params = new URLSearchParams(initData);
  const user = JSON.parse(params.get('user'));

  if (!user || !user.id) {
    return res.status(400).json({ error: 'Invalid user data in initData' });
  }
  
  req.user = user;
  next();
};

// ---- FILE UPLOAD SETUP ----
const uploadsDir = path.join(__dirname, 'uploads', 'avatars');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
  console.log('📁 Created uploads/avatars directory');
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const userId = req.user?.id || 'unknown';
    const timestamp = Date.now();
    const extension = path.extname(file.originalname);
    cb(null, `${userId}_${timestamp}${extension}`);
  }
});

const fileFilter = (req, file, cb) => {
  if (file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(new Error('Only image files are allowed'), false);
  }
};

const uploadAvatar = multer({
  storage: storage,
  limits: {
    fileSize: 2 * 1024 * 1024,
  },
  fileFilter: fileFilter
});

app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// ---- DATABASE SETUP ----
const setupDatabase = async () => {
  const client = await pool.connect();
  try {
    console.log('🗄️ Setting up enhanced database tables...');

    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
          id SERIAL PRIMARY KEY,
          telegram_id BIGINT UNIQUE NOT NULL,
          first_name VARCHAR(255),
          last_name VARCHAR(255),
          username VARCHAR(255),
          points INT DEFAULT 100 NOT NULL,
          level INT DEFAULT 1 NOT NULL,
          daily_streak INT DEFAULT 0 NOT NULL,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          last_login_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          games_played INT DEFAULT 0 NOT NULL,
          high_score INT DEFAULT 0 NOT NULL,
          total_play_time INT DEFAULT 0 NOT NULL
      );
    `);

    const userColumns = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name='users'
    `);
    
    const existingColumns = userColumns.rows.map(row => row.column_name);
    
    const columnsToAdd = [
      { name: 'point_booster_active', type: 'BOOLEAN DEFAULT FALSE NOT NULL' },
      { name: 'point_booster_expires_at', type: 'TIMESTAMP WITH TIME ZONE' },
      { name: 'games_played', type: 'INT DEFAULT 0 NOT NULL' },
      { name: 'high_score', type: 'INT DEFAULT 0 NOT NULL' },
      { name: 'total_play_time', type: 'INT DEFAULT 0 NOT NULL' },
      { name: 'avatar_url', type: 'VARCHAR(500)' },
      { name: 'updated_at', type: 'TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP' }
    ];

    for (const column of columnsToAdd) {
      if (!existingColumns.includes(column.name)) {
        console.log(`📊 Adding ${column.name} column...`);
        await client.query(`ALTER TABLE users ADD COLUMN ${column.name} ${column.type}`);
      }
    }

    const tableCheck = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name='shop_items'
    `);

    if (tableCheck.rowCount === 0) {
      console.log('Creating new shop_items table...');
      await client.query(`
        CREATE TABLE shop_items (
          id SERIAL PRIMARY KEY,
          name VARCHAR(255) NOT NULL,
          description TEXT,
          price INT NOT NULL,
          icon_name VARCHAR(50),
          type VARCHAR(50) DEFAULT 'consumable' NOT NULL
        );
      `);
    } else {
      const hasTypeColumn = tableCheck.rows.some(row => row.column_name === 'type');
      if (!hasTypeColumn) {
        console.log('Adding type column to existing shop_items table...');
        await client.query(`ALTER TABLE shop_items ADD COLUMN type VARCHAR(50) DEFAULT 'consumable' NOT NULL`);
      }
    }
    
    await client.query(`
      CREATE TABLE IF NOT EXISTS user_inventory (
        id SERIAL PRIMARY KEY,
        user_id BIGINT REFERENCES users(telegram_id),
        item_id INT REFERENCES shop_items(id),
        acquired_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // ---- CRITICAL FIX: Database Migration for user_inventory ----
    console.log('🔧 Checking and updating user_inventory table schema...');

    // Check if quantity column exists
    const inventoryColumns = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name='user_inventory' AND table_schema='public'
    `);

    const hasQuantityColumn = inventoryColumns.rows.some(row => row.column_name === 'quantity');

    if (!hasQuantityColumn) {
      console.log('📊 Adding quantity column to user_inventory...');
      
      // Step 1: Add quantity column with default value 1
      await client.query(`
        ALTER TABLE user_inventory 
        ADD COLUMN quantity INT DEFAULT 1 NOT NULL
      `);
      
      // Step 2: Update existing rows to consolidate duplicates
      console.log('🔄 Consolidating duplicate inventory entries...');
      
      // First, create a temporary table with consolidated quantities
      await client.query(`
        CREATE TEMP TABLE inventory_consolidated AS
        SELECT 
          user_id, 
          item_id, 
          COUNT(*) as total_quantity,
          MIN(acquired_at) as first_acquired_at
        FROM user_inventory 
        GROUP BY user_id, item_id
      `);
      
      // Delete all existing inventory records
      await client.query(`DELETE FROM user_inventory`);
      
      // Insert consolidated records
      await client.query(`
        INSERT INTO user_inventory (user_id, item_id, quantity, acquired_at)
        SELECT user_id, item_id, total_quantity, first_acquired_at
        FROM inventory_consolidated
      `);
      
      console.log('✅ Inventory consolidation complete');
    }

    // Check if unique constraint exists
    const constraintCheck = await client.query(`
      SELECT constraint_name 
      FROM information_schema.table_constraints 
      WHERE table_name='user_inventory' 
      AND constraint_type='UNIQUE'
      AND constraint_name='user_inventory_user_item_unique'
    `);

    if (constraintCheck.rowCount === 0) {
      console.log('🔒 Adding unique constraint to prevent duplicate inventory entries...');
      
      await client.query(`
        ALTER TABLE user_inventory 
        ADD CONSTRAINT user_inventory_user_item_unique 
        UNIQUE (user_id, item_id)
      `);
      
      console.log('✅ Unique constraint added');
    }

    console.log('✅ user_inventory table schema updated successfully');

    await client.query(`
      CREATE TABLE IF NOT EXISTS user_badges (
        id SERIAL PRIMARY KEY,
        user_id BIGINT REFERENCES users(telegram_id),
        badge_name VARCHAR(255) NOT NULL,
        acquired_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(user_id, badge_name)
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS game_sessions (
        id SERIAL PRIMARY KEY,
        user_id BIGINT REFERENCES users(telegram_id),
        score INT NOT NULL,
        duration INT NOT NULL,
        items_used JSONB,
        boost_multiplier DECIMAL(3,2) DEFAULT 1.0,
        started_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        ended_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS item_usage_history (
        id SERIAL PRIMARY KEY,
        user_id BIGINT REFERENCES users(telegram_id),
        item_id INT REFERENCES shop_items(id),
        item_name VARCHAR(255) NOT NULL,
        used_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        game_session_id INT REFERENCES game_sessions(id),
        game_score INT DEFAULT 0
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS badge_progress (
        id SERIAL PRIMARY KEY,
        user_id BIGINT REFERENCES users(telegram_id),
        badge_name VARCHAR(255) NOT NULL,
        current_progress INT DEFAULT 0,
        target_progress INT NOT NULL,
        progress_data JSONB,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(user_id, badge_name)
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS user_friends (
        id SERIAL PRIMARY KEY,
        user_id BIGINT REFERENCES users(telegram_id),
        friend_username VARCHAR(255) NOT NULL,
        friend_telegram_id BIGINT,
        added_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(user_id, friend_telegram_id)
      );
    `);

    const shopCheck = await client.query('SELECT COUNT(*) as count FROM shop_items');
    if (parseInt(shopCheck.rows[0].count) === 0) {
      console.log('🪙 Initializing shop items...');
      await client.query(`
        INSERT INTO shop_items (id, name, description, price, icon_name, type) VALUES
        (1, 'Extra Time +10s', 'Extends game time by 10 seconds', 1000, 'Clock', 'consumable'),
        (2, 'Meowchi Magnet', 'Attracts nearby Meowchis automatically', 1500, 'Magnet', 'consumable'),
        (3, 'Cookie Bomb', 'Destroys all Meowchis on screen at once', 2000, 'Bomb', 'consumable'),
        (4, 'Double Points', '2x points for 20 seconds', 2500, 'Zap', 'consumable'),
        (5, 'Rising Star Badge', 'Star profile badge', 5000, 'Star', 'permanent'),
        (6, 'Speed Demon Badge', 'Lightning bolt profile badge', 7500, 'Zap', 'permanent'),
        (7, 'Champion Badge', 'Trophy profile badge', 10000, 'Trophy', 'permanent')
        ON CONFLICT (id) DO UPDATE SET
        name = EXCLUDED.name,
        description = EXCLUDED.description,
        price = EXCLUDED.price,
        icon_name = EXCLUDED.icon_name,
        type = EXCLUDED.type
      `);
    }

    await client.query(`
      CREATE TABLE IF NOT EXISTS user_tasks (
        id SERIAL PRIMARY KEY,
        user_id BIGINT REFERENCES users(telegram_id),
        task_name VARCHAR(255) NOT NULL,
        completed BOOLEAN DEFAULT FALSE,
        completed_at TIMESTAMP WITH TIME ZONE,
        reward_points INT DEFAULT 0,
        verification_data JSONB,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(user_id, task_name)
      );
    `);

    console.log('📊 Setting up global_stats table...');
    
    await client.query(`
      CREATE TABLE IF NOT EXISTS global_stats (
        id INT PRIMARY KEY DEFAULT 1,
        just_sold VARCHAR(100) DEFAULT 'Viral Classic',
        total_eaten_today INT DEFAULT 0,
        active_players INT DEFAULT 0,
        new_players_today INT DEFAULT 0,
        last_updated TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        last_daily_reset DATE DEFAULT CURRENT_DATE,
        CHECK (id = 1)
      );
    `);

    const statsCheck = await client.query('SELECT COUNT(*) as count FROM global_stats');
    if (parseInt(statsCheck.rows[0].count) === 0) {
      console.log('📊 Initializing global stats with seed values...');
      const initialEaten = Math.floor(Math.random() * 15) + 5;
      const initialPlayers = Math.floor(Math.random() * 20) + 10;
      const initialActive = Math.floor(Math.random() * (150 - 37 + 1)) + 37;
      
      await client.query(`
        INSERT INTO global_stats (id, just_sold, total_eaten_today, active_players, new_players_today)
        VALUES (1, 'Viral Classic', $1, $2, $3)
      `, [initialEaten, initialActive, initialPlayers]);
      
      console.log(`📊 Seed values: Eaten=${initialEaten}, Active=${initialActive}, NewPlayers=${initialPlayers}`);
    }

    console.log('✅ Global stats table ready');
    console.log('✅ Enhanced database setup complete!');
  } catch (err) {
    console.error('🚨 Database setup error:', err);
    process.exit(1);
  } finally {
    client.release();
  }
};

// ---- ROUTES ----
app.get('/health', (req, res) => {
  res.status(200).send('OK');
});

app.post('/api/validate', async (req, res) => {
  try {
    const isValid = validate(req.body.initData, process.env.BOT_TOKEN);
    if (!isValid) {
      return res.status(403).json({ error: 'Invalid Telegram initData' });
    }

    const params = new URLSearchParams(req.body.initData);
    const userString = params.get('user');
    
    if (!userString) {
      return res.status(400).json({ error: 'Missing user data in initData' });
    }
    
    const user = JSON.parse(userString);
    
    if (!user || !user.id) {
      return res.status(400).json({ error: 'Invalid user data in initData' });
    }

    const client = await pool.connect();
    try {
      let dbUserResult = await client.query(
        'SELECT * FROM users WHERE telegram_id = $1',
        [user.id]
      );
      let appUser;
      let dailyBonus = null;

      if (dbUserResult.rows.length === 0) {
        console.log(`👤 Creating new user: ${user.first_name} (@${user.username || 'no-username'}) (${user.id})`);
        
        const insertResult = await client.query(
          `INSERT INTO users (telegram_id, first_name, last_name, username)
           VALUES ($1, $2, $3, $4) RETURNING *`,
          [user.id, user.first_name, user.last_name, user.username]
        );
        appUser = insertResult.rows[0];
        
        await client.query(`
          UPDATE global_stats 
          SET new_players_today = new_players_today + 1,
              last_updated = CURRENT_TIMESTAMP
          WHERE id = 1
        `);
        
      } else {
        appUser = dbUserResult.rows[0];

        const needsUpdate = 
          appUser.first_name !== user.first_name || 
          appUser.last_name !== user.last_name || 
          appUser.username !== user.username;
        
        if (needsUpdate) {
          console.log(`🔄 Updating user info for ${user.id}`);
          
          const updateResult = await client.query(
            `UPDATE users SET
             first_name = $1, last_name = $2, username = $3
             WHERE telegram_id = $4 RETURNING *`,
            [user.first_name, user.last_name, user.username, user.id]
          );
          appUser = updateResult.rows[0];
        }

        const lastLogin = appUser.last_login_at;
        const now = new Date();
        
        if (!lastLogin || (now - new Date(lastLogin)) >= 24 * 60 * 60 * 1000) {
          console.log(`🎁 Daily bonus for user ${user.id}`);
          
          const hoursSinceLastLogin = lastLogin ? (now - new Date(lastLogin)) / (1000 * 60 * 60) : null;
          const streakValid = hoursSinceLastLogin && hoursSinceLastLogin < 48;
          const newStreak = streakValid ? appUser.daily_streak + 1 : 1;
          const bonusPoints = 100 * newStreak;
          const newPoints = appUser.points + bonusPoints;
          dailyBonus = { points: bonusPoints, streak: newStreak };

          const updateResult = await client.query(
            'UPDATE users SET last_login_at = CURRENT_TIMESTAMP, daily_streak = $2, points = $3 WHERE telegram_id = $1 RETURNING *',
            [user.id, newStreak, newPoints]
          );
          appUser = updateResult.rows[0];
        }
      }

      const userCount = await client.query('SELECT COUNT(*) as count FROM users WHERE last_login_at > NOW() - INTERVAL \'1 hour\'');
      const activeCount = Math.max(37, parseInt(userCount.rows[0].count));
      
      await client.query(`
        UPDATE global_stats 
        SET active_players = $1,
            last_updated = CURRENT_TIMESTAMP
        WHERE id = 1
      `, [activeCount]);

      console.log(`✅ User ${user.id} (@${user.username || 'no-username'}) validated successfully`);
      res.status(200).json({ ...appUser, dailyBonus });
      
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('🚨 Error in /api/validate:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/update-score', validateUser, async (req, res) => {
  try {
    const { user } = req;
    const { score, duration = 30, itemsUsed = [] } = req.body;
    if (score === undefined) {
      return res.status(400).json({ error: 'Score is required' });
    }

    const baseScore = Math.floor(Number(score) || 0);

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const userResult = await client.query(
        'SELECT points, point_booster_expires_at, high_score, games_played FROM users WHERE telegram_id = $1 FOR UPDATE',
        [user.id]
      );
      
      if (userResult.rowCount === 0) throw new Error('User not found');

      const { points, point_booster_expires_at, high_score, games_played } = userResult.rows[0];
      const boosterActive = point_booster_expires_at && new Date(point_booster_expires_at) > new Date();
      const finalScore = boosterActive ? baseScore * 2 : baseScore;
      const newPoints = points + finalScore;
      const newHighScore = Math.max(high_score || 0, finalScore);
      const newGamesPlayed = (games_played || 0) + 1;

      console.log("Saving score:", finalScore);

      const sessionResult = await client.query(
        `INSERT INTO game_sessions (user_id, score, duration, items_used, boost_multiplier) 
         VALUES ($1, $2, $3, $4, $5) RETURNING id`,
        [user.id, finalScore, duration, JSON.stringify(itemsUsed), boosterActive ? 2 : 1]
      );

      const sessionId = sessionResult.rows[0].id;

      await client.query(
        'UPDATE users SET points = $1, high_score = $2, games_played = $3, total_play_time = total_play_time + $4 WHERE telegram_id = $5',
        [newPoints, newHighScore, newGamesPlayed, duration, user.id]
      );

      await client.query('COMMIT');

      res.status(200).json({ 
        success: true,
        newPoints,
        finalScore,
        sessionId
      });

    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('🚨 Error in /api/update-score:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/get-user-stats', validateUser, async (req, res) => {
  try {
    const { user } = req;
    const client = await pool.connect();
    try {
      const userResult = await client.query(
        'SELECT * FROM users WHERE telegram_id = $1',
        [user.id]
      );
      
      if (userResult.rowCount === 0) {
        return res.status(404).json({ error: 'User not found' });
      }

      const userData = userResult.rows[0];
      
      const avgResult = await client.query(
        'SELECT AVG(score) as avg_score FROM game_sessions WHERE user_id = $1',
        [user.id]
      );
      
      userData.averageScore = Math.floor(avgResult.rows[0]?.avg_score || 0);
      
      userData.totalPlayTime = `${Math.floor(userData.total_play_time / 60)}h ${userData.total_play_time % 60}m`;
      
      res.status(200).json(userData);

    } finally {
      client.release();
    }
  } catch (error) {
    console.error('🚨 Error in /api/get-user-stats:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/get-profile-complete', validateUser, async (req, res) => {
  try {
    const { user } = req;
    const client = await pool.connect();
    try {
      const [userResult, badgesResult, avgResult, progressResult, inventoryResult, shopItemsResult, userShopResult] = await Promise.all([
        client.query(
          `SELECT first_name, username, points, level, daily_streak, created_at,
           games_played, high_score, total_play_time, avatar_url FROM users WHERE telegram_id = $1`, 
          [user.id]
        ),
        client.query('SELECT badge_name FROM user_badges WHERE user_id = $1', [user.id]),
        client.query('SELECT AVG(score) as avg_score FROM game_sessions WHERE user_id = $1', [user.id]),
        client.query('SELECT badge_name, current_progress, target_progress FROM badge_progress WHERE user_id = $1', [user.id]),
        client.query('SELECT item_id, quantity FROM user_inventory WHERE user_id = $1', [user.id]),
        client.query('SELECT * FROM shop_items ORDER BY id ASC'),
        client.query('SELECT points, point_booster_expires_at FROM users WHERE telegram_id = $1', [user.id])
      ]);
      
      if (userResult.rowCount === 0) {
        return res.status(404).json({ error: 'User not found' });
      }
      
      const userData = userResult.rows[0];
      userData.ownedBadges = badgesResult.rows.map(row => row.badge_name);
      userData.averageScore = Math.floor(avgResult.rows[0]?.avg_score || 0);
      userData.totalPlayTime = `${Math.floor(userData.total_play_time / 60)}h ${userData.total_play_time % 60}m`;
      
      const progress = {};
      progressResult.rows.forEach(row => {
        progress[row.badge_name] = Math.round((row.current_progress / row.target_progress) * 100);
      });
      
      const shopData = {
        items: shopItemsResult.rows,
        userPoints: userShopResult.rows[0]?.points || 0,
        inventory: inventoryResult.rows,
        boosterActive: userShopResult.rows[0]?.point_booster_expires_at && 
                      new Date(userShopResult.rows[0].point_booster_expires_at) > new Date(),
        boosterExpiresAt: userShopResult.rows[0]?.point_booster_expires_at || null,
        ownedBadges: badgesResult.rows.map(row => row.badge_name)
      };
      
      res.status(200).json({
        stats: userData,
        badgeProgress: { progress },
        shopData: shopData
      });

    } finally {
      client.release();
    }
  } catch (error) {
    console.error('🚨 Error in /api/get-profile-complete:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/update-profile', validateUser, async (req, res) => {
  try {
    const { user } = req;
    const { firstName } = req.body;
    
    if (!firstName || firstName.trim().length === 0) {
      return res.status(400).json({ error: 'First name is required' });
    }
    
    if (firstName.trim().length > 50) {
      return res.status(400).json({ error: 'First name too long (max 50 characters)' });
    }

    const client = await pool.connect();
    try {
      const result = await client.query(
        'UPDATE users SET first_name = $1 WHERE telegram_id = $2 RETURNING first_name',
        [firstName.trim(), user.id]
      );
      
      if (result.rowCount === 0) {
        return res.status(404).json({ error: 'User not found' });
      }
      
      res.status(200).json({ 
        success: true, 
        firstName: result.rows[0].first_name,
        message: 'Profile updated successfully' 
      });

    } finally {
      client.release();
    }
  } catch (error) {
    console.error('🚨 Error in /api/update-profile:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/update-avatar', (req, res) => {
  uploadAvatar.single('avatar')(req, res, async (err) => {
    try {
      const initData = req.body.initData;
      
      if (!initData) {
        return res.status(400).json({ error: 'initData is required' });
      }

      if (!validate(initData, BOT_TOKEN)) {
        return res.status(401).json({ error: 'Invalid authentication' });
      }

      const params = new URLSearchParams(initData);
      const userString = params.get('user');
      if (!userString) {
        return res.status(400).json({ error: 'Invalid user data' });
      }
      const user = JSON.parse(userString);

      let avatarUrl;

      if (err) {
        if (err instanceof multer.MulterError) {
          if (err.code === 'LIMIT_FILE_SIZE') {
            return res.status(400).json({ error: 'File too large. Maximum size is 2MB.' });
          }
        }
        return res.status(400).json({ error: err.message || 'File upload failed' });
      }

      if (req.file) {
        const relativePath = `uploads/avatars/${req.file.filename}`;
        avatarUrl = `${process.env.BACKEND_URL || `http://localhost:${PORT}`}/${relativePath}`;
        console.log(`📸 Avatar uploaded for user ${user.id}: ${avatarUrl}`);
      } else {
        return res.status(400).json({ error: 'No file uploaded' });
      }

      const client = await pool.connect();
      try {
        const result = await client.query(
          'UPDATE users SET avatar_url = $1, updated_at = CURRENT_TIMESTAMP WHERE telegram_id = $2 RETURNING avatar_url',
          [avatarUrl, user.id]
        );

        if (result.rowCount === 0) {
          return res.status(404).json({ error: 'User not found' });
        }

        res.status(200).json({
          success: true,
          avatarUrl: result.rows[0].avatar_url,
          message: 'Avatar updated successfully'
        });

      } finally {
        client.release();
      }

    } catch (error) {
      console.error('🚨 Error in /api/update-avatar:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });
});

app.post('/api/get-item-usage-history', validateUser, async (req, res) => {
  try {
    const { user } = req;
    const client = await pool.connect();
    try {
      const historyResult = await client.query(`
        SELECT item_name, used_at, game_score
        FROM item_usage_history 
        WHERE user_id = $1
        ORDER BY used_at DESC 
        LIMIT 20
      `, [user.id]);
      
      res.status(200).json(historyResult.rows);

    } finally {
      client.release();
    }
  } catch (error) {
    console.error('🚨 Error in /api/get-item-usage-history:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/get-badge-progress', validateUser, async (req, res) => {
  try {
    const { user } = req;
    const client = await pool.connect();
    try {
      const [progressResult, badgesResult] = await Promise.all([
        client.query(`
          SELECT badge_name, current_progress, target_progress
          FROM badge_progress 
          WHERE user_id = $1
        `, [user.id]),
        client.query(`
          SELECT badge_name, acquired_at
          FROM user_badges 
          WHERE user_id = $1
        `, [user.id])
      ]);
      
      const progress = {};
      progressResult.rows.forEach(row => {
        progress[row.badge_name] = Math.round((row.current_progress / row.target_progress) * 100);
      });
      
      const ownedBadges = badgesResult.rows;
      
      res.status(200).json({
        progress,
        stats: {
          totalBadges: 5,
          unlockedBadges: ownedBadges.length,
          rarityBreakdown: {
            common: 0,
            uncommon: ownedBadges.filter(b => b.badge_name.includes('Bomb')).length,
            rare: ownedBadges.filter(b => b.badge_name.includes('Cookie Master') || b.badge_name.includes('Streak')).length,
            epic: ownedBadges.filter(b => b.badge_name.includes('Speed')).length,
            legendary: ownedBadges.filter(b => b.badge_name.includes('Champion')).length
          }
        }
      });

    } finally {
      client.release();
    }
  } catch (error) {
    console.error('🚨 Error in /api/get-badge-progress:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/get-leaderboard', validateUser, async (req, res) => {
  try {
    const { user } = req;
    const { type = 'global' } = req.body;
    const client = await pool.connect();
    try {
      let query;
      let params = [];

      if (type === 'friends') {
        query = `
          SELECT u.telegram_id, u.first_name, u.username, u.points, u.avatar_url,
                 ROW_NUMBER() OVER (ORDER BY u.points DESC) as rank
          FROM users u
          INNER JOIN user_friends uf ON (uf.friend_telegram_id = u.telegram_id AND uf.user_id = $1)
             OR u.telegram_id = $1
          ORDER BY u.points DESC
          LIMIT 50
        `;
        params = [user.id];
      } else {
        query = `
          SELECT telegram_id, first_name, username, points, avatar_url,
                 ROW_NUMBER() OVER (ORDER BY points DESC) as rank
          FROM users
          ORDER BY points DESC
          LIMIT 50
        `;
      }

      const result = await client.query(query, params);
      
      const leaderboard = result.rows.map(row => ({
        rank: parseInt(row.rank),
        userId: row.telegram_id,
        name: row.first_name,
        username: row.username,
        points: row.points,
        avatarUrl: row.avatar_url,
        isCurrentUser: row.telegram_id.toString() === user.id.toString()
      }));

      const userRank = leaderboard.find(entry => entry.isCurrentUser);

      res.status(200).json({
        leaderboard,
        userRank: userRank ? userRank.rank : null
      });

    } finally {
      client.release();
    }
  } catch (error) {
    console.error('🚨 Error in /api/get-leaderboard:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/shop/purchase', validateUser, async (req, res) => {
  try {
    const { user } = req;
    const { itemId } = req.body;
    
    if (!itemId) {
      return res.status(400).json({ error: 'Item ID is required' });
    }

    console.log(`💰 Purchase request: User ${user.id}, Item ${itemId}`);

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const itemResult = await client.query('SELECT * FROM shop_items WHERE id = $1', [itemId]);
      if (itemResult.rowCount === 0) {
        await client.query('ROLLBACK');
        return res.status(404).json({ error: 'Item not found' });
      }

      const item = itemResult.rows[0];
      const userResult = await client.query(
        'SELECT points FROM users WHERE telegram_id = $1 FOR UPDATE',
        [user.id]
      );
      
      if (userResult.rowCount === 0) {
        await client.query('ROLLBACK');
        return res.status(404).json({ error: 'User not found' });
      }

      const userPoints = userResult.rows[0].points;

      if (userPoints < item.price) {
        await client.query('ROLLBACK');
        return res.status(400).json({ error: 'Insufficient points' });
      }

      const newPoints = userPoints - item.price;
      await client.query(
        'UPDATE users SET points = $1 WHERE telegram_id = $2',
        [newPoints, user.id]
      );

      if (item.type === 'permanent') {
        await client.query(
          'INSERT INTO user_badges (user_id, badge_name) VALUES ($1, $2) ON CONFLICT DO NOTHING',
          [user.id, item.name]
        );
      } else {
        // ✅ FIXED: Corrected PostgreSQL syntax - removed table qualifier
        await client.query(
          `INSERT INTO user_inventory (user_id, item_id, quantity)
           VALUES ($1, $2, 1)
           ON CONFLICT (user_id, item_id)
           DO UPDATE SET quantity = quantity + 1`,
          [user.id, itemId]
        );
      }

      await client.query('COMMIT');

      console.log(`✅ Purchase completed: User ${user.id}, Item ${itemId}, New Points: ${newPoints}`);

      res.status(200).json({
        success: true,
        newPoints,
        item: item.name,
        message: `Successfully purchased ${item.name}`
      });

    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('🚨 Error in /api/shop/purchase:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/shop/use-item', validateUser, async (req, res) => {
  try {
    const { user } = req;
    const { itemId } = req.body;
    
    if (!itemId) {
      return res.status(400).json({ error: 'Item ID is required' });
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const inventoryResult = await client.query(
        'SELECT ui.quantity, si.name FROM user_inventory ui JOIN shop_items si ON ui.item_id = si.id WHERE ui.user_id = $1 AND ui.item_id = $2',
        [user.id, itemId]
      );

      if (inventoryResult.rowCount === 0) {
        await client.query('ROLLBACK');
        return res.status(404).json({ error: 'Item not found in inventory' });
      }

      const { quantity, name: itemName } = inventoryResult.rows[0];

      if (quantity > 1) {
        // Decrease quantity by 1
        await client.query(
          'UPDATE user_inventory SET quantity = quantity - 1 WHERE user_id = $1 AND item_id = $2',
          [user.id, itemId]
        );
      } else {
        // Remove item completely if quantity is 1
        await client.query(
          'DELETE FROM user_inventory WHERE user_id = $1 AND item_id = $2',
          [user.id, itemId]
        );
      }

      if (itemName === 'Double Points') {
        await client.query('UPDATE users SET point_booster_active = TRUE WHERE telegram_id = $1', [user.id]);
      }

      await client.query(
        'INSERT INTO item_usage_history (user_id, item_id, item_name) VALUES ($1, $2, $3)',
        [user.id, itemId, itemName]
      );

      await client.query('COMMIT');

      res.status(200).json({
        success: true,
        itemName,
        message: `Successfully used ${itemName}`
      });

    } catch(e) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('🚨 Error in /api/shop/use-item:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ---- FIXED: Game Item Usage Endpoints with New Database Schema ----

app.post('/api/use-time-booster', validateUser, async (req, res) => {
  try {
    const { user } = req;
    const { itemId, timeBonus } = req.body;
    
    if (!itemId || itemId !== 1) {
      return res.status(400).json({ error: 'Only Extra Time +10s can be used this way.' });
    }
    
    if (!timeBonus || timeBonus !== 10) {
      return res.status(400).json({ error: 'Invalid time bonus value.' });
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // FIXED: Use new quantity-based logic instead of old row deletion
      const inventoryResult = await client.query(
        'SELECT quantity FROM user_inventory WHERE user_id = $1 AND item_id = $2',
        [user.id, itemId]
      );
      
      if (inventoryResult.rowCount === 0) {
        await client.query('ROLLBACK');
        return res.status(400).json({ success: false, error: 'You do not own this item.' });
      }

      const quantity = inventoryResult.rows[0].quantity;

      if (quantity > 1) {
        // Decrease quantity by 1
        await client.query(
          'UPDATE user_inventory SET quantity = quantity - 1 WHERE user_id = $1 AND item_id = $2',
          [user.id, itemId]
        );
      } else {
        // Remove item completely if quantity is 1
        await client.query(
          'DELETE FROM user_inventory WHERE user_id = $1 AND item_id = $2',
          [user.id, itemId]
        );
      }

      await client.query(
        `INSERT INTO item_usage_history (user_id, item_id, item_name) VALUES ($1, $2, 'Extra Time +10s')`,
        [user.id, itemId]
      );
      
      await client.query('COMMIT');
      
      console.log(`⏰ Extra Time +10s used by user ${user.id}`);
      
      res.status(200).json({ 
        success: true, 
        message: 'Extra Time +10s used successfully!',
        timeBonus: timeBonus
      });

    } catch (error) {
      await client.query('ROLLBACK');
      console.error('🚨 Error in /api/use-time-booster:', error);
      res.status(500).json({ success: false, error: 'Internal server error.' });
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('🚨 Error in /api/use-time-booster:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/activate-item', validateUser, async (req, res) => {
  try {
    const { user } = req;
    const { itemId } = req.body;
    
    if (!itemId || itemId !== 4) {
      return res.status(400).json({ error: 'Only Double Points can be activated this way.' });
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // FIXED: Removed "already active" check - allow multiple activations

      // FIXED: Use new quantity-based logic instead of old row deletion
      const inventoryResult = await client.query(
        'SELECT quantity FROM user_inventory WHERE user_id = $1 AND item_id = $2',
        [user.id, itemId]
      );
      
      if (inventoryResult.rowCount === 0) {
        await client.query('ROLLBACK');
        return res.status(400).json({ success: false, error: 'You do not own this item.' });
      }

      const quantity = inventoryResult.rows[0].quantity;

      if (quantity > 1) {
        // Decrease quantity by 1
        await client.query(
          'UPDATE user_inventory SET quantity = quantity - 1 WHERE user_id = $1 AND item_id = $2',
          [user.id, itemId]
        );
      } else {
        // Remove item completely if quantity is 1
        await client.query(
          'DELETE FROM user_inventory WHERE user_id = $1 AND item_id = $2',
          [user.id, itemId]
        );
      }

      // FIXED: Set 20-second timer instead of boolean true
      const expirationTime = new Date(Date.now() + 20000); // 20 seconds from now
      await client.query(
        'UPDATE users SET point_booster_active = TRUE, point_booster_expires_at = $1 WHERE telegram_id = $2', 
        [expirationTime, user.id]
      );
      
      await client.query(
        `INSERT INTO item_usage_history (user_id, item_id, item_name) VALUES ($1, $2, 'Double Points')`,
        [user.id, itemId]
      );
      
      await client.query('COMMIT');
      
      console.log(`⚡ Point booster activated for user ${user.id} (expires in 20s)`);
      
      res.status(200).json({ 
        success: true, 
        message: 'Point Booster activated for 20 seconds!',
        expiresAt: expirationTime.toISOString()
      });

    } catch (error) {
      await client.query('ROLLBACK');
      console.error('🚨 Error in /api/activate-item:', error);
      res.status(500).json({ success: false, error: 'Internal server error.' });
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('🚨 Error in /api/activate-item:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/use-bomb', validateUser, async (req, res) => {
  try {
    const { user } = req;
    const { itemId } = req.body;
    
    if (!itemId || itemId !== 3) {
      return res.status(400).json({ error: 'Only Cookie Bomb can be used this way.' });
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // FIXED: Use new quantity-based logic instead of old row deletion
      const inventoryResult = await client.query(
        'SELECT quantity FROM user_inventory WHERE user_id = $1 AND item_id = $2',
        [user.id, itemId]
      );
      
      if (inventoryResult.rowCount === 0) {
        await client.query('ROLLBACK');
        return res.status(400).json({ success: false, error: 'You do not own this item.' });
      }

      const quantity = inventoryResult.rows[0].quantity;

      if (quantity > 1) {
        // Decrease quantity by 1
        await client.query(
          'UPDATE user_inventory SET quantity = quantity - 1 WHERE user_id = $1 AND item_id = $2',
          [user.id, itemId]
        );
      } else {
        // Remove item completely if quantity is 1
        await client.query(
          'DELETE FROM user_inventory WHERE user_id = $1 AND item_id = $2',
          [user.id, itemId]
        );
      }

      await client.query(
        `INSERT INTO item_usage_history (user_id, item_id, item_name) VALUES ($1, $2, 'Cookie Bomb')`,
        [user.id, itemId]
      );
      
      await client.query('COMMIT');
      
      console.log(`💥 Cookie Bomb used by user ${user.id}`);
      
      res.status(200).json({ 
        success: true, 
        message: 'Cookie Bomb used successfully!'
      });

    } catch (error) {
      await client.query('ROLLBACK');
      console.error('🚨 Error in /api/use-bomb:', error);
      res.status(500).json({ success: false, error: 'Internal server error.' });
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('🚨 Error in /api/use-bomb:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/friends/add', validateUser, async (req, res) => {
  try {
    const { user } = req;
    const { friendUsername } = req.body;
    
    if (!friendUsername) {
      return res.status(400).json({ error: 'Friend username is required' });
    }

    const client = await pool.connect();
    try {
      const friendResult = await client.query(
        'SELECT telegram_id, first_name FROM users WHERE LOWER(username) = LOWER($1)',
        [friendUsername]
      );

      if (friendResult.rowCount === 0) {
        return res.status(404).json({ error: 'User not found' });
      }

      const friend = friendResult.rows[0];

      if (friend.telegram_id.toString() === user.id.toString()) {
        return res.status(400).json({ error: 'Cannot add yourself as a friend' });
      }

      await client.query(
        'INSERT INTO user_friends (user_id, friend_username, friend_telegram_id) VALUES ($1, $2, $3) ON CONFLICT DO NOTHING',
        [user.id, friendUsername, friend.telegram_id]
      );

      res.status(200).json({
        success: true,
        friendName: friend.first_name,
        message: `Added ${friend.first_name} as a friend`
      });

    } finally {
      client.release();
    }
  } catch (error) {
    console.error('🚨 Error in /api/friends/add:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/friends/list', validateUser, async (req, res) => {
  try {
    const { user } = req;
    const client = await pool.connect();
    try {
      const result = await client.query(`
        SELECT u.telegram_id, u.first_name, u.username, u.points, u.avatar_url, uf.added_at
        FROM user_friends uf
        JOIN users u ON uf.friend_telegram_id = u.telegram_id
        WHERE uf.user_id = $1
        ORDER BY uf.added_at DESC
      `, [user.id]);

      const friends = result.rows.map(row => ({
        userId: row.telegram_id,
        name: row.first_name,
        username: row.username,
        points: row.points,
        avatarUrl: row.avatar_url,
        addedAt: row.added_at
      }));

      res.status(200).json({ friends });

    } finally {
      client.release();
    }
  } catch (error) {
    console.error('🚨 Error in /api/friends/list:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ---- GLOBAL STATS ENDPOINTS ----
app.get('/api/global-stats', async (req, res) => {
  try {
    const client = await pool.connect();
    try {
      const statsResult = await client.query('SELECT * FROM global_stats WHERE id = 1');
      
      if (statsResult.rowCount === 0) {
        return res.status(500).json({ error: 'Stats not initialized' });
      }

      const stats = statsResult.rows[0];
      
      const resetCheck = await client.query(`
        SELECT (last_daily_reset < CURRENT_DATE) as needs_reset 
        FROM global_stats 
        WHERE id = 1
      `);
      
      const needsReset = resetCheck.rows[0]?.needs_reset || false;

      if (needsReset) {
        console.log('📅 Resetting daily stats for new day');
        await client.query(`
          UPDATE global_stats 
          SET total_eaten_today = 0,
              new_players_today = 0,
              last_daily_reset = CURRENT_DATE,
              last_updated = CURRENT_TIMESTAMP
          WHERE id = 1
          RETURNING *
        `);
        
        const updatedStats = await client.query('SELECT * FROM global_stats WHERE id = 1');
        return res.status(200).json(updatedStats.rows[0]);
      }

      res.status(200).json(stats);

    } finally {
      client.release();
    }
  } catch (error) {
    console.error('🚨 Error fetching global stats:', error);
    res.status(500).json({ error: 'Failed to fetch global stats' });
  }
});

app.get('/api/global-stats/debug', async (req, res) => {
  try {
    const now = new Date();
    const utcHour = now.getUTCHours();
    const tashkentHour = (utcHour + 5) % 24;
    const isActive = tashkentHour >= 10 && tashkentHour < 22;
    
    const client = await pool.connect();
    try {
      const stats = await client.query('SELECT * FROM global_stats WHERE id = 1');
      
      res.status(200).json({
        serverTime: {
          utc: now.toISOString(),
          utcHour: utcHour,
          tashkentHour: tashkentHour,
          isActiveHours: isActive
        },
        stats: stats.rows[0],
        simulationStatus: {
          eatenSimulation: isActive ? 'ACTIVE (10AM-10PM Tashkent)' : 'PAUSED (Outside active hours)',
          newPlayersSimulation: isActive ? 'ACTIVE (10AM-10PM Tashkent)' : 'PAUSED (Outside active hours)',
          activePlayersSimulation: 'ACTIVE (24/7)'
        }
      });
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('🚨 Debug endpoint error:', error);
    res.status(500).json({ error: 'Debug failed' });
  }
});

app.post('/api/global-stats/increment', async (req, res) => {
  try {
    const { field } = req.body;
    
    if (!['total_eaten_today', 'new_players_today'].includes(field)) {
      return res.status(400).json({ error: 'Invalid field' });
    }

    const client = await pool.connect();
    try {
      const products = ['Viral Matcha', 'Viral Classic'];
      const newProduct = products[Math.floor(Math.random() * products.length)];

      await client.query(`
        UPDATE global_stats 
        SET ${field} = ${field} + 1,
            just_sold = $1,
            last_updated = CURRENT_TIMESTAMP
        WHERE id = 1
        RETURNING *
      `, [newProduct]);

      const result = await client.query('SELECT * FROM global_stats WHERE id = 1');
      console.log(`✅ Incremented ${field} to ${result.rows[0][field]}`);

      res.status(200).json({ success: true, stats: result.rows[0] });

    } finally {
      client.release();
    }
  } catch (error) {
    console.error('🚨 Error incrementing stats:', error);
    res.status(500).json({ error: 'Failed to increment stats' });
  }
});

const isActiveHoursTashkent = () => {
  const now = new Date();
  const tashkentHour = (now.getUTCHours() + 5) % 24;
  return tashkentHour >= 10 && tashkentHour < 22;
};

let simulationActive = {
  eaten: false,
  newPlayers: false,
  activePlayers: false
};

const startGlobalStatsSimulation = async () => {
  console.log('🎮 Starting global stats simulation v4 with Tashkent timezone (UTC+5)...');
  console.log(`⏰ Server UTC time: ${new Date().toISOString()}`);
  console.log(`⏰ Tashkent hour: ${(new Date().getUTCHours() + 5) % 24}:${new Date().getUTCMinutes()}`);
  console.log(`🌍 Active hours (Tashkent): ${isActiveHoursTashkent() ? 'YES ✅' : 'NO ❌'}`);
  
  if (isActiveHoursTashkent()) {
    console.log('⚡ IN ACTIVE HOURS - Triggering immediate first increments...');
    
    try {
      await fetch(`http://localhost:${PORT}/api/global-stats/increment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ field: 'total_eaten_today' })
      });
      console.log('✅ IMMEDIATE: First Meowchi eaten increment done');
    } catch (error) {
      console.error('❌ IMMEDIATE: Failed first eaten increment:', error.message);
    }
    
    try {
      await fetch(`http://localhost:${PORT}/api/global-stats/increment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ field: 'new_players_today' })
      });
      console.log('✅ IMMEDIATE: First new player increment done');
    } catch (error) {
      console.error('❌ IMMEDIATE: Failed first player increment:', error.message);
    }
  } else {
    console.log('⏸️ OUTSIDE ACTIVE HOURS - Waiting for 10 AM Tashkent...');
  }
  
  const scheduleEatenUpdate = () => {
    const checkAndSchedule = () => {
      if (!isActiveHoursTashkent()) {
        console.log('⏸️ [EATEN] Outside active hours, checking again in 10 min...');
        simulationActive.eaten = false;
        setTimeout(checkAndSchedule, 600000);
        return;
      }

      if (!simulationActive.eaten) {
        console.log('▶️ [EATEN] Entering active hours - resuming simulation');
        simulationActive.eaten = true;
      }

      // 🔧 FIX #1: Changed interval from 1-20 minutes to 1-4 minutes
      // Old: const interval = Math.floor(Math.random() * (1200000 - 60000 + 1)) + 60000;
      const interval = Math.floor(Math.random() * (240000 - 60000 + 1)) + 60000;
      console.log(`⏱️ [EATEN] Next increment in ${Math.round(interval/60000)} minutes`);
      
      setTimeout(async () => {
        try {
          const response = await fetch(`http://localhost:${PORT}/api/global-stats/increment`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ field: 'total_eaten_today' })
          });
          const data = await response.json();
          console.log('🪙 Simulated Meowchi eaten - Total:', data.stats?.total_eaten_today);
        } catch (error) {
          console.error('❌ [EATEN] Increment failed:', error.message);
        }
        checkAndSchedule();
      }, interval);
    };
    
    checkAndSchedule();
  };

  const scheduleNewPlayerUpdate = () => {
    const checkAndSchedule = () => {
      if (!isActiveHoursTashkent()) {
        console.log('⏸️ [PLAYERS] Outside active hours, checking again in 10 min...');
        simulationActive.newPlayers = false;
        setTimeout(checkAndSchedule, 600000);
        return;
      }

      if (!simulationActive.newPlayers) {
        console.log('▶️ [PLAYERS] Entering active hours - resuming simulation');
        simulationActive.newPlayers = true;
      }

      const interval = Math.floor(Math.random() * (1800000 - 120000 + 1)) + 120000;
      console.log(`⏱️ [PLAYERS] Next increment in ${Math.round(interval/60000)} minutes`);
      
      setTimeout(async () => {
        try {
          const statsRes = await fetch(`http://localhost:${PORT}/api/global-stats`);
          const stats = await statsRes.json();
          
          if (stats.new_players_today < 90) {
            const response = await fetch(`http://localhost:${PORT}/api/global-stats/increment`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ field: 'new_players_today' })
            });
            const data = await response.json();
            console.log('🎉 Simulated new player joined - Total:', data.stats?.new_players_today);
          } else {
            console.log('🚫 [PLAYERS] Daily limit reached (90)');
          }
        } catch (error) {
          console.error('❌ [PLAYERS] Increment failed:', error.message);
        }
        checkAndSchedule();
      }, interval);
    };
    
    checkAndSchedule();
  };

  const scheduleActivePlayersUpdate = () => {
    simulationActive.activePlayers = true;
    console.log('▶️ [ACTIVE] 24/7 simulation started');
    
    const updateAndSchedule = () => {
      // 🔧 FIX #2: Changed interval from 5-15 minutes to 2 seconds
      // Old: const interval = Math.floor(Math.random() * (900000 - 300000 + 1)) + 300000;
      const interval = 2000;
      console.log(`⏱️ [ACTIVE] Next update in ${Math.round(interval/1000)} seconds`);
      
      setTimeout(async () => {
        try {
          const newCount = Math.floor(Math.random() * (150 - 37 + 1)) + 37;
          const client = await pool.connect();
          try {
            await client.query(`
              UPDATE global_stats 
              SET active_players = $1,
                  last_updated = CURRENT_TIMESTAMP
              WHERE id = 1
            `, [newCount]);
            console.log(`👥 Updated active players: ${newCount}`);
          } finally {
            client.release();
          }
        } catch (error) {
          console.error('❌ [ACTIVE] Update failed:', error.message);
        }
        updateAndSchedule();
      }, interval);
    };
    
    updateAndSchedule();
  };

  scheduleEatenUpdate();
  scheduleNewPlayerUpdate();
  scheduleActivePlayersUpdate();
  
  console.log('✅ All simulations scheduled');
};

const startServer = async () => {
  app.listen(PORT, async () => {
    console.log(`✅ Server running on port ${PORT}`);
    console.log(`🏥 Health check: http://localhost:${PORT}/health`);
    console.log(`🛠 Debug endpoint: http://localhost:${PORT}/api/global-stats/debug`);
    console.log(`🌍 Using Tashkent timezone (UTC+5) for active hours: 10AM-10PM`);
    
    await startGlobalStatsSimulation();
  });
};

setupDatabase().then(startServer).catch(err => {
  console.error('💥 Failed to start application:', err);
  process.exit(1);
});
