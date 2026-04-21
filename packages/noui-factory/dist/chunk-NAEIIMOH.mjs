// src/index.ts
function createFactory(config) {
  return {
    version: "0.1.0",
    ...config
  };
}
function generateManifest(config) {
  return {
    id: config.name.toLowerCase().replace(/\s+/g, "-"),
    name: config.name,
    version: config.version || "0.1.0",
    description: config.description || "",
    tools: config.tools?.map((t) => t.name) || [],
    createdAt: (/* @__PURE__ */ new Date()).toISOString()
  };
}
function validateConfig(config) {
  const errors = [];
  if (!config.name) {
    errors.push("Factory name is required");
  }
  if (config.tools) {
    for (const tool of config.tools) {
      if (!tool.name) errors.push("Tool name is required");
      if (!tool.description) errors.push(`Tool ${tool.name || "unknown"} missing description`);
    }
  }
  return { valid: errors.length === 0, errors };
}
var index_default = { createFactory, generateManifest, validateConfig };

export {
  createFactory,
  generateManifest,
  validateConfig,
  index_default
};
