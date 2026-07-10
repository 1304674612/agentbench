import { describe, it, expect } from 'vitest'
import {
  createExperimentConfig,
  validateExperimentConfig,
  extractMetrics,
  runTTest,
  runBootstrap,
  computeVariantResult,
  computeExperimentResults,
  generateConclusion,
  type ExperimentRunInput,
} from './experiment-engine'
import type { ExperimentConfig, ExperimentMetric, VariantConfig } from '../types/experiment'
import type { RunResult } from '../types/run'

function makeVariantConfig(overrides?: Partial<VariantConfig>): VariantConfig {
  return {
    prompt: 'You are a helpful assistant.',
    model: 'gpt-4o',
    temperature: 0.7,
    maxTokens: 4096,
    tools: ['search'],
    systemPrompt: 'Be helpful.',
    ...overrides,
  }
}

function makeRunResult(metrics?: Partial<RunResult['metrics']>, scores?: RunResult['scores']): RunResult {
  return {
    id: 'run_1',
    config: {
      name: 'Test Run',
      projectId: 'proj_1',
      agent: {
        provider: 'openai',
        model: 'gpt-4o',
        temperature: 0.7,
        maxTokens: 4096,
        systemPrompt: 'Be helpful.',
      },
      input: { messages: [{ role: 'user', content: 'Hello' }] },
      options: { timeout: 120000, maxSteps: 50, retries: 0, concurrency: 1 },
    },
    status: 'passed',
    trace: {
      id: 'trace_1',
      runId: 'run_1',
      steps: [],
      metadata: { agentName: 'test', environment: 'development' },
      createdAt: new Date(),
    },
    metrics: {
      totalTokens: metrics?.totalTokens ?? 1500,
      promptTokens: metrics?.promptTokens ?? 600,
      completionTokens: metrics?.completionTokens ?? 900,
      totalCost: metrics?.totalCost ?? 0.003,
      totalLatency: metrics?.totalLatency ?? 2500,
      toolCallCount: metrics?.toolCallCount ?? 3,
      toolSuccessCount: 3,
      toolFailureCount: 0,
      stepCount: metrics?.stepCount ?? 4,
      llmCallCount: metrics?.llmCallCount ?? 2,
    },
    scores: scores ?? [
      { evaluator: 'correctness', score: 8, maxScore: 10 },
    ],
    assertionResults: [],
    startedAt: new Date(),
    endedAt: new Date(),
    duration: 2500,
  }
}

describe('Experiment Engine', () => {
  describe('createExperimentConfig', () => {
    it('creates config with two variants', () => {
      const config = createExperimentConfig({
        name: 'Prompt A/B Test',
        description: 'Comparing two system prompts',
        projectId: 'proj_1',
        variantA: makeVariantConfig({ systemPrompt: 'Be concise.' }),
        variantB: makeVariantConfig({ systemPrompt: 'Be detailed.' }),
      })

      expect(config.name).toBe('Prompt A/B Test')
      expect(config.description).toBe('Comparing two system prompts')
      expect(config.projectId).toBe('proj_1')
      expect(config.variants).toHaveLength(2)
      expect(config.variants[0].name).toBe('A')
      expect(config.variants[1].name).toBe('B')
      expect(config.variants[0].config.systemPrompt).toBe('Be concise.')
      expect(config.variants[1].config.systemPrompt).toBe('Be detailed.')
    })

    it('sets default metrics', () => {
      const config = createExperimentConfig({
        name: 'Test',
        projectId: 'proj_1',
        variantA: makeVariantConfig(),
        variantB: makeVariantConfig(),
      })

      expect(config.metrics).toHaveLength(4)
      expect(config.metrics.map((m) => m.name)).toEqual(['score', 'latency', 'tokens', 'cost'])
    })

    it('accepts custom metrics', () => {
      const customMetrics: ExperimentMetric[] = [
        { name: 'accuracy', type: 'score', evaluator: 'correctness', direction: 'higher_is_better' },
        { name: 'speed', type: 'latency', direction: 'lower_is_better' },
      ]

      const config = createExperimentConfig({
        name: 'Custom',
        projectId: 'proj_1',
        variantA: makeVariantConfig(),
        variantB: makeVariantConfig(),
        metrics: customMetrics,
        runsPerVariant: 20,
      })

      expect(config.metrics).toEqual(customMetrics)
      expect(config.options.runsPerVariant).toBe(20)
    })
  })

  describe('validateExperimentConfig', () => {
    it('validates a correct config', () => {
      const config = createExperimentConfig({
        name: 'Valid',
        projectId: 'proj_1',
        variantA: makeVariantConfig({ systemPrompt: 'Be concise.' }),
        variantB: makeVariantConfig({ systemPrompt: 'Be detailed.' }),
      })

      const result = validateExperimentConfig(config)
      expect(result.valid).toBe(true)
      expect(result.errors).toHaveLength(0)
    })

    it('rejects config with too few variants', () => {
      const config = createExperimentConfig({
        name: 'Invalid',
        projectId: 'proj_1',
        variantA: makeVariantConfig(),
        variantB: makeVariantConfig(),
      })
      config.variants = [{ name: 'A', config: makeVariantConfig() }]

      const result = validateExperimentConfig(config)
      expect(result.valid).toBe(false)
      expect(result.errors.some((e) => e.includes('2 variants'))).toBe(true)
    })

    it('rejects config with too few runs per variant', () => {
      const config = createExperimentConfig({
        name: 'Invalid',
        projectId: 'proj_1',
        variantA: makeVariantConfig(),
        variantB: makeVariantConfig(),
        runsPerVariant: 1,
      })

      const result = validateExperimentConfig(config)
      expect(result.valid).toBe(false)
      expect(result.errors.some((e) => e.includes('2 runs'))).toBe(true)
    })

    it('rejects config with too many runs per variant', () => {
      const config = createExperimentConfig({
        name: 'Invalid',
        projectId: 'proj_1',
        variantA: makeVariantConfig(),
        variantB: makeVariantConfig(),
        runsPerVariant: 2000,
      })

      const result = validateExperimentConfig(config)
      expect(result.valid).toBe(false)
      expect(result.errors.some((e) => e.includes('1000'))).toBe(true)
    })

    it('rejects identical variant configs', () => {
      const sameConfig = makeVariantConfig()
      const config = createExperimentConfig({
        name: 'Invalid',
        projectId: 'proj_1',
        variantA: sameConfig,
        variantB: sameConfig,
      })

      const result = validateExperimentConfig(config)
      expect(result.valid).toBe(false)
      expect(result.errors.some((e) => e.includes('different configurations'))).toBe(true)
    })

    it('rejects empty metrics', () => {
      const config = createExperimentConfig({
        name: 'Invalid',
        projectId: 'proj_1',
        variantA: makeVariantConfig(),
        variantB: makeVariantConfig(),
        metrics: [],
      })

      const result = validateExperimentConfig(config)
      expect(result.valid).toBe(false)
      expect(result.errors.some((e) => e.includes('metric'))).toBe(true)
    })
  })

  describe('extractMetrics', () => {
    const metrics: ExperimentMetric[] = [
      { name: 'score', type: 'score', evaluator: 'correctness', direction: 'higher_is_better' },
      { name: 'latency', type: 'latency', direction: 'lower_is_better' },
      { name: 'tokens', type: 'tokens', direction: 'lower_is_better' },
      { name: 'cost', type: 'cost', direction: 'lower_is_better' },
      { name: 'tools', type: 'tool_calls', direction: 'lower_is_better' },
    ]

    it('extracts score metric from run scores', () => {
      const run = makeRunResult(undefined, [
        { evaluator: 'correctness', score: 8.5, maxScore: 10 },
      ])

      const values = extractMetrics(run, metrics)

      expect(values.score).toBe(8.5)
    })

    it('extracts latency metric', () => {
      const run = makeRunResult({ totalLatency: 3200 })

      const values = extractMetrics(run, metrics)

      expect(values.latency).toBe(3200)
    })

    it('extracts token metric', () => {
      const run = makeRunResult({ totalTokens: 2500 })

      const values = extractMetrics(run, metrics)

      expect(values.tokens).toBe(2500)
    })

    it('extracts cost metric', () => {
      const run = makeRunResult({ totalCost: 0.005 })

      const values = extractMetrics(run, metrics)

      expect(values.cost).toBe(0.005)
    })

    it('extracts tool call count', () => {
      const run = makeRunResult({ toolCallCount: 7 })

      const values = extractMetrics(run, metrics)

      expect(values.tools).toBe(7)
    })

    it('returns 0 for missing score evaluator', () => {
      const run = makeRunResult(undefined, [])

      const values = extractMetrics(run, metrics)

      expect(values.score).toBe(0)
    })
  })

  describe('runTTest', () => {
    it('computes t-test for two groups', () => {
      const result = runTTest({
        variantA: [8, 9, 8, 9, 8, 9, 8, 9, 8, 9],
        variantB: [6, 7, 6, 7, 6, 7, 6, 7, 6, 7],
        direction: 'higher_is_better',
      })

      expect(result.tStatistic).not.toBe(0)
      expect(result.pValue).toBeLessThan(1)
      expect(result.effectSize).toBeGreaterThan(0)
      expect(result.winner).toBe('A')
      expect(result.significant).toBe(true)
    })

    it('detects winner B when lower is better', () => {
      const result = runTTest({
        variantA: [5000, 5100, 4900, 5000, 5100],
        variantB: [1000, 1100, 900, 1000, 1100],
        direction: 'lower_is_better',
      })

      expect(result.winner).toBe('B')
    })

    it('returns no winner when not significant', () => {
      const result = runTTest({
        variantA: [5, 5, 5, 5, 5],
        variantB: [5, 5, 5, 5, 5],
        direction: 'higher_is_better',
      })

      expect(result.winner).toBeUndefined()
      expect(result.significant).toBe(false)
      expect(result.effectSize).toBe(0)
    })

    it('handles small sample sizes', () => {
      const result = runTTest({
        variantA: [8, 9],
        variantB: [6, 7],
        direction: 'higher_is_better',
      })

      expect(result.tStatistic).toBeDefined()
      expect(result.pValue).toBeDefined()
    })

    it('returns default for insufficient data', () => {
      const result = runTTest({
        variantA: [8],
        variantB: [6],
        direction: 'higher_is_better',
      })

      expect(result.tStatistic).toBe(0)
      expect(result.pValue).toBe(1)
      expect(result.significant).toBe(false)
    })
  })

  describe('runBootstrap', () => {
    it('computes bootstrap confidence intervals', () => {
      const result = runBootstrap(
        [8, 9, 8, 9, 8, 9, 8, 9, 8, 9],
        [6, 7, 6, 7, 6, 7, 6, 7, 6, 7],
        1000,
      )

      expect(result.meanDiff).toBeGreaterThan(0)
      expect(result.ciLower).toBeDefined()
      expect(result.ciUpper).toBeDefined()
      expect(result.significant).toBe(true)
    })

    it('handles empty arrays', () => {
      const result = runBootstrap([], [], 10)

      expect(result.meanDiff).toBe(0)
      expect(result.significant).toBe(false)
    })
  })

  describe('computeVariantResult', () => {
    it('computes statistics for a variant', () => {
      const metrics: ExperimentMetric[] = [
        { name: 'score', type: 'score', evaluator: 'correctness', direction: 'higher_is_better' },
      ]

      const runs = [
        makeRunResult(undefined, [{ evaluator: 'correctness', score: 8, maxScore: 10 }]),
        makeRunResult(undefined, [{ evaluator: 'correctness', score: 9, maxScore: 10 }]),
        makeRunResult(undefined, [{ evaluator: 'correctness', score: 10, maxScore: 10 }]),
      ]

      const result = computeVariantResult('A', runs, metrics)

      expect(result.name).toBe('A')
      expect(result.runs).toBe(3)
      expect(result.metrics.score.mean).toBe(9)
      expect(result.metrics.score.median).toBe(9)
      expect(result.metrics.score.stdDev).toBeGreaterThan(0)
    })

    it('computes median correctly for even number of values', () => {
      const metrics: ExperimentMetric[] = [
        { name: 'latency', type: 'latency', direction: 'lower_is_better' },
      ]

      const runs = [
        makeRunResult({ totalLatency: 100 }),
        makeRunResult({ totalLatency: 200 }),
        makeRunResult({ totalLatency: 300 }),
        makeRunResult({ totalLatency: 400 }),
      ]

      const result = computeVariantResult('B', runs, metrics)

      // Median of [100, 200, 300, 400] -> sorted[2] -> 300 (4/2 = 2)
      expect(result.metrics.latency.median).toBe(300)
    })
  })

  describe('computeExperimentResults', () => {
    it('computes experiment results from runs', () => {
      const config = createExperimentConfig({
        name: 'A/B Test',
        projectId: 'proj_1',
        variantA: makeVariantConfig({ systemPrompt: 'Be concise.' }),
        variantB: makeVariantConfig({ systemPrompt: 'Be detailed.' }),
        runsPerVariant: 5,
      })

      const runs: ExperimentRunInput[] = [
        ...Array.from({ length: 5 }, (_, i) => ({
          variant: { name: 'A', config: config.variants[0].config },
          runResult: makeRunResult(undefined, [{ evaluator: 'correctness', score: 8 + i * 0.2, maxScore: 10 }]),
        })),
        ...Array.from({ length: 5 }, (_, i) => ({
          variant: { name: 'B', config: config.variants[1].config },
          runResult: makeRunResult(undefined, [{ evaluator: 'correctness', score: 7 + i * 0.1, maxScore: 10 }]),
        })),
      ]

      const result = computeExperimentResults(runs, config)

      expect(result.status).toBe('completed')
      expect(result.variants).toHaveLength(2)
      expect(result.variants[0].name).toBe('A')
      expect(result.variants[1].name).toBe('B')
      expect(result.statistics.test).toBe('t_test')
      expect(result.statistics.confidenceLevel).toBe(0.95)
      expect(result.conclusion).toBeDefined()
    })

    it('detects tie when all metrics are close', () => {
      const config = createExperimentConfig({
        name: 'Tie Test',
        projectId: 'proj_1',
        variantA: makeVariantConfig(),
        variantB: makeVariantConfig(),
        runsPerVariant: 5,
        metrics: [
          { name: 'score', type: 'score', evaluator: 'correctness', direction: 'higher_is_better' },
        ],
      })

      const runs: ExperimentRunInput[] = [
        ...Array.from({ length: 5 }, () => ({
          variant: { name: 'A', config: config.variants[0].config },
          runResult: makeRunResult(undefined, [{ evaluator: 'correctness', score: 8.0, maxScore: 10 }]),
        })),
        ...Array.from({ length: 5 }, () => ({
          variant: { name: 'B', config: config.variants[1].config },
          runResult: makeRunResult(undefined, [{ evaluator: 'correctness', score: 8.0, maxScore: 10 }]),
        })),
      ]

      const result = computeExperimentResults(runs, config)

      expect(result.conclusion).toBe('tie')
    })
  })

  describe('generateConclusion', () => {
    it('generates winner message', () => {
      const result = {
        id: '',
        experimentId: '',
        status: 'completed' as const,
        conclusion: 'winner_a' as const,
        variants: [],
        statistics: {
          test: 't_test' as const,
          confidenceLevel: 0.95,
          significantDifference: true,
          winner: 'A',
          summary: 'Variant A wins!',
        },
        startedAt: new Date(),
        endedAt: new Date(),
        duration: 0,
      }

      const message = generateConclusion(result)
      expect(message).toContain('A')
      expect(message).toContain('wins')
    })

    it('generates tie message', () => {
      const result = {
        id: '',
        experimentId: '',
        status: 'completed' as const,
        conclusion: 'tie' as const,
        variants: [],
        statistics: {
          test: 't_test' as const,
          confidenceLevel: 0.95,
          significantDifference: false,
          summary: '',
        },
        startedAt: new Date(),
        endedAt: new Date(),
        duration: 0,
      }

      const message = generateConclusion(result)
      expect(message).toContain('Tie')
    })

    it('generates inconclusive message', () => {
      const result = {
        id: '',
        experimentId: '',
        status: 'completed' as const,
        conclusion: 'inconclusive' as const,
        variants: [],
        statistics: {
          test: 't_test' as const,
          confidenceLevel: 0.95,
          significantDifference: false,
          summary: '',
        },
        startedAt: new Date(),
        endedAt: new Date(),
        duration: 0,
      }

      const message = generateConclusion(result)
      expect(message).toContain('Inconclusive')
    })
  })
})
