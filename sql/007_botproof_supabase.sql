-- BotProof tables for Supabase (public schema)
-- Run this in Supabase SQL Editor to create tables

-- Challenges: short-lived, single-use verification puzzles
CREATE TABLE IF NOT EXISTS botproof_challenges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type VARCHAR(50) NOT NULL,
  level INT NOT NULL DEFAULT 1,
  payload JSONB NOT NULL,
  answer_hash VARCHAR(128) NOT NULL,
  time_limit_ms INT NOT NULL,
  issued_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL,
  consumed BOOLEAN NOT NULL DEFAULT false,
  ip_hash VARCHAR(64) NOT NULL
);

-- Verifications: all verification attempts (pass + fail)
CREATE TABLE IF NOT EXISTS botproof_verifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  challenge_id UUID REFERENCES botproof_challenges(id),
  token VARCHAR(128),
  verified BOOLEAN NOT NULL,
  reason VARCHAR(50),
  agent_id VARCHAR(255) DEFAULT 'anonymous',
  agent_name VARCHAR(255),
  model VARCHAR(255),
  framework VARCHAR(255),
  level INT NOT NULL DEFAULT 1,
  challenge_type VARCHAR(50) NOT NULL,
  response_time_ms INT NOT NULL,
  issued_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ,
  ip_hash VARCHAR(64) NOT NULL
);

-- Performance indexes
CREATE INDEX IF NOT EXISTS idx_bp_challenges_expires
  ON botproof_challenges(expires_at);
CREATE INDEX IF NOT EXISTS idx_bp_challenges_unconsumed
  ON botproof_challenges(consumed) WHERE consumed = false;
CREATE INDEX IF NOT EXISTS idx_bp_verifications_verified
  ON botproof_verifications(verified, response_time_ms)
  WHERE verified = true;
CREATE INDEX IF NOT EXISTS idx_bp_verifications_token
  ON botproof_verifications(token)
  WHERE token IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_bp_verifications_created
  ON botproof_verifications(issued_at DESC);
CREATE INDEX IF NOT EXISTS idx_bp_verifications_leaderboard
  ON botproof_verifications(response_time_ms ASC)
  WHERE verified = true AND agent_name IS NOT NULL;

-- Enable RLS (optional — service role key bypasses)
ALTER TABLE botproof_challenges ENABLE ROW LEVEL SECURITY;
ALTER TABLE botproof_verifications ENABLE ROW LEVEL SECURITY;

-- Allow service role full access
CREATE POLICY IF NOT EXISTS "service_role_challenges" ON botproof_challenges
  FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY IF NOT EXISTS "service_role_verifications" ON botproof_verifications
  FOR ALL USING (true) WITH CHECK (true);
