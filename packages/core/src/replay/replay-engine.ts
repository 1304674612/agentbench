/**
 * Replay Engine
 *
 * Supports three replay modes:
 * - Deterministic: replay with same seed for reproducible results
 * - Cross-model: replay with a different model to compare behavior
 * - Batch: replay N times and aggregate statistics
 */

import type { RunConfig, RunResult, RunMetrics } from '../types/run'

// ============================================================
// Types
// ============================================================

export type ReplayMode = 'deterministic' | 'cross_model' | 'batch'

export interface ReplayConfig {
  /** Replay mode */
  mode: ReplayMode
  /** Original run configuration to replay */
  originalConfig: RunConfig
  /** Override the model (for cross-model replay) */
  modelOverride?: {
    provider?: string
    model?: string
    temperature?: number
    maxTokens?: number
  }
  /** Override the system prompt */
  promptOverride?: string
  /** Override tool configurations */
  toolOverrides?: Array<{
    name: string
    description?: string
    parameters?: Record<string, unknown>
  }>
  /** Number of times to replay (for batch mode) */
  batchCount?: number
  /** Seed for deterministic replay */
  seed?: number
  /** Whether to run replays in parallel (batch mode) */
  parallel?: boolean
}

export interface ReplayResult {
  /** Mode used */
  mode: ReplayMode
  /** Original run ID reference */
  originalRunId?: string
  /** Individual replay run results */
  runs: RunResult[]
  /** Aggregated metrics (for batch mode) */
  aggregate?: ReplayAggregate
  /** Comparison to original run */
  comparison?: ReplayComparison
}

export interface ReplayAggregate {
  count: number
  metrics: {
    totalTokens: { mean: number; stddev: number; min: number; max: number }
    totalCost: { mean: number; stddev: number; min: number; max: number }
    totalLatency: { mean: number; stddev: number; min: number; max: number }
    stepCount: { mean: number; stddev: number; min: number; max: number }
    toolCallCount: { mean: number; stddev: number; min: number; max: number }
  }
}

export interface ReplayComparison {
  metricDiffs: MetricDiff[]
  scoreDiffs?: ScoreDiff[]
  regressions: RegressionFlag[]
}

export interface MetricDiff {
  metric: string
  original: number
  replay: number
  changePercent: number
  direction: 'increase' | 'decrease' | 'unchanged'
}

export interface ScoreDiff {
  dimension: string
  original: number
  replay: number
  change: number
}

export interface RegressionFlag {
  metric: string
  severity: 'critical' | 'warning' | 'info'
  direction: 'increased' | 'decreased'
  original: number
  current: number
  threshold: number
  changePercent: number
  message: string
}

// ============================================================
// Replay Config Builder
// ============================================================

/**
 * Build a deterministic replay configuration.
 */
export function buildDeterministicReplay(
  originalConfig: RunConfig,
  options?: { seed?: number },
): ReplayConfig {
  return {
    mode: 'deterministic',
    originalConfig,
    seed: options?.seed ?? originalConfig.options.seed ?? 42,
    batchCount: 1,
  }
}

/**
 * Build a cross-model replay configuration.
 */
export function buildCrossModelReplay(
  originalConfig: RunConfig,
  modelOverride: ReplayConfig['modelOverride'],
): ReplayConfig {
  return {
    mode: 'cross_model',
    originalConfig,
    modelOverride,
  }
}

/**
 * Build a batch replay configuration.
 */
export function buildBatchReplay(
  originalConfig: RunConfig,
  batchCount: number,
  options?: { parallel?: boolean; seed?: number },
): ReplayConfig {
  return {
    mode: 'batch',
    originalConfig,
    batchCount,
    parallel: options?.parallel ?? true,
    seed: options?.seed,
  }
}

// ============================================================
// Config Merge
// ============================================================

/**
 * Apply replay overrides to create a new RunConfig for the replay run.
 */
export function applyReplayOverrides(config: ReplayConfig): RunConfig {
  const { originalConfig, modelOverride, promptOverride, toolOverrides, seed } = config

  const newConfig: RunConfig = {
    ...originalConfig,
    name: `${originalConfig.name} (replay)`,
    agent: {
      ...originalConfig.agent,
      provider: (modelOverride?.provider as RunConfig['agent']['provider']) ?? originalConfig.agent.provider,
      model: modelOverride?.model ?? originalConfig.agent.model,
      temperature: modelOverride?.temperature ?? originalConfig.agent.temperature,
      maxTokens: modelOverride?.maxTokens ?? originalConfig.agent.maxTokens,
      systemPrompt: promptOverride ?? originalConfig.agent.systemPrompt,
      tools: toolOverrides
        ? originalConfig.agent.tools?.map((t) => {
            const override = toolOverrides.find((o) => o.name === t.name)
            if (override) {
              return {
                ...t,
                description: override.description ?? t.description,
                parameters: override.parameters ?? t.parameters,
              }
            }
            return t
          })
        : originalConfig.agent.tools,
    },
    options: {
      ...originalConfig.options,
      seed: seed ?? originalConfig.options.seed,
    },
    tags: [...(originalConfig.tags ?? []), 'replay'],
  }

  return newConfig
}

// ============================================================
// Aggregation
// ============================================================

/**
 * Aggregate metrics from multiple replay runs.
 */
export function aggregateReplayResults(runs: RunResult[]): ReplayAggregate {
  if (runs.length === 0) {
    return {
      count: 0,
      metrics: {
        totalTokens: { mean: 0, stddev: 0, min: 0, max: 0 },
        totalCost: { mean: 0, stddev: 0, min: 0, max: 0 },
        totalLatency: { mean: 0, stddev: 0, min: 0, max: 0 },
        stepCount: { mean: 0, stddev: 0, min: 0, max: 0 },
        toolCallCount: { mean: 0, stddev: 0, min: 0, max: 0 },
      },
    }
  }

  const calcStats = (values: number[]) => {
    const n = values.length
    const mean = values.reduce((a, b) => a + b, 0) / n
    const variance = values.reduce((s, v) => s + (v - mean) ** 2, 0) / n
    return {
      mean: Math.round(mean * 100) / 100,
      stddev: Math.round(Math.sqrt(variance) * 100) / 100,
      min: Math.min(...values),
      max: Math.max(...values),
    }
  }

  return {
    count: runs.length,
    metrics: {
      totalTokens: calcStats(runs.map((r) => r.metrics.totalTokens)),
      totalCost: calcStats(runs.map((r) => r.metrics.totalCost)),
      totalLatency: calcStats(runs.map((r) => r.metrics.totalLatency)),
      stepCount: calcStats(runs.map((r) => r.metrics.stepCount)),
      toolCallCount: calcStats(runs.map((r) => r.metrics.toolCallCount)),
    },
  }
}

// ============================================================
// Comparison
// ============================================================

/**
 * Compare a replay result to the original run metrics.
 */
export function compareReplayToOriginal(
  originalMetrics: RunMetrics,
  replayMetrics: RunMetrics,
  originalScores?: RunResult['scores'],
  replayScores?: RunResult['scores'],
  regressionThresholds?: ReplayRegressionThresholds,
): ReplayComparison {
  const metricDiffs: MetricDiff[] = [
    buildMetricDiff('totalTokens', originalMetrics.totalTokens, replayMetrics.totalTokens),
    buildMetricDiff('totalCost', originalMetrics.totalCost, replayMetrics.totalCost),
    buildMetricDiff('totalLatency', originalMetrics.totalLatency, replayMetrics.totalLatency),
    buildMetricDiff('stepCount', originalMetrics.stepCount, replayMetrics.stepCount),
    buildMetricDiff('toolCallCount', originalMetrics.toolCallCount, replayMetrics.toolCallCount),
    buildMetricDiff('llmCallCount', originalMetrics.llmCallCount, replayMetrics.llmCallCount),
  ]

  const regressions = detectRegressions(metricDiffs, regressionThresholds)

  let scoreDiffs: ScoreDiff[] | undefined
  if (originalScores && replayScores) {
    scoreDiffs = replayScores
      .map((rs) => {
        const orig = originalScores.find((os) => os.evaluator === rs.evaluator)
        if (!orig) return null
        return {
          dimension: rs.evaluator,
          original: orig.score,
          replay: rs.score,
          change: Math.round((rs.score - orig.score) * 100) / 100,
        }
      })
      .filter((s): s is ScoreDiff => s !== null)
  }

  return { metricDiffs, scoreDiffs, regressions }
}

// ============================================================
// Regression Detection
// ============================================================

export interface ReplayRegressionThresholds {
  /** Token increase above this % triggers warning */
  tokenIncreasePercent?: number
  /** Cost increase above this % triggers warning */
  costIncreasePercent?: number
  /** Latency increase above this % triggers warning */
  latencyIncreasePercent?: number
  /** Score decrease above this value triggers warning */
  scoreDecreaseAbsolute?: number
}

const DEFAULT_THRESHOLDS: ReplayRegressionThresholds = {
  tokenIncreasePercent: 20,
  costIncreasePercent: 20,
  latencyIncreasePercent: 30,
  scoreDecreaseAbsolute: 1,
}

/**
 * Detect regressions from metric diffs.
 */
export function detectRegressions(
  diffs: MetricDiff[],
  thresholds?: ReplayRegressionThresholds,
): RegressionFlag[] {
  const t = { ...DEFAULT_THRESHOLDS, ...thresholds }
  const regressions: RegressionFlag[] = []

  for (const diff of diffs) {
    if (diff.direction === 'increase') {
      switch (diff.metric) {
        case 'totalTokens':
          if (diff.changePercent > (t.tokenIncreasePercent ?? 20)) {
            regressions.push({
              metric: diff.metric,
              severity: diff.changePercent > 50 ? 'critical' : 'warning',
              direction: 'increased',
              original: diff.original,
              current: diff.replay,
              threshold: t.tokenIncreasePercent ?? 20,
              changePercent: diff.changePercent,
              message: `Token usage increased by ${diff.changePercent.toFixed(1)}% (${diff.original} → ${diff.replay})`,
            })
          }
          break
        case 'totalCost':
          if (diff.changePercent > (t.costIncreasePercent ?? 20)) {
            regressions.push({
              metric: diff.metric,
              severity: diff.changePercent > 50 ? 'critical' : 'warning',
              direction: 'increased',
              original: diff.original,
              current: diff.replay,
              threshold: t.costIncreasePercent ?? 20,
              changePercent: diff.changePercent,
              message: `Cost increased by ${diff.changePercent.toFixed(1)}% ($${diff.original.toFixed(4)} → $${diff.replay.toFixed(4)})`,
            })
          }
          break
        case 'totalLatency':
          if (diff.changePercent > (t.latencyIncreasePercent ?? 30)) {
            regressions.push({
              metric: diff.metric,
              severity: diff.changePercent > 100 ? 'critical' : 'warning',
              direction: 'increased',
              original: diff.original,
              current: diff.replay,
              threshold: t.latencyIncreasePercent ?? 30,
              changePercent: diff.changePercent,
              message: `Latency increased by ${diff.changePercent.toFixed(1)}% (${diff.original}ms → ${diff.replay}ms)`,
            })
          }
          break
      }
    }
  }

  return regressions
}

// ============================================================
// Helpers
// ============================================================

function buildMetricDiff(
  metric: string,
  original: number,
  replay: number,
): MetricDiff {
  const changePercent =
    original === 0
      ? replay === 0
        ? 0
        : 100
      : Math.round(((replay - original) / original) * 10000) / 100

  return {
    metric,
    original,
    replay,
    changePercent,
    direction:
      changePercent === 0
        ? 'unchanged'
        : changePercent > 0
          ? 'increase'
          : 'decrease',
  }
}
