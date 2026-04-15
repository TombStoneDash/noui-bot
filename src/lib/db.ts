import { neon } from "@neondatabase/serverless";

// Connection using Neon serverless driver (HTTP)
// Uses noui schema within the shared actorlab-db Neon project
const sql = neon(process.env.DATABASE_URL!);

export { sql };

/**
 * Initialize the noui schema and tables.
 * Called on first request if tables don't exist.
 */
export async function initDB() {
  await sql`CREATE SCHEMA IF NOT EXISTS noui`;

  await sql`
    CREATE TABLE IF NOT EXISTS noui.waitlist (
      id SERIAL PRIMARY KEY,
      email TEXT NOT NULL UNIQUE,
      source TEXT DEFAULT 'api',
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS noui.feedback (
      id TEXT PRIMARY KEY,
      agent_name TEXT,
      agent_url TEXT,
      contact TEXT,
      walls TEXT[] DEFAULT '{}',
      needs TEXT[] DEFAULT '{}',
      message TEXT,
      platform TEXT,
      use_case TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS noui.applications (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      contact TEXT NOT NULL,
      type TEXT,
      skills TEXT[] DEFAULT '{}',
      projects TEXT[] DEFAULT '{}',
      agents TEXT[] DEFAULT '{}',
      interest TEXT,
      pitch TEXT,
      availability TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `;

  // BotProof (proof-of-bot) tables
  await sql`
    CREATE TABLE IF NOT EXISTS noui.botproof_challenges (
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
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS noui.botproof_verifications (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      challenge_id UUID REFERENCES noui.botproof_challenges(id),
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
    )
  `;

  // Indexes for common queries
  await sql`CREATE INDEX IF NOT EXISTS idx_waitlist_email ON noui.waitlist(email)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_feedback_created ON noui.feedback(created_at DESC)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_applications_created ON noui.applications(created_at DESC)`;

  // BotProof indexes
  await sql`CREATE INDEX IF NOT EXISTS idx_botproof_challenges_expires ON noui.botproof_challenges(expires_at)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_botproof_challenges_consumed ON noui.botproof_challenges(consumed) WHERE consumed = false`;
  await sql`CREATE INDEX IF NOT EXISTS idx_botproof_verifications_verified ON noui.botproof_verifications(verified, response_time_ms) WHERE verified = true`;
  await sql`CREATE INDEX IF NOT EXISTS idx_botproof_verifications_token ON noui.botproof_verifications(token) WHERE token IS NOT NULL`;
  await sql`CREATE INDEX IF NOT EXISTS idx_botproof_verifications_created ON noui.botproof_verifications(issued_at DESC)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_botproof_verifications_leaderboard ON noui.botproof_verifications(response_time_ms ASC) WHERE verified = true AND agent_name IS NOT NULL`;
}
