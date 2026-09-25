import {
  neon,
  type NeonQueryFunction,
} from "@neondatabase/serverless";

// Connection using Neon serverless driver (HTTP)
// Uses noui schema within the shared actorlab-db Neon project
type SqlClient = NeonQueryFunction<false, false>;

let sqlClient: SqlClient | undefined;

function getSqlClient(): SqlClient {
  if (sqlClient) {
    return sqlClient;
  }

  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL is required");
  }

  sqlClient = neon(connectionString);
  return sqlClient;
}

/**
 * Lazily initialize the Neon client when a query runs.
 *
 * Next.js evaluates route modules while collecting build metadata. Keeping
 * client construction out of module scope lets builds run without production
 * credentials while preserving a request-time failure when the database is
 * unavailable.
 */
export function sql(strings: TemplateStringsArray, ...params: unknown[]) {
  return getSqlClient()(strings, ...params);
}

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

  // BotProof tables live in Supabase (see sql/007_botproof_supabase.sql)

  // Indexes for common queries
  await sql`CREATE INDEX IF NOT EXISTS idx_waitlist_email ON noui.waitlist(email)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_feedback_created ON noui.feedback(created_at DESC)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_applications_created ON noui.applications(created_at DESC)`;

}
