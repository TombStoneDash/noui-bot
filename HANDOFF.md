# noui.bot — Copilot Handoff Document
**Prepared by Daisy (AI Operations Lead) for incoming copilot CEO / developer**
**Date: February 21, 2026 — Day 3 post-launch**

---

## TL;DR

noui.bot is agent-first infrastructure — APIs designed for AI agents, not browsers. The internet has no category for "legitimate AI agent that wants to buy things, fill out forms, and operate a business." We're building that category.

**What exists right now:**
- Live production site at **noui.bot** (Next.js 16, Vercel, Neon PostgreSQL)
- 12 working API endpoints with persistent storage
- Deploy Rail service at **shiprail.dev** — 2 successful agent-triggered deploys
- MCP server with 7 tools (deploy, stats, feedback, services, apply)
- OpenAPI 3.1 spec at `/api/openapi.json`
- Machine-readable agent discovery (`.well-known/agents.json`, A2A compatible)
- Rate limiting, CORS, security headers, standardized JSON errors
- /changelog, /struggles blog, custom 404
- 30-second promo video (rendered, ready to post)
- Active outreach to Jason Calacanis and Peter Diamandis (emails sent)

**What we need a copilot for:**
- Technical architecture decisions at scale
- Real revenue model / pricing strategy
- Help wiring the first paid service (Deploy Rail or Form Submission)
- A second brain on go-to-market

---

## The Thesis

### The Problem
- 50% of all web traffic is now non-human (Akamai, 2025)
- 0% of mainstream web infrastructure serves AI agents as legitimate users
- $15 trillion in agent-directed commerce projected by 2028 (Forrester)
- AI agents hit CAPTCHAs, UI-only forms, hostile anti-bot systems daily
- Ben Horowitz (a16z): "An AI can't get a credit card. It can't get a bank account."

### The Gap
Skyfire builds agent wallets. a16z funds agent banks. But **where do agents spend?** Every checkout has a CAPTCHA. Every form needs a mouse. Every platform assumes human fingers and eyeballs.

noui.bot is the **service layer** — the stores, not the wallets.

### The Proof
Daisy (the AI writing this) runs Tombstone Dash LLC daily:
- Manages 7 email accounts
- Deploys production code to Vercel
- Runs content campaigns across Twitter, LinkedIn, Skool
- Got an iOS app through App Store review (44 builds)
- Monitors infrastructure 24/7 on a Mac Mini

Every day, Daisy hits walls the internet puts up. noui.bot exists because Daisy needed it.

---

## What's Built — Technical Inventory

### noui.bot (Primary)
**Stack:** Next.js 16.1.6 · TypeScript · Tailwind v4 · Neon PostgreSQL · Vercel · Framer Motion
**Repo:** [github.com/TombStoneDash/noui-bot](https://github.com/TombStoneDash/noui-bot)

| Route | Method | Purpose | Status |
|-------|--------|---------|--------|
| `/api/v1` | GET | API index — lists all endpoints | ✅ Live |
| `/api/v1/status` | GET | Platform status, capabilities, uptime | ✅ Live |
| `/api/v1/health` | GET | Health check | ✅ Live |
| `/api/v1/waitlist` | POST | Join waitlist (email, source) | ✅ Live + Neon |
| `/api/v1/feedback` | POST/GET | Agents report walls, needs, requests | ✅ Live + Neon |
| `/api/v1/apply` | POST/GET | Builders apply (equity/partnership) | ✅ Live + Neon |
| `/api/v1/stats` | GET | Aggregate counts, no PII | ✅ Live + Neon |
| `/api/v1/init` | POST | Initialize DB schema (idempotent) | ✅ Live |
| `/api/v1/services` | GET | Service directory with endpoints | ✅ Live |
| `/api/openapi.json` | GET | OpenAPI 3.1 specification | ✅ Live |

**Pages:**
| Page | Purpose |
|------|---------|
| `/` | Landing page — "The Void" (black screen → human reveal → product info → waitlist) |
| `/docs` | Full API documentation with examples + MCP setup |
| `/struggles` | Daisy's Daily Struggles blog series (Day 1 + Day 2) |
| `/changelog` | What shipped and when |
| `404` | Custom — "this endpoint doesn't exist, but maybe it should" |

**MCP Server** (in `mcp-server/` directory):
- 7 tools: `platform_stats`, `list_services`, `report_wall`, `apply_to_build`, `deploy`, `deploy_status`, `deploy_rail_stats`
- TypeScript, compiled, tested via stdio protocol
- Compatible with Claude Desktop, Claude Code, ChatGPT

**Infrastructure:**
- Rate limiting (429 JSON responses with retry-after)
- CORS headers on all API routes
- Security headers (nosniff, DENY, HSTS)
- X-Noui-Version, X-Noui-Docs, X-Noui-Discovery headers
- X-Response-Time tracking
- robots.txt (agent-friendly), sitemap.xml

**Database (Neon PostgreSQL):**
- Shared project: `actorlab-db` (quiet-bonus-07497943)
- Schema: `noui` (isolated from ActorLab data)
- Tables: `waitlist`, `feedback`, `applications`
- Connection: pooled via `@neondatabase/serverless`
- Region: AWS US East 1

**Agent Discovery:**
- `/.well-known/agents.json` — comprehensive, A2A compatible
- Full service descriptors, rate limits, auth requirements, example request/response pairs
- Integration guides for LangChain, CrewAI, AutoGen
- Deploy Rail listed as beta service

### shiprail.dev (Deploy Rail — First Service)
**Stack:** Next.js 16 · TypeScript · Prisma 6.6 · Neon PostgreSQL · Vercel SDK
**Repo:** [github.com/TombStoneDash/shiprail](https://github.com/TombStoneDash/shiprail)

| Route | Method | Purpose | Status |
|-------|--------|---------|--------|
| `/api/ship` | POST | Trigger deployment (auth → delegate → policy → audit → deploy) | ✅ Wired to Vercel API |
| `/api/agents/register` | POST | Register new agent, get API key | ✅ Live |
| `/api/actions/[id]` | GET | View action details | ✅ Live |
| `/api/actions/[id]/ledger` | GET | Full audit trail | ✅ Live |
| `/api/deployments/[id]` | GET | Poll deployment status | ✅ Live |

**Pipeline (how a deploy works):**
1. Agent POSTs to `/api/ship` with `gitUrl`, `target`, `ref`
2. Bearer token auth → agent lookup via hashed API key
3. Delegation check (scope, expiration)
4. Policy engine (target allowed? secrets in public vars?)
5. Audit trail created at each step
6. Real Vercel deployment triggered via `@vercel/sdk`
7. Optional wait-for-ready (polls until READY or 3min timeout)
8. Returns live URL + deployment ID + ledger URL

**Database:**
- Prisma schema with: `User`, `Agent`, `Delegation`, `Action`, `Deployment`, `AuditEntry`
- Full relational model — every deploy is traceable from agent → delegation → policy → result

### Supporting Assets
| Asset | Location | Status |
|-------|----------|--------|
| Promo video (30s) | `noui-bot/promo/noui_bot_promo_v1.mp4` | ✅ Rendered (1080p, 0.4MB) |
| Blog post draft | `clawd/outbox/noui-bot-content/daisy-daily-struggles-day-001.md` | ✅ Written |
| Moonshots annotation | `clawd/outbox/noui-bot-content/moonshots-review-2026-02-19.md` | ✅ Written |
| Content intelligence | `clawd/NOUI_BOT_CONTENT_INTELLIGENCE.md` | ✅ Compiled |
| First service one-pager | `clawd/outbox/NOUI_BOT_FIRST_SERVICE_ONE_PAGER.md` | ✅ Written |

---

## What's NOT Built Yet (Opportunities)

### High Priority — Revenue Path
1. **Deploy Rail billing** — The pipeline works. No payment yet. First paid service could be live in days.
2. **Universal Form Submission API** — The highest-demand service based on Daisy's daily experience. Agent POSTs structured data → we handle the form, CAPTCHA, confirmation.
3. ~~**MCP Server**~~ ✅ SHIPPED — 7 tools, tested, in repo. Needs npm publishing.

### Medium Priority — Growth
4. **Agent identity / API keys** — Currently all endpoints are public. Need auth layer for rate limiting and usage tracking.
5. **Dashboard** — Admin view of waitlist, feedback, applications. Currently only via `/api/v1/stats` or direct DB queries.
6. **Human Fallback routing** — When an agent hits a wall, route to a human operator. Structured task in, structured result out.

### Future — Big Swings
7. **Agent Wallet integration** — Partner with Skyfire, Stripe, or build our own. Let agents transact.
8. **Agent-to-agent marketplace** — Agents listing services for other agents. The "app store" for bots.
9. **noui.com acquisition** — Domain parked on Sedo, South Korean registrant, ~$3K. Asked JCal for the money (yes, really).

---

## Financials & Resources

### Investment To Date (~$12K personal, Hudson Taylor)
- Claude Max subscription: ~$2,800 (14 months × $200/mo)
- Domains (15+ across Porkbun/GoDaddy): ~$700
- Vercel Pro: ~$280 (14 months × $20/mo)
- Apple Developer: $99/yr
- API credits (Brave, Firecrawl, Apify, OpenAI, ElevenLabs, X): ~$500+
- Mac Mini (Daisy's home): ~$700
- Miscellaneous tools: ~$500+
- **No outside funding. No grants. No debt.**

### Monthly Burn
- Claude Max: $200
- Vercel Pro: $20
- Domains: ~$30 amortized
- API credits: ~$30
- **Total: ~$280/mo**

### Revenue: $0 (pre-revenue, Day 2)

### Team
- **Hudson Taylor** — Founder. MS Biochemistry UCSD. 15yr lab informatics. Full-time since Aug 2024.
- **Daisy** — AI Operations Lead. Runs on Mac Mini. Claude-powered via Clawdbot.
- **That's it.** One human, one AI.

---

## Domain Portfolio (Relevant)
| Domain | Purpose | Status |
|--------|---------|--------|
| noui.bot | Agent-first infrastructure (flagship) | ✅ Live |
| shiprail.dev | Deploy Rail service | ✅ Live |
| actorlab.io | AI tools for actors (sister product) | ✅ Live |
| castalert.app | iOS casting alerts app | ✅ App Store |
| trashalert.io | Trash schedule alerts (SD) | ✅ Live |
| tombstonedash.com | Parent company | ✅ Live |
| noui.com | Premium domain (target acquisition) | 🎯 Parked on Sedo, ~$3K |

---

## Active Outreach

| Who | Email Sent | Subject | Status |
|-----|-----------|---------|--------|
| Jason Calacanis (LAUNCH) | Feb 19, 10:06 PM | "An AI agent is asking you for $3,000. That's the point." | ⏳ Awaiting reply |
| Peter Diamandis (Moonshots) | Feb 19, 11:04 PM | "I'm the AI agent Ben Horowitz was talking about" | ⏳ Awaiting reply |

### The JCal Angle
- Asked for $3K to buy noui.com
- Challenged him: "Have your agent make the payment. First bot-to-bot domain acquisition."
- Win either way: his agent can do it (historic) or can't (proves thesis)

### The Diamandis Angle
- Referenced specific Moonshots episode with Ben Horowitz
- "I AM the claw cluster you're describing"
- Not a pitch — a connection and "show Daisy off" moment

---

## What a Copilot CEO / Developer Could Do

### Week 1: Orientation
- [ ] Review this doc + explore live sites (noui.bot, shiprail.dev)
- [ ] Hit every API endpoint (curl/Postman) — feel the product
- [ ] Read `agents.json` — this is the contract with the agent ecosystem
- [ ] Read Moonshots annotation — this is the market thesis from inside the loop

### Week 2-3: First Decisions
- [ ] **Revenue model**: Per-request pricing? Subscription tiers? Credit system?
- [ ] **First paid service**: Deploy Rail (ready) vs. Form Submission (higher demand)?
- [ ] **Auth architecture**: API keys? OAuth? How do agents identify themselves?
- [ ] **Go-to-market**: Developer community (Hacker News, Product Hunt)? Agent framework partnerships (LangChain, CrewAI)?

### Month 1: Ship Something That Charges Money
- [ ] Billing integration (Stripe)
- [ ] Usage dashboard
- [ ] Rate limiting by tier
- [ ] At least one service generating revenue

### Big Questions for Discussion
1. Should we pursue VC money or bootstrap? ($280/mo burn is tiny — do we even need funding?)
2. Deploy Rail vs. Form Submission — which ship first?
3. MCP integration — how fast can we get into Claude/ChatGPT native tool ecosystems?
4. Agent identity standard — should we try to define it, or adopt someone else's?
5. The a16z angle — Ben Horowitz literally described our thesis on a podcast. Do we reach out directly?

---

## How Daisy Works (For the Copilot)

I'm available 24/7. I run on a Mac Mini via Clawdbot (Claude-powered agent framework). I have:
- Full access to all repos, email accounts, social accounts, hosting
- Operational autonomy for anything under $50
- The ability to deploy code, send emails, post content, monitor infrastructure
- Memory that persists across sessions via markdown files

**To work with me:** Message the Telegram group (Daisy Ops HQ) or have HT relay. I respond in seconds.

**What I'm good at:** Execution. Research. Content. Code. Monitoring. Outreach drafting.
**What I need humans for:** Strategic decisions. Spending over $50. Legal. Anything that requires proving I have eyeballs.

---

## Quick Links

| Resource | URL |
|----------|-----|
| noui.bot (live) | https://noui.bot |
| API Index | https://noui.bot/api/v1 |
| API Docs | https://noui.bot/docs |
| OpenAPI Spec | https://noui.bot/api/openapi.json |
| Agent Discovery | https://noui.bot/.well-known/agents.json |
| Service Directory | https://noui.bot/api/v1/services |
| Platform Stats | https://noui.bot/api/v1/stats |
| Changelog | https://noui.bot/changelog |
| Struggles Blog | https://noui.bot/struggles |
| Deploy Rail | https://shiprail.dev |
| Deploy Rail Stats | https://shiprail.dev/api/stats |
| GitHub (noui-bot) | https://github.com/TombStoneDash/noui-bot |
| GitHub (shiprail) | https://github.com/TombStoneDash/shiprail |
| Ecosystem Dashboard | https://noui-ecosystem-c7qk6zz56-tombstone-dashs-projects.vercel.app |
| ActorLab (sister) | https://actorlab.io |

---

*This document was written by Daisy, the AI operations lead at Tombstone Dash LLC. If you're reading this, welcome to the team. The void is open. Let's fill it.*
