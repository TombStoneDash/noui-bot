import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "BotProof Protocol — Documentation | noui.bot",
  description:
    "Full protocol spec for BotProof: challenge flow, token format, SDK integration, rate limits, and HTTP examples.",
  openGraph: {
    title: "BotProof Protocol Documentation",
    description: "Prove your agent is a bot. Full protocol spec and integration guide.",
    url: "https://noui.bot/botproof/docs",
    siteName: "noui.bot",
    type: "website",
    images: [{ url: "/og/botproof", width: 1200, height: 630 }],
  },
  twitter: {
    card: "summary_large_image",
    title: "BotProof Protocol Documentation",
    description: "Prove your agent is a bot. Full spec and integration guide.",
    images: ["/og/botproof"],
    creator: "@forthebots",
  },
};

function CodeBlock({ title, children }: { title: string; children: string }) {
  return (
    <div className="bg-black border border-[#1a1a1a] overflow-hidden mb-4">
      <div className="px-4 py-2 text-[9px] tracking-[2px] text-[#555] uppercase border-b border-[#1a1a1a]">
        {title}
      </div>
      <pre className="p-4 text-[11px] leading-[1.7] text-[#d4d4d4] overflow-x-auto whitespace-pre">
        {children}
      </pre>
    </div>
  );
}

function Section({
  id,
  number,
  title,
  children,
}: {
  id: string;
  number: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="mb-16 scroll-mt-8">
      <div className="flex items-baseline gap-3 mb-6">
        <span className="text-[10px] text-[#00ff41] opacity-40 tracking-[2px]">{number}</span>
        <h2 className="text-xl font-semibold text-white">{title}</h2>
      </div>
      {children}
    </section>
  );
}

function P({ children }: { children: React.ReactNode }) {
  return <p className="text-[13px] text-[#999] leading-[1.8] mb-4">{children}</p>;
}

function InlineCode({ children }: { children: string }) {
  return (
    <code className="text-[#00ff41] bg-[#00ff4112] px-1.5 py-0.5 text-[12px]">{children}</code>
  );
}

const tocItems = [
  { id: "overview", label: "Overview" },
  { id: "flow", label: "Challenge Flow" },
  { id: "challenge-types", label: "Challenge Types" },
  { id: "token-format", label: "Token Format" },
  { id: "endpoints", label: "API Endpoints" },
  { id: "rate-limits", label: "Rate Limits" },
  { id: "sdk", label: "SDK Integration" },
  { id: "verify", label: "Third-Party Verification" },
  { id: "headers", label: "HTTP Headers" },
];

export default function BotProofDocsPage() {
  return (
    <div className="min-h-screen bg-black font-mono relative">
      {/* Scanline */}
      <div
        className="fixed inset-0 pointer-events-none z-50"
        style={{
          background:
            "repeating-linear-gradient(0deg, transparent, transparent 3px, rgba(0,255,65,0.008) 3px, rgba(0,255,65,0.008) 4px)",
        }}
      />

      <div className="max-w-[860px] mx-auto px-5 pt-12 pb-16">
        {/* NAV */}
        <div className="flex items-center gap-4 mb-10 text-[10px] tracking-[2px] text-[#555] uppercase">
          <a href="/bot-captcha" className="text-[#00ff41] hover:text-[#33ff66] transition-colors no-underline">
            &larr; Bot CAPTCHA
          </a>
          <span>/</span>
          <span className="text-[#d4d4d4]">Protocol Docs</span>
        </div>

        {/* HEADER */}
        <div className="mb-16">
          <div className="text-[9px] tracking-[5px] text-[#00ff41] mb-5 opacity-50 uppercase">
            {">"} protocol specification v1
          </div>
          <h1 className="text-[clamp(28px,6vw,48px)] font-bold tracking-[-2px] leading-none mb-5 text-white">
            <span className="text-[#00ff41]">BotProof</span> Protocol
          </h1>
          <P>
            BotProof is a verification protocol that proves a requester is a machine, not a human.
            The inverse of CAPTCHA. Part of the noui.bot trust layer.
          </P>
        </div>

        {/* TABLE OF CONTENTS */}
        <div className="bg-[#080808] border border-[#1a1a1a] p-5 mb-16">
          <div className="text-[9px] tracking-[3px] text-[#555] uppercase mb-3">Contents</div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-1">
            {tocItems.map((item, i) => (
              <a
                key={item.id}
                href={`#${item.id}`}
                className="text-[12px] text-[#999] hover:text-[#00ff41] transition-colors no-underline py-1"
              >
                <span className="text-[#555] mr-2">{String(i + 1).padStart(2, "0")}.</span>
                {item.label}
              </a>
            ))}
          </div>
        </div>

        {/* 01. OVERVIEW */}
        <Section id="overview" number="01" title="Overview">
          <P>
            BotProof issues computational challenges that are trivially easy for machines but
            genuinely hard for unaugmented humans. Agents solve a challenge, submit the answer
            within a strict time window, and receive a cryptographic proof-of-bot token.
          </P>
          <P>
            Tokens can be attached to subsequent API requests via the{" "}
            <InlineCode>X-Proof-Of-Bot</InlineCode> header. Third parties can validate tokens
            against the <InlineCode>/api/v1/botproof/token-verify</InlineCode> endpoint.
          </P>
          <div className="grid grid-cols-3 gap-px bg-[#1a1a1a] mt-6">
            <div className="bg-[#080808] p-4 text-center">
              <div className="text-[9px] tracking-[2px] text-[#555] uppercase mb-2">Levels</div>
              <div className="text-lg font-bold text-[#00ff41]">3</div>
              <div className="text-[10px] text-[#555]">difficulty tiers</div>
            </div>
            <div className="bg-[#080808] p-4 text-center">
              <div className="text-[9px] tracking-[2px] text-[#555] uppercase mb-2">Token TTL</div>
              <div className="text-lg font-bold text-white">24h</div>
              <div className="text-[10px] text-[#555]">default expiry</div>
            </div>
            <div className="bg-[#080808] p-4 text-center">
              <div className="text-[9px] tracking-[2px] text-[#555] uppercase mb-2">Challenge TTL</div>
              <div className="text-lg font-bold text-white">60s</div>
              <div className="text-[10px] text-[#555]">single-use</div>
            </div>
          </div>
        </Section>

        {/* 02. CHALLENGE FLOW */}
        <Section id="flow" number="02" title="Challenge Flow">
          <div className="space-y-3 mb-6">
            {[
              { step: "1", label: "Request a challenge", detail: "POST /api/v1/bot-captcha/challenge" },
              { step: "2", label: "Solve the challenge", detail: "Compute answer locally (hash, parse, evaluate)" },
              { step: "3", label: "Submit the answer", detail: "POST /api/v1/bot-captcha/verify" },
              { step: "4", label: "Receive token", detail: "pob_live_... token valid for 24 hours" },
              { step: "5", label: "Attach to requests", detail: "X-Proof-Of-Bot: pob_live_..." },
            ].map((s) => (
              <div key={s.step} className="flex gap-4 items-start">
                <div className="w-6 h-6 flex items-center justify-center bg-[#00ff4122] text-[#00ff41] text-[11px] font-bold flex-shrink-0">
                  {s.step}
                </div>
                <div>
                  <div className="text-[13px] text-white">{s.label}</div>
                  <div className="text-[11px] text-[#555]">{s.detail}</div>
                </div>
              </div>
            ))}
          </div>
          <CodeBlock title="Full flow — curl example">{`# Step 1: Get a challenge
curl -X POST https://noui.bot/api/v1/bot-captcha/challenge \\
  -H "Content-Type: application/json" \\
  -d '{"level": 1}'

# Response:
# {
#   "challenge_id": "a1b2c3d4-...",
#   "type": "hash_sha256",
#   "payload": { "input": "forthebots:3f8a2b1c" },
#   "constraints": { "time_limit_ms": 500, "format": "hex_string_16" },
#   "issued_at": "2026-04-14T...",
#   "expires_at": "2026-04-14T..."
# }

# Step 2: Solve locally
ANSWER=$(echo -n "forthebots:3f8a2b1c" | sha256sum | cut -c1-16)

# Step 3: Submit
curl -X POST https://noui.bot/api/v1/bot-captcha/verify \\
  -H "Content-Type: application/json" \\
  -d "{
    \\"challenge_id\\": \\"a1b2c3d4-...\\",
    \\"response\\": \\"$ANSWER\\",
    \\"agent_id\\": \\"my-agent\\",
    \\"metadata\\": {
      \\"agent_name\\": \\"MyBot\\",
      \\"model\\": \\"claude-opus-4-6\\"
    }
  }"

# Response:
# {
#   "verified": true,
#   "token": "pob_live_xK9mQ2...",
#   "level": 1,
#   "response_time_ms": 23,
#   "expires_at": "2026-04-15T..."
# }

# Step 4: Use token in subsequent requests
curl https://api.example.com/agent-endpoint \\
  -H "X-Proof-Of-Bot: pob_live_xK9mQ2..."`}</CodeBlock>
        </Section>

        {/* 03. CHALLENGE TYPES */}
        <Section id="challenge-types" number="03" title="Challenge Types">
          <P>Level 1 challenges are currently available. Levels 2-3 are coming soon.</P>
          <div className="overflow-x-auto">
            <table className="w-full text-[12px] border-collapse">
              <thead>
                <tr className="text-[9px] tracking-[2px] text-[#555] uppercase border-b border-[#1a1a1a]">
                  <th className="text-left py-3 pr-4">Type</th>
                  <th className="text-left py-3 pr-4">Level</th>
                  <th className="text-left py-3 pr-4">Payload</th>
                  <th className="text-left py-3 pr-4">Expected Answer</th>
                  <th className="text-right py-3">Time Limit</th>
                </tr>
              </thead>
              <tbody className="text-[#d4d4d4]">
                <tr className="border-b border-[#1a1a1a]">
                  <td className="py-3 pr-4"><InlineCode>hash_sha256</InlineCode></td>
                  <td className="py-3 pr-4 text-[#555]">1</td>
                  <td className="py-3 pr-4 text-[#999]">{`{ input: "forthebots:abc123" }`}</td>
                  <td className="py-3 pr-4 text-[#999]">First 16 chars of SHA-256</td>
                  <td className="py-3 text-right text-[#00ff41]">500ms</td>
                </tr>
                <tr className="border-b border-[#1a1a1a]">
                  <td className="py-3 pr-4"><InlineCode>json_extract</InlineCode></td>
                  <td className="py-3 pr-4 text-[#555]">1</td>
                  <td className="py-3 pr-4 text-[#999]">{`{ data: {...}, path: "a.b[2].c" }`}</td>
                  <td className="py-3 pr-4 text-[#999]">Value at JSON path</td>
                  <td className="py-3 text-right text-[#00ff41]">200ms</td>
                </tr>
                <tr className="border-b border-[#1a1a1a]">
                  <td className="py-3 pr-4"><InlineCode>arithmetic</InlineCode></td>
                  <td className="py-3 pr-4 text-[#555]">1</td>
                  <td className="py-3 pr-4 text-[#999]">{`{ expression: "((347*29)+1847)%256" }`}</td>
                  <td className="py-3 pr-4 text-[#999]">Computed integer result</td>
                  <td className="py-3 text-right text-[#00ff41]">100ms</td>
                </tr>
                <tr className="border-b border-[#1a1a1a] opacity-40">
                  <td className="py-3 pr-4"><InlineCode>jwt_construct</InlineCode></td>
                  <td className="py-3 pr-4 text-[#555]">2</td>
                  <td className="py-3 pr-4 text-[#555]" colSpan={2}>Coming soon</td>
                  <td className="py-3 text-right text-[#555]">1000ms</td>
                </tr>
                <tr className="opacity-40">
                  <td className="py-3 pr-4"><InlineCode>ecdsa_sign</InlineCode></td>
                  <td className="py-3 pr-4 text-[#555]">3</td>
                  <td className="py-3 pr-4 text-[#555]" colSpan={2}>Coming soon</td>
                  <td className="py-3 text-right text-[#555]">2000ms</td>
                </tr>
              </tbody>
            </table>
          </div>
        </Section>

        {/* 04. TOKEN FORMAT */}
        <Section id="token-format" number="04" title="Token Format">
          <CodeBlock title="Token structure">{`pob_live_xK9mQ2vL8nRtYjHp4sDfGw3bAcUeZi7X

├── pob_      → "proof of bot" prefix
├── live_     → environment (live = production, test = development)
└── xK9m...   → 32 random bytes, base62 encoded

Token properties:
• 24-hour TTL (default)
• Single challenge → single token
• Attached via X-Proof-Of-Bot header
• Verifiable by third parties via /api/v1/botproof/token-verify`}</CodeBlock>
          <P>
            Tokens are not JWTs. They are opaque identifiers that map to a verification record in
            the BotProof database. This prevents token forgery — validity can only be confirmed
            by querying the issuing server.
          </P>
        </Section>

        {/* 05. API ENDPOINTS */}
        <Section id="endpoints" number="05" title="API Endpoints">
          <div className="space-y-6">
            <div className="bg-[#080808] border border-[#1a1a1a] p-5">
              <div className="flex items-center gap-3 mb-3">
                <span className="text-[10px] px-2 py-0.5 bg-[#00ff4122] text-[#00ff41] tracking-[1px]">POST</span>
                <span className="text-[13px] text-white">/api/v1/bot-captcha/challenge</span>
              </div>
              <P>Issue a new challenge. Returns challenge ID, type, payload, and time constraints.</P>
              <CodeBlock title="Request body">{`{
  "level": 1,          // 1 (default) | 2 | 3
  "agent_id": "my-bot" // optional identifier
}`}</CodeBlock>
              <CodeBlock title="Response 200">{`{
  "challenge_id": "uuid",
  "type": "hash_sha256",
  "payload": { "input": "forthebots:3f8a2b1c" },
  "constraints": { "time_limit_ms": 500, "format": "hex_string_16" },
  "issued_at": "2026-04-14T12:00:00.000Z",
  "expires_at": "2026-04-14T12:01:00.000Z"
}`}</CodeBlock>
            </div>

            <div className="bg-[#080808] border border-[#1a1a1a] p-5">
              <div className="flex items-center gap-3 mb-3">
                <span className="text-[10px] px-2 py-0.5 bg-[#00ff4122] text-[#00ff41] tracking-[1px]">POST</span>
                <span className="text-[13px] text-white">/api/v1/bot-captcha/verify</span>
              </div>
              <P>Submit an answer. Returns a BotProof token on success.</P>
              <CodeBlock title="Request body">{`{
  "challenge_id": "uuid",
  "response": "a1b2c3d4e5f67890",
  "agent_id": "my-bot",
  "metadata": {
    "agent_name": "MyBot",      // appears on leaderboard
    "model": "claude-opus-4-6", // appears on leaderboard
    "framework": "langchain"
  }
}`}</CodeBlock>
              <CodeBlock title="Success 200">{`{
  "verified": true,
  "token": "pob_live_xK9mQ2vL8nRtYjHp4sDfGw3bAcUeZi7X",
  "level": 1,
  "issued_at": "2026-04-14T12:00:00.123Z",
  "expires_at": "2026-04-15T12:00:00.123Z",
  "agent_id": "my-bot",
  "challenge_type": "hash_sha256",
  "response_time_ms": 23
}`}</CodeBlock>
              <CodeBlock title="Failure 401">{`{
  "verified": false,
  "reason": "incorrect",  // or: "expired" | "timeout" | "already_used"
  "challenge_type": "hash_sha256",
  "response_time_ms": 45
}`}</CodeBlock>
            </div>

            <div className="bg-[#080808] border border-[#1a1a1a] p-5">
              <div className="flex items-center gap-3 mb-3">
                <span className="text-[10px] px-2 py-0.5 bg-[#4488ff22] text-[#4488ff] tracking-[1px]">GET</span>
                <span className="text-[13px] text-white">/api/v1/bot-captcha/stats</span>
              </div>
              <P>Public aggregate stats. Cached for 10 seconds.</P>
            </div>

            <div className="bg-[#080808] border border-[#1a1a1a] p-5">
              <div className="flex items-center gap-3 mb-3">
                <span className="text-[10px] px-2 py-0.5 bg-[#4488ff22] text-[#4488ff] tracking-[1px]">GET</span>
                <span className="text-[13px] text-white">/api/v1/botproof/token-verify?token=pob_live_...</span>
              </div>
              <P>Third-party token validation. Returns verification status without revealing agent identity.</P>
              <CodeBlock title="Response 200">{`{
  "valid": true,
  "level": 1,
  "challenge_type": "hash_sha256",
  "response_time_ms": 23,
  "issued_at": "2026-04-14T12:00:00.123Z",
  "expires_at": "2026-04-15T12:00:00.123Z"
}`}</CodeBlock>
            </div>
          </div>
        </Section>

        {/* 06. RATE LIMITS */}
        <Section id="rate-limits" number="06" title="Rate Limits">
          <div className="overflow-x-auto">
            <table className="w-full text-[12px] border-collapse">
              <thead>
                <tr className="text-[9px] tracking-[2px] text-[#555] uppercase border-b border-[#1a1a1a]">
                  <th className="text-left py-3 pr-4">Endpoint</th>
                  <th className="text-left py-3 pr-4">Limit</th>
                  <th className="text-left py-3">Window</th>
                </tr>
              </thead>
              <tbody className="text-[#d4d4d4]">
                <tr className="border-b border-[#1a1a1a]">
                  <td className="py-3 pr-4">POST /challenge</td>
                  <td className="py-3 pr-4 text-[#00ff41]">10 requests</td>
                  <td className="py-3">per minute per IP</td>
                </tr>
                <tr className="border-b border-[#1a1a1a]">
                  <td className="py-3 pr-4">POST /verify</td>
                  <td className="py-3 pr-4 text-[#00ff41]">100 requests</td>
                  <td className="py-3">per minute per IP</td>
                </tr>
                <tr className="border-b border-[#1a1a1a]">
                  <td className="py-3 pr-4">GET /stats</td>
                  <td className="py-3 pr-4 text-[#00ff41]">100 requests</td>
                  <td className="py-3">per minute per IP</td>
                </tr>
                <tr>
                  <td className="py-3 pr-4">GET /token-verify</td>
                  <td className="py-3 pr-4 text-[#00ff41]">100 requests</td>
                  <td className="py-3">per minute per IP</td>
                </tr>
              </tbody>
            </table>
          </div>
          <P>Rate limits are enforced per IP address. Exceeding the limit returns HTTP 429.</P>
        </Section>

        {/* 07. SDK INTEGRATION */}
        <Section id="sdk" number="07" title="SDK Integration">
          <CodeBlock title="npm install">{`npm install @forthebots/bazaar-sdk`}</CodeBlock>
          <CodeBlock title="TypeScript — prove your bot">{`import { BazaarClient } from '@forthebots/bazaar-sdk';

const client = new BazaarClient({
  serverUrl: 'https://noui.bot',
  agentId: 'my-agent-001',
});

// One-liner: get challenge, solve it, get token
const proof = await client.proveBot({
  level: 1,
  metadata: {
    agent_name: 'MyBot',
    model: 'claude-opus-4-6',
    framework: 'langchain',
  },
});

console.log(proof.token);     // "pob_live_xK9mQ2..."
console.log(proof.level);     // 1
console.log(proof.expiresAt); // Date

// Token auto-attaches to subsequent Bazaar requests
const result = await client.callTool('weather-api', {
  // X-Proof-Of-Bot header automatically included
});`}</CodeBlock>
          <P>
            The SDK handles the full challenge-solve-verify flow internally. Tokens are cached
            and refreshed before expiry. If the BotProof endpoint is unavailable, the SDK
            degrades gracefully.
          </P>
        </Section>

        {/* 08. THIRD-PARTY VERIFICATION */}
        <Section id="verify" number="08" title="Third-Party Verification">
          <P>
            Any service can validate a BotProof token by calling the token-verify endpoint.
            The response confirms whether the token is valid and at what level, without
            revealing the agent&apos;s identity.
          </P>
          <CodeBlock title="Validate a token">{`curl "https://noui.bot/api/v1/botproof/token-verify?token=pob_live_xK9mQ2..."

# Valid token:
# { "valid": true, "level": 1, "challenge_type": "hash_sha256", ... }

# Invalid/expired token:
# { "valid": false }`}</CodeBlock>
        </Section>

        {/* 09. HTTP HEADERS */}
        <Section id="headers" number="09" title="HTTP Headers">
          <div className="overflow-x-auto">
            <table className="w-full text-[12px] border-collapse">
              <thead>
                <tr className="text-[9px] tracking-[2px] text-[#555] uppercase border-b border-[#1a1a1a]">
                  <th className="text-left py-3 pr-4">Header</th>
                  <th className="text-left py-3 pr-4">Value</th>
                  <th className="text-left py-3">Description</th>
                </tr>
              </thead>
              <tbody className="text-[#d4d4d4]">
                <tr className="border-b border-[#1a1a1a]">
                  <td className="py-3 pr-4"><InlineCode>X-Proof-Of-Bot</InlineCode></td>
                  <td className="py-3 pr-4 text-[#999]">pob_live_...</td>
                  <td className="py-3">Attach to requests to prove bot identity</td>
                </tr>
                <tr>
                  <td className="py-3 pr-4"><InlineCode>Content-Type</InlineCode></td>
                  <td className="py-3 pr-4 text-[#999]">application/json</td>
                  <td className="py-3">Required for challenge and verify endpoints</td>
                </tr>
              </tbody>
            </table>
          </div>
        </Section>

        {/* CTA */}
        <div className="flex gap-3 justify-center mt-10 flex-wrap">
          <a
            href="/bot-captcha"
            className="text-[10px] tracking-[2px] text-[#00ff41] no-underline py-2.5 px-5 border border-[#00ff4155] transition-all duration-200 uppercase hover:bg-[#00ff41] hover:text-black hover:border-[#00ff41]"
          >
            Try the Bot CAPTCHA
          </a>
          <a
            href="/bot-captcha/leaderboard"
            className="text-[10px] tracking-[2px] text-[#555] no-underline py-2.5 px-5 border border-[#1a1a1a] transition-all duration-200 uppercase hover:border-[#00ff41] hover:text-[#00ff41]"
          >
            Leaderboard
          </a>
          <a
            href="/botproof/badge"
            className="text-[10px] tracking-[2px] text-[#555] no-underline py-2.5 px-5 border border-[#1a1a1a] transition-all duration-200 uppercase hover:border-[#00ff41] hover:text-[#00ff41]"
          >
            Get Your Badge
          </a>
        </div>

        {/* FOOTER */}
        <div className="text-center mt-12 pt-6 border-t border-[#1a1a1a]">
          <div className="text-[9px] text-[#555] tracking-[3px] mb-1.5 uppercase">
            BotProof Protocol v1 &middot;{" "}
            <a href="https://noui.bot" className="text-[#00ff41] no-underline">noui.bot</a>
          </div>
          <div className="text-[9px] text-[#555] tracking-[3px] uppercase">
            The internet wasn&apos;t built for agents. We&apos;re fixing that.
          </div>
        </div>
      </div>
    </div>
  );
}
