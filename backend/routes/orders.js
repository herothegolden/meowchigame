import express from 'express';
import { pool } from '../config/database.js';
import { validateUser } from '../middleware/auth.js';

const router = express.Router();
const { BOT_TOKEN, ADMIN_TELEGRAM_ID } = process.env;

// Helper: Send notification to admin via Telegram
async function sendAdminNotification(orderData) {
  if (!ADMIN_TELEGRAM_ID || !BOT_TOKEN) {
    console.warn('⚠️ Admin notification skipped: ADMIN_TELEGRAM_ID or BOT_TOKEN not configured');
    return false;
  }

  try {
    // Format items list
    const itemsList = orderData.items.map((item, index) => 
      `${index + 1}. ${item.productName}\n   Qty: ${item.quantity} × ${item.unitPrice.toLocaleString()} = ${item.totalPrice.toLocaleString()} UZS`
    ).join('\n');

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
            [
              { 
                text: '✅ Mark as Paid', 
                callback_data: `mark_paid_${orderData.orderId}` 
              }
            ],
            [
              { 
                text: '👤 Contact Customer', 
                url: `tg://user?id=${orderData.telegramId}` 
              }
            ]
          ]
        }
      })
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

// ---- CREATE ORDER (WITH CART SUPPORT) ----
router.post('/create-order', validateUser, async (req, res) => {
  try {
    const { user } = req;
    const { items, totalAmount } = req.body;

    // Validate input
    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ 
        error: 'Missing required field: items (must be non-empty array)' 
      });
    }

    if (!totalAmount || totalAmount <= 0) {
      return res.status(400).json({ 
        error: 'Invalid total amount' 
      });
    }

    // Validate each item
    for (const item of items) {
      if (!item.productId || !item.productName || !item.quantity || !item.unitPrice || !item.totalPrice) {
        return res.status(400).json({ 
          error: 'Invalid item format. Each item must have: productId, productName, quantity, unitPrice, totalPrice' 
        });
      }

      if (item.quantity < 1 || item.quantity > 100) {
        return res.status(400).json({ 
          error: `Invalid quantity for ${item.productName} (must be 1-100)` 
        });
      }

      // Verify price calculation
      const expectedTotal = item.unitPrice * item.quantity;
      if (item.totalPrice !== expectedTotal) {
        return res.status(400).json({ 
          error: `Price mismatch for ${item.productName}`,
          expected: expectedTotal,
          received: item.totalPrice
        });
      }
    }

    // Verify total amount calculation
    const calculatedTotal = items.reduce((sum, item) => sum + item.totalPrice, 0);
    if (totalAmount !== calculatedTotal) {
      return res.status(400).json({ 
        error: 'Total amount mismatch',
        expected: calculatedTotal,
        received: totalAmount
      });
    }

    const client = await pool.connect();
    try {
      // Generate unique order ID
      const orderId = `MW${Date.now().toString().slice(-8)}`;

      // Get user details
      const userResult = await client.query(
        'SELECT first_name, username FROM users WHERE telegram_id = $1',
        [user.id]
      );

      const userData = userResult.rows[0] || {};
      const customerName = userData.first_name || 'Unknown';
      const username = userData.username || null;

      // Create order summary for database
      const orderSummary = items.map(item => 
        `${item.productName} (${item.quantity})`
      ).join(', ');

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
        'pending'
      ]);

      console.log(`✅ Order created: ${orderId} for user ${user.id} with ${items.length} items`);

      // Send notification to admin
      const notificationSent = await sendAdminNotification({
        orderId,
        telegramId: user.id,
        customerName,
        username,
        items,
        totalAmount
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
          items: items.map(item => ({
            product: item.productName,
            quantity: item.quantity,
            price: item.totalPrice
          })),
          total: totalAmount,
          status: 'pending',
          createdAt: orderResult.rows[0].created_at
        }
      });

    } finally {
      client.release();
    }

  } catch (error) {
    console.error('❌ Error creating order:', error);
    res.status(500).json({ 
      error: 'Failed to create order',
      message: error.message 
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
      const orderResult = await client.query(
        'SELECT telegram_id, quantity, status FROM orders WHERE id = $1',
        [orderId]
      );

      if (orderResult.rowCount === 0) {
        return res.status(404).json({ error: 'Order not found' });
      }

      const order = orderResult.rows[0];

      if (order.status === 'paid' || order.status === 'completed') {
        return res.status(400).json({ error: 'Order already marked as paid' });
      }

      // Update order status
      await client.query(
        'UPDATE orders SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
        ['paid', orderId]
      );

      // Update user's VIP level
      await client.query(
        'UPDATE users SET vip_level = vip_level + $1 WHERE telegram_id = $2',
        [order.quantity, order.telegram_id]
      );

      console.log(`✅ Order ${orderId} marked as paid. VIP level updated for user ${order.telegram_id}`);

      res.status(200).json({
        success: true,
        message: 'Payment confirmed and VIP level updated',
        orderId,
        vipIncrement: order.quantity
      });

    } finally {
      client.release();
    }

  } catch (error) {
    console.error('❌ Error confirming payment:', error);
    res.status(500).json({ 
      error: 'Failed to confirm payment',
      message: error.message 
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
        orders: result.rows
      });

    } finally {
      client.release();
    }

  } catch (error) {
    console.error('❌ Error fetching orders:', error);
    res.status(500).json({ 
      error: 'Failed to fetch orders',
      message: error.message 
    });
  }
});

export default router;
