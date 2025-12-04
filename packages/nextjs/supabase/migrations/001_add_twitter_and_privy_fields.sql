-- Migration: Add Twitter and Privy fields to users table
-- Date: 2025-12-04
-- Description: Support Twitter login via Privy Embedded Wallets
-- This migration is SAFE and idempotent - can be run multiple times

-- ============================================================================
-- ADD PRIVY AND TWITTER COLUMNS TO USERS TABLE
-- ============================================================================

DO $$
BEGIN
  -- Add privy_user_id if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'privy_user_id'
  ) THEN
    ALTER TABLE users ADD COLUMN privy_user_id TEXT UNIQUE;
    RAISE NOTICE 'Added privy_user_id column';
  ELSE
    RAISE NOTICE 'privy_user_id column already exists';
  END IF;

  -- Add twitter_handle if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'twitter_handle'
  ) THEN
    ALTER TABLE users ADD COLUMN twitter_handle TEXT;
    RAISE NOTICE 'Added twitter_handle column';
  ELSE
    RAISE NOTICE 'twitter_handle column already exists';
  END IF;

  -- Add twitter_profile_url if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'twitter_profile_url'
  ) THEN
    ALTER TABLE users ADD COLUMN twitter_profile_url TEXT;
    RAISE NOTICE 'Added twitter_profile_url column';
  ELSE
    RAISE NOTICE 'twitter_profile_url column already exists';
  END IF;

  -- Add twitter_user_id if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'twitter_user_id'
  ) THEN
    ALTER TABLE users ADD COLUMN twitter_user_id TEXT;
    RAISE NOTICE 'Added twitter_user_id column';
  ELSE
    RAISE NOTICE 'twitter_user_id column already exists';
  END IF;
END $$;

-- ============================================================================
-- MAKE EMAIL NULLABLE
-- ============================================================================
-- Email is no longer required since users can login with Twitter

DO $$
BEGIN
  -- Check if email column is NOT NULL
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users'
    AND column_name = 'email'
    AND is_nullable = 'NO'
  ) THEN
    ALTER TABLE users ALTER COLUMN email DROP NOT NULL;
    RAISE NOTICE 'Made email column nullable';
  ELSE
    RAISE NOTICE 'Email column is already nullable';
  END IF;
END $$;

-- ============================================================================
-- ADD PERFORMANCE INDEXES
-- ============================================================================

-- Index for Privy user ID lookups
CREATE INDEX IF NOT EXISTS idx_users_privy_id ON users(privy_user_id);

-- Index for Twitter handle lookups (case-insensitive)
CREATE INDEX IF NOT EXISTS idx_users_twitter_handle ON users(twitter_handle);

-- Index for Twitter handle search (case-insensitive)
CREATE INDEX IF NOT EXISTS idx_users_twitter_handle_lower ON users(LOWER(twitter_handle));

-- ============================================================================
-- ADD CONSTRAINTS
-- ============================================================================

DO $$
BEGIN
  -- Add constraint: must have either email OR privy_user_id
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'check_auth_method'
    AND table_name = 'users'
  ) THEN
    ALTER TABLE users
    ADD CONSTRAINT check_auth_method CHECK (
      email IS NOT NULL OR privy_user_id IS NOT NULL
    );
    RAISE NOTICE 'Added check_auth_method constraint';
  ELSE
    RAISE NOTICE 'check_auth_method constraint already exists';
  END IF;
END $$;

-- ============================================================================
-- COMMENTS
-- ============================================================================
COMMENT ON COLUMN users.privy_user_id IS 'Privy user ID from Privy Embedded Wallet authentication';
COMMENT ON COLUMN users.twitter_handle IS 'Twitter username without @ symbol';
COMMENT ON COLUMN users.twitter_profile_url IS 'URL to Twitter profile picture';
COMMENT ON COLUMN users.twitter_user_id IS 'Twitter user ID from OAuth';
COMMENT ON CONSTRAINT check_auth_method ON users IS 'Ensures user has either email or privy_user_id for authentication';
