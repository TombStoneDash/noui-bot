import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { runCli } from '../src/cli-core';

let cwd: string;
let out: string[];
let err: string[];

function run(...args: string[]) {
  return runCli(args, { cwd, stdout: l => out.push(l), stderr: l => err.push(l) });
}

function writeConfig(contents: unknown) {
  const text = typeof contents === 'string' ? contents : JSON.stringify(contents);
  fs.writeFileSync(path.join(cwd, 'factory.json'), text);
}

function readConfig() {
  return JSON.parse(fs.readFileSync(path.join(cwd, 'factory.json'), 'utf-8'));
}

beforeEach(() => {
  cwd = fs.mkdtempSync(path.join(os.tmpdir(), 'noui-factory-'));
  out = [];
  err = [];
});

afterEach(() => {
  fs.rmSync(cwd, { recursive: true, force: true });
});

describe('init', () => {
  it('writes a valid factory.json', () => {
    expect(run('init', 'My Agent')).toBe(0);
    const config = readConfig();
    expect(config.name).toBe('My Agent');
    expect(config.version).toBe('0.1.0');
    expect(run('validate')).toBe(0);
  });

  it('refuses to overwrite an existing factory.json', () => {
    writeConfig({ name: 'keep-me', tools: [{ name: 'mine', description: 'hand-written' }] });
    expect(run('init', 'other')).toBe(1);
    expect(err.join('\n')).toContain('already exists');
    expect(readConfig().name).toBe('keep-me');
  });

  it('overwrites with --force, in either argument position', () => {
    writeConfig({ name: 'old' });
    expect(run('init', '--force', 'new-agent')).toBe(0);
    expect(readConfig().name).toBe('new-agent');
    expect(run('init', 'newer', '--force')).toBe(0);
    expect(readConfig().name).toBe('newer');
  });

  it('rejects a name with no letters or digits instead of writing an invalid config', () => {
    expect(run('init', '!!!')).toBe(1);
    expect(fs.existsSync(path.join(cwd, 'factory.json'))).toBe(false);
  });
});

describe('validate', () => {
  it('fails when factory.json is missing', () => {
    expect(run('validate')).toBe(1);
    expect(err.join('\n')).toContain('not found');
  });

  it('reports invalid JSON without a stack trace', () => {
    writeConfig('{ "name": ');
    expect(run('validate')).toBe(1);
    expect(err[0]).toMatch(/^❌ factory\.json is not valid JSON: /);
  });

  it('reports every configuration error', () => {
    writeConfig({ tools: 'nope' });
    expect(run('validate')).toBe(1);
    expect(err).toEqual([
      '❌ Configuration errors:',
      '  - Factory name is required',
      '  - Factory tools must be an array',
    ]);
  });
});

describe('manifest', () => {
  it('prints a manifest for a valid config', () => {
    writeConfig({ name: 'Search Agent', tools: [{ name: 'search', description: 'Search' }] });
    expect(run('manifest')).toBe(0);
    const m = JSON.parse(out.join('\n'));
    expect(m).toMatchObject({ id: 'search-agent', tools: ['search'] });
  });

  it('fails cleanly on an invalid config instead of crashing', () => {
    writeConfig({ description: 'no name' });
    expect(run('manifest')).toBe(1);
    expect(out).toEqual([]);
    expect(err).toContain('  - Factory name is required');
  });

  it('fails cleanly on a JSON array', () => {
    writeConfig([]);
    expect(run('manifest')).toBe(1);
    expect(err).toContain('  - Factory config must be a JSON object');
  });
});

describe('help and unknown commands', () => {
  it.each([[], ['help'], ['--help'], ['-h']])('%j prints help and exits 0', (...args) => {
    expect(run(...(args as string[]))).toBe(0);
    expect(out.join('\n')).toContain('Commands:');
  });

  it('exits 1 on an unknown command', () => {
    expect(run('deploy')).toBe(1);
    expect(err[0]).toBe('❌ Unknown command: deploy');
  });
});
