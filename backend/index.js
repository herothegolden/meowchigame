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
    console.log('🔧 Setting up enhanced database tables...');

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
    
    const itemCount = await client.query('SELECT COUNT(*) as count FROM shop_items');
    
    if (parseInt(itemCount.rows[0].count) === 0) {
      console.log('📦 Seeding shop items...');
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

    console.log('🛒 Setting up orders table...');

    try {
      await client.query(`
        CREATE TABLE IF NOT EXISTS orders (
          id SERIAL PRIMARY KEY,
          user_id BIGINT NOT NULL,
          product_id VARCHAR(100) NOT NULL,
          product_name VARCHAR(255) NOT NULL,
          product_description TEXT,
          price_stars INT NOT NULL,
          telegram_payment_charge_id VARCHAR(255),
          status VARCHAR(50) DEFAULT 'pending',
          user_contact JSONB,
          delivery_address TEXT,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          paid_at TIMESTAMP WITH TIME ZONE,
          delivered_at TIMESTAMP WITH TIME ZONE
        );
      `);
      
      console.log('✅ Orders table created');

      await client.query(`
        DO $ 
        BEGIN
          IF NOT EXISTS (
            SELECT 1 FROM pg_constraint 
            WHERE conname = 'orders_payment_charge_unique'
          ) THEN
            ALTER TABLE orders 
            ADD CONSTRAINT orders_payment_charge_unique 
            UNIQUE (telegram_payment_charge_id);
          END IF;
        END $;
      `);

      console.log('✅ Orders unique constraint added');

      await client.query(`
        DO $ 
        BEGIN
          IF NOT EXISTS (
            SELECT 1 FROM pg_constraint 
            WHERE conname = 'fk_orders_user_id'
          ) THEN
            ALTER TABLE orders 
            ADD CONSTRAINT fk_orders_user_id 
            FOREIGN KEY (user_id) 
            REFERENCES users(telegram_id) 
            ON DELETE CASCADE;
          END IF;
        EXCEPTION
          WHEN OTHERS THEN
            RAISE NOTICE 'Could not add foreign key constraint: %', SQLERRM;
        END $;
      `);

      console.log('✅ Orders foreign key constraint added');

      await client.query(`CREATE INDEX IF NOT EXISTS idx_orders_user_id ON orders(user_id);`);
      console.log('✅ Index on user_id created');
      
      await client.query(`CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);`);
      console.log('✅ Index on status created');
      
      await client.query(`CREATE INDEX IF NOT EXISTS idx_orders_payment_charge ON orders(telegram_payment_charge_id);`);
      console.log('✅ Index on payment_charge_id created');
      
      await client.query(`CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at DESC);`);
      console.log('✅ Index on created_at created');

      console.log('✅ Orders table setup complete with all constraints and indexes');

    } catch (error) {
      console.error('❌ Error setting up orders table:', error.message);
      console.error('Full error:', error);
    }

    console.log('🌍 Setting up global_stats table...');
    
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
      console.log('🌍 Initializing global stats with seed values...');
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
        console.log(`🆕 Creating new user: ${user.first_name} (@${user.username || 'no-username'}) (${user.id})`);
        
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

      const sessionResult = await client.query(
        `INSERT INTO game_sessions (user_id, score, duration, items_used, boost_multiplier) 
         VALUES ($1, $2, $3, $4, $5) RETURNING id`,
        [user.id, finalScore, duration, JSON.stringify(itemsUsed), point_booster_active ? 2.0 : 1.0]
      );
      
      const sessionId = sessionResult.rows[0].id;

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
      condition: false
    },
    {
      name: 'Champion Badge',
      current: Math.floor(highScore >= 3000 ? 25 : Math.floor(highScore / 120)),
      target: 100,
      condition: false
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
        client.query('SELECT item_id, COUNT(item_id) as quantity FROM user_inventory WHERE user_id = $1 GROUP BY item_id', [user.id]),
        client.query('SELECT * FROM shop_items ORDER BY id ASC'),
        client.query('SELECT points, point_booster_active FROM users WHERE telegram_id = $1', [user.id])
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
        boosterActive: userShopResult.rows[0]?.point_booster_active || false,
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

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const itemResult = await client.query('SELECT * FROM shop_items WHERE id = $1', [itemId]);
      if (itemResult.rowCount === 0) {
        await client.query('ROLLBACK');
        return res.status(404).json({ error: 'Item not found' });
      }

      const item = itemResult.rows[0];
      const userResult = await client.query('SELECT points FROM users WHERE telegram_id = $1 FOR UPDATE', [user.id]);
      
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
      await client.query('UPDATE users SET points = $1 WHERE telegram_id = $2', [newPoints, user.id]);

      if (item.type === 'permanent') {
        await client.query(
          'INSERT INTO user_badges (user_id, badge_name) VALUES ($1, $2) ON CONFLICT DO NOTHING',
          [user.id, item.name]
        );
      } else {
        await client.query(
          'INSERT INTO user_inventory (user_id, item_id) VALUES ($1, $2)',
          [user.id, itemId]
        );
      }

      await client.query('COMMIT');

      res.status(200).json({
        success: true,
        newPoints,
        item: item.name,
        message: `Successfully purchased ${item.name}`
      });

    } catch(e) {
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
        'SELECT ui.id, si.name FROM user_inventory ui JOIN shop_items si ON ui.item_id = si.id WHERE ui.user_id = $1 AND ui.item_id = $2 LIMIT 1',
        [user.id, itemId]
      );

      if (inventoryResult.rowCount === 0) {
        await client.query('ROLLBACK');
        return res.status(404).json({ error: 'Item not found in inventory' });
      }

      const inventoryItemId = inventoryResult.rows[0].id;
      const itemName = inventoryResult.rows[0].name;

      await client.query('DELETE FROM user_inventory WHERE id = $1', [inventoryItemId]);

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

app.post('/api/tasks/list', validateUser, async (req, res) => {
  try {
    const { user } = req;
    const client = await pool.connect();
    try {
      const result = await client.query(
        'SELECT task_name, completed, completed_at, reward_points FROM user_tasks WHERE user_id = $1',
        [user.id]
      );

      const completedTasks = result.rows.map(row => row.task_name);

      const allTasks = [
        { name: 'Join Telegram Channel', points: 500, completed: completedTasks.includes('Join Telegram Channel') },
        { name: 'Follow on Instagram', points: 300, completed: completedTasks.includes('Follow on Instagram') },
        { name: 'Play 5 Games', points: 250, completed: completedTasks.includes('Play 5 Games') },
        { name: 'Invite 3 Friends', points: 1000, completed: completedTasks.includes('Invite 3 Friends') }
      ];

      res.status(200).json({ tasks: allTasks });

    } finally {
      client.release();
    }
  } catch (error) {
    console.error('🚨 Error in /api/tasks/list:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/tasks/complete', validateUser, async (req, res) => {
  try {
    const { user } = req;
    const { taskName } = req.body;
    
    if (!taskName) {
      return res.status(400).json({ error: 'Task name is required' });
    }

    const taskRewards = {
      'Join Telegram Channel': 500,
      'Follow on Instagram': 300,
      'Play 5 Games': 250,
      'Invite 3 Friends': 1000
    };

    const rewardPoints = taskRewards[taskName];
    if (!rewardPoints) {
      return res.status(400).json({ error: 'Invalid task name' });
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const checkResult = await client.query(
        'SELECT completed FROM user_tasks WHERE user_id = $1 AND task_name = $2',
        [user.id, taskName]
      );

      if (checkResult.rowCount > 0 && checkResult.rows[0].completed) {
        await client.query('ROLLBACK');
        return res.status(400).json({ error: 'Task already completed' });
      }

      await client.query(
        `INSERT INTO user_tasks (user_id, task_name, completed, completed_at, reward_points)
         VALUES ($1, $2, TRUE, CURRENT_TIMESTAMP, $3)
         ON CONFLICT (user_id, task_name) 
         DO UPDATE SET completed = TRUE, completed_at = CURRENT_TIMESTAMP`,
        [user.id, taskName, rewardPoints]
      );

      const updateResult = await client.query(
        'UPDATE users SET points = points + $1 WHERE telegram_id = $2 RETURNING points',
        [rewardPoints, user.id]
      );

      await client.query('COMMIT');

      res.status(200).json({
        success: true,
        newPoints: updateResult.rows[0].points,
        rewardPoints,
        message: `Earned ${rewardPoints} points for completing ${taskName}`
      });

    } catch(e) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('🚨 Error in /api/tasks/complete:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/create-invoice', validateUser, async (req, res) => {
  try {
    const { user } = req;
    const { productId, productName, productDescription, priceStars } = req.body;
    
    if (!productId || !productName || !priceStars) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const payload = JSON.stringify({ userId: user.id, productId });
    
    const invoiceData = {
      title: productName,
      description: productDescription || productName,
      payload: payload,
      provider_token: '',
      currency: 'XTR',
      prices: [{ label: productName, amount: priceStars }]
    };

    const response = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/createInvoiceLink`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(invoiceData)
    });

    const result = await response.json();

    if (!result.ok) {
      throw new Error(result.description || 'Failed to create invoice');
    }

    const invoiceLink = result.result;

    const client = await pool.connect();
    try {
      await client.query(
        `INSERT INTO orders (user_id, product_id, product_name, product_description, price_stars, status)
         VALUES ($1, $2, $3, $4, $5, 'pending')`,
        [user.id, productId, productName, productDescription, priceStars]
      );
    } finally {
      client.release();
    }

    res.status(200).json({ 
      success: true,
      invoiceLink: invoiceLink
    });

  } catch (error) {
    console.error('🚨 Error creating invoice:', error);
    res.status(500).json({ error: error.message || 'Failed to create invoice' });
  }
});

app.post('/api/stars-payment-webhook', express.json(), async (req, res) => {
  try {
    console.log('💰 Received payment webhook:', JSON.stringify(req.body, null, 2));

    const { pre_checkout_query, successful_payment } = req.body;

    if (pre_checkout_query) {
      const { id } = pre_checkout_query;
      
      await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/answerPreCheckoutQuery`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pre_checkout_query_id: id, ok: true })
      });

      return res.status(200).json({ ok: true });
    }

    if (successful_payment) {
      const { 
        telegram_payment_charge_id,
        total_amount,
        invoice_payload 
      } = successful_payment;

      const payload = JSON.parse(invoice_payload);
      const { userId, productId } = payload;

      console.log(`✅ Payment confirmed: User ${userId}, Product ${productId}, Amount ${total_amount} stars`);

      const client = await pool.connect();
      try {
        await client.query('BEGIN');

        const updateResult = await client.query(
          `UPDATE orders 
           SET status = 'paid', 
               telegram_payment_charge_id = $1, 
               paid_at = CURRENT_TIMESTAMP
           WHERE user_id = $2 
             AND product_id = $3 
             AND status = 'pending'
           RETURNING *`,
          [telegram_payment_charge_id, userId, productId]
        );

        if (updateResult.rowCount === 0) {
          console.warn('⚠️ No pending order found to update');
        } else {
          console.log('✅ Order updated:', updateResult.rows[0]);
        }

        const userResult = await client.query(
          'SELECT first_name, username FROM users WHERE telegram_id = $1',
          [userId]
        );

        if (userResult.rowCount > 0) {
          const user = userResult.rows[0];
          
          await client.query(
            `UPDATE orders 
             SET user_contact = $1
             WHERE telegram_payment_charge_id = $2`,
            [JSON.stringify({ 
              first_name: user.first_name, 
              username: user.username 
            }), telegram_payment_charge_id]
          );
        }

        await client.query('COMMIT');

        console.log('🚚 Order ready for delivery processing');

      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      } finally {
        client.release();
      }

      return res.status(200).json({ ok: true });
    }

    res.status(200).json({ ok: true });

  } catch (error) {
    console.error('🚨 Webhook error:', error);
    res.status(500).json({ error: 'Webhook processing failed' });
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
      
      // FIXED: Proper date comparison using PostgreSQL CURRENT_DATE
      const resetCheck = await client.query(`
        SELECT (last_daily_reset < CURRENT_DATE) as needs_reset 
        FROM global_stats 
        WHERE id = 1
      `);
      
      const needsReset = resetCheck.rows[0]?.needs_reset || false;

      if (needsReset) {
        console.log('🔄 Resetting daily stats for new day');
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
  console.log(`🔍 Active hours (Tashkent): ${isActiveHoursTashkent() ? 'YES ✅' : 'NO ❌'}`);
  
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

      const interval = Math.floor(Math.random() * (1200000 - 60000 + 1)) + 60000;
      console.log(`⏱️ [EATEN] Next increment in ${Math.round(interval/60000)} minutes`);
      
      setTimeout(async () => {
        try {
          const response = await fetch(`http://localhost:${PORT}/api/global-stats/increment`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ field: 'total_eaten_today' })
          });
          const data = await response.json();
          console.log('🍪 Simulated Meowchi eaten - Total:', data.stats?.total_eaten_today);
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
      const interval = Math.floor(Math.random() * (900000 - 300000 + 1)) + 300000;
      console.log(`⏱️ [ACTIVE] Next update in ${Math.round(interval/60000)} minutes`);
      
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
    console.log(`🔗 Health check: http://localhost:${PORT}/health`);
    console.log(`🔍 Debug endpoint: http://localhost:${PORT}/api/global-stats/debug`);
    console.log(`🌍 Using Tashkent timezone (UTC+5) for active hours: 10AM-10PM`);
    
    await startGlobalStatsSimulation();
  });
};

setupDatabase().then(startServer).catch(err => {
  console.error('💥 Failed to start application:', err);
  process.exit(1);
});
