-- Migration: Initial Database Schema
-- Date: 2025-12-04
-- Description: Create all initial tables for SplitHub
-- This migration represents the base schema before Twitter/Privy integration
-- Based on actual Supabase database schema

-- ============================================================================
-- USERS TABLE
-- ============================================================================
-- Stores user profiles with wallet addresses and optional email
CREATE TABLE IF NOT EXISTS users (
  wallet_address TEXT PRIMARY KEY,
  chip_address TEXT UNIQUE,
  name TEXT NOT NULL,
  email TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for users table
CREATE INDEX IF NOT EXISTS idx_users_chip_address ON users(chip_address);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

COMMENT ON TABLE users IS 'User profiles linked to wallet addresses and NFC chips';
COMMENT ON COLUMN users.wallet_address IS 'Primary wallet address (Privy embedded wallet or external)';
COMMENT ON COLUMN users.chip_address IS 'NFC chip address registered to this user';
COMMENT ON COLUMN users.name IS 'Display name of the user';
COMMENT ON COLUMN users.email IS 'Email address (optional, nullable after Twitter integration)';

-- ============================================================================
-- EXPENSE TABLE
-- ============================================================================
-- Stores expense records created by users
CREATE TABLE IF NOT EXISTS expense (
  id BIGSERIAL PRIMARY KEY,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  creator_wallet TEXT NOT NULL REFERENCES users(wallet_address) ON DELETE CASCADE,
  description TEXT,
  total_amount NUMERIC NOT NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'settled', 'cancelled')),
  token_address TEXT NOT NULL
);

-- Indexes for expense table
CREATE INDEX IF NOT EXISTS idx_expense_creator_wallet ON expense(creator_wallet);
CREATE INDEX IF NOT EXISTS idx_expense_status ON expense(status);
CREATE INDEX IF NOT EXISTS idx_expense_created_at ON expense(created_at DESC);

COMMENT ON TABLE expense IS 'Expense records with total amount to be split among participants';
COMMENT ON COLUMN expense.creator_wallet IS 'Wallet address of user who created the expense';
COMMENT ON COLUMN expense.description IS 'Description of what the expense is for (e.g., "Team dinner")';
COMMENT ON COLUMN expense.total_amount IS 'Total amount of the expense to be split';
COMMENT ON COLUMN expense.status IS 'Status: active, settled, or cancelled';
COMMENT ON COLUMN expense.token_address IS 'ERC20 token contract address (e.g., USDC)';

-- ============================================================================
-- EXPENSE_PARTICIPANTS TABLE
-- ============================================================================
-- Stores participants in each expense and their share amounts
CREATE TABLE IF NOT EXISTS expense_participants (
  id BIGSERIAL PRIMARY KEY,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expense_id BIGINT NOT NULL REFERENCES expense(id) ON DELETE CASCADE,
  wallet_address TEXT NOT NULL REFERENCES users(wallet_address) ON DELETE CASCADE,
  share_amount NUMERIC NOT NULL,
  is_creator BOOLEAN NOT NULL DEFAULT FALSE,

  -- Ensure unique participant per expense
  UNIQUE(expense_id, wallet_address)
);

-- Indexes for expense_participants
CREATE INDEX IF NOT EXISTS idx_expense_participants_expense_id ON expense_participants(expense_id);
CREATE INDEX IF NOT EXISTS idx_expense_participants_wallet ON expense_participants(wallet_address);
CREATE INDEX IF NOT EXISTS idx_expense_participants_is_creator ON expense_participants(is_creator);

COMMENT ON TABLE expense_participants IS 'Junction table linking users to expenses with their share amounts';
COMMENT ON COLUMN expense_participants.expense_id IS 'Reference to the expense';
COMMENT ON COLUMN expense_participants.wallet_address IS 'Wallet address of the participant';
COMMENT ON COLUMN expense_participants.share_amount IS 'Amount this participant owes/is owed';
COMMENT ON COLUMN expense_participants.is_creator IS 'True if this participant is the expense creator';

-- ============================================================================
-- SETTLEMENTS TABLE
-- ============================================================================
-- Tracks payments between users for expense settlement
CREATE TABLE IF NOT EXISTS settlements (
  id BIGSERIAL PRIMARY KEY,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  payer_wallet TEXT NOT NULL REFERENCES users(wallet_address) ON DELETE CASCADE,
  payee_wallet TEXT NOT NULL REFERENCES users(wallet_address) ON DELETE CASCADE,
  amount NUMERIC NOT NULL,
  token_address TEXT NOT NULL,
  tx_hash TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed')),
  completed_at TIMESTAMPTZ,

  -- Ensure payer and payee are different
  CHECK (payer_wallet != payee_wallet)
);

-- Indexes for settlements
CREATE INDEX IF NOT EXISTS idx_settlements_payer_wallet ON settlements(payer_wallet);
CREATE INDEX IF NOT EXISTS idx_settlements_payee_wallet ON settlements(payee_wallet);
CREATE INDEX IF NOT EXISTS idx_settlements_status ON settlements(status);
CREATE INDEX IF NOT EXISTS idx_settlements_tx_hash ON settlements(tx_hash);
CREATE INDEX IF NOT EXISTS idx_settlements_created_at ON settlements(created_at DESC);

COMMENT ON TABLE settlements IS 'On-chain payment settlements between users';
COMMENT ON COLUMN settlements.payer_wallet IS 'Wallet address of user making payment';
COMMENT ON COLUMN settlements.payee_wallet IS 'Wallet address of user receiving payment';
COMMENT ON COLUMN settlements.amount IS 'Amount paid';
COMMENT ON COLUMN settlements.token_address IS 'ERC20 token contract address used for payment';
COMMENT ON COLUMN settlements.tx_hash IS 'Blockchain transaction hash';
COMMENT ON COLUMN settlements.status IS 'Status: pending, completed, or failed';
COMMENT ON COLUMN settlements.completed_at IS 'Timestamp when payment was completed on-chain';

-- ============================================================================
-- TABLE RELATIONSHIPS SUMMARY
-- ============================================================================
-- 1. users → expense (one-to-many via creator_wallet)
-- 2. expense → expense_participants (one-to-many)
-- 3. users → expense_participants (one-to-many)
-- 4. users → settlements (one-to-many for both payer and payee)
