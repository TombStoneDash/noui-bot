import { NextResponse } from "next/server";

export async function GET() {
  const spec = {
    openapi: "3.1.0",
    info: {
      title: "noui.bot API",
      version: "0.2.0",
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
          description: "Returns all available endpoints, links, and Deploy Rail info.",
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
          description: "Full platform status with services, protocols, Deploy Rail stats.",
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
    },
    components: {
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
