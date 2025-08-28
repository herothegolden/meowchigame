// bot.js - Telegram Bot for Meowchi Notifications
import { Telegraf } from 'telegraf';
import { Pool } from 'pg';

// Initialize bot
const bot = new Telegraf(process.env.BOT_TOKEN);

// Database connection (reuse from main app)
let pool = null;
const DATABASE_URL = process.env.DATABASE_URL;

if (DATABASE_URL) {
  pool = new Pool({
    connectionString: DATABASE_URL,
    ssl: DATABASE_URL.includes("localhost") ? false : { rejectUnauthorized: false },
  });
}

// Configuration
const config = {
  WEBAPP_URL: process.env.WEBAPP_URL || 'https://your-app-url.com',
  BOT_USERNAME: process.env.BOT_USERNAME || 'meowchi_game_bot',
  DAILY_REMINDER_HOUR: parseInt(process.env.DAILY_REMINDER_HOUR) || 18, // 6 PM
  ENABLE_NOTIFICATIONS: process.env.ENABLE_NOTIFICATIONS !== 'false'
};

// === Bot Commands ===

// Start command - handles new users and referrals
bot.start(async (ctx) => {
  try {
    const telegramId = ctx.from.id;
    const username = ctx.from.username;
    const firstName = ctx.from.first_name;
    const startPayload = ctx.message.text.split(' ')[1];

    console.log(`🤖 New user started bot: ${telegramId} (${username})`);

    // Check if it's a referral
    let referrerId = null;
    if (startPayload && startPayload.startsWith('ref_')) {
      referrerId = startPayload.replace('ref_', '');
      console.log(`🎁 Referral detected: ${referrerId} -> ${telegramId}`);
    }

    // Create welcome message
    let welcomeMessage = `🐱 Welcome to Meowchi, ${firstName}!\n\n`;
    welcomeMessage += `🎮 The cutest match-3 game on Telegram!\n`;
    welcomeMessage += `💰 Match treats, earn $Meow coins\n`;
    welcomeMessage += `🏆 Compete with friends\n`;
    welcomeMessage += `📋 Complete daily tasks\n\n`;

    if (referrerId && referrerId != telegramId) {
      welcomeMessage += `🎁 You were invited by a friend!\n`;
      welcomeMessage += `You'll both get bonus coins when you start playing!\n\n`;
    }

    welcomeMessage += `Ready to feed some hungry cats? 😺`;

    // Send welcome message with game button
    await ctx.reply(welcomeMessage, {
      reply_markup: {
        inline_keyboard: [
          [{ text: '🎮 Play Meowchi', web_app: { url: config.WEBAPP_URL } }],
          [
            { text: '🏆 Leaderboard', web_app: { url: `${config.WEBAPP_URL}#leaderboard` } },
            { text: '📋 Daily Tasks', web_app: { url: `${config.WEBAPP_URL}#daily` } }
          ],
          [{ text: '👥 Invite Friends', callback_data: 'invite_friends' }]
        ]
      }
    });

    // Store user in database if we have pool connection
    if (pool) {
      try {
        await pool.query(
          `INSERT INTO users (telegram_id, display_name) 
           VALUES ($1, $2) 
           ON CONFLICT (telegram_id) 
           DO UPDATE SET updated_at = NOW()`,
          [telegramId, username || firstName]
        );

        // Process referral if exists
        if (referrerId && referrerId != telegramId) {
          await processReferral(referrerId, telegramId, ctx);
        }
      } catch (error) {
        console.error('Database error in start command:', error);
      }
    }

  } catch (error) {
    console.error('Error in start command:', error);
    await ctx.reply('😿 Something went wrong. Please try again!');
  }
});

// Help command
bot.help(async (ctx) => {
  const helpMessage = `🐱 Meowchi Help\n\n` +
    `🎮 /play - Launch the game\n` +
    `📊 /stats - View your statistics\n` +
    `👥 /invite - Get your referral link\n` +
    `🏆 /leaderboard - Check rankings\n` +
    `⚙️ /settings - Notification settings\n\n` +
    `💡 Tip: You can play directly by tapping the game button above!`;

  await ctx.reply(helpMessage, {
    reply_markup: {
      inline_keyboard: [
        [{ text: '🎮 Play Now', web_app: { url: config.WEBAPP_URL } }]
      ]
    }
  });
});

// Stats command
bot.command('stats', async (ctx) => {
  const telegramId = ctx.from.id;
  
  if (!pool) {
    return ctx.reply('📊 Stats unavailable right now. Try playing the game!');
  }

  try {
    const stats = await pool.query(`
      SELECT 
        COUNT(g.id) as games_played,
        COALESCE(SUM(g.score), 0) as total_score,
        COALESCE(MAX(g.score), 0) as best_score,
        COALESCE(MAX(g.max_combo), 0) as best_combo,
        COALESCE(SUM(g.coins_earned), 0) as total_coins,
        COUNT(r.id) as referrals
      FROM users u
      LEFT JOIN games g ON u.id = g.user_id
      LEFT JOIN referrals r ON u.telegram_id = r.referrer_id
      WHERE u.telegram_id = $1
      GROUP BY u.id
    `, [telegramId]);

    if (stats.rows.length === 0) {
      return ctx.reply('🐱 No stats yet! Start playing to see your progress!', {
        reply_markup: {
          inline_keyboard: [
            [{ text: '🎮 Play Now', web_app: { url: config.WEBAPP_URL } }]
          ]
        }
      });
    }

    const userStats = stats.rows[0];
    const statsMessage = `📊 Your Meowchi Stats\n\n` +
      `🎮 Games Played: ${userStats.games_played}\n` +
      `🎯 Best Score: ${parseInt(userStats.best_score).toLocaleString()}\n` +
      `🔥 Best Combo: x${parseInt(userStats.best_combo) + 1}\n` +
      `💰 Total Coins: ${parseInt(userStats.total_coins).toLocaleString()}\n` +
      `👥 Friends Invited: ${parseInt(userStats.referrals)}\n\n` +
      `Keep playing to improve your stats! 😺`;

    await ctx.reply(statsMessage, {
      reply_markup: {
        inline_keyboard: [
          [{ text: '🎮 Play Again', web_app: { url: config.WEBAPP_URL } }],
          [{ text: '🏆 View Leaderboard', web_app: { url: `${config.WEBAPP_URL}#leaderboard` } }]
        ]
      }
    });

  } catch (error) {
    console.error('Error fetching stats:', error);
    await ctx.reply('😿 Could not fetch stats. Please try again!');
  }
});

// Invite command
bot.command('invite', async (ctx) => {
  const telegramId = ctx.from.id;
  const referralLink = `https://t.me/${config.BOT_USERNAME}?start=ref_${telegramId}`;
  
  const inviteMessage = `👥 Invite Friends to Meowchi!\n\n` +
    `🎁 You get 1,000 coins for each friend\n` +
    `🎁 They get 500 bonus coins\n\n` +
    `Share your link:\n${referralLink}`;

  await ctx.reply(inviteMessage, {
    reply_markup: {
      inline_keyboard: [
        [{ text: '📤 Share Link', switch_inline_query: `🐱 Join me in Meowchi! We both get bonus coins! ${referralLink}` }],
        [{ text: '📋 Copy Link', callback_data: `copy_${telegramId}` }]
      ]
    }
  });
});

// Play command
bot.command('play', async (ctx) => {
  await ctx.reply('🎮 Launch Meowchi!', {
    reply_markup: {
      inline_keyboard: [
        [{ text: '🐱 Play Now', web_app: { url: config.WEBAPP_URL } }]
      ]
    }
  });
});

// Leaderboard command
bot.command('leaderboard', async (ctx) => {
  await ctx.reply('🏆 Check the leaderboard!', {
    reply_markup: {
      inline_keyboard: [
        [{ text: '🏆 View Rankings', web_app: { url: `${config.WEBAPP_URL}#leaderboard` } }]
      ]
    }
  });
});

// Settings command
bot.command('settings', async (ctx) => {
  await ctx.reply('⚙️ Notification Settings\n\n' +
    'Use the buttons below to control your notifications:', {
    reply_markup: {
      inline_keyboard: [
        [
          { text: '🔔 Daily Reminders ON', callback_data: 'toggle_daily_off' },
          { text: '🔕 Daily Reminders OFF', callback_data: 'toggle_daily_on' }
        ],
        [
          { text: '🏆 Leaderboard Alerts ON', callback_data: 'toggle_leaderboard_off' },
          { text: '🚫 Leaderboard Alerts OFF', callback_data: 'toggle_leaderboard_on' }
        ],
        [{ text: '🎮 Open Game', web_app: { url: config.WEBAPP_URL } }]
      ]
    }
  });
});

// === Callback Query Handlers ===

// Handle inline keyboard callbacks
bot.on('callback_query', async (ctx) => {
  const data = ctx.callbackQuery.data;
  const telegramId = ctx.from.id;

  try {
    if (data === 'invite_friends') {
      await ctx.answerCbQuery();
      const referralLink = `https://t.me/${config.BOT_USERNAME}?start=ref_${telegramId}`;
      
      await ctx.reply(`👥 Your Referral Link:\n${referralLink}\n\n` +
        `🎁 Get 1,000 coins for each friend who joins!\n` +
        `🎁 They get 500 coins too!`, {
        reply_markup: {
          inline_keyboard: [
            [{ text: '📤 Share Now', switch_inline_query: `Join me in Meowchi! 🐱 We both get bonus coins!` }]
          ]
        }
      });
    }
    
    else if (data.startsWith('copy_')) {
      await ctx.answerCbQuery('Link copied to clipboard! 📋');
    }
    
    else if (data === 'toggle_daily_on') {
      // Enable daily notifications
      if (pool) {
        await pool.query(
          'UPDATE users SET daily_notifications = TRUE WHERE telegram_id = $1',
          [telegramId]
        );
      }
      await ctx.answerCbQuery('Daily reminders enabled! 🔔');
      await ctx.editMessageText('⚙️ Settings Updated\n\n🔔 Daily reminders: ON\n\n' +
        'You\'ll get a friendly reminder to play each day!');
    }
    
    else if (data === 'toggle_daily_off') {
      // Disable daily notifications
      if (pool) {
        await pool.query(
          'UPDATE users SET daily_notifications = FALSE WHERE telegram_id = $1',
          [telegramId]
        );
      }
      await ctx.answerCbQuery('Daily reminders disabled 🔕');
      await ctx.editMessageText('⚙️ Settings Updated\n\n🔕 Daily reminders: OFF\n\n' +
        'You can re-enable them anytime with /settings');
    }

    // NEW: Leaderboard notification toggles
    else if (data === 'toggle_leaderboard_on') {
      if (pool) {
        await pool.query(
          'UPDATE users SET leaderboard_notifications = TRUE WHERE telegram_id = $1',
          [telegramId]
        );
      }
      await ctx.answerCbQuery('Leaderboard alerts enabled! 🏆');
      await ctx.editMessageText('⚙️ Settings Updated\n\n🏆 Leaderboard alerts: ON\n\n' +
        'Get notified when your rank changes or someone challenges you!');
    }
    
    else if (data === 'toggle_leaderboard_off') {
      if (pool) {
        await pool.query(
          'UPDATE users SET leaderboard_notifications = FALSE WHERE telegram_id = $1',
          [telegramId]
        );
      }
      await ctx.answerCbQuery('Leaderboard alerts disabled 🚫');
      await ctx.editMessageText('⚙️ Settings Updated\n\n🚫 Leaderboard alerts: OFF\n\n' +
        'You won\'t get rank change notifications.');
    }
    
  } catch (error) {
    console.error('Error handling callback:', error);
    await ctx.answerCbQuery('Error occurred. Please try again.');
  }
});

// === NEW: Smart Notification Functions ===

// Check for leaderboard changes and send contextual notifications
async function checkLeaderboardChanges() {
  if (!config.ENABLE_NOTIFICATIONS || !pool) {
    console.log('Leaderboard notifications disabled or no database connection');
    return;
  }

  try {
    // Get current daily leaderboard rankings
    const currentRankings = await pool.query(`
      SELECT 
        u.telegram_id, 
        u.display_name,
        COALESCE(SUM(g.score), 0) AS daily_score,
        ROW_NUMBER() OVER (ORDER BY SUM(g.score) DESC) AS current_rank
      FROM users u
      LEFT JOIN games g ON u.id = g.user_id AND DATE(g.created_at) = CURRENT_DATE
      WHERE COALESCE(u.leaderboard_notifications, TRUE) = TRUE
        AND u.created_at < NOW() - INTERVAL '1 day'
      GROUP BY u.id, u.telegram_id, u.display_name
      HAVING SUM(g.score) > 0
      ORDER BY daily_score DESC
      LIMIT 50
    `);

    // Get previous rankings (stored or calculated)
    const previousRankings = await getPreviousRankings();

    let notificationsSent = 0;
    
    for (const current of currentRankings.rows) {
      const previous = previousRankings.find(p => p.telegram_id == current.telegram_id);
      
      if (!previous) continue; // New player, skip for now
      
      const rankChange = previous.rank - current.current_rank; // Positive = moved up
      const currentRank = parseInt(current.current_rank);
      const previousRank = parseInt(previous.rank);
      
      // Only notify for significant changes
      if (Math.abs(rankChange) < 2 && currentRank > 10) continue;

      try {
        let message = '';
        let shouldNotify = false;

        // Rank improvements
        if (rankChange > 0) {
          if (currentRank === 1) {
            message = `👑 AMAZING! You're now #1 on today's leaderboard! 🎉\n\nYou've claimed the throne with ${parseInt(current.daily_score).toLocaleString()} points!`;
            shouldNotify = true;
          } else if (currentRank <= 3 && previousRank > 3) {
            message = `🥉 You made it to the TOP 3! 🏆\n\nCurrently rank #${currentRank} - keep playing to reach #1!`;
            shouldNotify = true;
          } else if (currentRank <= 10 && previousRank > 10) {
            message = `🔥 You're in the TOP 10! 🚀\n\nRank #${currentRank} and climbing! Can you make it to the podium?`;
            shouldNotify = true;
          } else if (rankChange >= 5) {
            message = `📈 Nice climb! You jumped ${rankChange} positions to rank #${currentRank}! 🎯`;
            shouldNotify = true;
          }
        }
        
        // Rank losses (more urgent notifications)
        else if (rankChange < 0 && currentRank <= 20) {
          const dropAmount = Math.abs(rankChange);
          if (previousRank === 1) {
            message = `😱 OH NO! Someone just dethroned you from #1!\n\nYou're now rank #${currentRank}. Time for revenge? 😼`;
            shouldNotify = true;
          } else if (previousRank <= 3 && currentRank > 3) {
            message = `😿 You dropped out of the TOP 3!\n\nNow rank #${currentRank}. A few more games could get you back on the podium! 🏆`;
            shouldNotify = true;
          } else if (previousRank <= 10 && currentRank > 10) {
            message = `⚠️ You fell out of the TOP 10!\n\nRank #${currentRank} now. Time to show them what you're made of! 🔥`;
            shouldNotify = true;
          } else if (dropAmount >= 3) {
            message = `📉 Heads up! You dropped ${dropAmount} positions to rank #${currentRank}.\n\nSomeone's been busy playing! Ready to reclaim your spot? 😺`;
            shouldNotify = true;
          }
        }

        // Send notification if warranted
        if (shouldNotify) {
          await bot.telegram.sendMessage(current.telegram_id, message, {
            reply_markup: {
              inline_keyboard: [
                [{ text: '🎮 Play Now', web_app: { url: config.WEBAPP_URL } }],
                [{ text: '🏆 View Leaderboard', web_app: { url: `${config.WEBAPP_URL}#leaderboard` } }]
              ]
            }
          });
          
          notificationsSent++;
          console.log(`🏆 Leaderboard notification sent to ${current.telegram_id}: rank ${previousRank} -> ${currentRank}`);
          
          // Rate limiting
          await new Promise(resolve => setTimeout(resolve, 200));
        }
        
      } catch (error) {
        console.error(`Failed to send leaderboard notification to ${current.telegram_id}:`, error.message);
      }
    }

    // Store current rankings for next comparison
    await storeCurrentRankings(currentRankings.rows);
    
    console.log(`📊 Leaderboard check complete: ${notificationsSent} notifications sent`);

  } catch (error) {
    console.error('Error checking leaderboard changes:', error);
  }
}

// Get previous rankings (simplified - in production you'd store this)
async function getPreviousRankings() {
  try {
    // This is a simplified version - in production, you'd store previous rankings in a table
    const result = await pool.query(`
      SELECT 
        u.telegram_id,
        u.last_known_rank as rank
      FROM users u
      WHERE u.last_known_rank IS NOT NULL
    `);
    return result.rows;
  } catch (error) {
    console.error('Error getting previous rankings:', error);
    return [];
  }
}

// Store current rankings for future comparison
async function storeCurrentRankings(rankings) {
  if (!pool) return;
  
  try {
    for (const ranking of rankings) {
      await pool.query(
        'UPDATE users SET last_known_rank = $1, last_rank_update = NOW() WHERE telegram_id = $2',
        [ranking.current_rank, ranking.telegram_id]
      );
    }
  } catch (error) {
    console.error('Error storing current rankings:', error);
  }
}

// Process referral bonus
async function processReferral(referrerId, referredId, ctx) {
  if (!pool) return;

  try {
    // Check if referral already exists
    const existing = await pool.query(
      'SELECT id FROM referrals WHERE referrer_id = $1 AND referred_id = $2',
      [referrerId, referredId]
    );

    if (existing.rows.length > 0) {
      console.log('Referral already processed');
      return;
    }

    // Add referral record
    await pool.query(
      'INSERT INTO referrals (referrer_id, referred_id) VALUES ($1, $2)',
      [referrerId, referredId]
    );

    // Give bonus coins
    await pool.query(
      'UPDATE users SET bonus_coins = COALESCE(bonus_coins, 0) + 1000 WHERE telegram_id = $1',
      [referrerId]
    );
    await pool.query(
      'UPDATE users SET bonus_coins = COALESCE(bonus_coins, 0) + 500 WHERE telegram_id = $2',
      [referredId]
    );

    // Notify referrer
    try {
      await bot.telegram.sendMessage(referrerId, 
        `🎉 A friend joined Meowchi through your link!\n\n` +
        `💰 +1,000 bonus coins added to your account!\n` +
        `👥 Keep inviting friends for more rewards!`, {
        reply_markup: {
          inline_keyboard: [
            [{ text: '🎮 Play Now', web_app: { url: config.WEBAPP_URL } }]
          ]
        }
      });
    } catch (error) {
      console.log(`Could not notify referrer ${referrerId}:`, error.message);
    }

    console.log(`✅ Referral processed: ${referrerId} -> ${referredId}`);

  } catch (error) {
    console.error('Error processing referral:', error);
  }
}

// Send daily reminders with smarter messaging
async function sendDailyReminders() {
  if (!config.ENABLE_NOTIFICATIONS || !pool) {
    console.log('Daily reminders disabled or no database connection');
    return;
  }

  try {
    // Get users who haven't played today and want notifications
    const users = await pool.query(`
      SELECT DISTINCT 
        u.telegram_id,
        u.display_name,
        u.last_known_rank,
        COALESCE(MAX(g.score), 0) as best_score
      FROM users u
      LEFT JOIN games g ON u.id = g.user_id 
        AND DATE(g.played_at AT TIME ZONE 'UTC') = CURRENT_DATE
      WHERE g.id IS NULL 
        AND COALESCE(u.daily_notifications, TRUE) = TRUE
        AND u.created_at < NOW() - INTERVAL '1 day'
      GROUP BY u.telegram_id, u.display_name, u.last_known_rank
      LIMIT 1000
    `);

    console.log(`📢 Sending daily reminders to ${users.rows.length} users`);

    const contextualMessages = {
      ranked_player: [
        `🏆 Don't let others steal your spot! You're rank #{rank} - defend your position! 😼`,
        `⚡ Your leaderboard rivals are playing... time to show them who's boss! 🐱`,
        `🎯 Rank #{rank} is nice, but wouldn't #{better_rank} be better? Let's climb! 🚀`
      ],
      high_scorer: [
        `🔥 That {score} high score won't defend itself! Time for a new record! 📈`,
        `💪 You've got skills! Show everyone why you're one of the best players! ⭐`,
        `🎮 Ready to beat your personal best of {score}? The cats are waiting! 😺`
      ],
      regular_player: [
        `🐱 Your cats are getting hungry! Time for some Meowchi treats! 🍪`,
        `💰 Fresh daily rewards waiting! Your streak is counting on you! 🔥`,
        `😺 The cats miss you! Come feed them some sweet treats! 🍡`
      ],
      newcomer: [
        `🌟 Ready to discover your Meowchi potential? Every expert was once a beginner! 🎯`,
        `🎮 Perfect time to improve your skills! The leaderboard awaits! 🏆`,
        `🐾 Your cat friends are ready for another fun game session! 😸`
      ]
    };

    let sentCount = 0;
    let errorCount = 0;

    for (const user of users.rows) {
      try {
        let messageCategory = 'regular_player';
        let messageTemplate = '';

        // Determine user category and select appropriate message
        if (user.last_known_rank && user.last_known_rank <= 20) {
          messageCategory = 'ranked_player';
          const messages = contextualMessages.ranked_player;
          messageTemplate = messages[Math.floor(Math.random() * messages.length)];
          messageTemplate = messageTemplate
            .replace('{rank}', user.last_known_rank)
            .replace('{better_rank}', Math.max(1, user.last_known_rank - 3));
        } else if (user.best_score > 2000) {
          messageCategory = 'high_scorer';
          const messages = contextualMessages.high_scorer;
          messageTemplate = messages[Math.floor(Math.random() * messages.length)];
          messageTemplate = messageTemplate.replace('{score}', parseInt(user.best_score).toLocaleString());
        } else if (user.best_score > 100) {
          messageCategory = 'regular_player';
          const messages = contextualMessages.regular_player;
          messageTemplate = messages[Math.floor(Math.random() * messages.length)];
        } else {
          messageCategory = 'newcomer';
          const messages = contextualMessages.newcomer;
          messageTemplate = messages[Math.floor(Math.random() * messages.length)];
        }
        
        await bot.telegram.sendMessage(user.telegram_id, messageTemplate, {
          reply_markup: {
            inline_keyboard: [
              [{ text: '🎮 Play Meowchi', web_app: { url: config.WEBAPP_URL } }],
              [{ text: '🔕 Stop Reminders', callback_data: 'toggle_daily_off' }]
            ]
          }
        });

        sentCount++;
        
        // Rate limiting - don't spam Telegram
        await new Promise(resolve => setTimeout(resolve, 100));

      } catch (error) {
        errorCount++;
        if (error.response?.error_code === 403) {
          // User blocked the bot - disable notifications
          await pool.query(
            'UPDATE users SET daily_notifications = FALSE WHERE telegram_id = $1',
            [user.telegram_id]
          );
        }
      }
    }

    console.log(`✅ Daily reminders sent: ${sentCount} successful, ${errorCount} errors`);

  } catch (error) {
    console.error('Error sending daily reminders:', error);
  }
}

// Send achievement notification
async function notifyAchievement(telegramId, achievement, reward) {
  if (!config.ENABLE_NOTIFICATIONS) return;

  try {
    const message = `🏆 Achievement Unlocked!\n\n` +
      `"${achievement}"\n\n` +
      `💰 Reward: +${reward} coins!\n` +
      `Keep up the great work! 😺`;

    await bot.telegram.sendMessage(telegramId, message, {
      reply_markup: {
        inline_keyboard: [
          [{ text: '🎮 Keep Playing', web_app: { url: config.WEBAPP_URL } }],
          [{ text: '📤 Share Achievement', switch_inline_query: `🏆 Just unlocked "${achievement}" in Meowchi! 🐱` }]
        ]
      }
    });

    console.log(`🏆 Achievement notification sent to ${telegramId}: ${achievement}`);

  } catch (error) {
    console.log(`Could not send achievement notification to ${telegramId}:`, error.message);
  }
}

// Send rank change notification
async function notifyRankChange(telegramId, oldRank, newRank, score) {
  if (!config.ENABLE_NOTIFICATIONS || !oldRank || newRank >= oldRank) return;

  const improvement = oldRank - newRank;
  
  // Only notify for significant improvements
  if (improvement < 5 && newRank > 20) return;

  try {
    let message;
    if (newRank === 1) {
      message = `👑 You're now #1 on the leaderboard! Amazing! 🎉`;
    } else if (newRank <= 10) {
      message = `🚀 You climbed ${improvement} positions to rank #${newRank}! Top 10 baby! 🏆`;
    } else {
      message = `📈 Great progress! You moved up ${improvement} positions to rank #${newRank}!`;
    }

    await bot.telegram.sendMessage(telegramId, message, {
      reply_markup: {
        inline_keyboard: [
          [{ text: '🏆 View Leaderboard', web_app: { url: `${config.WEBAPP_URL}#leaderboard` } }],
          [{ text: '📤 Share Rank', switch_inline_query: `🏆 I'm rank #${newRank} in Meowchi! Can you beat me? 🐱` }]
        ]
      }
    });

    console.log(`📈 Rank notification sent to ${telegramId}: ${oldRank} -> ${newRank}`);

  } catch (error) {
    console.log(`Could not send rank notification to ${telegramId}:`, error.message);
  }
}

// === Scheduler for Smart Notifications ===

// Run daily reminders and leaderboard checks
function scheduleSmartNotifications() {
  const checkTime = () => {
    const now = new Date();
    const hour = now.getHours();
    const minute = now.getMinutes();
    
    // Send reminders at specified hour (default 6 PM)
    if (hour === config.DAILY_REMINDER_HOUR && minute === 0) {
      console.log(`⏰ Triggering daily reminders at ${hour}:${minute}`);
      sendDailyReminders();
    }

    // Check leaderboard changes every hour during active times (9 AM - 11 PM)
    if (hour >= 9 && hour <= 23 && minute === 30) {
      console.log(`🏆 Checking leaderboard changes at ${hour}:${minute}`);
      checkLeaderboardChanges();
    }
  };

  // Check every minute
  setInterval(checkTime, 60 * 1000);
  console.log(`⏰ Smart notification scheduler started (reminders at ${config.DAILY_REMINDER_HOUR}:00, leaderboard checks hourly)`);
}

// === Error Handlers ===

bot.catch((err, ctx) => {
  console.error(`Bot error for ${ctx.updateType}:`, err);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

// === Export Functions for API Integration ===

export {
  bot,
  notifyAchievement,
  notifyRankChange,
  sendDailyReminders,
  checkLeaderboardChanges
};

// === Start Bot ===

if (process.argv[1] === new URL(import.meta.url).pathname) {
  console.log('🤖 Starting Meowchi Telegram Bot...');
  
  if (!process.env.BOT_TOKEN) {
    console.error('❌ BOT_TOKEN environment variable is required');
    process.exit(1);
  }

  // Start the bot
  bot.launch({
    webhook: process.env.WEBHOOK_URL ? {
      domain: process.env.WEBHOOK_URL,
      port: process.env.WEBHOOK_PORT || 8443
    } : undefined
  }).then(() => {
    console.log('✅ Bot launched successfully');
    
    // Start smart notification scheduler
    if (config.ENABLE_NOTIFICATIONS) {
      scheduleSmartNotifications();
    }
    
  }).catch(error => {
    console.error('❌ Bot launch failed:', error);
    process.exit(1);
  });

  // Graceful shutdown
  process.once('SIGINT', () => {
    console.log('🛑 Shutting down bot...');
    bot.stop('SIGINT');
  });
  
  process.once('SIGTERM', () => {
    console.log('🛑 Shutting down bot...');
    bot.stop('SIGTERM');
  });
}
