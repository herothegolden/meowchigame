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

const setupDatabase = async () => {
  const client = await pool.connect();
  try {
    // Users Table
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

    // Shop Items Table
    await client.query(`
      CREATE TABLE IF NOT EXISTS shop_items (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        description TEXT,
        price INT NOT NULL,
        icon_name VARCHAR(50) 
      );
    `);

    // User Inventory Table
    await client.query(`
      CREATE TABLE IF NOT EXISTS user_inventory (
        id SERIAL PRIMARY KEY,
        user_id BIGINT REFERENCES users(telegram_id),
        item_id INT REFERENCES shop_items(id),
        acquired_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(user_id, item_id)
      );
    `);
    
    // Pre-populate shop with some items if it's empty
    const items = await client.query('SELECT * FROM shop_items');
    if (items.rowCount === 0) {
      await client.query(`
        INSERT INTO shop_items (name, description, price, icon_name) VALUES
        ('Extra Moves', '+5 moves for your next game.', 500, 'PlusCircle'),
        ('Point Booster', 'Doubles points from your next game.', 1500, 'ChevronsUp'),
        ('Profile Badge', 'A cool badge for your profile.', 5000, 'Badge');
      `);
    }

    console.log('✅ Database tables are set up.');
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

// ---- ROUTES ----
app.get('/health', (req, res) => {
  res.status(200).send('OK');
});

const isFarFuture = (date) => {
    const farFutureDate = new Date('2100-01-01');
    return date > farFutureDate;
};

app.post('/api/validate', async (req, res) => {
    try {
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
                let lastLogin = new Date(appUser.last_login_at);

                if (isFarFuture(lastLogin)) {
                    lastLogin = new Date();
                }

                const lastLoginDate = new Date(lastLogin.getFullYear(), lastLogin.getMonth(), lastLogin.getDate());
                const nowDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
                const diffTime = Math.abs(nowDate - lastLoginDate);
                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

                let newStreak = appUser.daily_streak;
                let newPoints = appUser.points;

                if (diffDays === 1) {
                    newStreak += 1;
                    const bonusPoints = 100 * newStreak;
                    newPoints += bonusPoints;
                    dailyBonus = { points: bonusPoints, streak: newStreak };
                } else if (diffDays > 1) {
                    newStreak = 1; 
                }
                
                if (diffDays >= 1) {
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

app.post('/api/update-score', async (req, res) => {
  try {
    const { initData, score } = req.body;
    if (!initData || score === undefined) {
      return res.status(400).json({ error: 'initData and score are required' });
    }
    
    if (!validate(initData, BOT_TOKEN)) {
      return res.status(401).json({ error: 'Invalid data' });
    }
    
    const params = new URLSearchParams(initData);
    const user = JSON.parse(params.get('user'));

    if (!user || !user.id) {
        return res.status(400).json({ error: 'Invalid user data in initData' });
    }

    const client = await pool.connect();
    try {
      const result = await client.query(
        'UPDATE users SET points = points + $1 WHERE telegram_id = $2 RETURNING points',
        [score, user.id]
      );
      
      if (result.rowCount === 0) {
        return res.status(404).json({ error: 'User not found' });
      }

      return res.status(200).json({ new_points: result.rows[0].points });

    } finally {
      client.release();
    }

  } catch (error) {
    console.error('🚨 Error in /api/update-score:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/user-stats', async (req, res) => {
  try {
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

    const client = await pool.connect();
    try {
      const dbUserResult = await client.query(
        'SELECT first_name, username, points, level, daily_streak, created_at FROM users WHERE telegram_id = $1', 
        [user.id]
      );
      
      if (dbUserResult.rowCount === 0) {
        return res.status(404).json({ error: 'User not found' });
      }
      
      const userStats = dbUserResult.rows[0];
      return res.status(200).json(userStats);

    } finally {
      client.release();
    }

  } catch (error) {
    console.error('🚨 Error in /api/user-stats:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// New endpoint to fetch all shop items
app.get('/api/shop-items', async (req, res) => {
  const client = await pool.connect();
  try {
    const result = await client.query('SELECT * FROM shop_items ORDER BY price ASC');
    res.status(200).json(result.rows);
  } catch (error) {
    console.error('🚨 Error in /api/shop-items:', error);
    res.status(500).json({ error: 'Internal server error' });
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
