export interface BazaarProvider {
  slug: string;
  name: string;
  description: string;
  category: "tools" | "data" | "integrations";
  github: string;
  install: string;
  tools: string[];
  example: string;
}

export const PROVIDERS: BazaarProvider[] = [
  {
    slug: "weather",
    name: "Weather MCP",
    description: "Real-time weather data, forecasts, and historical climate information via the National Weather Service API.",
    category: "data",
    github: "https://github.com/modelcontextprotocol/servers/tree/main/src/weather",
    install: "npx -y @modelcontextprotocol/server-weather",
    tools: ["get_forecast", "get_alerts", "get_current_conditions"],
    example: `const result = await bz.tools.call("weather.get_forecast", {
  latitude: 32.71,
  longitude: -117.16,
  days: 3
});`,
  },
  {
    slug: "github",
    name: "GitHub MCP",
    description: "Full GitHub API access — repos, issues, PRs, code search, and file operations through MCP.",
    category: "integrations",
    github: "https://github.com/modelcontextprotocol/servers/tree/main/src/github",
    install: "npx -y @modelcontextprotocol/server-github",
    tools: ["search_repositories", "create_issue", "get_file_contents", "create_pull_request", "list_commits"],
    example: `const result = await bz.tools.call("github.search_repositories", {
  query: "LIMS laboratory management",
  sort: "stars"
});`,
  },
  {
    slug: "slack",
    name: "Slack MCP",
    description: "Send messages, read channels, manage threads, and search Slack workspace history.",
    category: "integrations",
    github: "https://github.com/modelcontextprotocol/servers/tree/main/src/slack",
    install: "npx -y @modelcontextprotocol/server-slack",
    tools: ["send_message", "read_channel", "search_messages", "list_channels"],
    example: `const result = await bz.tools.call("slack.send_message", {
  channel: "#alerts",
  text: "Build deployed successfully."
});`,
  },
  {
    slug: "filesystem",
    name: "Filesystem MCP",
    description: "Secure local file access — read, write, search, and manage files within allowed directories.",
    category: "tools",
    github: "https://github.com/modelcontextprotocol/servers/tree/main/src/filesystem",
    install: "npx -y @modelcontextprotocol/server-filesystem /path/to/allowed",
    tools: ["read_file", "write_file", "list_directory", "search_files", "move_file"],
    example: `const result = await bz.tools.call("filesystem.read_file", {
  path: "/data/results.csv"
});`,
  },
  {
    slug: "web-search",
    name: "Brave Search MCP",
    description: "Web search and local business search powered by Brave Search API. No tracking, no ads in results.",
    category: "data",
    github: "https://github.com/modelcontextprotocol/servers/tree/main/src/brave-search",
    install: "npx -y @modelcontextprotocol/server-brave-search",
    tools: ["brave_web_search", "brave_local_search"],
    example: `const result = await bz.tools.call("web-search.brave_web_search", {
  query: "MCP server billing infrastructure",
  count: 5
});`,
  },
  {
    slug: "postgres",
    name: "PostgreSQL MCP",
    description: "Read-only PostgreSQL database access. Run SELECT queries, inspect schemas, and explore data.",
    category: "data",
    github: "https://github.com/modelcontextprotocol/servers/tree/main/src/postgres",
    install: "npx -y @modelcontextprotocol/server-postgres postgresql://...",
    tools: ["query", "list_tables", "describe_table"],
    example: `const result = await bz.tools.call("postgres.query", {
  sql: "SELECT COUNT(*) FROM users WHERE created_at > NOW() - INTERVAL '7 days'"
});`,
  },
  {
    slug: "puppeteer",
    name: "Puppeteer MCP",
    description: "Browser automation — navigate pages, take screenshots, click elements, fill forms, and extract content.",
    category: "tools",
    github: "https://github.com/modelcontextprotocol/servers/tree/main/src/puppeteer",
    install: "npx -y @modelcontextprotocol/server-puppeteer",
    tools: ["navigate", "screenshot", "click", "fill", "evaluate"],
    example: `const result = await bz.tools.call("puppeteer.screenshot", {
  url: "https://lims.bot",
  width: 1280,
  height: 720
});`,
  },
  {
    slug: "memory",
    name: "Memory MCP",
    description: "Persistent key-value memory for agents. Store and retrieve context across conversations.",
    category: "tools",
    github: "https://github.com/modelcontextprotocol/servers/tree/main/src/memory",
    install: "npx -y @modelcontextprotocol/server-memory",
    tools: ["store", "retrieve", "list_keys", "delete"],
    example: `const result = await bz.tools.call("memory.store", {
  key: "user_preferences",
  value: { theme: "dark", language: "en" }
});`,
  },
];

export function getProvider(slug: string): BazaarProvider | undefined {
  return PROVIDERS.find((p) => p.slug === slug);
}
