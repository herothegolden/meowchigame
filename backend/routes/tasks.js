import express from 'express';
import { pool } from '../config/database.js';
import { validateUser } from '../middleware/auth.js';

const router = express.Router();

// ---- LIST TASKS ----
router.post('/tasks/list', validateUser, async (req, res) => {
  try {
    const { user } = req;
    const client = await pool.connect();
    try {
      const result = await client.query(
        'SELECT task_name, completed, completed_at, reward_points FROM user_tasks WHERE user_id = $1',
        [user.id]
      );

      const completedTasks = result.rows.map(row => row.task_name);

      const allTasks = [
        { name: 'Join Telegram Channel', points: 500, completed: completedTasks.includes('Join Telegram Channel') },
        { name: 'Follow on Instagram', points: 300, completed: completedTasks.includes('Follow on Instagram') },
        { name: 'Play 5 Games', points: 250, completed: completedTasks.includes('Play 5 Games') },
        { name: 'Invite 3 Friends', points: 1000, completed: completedTasks.includes('Invite 3 Friends') }
      ];

      res.status(200).json({ tasks: allTasks });

    } finally {
      client.release();
    }
  } catch (error) {
    console.error('🚨 Error in /api/tasks/list:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ---- COMPLETE TASK ----
router.post('/tasks/complete', validateUser, async (req, res) => {
  try {
    const { user } = req;
    const { taskName } = req.body;
    
    if (!taskName) {
      return res.status(400).json({ error: 'Task name is required' });
    }

    const taskRewards = {
      'Join Telegram Channel': 500,
      'Follow on Instagram': 300,
      'Play 5 Games': 250,
      'Invite 3 Friends': 1000
    };

    const rewardPoints = taskRewards[taskName];
    if (!rewardPoints) {
      return res.status(400).json({ error: 'Invalid task name' });
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const checkResult = await client.query(
        'SELECT completed FROM user_tasks WHERE user_id = $1 AND task_name = $2',
        [user.id, taskName]
      );

      if (checkResult.rowCount > 0 && checkResult.rows[0].completed) {
        await client.query('ROLLBACK');
        return res.status(400).json({ error: 'Task already completed' });
      }

      await client.query(
        `INSERT INTO user_tasks (user_id, task_name, completed, completed_at, reward_points)
         VALUES ($1, $2, TRUE, CURRENT_TIMESTAMP, $3)
         ON CONFLICT (user_id, task_name) 
         DO UPDATE SET completed = TRUE, completed_at = CURRENT_TIMESTAMP`,
        [user.id, taskName, rewardPoints]
      );

      const updateResult = await client.query(
        'UPDATE users SET points = points + $1 WHERE telegram_id = $2 RETURNING points',
        [rewardPoints, user.id]
      );

      await client.query('COMMIT');

      res.status(200).json({
        success: true,
        newPoints: updateResult.rows[0].points,
        rewardPoints,
        message: `Earned ${rewardPoints} points for completing ${taskName}`
      });

    } catch(e) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('🚨 Error in /api/tasks/complete:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
