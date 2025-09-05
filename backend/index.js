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

// THIS IS THE ROBUST DATABASE SETUP FUNCTION
const setupDatabase = async () => {
  const client = await pool.connect();
  try {
    // 1. Create Users Table if it doesn't exist
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

    // 2. Add booster columns if they don't exist
    const columns = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name='users' AND column_name IN ('point_booster_active', 'extra_time_active')
    `);
    const existingColumns = columns.rows.map(r => r.column_name);

    if (!existingColumns.includes('point_booster_active')) {
      console.log('Migrating users table: adding point_booster_active column...');
      await client.query(`ALTER TABLE users ADD COLUMN point_booster_active BOOLEAN DEFAULT FALSE NOT NULL`);
    }
    if (!existingColumns.includes('extra_time_active')) {
      console.log('Migrating users table: adding extra_time_active column...');
      await client.query(`ALTER TABLE users ADD COLUMN extra_time_active BOOLEAN DEFAULT FALSE NOT NULL`);
    }

    // 3. Create Shop & Inventory tables
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
    await client.query(`
      CREATE TABLE IF NOT EXISTS user_inventory (
        id SERIAL PRIMARY KEY,
        user_id BIGINT REFERENCES users(telegram_id),
        item_id INT REFERENCES shop_items(id),
        acquired_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        -- Removed unique constraint to allow multiple consumable items
      );
    `);
    
    // 4. Pre-populate shop if empty
    const items = await client.query('SELECT * FROM shop_items');
    if (items.rowCount === 0) {
      await client.query(`
        INSERT INTO shop_items (id, name, description, price, icon_name, type) VALUES
        (1, 'Extra Time', '+5 seconds for your next game.', 750, 'PlusCircle', 'consumable'),
        (2, 'Point Booster', 'Doubles points from your next game.', 1500, 'ChevronsUp', 'consumable'),
        (3, 'Profile Badge', 'A cool badge for your profile.', 5000, 'Badge', 'permanent')
        ON CONFLICT (id) DO NOTHING;
      `);
    }

    console.log('✅ Database tables are set up correctly.');
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

app.post('/api/update-score', validateUser, async (req, res) => {
  try {
    const { user } = req;
    const { score, pointMultiplier } = req.body;
    if (score === undefined) {
      return res.status(400).json({ error: 'Score is required' });
    }

    const client = await pool.connect();
    try {
      const userResult = await client.query('SELECT points FROM users WHERE telegram_id = $1', [user.id]);
      if (userResult.rowCount === 0) throw new Error('User not found');

      const finalScore = score * (pointMultiplier || 1);
      const newPoints = userResult.rows[0].points + finalScore;

      const updateResult = await client.query(
        'UPDATE users SET points = $1 WHERE telegram_id = $2 RETURNING points',
        [newPoints, user.id]
      );
      return res.status(200).json({ new_points: updateResult.rows[0].points, score_awarded: finalScore });
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
        'SELECT first_name, username, points, level, daily_streak, created_at FROM users WHERE telegram_id = $1', 
        [user.id]
      );
      if (dbUserResult.rowCount === 0) return res.status(404).json({ error: 'User not found' });
      res.status(200).json(dbUserResult.rows[0]);
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
      const [itemsResult, userResult, inventoryResult] = await Promise.all([
        client.query('SELECT * FROM shop_items ORDER BY price ASC'),
        client.query('SELECT points, point_booster_active, extra_time_active FROM users WHERE telegram_id = $1', [user.id]),
        client.query('SELECT item_id, COUNT(item_id) as quantity FROM user_inventory WHERE user_id = $1 GROUP BY item_id', [user.id])
      ]);
      
      if (userResult.rowCount === 0) return res.status(404).json({ error: 'User not found' });
      
      const inventory = inventoryResult.rows.reduce((acc, row) => {
        acc[row.item_id] = parseInt(row.quantity, 10);
        return acc;
      }, {});

      const shopData = {
        items: itemsResult.rows,
        userPoints: userResult.rows[0].points,
        inventory,
        activeBoosters: {
            point_booster: userResult.rows[0].point_booster_active,
            extra_time: userResult.rows[0].extra_time_active
        }
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
    if (!itemId) return res.status(400).json({ error: 'itemId is required' });

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const itemResult = await client.query('SELECT price, type FROM shop_items WHERE id = $1', [itemId]);
      if (itemResult.rowCount === 0) throw new Error('Item not found.');
      const { price, type } = itemResult.rows[0];

      const userResult = await client.query('SELECT points FROM users WHERE telegram_id = $1 FOR UPDATE', [user.id]);
      if (userResult.rowCount === 0) throw new Error('User not found.');
      const userPoints = userResult.rows[0].points;
      
      if (userPoints < price) throw new Error('Insufficient points.');
      
      if (type === 'permanent') {
        const inventoryCheck = await client.query('SELECT 1 FROM user_inventory WHERE user_id = $1 AND item_id = $2', [user.id, itemId]);
        if (inventoryCheck.rowCount > 0) throw new Error('Item already owned.');
      }

      const newPoints = userPoints - price;
      await client.query('UPDATE users SET points = $1 WHERE telegram_id = $2', [newPoints, user.id]);
      await client.query('INSERT INTO user_inventory (user_id, item_id) VALUES ($1, $2)', [user.id, itemId]);

      await client.query('COMMIT');
      res.status(200).json({ success: true, newPoints, message: 'Purchase successful!' });
    } catch (error) {
      await client.query('ROLLBACK');
      const knownErrors = ['Insufficient points.', 'Item already owned.', 'Item not found.', 'User not found.'];
      if (knownErrors.includes(error.message)) {
          return res.status(400).json({ success: false, error: error.message });
      }
      console.error('🚨 Error in /api/buy-item:', error);
      res.status(500).json({ success: false, error: 'Internal server error' });
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('🚨 Error in /api/buy-item:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/activate-item', validateUser, async (req, res) => {
  try {
    const { user } = req;
    const { itemId } = req.body;
    if (!itemId) return res.status(400).json({ error: 'itemId is required' });
    
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      
      const userResult = await client.query('SELECT point_booster_active, extra_time_active FROM users WHERE telegram_id = $1 FOR UPDATE', [user.id]);
      if (userResult.rowCount === 0) throw new Error('User not found.');
      const { point_booster_active, extra_time_active } = userResult.rows[0];

      const inventoryResult = await client.query(
        'SELECT id FROM user_inventory WHERE user_id = $1 AND item_id = $2 LIMIT 1', [user.id, itemId]
      );
      if (inventoryResult.rowCount === 0) throw new Error('You do not own this item.');

      let activationColumn, message;
      if (itemId === 1) { // Extra Time
        if (extra_time_active) throw new Error('An Extra Time booster is already active.');
        activationColumn = 'extra_time_active';
        message = 'Extra Time activated for your next game!';
      } else if (itemId === 2) { // Point Booster
        if (point_booster_active) throw new Error('A Point Booster is already active.');
        activationColumn = 'point_booster_active';
        message = 'Point Booster activated for your next game!';
      } else {
        throw new Error('This item cannot be activated.');
      }
      
      await client.query('DELETE FROM user_inventory WHERE id = $1', [inventoryResult.rows[0].id]);
      await client.query(`UPDATE users SET ${activationColumn} = TRUE WHERE telegram_id = $1`, [user.id]);
      
      await client.query('COMMIT');
      res.status(200).json({ success: true, message });

    } catch (error) {
      await client.query('ROLLBACK');
      const knownErrors = ['User not found.', 'You do not own this item.', 'This item cannot be activated.', 'A Point Booster is already active.', 'An Extra Time booster is already active.'];
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

// NEW ENDPOINT: START A GAME SESSION
app.post('/api/start-game', validateUser, async (req, res) => {
  try {
    const { user } = req;
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const userResult = await client.query(
        'SELECT point_booster_active, extra_time_active FROM users WHERE telegram_id = $1 FOR UPDATE', 
        [user.id]
      );
      if (userResult.rowCount === 0) throw new Error('User not found.');

      const { point_booster_active, extra_time_active } = userResult.rows[0];
      
      const gameConfig = {
        startTime: 30, // Base time
        pointMultiplier: 1, // Base multiplier
      };

      if (extra_time_active) {
        gameConfig.startTime += 5;
      }
      if (point_booster_active) {
        gameConfig.pointMultiplier = 2;
      }

      await client.query(
        'UPDATE users SET point_booster_active = FALSE, extra_time_active = FALSE WHERE telegram_id = $1',
        [user.id]
      );
      
      await client.query('COMMIT');

      res.status(200).json(gameConfig);

    } catch(error) {
        await client.query('ROLLBACK');
        console.error('🚨 Error in /api/start-game:', error);
        res.status(500).json({ error: 'Failed to start game session.' });
    } finally {
        client.release();
    }
  } catch (error) {
    console.error('🚨 Error in /api/start-game:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});


const startServer = () => {
  app.listen(PORT, () => {
    console.log(`✅ Server is running on port ${PORT}`);
  });
};

setupDatabase().then(startServer);
