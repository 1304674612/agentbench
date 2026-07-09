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
  provider: 'openai' | 'anthropic' | 'gemini' | 'deepseek' | 'custom'
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
