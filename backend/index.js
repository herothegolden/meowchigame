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
    const createTableQuery = `
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
    `;
    await client.query(createTableQuery);
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
      let appUser = dbUserResult.rows[0];
      let dailyBonus = null; // To hold bonus info

      const now = new Date();

      if (!appUser) {
        const insertResult = await client.query(
          `INSERT INTO users (telegram_id, first_name, last_name, username, daily_streak, last_login_at)
           VALUES ($1, $2, $3, $4, 1, CURRENT_TIMESTAMP)
           RETURNING *`,
          [user.id, user.first_name, user.last_name, user.username]
        );
        appUser = insertResult.rows[0];
        // First time user gets a "streak" of 1
        dailyBonus = { points: 100, streak: 1 }; 
      } else {
        const lastLogin = new Date(appUser.last_login_at);
        const isSameDay = now.toDateString() === lastLogin.toDateString();

        if (!isSameDay) {
          const yesterday = new Date(now);
          yesterday.setDate(now.getDate() - 1);
          const isConsecutiveDay = lastLogin.toDateString() === yesterday.toDateString();
          
          let newStreak = isConsecutiveDay ? appUser.daily_streak + 1 : 1;
          let bonusPoints = 100 * newStreak;

          const updateResult = await client.query(
            `UPDATE users 
             SET last_login_at = CURRENT_TIMESTAMP, daily_streak = $1, points = points + $2
             WHERE telegram_id = $3
             RETURNING *`,
            [newStreak, bonusPoints, user.id]
          );
          appUser = updateResult.rows[0];
          dailyBonus = { points: bonusPoints, streak: newStreak };
        }
      }
      
      // Return user data and any bonus they received
      return res.status(200).json({ ...appUser, dailyBonus });

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

      const updatedUser = result.rows[0];
      return res.status(200).json({ newScore: updatedUser.points });

    } finally {
      client.release();
    }

  } catch (error) {
    console.error('🚨 Error in /api/update-score:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// A new route specifically for fetching user profile data
app.post('/api/user-stats', async (req, res) => {
  try {
    const { initData } = req.body;
    if (!initData) {
      return res.status(400).json({ error: 'initData is required' });
    }

    // 1. Validate the data from Telegram
    if (!validate(initData, BOT_TOKEN)) {
      return res.status(401).json({ error: 'Invalid data' });
    }
    
    // 2. Extract user data
    const params = new URLSearchParams(initData);
    const user = JSON.parse(params.get('user'));

    if (!user || !user.id) {
        return res.status(400).json({ error: 'Invalid user data in initData' });
    }

    // 3. Fetch the user's stats from the database
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


const startServer = () => {
  app.listen(PORT, () => {
    console.log(`✅ Server is running on port ${PORT}`);
  });
};

setupDatabase().then(startServer);
