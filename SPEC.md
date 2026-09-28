# MCP Billing Spec v0.1

**Version:** 0.1.0
**Date:** 2026-09-21
**Authors:** TombStone Dash LLC
**License:** MIT
**Reference Implementation:** [noui.bot](https://noui.bot) (Agent Bazaar)

---

## SS1 Billing envelope

Source: `src/app/api/bazaar/proxy/route.ts`.

`POST /api/bazaar/proxy` requires an authenticated consumer. The request body is `{tool_id|tool_name, input}`: provide `tool_id` or `tool_name`, plus `input`. If both identifiers are supplied, `tool_id` takes precedence. The route forwards `input` as the tool arguments.

The success response is `{result, meta:{tool, provider, cost_cents, cost, latency_ms, remaining_balance_cents}}`. `result` is `mcpResponse.result || mcpResponse`; `tool` is the tool name and `provider` is the provider name. `cost_cents` is the actual cost; `cost` is `"Free"` for zero, otherwise `$` followed by `(actualCost / 100).toFixed(4)`. `latency_ms` is elapsed time, and `remaining_balance_cents` is `(owner.balance_cents ?? 0) - actualCost`.

Success responses and upstream failure responses carry these headers:

| Header | Value |
| --- | --- |
| `X-Bazaar-Cost` | `String(actualCost)` |
| `X-Bazaar-Provider` | `provider.name` |
| `X-Bazaar-Latency` | `String(latencyMs)` |
| `X-Bazaar-Tool` | `tool.tool_name` |
| `X-Bazaar-Retried` | `"true"`, present only after a retry |

Errors use `{error:true, code, message, ...}`:

| Code | HTTP status | Condition and additional fields |
| --- | --- | --- |
| `UNAUTHORIZED` | 401 | Missing, invalid, or non-consumer key; `docs: "https://noui.bot/docs/bazaar"` |
| `BAD_REQUEST` | 400 | Invalid JSON |
| `VALIDATION_ERROR` | 422 | Missing tool identifier or `input` |
| `RATE_LIMITED` | 429 | Consumer rate limit exceeded; `retry_after_seconds: 60`, header `Retry-After: 60` |
| `NOT_FOUND` | 404 | Tool not found or inactive |
| `UNAVAILABLE` | 503 | Provider inactive |
| `INSUFFICIENT_FUNDS` | 402 | Balance below positive price; `cost_cents`, `balance_cents` |
| `PROXY_TIMEOUT` | 504 | Provider timeout; `tool`, `provider`, `latency_ms`, `cost_cents` |
| `PROVIDER_ERROR` | 502 | Upstream failure, invalid JSON, or other call error; `tool`, `provider`, `latency_ms`, `cost_cents` |

The upstream request is an HTTP `POST` containing JSON-RPC 2.0: `{jsonrpc:"2.0", method:"tools/call", params:{name:tool.tool_name, arguments:input}, id:crypto.randomUUID()}`. Headers are `Content-Type: application/json`, `X-Bazaar-Consumer: owner.id`, and `X-Bazaar-Tool: tool.tool_name`. Each attempt has a 10-second timeout. An HTTP 5xx response triggers one retry after 1 second.

The price is `tool.price_cents_override ?? provider.default_price_cents ?? 0`. Only `status === "success"` has a nonzero actual cost, and the balance is debited only when that cost is positive. The route sets success when the upstream HTTP response is successful and its body parses as JSON; it does not separately inspect JSON-RPC errors.

## SS2 Metering event

Source: `src/app/api/v1/bazaar/meter/route.ts`, including its `bazaar_usage_logs` insert. Stored receipt statuses come from the CHECK constraint in `sql/004_trust_layer.sql`.

`POST /api/v1/bazaar/meter` requires an authenticated provider or consumer key. Its body fields and defaults are:

| Field | Route interpretation and default |
| --- | --- |
| `tool_id` | String; required if no `tool_name`; takes precedence if both are provided |
| `tool_name` | String; required if no `tool_id` |
| `agent_id` | String; `body.agent_id || owner.id` |
| `status` | String; `body.status || "success"` |
| `duration_ms` | Number; `body.duration_ms || 0` |
| `input_tokens` | Number; `body.input_tokens || 0` |
| `output_tokens` | Number; `body.output_tokens || 0` |
| `metadata` | Object; `body.metadata || {}` |

These are JavaScript truthiness defaults and TypeScript casts, not runtime type validation. The stored receipt status enum is `success|error|timeout|rate_limited`; the meter route itself does not validate that enum before inserting.

The route looks up an active tool. The resolved tool ID is `tool?.id || toolId || "unknown"`; the provider ID is `tool?.provider_id || (owner.type === "provider" ? owner.id : "unknown")`. Price is `tool?.price_cents_override ?? tool?.bazaar_providers?.default_price_cents ?? 0`.

The usage insert maps `agent_id` to `consumer_id`, includes `provider_id` and resolved `tool_id`, and records `status`. `cost_cents` is the price only for `status === "success"`, otherwise zero. `duration_ms` becomes `latency_ms`; `input_tokens` and `output_tokens` become `request_size_bytes` and `response_size_bytes`. Stored `metadata` spreads the supplied metadata, then overwrites `source` with `"meter_api"` and `input_tokens` and `output_tokens` with their defaulted values.

The HTTP 201 response is `{metered, tool_id, agent_id, cost_microcents, cost_cents, status, timestamp, receipt:{receipt_id, signature, verify_url}}`, with `metered: true` and a generated ISO timestamp. `cost_microcents` is `(status === "success" ? priceCents : 0) * 100`. The response's `cost_cents` is always `priceCents`, including on failed calls; it can therefore differ from the usage insert's zero cost. Receipt persistence failure is logged but does not fail the meter response.

## SS3 Signed receipt

Sources: `src/lib/receipts.ts`, the `bazaar_receipts` table in `sql/004_trust_layer.sql`, and the meter route's receipt insert and verification URL.

| Field | Representation |
| --- | --- |
| `receipt_id` | `rcpt_` followed by 16 lowercase hexadecimal characters |
| `tool_id` | String |
| `tool_name` | Optional string; nullable in storage |
| `agent_id` | String |
| `provider_id` | String |
| `timestamp` | ISO 8601 timestamp |
| `duration_ms` | Optional integer; nullable in storage |
| `cost_microcents` | Integer (`BIGINT` in storage) |
| `status` | `success`, `error`, `timeout`, or `rate_limited` |
| `input_hash` | Optional string; nullable in storage |
| `output_hash` | Optional string; nullable in storage |
| `signature` | 64-character lowercase hexadecimal HMAC-SHA256 signature |
| `verify_url` | `https://noui.bot/api/v1/bazaar/receipts/{receipt_id}`, constructed by the meter route, not a table column |

Canonical string: `receipt_id|tool_id|agent_id|provider_id|timestamp|cost_microcents|status`

`signReceipt` joins those field values in exactly that order with `|`, using `cost_microcents.toString()`. It computes HMAC-SHA256 over that string with the signing secret and encodes the result as hex. `verifyReceipt` recomputes the signature and compares it with `===`. Optional fields and `verify_url` are not signed.

The public verification endpoint today is `GET /api/v1/bazaar/receipts/{receipt_id}`. As implemented in `src/app/api/v1/bazaar/receipts/[receiptId]/route.ts`, it returns `{receipt, verification:{valid, algorithm:"HMAC-SHA256", verified_at}}`. The returned `receipt` contains `receipt_id`, `tool_id`, `tool_name`, `agent_id`, `provider_id`, `timestamp`, `duration_ms`, `cost_microcents`, `status`, `signature`, and `created_at`. It does not return `input_hash`, `output_hash`, or `verify_url`. `verified_at` is an ISO timestamp.

### Example receipt

This fixed development fixture is generated by `tests/fixtures/generate-receipt-fixtures.mjs` using the real signer and its committed development fallback.

```json
{
  "receipt_id": "rcpt_0123456789abcdef",
  "tool_id": "b0771337-b070-4000-b001-000000000001",
  "tool_name": "wallet.balance",
  "agent_id": "agent_fixture",
  "provider_id": "b0771337-b070-4000-a000-000000000001",
  "timestamp": "2026-09-21T00:00:00.000Z",
  "duration_ms": 42,
  "cost_microcents": 500,
  "status": "success",
  "signature": "ebfbeca8e4fa6d83596d2e4a261c81ad0494d25f68e81be765fe60e1e19bd26b",
  "verify_url": "https://noui.bot/api/v1/bazaar/receipts/rcpt_0123456789abcdef"
}
```

## SS4 Implementation notes

The current meter, pricing, and stats routes use `cost_microcents = cost_cents * 100` (including the corresponding per-call pricing and aggregate revenue fields). In contrast, `public/specs/mcp-billing-v1.md` says 1 cent = 10,000 microcents. This discrepancy is documented here without changing the current conversion.

The meter route stores stringified token counts in `input_hash` and `output_hash`, rather than SHA-256 digests: `inputTokens ? String(inputTokens) : null` and `outputTokens ? String(outputTokens) : null`. Both discrepancies are out of scope to change in this specification job because changes to these billing semantics would alter billed amounts; the current conversion and token-count storage are preserved.

## SS5 Relationship to the v1 draft

`public/specs/mcp-billing-v1.md` is the broader aspirational draft. MCP Billing Spec v0.1 documents the strictly implemented subset in the current routes, receipt signer, and receipt table, including their present behavior and discrepancies; it does not imply implementation of the wider v1 draft.
