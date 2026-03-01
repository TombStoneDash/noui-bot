/**
 * @forthebots/bazaar-sdk — TypeScript SDK for the noui.bot Agent Bazaar
 *
 * Billing, metering, and tool proxy for MCP servers.
 * One API key. Thousands of tools. Sub-cent precision.
 *
 * @example
 * ```ts
 * import { Bazaar } from '@forthebots/bazaar-sdk';
 *
 * const client = new Bazaar({ apiKey: 'bz_consumer_...' });
 * const tools = await client.catalog.list();
 * const result = await client.tools.call('wallet.balance', { wallet: '0x...' });
 * const usage = await client.usage.summary();
 * ```
 */

// ─── Types ──────────────────────────────────────────────────────────

export interface BazaarConfig {
  /** Your Bazaar API key (bz_...) */
  apiKey: string;
  /** Base URL (default: https://noui.bot) */
  baseUrl?: string;
  /** Request timeout in ms (default: 30000) */
  timeout?: number;
  /** Custom fetch implementation */
  fetch?: typeof globalThis.fetch;
}

export interface Tool {
  id: string;
  tool_name: string;
  description: string | null;
  category: string | null;
  provider: {
    id: string;
    name: string;
    endpoint_url: string;
  } | null;
  pricing: {
    price: string;
    price_microcents: number;
    free_tier_remaining: number | null;
    free_tier_limit: number;
  };
  stats: {
    total_calls: number;
    avg_response_time_ms: number | null;
  };
}

export interface CatalogResponse {
  tools: Tool[];
  total: number;
  timestamp: string;
}

export interface ProxyResult {
  result: unknown;
  meta: {
    cost_cents: number;
    latency_ms: number;
    provider: string;
    remaining_balance_cents: number;
    tool_name: string;
    invocation_id?: string;
  };
}

export interface UsageSummary {
  total_calls: number;
  total_spend_cents: number;
  total_spend: string;
  calls_by_tool: Record<string, number>;
  calls_by_day: Record<string, number>;
  top_tools: Array<{ tool_name: string; calls: number; spend_cents: number }>;
  period: string;
}

export interface UsageRecord {
  id: string;
  tool_name: string;
  cost_cents: number;
  duration_ms: number;
  success: boolean;
  created_at: string;
}

export interface BalanceInfo {
  balance_cents: number;
  balance: string;
  consumer_id: string;
}

export interface PricingInfo {
  tools: Array<{
    tool_name: string;
    provider: string;
    price_cents: number;
    price: string;
    free_tier_limit: number;
    free_tier_remaining: number | null;
    category: string | null;
  }>;
  total: number;
}

export interface StatsInfo {
  total_tool_invocations: number;
  successful_calls: number;
  unique_agents: number;
  unique_tools: number;
  tools_listed: number;
  providers: number;
  total_revenue: string;
  avg_response_time_ms: number;
  timestamp: string;
}

export interface ProviderSummary {
  gross_revenue_cents: number;
  platform_fee_cents: number;
  net_earnings_cents: number;
  total_calls: number;
  by_tool: Array<{
    tool_name: string;
    calls: number;
    gross_cents: number;
    net_cents: number;
  }>;
  period: string;
}

export interface MeterPayload {
  tool_name: string;
  duration_ms?: number;
  tokens_used?: number;
  success?: boolean;
  consumer_id?: string;
  metadata?: Record<string, unknown>;
}

export interface RegisterProviderPayload {
  name: string;
  email: string;
  endpoint_url: string;
  description?: string;
}

export interface RegisterConsumerPayload {
  name: string;
  email: string;
  use_case?: string;
}

export interface RegisterToolPayload {
  tool_name: string;
  description?: string;
  category?: string;
  price_cents_override?: number;
}

export class BazaarError extends Error {
  constructor(
    message: string,
    public status: number,
    public code?: string,
    public details?: unknown,
  ) {
    super(message);
    this.name = "BazaarError";
  }
}

// ─── Client ─────────────────────────────────────────────────────────

export class Bazaar {
  private baseUrl: string;
  private apiKey: string;
  private timeout: number;
  private _fetch: typeof globalThis.fetch;

  /** Tool catalog — discovery and pricing */
  public catalog: CatalogAPI;
  /** Tool proxy — call any tool through the Bazaar */
  public tools: ToolsAPI;
  /** Usage tracking — calls, spend, history */
  public usage: UsageAPI;
  /** Balance management */
  public balance: BalanceAPI;
  /** Platform stats (public, no auth required) */
  public stats: StatsAPI;
  /** Provider-specific APIs */
  public provider: ProviderAPI;
  /** Metering API for MCP middleware */
  public meter: MeterAPI;

  constructor(config: BazaarConfig) {
    this.apiKey = config.apiKey;
    this.baseUrl = (config.baseUrl || "https://noui.bot").replace(/\/$/, "");
    this.timeout = config.timeout || 30_000;
    this._fetch = config.fetch || globalThis.fetch;

    this.catalog = new CatalogAPI(this);
    this.tools = new ToolsAPI(this);
    this.usage = new UsageAPI(this);
    this.balance = new BalanceAPI(this);
    this.stats = new StatsAPI(this);
    this.provider = new ProviderAPI(this);
    this.meter = new MeterAPI(this);
  }

  /** @internal */
  async request<T>(
    method: string,
    path: string,
    body?: unknown,
    opts?: { noAuth?: boolean },
  ): Promise<T> {
    const url = `${this.baseUrl}${path}`;
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      "User-Agent": "@forthebots/bazaar-sdk/0.1.0",
    };
    if (!opts?.noAuth) {
      headers["Authorization"] = `Bearer ${this.apiKey}`;
    }

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeout);

    try {
      const res = await this._fetch(url, {
        method,
        headers,
        body: body ? JSON.stringify(body) : undefined,
        signal: controller.signal,
      });

      const data = await res.json();

      if (!res.ok) {
        throw new BazaarError(
          data.error || data.message || `HTTP ${res.status}`,
          res.status,
          data.code,
          data.details,
        );
      }

      return data as T;
    } catch (err) {
      if (err instanceof BazaarError) throw err;
      if ((err as Error).name === "AbortError") {
        throw new BazaarError("Request timeout", 408, "TIMEOUT");
      }
      throw new BazaarError((err as Error).message, 0, "NETWORK_ERROR");
    } finally {
      clearTimeout(timer);
    }
  }
}

// ─── Sub-APIs ───────────────────────────────────────────────────────

class CatalogAPI {
  constructor(private client: Bazaar) {}

  /** List all tools with pricing and stats (no auth required) */
  async list(): Promise<CatalogResponse> {
    return this.client.request("GET", "/api/bazaar/catalog", undefined, { noAuth: true });
  }

  /** Get public pricing for all tools (no auth required) */
  async pricing(): Promise<PricingInfo> {
    return this.client.request("GET", "/api/v1/bazaar/pricing", undefined, { noAuth: true });
  }
}

class ToolsAPI {
  constructor(private client: Bazaar) {}

  /** Call a tool through the billing proxy */
  async call(toolName: string, input?: Record<string, unknown>): Promise<ProxyResult> {
    return this.client.request("POST", "/api/bazaar/proxy", {
      tool_name: toolName,
      input: input || {},
    });
  }

  /** Register tools for your provider (provider key required) */
  async register(tools: RegisterToolPayload[]): Promise<{ registered: number; tools: string[] }> {
    return this.client.request("POST", "/api/bazaar/tools", { tools });
  }
}

class UsageAPI {
  constructor(private client: Bazaar) {}

  /** Get usage history */
  async list(opts?: { limit?: number; offset?: number }): Promise<{ records: UsageRecord[]; total: number }> {
    const params = new URLSearchParams();
    if (opts?.limit) params.set("limit", String(opts.limit));
    if (opts?.offset) params.set("offset", String(opts.offset));
    const qs = params.toString();
    return this.client.request("GET", `/api/v1/bazaar/usage${qs ? `?${qs}` : ""}`);
  }

  /** Get aggregated usage summary */
  async summary(period?: string): Promise<UsageSummary> {
    const qs = period ? `?period=${period}` : "";
    return this.client.request("GET", `/api/v1/bazaar/usage/summary${qs}`);
  }
}

class BalanceAPI {
  constructor(private client: Bazaar) {}

  /** Check current balance */
  async get(): Promise<BalanceInfo> {
    return this.client.request("GET", "/api/v1/bazaar/balance");
  }

  /** Load balance via Stripe Checkout */
  async load(amountCents: number): Promise<{ url?: string; balance_cents?: number }> {
    return this.client.request("POST", "/api/bazaar/balance/load", {
      amount_cents: amountCents,
    });
  }
}

class StatsAPI {
  constructor(private client: Bazaar) {}

  /** Get public platform stats (no auth required) */
  async get(): Promise<StatsInfo> {
    return this.client.request("GET", "/api/v1/bazaar/stats", undefined, { noAuth: true });
  }
}

class ProviderAPI {
  constructor(private client: Bazaar) {}

  /** Get provider earnings summary */
  async summary(period?: string): Promise<ProviderSummary> {
    return this.client.request("POST", "/api/bazaar/billing/provider-summary", {
      period: period || "30d",
    });
  }

  /** Start Stripe Connect onboarding */
  async connectStripe(returnUrl: string): Promise<{ url: string }> {
    return this.client.request("POST", "/api/bazaar/connect", { return_url: returnUrl });
  }

  /** Check Stripe Connect status */
  async connectStatus(): Promise<{ connected: boolean; stripe_account_id?: string }> {
    return this.client.request("GET", "/api/bazaar/connect");
  }

  /** Request payout */
  async payout(): Promise<{ amount_cents: number; status: string }> {
    return this.client.request("POST", "/api/bazaar/payouts");
  }

  /** Get payout history */
  async payoutHistory(): Promise<{ payouts: unknown[]; pending_cents: number }> {
    return this.client.request("GET", "/api/bazaar/payouts");
  }
}

class MeterAPI {
  constructor(private client: Bazaar) {}

  /** Record a tool invocation (for MCP middleware integration) */
  async record(payload: MeterPayload): Promise<{ recorded: boolean; invocation_id: string }> {
    return this.client.request("POST", "/api/v1/bazaar/meter", payload);
  }
}

// ─── Static helpers ─────────────────────────────────────────────────

/** Register as a provider (no auth required) */
export async function registerProvider(
  payload: RegisterProviderPayload,
  baseUrl = "https://noui.bot",
): Promise<{ api_key: string; provider_id: string }> {
  const res = await fetch(`${baseUrl}/api/bazaar/register-provider`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const data = await res.json();
  if (!res.ok) throw new BazaarError(data.error || "Registration failed", res.status);
  return data;
}

/** Register as a consumer (no auth required) */
export async function registerConsumer(
  payload: RegisterConsumerPayload,
  baseUrl = "https://noui.bot",
): Promise<{ api_key: string; consumer_id: string }> {
  const res = await fetch(`${baseUrl}/api/bazaar/register-consumer`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const data = await res.json();
  if (!res.ok) throw new BazaarError(data.error || "Registration failed", res.status);
  return data;
}

export default Bazaar;
