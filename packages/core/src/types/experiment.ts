export type ExperimentStatus = 'draft' | 'running' | 'completed' | 'failed' | 'cancelled'
export type ExperimentConclusion = 'winner_a' | 'winner_b' | 'inconclusive' | 'tie'

export interface ExperimentConfig {
  name: string
  description?: string
  projectId: string
  variants: ExperimentVariant[]
  metrics: ExperimentMetric[]
  options: ExperimentOptions
}

export interface ExperimentVariant {
  name: string // "A" or "B"
  config: VariantConfig
}

export interface VariantConfig {
  prompt?: string
  model?: string
  temperature?: number
  maxTokens?: number
  tools?: string[] // tool names to include
  systemPrompt?: string
}

export interface ExperimentMetric {
  name: string
  type: 'score' | 'latency' | 'tokens' | 'cost' | 'tool_calls' | 'custom'
  evaluator?: string // which evaluator to use for score metrics
  direction: 'higher_is_better' | 'lower_is_better'
}

export interface ExperimentOptions {
  runsPerVariant: number // N repetitions
  concurrency: number
  timeout: number
  seed?: number
}

export interface ExperimentResult {
  id: string
  experimentId: string
  status: ExperimentStatus
  conclusion?: ExperimentConclusion
  variants: VariantResult[]
  statistics: ExperimentStatistics
  startedAt?: Date
  endedAt?: Date
  duration?: number
}

export interface VariantResult {
  name: string
  runs: number
  metrics: Record<string, {
    mean: number
    median: number
    stdDev: number
    pValue?: number
    significant: boolean
    effectSize?: number
  }>
}

export interface ExperimentStatistics {
  test: 't_test' | 'bootstrap' | 'mann_whitney'
  confidenceLevel: number
  significantDifference: boolean
  winner?: string
  summary: string
}
