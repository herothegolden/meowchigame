// Path: backend/index.js
// v4 — Add /healthz DB-ping healthcheck for Railway; keep existing behavior intact
// CHANGES (v4):
// - Import { pool } from './config/database.js'
// - Add GET /healthz that pings the DB (SELECT 1) and returns JSON
// - Keep existing /health endpoint for backward compatibility

import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { setupDatabase, pool } from './config/database.js';
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
import globalStatsRoutes from './routes/globalStats.js';
import ordersRoutes from './routes/orders.js';
import streakRoutes from './routes/streak.js';
import meowRoutes from './routes/meow.js'; // Meow counter & CTA

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const { PORT = 3000 } = process.env;

// ---- ENV VALIDATION ----
if (!process.env.DATABASE_URL || !process.env.BOT_TOKEN) {
  console.error('⛔ Missing DATABASE_URL or BOT_TOKEN environment variables');
  process.exit(1);
}

// ---- EXPRESS APP ----
const app = express();
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));

// ---- STATIC FILES ----
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// ---- HEALTH CHECKS ----
// Plain text health (legacy)
app.get('/health', (req, res) => {
  res.status(200).send('OK');
});

// JSON health with DB ping (for Railway/Nixpacks health checks)
app.get('/healthz', async (req, res) => {
  try {
    const client = await pool.connect();
    try {
      await client.query('SELECT 1');
    } finally {
      client.release();
    }
    res.status(200).json({ ok: true });
  } catch (err) {
    res.status(500).json({ ok: false, error: 'DB_UNAVAILABLE' });
  }
});

// ---- MOUNT ROUTES ----
app.use('/api/dev', devToolsRoutes);
app.use('/api', userRoutes);
app.use('/api', gameRoutes);
app.use('/api', shopRoutes);
app.use('/api', leaderboardRoutes);
app.use('/api', friendsRoutes);
app.use('/api', tasksRoutes);
app.use('/api', globalStatsRoutes);
app.use('/api', ordersRoutes);
app.use('/api/streak', streakRoutes);
app.use('/api', meowRoutes); // /meow-tap, /meow-cta-status, /meow-claim

// ---- START SERVER ----
const startServer = async () => {
  try {
    await setupDatabase();

    // Schedule daily streak reset cron job
    scheduleDailyReset();

    app.listen(PORT, async () => {
      console.log(`✅ Server running on port ${PORT}`);
      console.log(`🥐 Health check: http://localhost:${PORT}/health`);
      console.log(`🩺 Healthz (DB): http://localhost:${PORT}/healthz`);
      console.log(`🛠 Debug endpoint: http://localhost:${PORT}/api/global-stats/debug`);
      console.log('🌐 Using Tashkent timezone (UTC+5) for active hours: 10AM-10PM');

      await startGlobalStatsSimulation(PORT);
    });
  } catch (err) {
    console.error('💥 Failed to start application:', err);
    process.exit(1);
  }
};

startServer();
