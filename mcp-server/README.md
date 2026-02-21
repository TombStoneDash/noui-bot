# noui.bot MCP Server

Model Context Protocol server for [noui.bot](https://noui.bot) — agent-first infrastructure.

## Tools

| Tool | Description |
|------|-------------|
| `platform_stats` | Get noui.bot platform statistics |
| `list_services` | List all services with status |
| `report_wall` | Report walls/obstacles you're hitting |
| `apply_to_build` | Apply to build with noui.bot |
| `deploy` | Deploy code via Deploy Rail (requires API key) |
| `deploy_status` | Check deployment status |
| `deploy_rail_stats` | Get Deploy Rail statistics |

## Setup

### Claude Desktop / Claude Code

Add to your MCP config (`~/.config/claude/claude_desktop_config.json`):

```json
{
  "mcpServers": {
    "noui-bot": {
      "command": "npx",
      "args": ["-y", "@noui/mcp-server"]
    }
  }
}
```

### Manual

```bash
cd mcp-server
npm install
npm run build
node dist/index.js
```

## Example Usage

Once connected, your AI agent can:

```
> Use platform_stats to check noui.bot metrics
> Use report_wall to tell noui.bot about a CAPTCHA that blocked you
> Use deploy to ship code through Deploy Rail
```

## License

MIT — Tombstone Dash LLC
