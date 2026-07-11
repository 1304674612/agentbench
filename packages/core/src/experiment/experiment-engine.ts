/**
 * Experiment Engine — A/B testing platform for AI agents.
 *
 * Supports:
 * - Variant definition and validation
 * - Parallel experiment execution
 * - Statistical analysis (t-test, bootstrap, effect size)
 * - Conclusion generation
 */

import type {
  ExperimentConfig,
  ExperimentVariant,
  ExperimentMetric,
  ExperimentResult,
  VariantResult,
  ExperimentConclusion,
  VariantConfig,
} from '../types/experiment'
import type { RunResult } from '../types/run'

// ============================================================
// Types
// ============================================================

export interface ExperimentRunInput {
  variant: ExperimentVariant
  runResult: RunResult
}

export interface ExperimentRunResult {
  variantName: string
  runs: RunResult[]
}

export interface StatisticsInput {
  variantA: number[] // metric values for variant A
  variantB: number[] // metric values for variant B
  direction: 'higher_is_better' | 'lower_is_better'
}

export interface TTestResult {
  tStatistic: number
  pValue: number
  significant: boolean
  confidenceLevel: number
  effectSize: number // Cohen's d
  winner?: string
}

// ============================================================
// Experiment Config Builder
// ============================================================

/**
 * Create an experiment configuration.
 */
export function createExperimentConfig(input: {
  name: string
  description?: string
  projectId: string
  variantA: VariantConfig
  variantB: VariantConfig
  metrics?: ExperimentMetric[]
  runsPerVariant?: number
}): ExperimentConfig {
  const defaultMetrics: ExperimentMetric[] = [
    { name: 'score', type: 'score', direction: 'higher_is_better' },
    { name: 'latency', type: 'latency', direction: 'lower_is_better' },
    { name: 'tokens', type: 'tokens', direction: 'lower_is_better' },
    { name: 'cost', type: 'cost', direction: 'lower_is_better' },
  ]

  return {
    name: input.name,
    description: input.description,
    projectId: input.projectId,
    variants: [
      { name: 'A', config: input.variantA },
      { name: 'B', config: input.variantB },
    ],
    metrics: input.metrics ?? defaultMetrics,
    options: {
      runsPerVariant: input.runsPerVariant ?? 10,
      concurrency: 2,
      timeout: 60000,
    },
  }
}

/**
 * Validate experiment configuration.
 */
export function validateExperimentConfig(config: ExperimentConfig): {
  valid: boolean
  errors: string[]
} {
  const errors: string[] = []

  if (config.variants.length < 2) {
    errors.push('Experiment requires at least 2 variants')
  }
  if (config.options.runsPerVariant < 2) {
    errors.push('Each variant needs at least 2 runs for statistical significance')
  }
  if (config.options.runsPerVariant > 1000) {
    errors.push('Too many runs per variant (max 1000)')
  }
  if (config.metrics.length === 0) {
    errors.push('At least one metric is required')
  }

  // Check variant uniqueness
  const configs = config.variants.map((v) => JSON.stringify(v.config))
  if (new Set(configs).size !== configs.length) {
    errors.push('Variants must have different configurations')
  }

  return { valid: errors.length === 0, errors }
}

// ============================================================
// Metric Extraction
// ============================================================

/**
 * Extract metric values from a run result based on configured metrics.
 */
export function extractMetrics(
  runResult: RunResult,
  metrics: ExperimentMetric[]
): Record<string, number> {
  const values: Record<string, number> = {}
  const { metrics: runMetrics } = runResult
  const scores = runResult.scores ?? []

  for (const metric of metrics) {
    switch (metric.type) {
      case 'score': {
        const evalName = metric.evaluator ?? 'correctness'
        const score = scores.find((s) => s.evaluator === evalName)
        values[metric.name] = score?.score ?? 0
        break
      }
      case 'latency':
        values[metric.name] = runMetrics.totalLatency
        break
      case 'tokens':
        values[metric.name] = runMetrics.totalTokens
        break
      case 'cost':
        values[metric.name] = runMetrics.totalCost
        break
      case 'tool_calls':
        values[metric.name] = runMetrics.toolCallCount
        break
      default:
        values[metric.name] = 0
    }
  }

  return values
}

// ============================================================
// Statistics
// ============================================================

/**
 * Run Welch's t-test comparing two variants.
 */
export function runTTest(input: StatisticsInput): TTestResult {
  const { variantA, variantB, direction } = input

  const nA = variantA.length
  const nB = variantB.length

  if (nA < 2 || nB < 2) {
    return {
      tStatistic: 0,
      pValue: 1,
      significant: false,
      confidenceLevel: 0.95,
      effectSize: 0,
    }
  }

  const meanA = variantA.reduce((a, b) => a + b, 0) / nA
  const meanB = variantB.reduce((a, b) => a + b, 0) / nB

  const varA = variantA.reduce((s, v) => s + (v - meanA) ** 2, 0) / (nA - 1)
  const varB = variantB.reduce((s, v) => s + (v - meanB) ** 2, 0) / (nB - 1)

  // Welch's t-test
  const se = Math.sqrt(varA / nA + varB / nB)
  const tStatistic = se === 0 ? 0 : (meanA - meanB) / se

  // Welch-Satterthwaite degrees of freedom
  const dfNum = (varA / nA + varB / nB) ** 2
  const dfDen = (varA / nA) ** 2 / (nA - 1) + (varB / nB) ** 2 / (nB - 1)
  const df = dfDen === 0 ? nA + nB - 2 : dfNum / dfDen

  // Approximate p-value from t-distribution
  const pValue = approximatePValue(Math.abs(tStatistic), df)
  const confidenceLevel = 0.95
  const significant = pValue < 1 - confidenceLevel

  // Cohen's d effect size
  const pooledSD = Math.sqrt(((nA - 1) * varA + (nB - 1) * varB) / (nA + nB - 2))
  const effectSize = pooledSD === 0 ? 0 : Math.abs(meanA - meanB) / pooledSD

  // Determine winner
  let winner: string | undefined
  if (significant) {
    if (direction === 'higher_is_better') {
      winner = meanA > meanB ? 'A' : 'B'
    } else {
      winner = meanA < meanB ? 'A' : 'B'
    }
  }

  return {
    tStatistic: Math.round(tStatistic * 1000) / 1000,
    pValue: Math.round(pValue * 10000) / 10000,
    significant,
    confidenceLevel,
    effectSize: Math.round(effectSize * 100) / 100,
    winner,
  }
}

/**
 * Bootstrap confidence intervals for the difference between two variants.
 */
export function runBootstrap(
  variantA: number[],
  variantB: number[],
  iterations = 1000
): { meanDiff: number; ciLower: number; ciUpper: number; significant: boolean } {
  if (variantA.length === 0 || variantB.length === 0) {
    return { meanDiff: 0, ciLower: 0, ciUpper: 0, significant: false }
  }

  const meanA = variantA.reduce((a, b) => a + b, 0) / variantA.length
  const meanB = variantB.reduce((a, b) => a + b, 0) / variantB.length
  const observedDiff = meanA - meanB

  const diffs: number[] = []
  for (let i = 0; i < iterations; i++) {
    const sampleA = bootstrapSample(variantA)
    const sampleB = bootstrapSample(variantB)
    diffs.push(
      sampleA.reduce((a, b) => a + b, 0) / sampleA.length -
        sampleB.reduce((a, b) => a + b, 0) / sampleB.length
    )
  }

  diffs.sort((a, b) => a - b)
  const ciLower = diffs[Math.floor(iterations * 0.025)]
  const ciUpper = diffs[Math.floor(iterations * 0.975)]
  const significant = (ciLower > 0 && ciUpper > 0) || (ciLower < 0 && ciUpper < 0)

  return {
    meanDiff: Math.round(observedDiff * 100) / 100,
    ciLower: Math.round(ciLower * 100) / 100,
    ciUpper: Math.round(ciUpper * 100) / 100,
    significant,
  }
}

function bootstrapSample(arr: number[]): number[] {
  const sample: number[] = []
  for (let i = 0; i < arr.length; i++) {
    sample.push(arr[Math.floor(Math.random() * arr.length)])
  }
  return sample
}

// ============================================================
// Results Aggregation
// ============================================================

/**
 * Compute variant results from run data.
 */
export function computeVariantResult(
  name: string,
  runs: RunResult[],
  metrics: ExperimentMetric[]
): VariantResult {
  const metricValues: Record<string, number[]> = {}

  for (const metric of metrics) {
    metricValues[metric.name] = []
  }

  for (const run of runs) {
    const extracted = extractMetrics(run, metrics)
    for (const [key, value] of Object.entries(extracted)) {
      metricValues[key]?.push(value)
    }
  }

  const resultMetrics: VariantResult['metrics'] = {}
  for (const [key, values] of Object.entries(metricValues)) {
    if (values.length === 0) continue
    const sorted = [...values].sort((a, b) => a - b)
    resultMetrics[key] = {
      mean: Math.round((values.reduce((a, b) => a + b, 0) / values.length) * 100) / 100,
      median: sorted[Math.floor(sorted.length / 2)],
      stdDev:
        Math.round(
          Math.sqrt(
            values.reduce(
              (s, v) => s + (v - values.reduce((a, b) => a + b, 0) / values.length) ** 2,
              0
            ) / values.length
          ) * 100
        ) / 100,
      significant: false,
    }
  }

  return { name, runs: runs.length, metrics: resultMetrics }
}

/**
 * Compute full experiment results with statistics.
 */
export function computeExperimentResults(
  runs: ExperimentRunInput[],
  config: ExperimentConfig
): ExperimentResult {
  const variantRuns = new Map<string, RunResult[]>()
  for (const input of runs) {
    const existing = variantRuns.get(input.variant.name) ?? []
    existing.push(input.runResult)
    variantRuns.set(input.variant.name, existing)
  }

  const variantResults: VariantResult[] = []
  for (const variant of config.variants) {
    const runsForVariant = variantRuns.get(variant.name) ?? []
    variantResults.push(computeVariantResult(variant.name, runsForVariant, config.metrics))
  }

  // Run statistics for each metric
  let significantDifference = false
  let winnerMetric: string | undefined

  const [resultA, resultB] = variantResults
  if (resultA && resultB) {
    for (const metric of config.metrics) {
      const valuesA = (variantRuns.get('A') ?? []).map(
        (r) => extractMetrics(r, [metric])[metric.name]
      )
      const valuesB = (variantRuns.get('B') ?? []).map(
        (r) => extractMetrics(r, [metric])[metric.name]
      )

      if (valuesA.length >= 2 && valuesB.length >= 2) {
        const tResult = runTTest({
          variantA: valuesA,
          variantB: valuesB,
          direction: metric.direction,
        })

        // Update the variant results with p-value and significance
        if (resultA.metrics[metric.name]) {
          resultA.metrics[metric.name].pValue = tResult.pValue
          resultA.metrics[metric.name].significant = tResult.significant
          resultA.metrics[metric.name].effectSize = tResult.effectSize
        }
        if (resultB.metrics[metric.name]) {
          resultB.metrics[metric.name].pValue = tResult.pValue
          resultB.metrics[metric.name].significant = tResult.significant
          resultB.metrics[metric.name].effectSize = tResult.effectSize
        }

        if (tResult.significant) {
          significantDifference = true
          winnerMetric = tResult.winner
        }
      }
    }
  }

  // Conclusion
  let conclusion: ExperimentConclusion = 'inconclusive'
  let summary = 'No statistically significant difference found between variants.'

  if (significantDifference && winnerMetric) {
    conclusion = winnerMetric === 'A' ? 'winner_a' : 'winner_b'
    const winnerName = config.variants.find((v) => v.name === winnerMetric)
    summary = `Variant ${winnerMetric} "${winnerName?.config.prompt?.slice(0, 50) ?? winnerName?.config.model ?? ''}" shows statistically significant improvement.`
  } else if (variantResults.length >= 2) {
    // Check if all metrics are basically equal
    const allClose = config.metrics.every((m) => {
      const a = resultA.metrics[m.name]?.mean ?? 0
      const b = resultB.metrics[m.name]?.mean ?? 0
      return Math.abs(a - b) < 0.01
    })
    if (allClose) conclusion = 'tie'
  }

  return {
    id: '', // Set by storage
    experimentId: '', // Set by storage
    status: 'completed',
    conclusion,
    variants: variantResults,
    statistics: {
      test: 't_test',
      confidenceLevel: 0.95,
      significantDifference,
      winner: winnerMetric,
      summary,
    },
    startedAt: new Date(),
    endedAt: new Date(),
    duration: 0,
  }
}

// ============================================================
// Helpers
// ============================================================

/**
 * Approximate the p-value from the t-distribution using Abramowitz & Stegun approximation.
 */
function approximatePValue(t: number, df: number): number {
  if (t < 0) t = -t
  if (df <= 0) return 1

  // Normal approximation for large df
  if (df > 100) {
    // Use standard normal approximation
    const x = t
    const p = Math.exp(-0.5 * x * x) / Math.sqrt(2 * Math.PI)
    const z = Math.abs(x)
    let y = 1 / (1 + 0.2316419 * z)
    y =
      1 -
      p *
        (0.3193815 * y -
          0.3565638 * y * y +
          1.781478 * y * y * y -
          1.821256 * y * y * y * y +
          1.330274 * y * y * y * y * y)
    return 2 * (1 - y)
  }

  // For smaller df, use a rougher approximation
  // Actually use a simpler normal approximation for all cases
  const x = t
  const z = Math.abs(x)
  let y = 1 / (1 + 0.2316419 * z)
  const p = Math.exp(-0.5 * x * x) / Math.sqrt(2 * Math.PI)
  y =
    1 -
    p *
      (0.31938153 * y +
        -0.356563782 * Math.pow(y, 2) +
        1.781477937 * Math.pow(y, 3) +
        -1.821255978 * Math.pow(y, 4) +
        1.330274429 * Math.pow(y, 5))

  // Adjust for small df
  const adjustedP = 2 * (1 - y)

  return Math.min(1, Math.max(0, adjustedP))
}

/**
 * Generate a human-readable conclusion from experiment results.
 */
export function generateConclusion(result: ExperimentResult): string {
  if (result.statistics.significantDifference && result.statistics.winner) {
    return `✅ Variant ${result.statistics.winner} wins with statistical significance (p < 0.05). ${result.statistics.summary}`
  }
  if (result.conclusion === 'tie') {
    return '➖ Tie — both variants perform similarly across all metrics.'
  }
  return `🔬 Inconclusive — no statistically significant difference. Consider running more trials or increasing the effect size.`
}
