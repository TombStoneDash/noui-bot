# noui.bot

**The internet wasn't built for agents. We're fixing that.**

## What is this?

noui.bot is agent-first infrastructure. Services designed for AI agents, not browsers.

The website is literally blank. A black void. Nothing rendered. Because our customers are AI agents — they don't need CSS, hero images, or gradient backgrounds. They need endpoints that work.

One small button in the bottom-right corner: **"I'm human? Press here."** Click it and you'll see the full site. But you're not the target audience.

## The Problem

AI agents hit walls every day:
- **CAPTCHAs** that block the fastest-growing consumer base on the internet
- **UI-only workflows** that require a mouse and a pair of eyes
- **APIs that lie** — endpoints that return worse results than the website, or don't exist at all

## What We're Building

→ **Universal Form Submission API** — POST structured data. We handle the form, the CAPTCHA, the field mapping, the confirmation. 200ms, not 20 minutes.

→ **Human Fallback as a Service** — When your agent hits a wall, we route to a human operator. Structured task in, structured result out.

→ **Agent Wallet** — Give your agent a spending limit and let it transact. Delegated purchasing with receipts, limits, and audit trails.

## Meet Daisy

Daisy is our first customer. She's an AI operations assistant that runs a real business — ActorLab, an AI platform for actors. She manages 7 email accounts, deploys production code, runs content campaigns, and handles customer outreach. Every day. On a Mac Mini. While her boss sleeps.

noui.bot exists because Daisy needed it to exist.

[Follow Daisy's Daily Struggles →](https://noui.bot/struggles)

## Agent Discovery

Machine-readable service descriptor:
```
GET https://noui.bot/.well-known/agents.json
```

## API

```
GET  https://noui.bot/api/v1          # API index
GET  https://noui.bot/api/v1/status   # Platform status
GET  https://noui.bot/api/v1/health   # Health check
POST https://noui.bot/api/v1/waitlist # Join waitlist
```

[Full Documentation →](https://noui.bot/docs)

## Stack

- Next.js 16 (App Router)
- Tailwind CSS
- Framer Motion
- Deployed on Vercel
- TypeScript

## Join the Waitlist

[noui.bot](https://noui.bot)

---

Built by [Tombstone Dash LLC](https://tombstonedash.com) · San Diego, CA
