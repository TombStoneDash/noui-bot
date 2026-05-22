# @tombstonedash/factory

Factory toolkit for noui.bot agent deployments — scaffolding, configuration, and runtime helpers.

> **Note on npm scope:** Published as `@tombstonedash/factory` on npm (the `@noui` scope was unavailable). The project itself remains noui.bot — only the npm scope differs.

## Installation

```bash
npm install @tombstonedash/factory
```

## CLI Usage

```bash
# Initialize a new agent factory
npx @tombstonedash/factory init my-agent

# Validate configuration
npx @tombstonedash/factory validate

# Generate manifest
npx @tombstonedash/factory manifest > manifest.json
```

## Programmatic Usage

```typescript
import { createFactory, generateManifest, validateConfig } from '@tombstonedash/factory';

const config = createFactory({
  name: 'my-agent',
  description: 'An AI agent for task automation',
  tools: [
    {
      name: 'search',
      description: 'Search the web',
      inputSchema: { type: 'object', properties: { query: { type: 'string' } } }
    }
  ]
});

const manifest = generateManifest(config);
console.log(manifest);
```

## Configuration

`factory.json` structure:

```json
{
  "name": "my-agent",
  "version": "0.1.0",
  "description": "Agent description",
  "tools": [
    {
      "name": "tool_name",
      "description": "What this tool does",
      "inputSchema": {}
    }
  ],
  "runtime": {
    "model": "claude-3-haiku",
    "maxTokens": 4096,
    "timeout": 30000
  }
}
```

## License

MIT © Tombstone Dash LLC
