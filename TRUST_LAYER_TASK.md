# Trust Layer Build Task — v0.4.0

## Context
noui.bot is an agent-first infrastructure platform with a "Bazaar" — billing, metering, and auth for MCP servers. We're building a trust layer that differentiates us from competitors (xpay, TollBit, MCP Hive).

## DB: Supabase (PostgreSQL)
- URL: uses env vars SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY
- Existing tables: bazaar_providers, bazaar_consumers, bazaar_tools, bazaar_usage_logs, bazaar_api_keys, etc.
- Use @supabase/supabase-js via src/lib/supabase.ts getSupabase()
- Auth via src/lib/bazaar-auth.ts authenticateKey()

## What to Build

### 1. DB Migrations (run via Supabase REST or init endpoint)
Add to src/app/api/v1/init/route.ts (it already runs CREATE TABLE IF NOT EXISTS):

```sql
-- Provider verification columns
ALTER TABLE bazaar_providers ADD COLUMN IF NOT EXISTS verification_level TEXT DEFAULT 'unverified' CHECK (verification_level IN ('unverified', 'email', 'domain', 'code'));
ALTER TABLE bazaar_providers ADD COLUMN IF NOT EXISTS verified_at TIMESTAMPTZ;
ALTER TABLE bazaar_providers ADD COLUMN IF NOT EXISTS verification_metadata JSONB DEFAULT '{}';

-- Signed receipts table
CREATE TABLE IF NOT EXISTS bazaar_receipts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  receipt_id TEXT UNIQUE NOT NULL,
  tool_id TEXT NOT NULL,
  agent_id TEXT NOT NULL,
  provider_id TEXT NOT NULL,
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  duration_ms INTEGER DEFAULT 0,
  cost_microcents BIGINT DEFAULT 0,
  status TEXT DEFAULT 'success',
  input_hash TEXT,
  output_hash TEXT,
  signature TEXT NOT NULL,
  metadata JSONB DEFAULT '{}'
);
CREATE INDEX IF NOT EXISTS idx_receipts_agent ON bazaar_receipts(agent_id);
CREATE INDEX IF NOT EXISTS idx_receipts_provider ON bazaar_receipts(provider_id);
CREATE INDEX IF NOT EXISTS idx_receipts_receipt_id ON bazaar_receipts(receipt_id);

-- Disputes table
CREATE TABLE IF NOT EXISTS bazaar_disputes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dispute_id TEXT UNIQUE NOT NULL,
  receipt_id TEXT NOT NULL REFERENCES bazaar_receipts(receipt_id),
  agent_id TEXT NOT NULL,
  provider_id TEXT NOT NULL,
  reason TEXT NOT NULL CHECK (reason IN ('tool_error', 'overcharge', 'timeout', 'quality')),
  description TEXT,
  evidence JSONB DEFAULT '{}',
  status TEXT DEFAULT 'filed' CHECK (status IN ('filed', 'under_review', 'resolved_refund', 'resolved_denied', 'resolved_credit')),
  resolution_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  resolved_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_disputes_agent ON bazaar_disputes(agent_id);
CREATE INDEX IF NOT EXISTS idx_disputes_provider ON bazaar_disputes(provider_id);
```

### 2. Signed Receipts (src/app/api/v1/bazaar/receipts/route.ts)
- GET: List receipts filtered by agent_id or provider_id query params
- Receipt ID format: `rcpt_` + nanoid

Also create src/app/api/v1/bazaar/receipts/[receiptId]/route.ts:
- GET: Fetch single receipt + verify signature

Receipt signing: Use HMAC-SHA256 with env var RECEIPT_SIGNING_SECRET (fallback to a default for dev). Sign: `receipt_id|tool_id|agent_id|provider_id|timestamp|cost_microcents|status`

**CRITICAL**: Update the /api/v1/bazaar/meter/route.ts POST handler to auto-generate a signed receipt on every meter call. Return receipt_id and receipt_url in the meter response.

### 3. Provider Verification (src/app/api/v1/bazaar/providers/verify/route.ts)
- POST: Submit verification request. For email verification, just check the provider has an email in their record and mark as 'email' verified.
- For domain/code verification, just save the request and mark as pending (manual review).

### 4. Provider SLA (src/app/api/v1/bazaar/providers/[id]/sla/route.ts)
- GET: Aggregate from bazaar_usage_logs for this provider over last 30 days
- Return: uptime_30d, avg_latency_ms, p95_latency_ms, error_rate_30d, total_calls_30d, receipts_issued, disputes count

### 5. Disputes (src/app/api/v1/bazaar/disputes/route.ts)
- POST: File a dispute (requires receipt_id, reason, description)
- GET: List disputes filtered by agent_id or provider_id

Also src/app/api/v1/bazaar/disputes/[id]/route.ts:
- GET: Single dispute status

### 6. Trust Score (src/app/api/v1/bazaar/providers/[id]/trust/route.ts)
- GET: Composite score from verification level + SLA metrics + dispute history
- Components: verification (0-25), uptime (0-25), latency (0-25), disputes (0-25)
- Badge: unrated (<25), basic (25-50), trusted (50-75), verified (75-100)

### 7. Update API Index (src/app/api/v1/route.ts)
- Bump version to "0.4.0"
- Add all new trust endpoints to the endpoint listing
- Add trust_layer section

### 8. Update agents.json (public/.well-known/agents.json)
- Add trust capabilities: receipt verification, dispute filing, trust scores, verification levels

## Rules
- One logical unit per commit
- Use existing patterns (getSupabase(), authenticateKey())
- NEVER use --accept-data-loss
- Keep it simple — working endpoints > perfect code
- Git commit each feature after building

## When done
Run: clawdbot gateway wake --text "Done: Trust Layer v0.4.0 built — receipts, verification, SLA, disputes, trust scores" --mode now
