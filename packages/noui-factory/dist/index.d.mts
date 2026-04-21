/**
 * @noui/factory - Factory toolkit for noui.bot agent deployments
 */
interface FactoryConfig {
    name: string;
    version?: string;
    description?: string;
    tools?: ToolDefinition[];
    runtime?: RuntimeConfig;
}
interface ToolDefinition {
    name: string;
    description: string;
    inputSchema?: Record<string, unknown>;
}
interface RuntimeConfig {
    model?: string;
    maxTokens?: number;
    timeout?: number;
}
interface AgentManifest {
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
declare function createFactory(config: FactoryConfig): FactoryConfig;
/**
 * Generate an agent manifest from factory config
 */
declare function generateManifest(config: FactoryConfig): AgentManifest;
/**
 * Validate factory configuration
 */
declare function validateConfig(config: FactoryConfig): {
    valid: boolean;
    errors: string[];
};
declare const _default: {
    createFactory: typeof createFactory;
    generateManifest: typeof generateManifest;
    validateConfig: typeof validateConfig;
};

export { type AgentManifest, type FactoryConfig, type RuntimeConfig, type ToolDefinition, createFactory, _default as default, generateManifest, validateConfig };
