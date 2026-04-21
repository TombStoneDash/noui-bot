/**
 * @noui/factory - Factory toolkit for noui.bot agent deployments
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
    id: config.name.toLowerCase().replace(/\s+/g, '-'),
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
  
  if (!config.name) {
    errors.push('Factory name is required');
  }
  
  if (config.tools) {
    for (const tool of config.tools) {
      if (!tool.name) errors.push('Tool name is required');
      if (!tool.description) errors.push(`Tool ${tool.name || 'unknown'} missing description`);
    }
  }
  
  return { valid: errors.length === 0, errors };
}

export default { createFactory, generateManifest, validateConfig };
