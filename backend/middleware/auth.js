// Path: backend/middleware/auth.js
// v4 — Fix type mismatch: ID must be Number to match DB BIGINT column
// CHANGES (v4):
// - Line 72: Changed `id: String(id)` → `id: Number(id)` to match telegram_id BIGINT type
// - Line 68: Added numeric validation to catch invalid IDs early
// - Root cause fix: PostgreSQL BIGINT columns don't match string parameters in WHERE clauses
// UNCHANGED: All other validation, extraction, and error handling logic

import { validate } from '../utils.js';

const { BOT_TOKEN } = process.env;

function extractInitData(req) {
  // Priority: explicit header, then Authorization, then body field
  const headerInit = req.headers['x-telegram-init-data'];
  if (headerInit && typeof headerInit === 'string' && headerInit.trim().length > 0) {
    return headerInit.trim();
  }

  const auth = req.headers['authorization'] || req.headers['Authorization'];
  if (auth && typeof auth === 'string') {
    const m = auth.match(/^Telegram\s+(.+)$/i);
    if (m && m[1]) return m[1].trim();
  }

  if (req.body && typeof req.body.initData === 'string') {
    return req.body.initData.trim();
  }

  return null;
}

export const validateUser = (req, res, next) => {
  try {
    if (!BOT_TOKEN) {
      return res.status(500).json({ error: 'Server misconfigured: BOT_TOKEN missing' });
    }

    const initData = extractInitData(req);
    if (!initData) {
      return res.status(400).json({ error: 'initData is required' });
    }

    // Signature verification (per Telegram Web Apps docs)
    const ok = validate(initData, BOT_TOKEN);
    if (!ok) {
      return res.status(401).json({ error: 'Invalid initData signature' });
    }

    // Parse fields from initData
    const params = new URLSearchParams(initData);
    const userJson = params.get('user');
    if (!userJson) {
      return res.status(400).json({ error: 'Missing user in initData' });
    }

    let parsed;
    try {
      parsed = JSON.parse(userJson);
    } catch (e) {
      return res.status(400).json({ error: 'Malformed user JSON in initData' });
    }

    const id = parsed?.id;
    if (!id) {
      return res.status(400).json({ error: 'Invalid user data in initData' });
    }

    // Validate ID is numeric (Telegram IDs are always integers)
    const numericId = Number(id);
    if (!Number.isInteger(numericId) || numericId <= 0) {
      return res.status(400).json({ error: 'Invalid Telegram ID format' });
    }

    // Normalize shape used by routes/DB
    // CRITICAL: ID must be Number to match telegram_id BIGINT in PostgreSQL
    req.user = {
      id: numericId,
      username: parsed.username || null,
      first_name: parsed.first_name || null,
      last_name: parsed.last_name || null,
    };

    return next();
  } catch (err) {
    console.error('🔒 validateUser error:', err);
    return res.status(500).json({ error: 'Auth middleware error' });
  }
};

export default validateUser;
