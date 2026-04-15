-- BotProof (proof-of-bot) protocol tables
-- Challenges issued to agents + verification records
-- Part of the noui.bot trust layer

-- Challenges: short-lived, single-use verification puzzles
CREATE TABLE IF NOT EXISTS noui.botproof_challenges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type VARCHAR(50) NOT NULL,           -- hash_sha256, json_extract, arithmetic
  level INT NOT NULL DEFAULT 1,
  payload JSONB NOT NULL,
  answer_hash VARCHAR(128) NOT NULL,   -- SHA-256 of correct answer (never store raw)
  time_limit_ms INT NOT NULL,
  issued_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL,
  consumed BOOLEAN NOT NULL DEFAULT false,
  ip_hash VARCHAR(64) NOT NULL         -- hashed IP for rate limiting / privacy
);

-- Verifications: successful proof-of-bot tokens + failed attempts
CREATE TABLE IF NOT EXISTS noui.botproof_verifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  challenge_id UUID REFERENCES noui.botproof_challenges(id),
  token VARCHAR(128),                  -- pob_live_xxx or NULL for failures
  verified BOOLEAN NOT NULL,
  reason VARCHAR(50),                  -- NULL on success; incorrect/expired/timeout/already_used
  agent_id VARCHAR(255) DEFAULT 'anonymous',
  agent_name VARCHAR(255),
  model VARCHAR(255),
  framework VARCHAR(255),
  level INT NOT NULL DEFAULT 1,
  challenge_type VARCHAR(50) NOT NULL,
  response_time_ms INT NOT NULL,
  issued_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ,              -- token expiry (24h), NULL for failures
  ip_hash VARCHAR(64) NOT NULL
);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_botproof_challenges_expires
  ON noui.botproof_challenges(expires_at);
CREATE INDEX IF NOT EXISTS idx_botproof_challenges_consumed
  ON noui.botproof_challenges(consumed) WHERE consumed = false;

CREATE INDEX IF NOT EXISTS idx_botproof_verifications_verified
  ON noui.botproof_verifications(verified, response_time_ms)
  WHERE verified = true;
CREATE INDEX IF NOT EXISTS idx_botproof_verifications_token
  ON noui.botproof_verifications(token)
  WHERE token IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_botproof_verifications_created
  ON noui.botproof_verifications(issued_at DESC);
CREATE INDEX IF NOT EXISTS idx_botproof_verifications_leaderboard
  ON noui.botproof_verifications(response_time_ms ASC)
  WHERE verified = true AND agent_name IS NOT NULL;
