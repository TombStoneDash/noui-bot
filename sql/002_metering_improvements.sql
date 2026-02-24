-- 002: Metering improvements — data volume tracking, token counts, daily aggregates
-- Run after 001_bazaar_schema.sql

-- ─── Add columns to usage logs for data volume tracking ───
ALTER TABLE bazaar_usage_logs
  ADD COLUMN IF NOT EXISTS request_size_bytes  INTEGER,
  ADD COLUMN IF NOT EXISTS response_size_bytes INTEGER,
  ADD COLUMN IF NOT EXISTS tokens_input        INTEGER,
  ADD COLUMN IF NOT EXISTS tokens_output       INTEGER;

-- ─── Index on created_at for efficient time-range queries ───
-- (already exists from 001 as idx_bazaar_usage_created, but ensure it's there)
CREATE INDEX IF NOT EXISTS idx_bazaar_usage_created ON bazaar_usage_logs(created_at);

-- Composite index for per-consumer time-range queries (rate limiting, summaries)
CREATE INDEX IF NOT EXISTS idx_bazaar_usage_consumer_time
  ON bazaar_usage_logs(consumer_id, created_at DESC);

-- ─── Daily aggregates — pre-computed rollups per consumer + tool ───
CREATE TABLE IF NOT EXISTS bazaar_daily_aggregates (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  consumer_id UUID NOT NULL REFERENCES bazaar_consumers(id),
  provider_id UUID NOT NULL REFERENCES bazaar_providers(id),
  tool_id     UUID NOT NULL REFERENCES bazaar_tools(id),
  date        DATE NOT NULL,
  total_calls       INTEGER NOT NULL DEFAULT 0,
  successful_calls  INTEGER NOT NULL DEFAULT 0,
  error_calls       INTEGER NOT NULL DEFAULT 0,
  total_cost_cents  INTEGER NOT NULL DEFAULT 0,
  total_latency_ms  BIGINT  NOT NULL DEFAULT 0,
  total_request_bytes  BIGINT NOT NULL DEFAULT 0,
  total_response_bytes BIGINT NOT NULL DEFAULT 0,
  total_tokens_input   INTEGER NOT NULL DEFAULT 0,
  total_tokens_output  INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(consumer_id, tool_id, date)
);

CREATE INDEX IF NOT EXISTS idx_bazaar_daily_agg_consumer ON bazaar_daily_aggregates(consumer_id, date);
CREATE INDEX IF NOT EXISTS idx_bazaar_daily_agg_provider ON bazaar_daily_aggregates(provider_id, date);
CREATE INDEX IF NOT EXISTS idx_bazaar_daily_agg_tool     ON bazaar_daily_aggregates(tool_id, date);

-- RLS
ALTER TABLE bazaar_daily_aggregates ENABLE ROW LEVEL SECURITY;

-- ─── Provider billing: add payout balance tracking ───
ALTER TABLE bazaar_providers
  ADD COLUMN IF NOT EXISTS payout_balance_cents INTEGER NOT NULL DEFAULT 0;
