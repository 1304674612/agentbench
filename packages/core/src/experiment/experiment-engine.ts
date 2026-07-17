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
  alpha?: number // significance level (default 0.05)
}

export interface TTestResult {
  tStatistic: number
  pValue: number
  significant: boolean
  confidenceLevel: number
  effectSize: number // Cohen's d
  winner?: string
}

export interface MannWhitneyResult {
  uStatistic: number
  pValue: number
  significant: boolean
  effectSize: number // rank-biserial correlation
  winner?: string
}

export interface FullStatisticsResult {
  tTest: TTestResult
  mannWhitney: MannWhitneyResult
  bootstrap: { meanDiff: number; ciLower: number; ciUpper: number; significant: boolean }
  /** Required sample size per variant for 80% power */
  recommendedSampleSize: number
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
// Mann-Whitney U Test (non-parametric, no normality assumption)
// ============================================================

/**
 * Run the Mann-Whitney U test comparing two independent samples.
 * This is a non-parametric alternative to the t-test — it doesn't assume
 * normal distribution and is safer when sample sizes are small.
 */
export function runMannWhitney(input: StatisticsInput): MannWhitneyResult {
  const { variantA, variantB, direction } = input
  const alpha = input.alpha ?? 0.05

  if (variantA.length < 2 || variantB.length < 2) {
    return {
      uStatistic: 0,
      pValue: 1,
      significant: false,
      effectSize: 0,
    }
  }

  const nA = variantA.length
  const nB = variantB.length

  // Combine and rank all values
  const combined: Array<{ value: number; group: 'A' | 'B' }> = [
    ...variantA.map((v) => ({ value: v, group: 'A' as const })),
    ...variantB.map((v) => ({ value: v, group: 'B' as const })),
  ]
  combined.sort((a, b) => a.value - b.value)

  // Assign ranks with tie correction
  const ranks: number[] = new Array(combined.length)
  let i = 0
  while (i < combined.length) {
    let j = i
    while (j < combined.length && combined[j].value === combined[i].value) {
      j++
    }
    const avgRank = (i + j + 1) / 2 // 1-indexed average rank
    for (let k = i; k < j; k++) {
      ranks[k] = avgRank
    }
    i = j
  }

  // Sum ranks for group A
  let rankSumA = 0
  for (let k = 0; k < combined.length; k++) {
    if (combined[k].group === 'A') {
      rankSumA += ranks[k]
    }
  }

  // U statistic for group A
  const uA = rankSumA - (nA * (nA + 1)) / 2
  const uB = nA * nB - uA

  // Use the larger U for two-sided test
  const uStatistic = Math.max(uA, uB)

  // Normal approximation for p-value
  const meanU = (nA * nB) / 2
  const stdU = Math.sqrt((nA * nB * (nA + nB + 1)) / 12)

  const z = stdU === 0 ? 0 : (uStatistic - meanU) / stdU
  const pValue = 2 * (1 - normalCDF(Math.abs(z)))

  // Rank-biserial correlation (effect size for Mann-Whitney)
  const effectSize = Math.abs((2 * uA) / (nA * nB) - 1)

  const significant = pValue < alpha

  // Determine winner
  let winner: string | undefined
  if (significant) {
    const meanA = variantA.reduce((a, b) => a + b, 0) / nA
    const meanB = variantB.reduce((a, b) => a + b, 0) / nB
    if (direction === 'higher_is_better') {
      winner = meanA > meanB ? 'A' : 'B'
    } else {
      winner = meanA < meanB ? 'A' : 'B'
    }
  }

  return {
    uStatistic: Math.round(uStatistic * 100) / 100,
    pValue: Math.round(pValue * 10000) / 10000,
    significant,
    effectSize: Math.round(effectSize * 100) / 100,
    winner,
  }
}

// ============================================================
// Power Analysis & Sample Size
// ============================================================

/**
 * Estimate the required sample size per variant to detect a given
 * effect size at 80% power and α=0.05 (two-sided).
 *
 * Uses the standard formula: n ≈ 2 * (z_α/2 + z_β)² / d²
 */
export function estimateRequiredSampleSize(
  variantA: number[],
  variantB: number[],
  power = 0.8,
  alpha = 0.05
): number {
  if (variantA.length < 2 || variantB.length < 2) return 30

  const meanA = variantA.reduce((a, b) => a + b, 0) / variantA.length
  const meanB = variantB.reduce((a, b) => a + b, 0) / variantB.length
  const varA = variantA.reduce((s, v) => s + (v - meanA) ** 2, 0) / (variantA.length - 1)
  const varB = variantB.reduce((s, v) => s + (v - meanB) ** 2, 0) / (variantB.length - 1)
  const pooledSD = Math.sqrt((varA + varB) / 2)

  const effectSize = pooledSD === 0 ? 0 : Math.abs(meanA - meanB) / pooledSD
  if (effectSize === 0) return 1000 // Can't detect zero effect

  // z_α/2 for two-sided test
  const zAlpha = normalQuantile(1 - alpha / 2)
  // z_β
  const zBeta = normalQuantile(power)

  const n = Math.ceil((2 * (zAlpha + zBeta) ** 2) / effectSize ** 2)
  return Math.max(2, n)
}

// ============================================================
// Full Statistics (runs all tests)
// ============================================================

/**
 * Run all statistical tests and return a comprehensive result.
 */
export function runFullStatistics(input: StatisticsInput): FullStatisticsResult {
  const tTest = runTTest(input)
  const mannWhitney = runMannWhitney(input)
  const bootstrap = runBootstrap(input.variantA, input.variantB)
  const recommendedSampleSize = estimateRequiredSampleSize(
    input.variantA,
    input.variantB
  )

  return {
    tTest,
    mannWhitney,
    bootstrap,
    recommendedSampleSize,
  }
}

// ============================================================
// Multiple Comparison Correction (Bonferroni)
// ============================================================

/**
 * Apply Bonferroni correction to a set of p-values.
 * Used when testing multiple metrics simultaneously to control
 * the family-wise error rate.
 *
 * @returns Corrected p-values and whether each remains significant.
 */
export function bonferroniCorrect(
  pValues: Array<{ metric: string; pValue: number }>,
  alpha = 0.05
): Array<{ metric: string; originalP: number; correctedP: number; significant: boolean }> {
  const n = pValues.length
  if (n === 0) return []

  return pValues.map(({ metric, pValue }) => {
    const correctedP = Math.min(1, pValue * n)
    return {
      metric,
      originalP: pValue,
      correctedP: Math.round(correctedP * 10000) / 10000,
      significant: correctedP < alpha,
    }
  })
}

// ============================================================
// Helpers
// ============================================================

/**
 * Standard normal CDF (Cumulative Distribution Function).
 */
function normalCDF(x: number): number {
  const a1 = 0.254829592
  const a2 = -0.284496736
  const a3 = 1.421413741
  const a4 = -1.453152027
  const a5 = 1.061405429
  const p = 0.3275911

  const sign = x < 0 ? -1 : 1
  x = Math.abs(x) / Math.sqrt(2)
  const t = 1 / (1 + p * x)
  const y = 1 - ((((a5 * t + a4) * t + a3) * t + a2) * t + a1) * t * Math.exp(-x * x)
  return 0.5 * (1 + sign * y)
}

/**
 * Normal quantile (inverse CDF) using the Beasley-Springer-Moro approximation.
 */
function normalQuantile(p: number): number {
  if (p <= 0) return -Infinity
  if (p >= 1) return Infinity

  const a0 = 2.50662823884
  const a1 = -18.61500062529
  const a2 = 41.39119773534
  const a3 = -25.44106049637
  const b1 = -8.4735109309
  const b2 = 23.08336743743
  const b3 = -21.06224101826
  const b4 = 3.13082909833
  const c0 = 0.337475482272615
  const c1 = 0.976169019091719
  const c2 = 0.160797971491821
  const c3 = 2.76438810333863e-2
  const c4 = 3.84057293736094e-3
  const c5 = 3.951896511919e-4
  const c6 = 3.21767881768e-5
  const c7 = 2.888167364e-7
  const c8 = 3.960315187e-7

  let y = p - 0.5
  if (Math.abs(y) < 0.42) {
    const r = y * y
    return (
      y *
      (((a3 * r + a2) * r + a1) * r + a0) /
      ((((b4 * r + b3) * r + b2) * r + b1) * r + 1)
    )
  }

  let r = p
  if (y > 0) r = 1 - p
  r = Math.sqrt(-Math.log(r))

  const quant =
    c0 +
    r * (c1 + r * (c2 + r * (c3 + r * (c4 + r * (c5 + r * (c6 + r * (c7 + r * c8)))))))
  return y < 0 ? -quant : quant
}

/**
 * Approximate the p-value from the t-distribution using Abramowitz & Stegun.
 * For df > 100, uses normal approximation. For smaller df, uses the
 * standard t-distribution CDF approximation.
 */
function approximatePValue(t: number, df: number): number {
  if (t < 0) t = -t
  if (df <= 0) return 1

  // For large degrees of freedom, use normal approximation
  if (df > 100) {
    return 2 * (1 - normalCDF(t))
  }

  // For small df, use the accurate t-distribution CDF
  // Based on Abramowitz & Stegun 26.7.1
  const x = df / (df + t * t)
  const a = 0.5 * regularizedIncompleteBeta(df / 2, 0.5, x)
  const p = 1 - a

  return 2 * p
}

/**
 * Regularized incomplete beta function I_x(a,b) using continued fractions.
 * Used for the t-distribution CDF calculation.
 */
function regularizedIncompleteBeta(a: number, b: number, x: number): number {
  if (x === 0) return 0
  if (x === 1) return 1

  // Use the continued fraction representation (Lentz's method)
  const maxIterations = 200
  const epsilon = 1e-15

  const front =
    (Math.exp(
      a * Math.log(x) +
        b * Math.log(1 - x) -
        Math.log(a) -
        logBeta(a, b)
    ))

  let f = 1
  let c = 1
  let d = 1 - ((a + b) * x) / (a + 1)
  if (Math.abs(d) < 1e-30) d = 1e-30
  d = 1 / d
  let h = d

  for (let m = 1; m <= maxIterations; m++) {
    // Even term: m * (b - m) * x / ((a + 2*m - 1) * (a + 2*m))
    const numerator1 =
      -m * (b - m) * x
    const denominator1 = (a + 2 * m - 1) * (a + 2 * m)
    d = 1 + (numerator1 / denominator1) * d
    if (Math.abs(d) < 1e-30) d = 1e-30
    c = 1 + numerator1 / denominator1 / c
    if (Math.abs(c) < 1e-30) c = 1e-30
    d = 1 / d
    h *= d * c

    // Odd term: m * (a + m) * x / ((a + 2*m) * (a + 2*m + 1))
    const numerator2 = (m * (a + m) * x)
    const denominator2 = (a + 2 * m) * (a + 2 * m + 1)
    d = 1 + (numerator2 / denominator2) * d
    if (Math.abs(d) < 1e-30) d = 1e-30
    c = 1 + numerator2 / denominator2 / c
    if (Math.abs(c) < 1e-30) c = 1e-30
    d = 1 / d
    const del = d * c
    h *= del

    if (Math.abs(del - 1) < epsilon) break
  }

  return front * (h - 1)
}

/**
 * Natural logarithm of the Beta function B(a,b).
 */
function logBeta(a: number, b: number): number {
  return logGamma(a) + logGamma(b) - logGamma(a + b)
}

/**
 * Natural logarithm of the Gamma function (Stirling approximation).
 */
function logGamma(x: number): number {
  if (x <= 0) return 0
  if (x < 0.5) {
    return Math.log(Math.PI) - Math.log(Math.sin(Math.PI * x)) - logGamma(1 - x)
  }
  // Lanczos approximation for log-Gamma
  const g = 7
  const c = [
    0.99999999999980993, 676.5203681218851, -1259.1392167224028,
    771.32342877765313, -176.61502916214059, 12.507343278686905,
    -0.13857109526572012, 9.9843695780195716e-6, 1.5056327351493116e-7,
  ]
  x -= 1
  let a = c[0]
  for (let i = 1; i < g + 2; i++) {
    a += c[i] / (x + i)
  }
  const t = x + g + 0.5
  return 0.5 * Math.log(2 * Math.PI) + (x + 0.5) * Math.log(t) - t + Math.log(a)
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
  const pValuesForCorrection: Array<{ metric: string; pValue: number }> = []
  let mannWhitneyPValue: number | undefined
  let bootstrapCI: { lower: number; upper: number } | undefined
  let recommendedSampleSize: number | undefined

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
        // Run full statistical analysis
        const fullStats = runFullStatistics({
          variantA: valuesA,
          variantB: valuesB,
          direction: metric.direction,
        })

        const tResult = fullStats.tTest
        const mwResult = fullStats.mannWhitney

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

        // Collect p-values for Bonferroni correction
        pValuesForCorrection.push({ metric: metric.name, pValue: tResult.pValue })

        // Prefer Mann-Whitney when data may be non-normal; use t-test as primary
        if (tResult.significant) {
          significantDifference = true
          winnerMetric = tResult.winner
        }

        // Capture aggregate statistics (first metric for now)
        if (mannWhitneyPValue === undefined) {
          mannWhitneyPValue = mwResult.pValue
          bootstrapCI = {
            lower: fullStats.bootstrap.ciLower,
            upper: fullStats.bootstrap.ciUpper,
          }
          recommendedSampleSize = fullStats.recommendedSampleSize
        }
      }
    }
  }

  // Apply Bonferroni correction for multiple comparisons
  const correctedPValues = bonferroniCorrect(pValuesForCorrection)

  // Override significance: at least one metric must survive Bonferroni correction
  const bonferroniSignificant = correctedPValues.some((c) => c.significant)
  if (!bonferroniSignificant && correctedPValues.length > 1) {
    significantDifference = false
    winnerMetric = undefined
  }

  // Conclusion
  let conclusion: ExperimentConclusion = 'inconclusive'
  let summary = 'No statistically significant difference found between variants.'

  if (significantDifference && winnerMetric) {
    conclusion = winnerMetric === 'A' ? 'winner_a' : 'winner_b'
    const winnerName = config.variants.find((v) => v.name === winnerMetric)
    const testUsed = correctedPValues.length > 1 ? '(Bonferroni corrected)' : ''
    summary = `Variant ${winnerMetric} "${winnerName?.config.prompt?.slice(0, 50) ?? winnerName?.config.model ?? ''}" shows statistically significant improvement ${testUsed}.`
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
      test: 'full',
      confidenceLevel: 0.95,
      significantDifference,
      winner: winnerMetric,
      summary,
      mannWhitneyPValue,
      bootstrapCI,
      recommendedSampleSize,
      correctedPValues,
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
