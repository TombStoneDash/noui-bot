-- ============================================================================
-- 008: Proxy receipt integrity — idempotency keys + atomic balance debit
-- Additive only. Not applied automatically; apply through the normal migration path.
-- The proxy route runs with or without this file applied:
--   * missing bazaar_debit_balance  -> read-modify-write fallback, usage log metadata.atomic_debit=false
--   * missing bazaar_idempotency_keys -> Idempotency-Key is honoured best-effort (treated as a miss)
-- ============================================================================

-- 1. Idempotency keys: one stored response per (consumer, key)
CREATE TABLE IF NOT EXISTS bazaar_idempotency_keys (
  consumer_id UUID NOT NULL,
  key TEXT NOT NULL,
  receipt_id TEXT,
  response JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (consumer_id, key)
);

CREATE INDEX IF NOT EXISTS idx_idempotency_keys_created_at ON bazaar_idempotency_keys(created_at);

ALTER TABLE bazaar_idempotency_keys ENABLE ROW LEVEL SECURITY;

-- 2. Atomic conditional debit. Returns the new balance, or NULL when the
--    balance did not cover p_cents (no row updated). Safe under concurrency:
--    the UPDATE's WHERE clause is evaluated against the row lock.
CREATE OR REPLACE FUNCTION bazaar_debit_balance(p_consumer UUID, p_cents INTEGER)
RETURNS INTEGER
LANGUAGE sql
AS $$
  UPDATE bazaar_consumers
     SET balance_cents = balance_cents - p_cents,
         updated_at = NOW()
   WHERE id = p_consumer
     AND balance_cents >= p_cents
  RETURNING balance_cents;
$$;
