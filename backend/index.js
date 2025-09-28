import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import pg from 'pg';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { validate } from './utils.js';
import devToolsRoutes from './devToolsRoutes.js'; // 👈 NEW import

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
app.use('/api/dev', devToolsRoutes); // 👈 All dev-only routes under /api/dev

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
  
  // NO USERNAME RESTRICTIONS - Allow any user
  req.user = user;
  next();
};

// ---- FILE UPLOAD SETUP ----
// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, 'uploads', 'avatars');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
  console.log('📁 Created uploads/avatars directory');
}

// Multer configuration for avatar uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    // Generate unique filename: userId_timestamp.extension
    const userId = req.user?.id || 'unknown';
    const timestamp = Date.now();
    const extension = path.extname(file.originalname);
    cb(null, `${userId}_${timestamp}${extension}`);
  }
});

// File filter for images only
const fileFilter = (req, file, cb) => {
  if (file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(new Error('Only image files are allowed'), false);
  }
};

// Multer middleware
const uploadAvatar = multer({
  storage: storage,
  limits: {
    fileSize: 2 * 1024 * 1024, // 2MB limit
  },
  fileFilter: fileFilter
});

// Serve uploaded files statically
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// FIXED: COMPREHENSIVE DATABASE SETUP WITH PROPER FOREIGN KEY HANDLING
const setupDatabase = async () => {
  const client = await pool.connect();
  try {
    console.log('🔧 Setting up enhanced database tables...');

    // 1. Create Users Table with enhanced fields
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

    // 2. Add new columns if they don't exist
    const userColumns = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name='users'
    `);
    
    const existingColumns = userColumns.rows.map(row => row.column_name);
    
    const columnsToAdd = [
      { name: 'point_booster_active', type: 'BOOLEAN DEFAULT FALSE NOT NULL' },
      { name: 'games_played', type: 'INT DEFAULT 0 NOT NULL' },
      { name: 'high_score', type: 'INT DEFAULT 0 NOT NULL' },
      { name: 'total_play_time', type: 'INT DEFAULT 0 NOT NULL' },
      { name: 'avatar_url', type: 'VARCHAR(500)' } // Avatar URL column
    ];

    for (const column of columnsToAdd) {
      if (!existingColumns.includes(column.name)) {
        console.log(`📊 Adding ${column.name} column...`);
        await client.query(`ALTER TABLE users ADD COLUMN ${column.name} ${column.type}`);
      }
    }

    // 3. Shop Items Table
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
    
    // 4. User Inventory Table
    await client.query(`
      CREATE TABLE IF NOT EXISTS user_inventory (
        id SERIAL PRIMARY KEY,
        user_id BIGINT REFERENCES users(telegram_id),
        item_id INT REFERENCES shop_items(id),
        acquired_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 5. User Badges Table
    await client.query(`
      CREATE TABLE IF NOT EXISTS user_badges (
        id SERIAL PRIMARY KEY,
        user_id BIGINT REFERENCES users(telegram_id),
        badge_name VARCHAR(255) NOT NULL,
        acquired_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(user_id, badge_name)
      );
    `);

    // 6. PHASE 3: Game Sessions Table for detailed tracking
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

    // 7. PHASE 3: Item Usage History Table
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

    // 8. PHASE 3: Badge Progress Table
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

    // 9. PHASE 3: Leaderboard Cache Table
    await client.query(`
      CREATE TABLE IF NOT EXISTS leaderboard_cache (
        id SERIAL PRIMARY KEY,
        leaderboard_type VARCHAR(50) NOT NULL,
        user_id BIGINT REFERENCES users(telegram_id),
        rank INT NOT NULL,
        score INT NOT NULL,
        additional_data JSONB,
        cached_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 10. FRIENDS SYSTEM: User Friends Table
    await client.query(`
      CREATE TABLE IF NOT EXISTS user_friends (
        id SERIAL PRIMARY KEY,
        user_id BIGINT REFERENCES users(telegram_id),
        friend_username VARCHAR(255) NOT NULL,
        friend_telegram_id BIGINT,
        added_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(user_id, friend_username)
      );
    `);
    
    // 11. FIXED: PROPER CLEANUP OF ITEM ID 2 (Extra Time +20s)
    console.log('🛠️ Setting up shop items...');
    
    // Check if shop_items table has any data
    const existingItemsCount = await client.query('SELECT COUNT(*) FROM shop_items');
    const itemCount = parseInt(existingItemsCount.rows[0].count);
    
    // FIXED: Check if item ID 2 exists and needs cleanup
    const item2Check = await client.query('SELECT id FROM shop_items WHERE id = 2');
    
    if (item2Check.rowCount > 0) {
      console.log('🗑️ Cleaning up deprecated Extra Time +20s (item ID 2)...');
      
      // Step 1: Delete from item_usage_history first (dependent table)
      const historyDeleteResult = await client.query('DELETE FROM item_usage_history WHERE item_id = 2');
      console.log(`🗑️ Removed ${historyDeleteResult.rowCount} usage history records for item ID 2`);
      
      // Step 2: Delete from user_inventory (dependent table)
      const inventoryDeleteResult = await client.query('DELETE FROM user_inventory WHERE item_id = 2');
      console.log(`🗑️ Removed ${inventoryDeleteResult.rowCount} inventory records for item ID 2`);
      
      // Step 3: Now safe to delete from shop_items (parent table)
      const itemDeleteResult = await client.query('DELETE FROM shop_items WHERE id = 2');
      console.log(`🗑️ Removed item ID 2 from shop_items table (${itemDeleteResult.rowCount} record)`);
    }
    
    if (itemCount === 0) {
      // Table is empty, safe to insert
      console.log('📦 Inserting initial shop items...');
      await client.query(`
        INSERT INTO shop_items (id, name, description, price, icon_name, type) VALUES
        (1, 'Extra Time +10s', '+10 seconds to your next game', 750, 'Clock', 'consumable'),
        (3, 'Cookie Bomb', 'Start with a bomb that clears 3x3 area', 1000, 'Bomb', 'consumable'),
        (4, 'Double Points', '2x points for your next game', 1500, 'ChevronsUp', 'consumable'),
        (5, 'Cookie Master Badge', 'Golden cookie profile badge', 5000, 'Badge', 'permanent'),
        (6, 'Speed Demon Badge', 'Lightning bolt profile badge', 7500, 'Zap', 'permanent'),
        (7, 'Champion Badge', 'Trophy profile badge', 10000, 'Trophy', 'permanent')
      `);
      
      await client.query('SELECT setval(\'shop_items_id_seq\', 7, true)');
    } else {
      console.log(`📦 Shop items table updated, ensuring correct items exist...`);
      
      // Update existing items without item ID 2 (safe upsert)
      await client.query(`
        INSERT INTO shop_items (id, name, description, price, icon_name, type) VALUES
        (1, 'Extra Time +10s', '+10 seconds to your next game', 750, 'Clock', 'consumable'),
        (3, 'Cookie Bomb', 'Start with a bomb that clears 3x3 area', 1000, 'Bomb', 'consumable'),
        (4, 'Double Points', '2x points for your next game', 1500, 'ChevronsUp', 'consumable'),
        (5, 'Cookie Master Badge', 'Golden cookie profile badge', 5000, 'Badge', 'permanent'),
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

    // 12. USER TASKS SYSTEM: User Tasks Table for Main Tasks tracking
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

    console.log('✅ Enhanced database setup complete with proper item ID 2 cleanup!');
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

// REPLACE the entire /api/validate route - Remove ALL username restrictions
app.post('/api/validate', async (req, res) => {
  try {
    // 1. Verify Telegram initData
    const isValid = validate(req.body.initData, process.env.BOT_TOKEN);
    if (!isValid) {
      return res.status(403).json({ error: 'Invalid Telegram initData' });
    }

    // 2. Extract user info (Telegram attaches it via initDataUnsafe)
    const { user } = req.body;
    if (!user || !user.id) {
      return res.status(400).json({ error: 'Missing Telegram user info' });
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
        // 🆕 NEW USER - Create with ANY username (including null)
        console.log(`🆕 Creating new user: ${user.first_name} (@${user.username || 'no-username'}) (${user.id})`);
        const insertResult = await client.query(
          `INSERT INTO users (telegram_id, first_name, last_name, username)
           VALUES ($1, $2, $3, $4) RETURNING *`,
          [user.id, user.first_name, user.last_name, user.username]
        );
        appUser = insertResult.rows[0];
      } else {
        // EXISTING USER
        appUser = dbUserResult.rows[0];

        // Update user info if Telegram data changed
        if (appUser.first_name !== user.first_name || 
            appUser.last_name !== user.last_name || 
            appUser.username !== user.username) {
          
          console.log(`🔄 Updating user info for ${user.id}`);
          const updateResult = await client.query(
            `UPDATE users SET
             first_name = $1, last_name = $2, username = $3,
             updated_at = CURRENT_TIMESTAMP
             WHERE telegram_id = $4 RETURNING *`,
            [user.first_name, user.last_name, user.username, user.id]
          );
          appUser = updateResult.rows[0];
        }

        // Daily login bonus (24+ hours since last login)
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

      // Success response for ALL users
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

// PHASE 3: Enhanced update-score with session tracking
app.post('/api/update-score', validateUser, async (req, res) => {
  try {
    const { user } = req;
    const { score, duration = 30, itemsUsed = [] } = req.body;
    if (score === undefined) {
      return res.status(400).json({ error: 'Score is required' });
    }

    // FIXED: Convert score to integer to avoid PostgreSQL type errors
    const baseScore = Math.floor(Number(score) || 0);

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const userResult = await client.query(
        'SELECT points, point_booster_active, high_score, games_played FROM users WHERE telegram_id = $1 FOR UPDATE',
        [user.id]
      );
      
      if (userResult.rowCount === 0) throw new Error('User not found');

      const { points, point_booster_active, high_score, games_played } = userResult.rows[0];
      const finalScore = point_booster_active ? baseScore * 2 : baseScore;
      const newPoints = points + finalScore;
      const newHighScore = Math.max(high_score || 0, finalScore);
      const newGamesPlayed = (games_played || 0) + 1;

      console.log("Saving score:", finalScore);

      // Create game session record
      const sessionResult = await client.query(
        `INSERT INTO game_sessions (user_id, score, duration, items_used, boost_multiplier) 
         VALUES ($1, $2, $3, $4, $5) RETURNING id`,
        [user.id, finalScore, duration, JSON.stringify(itemsUsed), point_booster_active ? 2.0 : 1.0]
      );
      
      const sessionId = sessionResult.rows[0].id;

      // Update user stats
      const updateResult = await client.query(
        `UPDATE users SET 
         points = $1, 
         point_booster_active = FALSE, 
         high_score = $3, 
         games_played = $4,
         total_play_time = total_play_time + $5
         WHERE telegram_id = $2 RETURNING points`,
        [newPoints, user.id, newHighScore, newGamesPlayed, duration]
      );

      // Update badge progress
      await updateBadgeProgress(client, user.id, finalScore, newGamesPlayed, newHighScore);

      await client.query('COMMIT');

      return res.status(200).json({ 
        new_points: updateResult.rows[0].points, 
        score_awarded: finalScore,
        session_id: sessionId
      });

    } catch(e){
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('🚨 Error in /api/update-score:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Helper function to update badge progress
const updateBadgeProgress = async (client, userId, score, gamesPlayed, highScore) => {
  const badgeUpdates = [
    {
      name: 'Cookie Master Badge',
      current: Math.floor(score),
      target: 5000,
      condition: score >= 5000
    },
    {
      name: 'Speed Demon Badge', 
      current: Math.floor(gamesPlayed >= 10 ? 75 : gamesPlayed * 7.5),
      target: 100,
      condition: false // Requires specific game duration tracking
    },
    {
      name: 'Champion Badge',
      current: Math.floor(highScore >= 3000 ? 25 : Math.floor(highScore / 120)),
      target: 100,
      condition: false // Requires leaderboard position
    }
  ];

  for (const badge of badgeUpdates) {
    await client.query(
      `INSERT INTO badge_progress (user_id, badge_name, current_progress, target_progress)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (user_id, badge_name) 
       DO UPDATE SET current_progress = GREATEST(badge_progress.current_progress, $3), updated_at = CURRENT_TIMESTAMP`,
      [userId, badge.name, badge.current, badge.target]
    );

    // Award badge if condition met
    if (badge.condition) {
      await client.query(
        `INSERT INTO user_badges (user_id, badge_name) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
        [userId, badge.name]
      );
    }
  }
};

app.post('/api/get-user-stats', validateUser, async (req, res) => {
  try {
    const { user } = req;
    const client = await pool.connect();
    try {
      const [userResult, badgesResult] = await Promise.all([
        client.query(
          `SELECT first_name, username, points, level, daily_streak, created_at,
           games_played, high_score, total_play_time, avatar_url FROM users WHERE telegram_id = $1`, 
          [user.id]
        ),
        client.query('SELECT badge_name FROM user_badges WHERE user_id = $1', [user.id])
      ]);
      
      if (userResult.rowCount === 0) {
        return res.status(404).json({ error: 'User not found' });
      }
      
      const userData = userResult.rows[0];
      userData.ownedBadges = badgesResult.rows.map(row => row.badge_name);
      
      // Calculate additional stats
      userData.averageScore = userData.games_played > 0 ? Math.floor(userData.points / userData.games_played) : 0;
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

// NEW: Update Profile (Name) endpoint
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

// NEW: Update Avatar endpoint - handles both file uploads and URLs
app.post('/api/update-avatar', validateUser, (req, res) => {
  // Use multer to handle potential file upload
  uploadAvatar.single('avatar')(req, res, async (err) => {
    try {
      const { user } = req;
      let avatarUrl;

      if (err) {
        if (err instanceof multer.MulterError) {
          if (err.code === 'LIMIT_FILE_SIZE') {
            return res.status(400).json({ error: 'File too large. Maximum size is 2MB.' });
          }
          return res.status(400).json({ error: 'File upload error: ' + err.message });
        }
        return res.status(400).json({ error: err.message });
      }

      // Check if file was uploaded
      if (req.file) {
        // File upload mode
        console.log('📸 File uploaded:', req.file.filename);
        avatarUrl = `/uploads/avatars/${req.file.filename}`;
      } else {
        // URL input mode (existing functionality)
        const { avatarUrl: inputUrl } = req.body;
        
        if (!inputUrl || typeof inputUrl !== 'string') {
          return res.status(400).json({ error: 'Avatar URL or file is required' });
        }
        
        // Basic URL validation
        try {
          new URL(inputUrl);
        } catch {
          return res.status(400).json({ error: 'Invalid avatar URL' });
        }
        
        if (inputUrl.length > 500) {
          return res.status(400).json({ error: 'Avatar URL too long (max 500 characters)' });
        }

        avatarUrl = inputUrl;
      }

      const client = await pool.connect();
      try {
        const result = await client.query(
          'UPDATE users SET avatar_url = $1 WHERE telegram_id = $2 RETURNING avatar_url',
          [avatarUrl, user.id]
        );
        
        if (result.rowCount === 0) {
          return res.status(404).json({ error: 'User not found' });
        }
        
        console.log(`✅ Avatar updated for user ${user.id}: ${avatarUrl}`);
        
        res.status(200).json({ 
          success: true, 
          avatarUrl: result.rows[0].avatar_url,
          message: req.file ? 'Avatar uploaded successfully' : 'Avatar updated successfully'
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

app.post('/api/get-shop-data', validateUser, async (req, res) => {
  try {
    const { user } = req;
    const client = await pool.connect();
    try {
      const [itemsResult, userResult, inventoryResult, badgesResult] = await Promise.all([
        client.query('SELECT * FROM shop_items ORDER BY id ASC'),
        client.query('SELECT points, point_booster_active FROM users WHERE telegram_id = $1', [user.id]),
        client.query(`
          SELECT item_id, COUNT(item_id) as quantity 
          FROM user_inventory 
          WHERE user_id = $1 
          GROUP BY item_id
        `, [user.id]),
        client.query('SELECT badge_name FROM user_badges WHERE user_id = $1', [user.id])
      ]);
      
      if (userResult.rowCount === 0) {
        return res.status(404).json({ error: 'User not found' });
      }

      let inventory = inventoryResult.rows;
      
      // FILTER OUT Extra Time +20s (item_id: 2) from inventory response - NOT NEEDED ANYMORE since we deleted the records
      // inventory = inventory.filter(item => item.item_id !== 2);

      const shopData = {
        items: itemsResult.rows,
        userPoints: userResult.rows[0].points,
        inventory: inventory,
        boosterActive: userResult.rows[0].point_booster_active,
        ownedBadges: badgesResult.rows.map(row => row.badge_name)
      };
      
      res.status(200).json(shopData);

    } finally {
      client.release();
    }
  } catch (error) {
    console.error('🚨 Error in /api/get-shop-data:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/buy-item', validateUser, async (req, res) => {
  try {
    const { user } = req;
    const { itemId } = req.body;
    
    console.log(`🛒 Purchase attempt - User: ${user.id}, Item: ${itemId}`);
    
    if (!itemId) {
      return res.status(400).json({ error: 'itemId is required' });
    }

    // PREVENT purchasing Extra Time +20s (item ID 2)
    if (itemId === 2) {
      return res.status(400).json({ error: 'This item is no longer available for purchase' });
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const itemResult = await client.query('SELECT name, price, type FROM shop_items WHERE id = $1', [itemId]);
      if (itemResult.rowCount === 0) {
        console.log(`❌ Item ${itemId} not found in shop_items table`);
        throw new Error('Item not found.');
      }
      
      const { name, price, type } = itemResult.rows[0];
      console.log(`📦 Item found: ${name} - ${price} (${type})`);

      const userResult = await client.query('SELECT points FROM users WHERE telegram_id = $1 FOR UPDATE', [user.id]);
      if (userResult.rowCount === 0) throw new Error('User not found.');
      
      const userPoints = userResult.rows[0].points;
      console.log(`💰 User has ${userPoints} points, needs ${price}`);
      
      if (userPoints < price) throw new Error('Insufficient points.');
      
      if (name.includes('Badge')) {
        console.log(`🏆 Processing badge purchase: ${name}`);
        
        const badgeResult = await client.query('SELECT * FROM user_badges WHERE user_id = $1 AND badge_name = $2', [user.id, name]);
        if (badgeResult.rowCount > 0) throw new Error('Badge already owned.');
        
        await client.query('INSERT INTO user_badges (user_id, badge_name) VALUES ($1, $2)', [user.id, name]);
        console.log(`✅ Badge added to user_badges table`);
        
      } else {
        console.log(`🎮 Processing consumable item: ${name}`);
        
        if(type === 'permanent') {
          const inventoryResult = await client.query('SELECT * FROM user_inventory WHERE user_id = $1 AND item_id = $2', [user.id, itemId]);
          if (inventoryResult.rowCount > 0) throw new Error('Item already owned.');
        }
        
        await client.query('INSERT INTO user_inventory (user_id, item_id) VALUES ($1, $2)', [user.id, itemId]);
        console.log(`✅ Item added to user_inventory table`);
      }

      const newPoints = userPoints - price;
      await client.query('UPDATE users SET points = $1 WHERE telegram_id = $2', [newPoints, user.id]);
      console.log(`💸 Points updated: ${userPoints} → ${newPoints}`);

      await client.query('COMMIT');
      console.log(`🎉 Purchase completed successfully!`);

      res.status(200).json({ 
        success: true, 
        newPoints: newPoints, 
        message: `Successfully purchased ${name}!` 
      });

    } catch (error) {
      await client.query('ROLLBACK');
      console.log(`💥 Purchase failed: ${error.message}`);
      
      const knownErrors = ['Insufficient points.', 'Item already owned.', 'Badge already owned.', 'Item not found.', 'User not found.', 'This item is no longer available for purchase'];
      if (knownErrors.includes(error.message)) {
          return res.status(400).json({ success: false, error: error.message });
      }
      
      console.error('🚨 Unexpected error in buy-item:', error);
      res.status(500).json({ success: false, error: 'Internal server error during purchase.' });
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('🚨 Error in /api/buy-item:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/start-game-session-with-items', validateUser, async (req, res) => {
  const { user } = req;
  const { selectedItems = [] } = req.body;
  
  console.log(`🎮 Starting game session with selected items - User: ${user.id}, Items: ${selectedItems}`);
  
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    let totalTimeBonus = 0;
    let hasBomb = false;
    const usedItems = [];

    for (const itemId of selectedItems) {
      console.log(`🔄 Processing selected item: ${itemId}`);
      
      // SKIP Extra Time +20s (item ID 2) if somehow present
      if (itemId === 2) {
        console.log(`⚠️ Skipping deprecated item ID 2 (Extra Time +20s)`);
        continue;
      }
      
      const consumeResult = await client.query(
        `DELETE FROM user_inventory 
         WHERE id = (
           SELECT id FROM user_inventory 
           WHERE user_id = $1 AND item_id = $2 
           LIMIT 1
         ) RETURNING item_id`,
        [user.id, itemId]
      );

      if (consumeResult.rowCount > 0) {
        console.log(`✅ Consumed item ${itemId}`);
        usedItems.push(itemId);
        
        switch (itemId) {
          case 1: totalTimeBonus += 10; break;
          // REMOVED: case 2 (Extra Time +20s)
          case 3: hasBomb = true; break;
          case 4: 
            console.log(`⚠️ Double Points (${itemId}) should be activated manually`);
            break;
        }
      }
    }

    // Record item usage
    for (const itemId of usedItems) {
      const itemName = await client.query('SELECT name FROM shop_items WHERE id = $1', [itemId]);
      if (itemName.rowCount > 0) {
        await client.query(
          `INSERT INTO item_usage_history (user_id, item_id, item_name) VALUES ($1, $2, $3)`,
          [user.id, itemId, itemName.rows[0].name]
        );
      }
    }

    await client.query('COMMIT');
    
    const finalStartTime = 30 + totalTimeBonus;
    
    console.log(`🎯 Game session configured: startTime=${finalStartTime}s, bomb=${hasBomb}`);
    
    res.status(200).json({
      startTime: finalStartTime,
      startWithBomb: hasBomb,
      appliedEffects: {
        timeBonus: totalTimeBonus,
        bomb: hasBomb,
        itemsConsumed: usedItems
      }
    });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('🚨 Error in /api/start-game-session-with-items:', error);
    res.status(500).json({ error: 'Internal server error' });
  } finally {
    client.release();
  }
});

app.post('/api/start-game-session', validateUser, async (req, res) => {
  const { user } = req;
  console.log(`🎮 Starting legacy game session - User: ${user.id}`);
  
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    let totalTimeBonus = 0;
    let hasBomb = false;

    const timeBooster10Result = await client.query(
      `DELETE FROM user_inventory 
       WHERE id = (
         SELECT id FROM user_inventory 
         WHERE user_id = $1 AND item_id = 1 
         LIMIT 1
       ) RETURNING item_id`,
      [user.id]
    );

    // REMOVED: Extra Time +20s logic (item ID 2)

    const bombBoosterResult = await client.query(
      `DELETE FROM user_inventory 
       WHERE id = (
         SELECT id FROM user_inventory 
         WHERE user_id = $1 AND item_id = 3
         LIMIT 1
       ) RETURNING item_id`,
      [user.id]
    );

    await client.query('COMMIT');
    
    if (timeBooster10Result.rowCount > 0) totalTimeBonus += 10;
    hasBomb = bombBoosterResult.rowCount > 0;
    
    console.log(`🎯 Legacy game session: +${totalTimeBonus}s time, bomb: ${hasBomb}`);
    
    res.status(200).json({
      startTime: 30 + totalTimeBonus,
      startWithBomb: hasBomb,
    });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('🚨 Error in /api/start-game-session:', error);
    res.status(500).json({ error: 'Internal server error' });
  } finally {
    client.release();
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

      const userResult = await client.query('SELECT point_booster_active FROM users WHERE telegram_id = $1 FOR UPDATE', [user.id]);
      if (userResult.rowCount === 0) throw new Error('User not found.');
      if (userResult.rows[0].point_booster_active) throw new Error('A booster is already active.');

      const inventoryResult = await client.query(
        `DELETE FROM user_inventory 
         WHERE id = (
           SELECT id FROM user_inventory 
           WHERE user_id = $1 AND item_id = $2 
           LIMIT 1
         ) RETURNING id`,
        [user.id, itemId]
      );
      if (inventoryResult.rowCount === 0) throw new Error('You do not own this item.');

      await client.query('UPDATE users SET point_booster_active = TRUE WHERE telegram_id = $1', [user.id]);
      
      // Record usage
      await client.query(
        `INSERT INTO item_usage_history (user_id, item_id, item_name) VALUES ($1, $2, 'Double Points')`,
        [user.id, itemId]
      );
      
      await client.query('COMMIT');
      
      console.log(`⚡ Point booster activated for user ${user.id}`);
      
      res.status(200).json({ success: true, message: 'Point Booster activated for your next game!' });

    } catch (error) {
      await client.query('ROLLBACK');
      const knownErrors = ['User not found.', 'A booster is already active.', 'You do not own this item.'];
      if (knownErrors.includes(error.message)) {
          return res.status(400).json({ success: false, error: error.message });
      }
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

// NEW: Use Time Booster endpoint for mid-game Extra Time +10s consumption
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

      // Check and consume the item from inventory
      const inventoryResult = await client.query(
        `DELETE FROM user_inventory 
         WHERE id = (
           SELECT id FROM user_inventory 
           WHERE user_id = $1 AND item_id = $2 
           LIMIT 1
         ) RETURNING id`,
        [user.id, itemId]
      );
      
      if (inventoryResult.rowCount === 0) {
        throw new Error('You do not own this item.');
      }

      // Record usage in history
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
      const knownErrors = ['You do not own this item.'];
      if (knownErrors.includes(error.message)) {
          return res.status(400).json({ success: false, error: error.message });
      }
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

// NEW: Use Cookie Bomb endpoint for mid-game bomb consumption
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

      // Check and consume the item from inventory
      const inventoryResult = await client.query(
        `DELETE FROM user_inventory 
         WHERE id = (
           SELECT id FROM user_inventory 
           WHERE user_id = $1 AND item_id = $2 
           LIMIT 1
         ) RETURNING id`,
        [user.id, itemId]
      );
      
      if (inventoryResult.rowCount === 0) {
        throw new Error('You do not own this item.');
      }

      // Record usage in history
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
      const knownErrors = ['You do not own this item.'];
      if (knownErrors.includes(error.message)) {
          return res.status(400).json({ success: false, error: error.message });
      }
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

// FRIENDS SYSTEM: Add Friend by Username
app.post('/api/add-friend', validateUser, async (req, res) => {
  try {
    const { user } = req;
    const { friendUsername } = req.body;
    
    if (!friendUsername) {
      return res.status(400).json({ error: 'Friend username is required' });
    }

    const cleanUsername = friendUsername.replace('@', '').toLowerCase().trim();
    
    if (cleanUsername === (user.username || '').toLowerCase()) {
      return res.status(400).json({ error: 'Cannot add yourself as a friend' });
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Check if friend exists by username
      const friendResult = await client.query(
        'SELECT telegram_id, first_name, username FROM users WHERE LOWER(username) = $1',
        [cleanUsername]
      );
      
      if (friendResult.rowCount === 0) {
        throw new Error('User not found. Make sure they have played the game at least once.');
      }

      const friend = friendResult.rows[0];
      
      // Check if already friends
      const existingFriend = await client.query(
        'SELECT id FROM user_friends WHERE user_id = $1 AND friend_username = $2',
        [user.id, cleanUsername]
      );
      
      if (existingFriend.rowCount > 0) {
        throw new Error('Already friends with this user');
      }

      // Add friend
      await client.query(
        'INSERT INTO user_friends (user_id, friend_username, friend_telegram_id) VALUES ($1, $2, $3)',
        [user.id, cleanUsername, friend.telegram_id]
      );

      await client.query('COMMIT');
      
      res.status(200).json({ 
        success: true, 
        message: `Added ${friend.first_name} (@${friend.username}) as friend!`,
        friend: {
          username: friend.username,
          name: friend.first_name
        }
      });

    } catch (error) {
      await client.query('ROLLBACK');
      const knownErrors = [
        'User not found. Make sure they have played the game at least once.',
        'Already friends with this user',
        'Cannot add yourself as a friend'
      ];
      
      if (knownErrors.includes(error.message)) {
        return res.status(400).json({ success: false, error: error.message });
      }
      
      console.error('🚨 Error in /api/add-friend:', error);
      res.status(500).json({ success: false, error: 'Failed to add friend' });
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('🚨 Error in /api/add-friend:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// FRIENDS SYSTEM: Get Friends List
app.post('/api/get-friends', validateUser, async (req, res) => {
  try {
    const { user } = req;
    const client = await pool.connect();
    try {
      const friendsResult = await client.query(`
        SELECT 
          uf.friend_username,
          u.first_name,
          u.username,
          u.points,
          u.level
        FROM user_friends uf
        LEFT JOIN users u ON uf.friend_telegram_id = u.telegram_id
        WHERE uf.user_id = $1
        ORDER BY u.points DESC
      `, [user.id]);
      
      res.status(200).json({ 
        friends: friendsResult.rows,
        count: friendsResult.rowCount 
      });

    } finally {
      client.release();
    }
  } catch (error) {
    console.error('🚨 Error in /api/get-friends:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// NEW: Remove Friend endpoint
app.post('/api/remove-friend', validateUser, async (req, res) => {
  try {
    const { user } = req;
    const { friendUsername } = req.body;
    
    if (!friendUsername) {
      return res.status(400).json({ error: 'Friend username is required' });
    }

    const cleanUsername = friendUsername.replace('@', '').toLowerCase().trim();

    const client = await pool.connect();
    try {
      const result = await client.query(
        'DELETE FROM user_friends WHERE user_id = $1 AND friend_username = $2 RETURNING friend_username',
        [user.id, cleanUsername]
      );
      
      if (result.rowCount === 0) {
        return res.status(404).json({ error: 'Friend not found in your friends list' });
      }
      
      res.status(200).json({ 
        success: true, 
        message: `Removed @${cleanUsername} from friends`,
        removedUsername: cleanUsername
      });

    } finally {
      client.release();
    }
  } catch (error) {
    console.error('🚨 Error in /api/remove-friend:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PHASE 3: NEW ENDPOINTS

app.post('/api/get-inventory-stats', validateUser, async (req, res) => {
  try {
    const { user } = req;
    const client = await pool.connect();
    try {
      const [inventoryResult, usageResult, itemsResult] = await Promise.all([
        client.query(`
          SELECT item_id, COUNT(*) as quantity 
          FROM user_inventory 
          WHERE user_id = $1
          GROUP BY item_id
        `, [user.id]), // No longer need to filter item_id != 2 since records are deleted
        client.query(`
          SELECT item_name, COUNT(*) as usage_count 
          FROM item_usage_history 
          WHERE user_id = $1
          GROUP BY item_name 
          ORDER BY usage_count DESC 
          LIMIT 1
        `, [user.id]), // No longer need to filter item_id != 2 since records are deleted
        client.query('SELECT id, price FROM shop_items') // No longer need to filter since item 2 is deleted
      ]);
      
      const inventory = inventoryResult.rows;
      const items = itemsResult.rows.reduce((acc, item) => {
        acc[item.id] = item.price;
        return acc;
      }, {});
      
      const totalItems = inventory.reduce((sum, item) => sum + item.quantity, 0);
      const totalValue = inventory.reduce((sum, item) => sum + (item.quantity * (items[item.item_id] || 0)), 0);
      const mostUsedItem = usageResult.rows[0]?.item_name || 'None';
      
      // Simple efficiency calculation
      const efficiency = Math.min(95, Math.max(50, totalItems * 10 + Math.random() * 20));
      
      res.status(200).json({
        totalItems,
        totalValue,
        mostUsedItem,
        efficiency: Math.round(efficiency)
      });

    } finally {
      client.release();
    }
  } catch (error) {
    console.error('🚨 Error in /api/get-inventory-stats:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
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
      `, [user.id]); // No longer need to filter item_id != 2 since records are deleted
      
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
      
      switch (type) {
        case 'weekly':
          query = `
            SELECT u.first_name as name, u.points as score, u.level,
                   ROW_NUMBER() OVER (ORDER BY u.points DESC) as rank,
                   CASE WHEN u.telegram_id = $1 THEN true ELSE false END as is_current_user
            FROM users u 
            WHERE u.last_login_at >= NOW() - INTERVAL '7 days'
            ORDER BY u.points DESC 
            LIMIT 50
          `;
          params = [user.id];
          break;
          
        case 'friends':
          query = `
            SELECT u.first_name as name, u.points as score, u.level,
                   ROW_NUMBER() OVER (ORDER BY u.points DESC) as rank,
                   CASE WHEN u.telegram_id = $1 THEN true ELSE false END as is_current_user
            FROM users u 
            JOIN user_friends uf ON u.telegram_id = uf.friend_telegram_id
            WHERE uf.user_id = $1
            UNION
            SELECT u.first_name as name, u.points as score, u.level,
                   ROW_NUMBER() OVER (ORDER BY u.points DESC) as rank,
                   CASE WHEN u.telegram_id = $1 THEN true ELSE false END as is_current_user
            FROM users u 
            WHERE u.telegram_id = $1
            ORDER BY score DESC 
            LIMIT 50
          `;
          params = [user.id];
          break;
          
        default: // global
          query = `
            SELECT u.first_name as name, u.points as score, u.level,
                   ROW_NUMBER() OVER (ORDER BY u.points DESC) as rank,
                   CASE WHEN u.telegram_id = $1 THEN true ELSE false END as is_current_user
            FROM users u 
            ORDER BY u.points DESC 
            LIMIT 50
          `;
          params = [user.id];
      }
      
      const leaderboardResult = await client.query(query, params);
      
      const leaderboard = leaderboardResult.rows.map(row => ({
        rank: parseInt(row.rank),
        player: { name: row.name, level: row.level },
        score: row.score,
        isCurrentUser: row.is_current_user,
        badge: row.score > 5000 ? 'Legend' : row.score > 3000 ? 'Epic' : row.score > 1000 ? 'Rare' : null
      }));
      
      res.status(200).json({ leaderboard });

    } finally {
      client.release();
    }
  } catch (error) {
    console.error('🚨 Error in /api/get-leaderboard:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// TASKS SYSTEM: Get user task status
app.post('/api/get-user-tasks', validateUser, async (req, res) => {
  try {
    const { user } = req;
    const client = await pool.connect();
    try {
      const tasksResult = await client.query(
        'SELECT task_name, completed, completed_at, reward_points FROM user_tasks WHERE user_id = $1',
        [user.id]
      );
      
      // Define available main tasks
      const availableTasks = [
        {
          id: 1,
          name: 'Join the Cat Cult',
          task_name: 'telegram_group_join',
          reward_points: 500,
          url: 'https://t.me/meowchi_lab'
        },
        {
          id: 2,
          name: 'Cat-stagram Star', 
          task_name: 'instagram_follow',
          reward_points: 300,
          url: 'https://www.instagram.com/meowchi.lab/'
        }
      ];
      
      // Map completed tasks
      const completedTasks = new Set(tasksResult.rows.map(row => row.task_name));
      
      // Return task status
      const taskStatus = availableTasks.map(task => ({
        ...task,
        completed: completedTasks.has(task.task_name),
        completedAt: tasksResult.rows.find(row => row.task_name === task.task_name)?.completed_at || null
      }));
      
      res.status(200).json({ tasks: taskStatus });

    } finally {
      client.release();
    }
  } catch (error) {
    console.error('🚨 Error in /api/get-user-tasks:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// TASKS SYSTEM: Verify task completion
app.post('/api/verify-task', validateUser, async (req, res) => {
  try {
    const { user } = req;
    const { taskName } = req.body;
    
    if (!taskName) {
      return res.status(400).json({ error: 'Task name is required' });
    }

    console.log(`🔍 Verifying task: ${taskName} for user: ${user.id}`);

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      let isCompleted = false;
      let rewardPoints = 0;
      let verificationData = {};

      if (taskName === 'telegram_group_join') {
        // Verify Telegram group membership
        const membershipResult = await verifyTelegramGroupMembership(user.id);
        isCompleted = membershipResult.isMember;
        rewardPoints = 500;
        verificationData = { 
          verification_method: 'telegram_api',
          chat_id: '@meowchi_lab',
          verified_at: new Date().toISOString(),
          status: membershipResult.status
        };
        
        console.log(`📱 Telegram verification result:`, membershipResult);
        
      } else if (taskName === 'instagram_follow') {
        // Instagram verification (simplified - requires manual verification)
        // For now, we'll mark as completed after click and require periodic re-verification
        const existingTask = await client.query(
          'SELECT * FROM user_tasks WHERE user_id = $1 AND task_name = $2',
          [user.id, taskName]
        );
        
        if (existingTask.rowCount === 0) {
          // First time - mark as completed (honor system + manual verification)
          isCompleted = true;
          rewardPoints = 300;
          verificationData = {
            verification_method: 'manual_pending',
            instagram_url: 'https://www.instagram.com/meowchi.lab/',
            verified_at: new Date().toISOString(),
            note: 'Requires periodic manual verification'
          };
          console.log(`📸 Instagram task marked for manual verification`);
        } else {
          // Return existing status
          isCompleted = existingTask.rows[0].completed;
          rewardPoints = existingTask.rows[0].reward_points;
        }
      } else {
        return res.status(400).json({ error: 'Unknown task name' });
      }

      if (isCompleted) {
        // Check if task already completed
        const existingResult = await client.query(
          'SELECT * FROM user_tasks WHERE user_id = $1 AND task_name = $2',
          [user.id, taskName]
        );

        if (existingResult.rowCount === 0) {
          // First completion - insert new record and award points
          await client.query(
            `INSERT INTO user_tasks (user_id, task_name, completed, completed_at, reward_points, verification_data) 
             VALUES ($1, $2, $3, CURRENT_TIMESTAMP, $4, $5)`,
            [user.id, taskName, true, rewardPoints, JSON.stringify(verificationData)]
          );

          // Award points to user
          await client.query(
            'UPDATE users SET points = points + $1 WHERE telegram_id = $2',
            [rewardPoints, user.id]
          );

          console.log(`🎉 Task completed! Awarded ${rewardPoints} points to user ${user.id}`);

        } else if (!existingResult.rows[0].completed) {
          // Task exists but wasn't completed before - update it
          await client.query(
            `UPDATE user_tasks SET completed = true, completed_at = CURRENT_TIMESTAMP, 
             reward_points = $3, verification_data = $4 WHERE user_id = $1 AND task_name = $2`,
            [user.id, taskName, rewardPoints, JSON.stringify(verificationData)]
          );

          // Award points to user
          await client.query(
            'UPDATE users SET points = points + $1 WHERE telegram_id = $2',
            [rewardPoints, user.id]
          );

          console.log(`🎉 Task updated to completed! Awarded ${rewardPoints} points to user ${user.id}`);
        } else {
          console.log(`ℹ️ Task already completed for user ${user.id}`);
        }
      } else {
        // Task not completed - update or insert failed verification
        await client.query(
          `INSERT INTO user_tasks (user_id, task_name, completed, verification_data) 
           VALUES ($1, $2, false, $3)
           ON CONFLICT (user_id, task_name) 
           DO UPDATE SET verification_data = $3, updated_at = CURRENT_TIMESTAMP`,
          [user.id, taskName, JSON.stringify(verificationData)]
        );
      }

      await client.query('COMMIT');

      res.status(200).json({
        success: true,
        completed: isCompleted,
        rewardPoints: isCompleted ? rewardPoints : 0,
        message: isCompleted 
          ? `Task completed! You earned ${rewardPoints} points.`
          : 'Task verification failed. Please make sure you have completed the required action.'
      });

    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('🚨 Error in /api/verify-task:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// TASKS SYSTEM: Open task link and track attempt
app.post('/api/start-task', validateUser, async (req, res) => {
  try {
    const { user } = req;
    const { taskName } = req.body;
    
    if (!taskName) {
      return res.status(400).json({ error: 'Task name is required' });
    }

    const taskUrls = {
      'telegram_group_join': 'https://t.me/meowchi_lab',
      'instagram_follow': 'https://www.instagram.com/meowchi.lab/'
    };

    const url = taskUrls[taskName];
    if (!url) {
      return res.status(400).json({ error: 'Unknown task name' });
    }

    // Track that user started this task
    const client = await pool.connect();
    try {
      await client.query(
        `INSERT INTO user_tasks (user_id, task_name, completed, verification_data) 
         VALUES ($1, $2, false, $3)
         ON CONFLICT (user_id, task_name) 
         DO UPDATE SET updated_at = CURRENT_TIMESTAMP`,
        [user.id, taskName, JSON.stringify({ 
          started_at: new Date().toISOString(),
          url_opened: url 
        })]
      );
      
      console.log(`🚀 User ${user.id} started task: ${taskName}`);

    } finally {
      client.release();
    }

    res.status(200).json({
      success: true,
      url: url,
      message: 'Task started. Complete the action and return to verify.'
    });

  } catch (error) {
    console.error('🚨 Error in /api/start-task:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// KEEP dev-reset-tasks restricted to developer ID only
app.post('/api/dev-reset-tasks', validateUser, async (req, res) => {
  try {
    const { user } = req;

    // Only developer can access this
    if (user.id !== 6998637798) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const result = await client.query(
        'DELETE FROM user_tasks WHERE user_id = $1 RETURNING reward_points',
        [user.id]
      );

      const tasksDeleted = result.rowCount;
      const pointsFromTasks = result.rows.reduce((sum, row) => sum + row.reward_points, 0);

      if (pointsFromTasks > 0) {
        await client.query(
          'UPDATE users SET points = GREATEST(points - $1, 0) WHERE telegram_id = $2',
          [pointsFromTasks, user.id]
        );
      }

      await client.query('COMMIT');

      res.status(200).json({
        success: true,
        message: `Reset ${tasksDeleted} tasks and subtracted ${pointsFromTasks} points.`,
        tasksDeleted,
        pointsFromTasks
      });
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('🚨 Error in /api/dev-reset-tasks:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// HELPER FUNCTION: Verify Telegram group membership using Bot API
async function verifyTelegramGroupMembership(userId) {
  try {
    if (!BOT_TOKEN) {
      console.error('❌ BOT_TOKEN not configured for Telegram verification');
      return { isMember: false, status: 'bot_token_missing' };
    }

    const chatId = '@meowchi_lab'; // The group/channel username
    const apiUrl = `https://api.telegram.org/bot${BOT_TOKEN}/getChatMember`;
    
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        user_id: userId
      })
    });

    const data = await response.json();
    
    if (data.ok) {
      const memberStatus = data.result.status;
      const isMember = ['member', 'administrator', 'creator'].includes(memberStatus);
      
      console.log(`👥 User ${userId} membership status in ${chatId}: ${memberStatus}`);
      
      return {
        isMember: isMember,
        status: memberStatus,
        raw_response: data.result
      };
    } else {
      console.error(`❌ Telegram API error:`, data);
      
      // Handle common errors
      if (data.error_code === 400 && data.description.includes('chat not found')) {
        return { isMember: false, status: 'chat_not_found' };
      } else if (data.error_code === 400 && data.description.includes('user not found')) {
        return { isMember: false, status: 'user_not_found' };
      } else if (data.error_code === 403) {
        return { isMember: false, status: 'bot_not_admin' };
      }
      
      return { isMember: false, status: 'api_error', error: data.description };
    }
  } catch (error) {
    console.error('❌ Error verifying Telegram membership:', error);
    return { isMember: false, status: 'network_error', error: error.message };
  }
}

const startServer = () => {
  app.listen(PORT, () => {
    console.log(`✅ Server running on port ${PORT}`);
    console.log(`🔗 Health check: http://localhost:${PORT}/health`);
  });
};

// Start the application
setupDatabase().then(startServer).catch(err => {
  console.error('💥 Failed to start application:', err);
  process.exit(1);
});
