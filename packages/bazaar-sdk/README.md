# @noui/bazaar-sdk

TypeScript SDK for the [noui.bot Agent Bazaar](https://noui.bot/docs/bazaar) — billing, metering, and tool proxy for MCP servers.

One API key. Thousands of tools. Sub-cent precision.

## Install

```bash
npm install @noui/bazaar-sdk
```

## Quick Start

```typescript
import { Bazaar } from '@noui/bazaar-sdk';

const client = new Bazaar({ apiKey: 'bz_your_consumer_key' });

// Discover tools
const { tools } = await client.catalog.list();
console.log(`${tools.length} tools available`);

// Call a tool (metered + billed automatically)
const result = await client.tools.call('wallet.balance', {
  wallet_address: '0xAgent1',
  chain: 'base',
});
console.log(result.result);           // Tool output
console.log(result.meta.cost_cents);  // What it cost
console.log(result.meta.latency_ms);  // How long it took

// Check usage
const usage = await client.usage.summary();
console.log(`Total spend: ${usage.total_spend}`);
```

## For Providers

```typescript
import { Bazaar, registerProvider } from '@noui/bazaar-sdk';

// 1. Register your MCP server
const { api_key } = await registerProvider({
  name: 'My Weather Tools',
  email: 'dev@example.com',
  endpoint_url: 'https://my-server.com/mcp',
  description: 'Real-time weather data for agents',
});

// 2. Use your provider key
const provider = new Bazaar({ apiKey: api_key });

// 3. Register your tools
await provider.tools.register([
  { tool_name: 'get_weather', description: 'Current weather', price_cents_override: 1 },
  { tool_name: 'get_forecast', description: '7-day forecast', price_cents_override: 2 },
]);

// 4. Check your earnings
const earnings = await provider.provider.summary();
console.log(`Net earnings: $${(earnings.net_earnings_cents / 100).toFixed(2)}`);

// 5. Connect Stripe for payouts
const { url } = await provider.provider.connectStripe('https://my-site.com/success');
console.log(`Complete onboarding: ${url}`);
```

## For Consumers (Agent Developers)

```typescript
import { Bazaar, registerConsumer } from '@noui/bazaar-sdk';

// 1. Register and get an API key
const { api_key } = await registerConsumer({
  name: 'My AI Agent',
  email: 'dev@example.com',
});

// 2. Create client
const client = new Bazaar({ apiKey: api_key });

// 3. Browse the catalog
const { tools } = await client.catalog.list();
tools.forEach(t => {
  console.log(`${t.tool_name} — ${t.pricing.price}/call`);
});

// 4. Call tools
const result = await client.tools.call('wallet.balance', { wallet: '0x...' });

// 5. Check balance
const { balance } = await client.balance.get();
console.log(`Remaining: ${balance}`);

// 6. Load more funds
const { url } = await client.balance.load(1000); // $10.00
```

## MCP Middleware Integration

If you're building an MCP server and want to integrate Bazaar metering:

```typescript
import { Bazaar } from '@noui/bazaar-sdk';

const bazaar = new Bazaar({ apiKey: 'bz_your_provider_key' });

// After each tool invocation, record it
await bazaar.meter.record({
  tool_name: 'my_tool',
  duration_ms: 150,
  tokens_used: 500,
  success: true,
});
```

## API Reference

### `new Bazaar(config)`

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `apiKey` | `string` | required | Your Bazaar API key (`bz_...`) |
| `baseUrl` | `string` | `https://noui.bot` | API base URL |
| `timeout` | `number` | `30000` | Request timeout (ms) |
| `fetch` | `Function` | `globalThis.fetch` | Custom fetch implementation |

### Methods

| Method | Auth | Description |
|--------|------|-------------|
| `client.catalog.list()` | No | List all tools with pricing |
| `client.catalog.pricing()` | No | Detailed pricing per tool |
| `client.tools.call(name, input)` | Consumer | Call a tool through the proxy |
| `client.tools.register(tools)` | Provider | Register/update your tools |
| `client.usage.list(opts?)` | Any | Usage history |
| `client.usage.summary(period?)` | Any | Aggregated usage stats |
| `client.balance.get()` | Consumer | Check balance |
| `client.balance.load(cents)` | Consumer | Add funds via Stripe |
| `client.stats.get()` | No | Public platform metrics |
| `client.provider.summary(period?)` | Provider | Earnings breakdown |
| `client.provider.connectStripe(url)` | Provider | Start Stripe Connect |
| `client.provider.connectStatus()` | Provider | Check Connect status |
| `client.provider.payout()` | Provider | Trigger payout ($10 min) |
| `client.provider.payoutHistory()` | Provider | Payout records |
| `client.meter.record(payload)` | Any | Record tool invocation |

### Static Functions

| Function | Description |
|----------|-------------|
| `registerProvider(payload)` | Register MCP server (no auth) |
| `registerConsumer(payload)` | Get consumer API key (no auth) |

## Error Handling

```typescript
import { Bazaar, BazaarError } from '@noui/bazaar-sdk';

try {
  await client.tools.call('nonexistent_tool');
} catch (err) {
  if (err instanceof BazaarError) {
    console.log(err.status);  // 404
    console.log(err.code);    // "TOOL_NOT_FOUND"
    console.log(err.message); // "Tool not found"
  }
}
```

## Pricing

- **Platform fee:** 18% on paid calls
- **Free tools:** No fees
- **Free tier:** 100 calls per tool (default)
- **Precision:** Sub-cent (microcents = 1/10000 of a cent)
- **Minimum payout:** $10.00
- **Payout method:** Stripe Connect (Express)

## Links

- [Documentation](https://noui.bot/docs/bazaar)
- [API Reference](https://noui.bot/api/openapi.json)
- [Tool Catalog](https://noui.bot/api/bazaar/catalog)
- [Register as Provider](https://noui.bot/providers/register)
- [Register as Developer](https://noui.bot/developers/register)
- [GitHub](https://github.com/TombStoneDash/noui-bot)

## License

MIT © [Tombstone Dash LLC](https://tombstonedash.com)
