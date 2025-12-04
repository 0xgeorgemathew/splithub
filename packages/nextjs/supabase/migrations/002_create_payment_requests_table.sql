-- Migration: Create payment_requests table
-- Date: 2025-12-04
-- Description: Create payment requests table for Twitter-to-Twitter payment links
-- Enables users to send payment request links that can be shared via Twitter DM, QR codes, etc.

-- ============================================================================
-- PAYMENT_REQUESTS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS payment_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Core payment fields
  payer TEXT NOT NULL,
  recipient TEXT NOT NULL,
  token TEXT NOT NULL,
  amount TEXT NOT NULL,
  memo TEXT,

  -- Status tracking
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'expired')),
  tx_hash TEXT,

  -- Timestamps
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ,

  -- Twitter identifiers for display
  requester_twitter TEXT,
  payer_twitter TEXT,

  -- Constraints
  CHECK (payer != recipient),
  CHECK (expires_at > created_at)
);

-- ============================================================================
-- FOREIGN KEY CONSTRAINTS
-- ============================================================================
-- Link payer and recipient to users table for data integrity

DO $$
BEGIN
  -- Add foreign key for payer if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'fk_payment_requests_payer'
    AND table_name = 'payment_requests'
  ) THEN
    ALTER TABLE payment_requests
    ADD CONSTRAINT fk_payment_requests_payer
    FOREIGN KEY (payer) REFERENCES users(wallet_address) ON DELETE CASCADE;
    RAISE NOTICE 'Added fk_payment_requests_payer constraint';
  END IF;

  -- Add foreign key for recipient if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'fk_payment_requests_recipient'
    AND table_name = 'payment_requests'
  ) THEN
    ALTER TABLE payment_requests
    ADD CONSTRAINT fk_payment_requests_recipient
    FOREIGN KEY (recipient) REFERENCES users(wallet_address) ON DELETE CASCADE;
    RAISE NOTICE 'Added fk_payment_requests_recipient constraint';
  END IF;
END $$;

-- ============================================================================
-- INDEXES FOR PERFORMANCE
-- ============================================================================

-- Index for finding requests by payer wallet
CREATE INDEX IF NOT EXISTS idx_payment_requests_payer ON payment_requests(payer);

-- Index for finding requests by recipient wallet
CREATE INDEX IF NOT EXISTS idx_payment_requests_recipient ON payment_requests(recipient);

-- Index for filtering by status
CREATE INDEX IF NOT EXISTS idx_payment_requests_status ON payment_requests(status);

-- Index for finding requests by Twitter handle
CREATE INDEX IF NOT EXISTS idx_payment_requests_payer_twitter ON payment_requests(payer_twitter);
CREATE INDEX IF NOT EXISTS idx_payment_requests_requester_twitter ON payment_requests(requester_twitter);

-- Index for expiration cleanup queries
CREATE INDEX IF NOT EXISTS idx_payment_requests_expires_at ON payment_requests(expires_at);

-- Composite index for finding pending requests by payer
CREATE INDEX IF NOT EXISTS idx_payment_requests_payer_status ON payment_requests(payer, status);

-- Composite index for finding pending requests by recipient
CREATE INDEX IF NOT EXISTS idx_payment_requests_recipient_status ON payment_requests(recipient, status);

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE payment_requests IS 'Payment requests that can be shared as links for easy Twitter-to-Twitter payments';
COMMENT ON COLUMN payment_requests.id IS 'Unique UUID used in shareable payment link URL';
COMMENT ON COLUMN payment_requests.payer IS 'Wallet address of user who should pay';
COMMENT ON COLUMN payment_requests.recipient IS 'Wallet address of user requesting payment';
COMMENT ON COLUMN payment_requests.token IS 'Token contract address (e.g., USDC)';
COMMENT ON COLUMN payment_requests.amount IS 'Amount to pay (stored as string to preserve precision)';
COMMENT ON COLUMN payment_requests.memo IS 'Optional description of what payment is for';
COMMENT ON COLUMN payment_requests.status IS 'pending = awaiting payment, completed = paid, expired = past expiration time';
COMMENT ON COLUMN payment_requests.tx_hash IS 'Transaction hash once payment is completed';
COMMENT ON COLUMN payment_requests.expires_at IS 'Timestamp when this request expires (typically 24 hours)';
COMMENT ON COLUMN payment_requests.requester_twitter IS 'Twitter handle of the recipient (for display purposes)';
COMMENT ON COLUMN payment_requests.payer_twitter IS 'Twitter handle of the payer (for display purposes)';

-- ============================================================================
-- EXAMPLE USAGE
-- ============================================================================

/*
-- Create a payment request
INSERT INTO payment_requests (
  payer,
  recipient,
  token,
  amount,
  memo,
  expires_at,
  requester_twitter,
  payer_twitter
) VALUES (
  '0x1234...', -- payer wallet
  '0x5678...', -- recipient wallet
  '0x0a215D8ba66387DCA84B284D18c3B4ec3de6E54a', -- USDC Base Sepolia
  '25.00',
  'Dinner last night',
  NOW() + INTERVAL '24 hours',
  'alice',
  'bob'
) RETURNING id;

-- Get payment request by ID
SELECT
  pr.*,
  recipient_user.name AS recipient_name,
  recipient_user.twitter_handle AS recipient_twitter_handle,
  recipient_user.twitter_profile_url AS recipient_twitter_profile_url,
  payer_user.name AS payer_name,
  payer_user.twitter_handle AS payer_twitter_handle,
  payer_user.twitter_profile_url AS payer_twitter_profile_url
FROM payment_requests pr
LEFT JOIN users recipient_user ON pr.recipient = recipient_user.wallet_address
LEFT JOIN users payer_user ON pr.payer = payer_user.wallet_address
WHERE pr.id = 'uuid-here';

-- Mark request as completed
UPDATE payment_requests
SET
  status = 'completed',
  tx_hash = '0xabc...',
  completed_at = NOW()
WHERE id = 'uuid-here';

-- Find expired requests and mark them
UPDATE payment_requests
SET status = 'expired'
WHERE status = 'pending'
AND expires_at < NOW();
*/
