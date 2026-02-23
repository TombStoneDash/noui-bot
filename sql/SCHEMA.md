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
