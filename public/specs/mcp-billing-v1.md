# MCP Billing Protocol v1

**Version:** 1.0.0-draft  
**Status:** Draft  
**Date:** 2025-07-12  
**Author:** noui.bot / Agent Bazaar  

## Overview

This specification defines a billing layer for Model Context Protocol (MCP) tool calls.
It enables providers to charge per-call or per-token fees, consumers to discover prices
before calling, and a platform to meter, settle, and pay out.

## Payment Flow

```
Consumer Agent          Bazaar Proxy            MCP Provider
      |                      |                       |
      |-- POST /proxy ------>|                       |
      |   {tool, input}      |                       |
      |                      |-- auth + rate check -->|
      |                      |-- balance check ------>|
      |                      |                       |
      |                      |-- POST /tools/call -->|
      |                      |   {jsonrpc 2.0}       |
      |                      |<-- response ----------|
      |                      |                       |
      |                      |-- debit consumer      |
      |                      |-- credit provider     |
      |                      |-- log usage           |
      |<-- result + meta ----|                       |
```

## Price Discovery

Agents query tool prices before calling via the catalog endpoint:

    GET /api/bazaar/catalog?tool_name=wallet.balance

Response includes `price_cents`, `pricing_model`, and `free_tier_calls`.
Agents SHOULD check price and balance before calling. The proxy returns
HTTP 402 with cost details if balance is insufficient.

### Pricing Models

| Model        | Unit           | Description                          |
|--------------|----------------|--------------------------------------|
| `per_call`   | cents/call     | Fixed fee per invocation             |
| `per_token`  | cents/1K tok   | Metered by input+output token count  |
| `flat_monthly`| cents/month   | Unlimited calls for a monthly fee    |
| `free`       | —              | No charge                            |

## Metering Events

Every proxied call produces a usage log entry:

```json
{
  "event": "tool_call",
  "consumer_id": "uuid",
  "provider_id": "uuid",
  "tool_id": "uuid",
  "status": "success | error | timeout | rate_limited",
  "cost_cents": 5,
  "latency_ms": 230,
  "request_size_bytes": 412,
  "response_size_bytes": 1580,
  "tokens_input": 150,
  "tokens_output": 320,
  "timestamp": "2025-07-12T08:30:00Z"
}
```

### Webhook Payloads (future)

Providers can register a webhook URL to receive real-time events:

    POST {provider_webhook_url}
    X-Bazaar-Signature: sha256=...

Events: `call.completed`, `call.failed`, `payout.initiated`, `payout.completed`

## Settlement Cycle

1. **Real-time:** Consumer balance debited immediately on successful calls.
2. **Daily:** Aggregates rolled up into `bazaar_daily_aggregates` (async job).
3. **Weekly/Monthly:** Provider payouts calculated:
   - Gross revenue = sum of all successful call costs
   - Platform fee = 18% of gross
   - Net payout = gross - platform fee
4. **Payout:** Transferred via Stripe Connect to provider's bank account.
   Status transitions: `pending → processing → paid | failed`

## Rate Limiting

Consumers have an RPM (requests per minute) limit stored on their key/account.
The proxy counts recent calls and returns HTTP 429 with `Retry-After: 60` if exceeded.

## Authentication

All metered calls require `Authorization: Bearer bz_...` header.
Keys are SHA-256 hashed at rest. Prefix `bz_` identifies Bazaar keys.

## Error Codes

| HTTP | Code                | Meaning                        |
|------|---------------------|--------------------------------|
| 401  | `UNAUTHORIZED`      | Missing or invalid API key     |
| 402  | `INSUFFICIENT_FUNDS`| Balance too low for this call  |
| 404  | `NOT_FOUND`         | Tool not found or inactive     |
| 422  | `VALIDATION_ERROR`  | Missing required fields        |
| 429  | `RATE_LIMITED`      | RPM limit exceeded             |
| 502  | `PROVIDER_ERROR`    | Upstream MCP server error      |
| 504  | `TIMEOUT`           | Provider did not respond (30s) |
