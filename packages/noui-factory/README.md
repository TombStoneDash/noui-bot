# @noui/factory

Factory toolkit for noui.bot agent deployments — scaffolding, configuration, and runtime helpers.

## Installation

```bash
npm install @noui/factory
```

## CLI Usage

```bash
# Initialize a new agent factory
npx @noui/factory init my-agent

# Validate configuration
npx @noui/factory validate

# Generate manifest
npx @noui/factory manifest > manifest.json
```

## Programmatic Usage

```typescript
import { createFactory, generateManifest, validateConfig } from '@noui/factory';

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
