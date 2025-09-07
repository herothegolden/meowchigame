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

// DATABASE SETUP FUNCTION - MATCHES FRONTEND EXACTLY
const setupDatabase = async () => {
  const client = await pool.connect();
  try {
    console.log('🔧 Setting up database tables...');

    // 1. Create Users Table
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
          last_login_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 2. Add point_booster_active column if it doesn't exist
    const columnCheck = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name='users' AND column_name='point_booster_active'
    `);

    if (columnCheck.rowCount === 0) {
      console.log('📊 Adding point_booster_active column...');
      await client.query(`
        ALTER TABLE users 
        ADD COLUMN point_booster_active BOOLEAN DEFAULT FALSE NOT NULL
      `);
    }

    // 3. Create Shop Items Table
    await client.query(`
      CREATE TABLE IF NOT EXISTS shop_items (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        description TEXT,
        price INT NOT NULL,
        icon_name VARCHAR(50),
        type VARCHAR(50) DEFAULT 'consumable' NOT NULL
      );
    `);
    
    // 4. Create User Inventory Table
    await client.query(`
      CREATE TABLE IF NOT EXISTS user_inventory (
        id SERIAL PRIMARY KEY,
        user_id BIGINT REFERENCES users(telegram_id),
        item_id INT REFERENCES shop_items(id),
        acquired_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 5. Create User Badges Table (for permanent badges)
    await client.query(`
      CREATE TABLE IF NOT EXISTS user_badges (
        id SERIAL PRIMARY KEY,
        user_id BIGINT REFERENCES users(telegram_id),
        badge_name VARCHAR(255) NOT NULL,
        acquired_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(user_id, badge_name)
      );
    `);
    
    // 6. CLEAR AND POPULATE SHOP ITEMS - EXACT MATCH WITH FRONTEND
    console.log('🛍️ Setting up shop items...');
    
    // Clear existing items to avoid conflicts
    await client.query('DELETE FROM shop_items');
    
    // Insert items that EXACTLY match frontend ShopPage.jsx
    await client.query(`
      INSERT INTO shop_items (id, name, description, price, icon_name, type) VALUES
      (1, 'Extra Time +10s', '+10 seconds to your next game', 750, 'Clock', 'consumable'),
      (2, 'Extra Time +20s', '+20 seconds to your next game', 1500, 'Timer', 'consumable'),
      (3, 'Cookie Bomb', 'Start with a bomb that clears 3x3 area', 1000, 'Bomb', 'consumable'),
      (4, 'Double Points', '2x points for your next game', 1500, 'ChevronsUp', 'consumable'),
      (5, 'Cookie Master Badge', 'Golden cookie profile badge', 5000, 'Badge', 'permanent'),
      (6, 'Speed Demon Badge', 'Lightning bolt profile badge', 7500, 'Zap', 'permanent'),
      (7, 'Champion Badge', 'Trophy profile badge', 10000, 'Trophy', 'permanent');
    `);

    // Reset the sequence to ensure proper ID generation
    await client.query('SELECT setval(\'shop_items_id_seq\', 7, true)');

    console.log('✅ Database setup complete!');
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

app.post('/api/update-score', validateUser, async (req, res) => {
  try {
    const { user } = req;
    const { score } = req.body;
    if (score === undefined) {
      return res.status(400).json({ error: 'Score is required' });
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const userResult = await client.query(
        'SELECT points, point_booster_active FROM users WHERE telegram_id = $1 FOR UPDATE',
        [user.id]
      );
      
      if (userResult.rowCount === 0) throw new Error('User not found');

      const { points, point_booster_active } = userResult.rows[0];
      const finalScore = point_booster_active ? score * 2 : score;
      const newPoints = points + finalScore;

      const updateResult = await client.query(
        'UPDATE users SET points = $1, point_booster_active = FALSE WHERE telegram_id = $2 RETURNING points',
        [newPoints, user.id]
      );

      await client.query('COMMIT');

      return res.status(200).json({ new_points: updateResult.rows[0].points, score_awarded: finalScore });

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

app.post('/api/user-stats', validateUser, async (req, res) => {
  try {
    const { user } = req;
    const client = await pool.connect();
    try {
      const [userResult, badgesResult] = await Promise.all([
        client.query(
          'SELECT first_name, username, points, level, daily_streak, created_at FROM users WHERE telegram_id = $1', 
          [user.id]
        ),
        client.query('SELECT badge_name FROM user_badges WHERE user_id = $1', [user.id])
      ]);
      
      if (userResult.rowCount === 0) {
        return res.status(404).json({ error: 'User not found' });
      }
      
      const userData = userResult.rows[0];
      userData.ownedBadges = badgesResult.rows.map(row => row.badge_name);
      
      res.status(200).json(userData);

    } finally {
      client.release();
    }
  } catch (error) {
    console.error('🚨 Error in /api/user-stats:', error);
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

      // Get item details
      const itemResult = await client.query('SELECT name, price, type FROM shop_items WHERE id = $1', [itemId]);
      if (itemResult.rowCount === 0) {
        console.log(`❌ Item ${itemId} not found in shop_items table`);
        throw new Error('Item not found.');
      }
      
      const { name, price, type } = itemResult.rows[0];
      console.log(`📦 Item found: ${name} - $${price} (${type})`);

      // Get user points
      const userResult = await client.query('SELECT points FROM users WHERE telegram_id = $1 FOR UPDATE', [user.id]);
      if (userResult.rowCount === 0) throw new Error('User not found.');
      
      const userPoints = userResult.rows[0].points;
      console.log(`💰 User has ${userPoints} points, needs ${price}`);
      
      if (userPoints < price) throw new Error('Insufficient points.');
      
      // Handle badges vs regular items
      if (name.includes('Badge')) {
        console.log(`🏆 Processing badge purchase: ${name}`);
        
        // Check if badge already owned
        const badgeResult = await client.query('SELECT * FROM user_badges WHERE user_id = $1 AND badge_name = $2', [user.id, name]);
        if (badgeResult.rowCount > 0) throw new Error('Badge already owned.');
        
        // Add badge
        await client.query('INSERT INTO user_badges (user_id, badge_name) VALUES ($1, $2)', [user.id, name]);
        console.log(`✅ Badge added to user_badges table`);
        
      } else {
        console.log(`🎮 Processing consumable item: ${name}`);
        
        // For permanent non-badge items
        if(type === 'permanent') {
          const inventoryResult = await client.query('SELECT * FROM user_inventory WHERE user_id = $1 AND item_id = $2', [user.id, itemId]);
          if (inventoryResult.rowCount > 0) throw new Error('Item already owned.');
        }
        
        // Add to inventory
        await client.query('INSERT INTO user_inventory (user_id, item_id) VALUES ($1, $2)', [user.id, itemId]);
        console.log(`✅ Item added to user_inventory table`);
      }

      // Deduct points
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

app.post('/api/start-game-session', validateUser, async (req, res) => {
  const { user } = req;
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    let totalTimeBonus = 0;
    let hasBomb = false;

    // Consume +10s time booster (ID 1)
    const timeBooster10Result = await client.query(
      `DELETE FROM user_inventory 
       WHERE id = (
         SELECT id FROM user_inventory 
         WHERE user_id = $1 AND item_id = 1 
         LIMIT 1
       ) RETURNING item_id`,
      [user.id]
    );

    // Consume +20s time booster (ID 2)
    const timeBooster20Result = await client.query(
      `DELETE FROM user_inventory 
       WHERE id = (
         SELECT id FROM user_inventory 
         WHERE user_id = $1 AND item_id = 2 
         LIMIT 1
       ) RETURNING item_id`,
      [user.id]
    );

    // Consume Cookie Bomb (ID 3)
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
    
    // Calculate effects
    if (timeBooster10Result.rowCount > 0) totalTimeBonus += 10;
    if (timeBooster20Result.rowCount > 0) totalTimeBonus += 20;
    hasBomb = bombBoosterResult.rowCount > 0;
    
    console.log(`🎮 Game session: +${totalTimeBonus}s time, bomb: ${hasBomb}`);
    
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
    if (!itemId) {
      return res.status(400).json({ error: 'itemId is required' });
    }
    
    if (itemId !== 4) { // Point Booster (ID 4)
      return res.status(400).json({ error: 'This item is not an activatable booster.' });
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const userResult = await client.query('SELECT point_booster_active FROM users WHERE telegram_id = $1 FOR UPDATE', [user.id]);
      if (userResult.rowCount === 0) throw new Error('User not found.');
      if (userResult.rows[0].point_booster_active) throw new Error('A booster is already active.');

      // Consume one point booster
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
