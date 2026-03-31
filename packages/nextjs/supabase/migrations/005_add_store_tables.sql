-- ============================================================================
-- STORE ITEMS
-- ============================================================================
CREATE TABLE IF NOT EXISTS store_items (
  id BIGSERIAL PRIMARY KEY,
  stall_id BIGINT NOT NULL REFERENCES stalls(id) ON DELETE CASCADE,
  sku TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  price NUMERIC NOT NULL CHECK (price >= 0),
  token_address TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'paused', 'out_of_stock', 'archived')),
  image_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(stall_id, sku)
);

CREATE INDEX IF NOT EXISTS idx_store_items_stall_id ON store_items(stall_id);
CREATE INDEX IF NOT EXISTS idx_store_items_status ON store_items(status);

COMMENT ON TABLE store_items IS 'Retail catalog items for stores built on top of stalls';

-- ============================================================================
-- STORE INVENTORY
-- ============================================================================
CREATE TABLE IF NOT EXISTS store_inventory (
  item_id BIGINT PRIMARY KEY REFERENCES store_items(id) ON DELETE CASCADE,
  current_stock INTEGER NOT NULL DEFAULT 0 CHECK (current_stock >= 0),
  reorder_threshold INTEGER NOT NULL DEFAULT 3 CHECK (reorder_threshold >= 0),
  target_stock INTEGER NOT NULL DEFAULT 10 CHECK (target_stock >= 0),
  last_restocked_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE store_inventory IS 'Current stock and restock targets for store items';

-- ============================================================================
-- STORE ORDERS
-- ============================================================================
CREATE TABLE IF NOT EXISTS store_orders (
  id BIGSERIAL PRIMARY KEY,
  stall_id BIGINT NOT NULL REFERENCES stalls(id) ON DELETE CASCADE,
  buyer_wallet TEXT NOT NULL REFERENCES users(wallet_address) ON DELETE CASCADE,
  subtotal NUMERIC NOT NULL CHECK (subtotal >= 0),
  manager_amount NUMERIC NOT NULL CHECK (manager_amount >= 0),
  admin_amount NUMERIC NOT NULL CHECK (admin_amount >= 0),
  token_address TEXT NOT NULL,
  tx_hash TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_store_orders_stall_id ON store_orders(stall_id);
CREATE INDEX IF NOT EXISTS idx_store_orders_buyer_wallet ON store_orders(buyer_wallet);
CREATE INDEX IF NOT EXISTS idx_store_orders_status ON store_orders(status);

COMMENT ON TABLE store_orders IS 'Store checkout orders with on-chain split payment metadata';

-- ============================================================================
-- STORE ORDER ITEMS
-- ============================================================================
CREATE TABLE IF NOT EXISTS store_order_items (
  id BIGSERIAL PRIMARY KEY,
  order_id BIGINT NOT NULL REFERENCES store_orders(id) ON DELETE CASCADE,
  item_id BIGINT NOT NULL REFERENCES store_items(id) ON DELETE CASCADE,
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  unit_price NUMERIC NOT NULL CHECK (unit_price >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_store_order_items_order_id ON store_order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_store_order_items_item_id ON store_order_items(item_id);

-- ============================================================================
-- MANAGER AGENTS
-- ============================================================================
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS manager_agents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  stall_id BIGINT NOT NULL UNIQUE REFERENCES stalls(id) ON DELETE CASCADE,
  agent_name TEXT NOT NULL,
  operator_wallet TEXT NOT NULL REFERENCES users(wallet_address) ON DELETE CASCADE,
  erc8004_agent_id TEXT,
  agent_address TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'paused', 'error')),
  budget_daily_calls INTEGER NOT NULL DEFAULT 24 CHECK (budget_daily_calls > 0),
  budget_daily_tokens INTEGER NOT NULL DEFAULT 15000 CHECK (budget_daily_tokens > 0),
  max_restock_value NUMERIC NOT NULL DEFAULT 250 CHECK (max_restock_value >= 0),
  max_price_change_pct NUMERIC NOT NULL DEFAULT 10 CHECK (max_price_change_pct >= 0),
  min_confidence NUMERIC NOT NULL DEFAULT 0.72 CHECK (min_confidence >= 0 AND min_confidence <= 1),
  allowed_supplier_urls TEXT[] DEFAULT ARRAY[]::TEXT[],
  allowed_skus TEXT[] DEFAULT ARRAY[]::TEXT[],
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_manager_agents_operator_wallet ON manager_agents(operator_wallet);
CREATE INDEX IF NOT EXISTS idx_manager_agents_status ON manager_agents(status);

-- ============================================================================
-- AGENT RUNS
-- ============================================================================
CREATE TABLE IF NOT EXISTS agent_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID NOT NULL REFERENCES manager_agents(id) ON DELETE CASCADE,
  run_type TEXT NOT NULL,
  trigger_source TEXT NOT NULL,
  state TEXT NOT NULL CHECK (state IN ('discovering', 'planning', 'executing', 'verifying', 'submitted', 'failed')),
  decision_summary TEXT,
  tool_calls_json JSONB NOT NULL DEFAULT '[]'::jsonb,
  retries INTEGER NOT NULL DEFAULT 0,
  failures_json JSONB NOT NULL DEFAULT '[]'::jsonb,
  output_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  compute_cost_estimate NUMERIC NOT NULL DEFAULT 0,
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_agent_runs_agent_id ON agent_runs(agent_id);
CREATE INDEX IF NOT EXISTS idx_agent_runs_started_at ON agent_runs(started_at DESC);
CREATE INDEX IF NOT EXISTS idx_agent_runs_state ON agent_runs(state);

-- ============================================================================
-- AGENT VALIDATIONS
-- ============================================================================
CREATE TABLE IF NOT EXISTS agent_validations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_run_id UUID NOT NULL REFERENCES agent_runs(id) ON DELETE CASCADE,
  erc8004_validation_tx TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'submitted', 'verified', 'failed')),
  evidence_uri TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_agent_validations_agent_run_id ON agent_validations(agent_run_id);

-- ============================================================================
-- FUNCTIONS: TIMESTAMP UPDATES
-- ============================================================================
CREATE TRIGGER update_store_items_updated_at BEFORE UPDATE ON store_items
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_store_inventory_updated_at BEFORE UPDATE ON store_inventory
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_manager_agents_updated_at BEFORE UPDATE ON manager_agents
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
