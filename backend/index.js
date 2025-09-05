import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import pg from 'pg';
import { validate } from './utils.js';

const { Pool } = pg;

// ---- ENV VARS ----
const { PORT = 3000, DATABASE_URL, BOT_TOKEN } = process.env;
if (!DATABASE_URL || !BOT_TOKEN) {
  console.error("⛔ Missing DATABASE_URL or BOT_TOKEN environment variables");
  process.exit(1);
}

// ---- DATABASE ----
const pool = new Pool({ connectionString: DATABASE_URL });

// THIS IS THE STABLE DATABASE SETUP FUNCTION, BASED ON YOUR WORKING FILE'S LOGIC
const setupDatabase = async () => {
  const client = await pool.connect();
  try {
    // Users table
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
    
    // Shop items table
    await client.query(`
      CREATE TABLE IF NOT EXISTS shop_items (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        description TEXT,
        price INT NOT NULL,
        icon_name VARCHAR(255) NOT NULL
      );
    `);
    
    // User inventory table - CRITICAL FIX: Foreign key now correctly references telegram_id
    await client.query(`
      CREATE TABLE IF NOT EXISTS user_inventory (
        id SERIAL PRIMARY KEY,
        user_id BIGINT REFERENCES users(telegram_id) ON DELETE CASCADE,
        item_id INT REFERENCES shop_items(id) ON DELETE CASCADE,
        quantity INT DEFAULT 1,
        UNIQUE(user_id, item_id)
      );
    `);

    // --- Robust Column Addition for Boosters ---
    const columns = [
      { name: 'point_booster_active', type: 'BOOLEAN DEFAULT FALSE' },
      { name: 'extra_time_active', type: 'BOOLEAN DEFAULT FALSE' },
    ];

    for (const col of columns) {
      const res = await client.query(`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name='users' AND column_name=$1
      `, [col.name]);
      if (res.rows.length === 0) {
        await client.query(`ALTER TABLE users ADD COLUMN ${col.name} ${col.type}`);
        console.log(`✅ Column '${col.name}' added to users table.`);
      }
    }

    // --- Populate Shop Items (if empty) with new items ---
    const itemCount = await client.query('SELECT COUNT(*) FROM shop_items');
    if (itemCount.rows[0].count === '0') {
      await client.query(`
        INSERT INTO shop_items (name, description, price, icon_name) VALUES
        ('Point Booster', 'Doubles the points earned from your next game.', 250, 'ChevronsUp'),
        ('Extra Time', 'Adds 5 extra seconds to your next game.', 150, 'PlusCircle');
      `);
      console.log('✅ Shop items have been populated.');
    }
    
    console.log('✅ Database tables are set up correctly.');
  } catch (err) {
    console.error('🚨 Error setting up database:', err);
    process.exit(1);
  } finally {
    client.release();
  }
};

// ---- Middleware - STABLE VERSION ----
const validateUser = (req, res, next) => {
  const { initData } = req.body;
  if (!initData || !validate(initData, BOT_TOKEN)) {
    return res.status(401).json({ error: 'Invalid data' });
  }
  const params = new URLSearchParams(initData);
  const user = JSON.parse(params.get('user'));
  if (!user || !user.id) {
    return res.status(400).json({ error: 'Invalid user data' });
  }
  req.user = user; // req.user now holds the telegram user object, user.id is the telegram_id
  next();
};

// ---- EXPRESS APP ----
const app = express();
app.use(cors());
app.use(express.json());

// ---- ROUTES ----
app.get('/health', (req, res) => res.status(200).send('OK'));

app.post('/api/validate', validateUser, async (req, res) => {
  try {
    const { user } = req;
    const client = await pool.connect();
    try {
      let dbUserResult = await client.query('SELECT * FROM users WHERE telegram_id = $1', [user.id]);
      let appUser = dbUserResult.rows[0];
      let dailyBonus = null;

      if (!appUser) {
        const insertResult = await client.query(
          `INSERT INTO users (telegram_id, first_name, last_name, username) VALUES ($1, $2, $3, $4) RETURNING *`,
          [user.id, user.first_name, user.last_name, user.username]
        );
        appUser = insertResult.rows[0];
      } else {
        const now = new Date();
        const lastLogin = new Date(appUser.last_login_at);
        const isNewDay = now.toISOString().split('T')[0] > lastLogin.toISOString().split('T')[0];
        
        if (isNewDay) {
          const yesterday = new Date(now);
          yesterday.setDate(now.getDate() - 1);
          const isConsecutive = lastLogin.toISOString().split('T')[0] === yesterday.toISOString().split('T')[0];
          
          const newStreak = isConsecutive ? appUser.daily_streak + 1 : 1;
          const bonusPoints = 100;
          
          const updatedUser = await client.query(
            `UPDATE users SET last_login_at = CURRENT_TIMESTAMP, daily_streak = $1, points = points + $2 WHERE telegram_id = $3 RETURNING *`,
            [newStreak, bonusPoints, user.id]
          );
          appUser = updatedUser.rows[0];
          dailyBonus = { points: bonusPoints, streak: newStreak };
        }
      }
      return res.status(200).json({ ...appUser, dailyBonus });
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('🚨 Error in /api/validate:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/user-stats', validateUser, async (req, res) => {
    const client = await pool.connect();
    try {
        const userResult = await client.query('SELECT * FROM users WHERE telegram_id = $1', [req.user.id]);
        if(userResult.rows.length === 0) return res.status(404).json({error: 'User not found'});
        const dbUser = userResult.rows[0];

        // CRITICAL FIX: Query user_inventory with telegram_id (req.user.id)
        const inventoryResult = await client.query(
            `SELECT si.id, si.name, si.description, si.icon_name 
             FROM user_inventory ui 
             JOIN shop_items si ON ui.item_id = si.id 
             WHERE ui.user_id = $1`, [req.user.id]
        );
        
        res.status(200).json({
            user: dbUser,
            inventory: inventoryResult.rows
        });
    } catch (error) {
        console.error('🚨 Error fetching user stats:', error);
        res.status(500).json({ error: 'Internal server error' });
    } finally {
        client.release();
    }
});

app.post('/api/start-game', validateUser, async (req, res) => {
    const client = await pool.connect();
    try {
        const userResult = await client.query('SELECT point_booster_active, extra_time_active FROM users WHERE telegram_id = $1', [req.user.id]);
        if (userResult.rows.length === 0) return res.status(404).json({error: 'User not found'});

        let { point_booster_active, extra_time_active } = userResult.rows[0];
        let settings = { initialTime: 30, pointMultiplier: 1 };
        
        if (point_booster_active) {
            settings.pointMultiplier = 2;
            await client.query('UPDATE users SET point_booster_active = FALSE WHERE telegram_id = $1', [req.user.id]);
        }
        if (extra_time_active) {
            settings.initialTime = 35;
            await client.query('UPDATE users SET extra_time_active = FALSE WHERE telegram_id = $1', [req.user.id]);
        }
        res.status(200).json(settings);
    } catch (error) {
        console.error('🚨 Error starting game:', error);
        res.status(500).json({ error: 'Server error' });
    } finally {
        client.release();
    }
});

app.post('/api/update-score', validateUser, async (req, res) => {
    const { score } = req.body;
    if (typeof score !== 'number') return res.status(400).json({ error: 'Score is required' });
    
    const client = await pool.connect();
    try {
        await client.query('UPDATE users SET points = points + $1 WHERE telegram_id = $2', [score, req.user.id]);
        res.status(200).json({ success: true });
    } catch (error) {
        console.error('🚨 Error updating score:', error);
        res.status(500).json({ error: 'Internal server error' });
    } finally {
        client.release();
    }
});

app.post('/api/get-shop-data', validateUser, async (req, res) => {
    const client = await pool.connect();
    try {
        const userResult = await client.query('SELECT points FROM users WHERE telegram_id = $1', [req.user.id]);
        if(userResult.rows.length === 0) return res.status(404).json({error: 'User not found'});
        
        const itemsResult = await client.query('SELECT * FROM shop_items ORDER BY price');
        // CRITICAL FIX: Query user_inventory with telegram_id (req.user.id)
        const inventoryResult = await client.query(`SELECT item_id FROM user_inventory WHERE user_id = $1`, [req.user.id]);
        const ownedItemIds = new Set(inventoryResult.rows.map(r => r.item_id));

        res.status(200).json({
            points: userResult.rows[0].points,
            items: itemsResult.rows,
            ownedItemIds: Array.from(ownedItemIds)
        });
    } catch (error) {
        console.error('🚨 Error getting shop data:', error);
        res.status(500).json({ error: 'Internal server error' });
    } finally {
        client.release();
    }
});

app.post('/api/buy-item', validateUser, async (req, res) => {
    const { itemId } = req.body;
    if (!itemId) return res.status(400).json({ error: 'itemId is required' });
    const client = await pool.connect();
    
    try {
        await client.query('BEGIN');
        const itemResult = await client.query('SELECT * FROM shop_items WHERE id = $1', [itemId]);
        if (itemResult.rows.length === 0) throw new Error('Item not found');
        const item = itemResult.rows[0];
        
        const userResult = await client.query('SELECT points FROM users WHERE telegram_id = $1 FOR UPDATE', [req.user.id]);
        if (userResult.rows.length === 0) throw new Error('User not found');
        if (userResult.rows[0].points < item.price) throw new Error("You don't have enough points!");
        
        const inventoryResult = await client.query('SELECT * FROM user_inventory WHERE user_id = $1 AND item_id = $2', [req.user.id, itemId]);
        if (inventoryResult.rows.length > 0) throw new Error('You already own this item!');
        
        await client.query('UPDATE users SET points = points - $1 WHERE telegram_id = $2', [item.price, req.user.id]);
        await client.query('INSERT INTO user_inventory (user_id, item_id) VALUES ($1, $2)', [req.user.id, itemId]);
        await client.query('COMMIT');
        
        const updatedUser = await client.query('SELECT points FROM users WHERE telegram_id = $1', [req.user.id]);
        res.status(200).json({ success: true, newPoints: updatedUser.rows[0].points });
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('🚨 Error buying item:', error.message);
        res.status(400).json({ error: error.message || 'Internal server error' });
    } finally {
        client.release();
    }
});

app.post('/api/activate-item', validateUser, async (req, res) => {
    const { itemId } = req.body;
    if (!itemId) return res.status(400).json({ error: 'itemId is required' });
    const client = await pool.connect();
    
    try {
        await client.query('BEGIN');
        const userResult = await client.query('SELECT * FROM users WHERE telegram_id = $1 FOR UPDATE', [req.user.id]);
        if (userResult.rows.length === 0) throw new Error('User not found');
        const dbUser = userResult.rows[0];

        const inventoryCheck = await client.query('SELECT * FROM user_inventory WHERE user_id = $1 AND item_id = $2', [dbUser.telegram_id, itemId]);
        if (inventoryCheck.rows.length === 0) throw new Error("You don't own this item.");

        const itemResult = await client.query('SELECT name FROM shop_items WHERE id = $1', [itemId]);
        const itemName = itemResult.rows[0].name;
        
        let boosterField = '';
        if (itemName === 'Point Booster') boosterField = 'point_booster_active';
        else if (itemName === 'Extra Time') boosterField = 'extra_time_active';
        else throw new Error('Item is not activatable.');
        
        if (dbUser.point_booster_active || dbUser.extra_time_active) throw new Error('Another booster is already active.');

        await client.query(`UPDATE users SET ${boosterField} = TRUE WHERE telegram_id = $1`, [dbUser.telegram_id]);
        await client.query('DELETE FROM user_inventory WHERE user_id = $1 AND item_id = $2', [dbUser.telegram_id, itemId]);
        await client.query('COMMIT');
        
        res.status(200).json({ success: true });
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('🚨 Error activating item:', error.message);
        res.status(400).json({ error: error.message || 'Internal server error' });
    } finally {
        client.release();
    }
});

// ---- SERVER START ----
const startServer = () => {
  app.listen(PORT, () => {
    console.log(`✅ Server is running on port ${PORT}`);
  });
};

setupDatabase().then(startServer);
