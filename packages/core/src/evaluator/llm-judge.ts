/**
 * LLM-as-Judge Evaluator
 *
 * Uses an LLM (OpenAI, Anthropic, etc.) to evaluate agent outputs
 * across multiple dimensions (correctness, faithfulness, safety, etc.).
 */

import type { JudgeDimension, JudgeScore, LLMJudgeConfig } from '../types/evaluator'
import { getJudgePrompt, buildJudgeUserPrompt } from './judge-prompts'

export interface LLMJudgeOptions {
  /** Override the default system prompt for a dimension */
  systemPrompt?: string
  /** Override the user prompt template */
  userPrompt?: string
  /** Extra context to pass to the judge */
  extraContext?: Record<string, unknown>
}

export interface JudgeContext {
  /** The input/query given to the agent */
  input: string
  /** The agent's output to evaluate */
  output: string
  /** Optional expected/reference answer */
  expected?: string
  /** Available tools (for tool_usage dimension) */
  tools?: string
  /** Tool calls made (for tool_usage dimension) */
  toolCalls?: string
}

/**
 * Build a complete LLM Judge evaluation prompt for a specific dimension.
 */
export function buildJudgePrompt(
  dimension: JudgeDimension,
  context: JudgeContext,
  options?: LLMJudgeOptions,
): { systemPrompt: string; userPrompt: string } {
  const prompt = getJudgePrompt(dimension)

  const systemPrompt = options?.systemPrompt ?? prompt.systemPrompt
  const userPrompt = buildJudgeUserPrompt(
    { ...prompt, systemPrompt: systemPrompt },
    {
      input: context.input,
      output: context.output,
      expected: context.expected,
      tools: context.tools,
      tool_calls: context.toolCalls,
    },
  )

  return { systemPrompt, userPrompt }
}

/**
 * Parse and validate the LLM judge's JSON response.
 */
export function parseJudgeResponse(
  rawResponse: string,
  dimension: JudgeDimension,
): JudgeScore {
  // Try to extract JSON from the response
  let parsed: { score?: number; reasoning?: string; confidence?: number } = {}

  // Try direct parse
  try {
    parsed = JSON.parse(rawResponse.trim())
  } catch {
    // Try to extract JSON block from markdown
    const jsonMatch = rawResponse.match(/```(?:json)?\s*([\s\S]*?)```/)
    if (jsonMatch) {
      try {
        parsed = JSON.parse(jsonMatch[1].trim())
      } catch {
        // Last resort: try to find a JSON object in the text
        const objMatch = rawResponse.match(/\{[\s\S]*\}/)
        if (objMatch) {
          try {
            parsed = JSON.parse(objMatch[0])
          } catch {
            // Fall through to default
          }
        }
      }
    }
  }

  const score = clampScore(parsed.score, 0, 10)
  const reasoning = parsed.reasoning ?? 'No reasoning provided'

  return {
    dimension,
    score,
    maxScore: 10,
    reasoning,
    confidence: parsed.confidence as number | undefined,
  }
}

/**
 * Execute LLM Judge evaluation by calling the specified LLM API.
 *
 * This is a generic implementation that works with any LLM provider
 * by accepting a `callLLM` function.
 */
export async function runLLMJudge(
  dimension: JudgeDimension,
  context: JudgeContext,
  config: LLMJudgeConfig,
  callLLM: (systemPrompt: string, userPrompt: string, model: string) => Promise<string>,
  options?: LLMJudgeOptions,
): Promise<JudgeScore> {
  const { systemPrompt, userPrompt } = buildJudgePrompt(dimension, context, options)

  const model = config.model ?? 'gpt-4o'
  const startTime = Date.now()

  try {
    const response = await callLLM(systemPrompt, userPrompt, model)
    const result = parseJudgeResponse(response, dimension)
    return { ...result, duration: Date.now() - startTime }
  } catch (err) {
    return {
      dimension,
      score: 0,
      maxScore: 10,
      reasoning: `Judge evaluation failed: ${err instanceof Error ? err.message : String(err)}`,
      duration: Date.now() - startTime,
    }
  }
}

/**
 * Evaluate an agent output across multiple dimensions using LLM judges.
 */
export async function runMultiDimensionJudge(
  dimensions: JudgeDimension[],
  context: JudgeContext,
  config: LLMJudgeConfig,
  callLLM: (systemPrompt: string, userPrompt: string, model: string) => Promise<string>,
  options?: LLMJudgeOptions,
): Promise<JudgeScore[]> {
  const results = await Promise.all(
    dimensions.map((dim) => runLLMJudge(dim, context, config, callLLM, options)),
  )
  return results
}

/**
 * Aggregate multiple judge scores into a single overall score.
 */
export function aggregateScores(
  scores: JudgeScore[],
  strategy: 'average' | 'weighted' | 'min' | 'max' = 'average',
  weights?: Partial<Record<JudgeDimension, number>>,
): { overallScore: number; maxScore: number; scores: JudgeScore[] } {
  if (scores.length === 0) {
    return { overallScore: 0, maxScore: 10, scores: [] }
  }

  let overallScore: number

  switch (strategy) {
    case 'min':
      overallScore = Math.min(...scores.map((s) => s.score))
      break
    case 'max':
      overallScore = Math.max(...scores.map((s) => s.score))
      break
    case 'weighted':
      if (weights) {
        let totalWeight = 0
        let weightedSum = 0
        for (const s of scores) {
          const w = weights[s.dimension] ?? 1
          weightedSum += s.score * w
          totalWeight += w
        }
        overallScore = totalWeight > 0 ? weightedSum / totalWeight : 0
      } else {
        overallScore = scores.reduce((sum, s) => sum + s.score, 0) / scores.length
      }
      break
    case 'average':
    default:
      overallScore = scores.reduce((sum, s) => sum + s.score, 0) / scores.length
      break
  }

  return {
    overallScore: Math.round(overallScore * 100) / 100,
    maxScore: 10,
    scores,
  }
}

// ============================================================
// Helpers
// ============================================================

function clampScore(value: number | undefined, min: number, max: number): number {
  if (value === undefined || isNaN(value)) return 0
  return Math.max(min, Math.min(max, value))
}
