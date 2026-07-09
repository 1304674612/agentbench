/**
 * @agentbench/core — Evaluator Module
 *
 * Evaluation engine for agent outputs:
 * - Rule-Based Evaluator (deterministic checks)
 * - LLM Judge (AI-powered quality assessment)
 * - Hybrid Judge (combined rule + LLM evaluation)
 * - Judge Pool (multi-judge voting)
 */

// Rule-Based Evaluator
export {
  evaluateRule,
  evaluateRules,
  type RuleEvalContext,
  type RuleEvalResult,
} from './rule-evaluator'

// LLM Judge
export {
  buildJudgePrompt,
  parseJudgeResponse,
  runLLMJudge,
  runMultiDimensionJudge,
  aggregateScores,
  type LLMJudgeOptions,
  type JudgeContext,
} from './llm-judge'

// Judge Prompts
export {
  JUDGE_PROMPTS,
  getJudgePrompt,
  buildJudgeUserPrompt,
  getJudgeResponseSchema,
} from './judge-prompts'

// Hybrid Judge + Judge Pool
export {
  runHybridJudge,
  runJudgePool,
  type HybridJudgeContext,
  type HybridJudgeResult,
  type JudgePoolConfig,
  type JudgePoolResult,
} from './hybrid-judge'
