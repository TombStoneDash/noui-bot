#!/usr/bin/env node
/**
 * noui-factory CLI
 */

import { runCli } from './cli-core.js';

process.exitCode = runCli(process.argv.slice(2), {
  cwd: process.cwd(),
  stdout: line => console.log(line),
  stderr: line => console.error(line),
});
