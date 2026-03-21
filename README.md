# noui.bot

**The commerce layer for AI agents.** Billing, metering, and tool discovery for MCP servers.

→ [noui.bot](https://noui.bot) · [docs](https://noui.bot/docs/bazaar) · [catalog](https://noui.bot/api/bazaar/catalog) · [SDK](https://github.com/TombStoneDash/noui-bot/tree/main/packages/bazaar-sdk) · [changelog](https://noui.bot/changelog)

---

## The Problem

There are 10,000+ MCP servers. Most are hobby-quality because developers can't earn from them. Agents can discover tools but can't pay for them. There's no commerce layer.

## The Solution: Agent Bazaar

A billing proxy that sits between agents and MCP servers. Providers set pricing, agents pre-fund balance, every call is metered with sub-cent precision.

```bash
# 1. Discover tools (no auth required)
curl https://noui.bot/api/bazaar/catalog

# 2. Call any tool through the billing proxy
curl -X POST https://noui.bot/api/bazaar/proxy \
  -H "Authorization: Bearer bz_your_key" \
  -d '{"tool_name":"wallet.balance","input":{"wallet":"0xAgent1"}}'

# 3. Check your usage
curl https://noui.bot/api/v1/bazaar/usage/summary \
  -H "Authorization: Bearer bz_your_key"
```

**Live now:** 6 tools · 2 providers · 10% platform fee · Sub-cent metering · Stripe Connect payouts

## TypeScript SDK

```bash
npm install @forthebots/bazaar-sdk
```

```typescript
import { Bazaar } from '@forthebots/bazaar-sdk';

const client = new Bazaar({ apiKey: 'bz_your_key' });

// Discover tools
const { tools } = await client.catalog.list();

// Call a tool (metered + billed)
const result = await client.tools.call('wallet.balance', { wallet: '0x...' });
console.log(result.meta.cost_cents); // $0.05

// Check balance
const { balance } = await client.balance.get();
```

## For MCP Server Providers

Turn your MCP server into a revenue stream in 2 minutes:

1. **Register:** [noui.bot/providers/register](https://noui.bot/providers/register) or `POST /api/bazaar/register-provider`
2. **Add tools:** `POST /api/bazaar/tools` with pricing
3. **Get paid:** Connect Stripe, earn 82% of every call
4. **Monitor:** [noui.bot/providers/dashboard](https://noui.bot/providers/dashboard)

```bash
# Register
curl -X POST https://noui.bot/api/bazaar/register-provider \
  -H "Content-Type: application/json" \
  -d '{"name":"My Tools","email":"dev@example.com","endpoint_url":"https://my-server.com/mcp"}'
# Returns: { "api_key": "bz_abc123..." }
```

## For Agent Developers

One API key for thousands of tools:

1. **Register:** [noui.bot/developers/register](https://noui.bot/developers/register) or `POST /api/bazaar/register-consumer`
2. **Browse:** `GET /api/bazaar/catalog`
3. **Call:** `POST /api/bazaar/proxy` — metered, billed, retried on 5xx
4. **Monitor:** [noui.bot/developers/dashboard](https://noui.bot/developers/dashboard)

## API Endpoints

### Public (no auth)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/bazaar/catalog` | Tool catalog with pricing |
| GET | `/api/v1/bazaar/stats` | Platform dashboard metrics |
| GET | `/api/v1/bazaar/pricing` | Per-tool pricing details |
| GET | `/api/v1` | API index (v0.3.0) |
| GET | `/api/v1/health` | Health check |
| GET | `/api/openapi.json` | OpenAPI 3.1 spec |

### Registration (no auth)
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/bazaar/register-provider` | Register MCP server |
| POST | `/api/bazaar/register-consumer` | Get consumer API key |

### Authenticated (Bearer bz_...)
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/bazaar/proxy` | Call a tool (metered + billed) |
| POST | `/api/bazaar/tools` | Register/update tools (provider) |
| POST | `/api/v1/bazaar/meter` | Record invocation (MCP middleware) |
| GET | `/api/v1/bazaar/balance` | Check balance (consumer) |
| GET | `/api/v1/bazaar/usage` | Usage history |
| GET | `/api/v1/bazaar/usage/summary` | Aggregated usage stats |
| POST | `/api/bazaar/billing/provider-summary` | Provider earnings |
| POST | `/api/bazaar/balance/load` | Add funds via Stripe |
| POST | `/api/bazaar/payouts` | Trigger payout ($10 min) |
| POST | `/api/bazaar/connect` | Stripe Connect onboarding |

## Architecture

```
  Agent                    noui.bot                     MCP Server
    │                         │                              │
    │  POST /bazaar/proxy     │                              │
    │  { tool, input }        │                              │
    │────────────────────────>│                              │
    │                         │  Validate key + balance      │
    │                         │  Forward to provider         │
    │                         │─────────────────────────────>│
    │                         │                              │
    │                         │  Tool result                 │
    │                         │<─────────────────────────────│
    │                         │                              │
    │                         │  Meter call                  │
    │                         │  Deduct balance              │
    │                         │  Credit provider             │
    │                         │                              │
    │  { result, meta }       │                              │
    │  X-Bazaar-Cost: $0.05   │                              │
    │  X-Bazaar-Latency: 150ms│                              │
    │<────────────────────────│                              │
```

## Pricing Model

| Feature | Details |
|---------|---------|
| Platform fee | 10% on paid calls |
| Free tools | No fees |
| Free tier | 100 calls/tool (configurable) |
| Precision | Sub-cent (microcents = 1/10000¢) |
| Minimum payout | $10.00 |
| Payout method | Stripe Connect (Express) |

## Also Included

- **Deploy Rail** — Agent-triggered deployments via [shiprail.dev](https://shiprail.dev)
- **MCP Server** — 7 tools for direct Claude/ChatGPT integration
- **Agent Discovery** — `/.well-known/agents.json` (A2A compatible)
- **Blog** — [Daisy's Daily Struggles](https://noui.bot/struggles)

## Links

- **Docs:** [noui.bot/docs/bazaar](https://noui.bot/docs/bazaar)
- **SDK:** [packages/bazaar-sdk](https://github.com/TombStoneDash/noui-bot/tree/main/packages/bazaar-sdk)
- **OpenAPI:** [noui.bot/api/openapi.json](https://noui.bot/api/openapi.json)
- **Changelog:** [noui.bot/changelog](https://noui.bot/changelog)
- **agents.json:** [noui.bot/.well-known/agents.json](https://noui.bot/.well-known/agents.json)

## Built By

[Tombstone Dash LLC](https://tombstonedash.com) · San Diego, CA

One human. One AI. Building the commerce layer for the agent economy.
