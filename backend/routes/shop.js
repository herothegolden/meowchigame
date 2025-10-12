import express from 'express';
import { pool } from '../config/database.js';
import { validateUser } from '../middleware/auth.js';

const router = express.Router();

// ---- GET SHOP DATA ----
router.post('/get-shop-data', validateUser, async (req, res) => {
  try {
    const { user } = req;
    const client = await pool.connect();
    try {
      const [itemsResult, userResult, inventoryResult, badgesResult] = await Promise.all([
        client.query('SELECT * FROM shop_items ORDER BY id ASC'),
        client.query('SELECT points FROM users WHERE telegram_id = $1', [user.id]),
        client.query('SELECT item_id, quantity FROM user_inventory WHERE user_id = $1', [user.id]),
        client.query('SELECT badge_name FROM user_badges WHERE user_id = $1', [user.id])
      ]);

      res.status(200).json({
        items: itemsResult.rows,
        userPoints: userResult.rows[0]?.points || 0,
        inventory: inventoryResult.rows,
        ownedBadges: badgesResult.rows.map(row => row.badge_name)
      });

    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Error in /api/get-shop-data:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ---- PURCHASE ITEM ----
router.post('/shop/purchase', validateUser, async (req, res) => {
  try {
    const { user } = req;
    const { itemId } = req.body;
    
    if (!itemId) {
      return res.status(400).json({ error: 'Item ID is required' });
    }

    console.log(`💰 Purchase request: User ${user.id}, Item ${itemId}`);

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const itemResult = await client.query('SELECT * FROM shop_items WHERE id = $1', [itemId]);
      if (itemResult.rowCount === 0) {
        await client.query('ROLLBACK');
        return res.status(404).json({ error: 'Item not found' });
      }

      const item = itemResult.rows[0];
      const userResult = await client.query(
        'SELECT points FROM users WHERE telegram_id = $1 FOR UPDATE',
        [user.id]
      );
      
      if (userResult.rowCount === 0) {
        await client.query('ROLLBACK');
        return res.status(404).json({ error: 'User not found' });
      }

      const userPoints = userResult.rows[0].points;

      if (userPoints < item.price) {
        await client.query('ROLLBACK');
        return res.status(400).json({ error: 'Insufficient points' });
      }

      const newPoints = userPoints - item.price;
      await client.query(
        'UPDATE users SET points = $1 WHERE telegram_id = $2',
        [newPoints, user.id]
      );

      if (item.type === 'permanent') {
        await client.query(
          'INSERT INTO user_badges (user_id, badge_name) VALUES ($1, $2) ON CONFLICT DO NOTHING',
          [user.id, item.name]
        );
      } else {
        await client.query(
          `INSERT INTO user_inventory (user_id, item_id, quantity)
           VALUES ($1, $2, 1)
           ON CONFLICT (user_id, item_id)
           DO UPDATE SET quantity = user_inventory.quantity + 1`,
          [user.id, itemId]
        );
      }

      await client.query('COMMIT');

      console.log(`✅ Purchase completed: User ${user.id}, Item ${itemId}, New Points: ${newPoints}`);

      res.status(200).json({
        success: true,
        newPoints,
        item: item.name,
        message: `Successfully purchased ${item.name}`
      });

    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('🚨 Error in /api/shop/purchase:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ---- USE ITEM (Generic) ----
router.post('/shop/use-item', validateUser, async (req, res) => {
  try {
    const { user } = req;
    const { itemId } = req.body;
    
    if (!itemId) {
      return res.status(400).json({ error: 'Item ID is required' });
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const inventoryResult = await client.query(
        'SELECT ui.quantity, si.name FROM user_inventory ui JOIN shop_items si ON ui.item_id = si.id WHERE ui.user_id = $1 AND ui.item_id = $2',
        [user.id, itemId]
      );

      if (inventoryResult.rowCount === 0) {
        await client.query('ROLLBACK');
        return res.status(404).json({ error: 'Item not found in inventory' });
      }

      const { quantity, name: itemName } = inventoryResult.rows[0];

      if (quantity > 1) {
        await client.query(
          'UPDATE user_inventory SET quantity = quantity - 1 WHERE user_id = $1 AND item_id = $2',
          [user.id, itemId]
        );
      } else {
        await client.query(
          'DELETE FROM user_inventory WHERE user_id = $1 AND item_id = $2',
          [user.id, itemId]
        );
      }

      if (itemName === 'Double Points') {
        await client.query('UPDATE users SET point_booster_active = TRUE WHERE telegram_id = $1', [user.id]);
      }

      await client.query(
        'INSERT INTO item_usage_history (user_id, item_id, item_name) VALUES ($1, $2, $3)',
        [user.id, itemId, itemName]
      );

      await client.query('COMMIT');

      res.status(200).json({
        success: true,
        itemName,
        message: `Successfully used ${itemName}`
      });

    } catch(e) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('🚨 Error in /api/shop/use-item:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
