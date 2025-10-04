import TelegramBot from 'node-telegram-bot-api';

const { BOT_TOKEN, ADMIN_API_KEY, PORT = 3000 } = process.env;

// Validate required environment variables
if (!BOT_TOKEN) {
  console.error('❌ BOT_TOKEN is required for bot.js');
  process.exit(1);
}

if (!ADMIN_API_KEY) {
  console.error('❌ ADMIN_API_KEY is required for bot.js');
  process.exit(1);
}

// Initialize bot
const bot = new TelegramBot(BOT_TOKEN, { polling: true });

console.log('🤖 Telegram Bot initialized');

// ---- CALLBACK QUERY HANDLER ----
// Handles "Mark as Paid" button clicks from admin
bot.on('callback_query', async (callbackQuery) => {
  const { id: queryId, data, message } = callbackQuery;
  const chatId = message.chat.id;
  const messageId = message.message_id;

  try {
    console.log(`📲 Callback received: ${data}`);

    // Check if this is a "mark_paid" callback
    if (data && data.startsWith('mark_paid_')) {
      const orderId = data.replace('mark_paid_', '');
      
      console.log(`💳 Processing payment confirmation for order: ${orderId}`);

      // Call backend endpoint to confirm payment
      const backendUrl = `http://localhost:${PORT}/api/confirm-payment/${orderId}`;
      
      const response = await fetch(backendUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ adminKey: ADMIN_API_KEY })
      });

      const result = await response.json();

      if (response.ok) {
        console.log(`✅ Order ${orderId} marked as paid successfully`);
        console.log(`🎖️ VIP level updated by +${result.vipIncrement}`);

        // Answer callback query (removes loading state)
        await bot.answerCallbackQuery(queryId, {
          text: '✅ Payment confirmed! VIP level updated.',
          show_alert: false
        });

        // Edit the original message to show it's been paid
        const updatedText = message.text + '\n\n✅ <b>PAID & CONFIRMED</b>\n🎖️ VIP level updated';
        
        await bot.editMessageText(updatedText, {
          chat_id: chatId,
          message_id: messageId,
          parse_mode: 'HTML',
          reply_markup: {
            inline_keyboard: [
              [
                { 
                  text: '✅ Already Paid', 
                  callback_data: 'already_paid' 
                }
              ]
            ]
          }
        });

      } else {
        console.error(`❌ Failed to confirm payment: ${result.error}`);

        await bot.answerCallbackQuery(queryId, {
          text: `❌ Error: ${result.error}`,
          show_alert: true
        });
      }

    } else if (data === 'already_paid') {
      // Handle "Already Paid" button click
      await bot.answerCallbackQuery(queryId, {
        text: 'This order has already been marked as paid.',
        show_alert: false
      });
    } else {
      // Unknown callback
      console.warn(`⚠️ Unknown callback data: ${data}`);
      await bot.answerCallbackQuery(queryId, {
        text: 'Unknown action.',
        show_alert: false
      });
    }

  } catch (error) {
    console.error('❌ Error handling callback query:', error);

    // Notify admin of error
    await bot.answerCallbackQuery(queryId, {
      text: '❌ Failed to process. Check server logs.',
      show_alert: true
    }).catch(err => console.error('Failed to answer callback:', err));
  }
});

// ---- ERROR HANDLER ----
bot.on('polling_error', (error) => {
  console.error('🚨 Bot polling error:', error.code, error.message);
});

// ---- STARTUP MESSAGE ----
bot.getMe().then((botInfo) => {
  console.log(`✅ Bot started successfully: @${botInfo.username}`);
}).catch((error) => {
  console.error('❌ Failed to start bot:', error);
});

export default bot;
