-- Migration: add per-user just-in-time tap limit

ALTER TABLE users
ADD COLUMN IF NOT EXISTS tap_limit_usd NUMERIC(12, 2) DEFAULT 50;

UPDATE users
SET tap_limit_usd = 50
WHERE tap_limit_usd IS NULL;

ALTER TABLE users
ALTER COLUMN tap_limit_usd SET DEFAULT 50;

COMMENT ON COLUMN users.tap_limit_usd IS 'Per-user max amount that can be just-in-time topped up for a tap payment';
