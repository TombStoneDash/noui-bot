import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Bill an MCP tool in 5 minutes | noui.bot",
  description: "Register an MCP provider, meter calls, proxy agent requests, and verify signed receipts with the Bazaar SDK.",
};

export default function BillAnMCPToolPage() {
  return (
    <div className="min-h-screen bg-black text-white px-6 md:px-16 lg:px-24 py-16 max-w-4xl">
      <a href="/docs" className="font-mono text-xs text-white/30 hover:text-white/50 transition-colors">&larr; docs</a>
      <h1 className="font-mono text-2xl md:text-3xl font-bold mt-8 mb-2">Bill an MCP tool in 5 minutes</h1>
      <p className="text-white/40 font-mono text-sm mb-4">Register once, meter calls, and let Bazaar proxy handle agent billing.</p>
      <p className="text-white/30 font-mono text-xs mb-16">Estimated time: 5 minutes ~ Uses only the SDK and two HTTP endpoints</p>

      <div className="space-y-12">
        <Section title="1. Register your provider">
          <p className="text-white/60 text-sm leading-relaxed mb-4">Install <code>@forthebots/bazaar-sdk</code>, then register with your server endpoint. The SDK&apos;s <code>registerProvider</code> helper sends <code>POST /api/bazaar/register-provider</code>.</p>
          <Code>{`npm install @forthebots/bazaar-sdk

import { registerProvider } from '@forthebots/bazaar-sdk';

const provider = await registerProvider({
  name: 'Example MCP',
  email: 'you@example.com',
  endpoint_url: 'https://mcp.example.com',
});
// Response: { api_key: 'bz_provider_...', provider_id: '...' }
// Save once, then store the key in BAZAAR_API_KEY in your server environment.
console.log(provider.provider_id);`}</Code>
          <p className="text-white/40 text-xs mt-2">The key is shown once. Put the returned value in your deployment&apos;s environment settings; never commit it.</p>
        </Section>

        <Section title="2. List one priced tool">
          <p className="text-white/60 text-sm leading-relaxed mb-4">Create a client with the provider key, then call <code>tools.register</code>. The route accepts categories <code>weather</code>, <code>search</code>, <code>code</code>, <code>data</code>, <code>comms</code>, <code>finance</code>, <code>utility</code>, and <code>other</code>.</p>
          <Code>{`import { Bazaar } from '@forthebots/bazaar-sdk';

const client = new Bazaar({ apiKey: 'bz_provider_...' });
await client.tools.register([{
  tool_name: 'weather.current',
  description: 'Get current weather for a city',
  category: 'weather',
  price_cents_override: 2,
}]); // POST /api/bazaar/tools`}</Code>
        </Section>

        <Section title="3. Meter a call from your server">
          <p className="text-white/60 text-sm leading-relaxed mb-4"><code>meter.record</code> posts to <code>/api/v1/bazaar/meter</code>. The route reads <code>status</code>, <code>input_tokens</code>, and <code>output_tokens</code>, but the current SDK <code>MeterPayload</code> still types older <code>success</code> and <code>tokens_used</code> fields. Cast this route-shaped payload until that type is corrected.</p>
          <Code>{`const meterPayload = {
  tool_name: 'weather.current',
  duration_ms: 120,
  status: 'success',
  input_tokens: 24,
  output_tokens: 80,
};
const result = await client.meter.record(meterPayload as any) as any;
// HTTP 201 response shape:
// { metered: true, tool_id: '...', agent_id: '...', cost_microcents: 20000,
//   cost_cents: 2, status: 'success', timestamp: '...',
//   receipt: { receipt_id: 'rcpt_...', signature: '...', verify_url: 'https://noui.bot/api/v1/bazaar/receipts/<receipt_id>' } }
console.log(result.receipt.receipt_id, result.receipt.signature, result.receipt.verify_url);`}</Code>
        </Section>

        <Section title="4. Let agents call it through the billed proxy">
          <p className="text-white/60 text-sm leading-relaxed mb-4">Use the SDK helper or send the README&apos;s proxy request directly. The consumer key belongs to the agent caller; the JSON-RPC envelope is what Bazaar forwards to your MCP endpoint.</p>
          <Code>{`const response = await client.tools.call('weather.current', { city: 'Oakland' });
console.log(response.meta.cost_cents);

curl -X POST https://noui.bot/api/bazaar/proxy \
  -H "Authorization: Bearer bz_consumer_..." \
  -H "Content-Type: application/json" \
  -d '{"tool_name":"weather.current","input":{"city":"Oakland"}}'

# Forwarded to your MCP server per SPEC.md SS1:
# {"jsonrpc":"2.0","method":"tools/call","params":{"name":"weather.current","arguments":{"city":"Oakland"}},"id":"..."}`}</Code>
        </Section>

        <Section title="5. Prove the receipt">
          <p className="text-white/60 text-sm leading-relaxed mb-4">Fetch the stored receipt by ID, or paste the signed JSON envelope into the public verifier. Check <code>verification.valid</code> is <code>true</code>.</p>
          <Code>{`curl https://noui.bot/api/v1/bazaar/receipts/<receipt_id>

# Or POST the complete signed receipt JSON to /api/v1/verify:
curl -X POST https://noui.bot/api/v1/verify \
  -H "Content-Type: application/json" \
  -d '{"receipt":{"receipt_id":"<receipt_id>","tool_id":"<tool_id>","agent_id":"<agent_id>","provider_id":"<provider_id>","timestamp":"<timestamp>","cost_microcents":20000,"status":"success","signature":"<signature>"}}'
# Confirm the response contains verification.valid: true.`}</Code>
        </Section>

        <Section title="What you did not have to build">
          <ul className="list-disc pl-5 space-y-2 text-white/60 text-sm mb-6">
            <li>A metering store</li><li>Receipt signing</li><li>A verification endpoint</li><li>Balance checks</li>
          </ul>
          <div className="flex flex-wrap gap-4 text-cyan-400/70 text-sm">
            <a href="/spec" className="hover:text-cyan-300">Billing spec</a>
            <a href="/verify" className="hover:text-cyan-300">Verify a receipt</a>
            <a href="/docs/bazaar" className="hover:text-cyan-300">Bazaar API docs</a>
            <a href="/docs/guides/monetize-mcp-server" className="hover:text-cyan-300">Full MCP server guide</a>
          </div>
        </Section>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="font-mono text-lg text-white/80 mb-4">{title}</h2>
      {children}
    </section>
  );
}

function Code({ children }: { children: string }) {
  return (
    <pre className="bg-white/5 border border-white/10 rounded p-4 text-xs font-mono text-green-400/80 overflow-x-auto whitespace-pre-wrap">{children}</pre>
  );
}
