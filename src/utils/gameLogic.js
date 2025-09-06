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

// UPDATED: Enhanced database setup with new shop items
const setupDatabase = async () => {
  const client = await pool.connect();
  try {
    // 1. Create Users Table with badge support
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
          point_booster_active BOOLEAN DEFAULT FALSE NOT NULL,
          owned_badges TEXT[] DEFAULT '{}'
      );
    `);

    // 2. Add badge column if it doesn't exist
    const badgeCheck = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name='users' AND column_name='owned_badges'
    `);

    if (badgeCheck.rowCount === 0) {
      console.log('Migrating users table: adding owned_badges column...');
      await client.query(`
        ALTER TABLE users 
        ADD COLUMN owned_badges TEXT[] DEFAULT '{}'
      `);
    }

    // 3. Create Shop & Inventory tables
    await client.query(`
      CREATE TABLE IF NOT EXISTS shop_items (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        description TEXT,
        price INT NOT NULL,
        icon_name VARCHAR(50),
        type VARCHAR(50) DEFAULT 'consumable' NOT NULL,
        category VARCHAR(50) DEFAULT 'general' NOT NULL
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS user_inventory (
        id SERIAL PRIMARY KEY,
        user_id BIGINT REFERENCES users(telegram_id),
        item_id INT REFERENCES shop_items(id),
        acquired_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);
    
    // 4. UPDATED: New shop items with categories
    const items = await client.query('SELECT * FROM shop_items');
    if (items.rowCount === 0) {
      await client.query(`
        INSERT INTO shop_items (id, name, description, price, icon_name, type, category) VALUES
        -- Time Boosters
        (1, 'Extra Time +10s', '+10 seconds to your next game', 750, 'Clock', 'consumable', 'time'),
        (2, 'Extra Time +20s', '+20 seconds to your next game', 1500, 'Timer', 'consumable', 'time'),
        
        -- Cookie Bombs
        (3, 'Cookie Bomb', 'Start with a bomb that clears 3x3 area', 1000, 'Bomb', 'consumable', 'bomb'),
        
        -- Point Multipliers  
        (4, 'Double Points', '2x points for your next game', 1500, 'ChevronsUp', 'consumable', 'multiplier'),
        
        -- Profile Badges
        (5, 'Cookie Master Badge', 'Golden cookie profile badge', 5000, 'Badge', 'permanent', 'badge'),
        (6, 'Speed Demon Badge', 'Lightning bolt profile badge', 7500, 'Zap', 'permanent', 'badge'),
        (7, 'Champion Badge', 'Trophy profile badge', 10000, 'Trophy', 'permanent', 'badge')
        
        ON CONFLICT (id) DO NOTHING;
      `);
    }

    console.log('✅ Database tables with new shop items are set up correctly.');
  } catch (err) {
    console.error('🚨 Error setting up database:', err);
    process.exit(1);
  } finally {
    client.release();
  }
};

// ---- EXPRESS APP ----
const app = express();
app.use(cors());
app.use(express.json());

// ---- MIDDLEWARE FOR USER VALIDATION ----
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

// UPDATED: Enhanced score update with point multipliers
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
      const dbUserResult = await client.query(
        'SELECT first_name, username, points, level, daily_streak, created_at, owned_badges FROM users WHERE telegram_id = $1', 
        [user.id]
      );
      
      if (dbUserResult.rowCount === 0) {
        return res.status(404).json({ error: 'User not found' });
      }
      
      res.status(200).json(dbUserResult.rows[0]);

    } finally {
      client.release();
    }
  } catch (error) {
    console.error('🚨 Error in /api/user-stats:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// UPDATED: Enhanced shop data with categories
app.post('/api/get-shop-data', validateUser, async (req, res) => {
  try {
    const { user } = req;
    const client = await pool.connect();
    try {
      const [itemsResult, userResult, inventoryResult] = await Promise.all([
        client.query('SELECT * FROM shop_items ORDER BY category, price ASC'),
        client.query('SELECT points, point_booster_active, owned_badges FROM users WHERE telegram_id = $1', [user.id]),
        client.query(`
          SELECT item_id, COUNT(item_id) as quantity 
          FROM user_inventory 
          WHERE user_id = $1 
          GROUP BY item_id
        `, [user.id])
      ]);
      
      if (userResult.rowCount === 0) {
        return res.status(404).json({ error: 'User not found' });
      }

      const shopData = {
        items: itemsResult.rows,
        userPoints: userResult.rows[0].points,
        inventory: inventoryResult.rows,
        boosterActive: userResult.rows[0].point_booster_active,
        ownedBadges: userResult.rows[0].owned_badges || []
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

// UPDATED: Enhanced buy item with badge support
app.post('/api/buy-item', validateUser, async (req, res) => {
  try {
    const { user } = req;
    const { itemId } = req.body;
    if (!itemId) {
      return res.status(400).json({ error: 'itemId is required' });
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const itemResult = await client.query('SELECT * FROM shop_items WHERE id = $1', [itemId]);
      if (itemResult.rowCount === 0) throw new Error('Item not found.');
      const item = itemResult.rows[0];

      const userResult = await client.query('SELECT points, owned_badges FROM users WHERE telegram_id = $1 FOR UPDATE', [user.id]);
      if (userResult.rowCount === 0) throw new Error('User not found.');
      const { points: userPoints, owned_badges } = userResult.rows[0];
      
      if (userPoints < item.price) throw new Error('Insufficient points.');
      
      // Check if permanent item already owned
      if (item.type === 'permanent') {
        if (item.category === 'badge') {
          // Check if badge already owned
          if (owned_badges && owned_badges.includes(item.name)) {
            throw new Error('Badge already owned.');
          }
        } else {
          // Check other permanent items in inventory
          const inventoryResult = await client.query('SELECT * FROM user_inventory WHERE user_id = $1 AND item_id = $2', [user.id, itemId]);
          if (inventoryResult.rowCount > 0) throw new Error('Item already owned.');
        }
      }

      const newPoints = userPoints - item.price;
      
      if (item.category === 'badge') {
        // Add badge to user's owned badges
        const newBadges = [...(owned_badges || []), item.name];
        await client.query('UPDATE users SET points = $1, owned_badges = $2 WHERE telegram_id = $3', [newPoints, newBadges, user.id]);
      } else {
        // Add item to inventory
        await client.query('UPDATE users SET points = $1 WHERE telegram_id = $2', [newPoints, user.id]);
        await client.query('INSERT INTO user_inventory (user_id, item_id) VALUES ($1, $2)', [user.id, itemId]);
      }

      await client.query('COMMIT');

      res.status(200).json({ success: true, newPoints: newPoints, message: 'Purchase successful!' });

    } catch (error) {
      await client.query('ROLLBACK');
      const knownErrors = ['Insufficient points.', 'Badge already owned.', 'Item already owned.', 'Item not found.', 'User not found.'];
      if (knownErrors.includes(error.message)) {
          return res.status(400).json({ success: false, error: error.message });
      }
      console.error('🚨 Error in /api/buy-item transaction:', error);
      res.status(500).json({ success: false, error: 'Internal server error during purchase.' });
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('🚨 Error in /api/buy-item:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// UPDATED: Enhanced game start with time boosters and cookie bombs
app.post('/api/start-game-session', validateUser, async (req, res) => {
  const { user } = req;
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    let startTime = 30; // Base time
    let startWithBomb = false;

    // Check for +10s time booster (item ID 1)
    const time10Result = await client.query(
      `DELETE FROM user_inventory 
       WHERE id = (
         SELECT id FROM user_inventory 
         WHERE user_id = $1 AND item_id = 1 
         LIMIT 1
       ) RETURNING item_id`,
      [user.id]
    );

    // Check for +20s time booster (item ID 2)
    const time20Result = await client.query(
      `DELETE FROM user_inventory 
       WHERE id = (
         SELECT id FROM user_inventory 
         WHERE user_id = $1 AND item_id = 2 
         LIMIT 1
       ) RETURNING item_id`,
      [user.id]
    );

    // Check for Cookie Bomb (item ID 3)
    const bombResult = await client.query(
      `DELETE FROM user_inventory 
       WHERE id = (
         SELECT id FROM user_inventory 
         WHERE user_id = $1 AND item_id = 3
         LIMIT 1
       ) RETURNING item_id`,
      [user.id]
    );

    // Calculate final start time
    if (time10Result.rowCount > 0) startTime += 10;
    if (time20Result.rowCount > 0) startTime += 20;
    if (bombResult.rowCount > 0) startWithBomb = true;

    await client.query('COMMIT');
    
    res.status(200).json({
      startTime,
      startWithBomb,
    });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('🚨 Error in /api/start-game-session:', error);
    res.status(500).json({ error: 'Internal server error' });
  } finally {
    client.release();
  }
});

// UPDATED: Enhanced activate item for point multipliers
app.post('/api/activate-item', validateUser, async (req, res) => {
  try {
    const { user } = req;
    const { itemId } = req.body;
    if (!itemId) {
      return res.status(400).json({ error: 'itemId is required' });
    }
    
    if (itemId !== 4) { // Double Points item ID
      return res.status(400).json({ error: 'This item is not an activatable booster.' });
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const userResult = await client.query('SELECT point_booster_active FROM users WHERE telegram_id = $1 FOR UPDATE', [user.id]);
      if (userResult.rowCount === 0) throw new Error('User not found.');
      if (userResult.rows[0].point_booster_active) throw new Error('A booster is already active.');

      // Consume one Double Points item from inventory
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
      
      res.status(200).json({ success: true, message: 'Double Points activated for your next game!' });

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
    console.log(`✅ Server is running on port ${PORT}`);
  });
};

setupDatabase().then(startServer);
