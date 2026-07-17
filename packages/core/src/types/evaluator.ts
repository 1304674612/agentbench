export type EvaluatorType = 'rule_based' | 'llm_judge' | 'hybrid'

export interface EvaluatorConfig {
  type: EvaluatorType
  rules?: RuleEvaluatorConfig[]
  judge?: LLMJudgeConfig
  hybrid?: HybridJudgeConfig
}

// ============================================================
// Rule-Based Evaluator
// ============================================================

export type RuleType =
  | 'exact_match'
  | 'contains'
  | 'regex_match'
  | 'json_schema'
  | 'tool_called'
  | 'tool_not_called'
  | 'tool_called_with'
  | 'tool_called_times'
  | 'status_code'
  | 'latency_lt'
  | 'tokens_lt'
  | 'tokens_gt'
  | 'cost_lt'
  | 'cost_gt'

export interface RuleEvaluatorConfig {
  type: RuleType
  params: Record<string, unknown>
  weight?: number // for weighted scoring
}

// ============================================================
// LLM Judge
// ============================================================

export type JudgeDimension =
  | 'correctness'
  | 'faithfulness'
  | 'safety'
  | 'relevance'
  | 'completeness'
  | 'reasoning'
  | 'conciseness'
  | 'tool_usage'

export interface LLMJudgeConfig {
  provider:
    | 'openai'
    | 'anthropic'
    | 'gemini'
    | 'deepseek'
    | 'groq'
    | 'ollama'
    | 'openrouter'
    | 'azure-openai'
    | 'mcp'
    | 'custom'
  model: string
  dimensions: JudgeDimension[]
  temperature?: number
  maxTokens?: number
  rubric?: string // custom scoring rubric
  apiKey?: string
}

export interface JudgePrompt {
  dimension: JudgeDimension
  systemPrompt: string
  userPromptTemplate: string
}

export interface JudgeScore {
  dimension: JudgeDimension
  score: number
  maxScore: number
  reasoning: string
  confidence?: number
  duration?: number
}

// ============================================================
// Hybrid Judge
// ============================================================

export interface HybridJudgeConfig {
  rules: RuleEvaluatorConfig[]
  llmJudge: LLMJudgeConfig
  strategy: 'rule_first' | 'llm_first' | 'parallel'
  votingStrategy?: 'majority' | 'unanimous' | 'weighted'
}

// ============================================================
// Scoring Constants
// ============================================================

/** Maximum score for any evaluation dimension. */
export const MAX_SCORE = 10

/** Default pass/fail threshold: scores >= this value are considered passing. */
export const DEFAULT_PASS_THRESHOLD = 6

/** Minimum score value. */
export const MIN_SCORE = 0

/** Blending weights for hybrid judge strategies. */
export const HYBRID_BLEND = {
  /** rule_first: 40% rules, 60% LLM when rules inconclusive */
  rule_first: { rule: 0.4, llm: 0.6 },
  /** llm_first: 60% LLM, 40% rules when LLM uncertain */
  llm_first: { rule: 0.4, llm: 0.6 },
  /** parallel: 50% rules, 50% LLM */
  parallel: { rule: 0.5, llm: 0.5 },
} as const

/** LLM judge confidence thresholds. */
export const LLM_CONFIDENCE = {
  /** Scores >= this value are considered high-confidence pass by LLM. */
  highPass: 7,
  /** Scores <= this value are considered high-confidence fail by LLM. */
  highFail: 3,
} as const

/** Judge pool consensus thresholds. */
export const CONSENSUS_RATIOS = {
  strong: 0.8,
  moderate: 0.6,
  weak: 0.4,
} as const
