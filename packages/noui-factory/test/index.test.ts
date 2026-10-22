import { describe, expect, it } from 'vitest';
import { createFactory, generateManifest, slugify, validateConfig } from '../src/index';

describe('createFactory', () => {
  it('defaults the version', () => {
    expect(createFactory({ name: 'a' }).version).toBe('0.1.0');
  });

  it('keeps the default when version is explicitly undefined', () => {
    expect(createFactory({ name: 'a', version: undefined }).version).toBe('0.1.0');
  });

  it('keeps a caller-supplied version', () => {
    expect(createFactory({ name: 'a', version: '2.3.4' }).version).toBe('2.3.4');
  });
});

describe('slugify', () => {
  it.each([
    ['My Agent', 'my-agent'],
    ['  padded  name  ', 'padded-name'],
    ['Agent!!  v2.0', 'agent-v2-0'],
    ['Café Bot', 'cafe-bot'],
    ['--already-slugged--', 'already-slugged'],
    ['!!!', ''],
  ])('%j -> %j', (input, expected) => {
    expect(slugify(input)).toBe(expected);
  });
});

describe('validateConfig', () => {
  it('accepts a minimal config', () => {
    expect(validateConfig({ name: 'agent' })).toEqual({ valid: true, errors: [] });
  });

  it('accepts a full config', () => {
    const result = validateConfig({
      name: 'agent',
      version: '1.0.0',
      description: 'd',
      tools: [{ name: 't', description: 'does t', inputSchema: { type: 'object' } }],
      runtime: { model: 'claude-haiku-5-5', maxTokens: 4096, timeout: 30000 },
    });
    expect(result).toEqual({ valid: true, errors: [] });
  });

  it.each([null, undefined, 42, 'agent', [], [{ name: 'agent' }]])(
    'rejects non-object config %j without throwing',
    (input) => {
      const result = validateConfig(input);
      expect(result.valid).toBe(false);
      expect(result.errors).toEqual(['Factory config must be a JSON object']);
    },
  );

  it.each([{}, { name: '' }, { name: '   ' }, { name: 7 }])('requires a name: %j', (input) => {
    expect(validateConfig(input).errors).toContain('Factory name is required');
  });

  it('rejects a name that would produce an empty manifest id', () => {
    expect(validateConfig({ name: '!!!' }).errors).toContain(
      'Factory name must contain at least one letter or digit',
    );
  });

  it('rejects tools that are not an array', () => {
    expect(validateConfig({ name: 'a', tools: { t: {} } }).errors).toEqual([
      'Factory tools must be an array',
    ]);
  });

  it('reports bad tool entries by index without throwing', () => {
    const result = validateConfig({ name: 'a', tools: [null, { description: 'x' }, { name: 'ok' }] });
    expect(result.errors).toEqual([
      'Tool at index 0 must be an object',
      'Tool at index 1: name is required',
      'Tool ok missing description',
    ]);
  });

  it('rejects duplicate tool names', () => {
    const result = validateConfig({
      name: 'a',
      tools: [
        { name: 'search', description: 'one' },
        { name: 'search', description: 'two' },
      ],
    });
    expect(result.errors).toEqual(['Tool search is defined more than once']);
  });

  it('rejects a non-object inputSchema', () => {
    const result = validateConfig({
      name: 'a',
      tools: [{ name: 't', description: 'd', inputSchema: 'object' }],
    });
    expect(result.errors).toEqual(['Tool t: inputSchema must be an object']);
  });

  it.each([
    [{ maxTokens: 0 }, 'Runtime maxTokens must be a positive integer'],
    [{ maxTokens: 1.5 }, 'Runtime maxTokens must be a positive integer'],
    [{ maxTokens: '4096' }, 'Runtime maxTokens must be a positive integer'],
    [{ timeout: -1 }, 'Runtime timeout must be a positive integer (milliseconds)'],
    [{ model: '' }, 'Runtime model must be a non-empty string'],
  ])('rejects runtime %j', (runtime, message) => {
    expect(validateConfig({ name: 'a', runtime }).errors).toEqual([message]);
  });

  it('rejects a runtime that is not an object', () => {
    expect(validateConfig({ name: 'a', runtime: 'fast' }).errors).toEqual([
      'Factory runtime must be an object',
    ]);
  });

  it('rejects a blank version and non-string description', () => {
    expect(validateConfig({ name: 'a', version: '', description: 5 }).errors).toEqual([
      'Factory version must be a non-empty string',
      'Factory description must be a string',
    ]);
  });
});

describe('generateManifest', () => {
  it('builds a manifest with a slug id and tool names', () => {
    const m = generateManifest({
      name: '  My Agent!  ',
      description: 'desc',
      tools: [{ name: 'search', description: 'Search' }],
    });
    expect(m).toMatchObject({
      id: 'my-agent',
      name: 'My Agent!',
      version: '0.1.0',
      description: 'desc',
      tools: ['search'],
    });
    expect(Number.isNaN(Date.parse(m.createdAt))).toBe(false);
  });

  it('throws a descriptive error instead of a TypeError on a config without a name', () => {
    expect(() => generateManifest({} as never)).toThrow(
      'Invalid factory config: Factory name is required',
    );
  });
});
