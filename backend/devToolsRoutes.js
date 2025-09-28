// devToolsRoutes.js
import express from 'express';
import pg from 'pg';
import { validate } from './utils.js';

const { Pool } = pg;
const router = express.Router();

// ---- DATABASE ----
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// ---- MIDDLEWARE ----
const validateDeveloper = (req, res, next) => {
  const { initData } = req.body;
  if (!initData) {
    return res.status(400).json({ error: 'initData is required' });
  }

  if (!validate(initData, process.env.BOT_TOKEN)) {
    return res.status(401).json({ error: 'Invalid Telegram authentication' });
  }

  const params = new URLSearchParams(initData);
  const user = JSON.parse(params.get('user'));

  if (!user || !user.id) {
    return res.status(400).json({ error: 'Invalid user data in initData' });
  }
  
  // Only allow specific developer ID
  if (user.id !== 6998637798) {
    return res.status(403).json({ error: 'Unauthorized - Developer access only' });
  }
  
  req.user = user;
  next();
};

// 🛠️ Health check for DevTools
router.get('/health', async (req, res) => {
  try {
    res.json({ status: '✅ DevTools API is running' });
  } catch (error) {
    console.error('❌ DevTools health check error:', error);
    res.status(500).json({ error: 'Health check failed' });
  }
});

// 🔄 Reset tasks for developer account
router.post('/reset-tasks', validateDeveloper, async (req, res) => {
  try {
    const { user } = req;

    console.log(`🔧 Developer ${user.id} resetting tasks...`);

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const result = await client.query(
        'DELETE FROM user_tasks WHERE user_id = $1 RETURNING reward_points',
        [user.id]
      );

      const tasksDeleted = result.rowCount;
      const pointsFromTasks = result.rows.reduce((sum, row) => sum + row.reward_points, 0);

      if (pointsFromTasks > 0) {
        await client.query(
          'UPDATE users SET points = GREATEST(points - $1, 0) WHERE telegram_id = $2',
          [pointsFromTasks, user.id]
        );
      }

      await client.query('COMMIT');

      res.status(200).json({
        success: true,
        message: `Reset ${tasksDeleted} tasks and subtracted ${pointsFromTasks} points.`,
        tasksDeleted,
        pointsFromTasks
      });
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('🚨 Error in /api/dev/reset-tasks:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// 📊 Get system stats (optional developer utility)
router.get('/stats', validateDeveloper, async (req, res) => {
  try {
    const client = await pool.connect();
    try {
      const [usersResult, tasksResult, sessionsResult] = await Promise.all([
        client.query('SELECT COUNT(*) as total_users FROM users'),
        client.query('SELECT COUNT(*) as total_tasks FROM user_tasks'),
        client.query('SELECT COUNT(*) as total_sessions FROM game_sessions')
      ]);

      res.json({
        totalUsers: parseInt(usersResult.rows[0].total_users),
        totalTasks: parseInt(tasksResult.rows[0].total_tasks),
        totalSessions: parseInt(sessionsResult.rows[0].total_sessions)
      });
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('❌ Error fetching dev stats:', error);
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

export default router;
