-- ============================================================================
-- ERC-8004 TRUST AGENTS
-- ============================================================================
CREATE TABLE IF NOT EXISTS erc8004_agents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  linked_manager_agent_id UUID REFERENCES manager_agents(id) ON DELETE SET NULL,
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
  metadata_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_erc8004_agents_linked_manager
  ON erc8004_agents(linked_manager_agent_id)
  WHERE linked_manager_agent_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_erc8004_agents_role ON erc8004_agents(role);
CREATE INDEX IF NOT EXISTS idx_erc8004_agents_operator_wallet ON erc8004_agents(operator_wallet);
CREATE INDEX IF NOT EXISTS idx_erc8004_agents_status ON erc8004_agents(status);

-- ============================================================================
-- AGENT VALIDATIONS: ERC-8004 DETAILS
-- ============================================================================
ALTER TABLE agent_validations
  ADD COLUMN IF NOT EXISTS validator_agent_id UUID REFERENCES erc8004_agents(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS request_id TEXT,
  ADD COLUMN IF NOT EXISTS request_uri TEXT,
  ADD COLUMN IF NOT EXISTS request_hash TEXT,
  ADD COLUMN IF NOT EXISTS request_tx_hash TEXT,
  ADD COLUMN IF NOT EXISTS request_explorer_url TEXT,
  ADD COLUMN IF NOT EXISTS response_uri TEXT,
  ADD COLUMN IF NOT EXISTS response_hash TEXT,
  ADD COLUMN IF NOT EXISTS response_score INTEGER CHECK (response_score >= 0 AND response_score <= 100),
  ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS explorer_url TEXT;

CREATE INDEX IF NOT EXISTS idx_agent_validations_validator_agent_id ON agent_validations(validator_agent_id);
CREATE INDEX IF NOT EXISTS idx_agent_validations_request_hash ON agent_validations(request_hash);

-- ============================================================================
-- AGENT REPUTATION EVENTS
-- ============================================================================
CREATE TABLE IF NOT EXISTS agent_reputation_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subject_agent_id UUID NOT NULL REFERENCES erc8004_agents(id) ON DELETE CASCADE,
  reviewer_agent_id UUID NOT NULL REFERENCES erc8004_agents(id) ON DELETE CASCADE,
  source_run_id UUID REFERENCES agent_runs(id) ON DELETE SET NULL,
  source_validation_id UUID REFERENCES agent_validations(id) ON DELETE SET NULL,
  score INTEGER NOT NULL CHECK (score >= 0 AND score <= 100),
  value_decimals INTEGER NOT NULL DEFAULT 0 CHECK (value_decimals >= 0),
  tag1 TEXT,
  tag2 TEXT,
  endpoint TEXT,
  feedback_uri TEXT,
  feedback_hash TEXT,
  reputation_tx_hash TEXT,
  explorer_url TEXT,
  proof_of_payment_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'submitted', 'verified', 'failed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_agent_reputation_subject_agent_id ON agent_reputation_events(subject_agent_id);
CREATE INDEX IF NOT EXISTS idx_agent_reputation_reviewer_agent_id ON agent_reputation_events(reviewer_agent_id);
CREATE INDEX IF NOT EXISTS idx_agent_reputation_source_run_id ON agent_reputation_events(source_run_id);

-- ============================================================================
-- FUNCTIONS: TIMESTAMP UPDATES
-- ============================================================================
CREATE TRIGGER update_erc8004_agents_updated_at BEFORE UPDATE ON erc8004_agents
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
