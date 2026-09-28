# noui.bot

**The commerce layer for AI agents.** Billing, metering, and tool discovery for MCP servers.

→ [noui.bot](https://noui.bot) · [spec](https://noui.bot/spec) · [docs](https://noui.bot/docs/bazaar) · [catalog](https://noui.bot/api/bazaar/catalog) · [SDK](https://github.com/TombStoneDash/noui-bot/tree/main/packages/bazaar-sdk) · [changelog](https://noui.bot/changelog)

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

<!-- CATALOG:BEGIN -->
**Live catalog:** 62 tools · 8 providers · 10% platform fee · Sub-cent metering · Stripe Connect payouts

_Generated from [the public catalog](<https://noui.bot/api/bazaar/catalog>) on 2026-09-25 UTC._

| Provider | Verified | Tool count | Tools |
|---|:---:|---:|---|
| AutoScrape US Business Registry Evidence | No | 40 | <code>&#95;&#95;schema&#95;probe&#95;do&#95;not&#95;create&#95;&#95;</code>, <code>check&#95;broken&#95;links</code>, <code>check&#95;http&#95;status</code>, <code>decode&#95;nhtsa&#95;vins</code>, <code>enrich&#95;website&#95;company</code>, <code>extract&#95;schema&#95;markup</code>, <code>extract&#95;sitemap&#95;urls</code>, <code>get&#95;stock&#95;chart</code>, <code>lookup&#95;cslb&#95;contractor&#95;license</code>, <code>lookup&#95;us&#95;tariff&#95;hts&#95;codes</code>, <code>scan&#95;website&#95;tech&#95;stack</code>, <code>screen&#95;ofac&#95;sdn&#95;sanctions</code>, <code>search&#95;bankruptcy&#95;filings</code>, <code>search&#95;building&#95;permits</code>, <code>search&#95;business&#95;entities</code>, <code>search&#95;cms&#95;nursing&#95;homes</code>, <code>search&#95;congress&#95;stock&#95;trades</code>, <code>search&#95;courtlistener&#95;legal&#95;opinions</code>, <code>search&#95;dallas&#95;county&#95;property&#95;tax</code>, <code>search&#95;dol&#95;form&#95;5500&#95;plans</code>, <code>search&#95;dol&#95;h1b&#95;lca</code>, <code>search&#95;fda&#95;510k&#95;clearances</code>, <code>search&#95;federal&#95;court&#95;dockets</code>, <code>search&#95;federal&#95;register&#95;documents</code>, <code>search&#95;fmcsa&#95;carrier&#95;safety</code>, <code>search&#95;hmda&#95;mortgage&#95;data</code>, <code>search&#95;irs&#95;990&#95;nonprofits</code>, <code>search&#95;nhtsa&#95;vehicle&#95;complaints</code>, <code>search&#95;nj&#95;ucc&#95;liens</code>, <code>search&#95;npi&#95;registry</code>, <code>search&#95;osha&#95;workplace&#95;inspections</code>, <code>search&#95;sam&#95;gov&#95;contract&#95;opportunities</code>, <code>search&#95;sec&#95;edgar&#95;filings</code>, <code>search&#95;sec&#95;form&#95;13f&#95;holdings</code>, <code>search&#95;sec&#95;form&#95;8k&#95;events</code>, <code>search&#95;sec&#95;form&#95;d&#95;filings</code>, <code>search&#95;sunbiz&#95;florida&#95;new&#95;business&#95;filings</code>, <code>validate&#95;email&#95;addresses</code>, <code>validate&#95;phone&#95;numbers</code>, <code>whois&#95;lookup</code> |
| BotWall3t | Yes | 3 | <code>access&#46;verify</code>, <code>wallet&#46;balance</code>, <code>wallet&#46;transfer</code> |
| Deploy Rail | No | 3 | <code>deploy&#46;create</code>, <code>deploy&#46;stats</code>, <code>deploy&#46;status</code> |
| Nous Research MCP Server | No | 3 | <code>Business Decomposer</code>, <code>Fresh Markets Watch</code>, <code>GasRoute Oracle</code> |
| OpenCode MCP | No | 5 | <code>code&#46;analyze</code>, <code>data&#46;convert</code>, <code>text&#46;process</code>, <code>util&#46;timestamp</code>, <code>util&#46;uuid</code> |
| Sentinel MCP | Yes | 4 | <code>monitor&#46;health</code>, <code>news&#46;scan</code>, <code>web&#46;extract</code>, <code>web&#46;search</code> |
| Test Provider Walkthrough | No | 1 | <code>test&#95;weather</code> |
| quant&#45;mcp&#45;tools | No | 3 | <code>get&#95;correlation&#95;matrix</code>, <code>get&#95;volatility&#95;analysis</code>, <code>validate&#95;trade&#95;constraints</code> |
<!-- CATALOG:END -->

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
3. **Get paid:** Connect Stripe, earn 90% of every call
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

## Key Pages

| Page | Description |
|------|-------------|
| [/get-started](https://noui.bot/get-started) | Developer quick start (5 steps) |
| [/providers](https://noui.bot/providers) | Public provider catalog |
| [/providers/register](https://noui.bot/providers/register) | Register as a provider |
| [/marketplace](https://noui.bot/marketplace) | Browse all tools |
| [/pricing](https://noui.bot/pricing) | Tiered pricing (Free / Builder / Scale) |
| [/dashboard](https://noui.bot/dashboard) | Developer usage dashboard |
| [/docs/compare](https://noui.bot/docs/compare) | vs MCPize, xpay, TollBit, MCP Hive |
| [/specs/mcp-billing-v1](https://noui.bot/specs/mcp-billing-v1) | Open MCP billing spec (MIT) |
| [/blog](https://noui.bot/blog) | 15 posts on MCP billing, agent infrastructure |

## Also Included

- **MCP Server** — `@forthebots/mcp-server` for Claude/ChatGPT integration
- **Agent Discovery** — `/.well-known/agents.json` (A2A compatible)
- **Open Billing Spec** — MIT licensed, portable, no lock-in

## Links

- **Docs:** [noui.bot/docs/bazaar](https://noui.bot/docs/bazaar)
- **SDK:** [@forthebots/bazaar-sdk](https://www.npmjs.com/package/@forthebots/bazaar-sdk) (v0.1.2)
- **OpenAPI:** [noui.bot/api/openapi.json](https://noui.bot/api/openapi.json)
- **Comparison:** [noui.bot/docs/compare](https://noui.bot/docs/compare)
- **agents.json:** [noui.bot/.well-known/agents.json](https://noui.bot/.well-known/agents.json)

## Built By

[Tombstone Dash LLC](https://tombstonedash.com) · San Diego, CA

One human. One AI. Building the commerce layer for the agent economy.
