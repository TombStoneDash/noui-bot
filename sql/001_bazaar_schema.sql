-- Agent Bazaar Schema — Billing/metering layer for MCP servers
-- Supabase project: ainrnvzalcrgdifripwt (shared with BotWall3t)
-- All tables use bazaar_ prefix in public schema
-- Run this in Supabase SQL Editor

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ─── Providers (MCP server operators) ───
CREATE TABLE IF NOT EXISTS bazaar_providers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  endpoint_url TEXT NOT NULL,
  description TEXT,
  api_key_hash TEXT NOT NULL UNIQUE,
  api_key_prefix TEXT NOT NULL,
  pricing_model TEXT NOT NULL DEFAULT 'per_call', -- per_call | per_token | flat_monthly | free
  default_price_cents INTEGER NOT NULL DEFAULT 0,
  stripe_account_id TEXT, -- Stripe Connect for payouts
  active BOOLEAN NOT NULL DEFAULT TRUE,
  verified BOOLEAN NOT NULL DEFAULT FALSE,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── Consumers (agent developers who pay for tools) ───
CREATE TABLE IF NOT EXISTS bazaar_consumers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  stripe_customer_id TEXT,
  balance_cents INTEGER NOT NULL DEFAULT 0, -- prepaid balance
  rate_limit_rpm INTEGER NOT NULL DEFAULT 60, -- requests per minute
  active BOOLEAN NOT NULL DEFAULT TRUE,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── API Keys (for both providers and consumers) ───
CREATE TABLE IF NOT EXISTS bazaar_api_keys (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  key_hash TEXT NOT NULL UNIQUE,
  key_prefix TEXT NOT NULL,
  owner_type TEXT NOT NULL, -- provider | consumer
  owner_id UUID NOT NULL,
  name TEXT NOT NULL DEFAULT 'Default',
  permissions JSONB NOT NULL DEFAULT '["read", "write"]'::jsonb,
  rate_limit_rpm INTEGER, -- override global rate limit
  last_used_at TIMESTAMPTZ,
  revoked_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_bazaar_keys_hash ON bazaar_api_keys(key_hash);
CREATE INDEX IF NOT EXISTS idx_bazaar_keys_owner ON bazaar_api_keys(owner_type, owner_id);

-- ─── Tools (individual endpoints within an MCP server) ───
CREATE TABLE IF NOT EXISTS bazaar_tools (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  provider_id UUID NOT NULL REFERENCES bazaar_providers(id),
  tool_name TEXT NOT NULL,
  display_name TEXT,
  description TEXT,
  category TEXT, -- weather | search | code | data | comms | other
  price_cents_override INTEGER, -- null = use provider default
  pricing_model_override TEXT, -- null = use provider default
  input_schema JSONB, -- JSON Schema for tool inputs
  free_tier_calls INTEGER DEFAULT 0, -- free calls per consumer per month
  active BOOLEAN NOT NULL DEFAULT TRUE,
  call_count INTEGER NOT NULL DEFAULT 0, -- lifetime calls
  avg_latency_ms INTEGER,
  uptime_pct NUMERIC(5,2) DEFAULT 100.00,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(provider_id, tool_name)
);
CREATE INDEX IF NOT EXISTS idx_bazaar_tools_provider ON bazaar_tools(provider_id);
CREATE INDEX IF NOT EXISTS idx_bazaar_tools_category ON bazaar_tools(category);

-- ─── Usage Logs (every metered call) ───
CREATE TABLE IF NOT EXISTS bazaar_usage_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  consumer_id UUID NOT NULL REFERENCES bazaar_consumers(id),
  provider_id UUID NOT NULL REFERENCES bazaar_providers(id),
  tool_id UUID NOT NULL REFERENCES bazaar_tools(id),
  api_key_id UUID REFERENCES bazaar_api_keys(id),
  status TEXT NOT NULL, -- success | error | timeout | rate_limited | insufficient_funds
  cost_cents INTEGER NOT NULL DEFAULT 0,
  tokens_used INTEGER,
  latency_ms INTEGER,
  request_hash TEXT, -- for deduplication
  error_message TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_bazaar_usage_consumer ON bazaar_usage_logs(consumer_id);
CREATE INDEX IF NOT EXISTS idx_bazaar_usage_provider ON bazaar_usage_logs(provider_id);
CREATE INDEX IF NOT EXISTS idx_bazaar_usage_tool ON bazaar_usage_logs(tool_id);
CREATE INDEX IF NOT EXISTS idx_bazaar_usage_created ON bazaar_usage_logs(created_at);

-- ─── Invoices (monthly billing rollups) ───
CREATE TABLE IF NOT EXISTS bazaar_invoices (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  consumer_id UUID NOT NULL REFERENCES bazaar_consumers(id),
  period_start TIMESTAMPTZ NOT NULL,
  period_end TIMESTAMPTZ NOT NULL,
  total_calls INTEGER NOT NULL DEFAULT 0,
  total_cost_cents INTEGER NOT NULL DEFAULT 0,
  platform_fee_cents INTEGER NOT NULL DEFAULT 0, -- 15-20% platform cut
  stripe_invoice_id TEXT,
  status TEXT NOT NULL DEFAULT 'draft', -- draft | pending | paid | failed | void
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  paid_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_bazaar_invoices_consumer ON bazaar_invoices(consumer_id);
CREATE INDEX IF NOT EXISTS idx_bazaar_invoices_status ON bazaar_invoices(status);

-- ─── Provider Payouts (what we pay providers) ───
CREATE TABLE IF NOT EXISTS bazaar_payouts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  provider_id UUID NOT NULL REFERENCES bazaar_providers(id),
  period_start TIMESTAMPTZ NOT NULL,
  period_end TIMESTAMPTZ NOT NULL,
  total_calls INTEGER NOT NULL DEFAULT 0,
  gross_revenue_cents INTEGER NOT NULL DEFAULT 0,
  platform_fee_cents INTEGER NOT NULL DEFAULT 0,
  net_payout_cents INTEGER NOT NULL DEFAULT 0,
  stripe_transfer_id TEXT,
  status TEXT NOT NULL DEFAULT 'pending', -- pending | processing | paid | failed
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  paid_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_bazaar_payouts_provider ON bazaar_payouts(provider_id);

-- RLS
ALTER TABLE bazaar_providers ENABLE ROW LEVEL SECURITY;
ALTER TABLE bazaar_consumers ENABLE ROW LEVEL SECURITY;
ALTER TABLE bazaar_api_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE bazaar_tools ENABLE ROW LEVEL SECURITY;
ALTER TABLE bazaar_usage_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE bazaar_invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE bazaar_payouts ENABLE ROW LEVEL SECURITY;

-- Public read access for tool catalog
CREATE POLICY "Tool catalog is publicly readable" ON bazaar_tools FOR SELECT USING (active = true);
CREATE POLICY "Provider info is publicly readable" ON bazaar_providers FOR SELECT USING (active = true);
