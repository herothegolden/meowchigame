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

// THIS IS THE DEFINITIVE, ROBUST DATABASE SETUP FUNCTION
const setupDatabase = async () => {
  const client = await pool.connect();
  try {
    console.log('🏁 Starting database setup...');
    
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

    // 2. Check and add all required columns to the users table
    const columns = ['point_booster_active', 'extra_time_active'];
    for (const col of columns) {
        const res = await client.query(`
            SELECT 1 FROM information_schema.columns 
            WHERE table_name='users' AND column_name=$1
        `, [col]);
        if (res.rowCount === 0) {
            console.log(`- Migrating users table: adding '${col}' column...`);
            await client.query(`ALTER TABLE users ADD COLUMN ${col} BOOLEAN DEFAULT FALSE NOT NULL`);
        }
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
    
    // 4. THIS IS THE CRITICAL FIX: We create the table if it doesn't exist instead of dropping it.
    // This prevents wiping all user purchases every time the server restarts.
    console.log('- Ensuring user_inventory table exists...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS user_inventory (
        id SERIAL PRIMARY KEY,
        user_id BIGINT NOT NULL REFERENCES users(telegram_id) ON DELETE CASCADE,
        item_id INT NOT NULL REFERENCES shop_items(id) ON DELETE CASCADE,
        acquired_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);
    
    // 5. Pre-populate shop if empty
    const items = await client.query('SELECT * FROM shop_items');
    if (items.rowCount === 0) {
      console.log('- Populating shop_items table...');
      // Note: Changed "Extra Time" to "Extra Moves" to align with potential frontend text,
      // but the functionality remains giving extra time via 'extra_time_active'.
      await client.query(`
        INSERT INTO shop_items (id, name, description, price, icon_name, type) VALUES
        (1, 'Extra Moves', '+5 seconds for your next game.', 750, 'Clock', 'consumable'),
        (2, 'Point Booster', 'Doubles points from your next game.', 1500, 'ChevronsUp', 'consumable'),
        (3, 'Profile Badge', 'A cool badge for your profile.', 5000, 'Badge', 'permanent')
        ON CONFLICT (id) DO NOTHING;
      `);
    }

    console.log('✅ Database is fully set up and migrated.');
  } catch (err) {
    console.error('🚨 FATAL: Error setting up database:', err);
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
  if (!initData || !validate(initData, BOT_TOKEN)) {
    return res.status(401).json({ error: 'Invalid data' });
  }
  const user = JSON.parse(new URLSearchParams(initData).get('user'));
  req.user = user;
  next();
};

// ---- ROUTES ----
app.get('/health', (req, res) => res.status(200).send('OK'));

app.post('/api/validate', validateUser, async (req, res) => {
    const { user } = req;
    const client = await pool.connect();
    try {
        let dbUser = (await client.query('SELECT * FROM users WHERE telegram_id = $1', [user.id])).rows[0];
        let dailyBonus = null;

        if (!dbUser) {
            dbUser = (await client.query(
                `INSERT INTO users (telegram_id, first_name, last_name, username) VALUES ($1, $2, $3, $4) RETURNING *`,
                [user.id, user.first_name, user.last_name, user.username]
            )).rows[0];
        } else {
            const now = new Date();
            const lastLogin = new Date(dbUser.last_login_at);
            const isNewDay = now.toDateString() !== lastLogin.toDateString();
            
            if (isNewDay) {
                const oneDay = 24 * 60 * 60 * 1000;
                const diffDays = Math.round(Math.abs((now - lastLogin) / oneDay));
                const newStreak = diffDays === 1 ? dbUser.daily_streak + 1 : 1;
                const bonusPoints = 100 * newStreak;
                
                dailyBonus = { points: bonusPoints, streak: newStreak };
                
                dbUser = (await client.query(
                    'UPDATE users SET last_login_at = CURRENT_TIMESTAMP, daily_streak = $2, points = points + $3 WHERE telegram_id = $1 RETURNING *',
                    [user.id, newStreak, bonusPoints]
                )).rows[0];
            }
        }
        res.status(200).json({ ...dbUser, dailyBonus });
    } catch (error) {
        console.error('🚨 Error in /api/validate:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    } finally {
        client.release();
    }
});

app.post('/api/start-game', validateUser, async (req, res) => {
    const { user } = req;
    const client = await pool.connect();
    try {
        const { rows } = await client.query('SELECT point_booster_active, extra_time_active FROM users WHERE telegram_id = $1', [user.id]);
        if (rows.length === 0) return res.status(404).json({ error: 'User not found' });

        const { point_booster_active, extra_time_active } = rows[0];
        const gameConfig = {
            initialTime: 30 + (extra_time_active ? 5 : 0),
            pointMultiplier: point_booster_active ? 2 : 1,
        };
        
        await client.query('UPDATE users SET point_booster_active = FALSE, extra_time_active = FALSE WHERE telegram_id = $1', [user.id]);
        
        res.status(200).json(gameConfig);
    } catch (error) {
        console.error('🚨 Error in /api/start-game:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    } finally {
        client.release();
    }
});

app.post('/api/update-score', validateUser, async (req, res) => {
    const { user } = req;
    const { score } = req.body;
    if (score === undefined) {
        return res.status(400).json({ error: 'Score is required' });
    }
    const client = await pool.connect();
    try {
        const { rows } = await client.query('UPDATE users SET points = points + $1 WHERE telegram_id = $2 RETURNING points', [score, user.id]);
        res.status(200).json({ new_points: rows[0].points, score_awarded: score });
    } catch (error) {
        console.error('🚨 Error in /api/update-score:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    } finally {
        client.release();
    }
});

app.post('/api/get-shop-data', validateUser, async (req, res) => {
    const { user } = req;
    const client = await pool.connect();
    try {
        const [itemsRes, userRes, inventoryRes] = await Promise.all([
            client.query('SELECT * FROM shop_items ORDER BY price ASC'),
            client.query('SELECT points FROM users WHERE telegram_id = $1', [user.id]),
            client.query('SELECT item_id FROM user_inventory WHERE user_id = $1', [user.id]),
        ]);
        
        if (userRes.rowCount === 0) return res.status(404).json({error: 'User not found'});

        res.status(200).json({
            items: itemsRes.rows,
            userPoints: userRes.rows[0].points,
            inventory: inventoryRes.rows.map(r => r.item_id),
        });
    } catch (error) {
        console.error('🚨 Error in /api/get-shop-data:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    } finally {
        client.release();
    }
});

app.post('/api/get-profile-data', validateUser, async (req, res) => {
    const { user } = req;
    const client = await pool.connect();
    try {
        const userStatsRes = await client.query('SELECT first_name, username, points, level, daily_streak, created_at, point_booster_active, extra_time_active FROM users WHERE telegram_id = $1', [user.id]);
        
        if (userStatsRes.rowCount === 0) {
          return res.status(404).json({ error: 'User profile not found.' });
        }

        const inventoryRes = await client.query(`
                SELECT si.id, si.name, si.icon_name, si.type 
                FROM user_inventory ui
                LEFT JOIN shop_items si ON ui.item_id = si.id 
                WHERE ui.user_id = $1
            `, [user.id]);

        // This filters out any broken inventory items where the shop item was not found.
        const cleanInventory = inventoryRes.rows.filter(item => item.id !== null);

        res.status(200).json({
            stats: userStatsRes.rows[0],
            inventory: cleanInventory,
        });
    } catch (error) {
        console.error('🚨 Error in /api/get-profile-data:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    } finally {
        client.release();
    }
});


app.post('/api/buy-item', validateUser, async (req, res) => {
    const { user } = req;
    const { itemId } = req.body;
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        const item = (await client.query('SELECT name, price, type FROM shop_items WHERE id = $1', [itemId])).rows[0];
        const userData = (await client.query('SELECT points FROM users WHERE telegram_id = $1 FOR UPDATE', [user.id])).rows[0];

        if (!item) throw new Error('Item not found.');
        if (userData.points < item.price) throw new Error('Insufficient points.');

        if (item.type === 'permanent') {
            const owned = (await client.query('SELECT 1 FROM user_inventory WHERE user_id = $1 AND item_id = $2', [user.id, itemId])).rowCount > 0;
            if (owned) throw new Error('Item already owned.');
        }

        const newPoints = userData.points - item.price;
        await client.query('UPDATE users SET points = $1 WHERE telegram_id = $2', [newPoints, user.id]);
        await client.query('INSERT INTO user_inventory (user_id, item_id) VALUES ($1, $2)', [user.id, itemId]);
        
        await client.query('COMMIT');
        // FIX: Add a success message for the frontend popup
        res.status(200).json({ success: true, newPoints: newPoints, message: `Successfully purchased ${item.name}!` });
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Error in /api/buy-item:', error.message);
        res.status(400).json({ success: false, error: error.message });
    } finally {
        client.release();
    }
});

app.post('/api/activate-item', validateUser, async (req, res) => {
    const { user } = req;
    const { itemId } = req.body;
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        const item = (await client.query('SELECT type FROM shop_items WHERE id = $1', [itemId])).rows[0];
        if (!item || item.type !== 'consumable') throw new Error('Item cannot be activated.');

        const userData = (await client.query('SELECT point_booster_active, extra_time_active FROM users WHERE telegram_id = $1 FOR UPDATE', [user.id])).rows[0];
        if (userData.point_booster_active || userData.extra_time_active) throw new Error('A booster is already active.');
        
        const inventoryItem = (await client.query('SELECT id FROM user_inventory WHERE user_id = $1 AND item_id = $2 LIMIT 1', [user.id, itemId])).rows[0];
        if (!inventoryItem) throw new Error('You do not own this item.');

        await client.query('DELETE FROM user_inventory WHERE id = $1', [inventoryItem.id]);
        
        let boosterColumn;
        if (itemId === 1) boosterColumn = 'extra_time_active'; // Extra Time
        else if (itemId === 2) boosterColumn = 'point_booster_active'; // Point Booster
        else throw new Error('Unknown booster item.');

        await client.query(`UPDATE users SET ${boosterColumn} = TRUE WHERE telegram_id = $1`, [user.id]);
        
        await client.query('COMMIT');
        res.status(200).json({ success: true });
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Error in /api/activate-item:', error.message);
        res.status(400).json({ success: false, error: error.message });
    } finally {
        client.release();
    }
});

const startServer = () => {
  app.listen(PORT, () => {
    console.log(`✅ Server is running on port ${PORT}`);
  });
};

setupDatabase().then(startServer);
