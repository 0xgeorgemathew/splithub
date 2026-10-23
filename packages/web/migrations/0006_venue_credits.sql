-- Venues become closed loops: guests top up a venue's credits with USDC and spend them at its stalls
-- (VenueCredits contract). Stalls are priced in credits; there are no stall operators or USDC revenue splits.
-- Runs after 0005, which moved stores out of events/stalls, so every remaining event is a venue.
PRAGMA defer_foreign_keys = true;

CREATE TABLE venues (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  venue_name TEXT NOT NULL,
  venue_slug TEXT UNIQUE NOT NULL,
  venue_description TEXT,
  owner_wallet TEXT NOT NULL REFERENCES users(wallet_address) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'paused')),
  -- VenueCredits venue id; NULL until the owner registers the venue on-chain
  chain_venue_id INTEGER UNIQUE
);
CREATE INDEX idx_venues_owner_wallet ON venues(owner_wallet);
CREATE INDEX idx_venues_status ON venues(status);

CREATE TABLE venue_stalls (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  venue_id INTEGER NOT NULL REFERENCES venues(id) ON DELETE CASCADE,
  stall_name TEXT NOT NULL,
  stall_slug TEXT NOT NULL CHECK (stall_slug <> 'topup'),
  stall_description TEXT,
  -- Fixed price in credits; NULL lets the terminal enter any amount
  credit_price REAL CHECK (credit_price IS NULL OR credit_price > 0),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'paused')),
  UNIQUE (venue_id, stall_slug)
);
CREATE INDEX idx_venue_stalls_venue_id ON venue_stalls(venue_id);

-- Every top-up, spend and refund, recorded from the mined VenueCredits event (one per transaction)
CREATE TABLE venue_credit_activity (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  venue_id INTEGER NOT NULL REFERENCES venues(id) ON DELETE CASCADE,
  stall_id INTEGER REFERENCES venue_stalls(id) ON DELETE SET NULL,
  guest_wallet TEXT NOT NULL REFERENCES users(wallet_address) ON DELETE CASCADE,
  kind TEXT NOT NULL CHECK (kind IN ('topup', 'spend', 'refund')),
  credits REAL NOT NULL CHECK (credits >= 0),
  usdc_amount REAL,
  tx_hash TEXT NOT NULL UNIQUE
);
CREATE INDEX idx_venue_credit_activity_venue ON venue_credit_activity(venue_id, created_at DESC);
CREATE INDEX idx_venue_credit_activity_guest ON venue_credit_activity(guest_wallet);
CREATE INDEX idx_venue_credit_activity_stall ON venue_credit_activity(stall_id);

INSERT INTO venues (id, created_at, updated_at, venue_name, venue_slug, venue_description, owner_wallet, status)
SELECT id, created_at, updated_at, event_name, event_slug, event_description, owner_wallet,
       CASE WHEN status = 'active' THEN 'active' ELSE 'paused' END
FROM events;

INSERT INTO venue_stalls (id, created_at, updated_at, venue_id, stall_name, stall_slug, stall_description, status)
SELECT id, created_at, updated_at, event_id, stall_name,
       CASE WHEN stall_slug = 'topup' THEN 'topup-stall' ELSE stall_slug END,
       stall_description, status
FROM stalls
WHERE event_id IN (SELECT id FROM venues);

-- USDC stall payments belong to the old open-loop model and are not carried over.
DROP TABLE stall_payments;
DROP TABLE stalls;
DROP TABLE events;
