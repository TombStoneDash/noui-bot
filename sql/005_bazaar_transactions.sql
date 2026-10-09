-- 005_bazaar_transactions.sql
-- Real-time transaction ledger for Agent Bazaar
-- Tracks every fund movement: top-ups, tool payments, fees, refunds, payouts
-- Created: 2026-04-09

CREATE TABLE IF NOT EXISTS bazaar_transactions (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id   UUID REFERENCES bazaar_providers(id),
  consumer_id   UUID REFERENCES bazaar_consumers(id),
  tool_id       UUID REFERENCES bazaar_tools(id),
  amount        DECIMAL(12,6) NOT NULL,
  fee           DECIMAL(12,6) NOT NULL DEFAULT 0,
  currency      TEXT NOT NULL DEFAULT 'USD',
  type          TEXT NOT NULL CHECK (type IN ('tool_call', 'top_up', 'payout', 'refund', 'fee')),
  status        TEXT NOT NULL DEFAULT 'completed' CHECK (status IN ('pending', 'completed', 'failed', 'refunded')),
  reference_id  TEXT,  -- external ref (Stripe charge ID, usage_log ID, etc.)
  metadata      JSONB DEFAULT '{}',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_bazaar_transactions_consumer ON bazaar_transactions(consumer_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_bazaar_transactions_provider ON bazaar_transactions(provider_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_bazaar_transactions_type ON bazaar_transactions(type);
CREATE INDEX IF NOT EXISTS idx_bazaar_transactions_status ON bazaar_transactions(status);
CREATE INDEX IF NOT EXISTS idx_bazaar_transactions_created ON bazaar_transactions(created_at DESC);

-- Updated_at trigger
CREATE OR REPLACE FUNCTION update_bazaar_transactions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS bazaar_transactions_updated_at ON bazaar_transactions;
CREATE TRIGGER bazaar_transactions_updated_at
  BEFORE UPDATE ON bazaar_transactions
  FOR EACH ROW
  EXECUTE FUNCTION update_bazaar_transactions_updated_at();
