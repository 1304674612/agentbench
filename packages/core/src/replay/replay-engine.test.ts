import { describe, it, expect } from 'vitest'
import {
  buildDeterministicReplay,
  buildCrossModelReplay,
  buildBatchReplay,
  applyReplayOverrides,
  aggregateReplayResults,
  compareReplayToOriginal,
  detectRegressions,
  type ReplayConfig,
} from './replay-engine'
import type { RunConfig, RunResult, RunMetrics } from '../types/run'

function makeRunConfig(overrides?: Partial<RunConfig>): RunConfig {
  return {
    name: 'Test Run',
    projectId: 'proj_1',
    agent: {
      provider: 'openai',
      model: 'gpt-4o',
      temperature: 0.7,
      maxTokens: 4096,
      systemPrompt: 'You are a helpful assistant.',
      tools: [
        { name: 'search', description: 'Search the web', parameters: {} },
        { name: 'calculator', description: 'Calculate', parameters: {} },
      ],
    },
    input: {
      messages: [{ role: 'user', content: 'Hello' }],
      variables: { lang: 'en' },
    },
    options: {
      timeout: 120000,
      maxSteps: 50,
      retries: 0,
      concurrency: 1,
      seed: 42,
    },
    tags: ['v1'],
    ...overrides,
  } as RunConfig
}

function makeRunResult(overrides?: Partial<RunResult>): RunResult {
  return {
    id: 'run_1',
    config: makeRunConfig(),
    status: 'passed',
    trace: {
      id: 'trace_1',
      runId: 'run_1',
      steps: [],
      metadata: { agentName: 'test', environment: 'development' },
      createdAt: new Date(),
    },
    metrics: {
      totalTokens: 1500,
      promptTokens: 600,
      completionTokens: 900,
      totalCost: 0.003,
      totalLatency: 2500,
      stepCount: 3,
      llmCallCount: 2,
      toolCallCount: 3,
      toolSuccessCount: 3,
      toolFailureCount: 0,
    },
    scores: [
      { evaluator: 'correctness', score: 8, maxScore: 10 },
      { evaluator: 'faithfulness', score: 9, maxScore: 10 },
    ],
    assertionResults: [],
    startedAt: new Date(),
    endedAt: new Date(),
    duration: 2500,
    ...overrides,
  } as RunResult
}

function makeMetrics(overrides?: Partial<RunMetrics>): RunMetrics {
  return {
    totalTokens: 1500,
    promptTokens: 600,
    completionTokens: 900,
    totalCost: 0.003,
    totalLatency: 2500,
    stepCount: 3,
    llmCallCount: 2,
    toolCallCount: 3,
    toolSuccessCount: 3,
    toolFailureCount: 0,
    ...overrides,
  }
}

describe('Replay Engine', () => {
  describe('replay config builders', () => {
    it('buildDeterministicReplay creates valid config', () => {
      const original = makeRunConfig()
      const config = buildDeterministicReplay(original)

      expect(config.mode).toBe('deterministic')
      expect(config.originalConfig).toBe(original)
      expect(config.seed).toBe(42)
      expect(config.batchCount).toBe(1)
    })

    it('buildDeterministicReplay uses provided seed', () => {
      const original = makeRunConfig()
      const config = buildDeterministicReplay(original, { seed: 123 })

      expect(config.seed).toBe(123)
    })

    it('buildCrossModelReplay creates cross-model config', () => {
      const original = makeRunConfig()
      const config = buildCrossModelReplay(original, {
        provider: 'anthropic',
        model: 'claude-sonnet-4-20250514',
      })

      expect(config.mode).toBe('cross_model')
      expect(config.modelOverride!.provider).toBe('anthropic')
      expect(config.modelOverride!.model).toBe('claude-sonnet-4-20250514')
    })

    it('buildBatchReplay creates batch config', () => {
      const original = makeRunConfig()
      const config = buildBatchReplay(original, 10)

      expect(config.mode).toBe('batch')
      expect(config.batchCount).toBe(10)
      expect(config.parallel).toBe(true)
    })

    it('buildBatchReplay supports sequential mode', () => {
      const original = makeRunConfig()
      const config = buildBatchReplay(original, 5, { parallel: false })

      expect(config.parallel).toBe(false)
    })
  })

  describe('applyReplayOverrides', () => {
    it('creates new config with replay suffix', () => {
      const config = buildDeterministicReplay(makeRunConfig())
      const newConfig = applyReplayOverrides(config)

      expect(newConfig.name).toBe('Test Run (replay)')
      expect(newConfig.agent.provider).toBe('openai')
      expect(newConfig.agent.model).toBe('gpt-4o')
    })

    it('overrides model for cross-model replay', () => {
      const original = makeRunConfig()
      const config = buildCrossModelReplay(original, {
        provider: 'anthropic',
        model: 'claude-sonnet-4-20250514',
        temperature: 0.5,
        maxTokens: 2000,
      })
      const newConfig = applyReplayOverrides(config)

      expect(newConfig.agent.provider).toBe('anthropic')
      expect(newConfig.agent.model).toBe('claude-sonnet-4-20250514')
      expect(newConfig.agent.temperature).toBe(0.5)
      expect(newConfig.agent.maxTokens).toBe(2000)
    })

    it('overrides system prompt when promptOverride is set', () => {
      const original = makeRunConfig()
      const config: ReplayConfig = {
        mode: 'deterministic',
        originalConfig: original,
        promptOverride: 'You are a different assistant.',
      }
      const newConfig = applyReplayOverrides(config)

      expect(newConfig.agent.systemPrompt).toBe('You are a different assistant.')
    })

    it('overrides tool configurations', () => {
      const original = makeRunConfig()
      const config: ReplayConfig = {
        mode: 'deterministic',
        originalConfig: original,
        toolOverrides: [
          { name: 'search', description: 'Updated search tool' },
        ],
      }
      const newConfig = applyReplayOverrides(config)

      const searchTool = newConfig.agent.tools?.find((t) => t.name === 'search')
      expect(searchTool).toBeDefined()
      expect(searchTool!.description).toBe('Updated search tool')
    })

    it('applies seed override for deterministic replay', () => {
      const config = buildDeterministicReplay(makeRunConfig(), { seed: 777 })
      const newConfig = applyReplayOverrides(config)

      expect(newConfig.options.seed).toBe(777)
    })

    it('adds replay tag', () => {
      const config = buildDeterministicReplay(makeRunConfig())
      const newConfig = applyReplayOverrides(config)

      expect(newConfig.tags).toContain('replay')
      expect(newConfig.tags).toContain('v1')
    })

    it('partial model override preserves other settings', () => {
      const original = makeRunConfig()
      const config = buildCrossModelReplay(original, {
        model: 'gpt-4o-mini',
      })
      const newConfig = applyReplayOverrides(config)

      expect(newConfig.agent.model).toBe('gpt-4o-mini')
      expect(newConfig.agent.provider).toBe('openai') // unchanged
      expect(newConfig.agent.temperature).toBe(0.7) // unchanged
    })
  })

  describe('aggregateReplayResults', () => {
    it('aggregates metrics from multiple runs', () => {
      const runs = [
        makeRunResult({ metrics: makeMetrics({ totalTokens: 1000, totalCost: 0.002, totalLatency: 2000 }) }),
        makeRunResult({ metrics: makeMetrics({ totalTokens: 1200, totalCost: 0.003, totalLatency: 2500 }) }),
        makeRunResult({ metrics: makeMetrics({ totalTokens: 1100, totalCost: 0.0025, totalLatency: 3000 }) }),
      ]

      const aggregate = aggregateReplayResults(runs)

      expect(aggregate.count).toBe(3)
      expect(aggregate.metrics.totalTokens.mean).toBe(1100)
      expect(aggregate.metrics.totalTokens.min).toBe(1000)
      expect(aggregate.metrics.totalTokens.max).toBe(1200)
      expect(aggregate.metrics.totalTokens.stddev).toBeGreaterThan(0)
    })

    it('handles empty runs array', () => {
      const aggregate = aggregateReplayResults([])

      expect(aggregate.count).toBe(0)
      expect(aggregate.metrics.totalTokens.mean).toBe(0)
      expect(aggregate.metrics.totalTokens.stddev).toBe(0)
    })

    it('returns zero stddev for single run', () => {
      const runs = [makeRunResult()]

      const aggregate = aggregateReplayResults(runs)

      expect(aggregate.count).toBe(1)
      expect(aggregate.metrics.totalTokens.stddev).toBe(0)
    })

    it('aggregates all metric types', () => {
      const runs = [makeRunResult(), makeRunResult()]

      const aggregate = aggregateReplayResults(runs)

      expect(aggregate.metrics.totalTokens).toBeDefined()
      expect(aggregate.metrics.totalCost).toBeDefined()
      expect(aggregate.metrics.totalLatency).toBeDefined()
      expect(aggregate.metrics.stepCount).toBeDefined()
      expect(aggregate.metrics.toolCallCount).toBeDefined()
    })
  })

  describe('compareReplayToOriginal', () => {
    it('compares metrics between original and replay', () => {
      const original = makeMetrics({ totalTokens: 1000, totalLatency: 2000 })
      const replay = makeMetrics({ totalTokens: 1200, totalLatency: 1800 })

      const comparison = compareReplayToOriginal(original, replay)

      expect(comparison.metricDiffs).toHaveLength(6)
      const tokenDiff = comparison.metricDiffs.find((d) => d.metric === 'totalTokens')
      expect(tokenDiff).toBeDefined()
      expect(tokenDiff!.original).toBe(1000)
      expect(tokenDiff!.replay).toBe(1200)
      expect(tokenDiff!.changePercent).toBe(20)
    })

    it('detects regressions', () => {
      const original = makeMetrics({ totalTokens: 1000, totalCost: 0.001, totalLatency: 2000 })
      const replay = makeMetrics({ totalTokens: 1500, totalCost: 0.003, totalLatency: 10000 })

      const comparison = compareReplayToOriginal(original, replay)

      expect(comparison.regressions.length).toBeGreaterThan(0)
    })

    it('compares scores when provided', () => {
      const original = makeMetrics()
      const replay = makeMetrics()

      const comparison = compareReplayToOriginal(
        original,
        replay,
        [{ evaluator: 'correctness', score: 8, maxScore: 10 }],
        [{ evaluator: 'correctness', score: 9, maxScore: 10 }],
      )

      expect(comparison.scoreDiffs).toBeDefined()
      expect(comparison.scoreDiffs!.length).toBe(1)
      expect(comparison.scoreDiffs![0].change).toBe(1)
    })

    it('detects token increase regression', () => {
      const original = makeMetrics({ totalTokens: 100 })
      const replay = makeMetrics({ totalTokens: 200 })

      const comparison = compareReplayToOriginal(original, replay)

      const regressions = comparison.regressions.filter((r) => r.metric === 'totalTokens')
      expect(regressions.length).toBeGreaterThan(0)
    })
  })

  describe('detectRegressions', () => {
    it('detects critical token increase', () => {
      const diffs = [
        { metric: 'totalTokens', original: 100, replay: 200, changePercent: 100, direction: 'increase' as const },
      ]

      const regressions = detectRegressions(diffs)

      expect(regressions).toHaveLength(1)
      expect(regressions[0].severity).toBe('critical')
      expect(regressions[0].metric).toBe('totalTokens')
    })

    it('detects warning-level increases', () => {
      const diffs = [
        { metric: 'totalCost', original: 0.01, replay: 0.013, changePercent: 30, direction: 'increase' as const },
      ]

      const regressions = detectRegressions(diffs)

      expect(regressions).toHaveLength(1)
      expect(regressions[0].severity).toBe('warning')
    })

    it('ignores decreases', () => {
      const diffs = [
        { metric: 'totalLatency', original: 5000, replay: 2000, changePercent: -60, direction: 'decrease' as const },
      ]

      const regressions = detectRegressions(diffs)

      expect(regressions).toHaveLength(0)
    })

    it('uses custom thresholds', () => {
      const diffs = [
        { metric: 'totalTokens', original: 100, replay: 115, changePercent: 15, direction: 'increase' as const },
      ]

      // Default threshold is 20%, so 15% should not trigger
      const defaultResult = detectRegressions(diffs)
      expect(defaultResult).toHaveLength(0)

      // Custom threshold of 10% should trigger
      const customResult = detectRegressions(diffs, { tokenIncreasePercent: 10 })
      expect(customResult).toHaveLength(1)
    })

    it('returns empty array for unchanged metrics', () => {
      const diffs = [
        { metric: 'totalTokens', original: 100, replay: 100, changePercent: 0, direction: 'unchanged' as const },
      ]

      const regressions = detectRegressions(diffs)

      expect(regressions).toHaveLength(0)
    })
  })
})
