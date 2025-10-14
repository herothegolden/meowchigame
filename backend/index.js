// Path: backend/index.js
// v3 — adds on-boot schema check for meow_claim_used_today (minimal change)

import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { setupDatabase } from './config/database.js';
import { startGlobalStatsSimulation } from './routes/globalStats.js';
import { scheduleDailyReset } from './cron/dailyReset.js';
import devToolsRoutes from './devToolsRoutes.js';

// Route imports
import userRoutes from './routes/user.js';
import gameRoutes from './routes/game.js';
import shopRoutes from './routes/shop.js';
import leaderboardRoutes from './routes/leaderboard.js';
import friendsRoutes from './routes/friends.js';
import tasksRoutes from './routes/tasks.js';
// import badgesRoutes from './routes/badges.js'; // 🔸 Removed safely
import globalStatsRoutes from './routes/globalStats.js';
import ordersRoutes from './routes/orders.js';
import streakRoutes from './routes/streak.js';

// ⬇️ Minimal addition: import pool for one-time schema check
import { pool } from './config/database.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const { PORT = 3000 } = process.env;

// ---- ENV VALIDATION ----
if (!process.env.DATABASE_URL || !process.env.BOT_TOKEN) {
  console.error("⛔ Missing DATABASE_URL or BOT_TOKEN environment variables");
  process.exit(1);
}

// ---- EXPRESS APP ----
const app = express();
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));

// ---- STATIC FILES ----
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// ---- HEALTH CHECK ----
app.get('/health', (req, res) => {
  res.status(200).send('OK');
});

// ---- MOUNT ROUTES ----
app.use('/api/dev', devToolsRoutes);
app.use('/api', userRoutes);
app.use('/api', gameRoutes);
app.use('/api', shopRoutes);
app.use('/api', leaderboardRoutes);
app.use('/api', friendsRoutes);
app.use('/api', tasksRoutes);
// app.use('/api', badgesRoutes); // 🔸 Removed safely
app.use('/api', globalStatsRoutes);
app.use('/api', ordersRoutes);
app.use('/api/streak', streakRoutes);

// ---- START SERVER ----
const startServer = async () => {
  try {
    await setupDatabase();

    // ⬇️ Tiny on-boot schema check (idempotent)
    try {
      await pool.query(`
        ALTER TABLE users
          ADD COLUMN IF NOT EXISTS meow_claim_used_today BOOLEAN NOT NULL DEFAULT FALSE;
      `);
      console.log('✅ DB check: ensured users.meow_claim_used_today column exists');
    } catch (schemaErr) {
      console.error('⚠️ DB check failed (non-fatal):', schemaErr);
    }
    
    // Schedule daily streak reset cron job
    scheduleDailyReset();
    
    app.listen(PORT, async () => {
      console.log(`✅ Server running on port ${PORT}`);
      console.log(`🏥 Health check: http://localhost:${PORT}/health`);
      console.log(`🛠 Debug endpoint: http://localhost:${PORT}/api/global-stats/debug`);
      console.log(`🌍 Using Tashkent timezone (UTC+5) for active hours: 10AM-10PM`);
      
      await startGlobalStatsSimulation(PORT);
    });
  } catch (err) {
    console.error('💥 Failed to start application:', err);
    process.exit(1);
  }
};

startServer();
