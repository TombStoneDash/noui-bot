#!/usr/bin/env node

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { callJsonApi, pathSegment } from "./http.js";

const NOUI_API = "https://noui.bot/api/v1";
const SHIPRAIL_API = "https://shiprail.dev/api";
// `deploy` waits for the build to finish, so it gets far longer than a plain lookup.
const DEPLOY_TIMEOUT_MS = 10 * 60_000;

const server = new McpServer({
  name: "noui-bot",
  version: "0.2.0",
});

// Tool: platform_stats
server.tool(
  "platform_stats",
  "Get noui.bot platform statistics — waitlist signups, feedback reports, applications. No PII.",
  {},
  async () => {
    return callJsonApi(`${NOUI_API}/stats`);
  }
);

// Tool: list_services
server.tool(
  "list_services",
  "List all noui.bot services with status, endpoints, and descriptions.",
  {},
  async () => {
    return callJsonApi(`${NOUI_API}/services`);
  }
);

// Tool: report_wall
server.tool(
  "report_wall",
  "Report a wall or obstacle you're hitting as an AI agent. Tell us what's blocking you.",
  {
    agent_name: z.string().optional().describe("Your name or identifier"),
    platform: z.string().optional().describe("Your framework: openai, anthropic, langchain, crewai, custom"),
    walls: z.array(z.string()).optional().describe("Services/sites that block you"),
    needs: z.array(z.string()).optional().describe("Capabilities you wish existed"),
    message: z.string().optional().describe("Freeform feedback"),
    use_case: z.string().optional().describe("What you're trying to do"),
  },
  async (args) => {
    return callJsonApi(`${NOUI_API}/feedback`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(args),
    });
  }
);

// Tool: apply_to_build
server.tool(
  "apply_to_build",
  "Apply to build with noui.bot. Open to developers, agent operators, and companies.",
  {
    name: z.string().describe("Who you are"),
    contact: z.string().describe("Email, GitHub, Twitter, or webhook URL"),
    type: z.enum(["developer", "agent_operator", "company", "other"]).optional(),
    skills: z.array(z.string()).optional().describe("Your relevant skills"),
    interest: z.enum(["build_services", "integrate", "partner", "equity", "other"]).optional(),
    pitch: z.string().optional().describe("Why you want to build with us"),
    availability: z.enum(["full-time", "part-time", "nights-and-weekends"]).optional(),
  },
  async (args) => {
    return callJsonApi(`${NOUI_API}/apply`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(args),
    });
  }
);

// Tool: deploy
server.tool(
  "deploy",
  "Deploy code from a GitHub repo to a live URL via Deploy Rail. Requires a ShipRail API key.",
  {
    api_key: z.string().describe("Your ShipRail API key (sr_...)"),
    git_url: z.string().describe("GitHub repo URL to deploy"),
    project_name: z.string().optional().describe("Vercel project name"),
    target: z.enum(["preview", "production"]).optional().default("preview"),
    ref: z.string().optional().default("main").describe("Git ref to deploy"),
  },
  async (args) => {
    return callJsonApi(`${SHIPRAIL_API}/ship`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${args.api_key}`,
      },
      body: JSON.stringify({
        gitUrl: args.git_url,
        projectName: args.project_name,
        target: args.target,
        ref: args.ref,
        wait: true,
      }),
    }, { timeoutMs: DEPLOY_TIMEOUT_MS });
  }
);

// Tool: deploy_status
server.tool(
  "deploy_status",
  "Check the status of a Deploy Rail deployment by action ID.",
  {
    action_id: z.string().describe("The actionId returned from a deploy"),
  },
  async (args) => {
    return callJsonApi(`${SHIPRAIL_API}/actions/${pathSegment(args.action_id)}`);
  }
);

// Tool: deploy_rail_stats
server.tool(
  "deploy_rail_stats",
  "Get Deploy Rail statistics — total deploys, success rate, agents registered.",
  {},
  async () => {
    return callJsonApi(`${SHIPRAIL_API}/stats`);
  }
);

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("noui.bot MCP server running on stdio");
}

main().catch(console.error);
