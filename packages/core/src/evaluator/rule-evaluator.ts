/**
 * Rule-Based Evaluator
 *
 * Provides deterministic, rule-based evaluation methods for agent outputs.
 * All evaluators return { passed: boolean; score: number; reason: string }.
 */

import type { RuleEvaluatorConfig } from '../types/evaluator'
import { validateJsonNode, deepEqual, truncate, countOccurrences } from '../utils/json-validator'

export interface RuleEvalResult {
  passed: boolean
  score: number
  maxScore: number
  reason: string
  details?: Record<string, unknown>
}

/**
 * Run a single rule evaluation against agent output and trace data.
 */
export function evaluateRule(
  config: RuleEvaluatorConfig,
  context: RuleEvalContext,
): RuleEvalResult {
  switch (config.type) {
    case 'exact_match':
      return evalExactMatch(config.params, context)
    case 'contains':
      return evalContains(config.params, context)
    case 'regex_match':
      return evalRegexMatch(config.params, context)
    case 'json_schema':
      return evalJsonSchema(config.params, context)
    case 'tool_called':
      return evalToolCalled(config.params, context)
    case 'tool_not_called':
      return evalToolNotCalled(config.params, context)
    case 'tool_called_with':
      return evalToolCalledWith(config.params, context)
    case 'tool_called_times':
      return evalToolCalledTimes(config.params, context)
    case 'status_code':
      return evalStatusCode(config.params, context)
    case 'latency_lt':
      return evalLatencyLt(config.params, context)
    case 'tokens_lt':
      return evalTokensLt(config.params, context)
    case 'tokens_gt':
      return evalTokensGt(config.params, context)
    case 'cost_lt':
      return evalCostLt(config.params, context)
    case 'cost_gt':
      return evalCostGt(config.params, context)
    default:
      return {
        passed: false,
        score: 0,
        maxScore: 1,
        reason: `Unknown rule type: ${(config as { type: string }).type}`,
      }
  }
}

/**
 * Run multiple rule evaluations and aggregate scores.
 */
export function evaluateRules(
  configs: RuleEvaluatorConfig[],
  context: RuleEvalContext,
): { results: RuleEvalResult[]; totalScore: number; maxScore: number; allPassed: boolean } {
  const results = configs.map((c) => evaluateRule(c, context))
  const totalScore = results.reduce((sum, r) => sum + r.score, 0)
  const maxScore = results.reduce((sum, r) => sum + r.maxScore, 0)
  const allPassed = results.every((r) => r.passed)
  return { results, totalScore, maxScore, allPassed }
}

// ============================================================
// Context
// ============================================================

export interface RuleEvalContext {
  /** The final agent output text */
  output: string
  /** All tool calls made during the execution */
  toolCalls?: Array<{
    name: string
    arguments: Record<string, unknown>
    result?: unknown
    error?: string
  }>
  /** Run metrics */
  metrics?: {
    totalTokens?: number
    totalCost?: number
    totalLatency?: number
    stepCount?: number
    llmCallCount?: number
  }
  /** Status code from the run */
  statusCode?: number
  /** Execution status */
  status?: string
}

// ============================================================
// Evaluator implementations
// ============================================================

function evalExactMatch(
  params: Record<string, unknown>,
  ctx: RuleEvalContext,
): RuleEvalResult {
  const expected = String(params.expected ?? '')
  const normalize = params.normalize === true
  const caseSensitive = params.caseSensitive !== false

  let actual = ctx.output
  let expectedNorm = expected

  if (normalize) {
    actual = actual.replace(/\s+/g, ' ').trim()
    expectedNorm = expectedNorm.replace(/\s+/g, ' ').trim()
  }
  if (!caseSensitive) {
    actual = actual.toLowerCase()
    expectedNorm = expectedNorm.toLowerCase()
  }

  const passed = actual === expectedNorm
  return {
    passed,
    score: passed ? 1 : 0,
    maxScore: 1,
    reason: passed ? 'Output matches expected exactly' : `Expected "${truncate(expectedNorm, 80)}" but got "${truncate(actual, 80)}"`,
    details: { expected, actual: ctx.output },
  }
}

function evalContains(
  params: Record<string, unknown>,
  ctx: RuleEvalContext,
): RuleEvalResult {
  const substring = String(params.substring ?? params.value ?? '')
  const caseSensitive = params.caseSensitive !== false
  const minOccurrences = Number(params.minOccurrences ?? 1)

  let output = ctx.output
  let searchStr = substring
  if (!caseSensitive) {
    output = output.toLowerCase()
    searchStr = searchStr.toLowerCase()
  }

  const count = countOccurrences(output, searchStr)
  const passed = count >= minOccurrences
  return {
    passed,
    score: passed ? 1 : 0,
    maxScore: 1,
    reason: passed
      ? `Output contains "${truncate(substring, 40)}" (${count}x)`
      : `Expected output to contain "${truncate(substring, 40)}" at least ${minOccurrences} time(s), found ${count}`,
    details: { substring, count, minOccurrences },
  }
}

function evalRegexMatch(
  params: Record<string, unknown>,
  ctx: RuleEvalContext,
): RuleEvalResult {
  const pattern = String(params.pattern ?? '')
  const flags = String(params.flags ?? '')
  if (!pattern) {
    return { passed: false, score: 0, maxScore: 1, reason: 'No regex pattern provided' }
  }

  try {
    const regex = new RegExp(pattern, flags)
    const match = regex.test(ctx.output)
    const matches = ctx.output.match(regex)
    return {
      passed: match,
      score: match ? 1 : 0,
      maxScore: 1,
      reason: match
        ? `Output matches pattern /${pattern}/${flags}`
        : `Output does not match pattern /${pattern}/${flags}`,
      details: { pattern, flags, matchCount: matches?.length },
    }
  } catch (err) {
    return {
      passed: false,
      score: 0,
      maxScore: 1,
      reason: `Invalid regex pattern: ${err instanceof Error ? err.message : String(err)}`,
    }
  }
}

function evalJsonSchema(
  params: Record<string, unknown>,
  ctx: RuleEvalContext,
): RuleEvalResult {
  const schema = params.schema as Record<string, unknown> | undefined
  if (!schema) {
    return { passed: false, score: 0, maxScore: 1, reason: 'No JSON schema provided' }
  }

  // Try to parse the output as JSON
  let parsed: unknown
  try {
    parsed = JSON.parse(ctx.output.trim())
  } catch {
    return { passed: false, score: 0, maxScore: 1, reason: 'Output is not valid JSON' }
  }

  // Validate against the schema (simple structural validation)
  const errors = validateJsonNode(parsed, schema, '')
  const passed = errors.length === 0
  return {
    passed,
    score: passed ? 1 : 0,
    maxScore: 1,
    reason: passed
      ? 'Output matches the expected JSON schema'
      : `Schema validation errors: ${errors.join('; ')}`,
    details: { errors },
  }
}

function evalToolCalled(
  params: Record<string, unknown>,
  ctx: RuleEvalContext,
): RuleEvalResult {
  const toolName = String(params.tool ?? params.name ?? '')
  const tools = ctx.toolCalls ?? []
  const called = tools.some((t) => t.name === toolName)
  return {
    passed: called,
    score: called ? 1 : 0,
    maxScore: 1,
    reason: called
      ? `Tool "${toolName}" was called`
      : `Tool "${toolName}" was not called (${tools.length} tool call(s) total)`,
    details: { toolName, toolsCalled: tools.map((t) => t.name) },
  }
}

function evalToolNotCalled(
  params: Record<string, unknown>,
  ctx: RuleEvalContext,
): RuleEvalResult {
  const toolName = String(params.tool ?? params.name ?? '')
  const tools = ctx.toolCalls ?? []
  const notCalled = !tools.some((t) => t.name === toolName)
  return {
    passed: notCalled,
    score: notCalled ? 1 : 0,
    maxScore: 1,
    reason: notCalled
      ? `Tool "${toolName}" was not called (as expected)`
      : `Tool "${toolName}" was called unexpectedly`,
    details: { toolName, toolsCalled: tools.map((t) => t.name) },
  }
}

function evalToolCalledWith(
  params: Record<string, unknown>,
  ctx: RuleEvalContext,
): RuleEvalResult {
  const toolName = String(params.tool ?? params.name ?? '')
  const expectedArgs = (params.arguments ?? params.args ?? {}) as Record<string, unknown>
  const tools = ctx.toolCalls ?? []
  const toolCall = tools.find((t) => t.name === toolName)

  if (!toolCall) {
    return {
      passed: false,
      score: 0,
      maxScore: 1,
      reason: `Tool "${toolName}" was not called`,
    }
  }

  // Check each expected argument
  const mismatches: string[] = []
  for (const [key, expectedValue] of Object.entries(expectedArgs)) {
    const actualValue = toolCall.arguments[key]
    if (!deepEqual(actualValue, expectedValue)) {
      mismatches.push(`${key}: expected ${JSON.stringify(expectedValue)}, got ${JSON.stringify(actualValue)}`)
    }
  }

  const passed = mismatches.length === 0
  return {
    passed,
    score: passed ? 1 : 0,
    maxScore: 1,
    reason: passed
      ? `Tool "${toolName}" was called with expected arguments`
      : `Tool "${toolName}" argument mismatches: ${mismatches.join('; ')}`,
    details: { toolName, expectedArgs, actualArgs: toolCall.arguments, mismatches },
  }
}

function evalToolCalledTimes(
  params: Record<string, unknown>,
  ctx: RuleEvalContext,
): RuleEvalResult {
  const toolName = String(params.tool ?? params.name ?? '')
  const expected = Number(params.times ?? params.count ?? 1)
  const operator = String(params.operator ?? 'eq')

  const tools = ctx.toolCalls ?? []
  const count = tools.filter((t) => t.name === toolName).length

  let passed: boolean
  switch (operator) {
    case 'eq':
      passed = count === expected
      break
    case 'gt':
      passed = count > expected
      break
    case 'gte':
      passed = count >= expected
      break
    case 'lt':
      passed = count < expected
      break
    case 'lte':
      passed = count <= expected
      break
    default:
      passed = count === expected
  }

  return {
    passed,
    score: passed ? 1 : 0,
    maxScore: 1,
    reason: passed
      ? `Tool "${toolName}" called ${count} time(s) (expected ${operator} ${expected})`
      : `Tool "${toolName}" called ${count} time(s), expected ${operator} ${expected}`,
    details: { toolName, count, expected, operator },
  }
}

function evalStatusCode(
  params: Record<string, unknown>,
  ctx: RuleEvalContext,
): RuleEvalResult {
  const expected = Number(params.code ?? params.status ?? 200)
  const actual = ctx.statusCode ?? 200
  const passed = actual === expected
  return {
    passed,
    score: passed ? 1 : 0,
    maxScore: 1,
    reason: passed ? `Status code ${actual} matches expected` : `Expected status ${expected}, got ${actual}`,
    details: { expected, actual },
  }
}

function evalLatencyLt(
  params: Record<string, unknown>,
  ctx: RuleEvalContext,
): RuleEvalResult {
  const threshold = Number(params.threshold ?? params.ms ?? 10000)
  const latency = ctx.metrics?.totalLatency ?? 0
  const passed = latency < threshold
  return {
    passed,
    score: passed ? 1 : 0,
    maxScore: 1,
    reason: passed
      ? `Latency ${latency}ms < ${threshold}ms ✓`
      : `Latency ${latency}ms exceeds threshold ${threshold}ms`,
    details: { latency, threshold },
  }
}

function evalTokensLt(
  params: Record<string, unknown>,
  ctx: RuleEvalContext,
): RuleEvalResult {
  const threshold = Number(params.threshold ?? params.count ?? 4096)
  const tokens = ctx.metrics?.totalTokens ?? 0
  const passed = tokens < threshold
  return {
    passed,
    score: passed ? 1 : 0,
    maxScore: 1,
    reason: passed
      ? `Tokens ${tokens} < ${threshold} ✓`
      : `Tokens ${tokens} exceeds threshold ${threshold}`,
    details: { tokens, threshold },
  }
}

function evalTokensGt(
  params: Record<string, unknown>,
  ctx: RuleEvalContext,
): RuleEvalResult {
  const threshold = Number(params.threshold ?? params.count ?? 0)
  const tokens = ctx.metrics?.totalTokens ?? 0
  const passed = tokens > threshold
  return {
    passed,
    score: passed ? 1 : 0,
    maxScore: 1,
    reason: passed
      ? `Tokens ${tokens} > ${threshold} ✓`
      : `Tokens ${tokens} is not greater than ${threshold}`,
    details: { tokens, threshold },
  }
}

function evalCostLt(
  params: Record<string, unknown>,
  ctx: RuleEvalContext,
): RuleEvalResult {
  const threshold = Number(params.threshold ?? params.dollars ?? 0.1)
  const cost = ctx.metrics?.totalCost ?? 0
  const passed = cost < threshold
  return {
    passed,
    score: passed ? 1 : 0,
    maxScore: 1,
    reason: passed
      ? `Cost $${cost.toFixed(4)} < $${threshold} ✓`
      : `Cost $${cost.toFixed(4)} exceeds threshold $${threshold}`,
    details: { cost, threshold },
  }
}

function evalCostGt(
  params: Record<string, unknown>,
  ctx: RuleEvalContext,
): RuleEvalResult {
  const threshold = Number(params.threshold ?? params.dollars ?? 0)
  const cost = ctx.metrics?.totalCost ?? 0
  const passed = cost > threshold
  return {
    passed,
    score: passed ? 1 : 0,
    maxScore: 1,
    reason: passed
      ? `Cost $${cost.toFixed(4)} > $${threshold} ✓`
      : `Cost $${cost.toFixed(4)} is not greater than $${threshold}`,
    details: { cost, threshold },
  }
}

// Helpers imported from '../utils/json-validator'
