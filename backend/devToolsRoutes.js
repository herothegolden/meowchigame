// devToolsRoutes.js
import express from "express";
import { pool } from "./db.js"; // adjust path if your pool is exported differently

const router = express.Router();

// Developer-only: Cleanup demo accounts
router.post("/cleanup-demo-users", async (req, res) => {
  try {
    const client = await pool.connect();
    try {
      const result = await client.query(
        `UPDATE users
         SET username = NULL,
             points = 0,
             level = 1,
             daily_streak = 0,
             games_played = 0,
             high_score = 0,
             total_play_time = 0
         WHERE username = 'demoUser' OR username LIKE 'user_%'
         RETURNING telegram_id, username;`
      );

      res.status(200).json({
        message: `Cleanup complete. ${result.rowCount} accounts reset.`,
        cleaned: result.rows
      });
    } finally {
      client.release();
    }
  } catch (error) {
    console.error("🚨 Error in demo user cleanup:", error);
    res.status(500).json({ error: "Cleanup failed" });
  }
});

export default router;
