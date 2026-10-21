# Agent Bazaar — Database Schema

## Overview
Agent Bazaar is the billing/metering/auth layer for MCP servers. It uses **Supabase** (project: `ainrnvzalcrgdifripwt`) shared with BotWall3t. Tables use the `bazaar_` prefix in the public schema.

## Tables

### `bazaar_providers`
MCP server operators who publish tools for agents to use.
- Registered with endpoint URL, pricing model, optional Stripe Connect
- API key authenticated (hashed, never stored plain)
- Pricing: per_call | per_token | flat_monthly | free

### `bazaar_consumers`
Agent developers who pay to use tools.
- Prepaid balance (top up via Stripe)
- Global rate limit (requests per minute)
- API key authenticated

### `bazaar_api_keys`
Shared key management for both providers and consumers.
- SHA-256 hashed storage
- Per-key rate limits and permissions
- Revocable, expirable

### `bazaar_tools`
Individual tool endpoints within an MCP server.
- Each tool can override provider-level pricing
- Tracks lifetime call count, avg latency, uptime
- Optional free tier per consumer per month
- JSON Schema for input validation

### `bazaar_usage_logs`
Every metered API call through the proxy.
- Records: consumer, provider, tool, cost, latency, status
- Request hash for deduplication
- Statuses: success | error | timeout | rate_limited | insufficient_funds

### `bazaar_invoices`
Monthly billing rollups for consumers.
- Aggregated call count and cost
- Platform fee (15-20%)
- Stripe invoice integration

### `bazaar_payouts`
Monthly payout rollups for providers.
- Gross revenue → platform fee → net payout
- Stripe Connect transfer integration

### `bazaar_idempotency_keys` (008, additive)
Stored proxy responses keyed by `(consumer_id, key)` for the `Idempotency-Key` header on `POST /api/bazaar/proxy`.
- `response` JSONB holds `{body_hash, status, body, headers}`; `receipt_id` links the stored receipt
- 24 h TTL: the proxy treats rows older than 24 h as a miss and deletes them on lookup; `bazaar_purge_idempotency_keys(interval default '24 hours') returns integer` (009, additive) purges the rest via the `created_at` index

### `bazaar_debit_balance(p_consumer uuid, p_cents integer) returns integer` (008, additive)
Conditional `UPDATE … WHERE balance_cents >= p_cents RETURNING balance_cents`. `NULL` means insufficient funds. The proxy falls back to read-modify-write and tags `metadata.atomic_debit=false` when the function is absent.

## Relationships
```
bazaar_providers 1──N bazaar_tools
bazaar_providers 1──N bazaar_api_keys (owner_type='provider')
bazaar_consumers 1──N bazaar_api_keys (owner_type='consumer')
bazaar_consumers 1──N bazaar_usage_logs
bazaar_tools     1──N bazaar_usage_logs
bazaar_consumers 1──N bazaar_invoices
bazaar_providers 1──N bazaar_payouts
```

## Security
- RLS enabled on all tables
- Service role key bypasses RLS (used by API routes)
- Public read access only on `bazaar_tools` and `bazaar_providers` (active only)
- API keys stored as SHA-256 hashes, never plaintext
