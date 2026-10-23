-- SplitHub D1 schema (SQLite). Ported from the Supabase Postgres schema in
-- supabase/migrations plus live-schema drift (users.chip_registration_status,
-- users.approval_status, manager_agents.erc8004_registration_*).
--
-- Type mapping: TIMESTAMPTZ -> TEXT (ISO-8601, UTC, ms precision), NUMERIC -> REAL,
-- BOOLEAN -> INTEGER (0/1), JSONB / TEXT[] -> TEXT (JSON), UUID -> TEXT,
-- BIGSERIAL -> INTEGER PRIMARY KEY AUTOINCREMENT.
-- lib/db/schema.ts mirrors this file and drives value conversion; keep them in sync.

-- Social payments ------------------------------------------------------------

CREATE TABLE users (
  wallet_address TEXT PRIMARY KEY,
  chip_address TEXT UNIQUE,
  name TEXT NOT NULL,
  email TEXT,
  privy_user_id TEXT UNIQUE,
  twitter_handle TEXT,
  twitter_profile_url TEXT,
  twitter_user_id TEXT,
  chip_registration_status TEXT,
  approval_status TEXT,
  tap_limit_usd REAL DEFAULT 50,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  CONSTRAINT check_auth_method CHECK (email IS NOT NULL OR privy_user_id IS NOT NULL)
);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_twitter_handle ON users(twitter_handle);
CREATE INDEX idx_users_twitter_handle_lower ON users(lower(twitter_handle));

CREATE TABLE expense (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  creator_wallet TEXT NOT NULL REFERENCES users(wallet_address) ON DELETE CASCADE,
  description TEXT,
  total_amount REAL NOT NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'settled', 'cancelled')),
  token_address TEXT NOT NULL
);
CREATE INDEX idx_expense_creator_wallet ON expense(creator_wallet);
CREATE INDEX idx_expense_status ON expense(status);
CREATE INDEX idx_expense_created_at ON expense(created_at DESC);

CREATE TABLE expense_participants (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  expense_id INTEGER NOT NULL REFERENCES expense(id) ON DELETE CASCADE,
  wallet_address TEXT NOT NULL REFERENCES users(wallet_address) ON DELETE CASCADE,
  share_amount REAL NOT NULL,
  is_creator INTEGER NOT NULL DEFAULT 0,
  UNIQUE (expense_id, wallet_address)
);
CREATE INDEX idx_expense_participants_expense_id ON expense_participants(expense_id);
CREATE INDEX idx_expense_participants_wallet ON expense_participants(wallet_address);

CREATE TABLE settlements (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  payer_wallet TEXT NOT NULL REFERENCES users(wallet_address) ON DELETE CASCADE,
  payee_wallet TEXT NOT NULL REFERENCES users(wallet_address) ON DELETE CASCADE,
  amount REAL NOT NULL,
  token_address TEXT NOT NULL,
  tx_hash TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed')),
  completed_at TEXT,
  CHECK (payer_wallet != payee_wallet)
);
CREATE INDEX idx_settlements_payer_wallet ON settlements(payer_wallet);
CREATE INDEX idx_settlements_payee_wallet ON settlements(payee_wallet);
CREATE INDEX idx_settlements_status ON settlements(status);
CREATE INDEX idx_settlements_tx_hash ON settlements(tx_hash);
CREATE INDEX idx_settlements_created_at ON settlements(created_at DESC);

CREATE TABLE payment_requests (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(4)) || '-' || hex(randomblob(2)) || '-4' || substr(hex(randomblob(2)), 2) || '-' || substr('89ab', 1 + (abs(random()) % 4), 1) || substr(hex(randomblob(2)), 2) || '-' || hex(randomblob(6)))),
  payer TEXT NOT NULL REFERENCES users(wallet_address) ON DELETE CASCADE,
  recipient TEXT NOT NULL REFERENCES users(wallet_address) ON DELETE CASCADE,
  token TEXT NOT NULL,
  amount TEXT NOT NULL,
  memo TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'expired')),
  tx_hash TEXT,
  expires_at TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  completed_at TEXT,
  requester_twitter TEXT,
  payer_twitter TEXT,
  CHECK (payer != recipient),
  CHECK (expires_at > created_at)
);
CREATE INDEX idx_payment_requests_payer_status ON payment_requests(payer, status);
CREATE INDEX idx_payment_requests_recipient_status ON payment_requests(recipient, status);
CREATE INDEX idx_payment_requests_status ON payment_requests(status);
CREATE INDEX idx_payment_requests_expires_at ON payment_requests(expires_at);

CREATE TABLE circles (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(4)) || '-' || hex(randomblob(2)) || '-4' || substr(hex(randomblob(2)), 2) || '-' || substr('89ab', 1 + (abs(random()) % 4), 1) || substr(hex(randomblob(2)), 2) || '-' || hex(randomblob(6)))),
  name TEXT NOT NULL,
  creator_wallet TEXT NOT NULL REFERENCES users(wallet_address) ON DELETE CASCADE,
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);
CREATE INDEX idx_circles_creator ON circles(creator_wallet);
CREATE INDEX idx_circles_creator_active ON circles(creator_wallet) WHERE is_active = 1;

CREATE TABLE circle_members (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(4)) || '-' || hex(randomblob(2)) || '-4' || substr(hex(randomblob(2)), 2) || '-' || substr('89ab', 1 + (abs(random()) % 4), 1) || substr(hex(randomblob(2)), 2) || '-' || hex(randomblob(6)))),
  circle_id TEXT NOT NULL REFERENCES circles(id) ON DELETE CASCADE,
  member_wallet TEXT NOT NULL REFERENCES users(wallet_address) ON DELETE CASCADE,
  added_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  CONSTRAINT unique_circle_member UNIQUE (circle_id, member_wallet)
);
CREATE INDEX idx_circle_members_circle ON circle_members(circle_id);
CREATE INDEX idx_circle_members_member ON circle_members(member_wallet);

-- Events and stores ----------------------------------------------------------

CREATE TABLE events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  event_name TEXT NOT NULL,
  event_slug TEXT UNIQUE NOT NULL,
  event_description TEXT,
  owner_wallet TEXT NOT NULL REFERENCES users(wallet_address) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'paused', 'ended')),
  start_date TEXT,
  end_date TEXT,
  CONSTRAINT valid_dates CHECK (end_date IS NULL OR start_date IS NULL OR end_date > start_date)
);
CREATE INDEX idx_events_owner_wallet ON events(owner_wallet);
CREATE INDEX idx_events_status ON events(status);
CREATE INDEX idx_events_created_at ON events(created_at DESC);

CREATE TABLE stalls (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  event_id INTEGER NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  stall_name TEXT NOT NULL,
  stall_slug TEXT NOT NULL,
  stall_description TEXT,
  operator_twitter_handle TEXT NOT NULL,
  operator_wallet TEXT REFERENCES users(wallet_address) ON DELETE SET NULL,
  split_percentage REAL NOT NULL CHECK (split_percentage >= 0 AND split_percentage <= 100),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'paused')),
  token_address TEXT NOT NULL,
  UNIQUE (event_id, stall_slug)
);
CREATE INDEX idx_stalls_event_id ON stalls(event_id);
CREATE INDEX idx_stalls_operator_wallet ON stalls(operator_wallet);
CREATE INDEX idx_stalls_operator_twitter ON stalls(operator_twitter_handle);
CREATE INDEX idx_stalls_status ON stalls(status);

CREATE TABLE stall_payments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  stall_id INTEGER NOT NULL REFERENCES stalls(id) ON DELETE CASCADE,
  event_id INTEGER NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  payer_wallet TEXT NOT NULL REFERENCES users(wallet_address) ON DELETE CASCADE,
  amount REAL NOT NULL,
  token_address TEXT NOT NULL,
  operator_amount REAL NOT NULL,
  owner_amount REAL NOT NULL,
  tx_hash TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed')),
  completed_at TEXT,
  memo TEXT
);
CREATE INDEX idx_stall_payments_stall_id ON stall_payments(stall_id);
CREATE INDEX idx_stall_payments_event_id ON stall_payments(event_id);
CREATE INDEX idx_stall_payments_payer_wallet ON stall_payments(payer_wallet);
CREATE INDEX idx_stall_payments_status ON stall_payments(status);
CREATE INDEX idx_stall_payments_created_at ON stall_payments(created_at DESC);

CREATE TABLE store_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  stall_id INTEGER NOT NULL REFERENCES stalls(id) ON DELETE CASCADE,
  sku TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  price REAL NOT NULL CHECK (price >= 0),
  token_address TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'paused', 'out_of_stock', 'archived')),
  image_url TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  UNIQUE (stall_id, sku)
);
CREATE INDEX idx_store_items_stall_id ON store_items(stall_id);
CREATE INDEX idx_store_items_status ON store_items(status);

CREATE TABLE store_inventory (
  item_id INTEGER PRIMARY KEY REFERENCES store_items(id) ON DELETE CASCADE,
  current_stock INTEGER NOT NULL DEFAULT 0 CHECK (current_stock >= 0),
  reorder_threshold INTEGER NOT NULL DEFAULT 3 CHECK (reorder_threshold >= 0),
  target_stock INTEGER NOT NULL DEFAULT 10 CHECK (target_stock >= 0),
  last_restocked_at TEXT,
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE TABLE store_orders (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  stall_id INTEGER NOT NULL REFERENCES stalls(id) ON DELETE CASCADE,
  buyer_wallet TEXT NOT NULL REFERENCES users(wallet_address) ON DELETE CASCADE,
  subtotal REAL NOT NULL CHECK (subtotal >= 0),
  manager_amount REAL NOT NULL CHECK (manager_amount >= 0),
  admin_amount REAL NOT NULL CHECK (admin_amount >= 0),
  token_address TEXT NOT NULL,
  tx_hash TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed')),
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  completed_at TEXT
);
CREATE INDEX idx_store_orders_stall_id ON store_orders(stall_id);
CREATE INDEX idx_store_orders_buyer_wallet ON store_orders(buyer_wallet);
CREATE INDEX idx_store_orders_status ON store_orders(status);

CREATE TABLE store_order_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  order_id INTEGER NOT NULL REFERENCES store_orders(id) ON DELETE CASCADE,
  item_id INTEGER NOT NULL REFERENCES store_items(id) ON DELETE CASCADE,
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  unit_price REAL NOT NULL CHECK (unit_price >= 0),
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);
CREATE INDEX idx_store_order_items_order_id ON store_order_items(order_id);
CREATE INDEX idx_store_order_items_item_id ON store_order_items(item_id);

-- Store agents ---------------------------------------------------------------

CREATE TABLE manager_agents (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(4)) || '-' || hex(randomblob(2)) || '-4' || substr(hex(randomblob(2)), 2) || '-' || substr('89ab', 1 + (abs(random()) % 4), 1) || substr(hex(randomblob(2)), 2) || '-' || hex(randomblob(6)))),
  stall_id INTEGER NOT NULL UNIQUE REFERENCES stalls(id) ON DELETE CASCADE,
  agent_name TEXT NOT NULL,
  operator_wallet TEXT NOT NULL REFERENCES users(wallet_address) ON DELETE CASCADE,
  erc8004_agent_id TEXT,
  erc8004_registration_tx TEXT,
  erc8004_registration_chain_id INTEGER,
  erc8004_registration_chain_name TEXT,
  agent_address TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'paused', 'error')),
  budget_daily_calls INTEGER NOT NULL DEFAULT 24 CHECK (budget_daily_calls > 0),
  budget_daily_tokens INTEGER NOT NULL DEFAULT 15000 CHECK (budget_daily_tokens > 0),
  max_restock_value REAL NOT NULL DEFAULT 250 CHECK (max_restock_value >= 0),
  max_price_change_pct REAL NOT NULL DEFAULT 10 CHECK (max_price_change_pct >= 0),
  min_confidence REAL NOT NULL DEFAULT 0.72 CHECK (min_confidence >= 0 AND min_confidence <= 1),
  allowed_supplier_urls TEXT DEFAULT '[]',
  allowed_skus TEXT DEFAULT '[]',
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);
CREATE INDEX idx_manager_agents_operator_wallet ON manager_agents(operator_wallet);
CREATE INDEX idx_manager_agents_status ON manager_agents(status);

CREATE TABLE agent_runs (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(4)) || '-' || hex(randomblob(2)) || '-4' || substr(hex(randomblob(2)), 2) || '-' || substr('89ab', 1 + (abs(random()) % 4), 1) || substr(hex(randomblob(2)), 2) || '-' || hex(randomblob(6)))),
  agent_id TEXT NOT NULL REFERENCES manager_agents(id) ON DELETE CASCADE,
  run_type TEXT NOT NULL,
  trigger_source TEXT NOT NULL,
  state TEXT NOT NULL CHECK (state IN ('discovering', 'planning', 'executing', 'verifying', 'submitted', 'failed')),
  decision_summary TEXT,
  tool_calls_json TEXT NOT NULL DEFAULT '[]',
  retries INTEGER NOT NULL DEFAULT 0,
  failures_json TEXT NOT NULL DEFAULT '[]',
  output_json TEXT NOT NULL DEFAULT '{}',
  compute_cost_estimate REAL NOT NULL DEFAULT 0,
  started_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  completed_at TEXT
);
CREATE INDEX idx_agent_runs_agent_id ON agent_runs(agent_id);
CREATE INDEX idx_agent_runs_started_at ON agent_runs(started_at DESC);
CREATE INDEX idx_agent_runs_state ON agent_runs(state);

CREATE TABLE erc8004_agents (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(4)) || '-' || hex(randomblob(2)) || '-4' || substr(hex(randomblob(2)), 2) || '-' || substr('89ab', 1 + (abs(random()) % 4), 1) || substr(hex(randomblob(2)), 2) || '-' || hex(randomblob(6)))),
  linked_manager_agent_id TEXT REFERENCES manager_agents(id) ON DELETE SET NULL,
  role TEXT NOT NULL CHECK (role IN ('manager', 'validator', 'reviewer')),
  name TEXT NOT NULL,
  description TEXT,
  owner_wallet TEXT NOT NULL REFERENCES users(wallet_address) ON DELETE CASCADE,
  operator_wallet TEXT NOT NULL REFERENCES users(wallet_address) ON DELETE CASCADE,
  operating_chain_id INTEGER NOT NULL DEFAULT 84532,
  trust_chain_id INTEGER NOT NULL DEFAULT 11155111,
  registry_agent_id TEXT,
  agent_wallet TEXT,
  agent_uri TEXT,
  identity_tx_hash TEXT,
  identity_registry_address TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'registered', 'link_pending', 'failed')),
  metadata_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);
CREATE UNIQUE INDEX idx_erc8004_agents_linked_manager ON erc8004_agents(linked_manager_agent_id) WHERE linked_manager_agent_id IS NOT NULL;
CREATE INDEX idx_erc8004_agents_role ON erc8004_agents(role);
CREATE INDEX idx_erc8004_agents_operator_wallet ON erc8004_agents(operator_wallet);
CREATE INDEX idx_erc8004_agents_status ON erc8004_agents(status);

CREATE TABLE agent_validations (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(4)) || '-' || hex(randomblob(2)) || '-4' || substr(hex(randomblob(2)), 2) || '-' || substr('89ab', 1 + (abs(random()) % 4), 1) || substr(hex(randomblob(2)), 2) || '-' || hex(randomblob(6)))),
  agent_run_id TEXT NOT NULL REFERENCES agent_runs(id) ON DELETE CASCADE,
  erc8004_validation_tx TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'submitted', 'verified', 'failed')),
  evidence_uri TEXT,
  validator_agent_id TEXT REFERENCES erc8004_agents(id) ON DELETE SET NULL,
  request_id TEXT,
  request_uri TEXT,
  request_hash TEXT,
  request_tx_hash TEXT,
  request_explorer_url TEXT,
  response_uri TEXT,
  response_hash TEXT,
  response_score INTEGER CHECK (response_score >= 0 AND response_score <= 100),
  reviewed_at TEXT,
  explorer_url TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);
CREATE INDEX idx_agent_validations_agent_run_id ON agent_validations(agent_run_id);
CREATE INDEX idx_agent_validations_validator_agent_id ON agent_validations(validator_agent_id);
CREATE INDEX idx_agent_validations_request_hash ON agent_validations(request_hash);

CREATE TABLE agent_reputation_events (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(4)) || '-' || hex(randomblob(2)) || '-4' || substr(hex(randomblob(2)), 2) || '-' || substr('89ab', 1 + (abs(random()) % 4), 1) || substr(hex(randomblob(2)), 2) || '-' || hex(randomblob(6)))),
  subject_agent_id TEXT NOT NULL REFERENCES erc8004_agents(id) ON DELETE CASCADE,
  reviewer_agent_id TEXT NOT NULL REFERENCES erc8004_agents(id) ON DELETE CASCADE,
  source_run_id TEXT REFERENCES agent_runs(id) ON DELETE SET NULL,
  source_validation_id TEXT REFERENCES agent_validations(id) ON DELETE SET NULL,
  score INTEGER NOT NULL CHECK (score >= 0 AND score <= 100),
  value_decimals INTEGER NOT NULL DEFAULT 0 CHECK (value_decimals >= 0),
  tag1 TEXT,
  tag2 TEXT,
  endpoint TEXT,
  feedback_uri TEXT,
  feedback_hash TEXT,
  reputation_tx_hash TEXT,
  explorer_url TEXT,
  proof_of_payment_json TEXT NOT NULL DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'submitted', 'verified', 'failed')),
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);
CREATE INDEX idx_agent_reputation_subject_agent_id ON agent_reputation_events(subject_agent_id);
CREATE INDEX idx_agent_reputation_reviewer_agent_id ON agent_reputation_events(reviewer_agent_id);
CREATE INDEX idx_agent_reputation_source_run_id ON agent_reputation_events(source_run_id);
