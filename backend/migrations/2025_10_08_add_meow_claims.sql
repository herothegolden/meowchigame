-- Path: backend/migrations/2025_10_08_add_meow_claims.sql
-- v2 — Idempotent Meow schema for CTA flow, aligned with backend/routes/meow.js & routes/orders.js
-- - Ensures user daily fields exist with correct defaults
-- - Adds global daily quota table (first 42 per day)
-- - Adds per-user claims table with UNIQUE(user_id, day)
-- - Adds helpful indexes and seeds today's daily row safely

BEGIN;

-- ─────────────────────────────────────────────────────────────────────────────
-- 1) Users table columns (idempotent)
--    meow_taps:                daily tap counter (server caps at 42)
--    meow_taps_date:           DATE keyed by Asia/Tashkent day
--    meow_claim_used_today:    per-user daily CTA usage flag
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE IF EXISTS public.users
  ADD COLUMN IF NOT EXISTS meow_taps INTEGER NOT NULL DEFAULT 0;

ALTER TABLE IF EXISTS public.users
  ADD COLUMN IF NOT EXISTS meow_taps_date DATE;

ALTER TABLE IF EXISTS public.users
  ADD COLUMN IF NOT EXISTS meow_claim_used_today BOOLEAN NOT NULL DEFAULT FALSE;

-- Helpful composite index for common lookups
CREATE INDEX IF NOT EXISTS idx_users_meow_day
  ON public.users (meow_taps_date, telegram_id);

-- ─────────────────────────────────────────────────────────────────────────────
-- 2) Global daily claims counter (first‑42 guard per day)
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.meow_daily_claims (
  day DATE PRIMARY KEY,
  claims_taken INTEGER NOT NULL DEFAULT 0,
  CONSTRAINT meow_daily_claims_nonneg CHECK (claims_taken >= 0)
);

-- ─────────────────────────────────────────────────────────────────────────────
-- 3) Per‑user claims table (idempotency + token lifecycle)
--    UNIQUE (user_id, day) => one claim per user per day
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.meow_claims (
  id UUID PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES public.users(telegram_id) ON DELETE CASCADE,
  day DATE NOT NULL,
  consumed BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS ux_meow_claims_user_day
  ON public.meow_claims (user_id, day);

CREATE INDEX IF NOT EXISTS idx_meow_claims_day
  ON public.meow_claims (day);

-- Optional: ensure a row exists for today in meow_daily_claims (safe if already present)
INSERT INTO public.meow_daily_claims (day, claims_taken)
SELECT CURRENT_DATE, 0
WHERE NOT EXISTS (
  SELECT 1 FROM public.meow_daily_claims WHERE day = CURRENT_DATE
);

COMMIT;
