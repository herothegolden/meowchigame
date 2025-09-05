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

// THIS IS THE NEW FUNCTION TO AUTOMATE DATABASE SETUP
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
    process.exit(1); // Exit if we can't set up the database
  } finally {
    client.release();
  }
};


// ---- EXPRESS APP ----
const app = express();
app.use(cors()); // Allow requests from our frontend
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

    // 3. Find or create the user in the database
    const client = await pool.connect();
    try {
      let dbUserResult = await client.query('SELECT * FROM users WHERE telegram_id = $1', [user.id]);
      let appUser = dbUserResult.rows[0];

      if (!appUser) {
        // User is new, create an entry
        const insertResult = await client.query(
          `INSERT INTO users (telegram_id, first_name, last_name, username)
           VALUES ($1, $2, $3, $4)
           RETURNING *`,
          [user.id, user.first_name, user.last_name, user.username]
        );
        appUser = insertResult.rows[0];
      } else {
        // User exists, update their last login time
        await client.query('UPDATE users SET last_login_at = CURRENT_TIMESTAMP WHERE telegram_id = $1', [user.id]);
      }
      
      return res.status(200).json(appUser);

    } finally {
      client.release();
    }

  } catch (error) {
    console.error('🚨 Error in /api/validate:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// NEW: Endpoint to update a user's points
app.post('/api/update-score', async (req, res) => {
  try {
    const { initData, score } = req.body;

    if (!initData || score === undefined) {
      return res.status(400).json({ error: 'initData and score are required' });
    }

    // 1. Securely validate the data from Telegram
    if (!validate(initData, BOT_TOKEN)) {
      return res.status(401).json({ error: 'Invalid data' });
    }

    // 2. Extract user data
    const params = new URLSearchParams(initData);
    const user = JSON.parse(params.get('user'));

    if (!user || !user.id) {
      return res.status(400).json({ error: 'Invalid user data in initData' });
    }

    // 3. Update the user's points in the database
    const client = await pool.connect();
    try {
      // We use UPDATE ... SET points = points + $1 to prevent race conditions
      // and ensure we're adding to the current score, not overwriting it.
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

// ---- SERVER START ----
// We wrap the server start in a function to run it after the database setup
const startServer = () => {
  app.listen(PORT, () => {
    console.log(`✅ Server is running on port ${PORT}`);
  });
};

// Run setup and then start the server
setupDatabase().then(startServer);
