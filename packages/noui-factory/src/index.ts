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

export const DEFAULT_VERSION = '0.1.0';

/**
 * Create a new agent factory configuration
 */
export function createFactory(config: FactoryConfig): FactoryConfig {
  return {
    ...config,
    // An explicit `version: undefined` must not erase the default.
    version: config.version || DEFAULT_VERSION,
  };
}

/**
 * Turn a display name into a stable manifest id: lowercase ASCII letters,
 * digits and single hyphens, with no leading or trailing hyphen.
 */
export function slugify(name: string): string {
  return name
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/**
 * Generate an agent manifest from factory config.
 * Throws if the config is invalid, so a broken factory.json never yields a
 * manifest with an empty id or missing tool names.
 */
export function generateManifest(config: FactoryConfig): AgentManifest {
  const result = validateConfig(config);
  if (!result.valid) {
    throw new Error(`Invalid factory config: ${result.errors.join('; ')}`);
  }
  return {
    id: slugify(config.name),
    name: config.name.trim(),
    version: config.version || DEFAULT_VERSION,
    description: config.description || '',
    tools: config.tools?.map(t => t.name) || [],
    createdAt: new Date().toISOString(),
  };
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isPositiveInteger(value: unknown): boolean {
  return typeof value === 'number' && Number.isInteger(value) && value > 0;
}

/**
 * Validate factory configuration. Accepts untrusted input (for example a
 * parsed factory.json) and never throws.
 */
export function validateConfig(config: unknown): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!isPlainObject(config)) {
    return { valid: false, errors: ['Factory config must be a JSON object'] };
  }

  const { name, version, description, tools, runtime } = config;

  if (typeof name !== 'string' || !name.trim()) {
    errors.push('Factory name is required');
  } else if (!slugify(name)) {
    errors.push('Factory name must contain at least one letter or digit');
  }

  if (version !== undefined && (typeof version !== 'string' || !version.trim())) {
    errors.push('Factory version must be a non-empty string');
  }

  if (description !== undefined && typeof description !== 'string') {
    errors.push('Factory description must be a string');
  }

  if (tools !== undefined) {
    if (!Array.isArray(tools)) {
      errors.push('Factory tools must be an array');
    } else {
      const seen = new Set<string>();
      tools.forEach((tool: unknown, index) => {
        if (!isPlainObject(tool)) {
          errors.push(`Tool at index ${index} must be an object`);
          return;
        }
        const toolName = typeof tool.name === 'string' ? tool.name.trim() : '';
        if (!toolName) {
          errors.push(`Tool at index ${index}: name is required`);
        } else if (seen.has(toolName)) {
          errors.push(`Tool ${toolName} is defined more than once`);
        } else {
          seen.add(toolName);
        }
        if (typeof tool.description !== 'string' || !tool.description.trim()) {
          errors.push(`Tool ${toolName || `at index ${index}`} missing description`);
        }
        if (tool.inputSchema !== undefined && !isPlainObject(tool.inputSchema)) {
          errors.push(`Tool ${toolName || `at index ${index}`}: inputSchema must be an object`);
        }
      });
    }
  }

  if (runtime !== undefined) {
    if (!isPlainObject(runtime)) {
      errors.push('Factory runtime must be an object');
    } else {
      if (runtime.model !== undefined && (typeof runtime.model !== 'string' || !runtime.model.trim())) {
        errors.push('Runtime model must be a non-empty string');
      }
      if (runtime.maxTokens !== undefined && !isPositiveInteger(runtime.maxTokens)) {
        errors.push('Runtime maxTokens must be a positive integer');
      }
      if (runtime.timeout !== undefined && !isPositiveInteger(runtime.timeout)) {
        errors.push('Runtime timeout must be a positive integer (milliseconds)');
      }
    }
  }

  return { valid: errors.length === 0, errors };
}

export default { createFactory, generateManifest, validateConfig };
