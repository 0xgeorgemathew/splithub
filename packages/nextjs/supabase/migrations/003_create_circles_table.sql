-- Migration: Create circles tables
-- Date: 2025-12-06
-- Description: Create circles and circle_members tables for auto-split feature
-- When users tap & pay, expenses auto-split with their Circle members

-- ============================================================================
-- CIRCLES TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS circles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  creator_wallet TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- CIRCLE_MEMBERS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS circle_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  circle_id UUID NOT NULL,
  member_wallet TEXT NOT NULL,
  added_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- FOREIGN KEY CONSTRAINTS
-- ============================================================================

DO $$
BEGIN
  -- Add foreign key for circles.creator_wallet
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'fk_circles_creator'
    AND table_name = 'circles'
  ) THEN
    ALTER TABLE circles
    ADD CONSTRAINT fk_circles_creator
    FOREIGN KEY (creator_wallet) REFERENCES users(wallet_address) ON DELETE CASCADE;
    RAISE NOTICE 'Added fk_circles_creator constraint';
  END IF;

  -- Add foreign key for circle_members.circle_id
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'fk_circle_members_circle'
    AND table_name = 'circle_members'
  ) THEN
    ALTER TABLE circle_members
    ADD CONSTRAINT fk_circle_members_circle
    FOREIGN KEY (circle_id) REFERENCES circles(id) ON DELETE CASCADE;
    RAISE NOTICE 'Added fk_circle_members_circle constraint';
  END IF;

  -- Add foreign key for circle_members.member_wallet
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'fk_circle_members_member'
    AND table_name = 'circle_members'
  ) THEN
    ALTER TABLE circle_members
    ADD CONSTRAINT fk_circle_members_member
    FOREIGN KEY (member_wallet) REFERENCES users(wallet_address) ON DELETE CASCADE;
    RAISE NOTICE 'Added fk_circle_members_member constraint';
  END IF;
END $$;

-- ============================================================================
-- UNIQUE CONSTRAINTS
-- ============================================================================

-- One member can only be in a circle once
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'unique_circle_member'
  ) THEN
    ALTER TABLE circle_members
    ADD CONSTRAINT unique_circle_member UNIQUE (circle_id, member_wallet);
    RAISE NOTICE 'Added unique_circle_member constraint';
  END IF;
END $$;

-- ============================================================================
-- INDEXES
-- ============================================================================

-- Index for finding circles by creator
CREATE INDEX IF NOT EXISTS idx_circles_creator ON circles(creator_wallet);

-- Index for finding active circles by creator
CREATE INDEX IF NOT EXISTS idx_circles_creator_active ON circles(creator_wallet) WHERE is_active = true;

-- Index for finding members of a circle
CREATE INDEX IF NOT EXISTS idx_circle_members_circle ON circle_members(circle_id);

-- Index for finding circles a user is a member of
CREATE INDEX IF NOT EXISTS idx_circle_members_member ON circle_members(member_wallet);

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE circles IS 'User-defined groups for auto-splitting expenses';
COMMENT ON COLUMN circles.id IS 'Unique identifier for the circle';
COMMENT ON COLUMN circles.name IS 'Display name for the circle (e.g., "Roommates")';
COMMENT ON COLUMN circles.creator_wallet IS 'Wallet address of the user who created the circle';
COMMENT ON COLUMN circles.is_active IS 'Whether this circle is active for auto-splitting';
COMMENT ON COLUMN circles.created_at IS 'When the circle was created';

COMMENT ON TABLE circle_members IS 'Members of each circle';
COMMENT ON COLUMN circle_members.id IS 'Unique identifier for the membership';
COMMENT ON COLUMN circle_members.circle_id IS 'Reference to the circle';
COMMENT ON COLUMN circle_members.member_wallet IS 'Wallet address of the member';
COMMENT ON COLUMN circle_members.added_at IS 'When the member was added to the circle';
