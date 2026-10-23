-- A payment transaction can be recorded once: concurrent requests with the same tx hash hit the constraint
-- instead of both passing the application-level check. Multi-settle records one settlement per payer for
-- the same batch transaction, so settlements are unique per (tx, payer, payee).
CREATE UNIQUE INDEX idx_stall_payments_tx_hash_unique ON stall_payments(tx_hash) WHERE tx_hash IS NOT NULL;
CREATE UNIQUE INDEX idx_store_orders_tx_hash_unique ON store_orders(tx_hash) WHERE tx_hash IS NOT NULL;
CREATE UNIQUE INDEX idx_settlements_tx_payer_payee_unique ON settlements(tx_hash, payer_wallet, payee_wallet)
  WHERE tx_hash IS NOT NULL;
