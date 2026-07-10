import { describe, it, expect, vi, beforeEach } from 'vitest'
import { deepMerge, resolveConfig, defineConfig } from './define-config'
import { defaults } from './defaults'
import {
  AgentBenchConfigSchema,
  ProviderConfigSchema,
  TestConfigSchema,
  AgentConfigSchema,
  AssertionDefaultsSchema,
  EvaluationConfigSchema,
  ReportConfigSchema,
  ReplayConfigSchema,
  CoverageConfigSchema,
  CIConfigSchema,
} from './types'
import type { AgentBenchConfig } from './types'

// ─── deepMerge ─────────────────────────────────────────────────────────────────

describe('deepMerge', () => {
  it('merges nested objects deeply', () => {
    const target = { a: { b: 1, c: 2 }, d: 3 }
    const source = { a: { b: 10 } }

    const result = deepMerge(target, source)

    expect(result.a.b).toBe(10)
    expect(result.a.c).toBe(2)
    expect(result.d).toBe(3)
  })

  it('replaces arrays instead of merging them', () => {
    const target = { list: [1, 2, 3], nested: { arr: ['a', 'b'] } }
    const source = { list: [4, 5], nested: { arr: ['c'] } }

    const result = deepMerge(target, source)

    expect(result.list).toEqual([4, 5])
    expect(result.nested.arr).toEqual(['c'])
  })

  it('ignores undefined values in source so they do not clobber target', () => {
    const target = { name: 'original', count: 42 }
    const source = { name: undefined, count: 100 }

    const result = deepMerge(target, source)

    expect(result.name).toBe('original')
    expect(result.count).toBe(100)
  })

  it('allows null in source to replace target values', () => {
    const target = { name: 'original', metadata: { key: 'value' } }
    const source = { name: null }

    const result = deepMerge(target, source)

    expect(result.name).toBeNull()
    expect(result.metadata).toEqual({ key: 'value' })
  })

  it('handles deeply nested objects (3+ levels)', () => {
    const target = {
      level1: {
        level2: {
          level3: { a: 1, b: 2 },
        },
      },
    }
    const source = {
      level1: {
        level2: {
          level3: { a: 999 },
        },
      },
    }

    const result = deepMerge(target, source)

    expect(result.level1.level2.level3.a).toBe(999)
    expect(result.level1.level2.level3.b).toBe(2)
  })
})

// ─── defaults ─────────────────────────────────────────────────────────────────

describe('defaults', () => {
  it('contains all required top-level sections', () => {
    expect(defaults.providers).toBeDefined()
    expect(defaults.agent).toBeDefined()
    expect(defaults.test).toBeDefined()
    expect(defaults.assertions).toBeDefined()
    expect(defaults.replay).toBeDefined()
    expect(defaults.evaluation).toBeDefined()
    expect(defaults.coverage).toBeDefined()
    expect(defaults.report).toBeDefined()
    expect(defaults.ci).toBeDefined()
  })

  it('test defaults are sensible', () => {
    expect(defaults.test).toBeDefined()
    expect(defaults.test!.testDir).toBe('./tests')
    expect(defaults.test!.timeout).toBe(30000)
    expect(defaults.test!.retry).toBe(2)
    expect(defaults.test!.maxConcurrency).toBe(4)
  })

  it('evaluation defaults are sensible', () => {
    expect(defaults.evaluation).toBeDefined()
    expect(defaults.evaluation!.judges).toContain('correctness')
    expect(defaults.evaluation!.judges).toContain('faithfulness')
    expect(defaults.evaluation!.judges).toContain('safety')
    expect(defaults.evaluation!.judgeModel).toBe('openai/gpt-4o-mini')
    expect(defaults.evaluation!.scoreThreshold).toBe(7)
  })

  it('replay defaults are sensible', () => {
    expect(defaults.replay).toBeDefined()
    expect(defaults.replay!.enabled).toBe(false)
    expect(defaults.replay!.mode).toBe('deterministic')
    expect(defaults.replay!.storageDir).toBe('.agentbench/replays')
  })

  it('ci defaults are sensible', () => {
    expect(defaults.ci).toBeDefined()
    expect(defaults.ci!.provider).toBe('github-actions')
    expect(defaults.ci!.failOnThreshold).toBe(true)
    expect(defaults.ci!.commentOnPR).toBe(true)
  })
})

// ─── defineConfig / resolveConfig ─────────────────────────────────────────────

describe('defineConfig', () => {
  it('returns fully resolved config with all defaults when given empty object', () => {
    const config = defineConfig({})

    expect(config.test).toBeDefined()
    expect(config.test!.timeout).toBe(30000)
    expect(config.test!.retry).toBe(2)
    expect(config.evaluation).toBeDefined()
    expect(config.replay).toBeDefined()
  })

  it('merges partial provider config correctly', () => {
    const config = defineConfig({
      providers: {
        openai: { apiKey: 'sk-test-123', provider: 'openai' },
      },
    })

    expect(config.providers).toBeDefined()
    expect(config.providers!.openai).toBeDefined()
    expect(config.providers!.openai!.apiKey).toBe('sk-test-123')
    expect(config.providers!.openai!.provider).toBe('openai')
    // defaults still applied to other sections
    expect(config.test!.timeout).toBe(30000)
  })

  it('merges partial test config correctly', () => {
    const config = defineConfig({
      test: {
        testDir: './my-tests',
        timeout: 60000,
        retry: 0,
        maxConcurrency: 8,
      },
    })

    expect(config.test!.testDir).toBe('./my-tests')
    expect(config.test!.timeout).toBe(60000)
    expect(config.test!.retry).toBe(0)
    expect(config.test!.maxConcurrency).toBe(8)
  })

  it('overrides agent config while preserving other defaults', () => {
    const config = defineConfig({
      agent: {
        provider: 'anthropic',
        model: 'claude-sonnet-4-20250514',
        temperature: 0.5,
        maxTokens: 2048,
      },
    })

    expect(config.agent!.provider).toBe('anthropic')
    expect(config.agent!.model).toBe('claude-sonnet-4-20250514')
    expect(config.agent!.temperature).toBe(0.5)
    expect(config.agent!.maxTokens).toBe(2048)
    // other sections untouched from defaults
    expect(config.test!.timeout).toBe(30000)
  })

  it('supports async config factory', async () => {
    const factory = defineConfig(async () => ({
      test: {
        testDir: './async-tests',
        timeout: 45000,
        retry: 1,
        maxConcurrency: 2,
      },
    }))

    expect(typeof factory).toBe('function')
    const config = await factory()
    expect(config.test!.testDir).toBe('./async-tests')
    expect(config.test!.timeout).toBe(45000)
    // defaults still merged
    expect(config.replay!.enabled).toBe(false)
  })
})

describe('resolveConfig', () => {
  it('returns defaults when user config is empty', () => {
    const config = resolveConfig({})

    expect(config.test).toBeDefined()
    expect(config.test!.timeout).toBe(30000)
    expect(config.evaluation!.judges).toHaveLength(3)
  })

  it('deeply merges user config with defaults', () => {
    const config = resolveConfig({
      test: {
        testDir: './custom',
        timeout: 15000,
        retry: 0,
        maxConcurrency: 1,
      },
    })

    expect(config.test!.testDir).toBe('./custom')
    expect(config.test!.timeout).toBe(15000)
    // evaluation unchanged
    expect(config.evaluation!.judges).toContain('correctness')
  })
})

// ─── resolveConfigPath ────────────────────────────────────────────────────────

const { existsSync: existsSyncActual } = await vi.importActual<typeof import('node:fs')>('node:fs')

describe('resolveConfigPath', () => {
  beforeEach(() => {
    vi.resetModules()
  })

  it('returns null when no config file or package.json is found', async () => {
    vi.doMock('node:fs', () => ({
      existsSync: vi.fn(() => false),
    }))

    const { resolveConfigPath } = await import('./loader')
    const result = resolveConfigPath('/nonexistent/dir')
    expect(result).toBeNull()
  })

  it('returns path for agentbench.config.ts when it exists', async () => {
    const existsSyncMock = vi.fn((filepath: string) => {
      return filepath.endsWith('agentbench.config.ts')
    })

    vi.doMock('node:fs', () => ({
      existsSync: existsSyncMock,
    }))

    const { resolveConfigPath } = await import('./loader')
    const result = resolveConfigPath('/test/project')
    expect(result).toBe('/test/project/agentbench.config.ts')
  })

  it('returns package.json path when no named config files exist but package.json exists', async () => {
    const existsSyncMock = vi.fn((filepath: string) => {
      return filepath.endsWith('package.json')
    })

    vi.doMock('node:fs', () => ({
      existsSync: existsSyncMock,
    }))

    const { resolveConfigPath } = await import('./loader')
    const result = resolveConfigPath('/test/project')
    expect(result).toBe('/test/project/package.json')
  })

  it('prioritizes .ts over .js when both exist', async () => {
    const existsSyncMock = vi.fn((filepath: string) => {
      return filepath.endsWith('.ts') || filepath.endsWith('.js')
    })

    vi.doMock('node:fs', () => ({
      existsSync: existsSyncMock,
    }))

    const { resolveConfigPath } = await import('./loader')
    const result = resolveConfigPath('/test/project')
    expect(result).toBe('/test/project/agentbench.config.ts')
  })

  it('uses process.cwd() when no cwd argument is provided', async () => {
    const cwdSpy = vi.spyOn(process, 'cwd').mockReturnValue('/fake/cwd')
    const existsSyncMock = vi.fn(() => false)

    vi.doMock('node:fs', () => ({
      existsSync: existsSyncMock,
    }))

    const { resolveConfigPath } = await import('./loader')
    const result = resolveConfigPath()

    expect(cwdSpy).toHaveBeenCalled()
    expect(result).toBeNull()

    cwdSpy.mockRestore()
  })
})

// ─── loadConfig ──────────────────────────────────────────────────────────────

describe('loadConfig', () => {
  it('falls back to defaults when no config file exists', async () => {
    vi.doMock('node:fs', () => ({
      existsSync: vi.fn(() => false),
    }))

    const { loadConfig } = await import('./loader')
    const config = await loadConfig('/nonexistent/dir')

    expect(config.test).toBeDefined()
    expect(config.test!.timeout).toBe(30000)
    expect(config.test!.retry).toBe(2)
    expect(config.evaluation).toBeDefined()
  })
})

// ─── Zod Schemas ──────────────────────────────────────────────────────────────

describe('Zod schemas (runtime validation)', () => {
  describe('ProviderConfigSchema', () => {
    it('accepts a valid provider config', () => {
      const result = ProviderConfigSchema.parse({
        provider: 'openai',
        apiKey: 'sk-test',
      })
      expect(result.provider).toBe('openai')
    })

    it('rejects an invalid provider ID', () => {
      expect(() =>
        ProviderConfigSchema.parse({
          provider: 'not-a-real-provider',
        }),
      ).toThrow()
    })

    it('rejects a non-URL apiBase', () => {
      expect(() =>
        ProviderConfigSchema.parse({
          provider: 'openai',
          apiBase: 'not-a-url',
        }),
      ).toThrow()
    })
  })

  describe('AgentConfigSchema', () => {
    it('accepts a valid agent config', () => {
      const result = AgentConfigSchema.parse({
        provider: 'openai',
        model: 'gpt-4o',
        temperature: 0.7,
        maxTokens: 2048,
      })
      expect(result.model).toBe('gpt-4o')
    })

    it('rejects temperature > 2', () => {
      expect(() =>
        AgentConfigSchema.parse({ temperature: 3.0 }),
      ).toThrow()
    })

    it('rejects temperature < 0', () => {
      expect(() =>
        AgentConfigSchema.parse({ temperature: -1 }),
      ).toThrow()
    })

    it('rejects negative maxTokens', () => {
      expect(() =>
        AgentConfigSchema.parse({ maxTokens: -100 }),
      ).toThrow()
    })
  })

  describe('TestConfigSchema', () => {
    it('accepts a valid test config', () => {
      const result = TestConfigSchema.parse({
        testDir: './tests',
        timeout: 30000,
        retry: 2,
        maxConcurrency: 4,
      })
      expect(result.testDir).toBe('./tests')
    })

    it('rejects a negative timeout', () => {
      expect(() =>
        TestConfigSchema.parse({
          testDir: './tests',
          timeout: -1,
          retry: 0,
          maxConcurrency: 1,
        }),
      ).toThrow()
    })

    it('rejects a negative retry count', () => {
      expect(() =>
        TestConfigSchema.parse({
          testDir: './tests',
          timeout: 1000,
          retry: -1,
          maxConcurrency: 1,
        }),
      ).toThrow()
    })
  })

  describe('AgentBenchConfigSchema (full config)', () => {
    it('accepts a complete valid config', () => {
      const validConfig: AgentBenchConfig = {
        providers: {
          openai: { provider: 'openai', apiKey: 'sk-test' },
        },
        agent: {
          provider: 'openai',
          model: 'gpt-4o',
          temperature: 0,
          maxTokens: 4096,
        },
        test: {
          testDir: './tests',
          timeout: 30000,
          retry: 2,
          maxConcurrency: 4,
        },
        assertions: {
          scoreThreshold: 7,
          maxTokens: 4096,
          maxLatency: 30000,
        },
        replay: {
          enabled: false,
          mode: 'deterministic',
        },
        evaluation: {
          judges: ['correctness', 'faithfulness', 'safety'],
          judgeModel: 'openai/gpt-4o-mini',
          scoreThreshold: 7,
        },
        coverage: {
          dimensions: ['prompt', 'workflow', 'tool', 'edge-case'],
        },
        report: {
          formats: ['terminal', 'json'],
        },
        ci: {
          provider: 'github-actions',
        },
      }

      const result = AgentBenchConfigSchema.parse(validConfig)
      expect(result.test!.testDir).toBe('./tests')
    })

    it('rejects invalid nested config', () => {
      const invalidConfig = {
        test: {
          testDir: './tests',
          timeout: 'not-a-number',
          retry: -5,
          maxConcurrency: 0,
        },
      }

      expect(() => AgentBenchConfigSchema.parse(invalidConfig)).toThrow()
    })

    it('accepts a minimal config with only required fields', () => {
      const minimalConfig = {}

      const result = AgentBenchConfigSchema.parse(minimalConfig)
      expect(result).toBeDefined()
      expect(result.test).toBeUndefined()
    })
  })

  describe('AssertionDefaultsSchema', () => {
    it('rejects scoreThreshold outside 1-10 range', () => {
      expect(() =>
        AssertionDefaultsSchema.parse({ scoreThreshold: 0, maxTokens: 100, maxLatency: 1000 }),
      ).toThrow()
      expect(() =>
        AssertionDefaultsSchema.parse({ scoreThreshold: 11, maxTokens: 100, maxLatency: 1000 }),
      ).toThrow()
    })
  })

  describe('EvaluationConfigSchema', () => {
    it('rejects non-array judges', () => {
      expect(() =>
        EvaluationConfigSchema.parse({ judges: 'correctness', judgeModel: 'gpt-4o', scoreThreshold: 7 }),
      ).toThrow()
    })
  })
})
