-- Migration: Trust Layer for Agent Bazaar v0.4.0
-- Date: 2026-02-27
-- Description: Provider verification, signed receipts, SLA reporting, dispute resolution, trust scores

-- ============================================================================
-- 1. Provider Verification
-- ============================================================================
ALTER TABLE bazaar_providers ADD COLUMN IF NOT EXISTS verification_level TEXT DEFAULT 'unverified'
  CHECK (verification_level IN ('unverified', 'email', 'domain', 'code'));
ALTER TABLE bazaar_providers ADD COLUMN IF NOT EXISTS verified_at TIMESTAMPTZ;
ALTER TABLE bazaar_providers ADD COLUMN IF NOT EXISTS verification_metadata JSONB DEFAULT '{}';

-- ============================================================================
-- 2. Signed Receipts
-- ============================================================================
CREATE TABLE IF NOT EXISTS bazaar_receipts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  receipt_id TEXT UNIQUE NOT NULL,
  tool_id TEXT NOT NULL,
  tool_name TEXT,
  agent_id TEXT NOT NULL,
  provider_id TEXT NOT NULL,
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  duration_ms INTEGER,
  cost_microcents BIGINT DEFAULT 0,
  status TEXT DEFAULT 'success' CHECK (status IN ('success', 'error', 'timeout', 'rate_limited')),
  input_hash TEXT,
  output_hash TEXT,
  signature TEXT NOT NULL,
  usage_log_id UUID,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_receipts_agent ON bazaar_receipts(agent_id);
CREATE INDEX IF NOT EXISTS idx_receipts_provider ON bazaar_receipts(provider_id);
CREATE INDEX IF NOT EXISTS idx_receipts_timestamp ON bazaar_receipts(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_receipts_receipt_id ON bazaar_receipts(receipt_id);

-- ============================================================================
-- 3. Disputes
-- ============================================================================
CREATE TABLE IF NOT EXISTS bazaar_disputes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dispute_id TEXT UNIQUE NOT NULL,
  receipt_id TEXT NOT NULL REFERENCES bazaar_receipts(receipt_id),
  filed_by TEXT NOT NULL,
  filed_by_type TEXT NOT NULL CHECK (filed_by_type IN ('agent', 'provider')),
  reason TEXT NOT NULL CHECK (reason IN ('tool_error', 'overcharge', 'timeout', 'quality', 'other')),
  description TEXT,
  evidence JSONB DEFAULT '{}',
  status TEXT DEFAULT 'filed' CHECK (status IN ('filed', 'under_review', 'resolved_refund', 'resolved_denied', 'resolved_credit')),
  resolution_notes TEXT,
  resolved_at TIMESTAMPTZ,
  resolved_by TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_disputes_receipt ON bazaar_disputes(receipt_id);
CREATE INDEX IF NOT EXISTS idx_disputes_filed_by ON bazaar_disputes(filed_by);
CREATE INDEX IF NOT EXISTS idx_disputes_status ON bazaar_disputes(status);

-- ============================================================================
-- 4. Enable RLS
-- ============================================================================
ALTER TABLE bazaar_receipts ENABLE ROW LEVEL SECURITY;
ALTER TABLE bazaar_disputes ENABLE ROW LEVEL SECURITY;

-- Service role bypass
CREATE POLICY "service_role_receipts" ON bazaar_receipts FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "service_role_disputes" ON bazaar_disputes FOR ALL USING (true) WITH CHECK (true);
