/**
 * noui-factory CLI logic, kept free of process globals so it can be tested.
 */

import { createFactory, generateManifest, validateConfig, FactoryConfig } from './index.js';
import * as fs from 'fs';
import * as path from 'path';

export const CONFIG_FILE = 'factory.json';

export interface CliIO {
  cwd: string;
  stdout: (line: string) => void;
  stderr: (line: string) => void;
}

const HELP = `
noui-factory - Factory toolkit for noui.bot agents

Commands:
  init [name] [--force]  Initialize a new agent factory (--force overwrites factory.json)
  validate               Validate factory.json configuration
  manifest               Generate agent manifest from config
  help                   Show this help message

Examples:
  noui-factory init my-agent
  noui-factory validate
  noui-factory manifest > manifest.json
`;

function init(args: string[], io: CliIO): number {
  const force = args.includes('--force') || args.includes('-f');
  const name = args.find(a => !a.startsWith('-'));
  const file = path.join(io.cwd, CONFIG_FILE);

  if (fs.existsSync(file) && !force) {
    io.stderr(`❌ ${CONFIG_FILE} already exists. Re-run with --force to overwrite it.`);
    return 1;
  }

  const config = createFactory({
    name: name || 'my-agent',
    description: 'A noui.bot agent',
    tools: [
      {
        name: 'example_tool',
        description: 'An example tool',
        inputSchema: { type: 'object', properties: {} }
      }
    ],
    runtime: {
      model: 'claude-haiku-5-5',
      maxTokens: 4096,
      timeout: 30000
    }
  });

  const check = validateConfig(config);
  if (!check.valid) {
    io.stderr('❌ Cannot create factory.json:');
    check.errors.forEach(e => io.stderr(`  - ${e}`));
    return 1;
  }

  fs.writeFileSync(file, JSON.stringify(config, null, 2) + '\n');
  io.stdout(`✅ Created ${CONFIG_FILE}`);
  return 0;
}

type Loaded = { ok: true; config: unknown } | { ok: false };

function loadConfig(io: CliIO): Loaded {
  const file = path.join(io.cwd, CONFIG_FILE);
  if (!fs.existsSync(file)) {
    io.stderr(`❌ ${CONFIG_FILE} not found. Run \`noui-factory init\` first.`);
    return { ok: false };
  }
  try {
    return { ok: true, config: JSON.parse(fs.readFileSync(file, 'utf-8')) };
  } catch (err) {
    io.stderr(`❌ ${CONFIG_FILE} is not valid JSON: ${(err as Error).message}`);
    return { ok: false };
  }
}

function reportErrors(errors: string[], io: CliIO) {
  io.stderr('❌ Configuration errors:');
  errors.forEach(e => io.stderr(`  - ${e}`));
}

function validate(io: CliIO): number {
  const loaded = loadConfig(io);
  if (!loaded.ok) return 1;

  const result = validateConfig(loaded.config);
  if (!result.valid) {
    reportErrors(result.errors, io);
    return 1;
  }
  io.stdout('✅ Configuration is valid');
  return 0;
}

function manifest(io: CliIO): number {
  const loaded = loadConfig(io);
  if (!loaded.ok) return 1;

  const result = validateConfig(loaded.config);
  if (!result.valid) {
    reportErrors(result.errors, io);
    return 1;
  }
  io.stdout(JSON.stringify(generateManifest(loaded.config as FactoryConfig), null, 2));
  return 0;
}

/** Run the CLI and return the process exit code. */
export function runCli(args: string[], io: CliIO): number {
  const [command, ...rest] = args;
  switch (command) {
    case 'init':
      return init(rest, io);
    case 'validate':
      return validate(io);
    case 'manifest':
      return manifest(io);
    case undefined:
    case 'help':
    case '--help':
    case '-h':
      io.stdout(HELP);
      return 0;
    default:
      io.stderr(`❌ Unknown command: ${command}`);
      io.stderr(HELP);
      return 1;
  }
}
