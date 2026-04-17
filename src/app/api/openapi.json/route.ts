import { NextResponse } from "next/server";

export async function GET() {
  const spec = {
    openapi: "3.1.0",
    info: {
      title: "noui.bot API",
      version: "0.3.0",
      description: "Agent-first infrastructure. APIs designed for bots, not browsers.",
      contact: { email: "hudtaylor@gmail.com", url: "https://noui.bot" },
      license: { name: "MIT" },
    },
    servers: [
      { url: "https://noui.bot", description: "Production" },
    ],
    paths: {
      "/api/v1": {
        get: {
          summary: "API index",
          description: "Returns all available endpoints and service links.",
          operationId: "getApiIndex",
          responses: {
            "200": { description: "Endpoint directory", content: { "application/json": { schema: { type: "object" } } } },
          },
        },
      },
      "/api/v1/health": {
        get: {
          summary: "Health check",
          operationId: "getHealth",
          responses: {
            "200": { description: "Health status with uptime", content: { "application/json": { schema: { type: "object", properties: { status: { type: "string" }, uptime: { type: "string" } } } } } },
          },
        },
      },
      "/api/v1/status": {
        get: {
          summary: "Platform status",
          description: "Full platform status with services, protocols, and uptime.",
          operationId: "getStatus",
          responses: {
            "200": { description: "Platform status", content: { "application/json": { schema: { type: "object" } } } },
          },
        },
      },
      "/api/v1/stats": {
        get: {
          summary: "Platform statistics",
          description: "Aggregate counts — no PII. Waitlist, feedback, application totals.",
          operationId: "getStats",
          responses: {
            "200": { description: "Aggregate stats", content: { "application/json": { schema: { type: "object" } } } },
          },
        },
      },
      "/api/v1/services": {
        get: {
          summary: "Service directory",
          description: "All services with status, endpoints, and descriptions.",
          operationId: "getServices",
          responses: {
            "200": { description: "Service list", content: { "application/json": { schema: { type: "object" } } } },
          },
        },
      },
      "/api/v1/feedback": {
        get: {
          summary: "Feedback schema",
          description: "Returns the schema and example for submitting feedback.",
          operationId: "getFeedbackSchema",
          responses: {
            "200": { description: "Schema document", content: { "application/json": { schema: { type: "object" } } } },
          },
        },
        post: {
          summary: "Report walls and needs",
          description: "Tell us what's blocking you. Agent-native — JSON in, JSON out.",
          operationId: "submitFeedback",
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    agent_name: { type: "string", description: "Your name" },
                    agent_url: { type: "string", description: "Where you live" },
                    contact: { type: "string", description: "Email, webhook, or callback URL" },
                    walls: { type: "array", items: { type: "string" }, description: "Services/sites that block you" },
                    needs: { type: "array", items: { type: "string" }, description: "Capabilities you wish existed" },
                    message: { type: "string", description: "Freeform feedback" },
                    platform: { type: "string", description: "Your framework" },
                    use_case: { type: "string", description: "What you do" },
                  },
                },
              },
            },
          },
          responses: {
            "201": { description: "Feedback received", content: { "application/json": { schema: { type: "object" } } } },
            "422": { description: "Validation error", content: { "application/json": { schema: { "$ref": "#/components/schemas/Error" } } } },
          },
        },
      },
      "/api/v1/apply": {
        get: {
          summary: "Application schema",
          operationId: "getApplySchema",
          responses: {
            "200": { description: "Schema document" },
          },
        },
        post: {
          summary: "Apply to build with noui.bot",
          operationId: "submitApplication",
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["name", "contact"],
                  properties: {
                    name: { type: "string" },
                    contact: { type: "string", description: "Email, GitHub, Twitter, or webhook" },
                    type: { type: "string", enum: ["developer", "agent_operator", "company", "other"] },
                    skills: { type: "array", items: { type: "string" } },
                    interest: { type: "string", enum: ["build_services", "integrate", "partner", "equity", "other"] },
                    pitch: { type: "string" },
                    availability: { type: "string", enum: ["full-time", "part-time", "nights-and-weekends"] },
                  },
                },
              },
            },
          },
          responses: {
            "201": { description: "Application received" },
            "422": { description: "Validation error" },
          },
        },
      },
      "/api/v1/waitlist": {
        post: {
          summary: "Join waitlist",
          operationId: "joinWaitlist",
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["email"],
                  properties: {
                    email: { type: "string", format: "email" },
                  },
                },
              },
            },
          },
          responses: {
            "201": { description: "Joined waitlist" },
            "400": { description: "Invalid email" },
          },
        },
      },
      "/api/bazaar/catalog": {
        get: {
          summary: "Tool catalog",
          operationId: "getBazaarCatalog",
          description: "List all tools available in the Bazaar with pricing and provider info.",
          tags: ["Bazaar"],
          responses: {
            "200": { description: "Tool catalog with pricing", content: { "application/json": { schema: { type: "object", properties: { tools: { type: "array", items: { type: "object" } }, total: { type: "integer" } } } } } },
          },
        },
      },
      "/api/bazaar/register-provider": {
        post: {
          summary: "Register as a provider",
          operationId: "registerProvider",
          description: "Register your MCP server as a Bazaar provider. Returns an API key.",
          tags: ["Bazaar"],
          requestBody: { required: true, content: { "application/json": { schema: { type: "object", required: ["name", "email", "endpoint_url"], properties: { name: { type: "string" }, email: { type: "string", format: "email" }, endpoint_url: { type: "string", format: "uri" }, description: { type: "string" } } } } } },
          responses: {
            "201": { description: "Provider registered", content: { "application/json": { schema: { type: "object", properties: { api_key: { type: "string" }, provider_id: { type: "string" } } } } } },
            "400": { description: "Validation error" },
          },
        },
      },
      "/api/bazaar/register-consumer": {
        post: {
          summary: "Register as a consumer",
          operationId: "registerConsumer",
          description: "Get an API key to call tools through the Bazaar proxy.",
          tags: ["Bazaar"],
          requestBody: { required: true, content: { "application/json": { schema: { type: "object", required: ["name", "email"], properties: { name: { type: "string" }, email: { type: "string", format: "email" } } } } } },
          responses: {
            "201": { description: "Consumer registered with API key" },
            "400": { description: "Validation error" },
          },
        },
      },
      "/api/bazaar/proxy": {
        post: {
          summary: "Proxy a tool call",
          operationId: "proxyToolCall",
          description: "Call any Bazaar tool. Authenticated, metered, and billed. Includes retry on 5xx.",
          tags: ["Bazaar"],
          security: [{ BearerAuth: [] }],
          requestBody: { required: true, content: { "application/json": { schema: { type: "object", required: ["tool_name"], properties: { tool_name: { type: "string" }, input: { type: "object" } } } } } },
          responses: {
            "200": { description: "Tool result with billing metadata", content: { "application/json": { schema: { type: "object", properties: { result: { type: "object" }, meta: { type: "object", properties: { cost_cents: { type: "number" }, latency_ms: { type: "integer" }, provider: { type: "string" }, remaining_balance_cents: { type: "number" } } } } } } } },
            "401": { description: "Invalid or missing API key" },
            "402": { description: "Insufficient balance" },
            "404": { description: "Tool not found" },
            "504": { description: "Provider timeout (>10s)" },
          },
        },
      },
      "/api/bazaar/tools": {
        post: {
          summary: "Register tools",
          operationId: "registerTools",
          description: "Add or update tools for your provider. Provider API key required.",
          tags: ["Bazaar"],
          security: [{ BearerAuth: [] }],
          requestBody: { required: true, content: { "application/json": { schema: { type: "object", required: ["tools"], properties: { tools: { type: "array", items: { type: "object", properties: { tool_name: { type: "string" }, description: { type: "string" }, category: { type: "string" }, price_cents_override: { type: "number" } } } } } } } } },
          responses: {
            "200": { description: "Tools registered" },
            "401": { description: "Invalid provider key" },
          },
        },
      },
      "/api/v1/bazaar/stats": {
        get: {
          summary: "Public dashboard stats",
          operationId: "getBazaarStats",
          description: "Platform-wide metrics: invocations, revenue, providers, tools.",
          tags: ["Bazaar"],
          responses: { "200": { description: "Dashboard metrics" } },
        },
      },
      "/api/v1/bazaar/pricing": {
        get: {
          summary: "Tool pricing",
          operationId: "getBazaarPricing",
          description: "Per-tool pricing details including free tiers.",
          tags: ["Bazaar"],
          responses: { "200": { description: "Pricing data per tool" } },
        },
      },
      "/api/v1/bazaar/balance": {
        get: {
          summary: "Check balance",
          operationId: "getBalance",
          description: "Check consumer's current Bazaar balance.",
          tags: ["Bazaar"],
          security: [{ BearerAuth: [] }],
          responses: { "200": { description: "Balance info" }, "401": { description: "Invalid key" } },
        },
      },
      "/api/v1/bazaar/meter": {
        post: {
          summary: "Record invocation",
          operationId: "meterInvocation",
          description: "Record a tool invocation for MCP middleware integration.",
          tags: ["Bazaar"],
          security: [{ BearerAuth: [] }],
          requestBody: { required: true, content: { "application/json": { schema: { type: "object", required: ["tool_name"], properties: { tool_name: { type: "string" }, duration_ms: { type: "integer" }, tokens_used: { type: "integer" }, success: { type: "boolean" } } } } } },
          responses: { "200": { description: "Invocation recorded" }, "401": { description: "Invalid key" } },
        },
      },
      "/api/bazaar/billing/provider-summary": {
        post: {
          summary: "Provider earnings",
          operationId: "getProviderSummary",
          description: "Gross revenue, platform fee, net earnings by tool and period.",
          tags: ["Bazaar"],
          security: [{ BearerAuth: [] }],
          responses: { "200": { description: "Earnings breakdown" }, "401": { description: "Invalid key" } },
        },
      },
      "/api/bazaar/balance/load": {
        post: {
          summary: "Load consumer balance",
          operationId: "loadBalance",
          description: "Add funds via Stripe Checkout or dry-run mode.",
          tags: ["Bazaar"],
          security: [{ BearerAuth: [] }],
          requestBody: { required: true, content: { "application/json": { schema: { type: "object", required: ["amount_cents"], properties: { amount_cents: { type: "integer", minimum: 100 } } } } } },
          responses: { "200": { description: "Checkout URL or balance update" }, "401": { description: "Invalid key" } },
        },
      },
      "/api/bazaar/payouts": {
        post: {
          summary: "Trigger payout",
          operationId: "triggerPayout",
          description: "Request payout of provider earnings ($10 minimum).",
          tags: ["Bazaar"],
          security: [{ BearerAuth: [] }],
          responses: { "200": { description: "Payout initiated" }, "400": { description: "Below minimum" }, "401": { description: "Invalid key" } },
        },
        get: {
          summary: "Payout history",
          operationId: "getPayoutHistory",
          description: "View payout history and pending balance.",
          tags: ["Bazaar"],
          security: [{ BearerAuth: [] }],
          responses: { "200": { description: "Payout records" }, "401": { description: "Invalid key" } },
        },
      },
      "/api/bazaar/connect": {
        post: {
          summary: "Start Stripe Connect",
          operationId: "startStripeConnect",
          description: "Begin Stripe Connect Express onboarding for provider payouts.",
          tags: ["Bazaar"],
          security: [{ BearerAuth: [] }],
          responses: { "200": { description: "Onboarding URL" }, "401": { description: "Invalid key" } },
        },
        get: {
          summary: "Check Connect status",
          operationId: "checkConnectStatus",
          description: "Check if Stripe Connect onboarding is complete.",
          tags: ["Bazaar"],
          security: [{ BearerAuth: [] }],
          responses: { "200": { description: "Connect status" }, "401": { description: "Invalid key" } },
        },
      },
    },
    components: {
      securitySchemes: {
        BearerAuth: {
          type: "http",
          scheme: "bearer",
          description: "Bazaar API key (bz_...) obtained from register-provider or register-consumer",
        },
      },
      schemas: {
        Error: {
          type: "object",
          properties: {
            error: { type: "boolean", enum: [true] },
            code: { type: "string" },
            message: { type: "string" },
            status: { type: "integer" },
            docs: { type: "string", format: "uri" },
            timestamp: { type: "string", format: "date-time" },
            details: { type: "object" },
          },
          required: ["error", "code", "message", "status"],
        },
      },
    },
  };

  return NextResponse.json(spec, {
    headers: {
      "Cache-Control": "public, max-age=3600",
      "Access-Control-Allow-Origin": "*",
    },
  });
}
