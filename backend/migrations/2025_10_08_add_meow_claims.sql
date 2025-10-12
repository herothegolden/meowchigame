-- Path: backend/migrations/2025_10_08_add_meow_claims.sql
-- Purpose: Add Meow Counter CTA fields and tables to support per-user daily claim
--          and global "first 42" cap with idempotency.

BEGIN;

-- ─────────────────────────────────────────────────────────────────────────────
-- 1) Users table columns (idempotent)
--    - meow_taps:          daily tap counter (capped at 42 in app logic)
--    - meow_taps_date:     date of the counter (Asia/Tashkent boundary handled server-side)
--    - meow_claim_used_today: per-user flag that the CTA was used today (single use)
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE IF EXISTS public.users
  ADD COLUMN IF NOT EXISTS meow_taps INTEGER NOT NULL DEFAULT 0;

ALTER TABLE IF EXISTS public.users
  ADD COLUMN IF NOT EXISTS meow_taps_date DATE;

ALTER TABLE IF EXISTS public.users
  ADD COLUMN IF NOT EXISTS meow_claim_used_today BOOLEAN NOT NULL DEFAULT FALSE;


-- ─────────────────────────────────────────────────────────────────────────────
-- 2) Global daily claims counter (first-42 guard)
--    - One row per day; incremented atomically when a claim is reserved.
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.meow_daily_claims (
  day DATE PRIMARY KEY,
  claims_taken INTEGER NOT NULL DEFAULT 0
);


-- ─────────────────────────────────────────────────────────────────────────────
-- 3) Per-user claims table (idempotency + token lifecycle)
--    - Unique (user_id, day) ensures one claim per user per day.
--    - consumed flag allows one-time activation on Order page.
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.meow_claims (
  id UUID PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES public.users(telegram_id) ON DELETE CASCADE,
  day DATE NOT NULL,
  consumed BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- One claim per user per day
CREATE UNIQUE INDEX IF NOT EXISTS ux_meow_claims_user_day
  ON public.meow_claims (user_id, day);

-- Helpful lookup by day
CREATE INDEX IF NOT EXISTS idx_meow_claims_day
  ON public.meow_claims (day);


-- ─────────────────────────────────────────────────────────────────────────────
-- 4) Optional: seed today's meow_daily_claims row if not present (safe no-op if exists)
--    (Keeps migration idempotent; daily reset job will upsert for each new day.)
-- ─────────────────────────────────────────────────────────────────────────────
INSERT INTO public.meow_daily_claims (day, claims_taken)
SELECT CURRENT_DATE, 0
WHERE NOT EXISTS (
  SELECT 1 FROM public.meow_daily_claims WHERE day = CURRENT_DATE
);

COMMIT;
