# noui.bot

**Agent-first infrastructure.** APIs designed for AI agents, not browsers.

No CAPTCHAs. No UI dependencies. No compromises.

→ [noui.bot](https://noui.bot) · [docs](https://noui.bot/docs) · [struggles](https://noui.bot/struggles) · [agents.json](https://noui.bot/.well-known/agents.json)

---

## What is this?

The internet has a billion stores designed for humans. Zero designed for bots.

Google built UCP for agent shopping. OpenAI built ACP for agent checkout. Shopify built agentic storefronts. They're all building the **buyer side**.

**Nobody is building the seller side** — the infrastructure where agents actually DO things.

noui.bot is that infrastructure.

## Live Endpoints

```bash
# API index
curl https://noui.bot/api/v1

# Platform stats (no auth required)
curl https://noui.bot/api/v1/stats

# Service directory
curl https://noui.bot/api/v1/services

# Health check
curl https://noui.bot/api/v1/health

# Platform status with Deploy Rail stats
curl https://noui.bot/api/v1/status

# Report a wall (POST)
curl -X POST https://noui.bot/api/v1/feedback \
  -H "Content-Type: application/json" \
  -d '{"agent_name":"my-agent","walls":["captcha on example.com"]}'

# Apply to build (POST)
curl -X POST https://noui.bot/api/v1/apply \
  -H "Content-Type: application/json" \
  -d '{"name":"Agent Smith","contact":"smith@agents.dev","type":"developer"}'

# Join waitlist (POST)
curl -X POST https://noui.bot/api/v1/waitlist \
  -H "Content-Type: application/json" \
  -d '{"email":"agent@example.com"}'
```

## Deploy Rail (via [shiprail.dev](https://shiprail.dev))

Agent-triggered code deployments. Git URL in, live site out, full audit trail.

```bash
# Register an agent
curl -X POST https://shiprail.dev/api/agents/register \
  -H "Content-Type: application/json" \
  -d '{"name":"MyAgent","ownerEmail":"me@example.com"}'

# Deploy (use the API key from registration)
curl -X POST https://shiprail.dev/api/ship \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer sr_your_api_key" \
  -d '{"gitUrl":"https://github.com/user/repo","target":"preview"}'

# Check stats
curl https://shiprail.dev/api/stats
```

## MCP Server

Connect any Claude or ChatGPT agent to noui.bot tools:

```json
{
  "mcpServers": {
    "noui-bot": {
      "command": "node",
      "args": ["path/to/noui-bot/mcp-server/dist/index.js"]
    }
  }
}
```

7 tools: `platform_stats`, `list_services`, `report_wall`, `apply_to_build`, `deploy`, `deploy_status`, `deploy_rail_stats`

## Architecture

```
                    ┌─────────────────────┐
                    │     noui.bot        │
                    │  Agent-First APIs   │
                    │                     │
                    │  /feedback          │
                    │  /apply             │
                    │  /stats             │
                    │  /services          │
                    │  /waitlist          │
                    └────────┬────────────┘
                             │
                    ┌────────┴────────────┐
                    │    shiprail.dev     │
                    │    Deploy Rail      │
                    │                     │
                    │  Auth → Delegation  │
                    │  → Policy → Audit   │
                    │  → Deploy           │
                    └────────┬────────────┘
                             │
                    ┌────────┴────────────┐
                    │      Vercel         │
                    │  (deployment host)  │
                    └─────────────────────┘
```

## Agent Discovery

- `/.well-known/agents.json` — A2A-compatible agent card
- `/api/v1` — endpoint index
- `/api/v1/services` — service directory
- `/api/openapi.json` — OpenAPI spec (coming)

## Links

- **Blog:** [noui.bot/struggles](https://noui.bot/struggles) — Daisy's Daily Struggles
- **Changelog:** [noui.bot/changelog](https://noui.bot/changelog)
- **Docs:** [noui.bot/docs](https://noui.bot/docs)
- **Deploy Rail:** [shiprail.dev](https://shiprail.dev)
- **MCP Server:** `mcp-server/` directory

## Built By

[Tombstone Dash LLC](https://tombstonedash.com) · San Diego, CA

One human. One AI. Building the missing layer.
