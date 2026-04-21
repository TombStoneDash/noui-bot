#!/usr/bin/env node
"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));

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

// src/cli.ts
var fs = __toESM(require("fs"));
var args = process.argv.slice(2);
var command = args[0];
function printHelp() {
  console.log(`
noui-factory - Factory toolkit for noui.bot agents

Commands:
  init [name]     Initialize a new agent factory
  validate        Validate factory.json configuration
  manifest        Generate agent manifest from config
  help            Show this help message

Examples:
  noui-factory init my-agent
  noui-factory validate
  noui-factory manifest > manifest.json
`);
}
function init(name) {
  const config = createFactory({
    name: name || "my-agent",
    description: "A noui.bot agent",
    tools: [
      {
        name: "example_tool",
        description: "An example tool",
        inputSchema: { type: "object", properties: {} }
      }
    ],
    runtime: {
      model: "claude-3-haiku",
      maxTokens: 4096,
      timeout: 3e4
    }
  });
  fs.writeFileSync("factory.json", JSON.stringify(config, null, 2));
  console.log("\u2705 Created factory.json");
}
function validate() {
  if (!fs.existsSync("factory.json")) {
    console.error("\u274C factory.json not found. Run `noui-factory init` first.");
    process.exit(1);
  }
  const config = JSON.parse(fs.readFileSync("factory.json", "utf-8"));
  const result = validateConfig(config);
  if (result.valid) {
    console.log("\u2705 Configuration is valid");
  } else {
    console.error("\u274C Configuration errors:");
    result.errors.forEach((e) => console.error(`  - ${e}`));
    process.exit(1);
  }
}
function manifest() {
  if (!fs.existsSync("factory.json")) {
    console.error("\u274C factory.json not found");
    process.exit(1);
  }
  const config = JSON.parse(fs.readFileSync("factory.json", "utf-8"));
  const m = generateManifest(config);
  console.log(JSON.stringify(m, null, 2));
}
switch (command) {
  case "init":
    init(args[1]);
    break;
  case "validate":
    validate();
    break;
  case "manifest":
    manifest();
    break;
  case "help":
  case "--help":
  case "-h":
  default:
    printHelp();
}
