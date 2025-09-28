// devToolsRoutes.js - Only restrict by developer ID
import express from 'express';
import pg from 'pg';
import { validate } from './utils.js';

const { Pool } = pg;
const router = express.Router();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// Developer validation - ONLY check ID, no username restrictions
const validateDeveloper = (req, res, next) => {
  const { initData } = req.body;
  if (!initData) {
    return res.status(400).json({ error: 'initData is required' });
  }

  if (!validate(initData, process.env.BOT_TOKEN)) {
    return res.status(401).json({ error: 'Invalid authentication' });
  }

  const params = new URLSearchParams(initData);
  const user = JSON.parse(params.get('user'));

  if (!user || !user.id) {
    return res.status(400).json({ error: 'Invalid user data in initData' });
  }
  
  // ONLY restrict by developer ID - no username checks
  if (user.id !== 6998637798) {
    return res.status(403).json({ error: 'Developer access only' });
  }
  
  req.user = user;
  next();
};

// Health check
router.get('/health', (req, res) => {
  res.json({ status: '✅ DevTools API running' });
});

// Demo accounts cleanup - anyone can access this now, but only dev can use it
router.post('/cleanup-demo-users', validateDeveloper, async (req, res) => {
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

    res.json({ 
      success: true,
      message: `✅ Reset ${result.rowCount} demo accounts`,
      cleanedAccounts: result.rowCount
    });
  } catch (error) {
    console.error('❌ Error resetting demo accounts:', error);
    res.status(500).json({ error: 'Failed to reset demo accounts' });
  }
});

// Task reset - developer only
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

      res.json({
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
    console.error('🚨 Error in reset-tasks:', error);
    res.status(500).json({ error: 'Reset failed' });
  }
});

export default router;
