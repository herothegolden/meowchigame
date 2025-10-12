// Path: backend/routes/orders.js
// v6 — Meow Counter promo flow
// - /meow-cta-status now derives "today" from the DB (Asia/Tashkent) to avoid clock drift
// - Applies display-day guard to meow_taps using meow_taps_date
// - Returns `today` for easier debugging

import express from 'express';
import { pool } from '../config/database.js';
import { validateUser } from '../middleware/auth.js';

const router = express.Router();
const { BOT_TOKEN, ADMIN_TELEGRAM_ID } = process.env;

// Node 18+ has global crypto.randomUUID. Fallback for older runtimes:
const genUUID = () =>
  (global.crypto?.randomUUID
    ? global.crypto.randomUUID()
    : `${Date.now()}-xxxxxxxx`.replace(/[x]/g, () => (Math.random() * 16) | 0).toString(16));

// Helper: Send notification to admin via Telegram
async function sendAdminNotification(orderData) {
  if (!ADMIN_TELEGRAM_ID || !BOT_TOKEN) {
    console.warn('⚠️ Admin notification skipped: ADMIN_TELEGRAM_ID or BOT_TOKEN not configured');
    return false;
  }

  try {
    const itemsList = orderData.items
      .map(
        (item, index) =>
          `${index + 1}. ${item.productName}\n   Qty: ${item.quantity} × ${item.unitPrice.toLocaleString()} = ${item.totalPrice.toLocaleString()} UZS`
      )
      .join('\n');

    const message = `🔔 <b>NEW ORDER #${orderData.orderId}</b>

👤 <b>Customer:</b>
- Name: ${orderData.customerName}
- Username: @${orderData.username || 'no_username'}
- Telegram ID: <code>${orderData.telegramId}</code>

🪙 <b>Order Items:</b>
${itemsList}

💰 <b>Total Amount:</b> ${orderData.totalAmount.toLocaleString()} UZS

📊 <b>Status:</b> Pending Payment

💡 <b>Action Required:</b>
Contact customer via Telegram to arrange payment and delivery.`;

    const response = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: ADMIN_TELEGRAM_ID,
        text: message,
        parse_mode: 'HTML',
        reply_markup: {
          inline_keyboard: [
            [{ text: '✅ Mark as Paid', callback_data: `mark_paid_${orderData.orderId}` }],
            [{ text: '👤 Contact Customer', url: `tg://user?id=${orderData.telegramId}` }],
          ],
        },
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      console.error('❌ Telegram API error:', error);
      return false;
    }

    console.log('✅ Admin notification sent successfully');
    return true;
  } catch (error) {
    console.error('❌ Failed to send admin notification:', error);
    return false;
  }
}

/* ────────────────────────────────────────────────────────────────────────────
   NEW: Meow Counter Promo Flow
   - Reserve (first 42 per day), one per user per day, idempotent
   - Activate promo on Order Page via claim token
──────────────────────────────────────────────────────────────────────────── */

/**
 * POST /api/meow-claim
 * Preconditions (atomic, same transaction):
 *  - users.meow_taps >= 42
 *  - users.meow_claim_used_today = FALSE
 *  - meow_daily_claims(day).claims_taken < 42
 * Effects:
 *  - UPSERT meow_daily_claims row for today
 *  - Insert into meow_claims (id, user_id, day) with UNIQUE(user_id, day)
 *  - Set users.meow_claim_used_today = TRUE
 *  - Increment meow_daily_claims.claims_taken
 * Returns: { claimId, promo: 'MEOW42' }
 */
router.post('/meow-claim', validateUser, async (req, res) => {
  const { user } = req;
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Compute today's date in Asia/Tashkent (from DB to avoid drift)
    const {
      rows: [tz],
    } = await client.query(`SELECT (now() AT TIME ZONE 'Asia/Tashkent')::date AS day`);
    const today = tz.day;

    // Lock user row
    const ur = await client.query(
      `SELECT COALESCE(meow_taps,0) AS meow_taps,
              COALESCE(meow_claim_used_today, FALSE) AS used_today
         FROM users
        WHERE telegram_id = $1
        FOR UPDATE`,
      [user.id]
    );
    if (ur.rowCount === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'User not found' });
    }
    const { meow_taps, used_today } = ur.rows[0];

    if (meow_taps < 42) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'Not eligible: meow counter is below 42' });
    }
    if (used_today) {
      await client.query('ROLLBACK');
      return res.status(409).json({ error: 'Already claimed today' });
    }

    // Ensure daily row exists & lock it
    await client.query(
      `INSERT INTO meow_daily_claims (day, claims_taken)
       VALUES ($1, 0)
       ON CONFLICT (day) DO NOTHING`,
      [today]
    );

    const dr = await client.query(
      `SELECT claims_taken
         FROM meow_daily_claims
        WHERE day = $1
        FOR UPDATE`,
      [today]
    );
    const claimsTaken = dr.rows[0]?.claims_taken ?? 0;
    if (claimsTaken >= 42) {
      await client.query('ROLLBACK');
      return res.status(429).json({ error: 'Daily limit reached (42/42)' });
    }

    // Try to insert a new claim for (user, day); if exists, it's idempotent
    const claimId = genUUID();
    const cr = await client.query(
      `INSERT INTO meow_claims (id, user_id, day, consumed)
       VALUES ($1, $2, $3, FALSE)
       ON CONFLICT (user_id, day) DO NOTHING
       RETURNING id`,
      [claimId, user.id, today]
    );

    let finalClaimId = claimId;
    if (cr.rowCount === 0) {
      // Already has a claim. Fetch it and ensure it’s not consumed.
      const existing = await client.query(
        `SELECT id, consumed FROM meow_claims WHERE user_id = $1 AND day = $2`,
        [user.id, today]
      );
      const row = existing.rows[0];
      if (!row) {
        await client.query('ROLLBACK');
        return res.status(500).json({ error: 'Claim state inconsistent' });
      }
      if (row.consumed) {
        await client.query('ROLLBACK');
        return res.status(409).json({ error: 'Claim already consumed today' });
      }
      finalClaimId = row.id;
    }

    // Mark user as used today
    await client.query(`UPDATE users SET meow_claim_used_today = TRUE WHERE telegram_id = $1`, [user.id]);

    // Increment global daily counter
    await client.query(`UPDATE meow_daily_claims SET claims_taken = claims_taken + 1 WHERE day = $1`, [today]);

    await client.query('COMMIT');
    return res.status(200).json({ success: true, claimId: finalClaimId, promo: 'MEOW42' });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ /meow-claim error:', err);
    return res.status(500).json({ error: 'Internal error' });
  } finally {
    client.release();
  }
});

/**
 * POST /api/activate-promo
 * Body: { claimId }
 * Verifies token belongs to user, is for today, and not yet consumed.
 * Marks it consumed and returns pricing context.
 */
router.post('/activate-promo', validateUser, async (req, res) => {
  const { user } = req;
  const { claimId } = req.body;
  if (!claimId) return res.status(400).json({ error: 'Missing claimId' });

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const {
      rows: [tz],
    } = await client.query(`SELECT (now() AT TIME ZONE 'Asia/Tashkent')::date AS day`);
    const today = tz.day;

    const cr = await client.query(
      `SELECT id, user_id, day, consumed
         FROM meow_claims
        WHERE id = $1
          AND user_id = $2
          AND day = $3
        FOR UPDATE`,
      [claimId, user.id, today]
    );
    if (cr.rowCount === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Claim not found or expired' });
    }
    const claim = cr.rows[0];
    if (claim.consumed) {
      await client.query('ROLLBACK');
      return res.status(409).json({ error: 'Claim already consumed' });
    }

    await client.query(`UPDATE meow_claims SET consumed = TRUE WHERE id = $1`, [claimId]);

    await client.query('COMMIT');
    return res.status(200).json({
      success: true,
      promo: 'MEOW42',
      discountPercent: 42,
      claimId,
    });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ /activate-promo error:', err);
    return res.status(500).json({ error: 'Internal error' });
  } finally {
    client.release();
  }
});

/**
 * POST /api/meow-cta-status
 * Returns: { meow_taps, usedToday, remainingGlobal, eligible, today }
 * NOTE: POST (not GET) because validateUser reads initData from req.body; apiCall posts by design.
 */
router.post('/meow-cta-status', validateUser, async (req, res) => {
  const { user } = req;
  const client = await pool.connect();
  try {
    // Derive "today" from DB to avoid Node clock drift
    const {
      rows: [tz],
    } = await client.query(`SELECT (now() AT TIME ZONE 'Asia/Tashkent')::date AS today`);
    const today = tz.today;

    // Read user state (include date for display guard)
    const ur = await client.query(
      `SELECT COALESCE(meow_taps,0) AS meow_taps,
              meow_taps_date,
              COALESCE(meow_claim_used_today,FALSE) AS used_today
         FROM users
        WHERE telegram_id = $1`,
      [user.id]
    );
    if (ur.rowCount === 0) return res.status(404).json({ error: 'User not found' });

    const { meow_taps, meow_taps_date, used_today } = ur.rows[0];

    // Display-day guard: if stored date != today, treat as 0 for CTA logic
    const tapDay = meow_taps_date ? String(meow_taps_date).slice(0, 10) : null;
    const todayStr = String(today).slice(0, 10);
    const guardedMeow = tapDay === todayStr ? Number(meow_taps || 0) : 0;

    // Global remaining for "today"
    const dr = await client.query(`SELECT claims_taken FROM meow_daily_claims WHERE day = $1`, [today]);
    const claimsTaken = dr.rowCount ? Number(dr.rows[0].claims_taken || 0) : 0;
    const remainingGlobal = Math.max(42 - claimsTaken, 0);

    const eligible = guardedMeow >= 42 && !used_today && remainingGlobal > 0;

    return res.status(200).json({
      meow_taps: guardedMeow,
      usedToday: !!used_today,
      remainingGlobal,
      eligible,
      today: todayStr,
    });
  } catch (err) {
    console.error('❌ /meow-cta-status error:', err);
    return res.status(500).json({ error: 'Internal error' });
  } finally {
    client.release();
  }
});

/* ────────────────────────────────────────────────────────────────────────────
   Orders (existing)
──────────────────────────────────────────────────────────────────────────── */

// ---- CREATE ORDER (WITH CART SUPPORT) ----
router.post('/create-order', validateUser, async (req, res) => {
  try {
    const { user } = req;
    const { items, totalAmount } = req.body;

    // Validate input
    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'Missing required field: items (must be non-empty array)' });
    }

    if (!totalAmount || totalAmount <= 0) {
      return res.status(400).json({ error: 'Invalid total amount' });
    }

    // Validate each item
    for (const item of items) {
      if (!item.productId || !item.productName || !item.quantity || !item.unitPrice || !item.totalPrice) {
        return res
          .status(400)
          .json({ error: 'Invalid item format. Each item must have: productId, productName, quantity, unitPrice, totalPrice' });
      }

      if (item.quantity < 1 || item.quantity > 100) {
        return res.status(400).json({ error: `Invalid quantity for ${item.productName} (must be 1-100)` });
      }

      // Verify price calculation
      const expectedTotal = item.unitPrice * item.quantity;
      if (item.totalPrice !== expectedTotal) {
        return res.status(400).json({
          error: `Price mismatch for ${item.productName}`,
          expected: expectedTotal,
          received: item.totalPrice,
        });
      }
    }

    // Verify total amount calculation
    const calculatedTotal = items.reduce((sum, item) => sum + item.totalPrice, 0);
    if (totalAmount !== calculatedTotal) {
      return res.status(400).json({
        error: 'Total amount mismatch',
        expected: calculatedTotal,
        received: totalAmount,
      });
    }

    const client = await pool.connect();
    try {
      // Generate unique order ID
      const orderId = `MW${Date.now().toString().slice(-8)}`;

      // Get user details
      const userResult = await client.query('SELECT first_name, username FROM users WHERE telegram_id = $1', [user.id]);

      const userData = userResult.rows[0] || {};
      const customerName = userData.first_name || 'Unknown';
      const username = userData.username || null;

      // Create order summary for database
      const orderSummary = items.map((item) => `${item.productName} (${item.quantity})`).join(', ');

      // Insert order into database
      const insertQuery = `
        INSERT INTO orders (
          id, 
          telegram_id, 
          customer_name, 
          customer_phone, 
          product_name, 
          quantity, 
          total_amount, 
          status, 
          created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, CURRENT_TIMESTAMP)
        RETURNING id, created_at
      `;

      // Store total quantity and order summary
      const totalQuantity = items.reduce((sum, item) => sum + item.quantity, 0);

      const orderResult = await client.query(insertQuery, [
        orderId,
        user.id,
        customerName,
        '', // customer_phone not collected (empty string for NOT NULL constraint)
        orderSummary, // Combined product names
        totalQuantity, // Total quantity of all items
        totalAmount,
        'pending',
      ]);

      console.log(`✅ Order created: ${orderId} for user ${user.id} with ${items.length} items`);

      // Send notification to admin
      const notificationSent = await sendAdminNotification({
        orderId,
        telegramId: user.id,
        customerName,
        username,
        items,
        totalAmount,
      });

      if (!notificationSent) {
        console.warn('⚠️ Order saved but admin notification failed');
      }

      // Return success
      res.status(200).json({
        success: true,
        orderId: orderId,
        message: 'Order submitted successfully. Admin will contact you via Telegram.',
        order: {
          id: orderId,
          items: items.map((item) => ({
            product: item.productName,
            quantity: item.quantity,
            price: item.totalPrice,
          })),
          total: totalAmount,
          status: 'pending',
          createdAt: orderResult.rows[0].created_at,
        },
      });
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('❌ Error creating order:', error);
    res.status(500).json({
      error: 'Failed to create order',
      message: error.message,
    });
  }
});

// ---- CONFIRM PAYMENT (Called by admin bot) ----
router.post('/confirm-payment/:orderId', async (req, res) => {
  try {
    const { orderId } = req.params;
    const { adminKey } = req.body;

    // Validate admin authorization
    if (!adminKey || adminKey !== process.env.ADMIN_API_KEY) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    const client = await pool.connect();
    try {
      // Get order details
      const orderResult = await client.query('SELECT telegram_id, quantity, status FROM orders WHERE id = $1', [orderId]);

      if (orderResult.rowCount === 0) {
        return res.status(404).json({ error: 'Order not found' });
      }

      const order = orderResult.rows[0];

      if (order.status === 'paid' || order.status === 'completed') {
        return res.status(400).json({ error: 'Order already marked as paid' });
      }

      // Update order status
      await client.query('UPDATE orders SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2', ['paid', orderId]);

      // Update user's VIP level
      await client.query('UPDATE users SET vip_level = vip_level + $1 WHERE telegram_id = $2', [
        order.quantity,
        order.telegram_id,
      ]);

      console.log(`✅ Order ${orderId} marked as paid. VIP level updated for user ${order.telegram_id}`);

      res.status(200).json({
        success: true,
        message: 'Payment confirmed and VIP level updated',
        orderId,
        vipIncrement: order.quantity,
      });
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('❌ Error confirming payment:', error);
    res.status(500).json({
      error: 'Failed to confirm payment',
      message: error.message,
    });
  }
});

// ---- GET USER ORDERS ----
router.post('/my-orders', validateUser, async (req, res) => {
  try {
    const { user } = req;

    const client = await pool.connect();
    try {
      const result = await client.query(
        `SELECT id, product_name, quantity, total_amount, status, created_at 
         FROM orders 
         WHERE telegram_id = $1 
         ORDER BY created_at DESC 
         LIMIT 20`,
        [user.id]
      );

      res.status(200).json({
        success: true,
        orders: result.rows,
      });
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('❌ Error fetching orders:', error);
    res.status(500).json({
      error: 'Failed to fetch orders',
      message: error.message,
    });
  }
});

export default router;
