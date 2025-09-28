// devToolsRoutes.js
import express from 'express';
import pg from 'pg';

const { Pool } = pg;
const router = express.Router();

// ---- DATABASE ----
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// 🛠️ Health check for DevTools
router.get('/health', async (req, res) => {
  try {
    res.json({ status: '✅ DevTools API is running' });
  } catch (error) {
    console.error('❌ DevTools health check error:', error);
    res.status(500).json({ error: 'Health check failed' });
  }
});

// 🗑️ Cleanup demo accounts
router.post('/cleanup-demo-users', async (req, res) => {
  try {
    const client = await pool.connect();

    const result = await client.query(`
      UPDATE users
      SET username = NULL,
          points = 0,
          level = 1,
          daily_streak = 0,
          games_played = 0,
          high_score = 0,
          total_play_time = 0
      WHERE LOWER(username) = 'demouser'
         OR LOWER(username) LIKE 'user_%'
    `);

    client.release();

    res.json({ message: `✅ Reset ${result.rowCount} demo accounts` });
  } catch (error) {
    console.error('❌ Error resetting demo accounts:', error);
    res.status(500).json({ error: 'Failed to reset demo accounts' });
  }
});

export default router;
