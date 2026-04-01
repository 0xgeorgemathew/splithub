-- Recreate the ERC-8004 reputation table if it was deleted during testing.
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
