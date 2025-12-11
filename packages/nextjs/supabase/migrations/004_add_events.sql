-- ============================================================================
-- EVENTS TABLE
-- ============================================================================
-- Stores events created by event owners
CREATE TABLE IF NOT EXISTS events (
  id BIGSERIAL PRIMARY KEY,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Event identification
  event_name TEXT NOT NULL,
  event_slug TEXT UNIQUE NOT NULL, -- URL-friendly identifier
  event_description TEXT,

  -- Ownership
  owner_wallet TEXT NOT NULL REFERENCES users(wallet_address) ON DELETE CASCADE,

  -- Status
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'paused', 'ended')),

  -- Dates
  start_date TIMESTAMPTZ,
  end_date TIMESTAMPTZ,

  -- Constraints
  CONSTRAINT valid_dates CHECK (end_date IS NULL OR start_date IS NULL OR end_date > start_date)
);

-- Indexes for events
CREATE INDEX IF NOT EXISTS idx_events_owner_wallet ON events(owner_wallet);
CREATE INDEX IF NOT EXISTS idx_events_status ON events(status);
CREATE INDEX IF NOT EXISTS idx_events_slug ON events(event_slug);
CREATE INDEX IF NOT EXISTS idx_events_created_at ON events(created_at DESC);

COMMENT ON TABLE events IS 'Events with multiple stalls for tap-to-pay collections';
COMMENT ON COLUMN events.event_slug IS 'URL-friendly unique identifier for public pages';
COMMENT ON COLUMN events.status IS 'Status: active, paused, or ended';

-- ============================================================================
-- STALLS TABLE
-- ============================================================================
-- Stores stalls within events with operator and split configuration
CREATE TABLE IF NOT EXISTS stalls (
  id BIGSERIAL PRIMARY KEY,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Stall identification
  event_id BIGINT NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  stall_name TEXT NOT NULL,
  stall_slug TEXT NOT NULL, -- Unique within event
  stall_description TEXT,

  -- Operator (must be registered Twitter user)
  operator_twitter_handle TEXT NOT NULL,
  operator_wallet TEXT REFERENCES users(wallet_address) ON DELETE SET NULL,

  -- Split configuration
  split_percentage NUMERIC NOT NULL CHECK (split_percentage >= 0 AND split_percentage <= 100),

  -- Status
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'paused')),

  -- Token configuration
  token_address TEXT NOT NULL,

  -- Ensure unique stall slug per event
  UNIQUE(event_id, stall_slug)
);

-- Indexes for stalls
CREATE INDEX IF NOT EXISTS idx_stalls_event_id ON stalls(event_id);
CREATE INDEX IF NOT EXISTS idx_stalls_operator_wallet ON stalls(operator_wallet);
CREATE INDEX IF NOT EXISTS idx_stalls_operator_twitter ON stalls(operator_twitter_handle);
CREATE INDEX IF NOT EXISTS idx_stalls_status ON stalls(status);

COMMENT ON TABLE stalls IS 'Stalls within events with operator and revenue split configuration';
COMMENT ON COLUMN stalls.operator_twitter_handle IS 'Twitter handle of stall operator';
COMMENT ON COLUMN stalls.operator_wallet IS 'Wallet address if operator is registered';
COMMENT ON COLUMN stalls.split_percentage IS 'Percentage of payment going to operator (0-100)';

-- ============================================================================
-- STALL_PAYMENTS TABLE
-- ============================================================================
-- Tracks individual tap-to-pay transactions at stalls
CREATE TABLE IF NOT EXISTS stall_payments (
  id BIGSERIAL PRIMARY KEY,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Payment identification
  stall_id BIGINT NOT NULL REFERENCES stalls(id) ON DELETE CASCADE,
  event_id BIGINT NOT NULL REFERENCES events(id) ON DELETE CASCADE,

  -- Payment details
  payer_wallet TEXT NOT NULL REFERENCES users(wallet_address) ON DELETE CASCADE,
  amount NUMERIC NOT NULL,
  token_address TEXT NOT NULL,

  -- Splits (calculated from stall split_percentage)
  operator_amount NUMERIC NOT NULL,
  owner_amount NUMERIC NOT NULL,

  -- Blockchain
  tx_hash TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed')),
  completed_at TIMESTAMPTZ,

  -- Metadata
  memo TEXT
);

-- Indexes for stall_payments
CREATE INDEX IF NOT EXISTS idx_stall_payments_stall_id ON stall_payments(stall_id);
CREATE INDEX IF NOT EXISTS idx_stall_payments_event_id ON stall_payments(event_id);
CREATE INDEX IF NOT EXISTS idx_stall_payments_payer_wallet ON stall_payments(payer_wallet);
CREATE INDEX IF NOT EXISTS idx_stall_payments_status ON stall_payments(status);
CREATE INDEX IF NOT EXISTS idx_stall_payments_created_at ON stall_payments(created_at DESC);

COMMENT ON TABLE stall_payments IS 'Individual tap-to-pay transactions at event stalls';
COMMENT ON COLUMN stall_payments.operator_amount IS 'Amount going to stall operator (split_percentage)';
COMMENT ON COLUMN stall_payments.owner_amount IS 'Amount going to event owner (100 - split_percentage)';

-- ============================================================================
-- FUNCTIONS: Auto-update timestamps
-- ============================================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_events_updated_at BEFORE UPDATE ON events
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_stalls_updated_at BEFORE UPDATE ON stalls
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
