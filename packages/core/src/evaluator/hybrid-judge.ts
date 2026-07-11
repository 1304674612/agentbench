/**
 * Hybrid Judge — combines Rule-Based evaluation with LLM-as-Judge.
 *
 * Supports three strategies:
 * - `rule_first`: Run rules first, only use LLM if rules are inconclusive
 * - `llm_first`: Run LLM first, use rules as fallback
 * - `parallel`: Run both, combine results
 *
 * Supports voting strategies:
 * - `majority`: Majority vote wins
 * - `unanimous`: All judges must agree
 * - `weighted`: Weighted by configured weights
 */

import type {
  HybridJudgeConfig,
  JudgeDimension,
  JudgeScore,
  LLMJudgeConfig,
  RuleEvaluatorConfig,
} from '../types/evaluator'
import { evaluateRules, type RuleEvalContext, type RuleEvalResult } from './rule-evaluator'

// ============================================================
// Types
// ============================================================

export interface HybridJudgeContext {
  /** Rule evaluation context */
  ruleContext: RuleEvalContext
  /** LLM judge context */
  llmInput: string
  llmOutput: string
  llmExpected?: string
  tools?: string
  toolCalls?: string
}

export interface HybridJudgeResult {
  passed: boolean
  score: number
  maxScore: number
  dimension: JudgeDimension | 'overall'
  ruleResults?: RuleEvalResult[]
  judgeScores?: JudgeScore[]
  reasoning: string
  duration?: number
}

export interface JudgePoolConfig {
  /** Judges to use in the pool */
  judges: Array<{
    type: 'rule' | 'llm'
    config: Record<string, unknown>
    weight?: number
  }>
  /** Voting strategy */
  votingStrategy: 'majority' | 'unanimous' | 'weighted'
}

export interface JudgePoolResult {
  passed: boolean
  score: number
  maxScore: number
  individualResults: HybridJudgeResult[]
  reasoning: string
  consensus: 'strong' | 'moderate' | 'weak' | 'none'
}

// ============================================================
// Hybrid Judge
// ============================================================

/**
 * Run a hybrid evaluation combining rules and LLM judge.
 */
export async function runHybridJudge(
  config: HybridJudgeConfig,
  context: HybridJudgeContext,
  callLLM?: (systemPrompt: string, userPrompt: string, model: string) => Promise<string>
): Promise<HybridJudgeResult> {
  const startTime = Date.now()

  switch (config.strategy) {
    case 'rule_first':
      return runRuleFirst(config, context, callLLM, startTime)
    case 'llm_first':
      return runLLMFirst(config, context, callLLM, startTime)
    case 'parallel':
      return runParallel(config, context, callLLM, startTime)
    default:
      return runRuleFirst(config, context, callLLM, startTime)
  }
}

async function runRuleFirst(
  config: HybridJudgeConfig,
  context: HybridJudgeContext,
  callLLM?: (systemPrompt: string, userPrompt: string, model: string) => Promise<string>,
  startTime?: number
): Promise<HybridJudgeResult> {
  const { results, totalScore, maxScore, allPassed } = evaluateRules(
    config.rules,
    context.ruleContext
  )

  // If rules are conclusive (all passed with high confidence), skip LLM
  if (allPassed && config.rules.length > 0) {
    return {
      passed: true,
      score: maxScore > 0 ? (totalScore / maxScore) * 10 : 10,
      maxScore: 10,
      dimension: 'overall',
      ruleResults: results,
      reasoning: `All ${config.rules.length} rule(s) passed. LLM judge skipped.`,
      duration: Date.now() - (startTime ?? Date.now()),
    }
  }

  // Rules inconclusive or failed — use LLM judge
  if (callLLM) {
    const { runLLMJudge } = await import('./llm-judge')
    const dimensions: JudgeDimension[] = config.llmJudge.dimensions ?? ['correctness']
    const llmContext = {
      input: context.llmInput,
      output: context.llmOutput,
      expected: context.llmExpected,
      tools: context.tools,
      tool_calls: context.toolCalls,
    }

    const judgeScores = await Promise.all(
      dimensions.map((dim) => runLLMJudge(dim, llmContext, config.llmJudge, callLLM))
    )

    const llmAvg = judgeScores.reduce((s, r) => s + r.score, 0) / judgeScores.length
    // Blend: 40% rules, 60% LLM
    const ruleScore = maxScore > 0 ? (totalScore / maxScore) * 10 : 0
    const blendedScore = 0.4 * ruleScore + 0.6 * llmAvg

    return {
      passed: blendedScore >= 6,
      score: Math.round(blendedScore * 100) / 100,
      maxScore: 10,
      dimension: 'overall',
      ruleResults: results,
      judgeScores,
      reasoning: `Blended score: rules ${ruleScore.toFixed(1)}/10 (40%) + LLM ${llmAvg.toFixed(1)}/10 (60%) = ${blendedScore.toFixed(1)}/10`,
      duration: Date.now() - (startTime ?? Date.now()),
    }
  }

  // No LLM available — use rules only
  return {
    passed: allPassed,
    score: maxScore > 0 ? (totalScore / maxScore) * 10 : 0,
    maxScore: 10,
    dimension: 'overall',
    ruleResults: results,
    reasoning: `Rule-based only: ${totalScore}/${maxScore} passed.`,
    duration: Date.now() - (startTime ?? Date.now()),
  }
}

async function runLLMFirst(
  config: HybridJudgeConfig,
  context: HybridJudgeContext,
  callLLM?: (systemPrompt: string, userPrompt: string, model: string) => Promise<string>,
  startTime?: number
): Promise<HybridJudgeResult> {
  let judgeScores: JudgeScore[] | undefined

  if (callLLM) {
    const { runLLMJudge } = await import('./llm-judge')
    const dimensions: JudgeDimension[] = config.llmJudge.dimensions ?? ['correctness']

    judgeScores = await Promise.all(
      dimensions.map((dim) =>
        runLLMJudge(
          dim,
          {
            input: context.llmInput,
            output: context.llmOutput,
            expected: context.llmExpected,
            tools: context.tools,
            toolCalls: context.toolCalls,
          },
          config.llmJudge,
          callLLM
        )
      )
    )

    const llmAvg = judgeScores.reduce((s, r) => s + r.score, 0) / judgeScores.length

    // If LLM is confident (score >= 7 or <= 3), skip rules
    if (llmAvg >= 7 || llmAvg <= 3) {
      return {
        passed: llmAvg >= 6,
        score: llmAvg,
        maxScore: 10,
        dimension: 'overall',
        judgeScores,
        reasoning: `LLM judge confident (avg ${llmAvg.toFixed(1)}/10). Rules skipped.`,
        duration: Date.now() - (startTime ?? Date.now()),
      }
    }
  }

  // LLM uncertain or not available — use rules
  const { results, totalScore, maxScore } = evaluateRules(config.rules, context.ruleContext)

  const ruleScore = maxScore > 0 ? (totalScore / maxScore) * 10 : 0
  const llmAvg = judgeScores
    ? judgeScores.reduce((s, r) => s + r.score, 0) / judgeScores.length
    : ruleScore

  const blendedScore = 0.6 * llmAvg + 0.4 * ruleScore

  return {
    passed: blendedScore >= 6,
    score: Math.round(blendedScore * 100) / 100,
    maxScore: 10,
    dimension: 'overall',
    ruleResults: results,
    judgeScores,
    reasoning: `Blended score: LLM ${llmAvg.toFixed(1)}/10 (60%) + rules ${ruleScore.toFixed(1)}/10 (40%) = ${blendedScore.toFixed(1)}/10`,
    duration: Date.now() - (startTime ?? Date.now()),
  }
}

async function runParallel(
  config: HybridJudgeConfig,
  context: HybridJudgeContext,
  callLLM?: (systemPrompt: string, userPrompt: string, model: string) => Promise<string>,
  startTime?: number
): Promise<HybridJudgeResult> {
  // Run rules synchronously
  const { results, totalScore, maxScore } = evaluateRules(config.rules, context.ruleContext)
  const ruleScore = maxScore > 0 ? (totalScore / maxScore) * 10 : 0

  // Run LLM judge in parallel
  let judgeScores: JudgeScore[] | undefined
  if (callLLM) {
    const { runLLMJudge } = await import('./llm-judge')
    const dimensions: JudgeDimension[] = config.llmJudge.dimensions ?? ['correctness']

    judgeScores = await Promise.all(
      dimensions.map((dim) =>
        runLLMJudge(
          dim,
          {
            input: context.llmInput,
            output: context.llmOutput,
            expected: context.llmExpected,
            tools: context.tools,
            toolCalls: context.toolCalls,
          },
          config.llmJudge,
          callLLM
        )
      )
    )
  }

  const llmAvg = judgeScores
    ? judgeScores.reduce((s, r) => s + r.score, 0) / judgeScores.length
    : ruleScore

  // Equal weighting for parallel strategy
  const blendedScore = 0.5 * ruleScore + 0.5 * llmAvg

  return {
    passed: blendedScore >= 6,
    score: Math.round(blendedScore * 100) / 100,
    maxScore: 10,
    dimension: 'overall',
    ruleResults: results,
    judgeScores,
    reasoning: `Parallel evaluation: rules ${ruleScore.toFixed(1)}/10, LLM ${llmAvg.toFixed(1)}/10 → blended ${blendedScore.toFixed(1)}/10`,
    duration: Date.now() - (startTime ?? Date.now()),
  }
}

// ============================================================
// Judge Pool
// ============================================================

/**
 * Run a pool of judges with voting to reach consensus.
 */
export async function runJudgePool(
  poolConfig: JudgePoolConfig,
  ruleContext: RuleEvalContext,
  llmContext: { input: string; output: string; expected?: string },
  callLLM?: (systemPrompt: string, userPrompt: string, model: string) => Promise<string>
): Promise<JudgePoolResult> {
  const results = await Promise.all(
    poolConfig.judges.map(async (judge, index) => {
      if (judge.type === 'rule') {
        const {
          results: ruleResults,
          totalScore,
          maxScore,
          allPassed,
        } = evaluateRules(
          [(judge.config as { rules?: RuleEvaluatorConfig[] }).rules?.[0] ?? judge.config].filter(
            Boolean
          ) as RuleEvaluatorConfig[],
          ruleContext
        )
        return {
          passed: allPassed,
          score: maxScore > 0 ? (totalScore / maxScore) * 10 : 0,
          maxScore: 10,
          dimension: 'overall' as const,
          ruleResults,
          reasoning: `Judge ${index + 1} (rule): ${allPassed ? 'passed' : 'failed'}`,
        } satisfies HybridJudgeResult
      }

      // LLM judge
      if (callLLM) {
        const { runLLMJudge } = await import('./llm-judge')
        const llmConfig = judge.config as unknown as LLMJudgeConfig
        const finalConfig: LLMJudgeConfig = {
          provider: llmConfig.provider ?? 'openai',
          model: llmConfig.model ?? 'gpt-4o',
          dimensions: llmConfig.dimensions ?? ['correctness'],
        }
        const judgeResult = await runLLMJudge('correctness', llmContext, finalConfig, callLLM)
        return {
          passed: judgeResult.score >= 6,
          score: judgeResult.score,
          maxScore: 10,
          dimension: 'overall' as const,
          judgeScores: [judgeResult],
          reasoning: `Judge ${index + 1} (LLM): ${judgeResult.score}/10`,
        } satisfies HybridJudgeResult
      }

      return {
        passed: true,
        score: 5,
        maxScore: 10,
        dimension: 'overall' as const,
        reasoning: `Judge ${index + 1}: skipped (no LLM available)`,
      } satisfies HybridJudgeResult
    })
  )

  // Compute consensus
  const votesPassed = results.filter((r) => r.passed).length
  const total = results.length
  let passed: boolean
  let consensus: JudgePoolResult['consensus']

  switch (poolConfig.votingStrategy) {
    case 'unanimous':
      passed = votesPassed === total
      consensus = passed ? 'strong' : 'none'
      break
    case 'weighted': {
      const weights = poolConfig.judges.map((j) => j.weight ?? 1)
      const totalWeight = weights.reduce((a, b) => a + b, 0)
      const weightedVotes = results.reduce((sum, r, i) => sum + (r.passed ? weights[i] : 0), 0)
      passed = weightedVotes >= totalWeight / 2
      const ratio = weightedVotes / totalWeight
      consensus =
        ratio >= 0.8 ? 'strong' : ratio >= 0.6 ? 'moderate' : ratio >= 0.4 ? 'weak' : 'none'
      break
    }
    case 'majority':
    default:
      passed = votesPassed > total / 2
      const passRatio = votesPassed / total
      consensus =
        passRatio >= 0.8
          ? 'strong'
          : passRatio >= 0.6
            ? 'moderate'
            : passRatio >= 0.4
              ? 'weak'
              : 'none'
      break
  }

  const avgScore = results.reduce((s, r) => s + r.score, 0) / total

  return {
    passed,
    score: Math.round(avgScore * 100) / 100,
    maxScore: 10,
    individualResults: results,
    reasoning: `${votesPassed}/${total} judges passed (${poolConfig.votingStrategy}), consensus: ${consensus}`,
    consensus,
  }
}

// Re-export types
export type { LLMJudgeConfig }
