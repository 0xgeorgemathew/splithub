-- Remove the store agent, ERC-8004 trust and Agent Pay data. These were temporary features.
DROP TABLE IF EXISTS agent_reputation_events;
DROP TABLE IF EXISTS agent_validations;
DROP TABLE IF EXISTS erc8004_agents;
DROP TABLE IF EXISTS agent_runs;
DROP TABLE IF EXISTS manager_agents;

ALTER TABLE users DROP COLUMN tap_limit_usd;
