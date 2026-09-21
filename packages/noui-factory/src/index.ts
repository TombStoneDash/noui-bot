/**
 * @tombstonedash/factory - Factory toolkit for noui.bot agent deployments
 */

export interface FactoryConfig {
  name: string;
  version?: string;
  description?: string;
  tools?: ToolDefinition[];
  runtime?: RuntimeConfig;
}

export interface ToolDefinition {
  name: string;
  description: string;
  inputSchema?: Record<string, unknown>;
}

export interface RuntimeConfig {
  model?: string;
  maxTokens?: number;
  timeout?: number;
}

export interface AgentManifest {
  id: string;
  name: string;
  version: string;
  description: string;
  tools: string[];
  createdAt: string;
}

/**
 * Create a new agent factory configuration
 */
export function createFactory(config: FactoryConfig): FactoryConfig {
  return {
    version: '0.1.0',
    ...config,
  };
}

/**
 * Generate an agent manifest from factory config
 */
export function generateManifest(config: FactoryConfig): AgentManifest {
  return {
    id: config.name
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, ''),
    name: config.name,
    version: config.version || '0.1.0',
    description: config.description || '',
    tools: config.tools?.map(t => t.name) || [],
    createdAt: new Date().toISOString(),
  };
}

/**
 * Validate factory configuration
 */
export function validateConfig(config: FactoryConfig): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  if (typeof config.name !== 'string' || config.name.trim() === '') {
    errors.push('Factory name is required');
  }
  
  if (config.tools !== undefined && config.tools !== null) {
    if (!Array.isArray(config.tools)) {
      errors.push('tools must be an array');
    } else {
      config.tools.forEach((tool, i) => {
        if (tool === null || typeof tool !== 'object') {
          errors.push(`Tool at index ${i} must be an object`);
          return;
        }
        if (!tool.name) errors.push('Tool name is required');
        if (!tool.description) errors.push(`Tool ${tool.name || 'unknown'} missing description`);
      });
    }
  }
  
  return { valid: errors.length === 0, errors };
}

export default { createFactory, generateManifest, validateConfig };
