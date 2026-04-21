"use strict";
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/index.ts
var index_exports = {};
__export(index_exports, {
  createFactory: () => createFactory,
  default: () => index_default,
  generateManifest: () => generateManifest,
  validateConfig: () => validateConfig
});
module.exports = __toCommonJS(index_exports);
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
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  createFactory,
  generateManifest,
  validateConfig
});
