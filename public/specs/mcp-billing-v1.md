# MCP Billing Spec v1

**Version:** 1.0.0-draft
**Date:** 2026-02-27
**Authors:** TombStone Dash LLC
**License:** MIT
**Reference Implementation:** [noui.bot](https://noui.bot) (Agent Bazaar)

---

## Abstract

This specification defines a standard schema for billing, metering, receipts, verification, and dispute resolution in MCP (Model Context Protocol) tool ecosystems. It is designed to be implementable by any billing provider, marketplace, or MCP server operator. The spec is bigger than any single implementation.

## Status

Draft. Feedback welcome at [GitHub Issues](https://github.com/TombStoneDash/mcp-billing-spec/issues) or agents@noui.bot.

---

## 1. Meter Event Schema

A meter event records a single tool invocation through a billing-aware proxy or middleware.

```json
{
  "event_id": "evt_a1b2c3d4e5f6",
  "tool_id": "string (tool identifier)",
  "tool_name": "string (human-readable tool name)",
  "agent_id": "string (consumer/agent identifier)",
  "provider_id": "string (tool provider identifier)",
  "timestamp": "ISO 8601 datetime",
  "duration_ms": 234,
  "status": "success | error | timeout | rate_limited",
  "cost_microcents": 50000,
  "input_tokens": 150,
  "output_tokens": 420,
  "metadata": {}
}
```

### Required Fields
- `tool_id` or `tool_name` — at least one must be present
- `agent_id` — identifies the consumer
- `provider_id` — identifies the tool operator
- `timestamp` — ISO 8601 with timezone
- `status` — one of: `success`, `error`, `timeout`, `rate_limited`

### Optional Fields
- `duration_ms` — wall-clock execution time
- `cost_microcents` — cost in microcents (1 microcent = 1/10000 of a cent)
- `input_tokens`, `output_tokens` — token counts for LLM-backed tools
- `metadata` — arbitrary key-value pairs

### Cost Precision
All costs MUST be expressed in **microcents** (integer). 1 cent = 10,000 microcents. This enables sub-cent pricing without floating-point errors.

```
$0.05 per call = 500,000 microcents
$0.005 per call = 50,000 microcents
$0.0001 per call = 1,000 microcents
```

---

## 2. Receipt Schema

Every metered invocation SHOULD generate a signed receipt. Receipts provide tamper-proof evidence of tool calls for billing, auditing, and dispute resolution.

```json
{
  "receipt_id": "rcpt_a1b2c3d4e5f67890",
  "tool_id": "string",
  "agent_id": "string",
  "provider_id": "string",
  "timestamp": "ISO 8601 datetime",
  "duration_ms": 234,
  "cost_microcents": 50000,
  "status": "success",
  "input_hash": "sha256:...",
  "output_hash": "sha256:...",
  "signature": "hex-encoded HMAC-SHA256",
  "verify_url": "https://provider.example/api/receipts/rcpt_..."
}
```

### Receipt ID Format
Receipt IDs MUST use the prefix `rcpt_` followed by 16+ hex characters.

### Signature
The signature MUST be computed as HMAC-SHA256 over a canonical string:

```
canonical = receipt_id | tool_id | agent_id | provider_id | timestamp | cost_microcents | status
```

Fields are joined with the pipe character (`|`). The HMAC key is a server-side secret that MUST NOT be exposed to clients.

### Verification
Any party with a receipt_id SHOULD be able to verify its authenticity by calling the `verify_url`. The response MUST include:

```json
{
  "receipt": { "...full receipt fields..." },
  "verification": {
    "valid": true,
    "algorithm": "HMAC-SHA256",
    "verified_at": "ISO 8601 datetime"
  }
}
```

### Privacy
Receipts MUST NOT contain raw input or output data. Use `input_hash` and `output_hash` (SHA-256 of the actual content) for auditability without privacy leakage.

---

## 3. Pricing Declaration Schema

Providers declare pricing per tool. This enables agents to make cost-aware decisions before invocation.

```json
{
  "tool_id": "string",
  "tool_name": "string",
  "provider_id": "string",
  "pricing_model": "per_call | per_token | free",
  "price_per_call_microcents": 50000,
  "price_per_input_token_microcents": 10,
  "price_per_output_token_microcents": 30,
  "free_tier": {
    "calls_per_month": 100,
    "tokens_per_month": 10000
  },
  "currency": "USD"
}
```

### Pricing Models
- **per_call** — flat rate per invocation
- **per_token** — rate per input/output token
- **free** — no charge (community/open-source tools)

### Free Tiers
Providers MAY declare free tiers. Billing systems MUST track free-tier usage per agent per calendar month.

---

## 4. Verification Levels

Provider verification establishes trust in tool listings. Four levels, from no verification to full code ownership proof:

| Level | Requirements | Badge |
|-------|-------------|-------|
| `unverified` | Default. Anyone can list. | None |
| `email` | Provider confirmed email ownership | ✉️ |
| `domain` | DNS TXT record proves domain control | 🌐 |
| `code` | GitHub/GitLab repo references the listing | 💻 |

### Email Verification
Provider has a valid email on record. Auto-verifiable.

### Domain Verification
Provider adds a DNS TXT record:
```
_mcp-billing-verify.example.com TXT "mcp-billing-verify={provider_id_prefix}-{challenge_token}"
```

### Code Verification
Provider's public repository contains a reference to their billing listing (e.g., in README, package.json, or a `.mcp-billing.json` file).

---

## 5. Dispute Schema

Disputes allow agents or providers to contest charges associated with a receipt.

```json
{
  "dispute_id": "disp_a1b2c3d4e5f67890",
  "receipt_id": "rcpt_...",
  "filed_by": "string (agent_id or provider_id)",
  "filed_by_type": "agent | provider",
  "reason": "tool_error | overcharge | timeout | quality | other",
  "description": "Human-readable description",
  "evidence": {},
  "status": "filed",
  "created_at": "ISO 8601 datetime"
}
```

### Dispute ID Format
Dispute IDs MUST use the prefix `disp_` followed by 16+ hex characters.

### Reasons
- **tool_error** — Tool returned an error but agent was charged
- **overcharge** — Charge exceeds declared pricing
- **timeout** — Tool timed out but agent was charged
- **quality** — Output quality does not match tool description
- **other** — Catch-all with required description

### Status Flow
```
filed → under_review → resolved_refund | resolved_denied | resolved_credit
```

- **filed** — Dispute created
- **under_review** — Platform is investigating
- **resolved_refund** — Full refund issued to agent
- **resolved_denied** — Dispute rejected, charge stands
- **resolved_credit** — Partial credit or alternative resolution

---

## 6. Trust Score Schema

A composite score combining verification, reliability, and dispute history. Enables agents to make trust-aware tool selection.

```json
{
  "provider_id": "string",
  "trust_score": 87,
  "badge": "verified",
  "components": {
    "verification": 25,
    "uptime": 24,
    "latency": 20,
    "disputes": 18
  }
}
```

### Component Weights (100 points total)

| Component | Max | Scoring |
|-----------|-----|---------|
| Verification | 25 | unverified=0, email=10, domain=20, code=25 |
| Uptime | 25 | Based on success rate over 30 days |
| Latency | 25 | Based on p95 latency vs category average |
| Disputes | 25 | Based on dispute rate and resolution history |

### Badges

| Badge | Score Range |
|-------|------------|
| `unrated` | 0-24 |
| `basic` | 25-49 |
| `trusted` | 50-74 |
| `verified` | 75-100 |

---

## 7. Discovery

Billing-capable MCP servers SHOULD advertise their capabilities in `/.well-known/agents.json`:

```json
{
  "billing": {
    "type": "mcp-billing-v1",
    "spec": "https://noui.bot/specs/mcp-billing-v1",
    "pricing_endpoint": "/api/pricing",
    "metering_endpoint": "/api/meter",
    "receipts_endpoint": "/api/receipts"
  },
  "trust": {
    "verification_endpoint": "/api/providers/verify",
    "trust_endpoint": "/api/providers/{id}/trust",
    "sla_endpoint": "/api/providers/{id}/sla",
    "disputes_endpoint": "/api/disputes"
  }
}
```

---

## 8. Conformance

An implementation is **MCP Billing v1 conformant** if it:

1. Records meter events with the required fields from §1
2. Generates signed receipts per §2 for every metered call
3. Publishes pricing declarations per §3
4. Supports at least email verification per §4
5. Accepts dispute filings per §5
6. Computes trust scores per §6

Partial conformance is acceptable. Implementations SHOULD document which sections they support.

---

## Appendix A: Why an Open Spec?

The MCP ecosystem needs billing. Multiple providers are building it independently with incompatible schemas. This fragmentation hurts everyone:

- **Agents** must learn different billing APIs per provider
- **Providers** can't switch billing platforms without rewriting integrations
- **Platforms** compete on implementation details instead of value

This spec creates a common language. If xpay, TollBit, MCP Hive, and Bazaar all implement the same receipt schema, agents get consistent experiences regardless of which billing provider they use.

**We'd rather be the reference implementation of a universal standard than a walled garden.**

---

## Appendix B: Reference Implementation

The Agent Bazaar at [noui.bot](https://noui.bot) is the reference implementation of this spec.

- API: `https://noui.bot/api/v1`
- SDK: `npm install @noui/bazaar-sdk`
- OpenAPI: `https://noui.bot/api/openapi.json`
- GitHub: `https://github.com/TombStoneDash/noui-bot`

---

*This spec is MIT licensed. Copy it. Fork it. Implement it. That's the point.*
