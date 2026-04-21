#!/usr/bin/env node
import {
  createFactory,
  generateManifest,
  validateConfig
} from "./chunk-NAEIIMOH.mjs";

// src/cli.ts
import * as fs from "fs";
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
