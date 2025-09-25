import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import pg from 'pg';
import { validate } from './utils.js';

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
const pool = new Pool({
  connectionString: DATABASE_URL,
});

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
      { name: 'avatar_url', type: 'VARCHAR(500)' } // NEW: Avatar URL column
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
    
    // 11. FIXED: Populate shop items with proper foreign key handling
    console.log('🛏️ Setting up shop items...');
    
    // Check if shop_items table has any data
    const existingItemsCount = await client.query('SELECT COUNT(*) FROM shop_items');
    const itemCount = parseInt(existingItemsCount.rows[0].count);
    
    if (itemCount === 0) {
      // Table is empty, safe to insert
      console.log('📦 Inserting initial shop items...');
      await client.query(`
        INSERT INTO shop_items (id, name, description, price, icon_name, type) VALUES
        (1, 'Extra Time +10s', '+10 seconds to your next game', 750, 'Clock', 'consumable'),
        (2, 'Extra Time +20s', '+20 seconds to your next game', 1500, 'Timer', 'consumable'),
        (3, 'Cookie Bomb', 'Start with a bomb that clears 3x3 area', 1000, 'Bomb', 'consumable'),
        (4, 'Double Points', '2x points for your next game', 1500, 'ChevronsUp', 'consumable'),
        (5, 'Cookie Master Badge', 'Golden cookie profile badge', 5000, 'Badge', 'permanent'),
        (6, 'Speed Demon Badge', 'Lightning bolt profile badge', 7500, 'Zap', 'permanent'),
        (7, 'Champion Badge', 'Trophy profile badge', 10000, 'Trophy', 'permanent')
      `);
      
      await client.query('SELECT setval(\'shop_items_id_seq\', 7, true)');
    } else {
      console.log(`📦 Shop items already exist (${itemCount} items), updating if needed...`);
      
      // Update existing items without deleting (safe for production)
      await client.query(`
        INSERT INTO shop_items (id, name, description, price, icon_name, type) VALUES
        (1, 'Extra Time +10s', '+10 seconds to your next game', 750, 'Clock', 'consumable'),
        (2, 'Extra Time +20s', '+20 seconds to your next game', 1500, 'Timer', 'consumable'),
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

    console.log('✅ Enhanced database setup complete with friends system!');
  } catch (err) {
    console.error('🚨 Database setup error:', err);
    process.exit(1);
  } finally {
    client.release();
  }
};

// ---- EXPRESS APP ----
const app = express();
app.use(cors());
app.use(express.json());

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

// ---- ROUTES ----
app.get('/health', (req, res) => {
  res.status(200).send('OK');
});

app.post('/api/validate', validateUser, async (req, res) => {
    try {
        const { user } = req;
        const client = await pool.connect();
        try {
            let dbUserResult = await client.query('SELECT * FROM users WHERE telegram_id = $1', [user.id]);
            let appUser;
            let dailyBonus = null;

            if (dbUserResult.rows.length === 0) {
                const insertResult = await client.query(
                    `INSERT INTO users (telegram_id, first_name, last_name, username) VALUES ($1, $2, $3, $4) RETURNING *`,
                    [user.id, user.first_name, user.last_name, user.username]
                );
                appUser = insertResult.rows[0];
            } else {
                appUser = dbUserResult.rows[0];
                const now = new Date();
                const lastLogin = new Date(appUser.last_login_at);

                const lastLoginDate = new Date(lastLogin.getFullYear(), lastLogin.getMonth(), lastLogin.getDate());
                const nowDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
                
                if (nowDate > lastLoginDate) {
                    const diffTime = Math.abs(nowDate - lastLoginDate);
                    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                    
                    let newStreak = (diffDays === 1) ? appUser.daily_streak + 1 : 1;
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

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const userResult = await client.query(
        'SELECT points, point_booster_active, high_score, games_played FROM users WHERE telegram_id = $1 FOR UPDATE',
        [user.id]
      );
      
      if (userResult.rowCount === 0) throw new Error('User not found');

      const { points, point_booster_active, high_score, games_played } = userResult.rows[0];
      const finalScore = point_booster_active ? score * 2 : score;
      const newPoints = points + finalScore;
      const newHighScore = Math.max(high_score || 0, finalScore);
      const newGamesPlayed = (games_played || 0) + 1;

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
      current: score,
      target: 5000,
      condition: score >= 5000
    },
    {
      name: 'Speed Demon Badge', 
      current: gamesPlayed >= 10 ? 75 : gamesPlayed * 7.5,
      target: 100,
      condition: false // Requires specific game duration tracking
    },
    {
      name: 'Champion Badge',
      current: highScore >= 3000 ? 25 : Math.floor(highScore / 120),
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

app.post('/api/user-stats', validateUser, async (req, res) => {
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
    console.error('🚨 Error in /api/user-stats:', error);
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

// NEW: Update Avatar endpoint
app.post('/api/update-avatar', validateUser, async (req, res) => {
  try {
    const { user } = req;
    const { avatarUrl } = req.body;
    
    if (!avatarUrl || typeof avatarUrl !== 'string') {
      return res.status(400).json({ error: 'Avatar URL is required' });
    }
    
    // Basic URL validation
    try {
      new URL(avatarUrl);
    } catch {
      return res.status(400).json({ error: 'Invalid avatar URL' });
    }
    
    if (avatarUrl.length > 500) {
      return res.status(400).json({ error: 'Avatar URL too long (max 500 characters)' });
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

      const shopData = {
        items: itemsResult.rows,
        userPoints: userResult.rows[0].points,
        inventory: inventoryResult.rows,
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

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const itemResult = await client.query('SELECT name, price, type FROM shop_items WHERE id = $1', [itemId]);
      if (itemResult.rowCount === 0) {
        console.log(`❌ Item ${itemId} not found in shop_items table`);
        throw new Error('Item not found.');
      }
      
      const { name, price, type } = itemResult.rows[0];
      console.log(`📦 Item found: ${name} - $${price} (${type})`);

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
      
      const knownErrors = ['Insufficient points.', 'Item already owned.', 'Badge already owned.', 'Item not found.', 'User not found.'];
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
          case 2: totalTimeBonus += 20; break;
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

    const timeBooster20Result = await client.query(
      `DELETE FROM user_inventory 
       WHERE id = (
         SELECT id FROM user_inventory 
         WHERE user_id = $1 AND item_id = 2 
         LIMIT 1
       ) RETURNING item_id`,
      [user.id]
    );

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
    if (timeBooster20Result.rowCount > 0) totalTimeBonus += 20;
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
        `, [user.id]),
        client.query(`
          SELECT item_name, COUNT(*) as usage_count 
          FROM item_usage_history 
          WHERE user_id = $1 
          GROUP BY item_name 
          ORDER BY usage_count DESC 
          LIMIT 1
        `, [user.id]),
        client.query('SELECT id, price FROM shop_items')
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
