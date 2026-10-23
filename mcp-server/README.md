# noui.bot MCP Server

Model Context Protocol server for [noui.bot](https://noui.bot) — agent-first infrastructure.

## Tools

| Tool | Description |
|------|-------------|
| `bazaar_list_tools` | List Agent Bazaar tools and their price per call |
| `bazaar_call_tool` | Run a Bazaar tool through the metered proxy (requires `NOUI_API_KEY`) |
| `bazaar_balance` | Show your prepaid Bazaar balance (requires `NOUI_API_KEY`) |
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
      "args": ["-y", "@forthebots/mcp-server"],
      "env": {
        "NOUI_API_KEY": "bz_your_key_here"
      }
    }
  }
}
```

`NOUI_API_KEY` is a Bazaar consumer key from https://noui.bot/developers/register. It is only needed for `bazaar_call_tool` and `bazaar_balance`; every other tool works without it.

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
> Use bazaar_list_tools to find a weather tool, then bazaar_call_tool to run it
> Use platform_stats to check noui.bot metrics
> Use report_wall to tell noui.bot about a CAPTCHA that blocked you
> Use deploy to ship code through Deploy Rail
```

## License

MIT — Tombstone Dash LLC
