/**
 * Assertion Engine — Chained DSL API
 *
 * @example
 * ```typescript
 * import { expect } from '@agentbench/core'
 *
 * const results = await expect(runResult)
 *   .tool("search").toBeCalled()
 *   .tool("search").toBeCalledWith({ query: "test" })
 *   .tokens().toBeLessThan(4096)
 *   .latency().toBeLessThan(5000)
 *   .output().toContain("expected result")
 *   .score("correctness").toBeGreaterThan(7)
 *   .run()
 * ```
 */

import type { AssertionResult, RunResult } from '../types/run'
import {
  toolToBeCalled,
  toolNotToBeCalled,
  toolToBeCalledWith,
  toolToBeCalledTimes,
  type ToolCallRecord,
} from './matchers/tool-matchers'
import {
  tokensToBeLessThan,
  tokensToBeGreaterThan,
  tokensToBeBetween,
  promptTokensToBeLessThan,
} from './matchers/token-matchers'
import {
  latencyToBeLessThan,
  latencyToBeGreaterThan,
  firstTokenToBeLessThan,
} from './matchers/latency-matchers'
import {
  outputToContain,
  outputNotToContain,
  outputToMatchRegex,
  outputToEqual,
  outputToMatchSchema,
  outputToMatchSnapshot,
} from './matchers/output-matchers'
import {
  scoreToBeGreaterThan,
  scoreToBeLessThan,
  scoreToBeBetween,
} from './matchers/score-matchers'

// ============================================================
// Assertion Context
// ============================================================

export interface AssertionContext {
  output: string
  toolCalls: ToolCallRecord[]
  metrics: {
    totalTokens: number
    promptTokens: number
    completionTokens: number
    totalCost: number
    totalLatency: number
    firstTokenLatency?: number
    stepCount: number
    llmCallCount: number
    toolCallCount: number
    toolSuccessCount: number
    toolFailureCount: number
  }
  scores: Array<{ evaluator: string; score: number; maxScore: number }>
  status: string
}

/**
 * Build assertion context from a RunResult.
 */
export function buildContextFromRun(run: RunResult): AssertionContext {
  const traceSteps = run.trace?.steps ?? []
  const toolCalls: ToolCallRecord[] = traceSteps
    .filter((step) => step.type === 'tool_call')
    .map((step) => ({
      name: step.toolName ?? 'unknown',
      arguments: (step.toolRequest?.arguments ?? {}) as Record<string, unknown>,
      result: step.toolResponse?.result,
      error: step.toolResponse?.error,
    }))

  const output = traceSteps
    .filter((step) => step.type === 'response')
    .map((step) => step.llmResponse?.content ?? '')
    .join('\n')

  return {
    output,
    toolCalls,
    metrics: {
      totalTokens: run.metrics.totalTokens,
      promptTokens: run.metrics.promptTokens,
      completionTokens: run.metrics.completionTokens,
      totalCost: run.metrics.totalCost,
      totalLatency: run.metrics.totalLatency,
      firstTokenLatency: run.metrics.firstTokenLatency,
      stepCount: run.metrics.stepCount,
      llmCallCount: run.metrics.llmCallCount,
      toolCallCount: run.metrics.toolCallCount,
      toolSuccessCount: run.metrics.toolSuccessCount,
      toolFailureCount: run.metrics.toolFailureCount,
    },
    scores:
      run.scores?.map((s) => ({
        evaluator: s.evaluator,
        score: s.score,
        maxScore: s.maxScore,
      })) ?? [],
    status: run.status,
  }
}

// ============================================================
// Assertion Builder — Chained DSL
// ============================================================

export interface AssertionRunResult {
  assertions: AssertionResult[]
  passed: number
  failed: number
  errored: number
  skipped: number
  allPassed: boolean
  duration: number
}

class ToolAssertionBuilder {
  private assertions: AssertionBuilder
  private toolName: string

  constructor(assertions: AssertionBuilder, toolName: string) {
    this.assertions = assertions
    this.toolName = toolName
  }

  /** Assert this tool was called at least once */
  toBeCalled(): AssertionBuilder {
    this.assertions._add((ctx) => toolToBeCalled(ctx.toolCalls, this.toolName))
    return this.assertions
  }

  /** Assert this tool was called with specific arguments */
  toBeCalledWith(args: Record<string, unknown>): AssertionBuilder {
    this.assertions._add((ctx) => toolToBeCalledWith(ctx.toolCalls, this.toolName, args))
    return this.assertions
  }

  /** Assert this tool was called exactly N times */
  toBeCalledTimes(count: number): AssertionBuilder {
    this.assertions._add((ctx) => toolToBeCalledTimes(ctx.toolCalls, this.toolName, count))
    return this.assertions
  }

  /** Assert this tool was NOT called */
  not: {
    toBeCalled(): AssertionBuilder
  } = {
    toBeCalled: () => {
      this.assertions._add((ctx) => toolNotToBeCalled(ctx.toolCalls, this.toolName))
      return this.assertions
    },
  }
}

class TokenAssertionBuilder {
  private assertions: AssertionBuilder

  constructor(assertions: AssertionBuilder) {
    this.assertions = assertions
  }

  toBeLessThan(threshold: number): AssertionBuilder {
    this.assertions._add((ctx) => tokensToBeLessThan(ctx.metrics, threshold))
    return this.assertions
  }

  toBeGreaterThan(threshold: number): AssertionBuilder {
    this.assertions._add((ctx) => tokensToBeGreaterThan(ctx.metrics, threshold))
    return this.assertions
  }

  toBeBetween(min: number, max: number): AssertionBuilder {
    this.assertions._add((ctx) => tokensToBeBetween(ctx.metrics, min, max))
    return this.assertions
  }

  /** Prompt tokens specifically */
  prompt(): { toBeLessThan(threshold: number): AssertionBuilder } {
    return {
      toBeLessThan: (threshold: number) => {
        this.assertions._add((ctx) => promptTokensToBeLessThan(ctx.metrics, threshold))
        return this.assertions
      },
    }
  }
}

class LatencyAssertionBuilder {
  private assertions: AssertionBuilder

  constructor(assertions: AssertionBuilder) {
    this.assertions = assertions
  }

  toBeLessThan(threshold: number): AssertionBuilder {
    this.assertions._add((ctx) => latencyToBeLessThan(ctx.metrics, threshold))
    return this.assertions
  }

  toBeGreaterThan(threshold: number): AssertionBuilder {
    this.assertions._add((ctx) => latencyToBeGreaterThan(ctx.metrics, threshold))
    return this.assertions
  }

  /** First-token latency */
  firstToken(): { toBeLessThan(threshold: number): AssertionBuilder } {
    return {
      toBeLessThan: (threshold: number) => {
        this.assertions._add((ctx) => firstTokenToBeLessThan(ctx.metrics, threshold))
        return this.assertions
      },
    }
  }
}

class OutputAssertionBuilder {
  private assertions: AssertionBuilder

  constructor(assertions: AssertionBuilder) {
    this.assertions = assertions
  }

  toContain(substring: string): AssertionBuilder {
    this.assertions._add((ctx) => outputToContain(ctx.output, substring))
    return this.assertions
  }

  not: {
    toContain(substring: string): AssertionBuilder
    toEqual(expected: string): AssertionBuilder
    toMatchRegex(pattern: string, flags?: string): AssertionBuilder
  } = {
    toContain: (substring: string) => {
      this.assertions._add((ctx) => outputNotToContain(ctx.output, substring))
      return this.assertions
    },
    toEqual: (expected: string) => {
      this.assertions._add((ctx) => {
        const result = outputToEqual(ctx.output, expected)
        return {
          ...result,
          status:
            result.status === 'passed'
              ? 'failed'
              : result.status === 'failed'
                ? 'passed'
                : result.status,
        }
      })
      return this.assertions
    },
    toMatchRegex: (pattern: string, flags?: string) => {
      this.assertions._add((ctx) => {
        const result = outputToMatchRegex(ctx.output, pattern, flags)
        return {
          ...result,
          status:
            result.status === 'passed'
              ? 'failed'
              : result.status === 'failed'
                ? 'passed'
                : result.status,
        }
      })
      return this.assertions
    },
  }

  toEqual(expected: string): AssertionBuilder {
    this.assertions._add((ctx) => outputToEqual(ctx.output, expected))
    return this.assertions
  }

  toMatchRegex(pattern: string, flags?: string): AssertionBuilder {
    this.assertions._add((ctx) => outputToMatchRegex(ctx.output, pattern, flags))
    return this.assertions
  }

  toMatchSchema(schema: Record<string, unknown>): AssertionBuilder {
    this.assertions._add((ctx) => outputToMatchSchema(ctx.output, schema))
    return this.assertions
  }

  toMatchSnapshot(snapshot: string): AssertionBuilder {
    this.assertions._add((ctx) => outputToMatchSnapshot(ctx.output, snapshot))
    return this.assertions
  }
}

class ScoreAssertionBuilder {
  private assertions: AssertionBuilder
  private dimension?: string

  constructor(assertions: AssertionBuilder, dimension?: string) {
    this.assertions = assertions
    this.dimension = dimension
  }

  toBeGreaterThan(threshold: number): AssertionBuilder {
    this.assertions._add((ctx) => scoreToBeGreaterThan(ctx.scores, threshold, this.dimension))
    return this.assertions
  }

  toBeLessThan(threshold: number): AssertionBuilder {
    this.assertions._add((ctx) => scoreToBeLessThan(ctx.scores, threshold, this.dimension))
    return this.assertions
  }

  toBeBetween(min: number, max: number): AssertionBuilder {
    this.assertions._add((ctx) => scoreToBeBetween(ctx.scores, min, max, this.dimension))
    return this.assertions
  }
}

class StatusAssertionBuilder {
  private assertions: AssertionBuilder

  constructor(assertions: AssertionBuilder) {
    this.assertions = assertions
  }

  toBe(expectedStatus: string): AssertionBuilder {
    this.assertions._add((ctx) => ({
      type: 'completed_successfully',
      status: ctx.status === expectedStatus ? 'passed' : 'failed',
      expected: expectedStatus,
      actual: ctx.status,
      message:
        ctx.status === expectedStatus
          ? undefined
          : `Expected status "${expectedStatus}", got "${ctx.status}"`,
    }))
    return this.assertions
  }

  toBeCompleted(): AssertionBuilder {
    this.assertions._add((ctx) => ({
      type: 'completed_successfully',
      status: ctx.status === 'passed' || ctx.status === 'completed' ? 'passed' : 'failed',
      expected: 'completed',
      actual: ctx.status,
      message:
        ctx.status === 'passed' || ctx.status === 'completed'
          ? undefined
          : `Expected completion, got ${ctx.status}`,
    }))
    return this.assertions
  }
}

// ============================================================
// Main AssertionBuilder
// ============================================================

type AssertionFn = (ctx: AssertionContext) => AssertionResult

export class AssertionBuilder {
  private _assertions: AssertionFn[] = []
  private _context: AssertionContext | null = null
  private _startTime: number = Date.now()

  constructor(context?: AssertionContext) {
    if (context) this._context = context
  }

  /** Internal: add an assertion function */
  _add(fn: AssertionFn): void {
    this._assertions.push(fn)
  }

  /** Start a tool assertion */
  tool(name: string): ToolAssertionBuilder {
    return new ToolAssertionBuilder(this, name)
  }

  /** Start a token usage assertion */
  tokens(): TokenAssertionBuilder {
    return new TokenAssertionBuilder(this)
  }

  /** Start a latency assertion */
  latency(): LatencyAssertionBuilder {
    return new LatencyAssertionBuilder(this)
  }

  /** Start an output assertion */
  output(): OutputAssertionBuilder {
    return new OutputAssertionBuilder(this)
  }

  /** Start a score assertion */
  score(dimension?: string): ScoreAssertionBuilder {
    return new ScoreAssertionBuilder(this, dimension)
  }

  /** Start a status assertion */
  status(): StatusAssertionBuilder {
    return new StatusAssertionBuilder(this)
  }

  /** Create a compound assertion: all must pass */
  all(builders: ((builder: AssertionBuilder) => void)[]): AssertionBuilder {
    this._add((ctx) => {
      const subBuilder = new AssertionBuilder(ctx)
      for (const fn of builders) {
        fn(subBuilder)
      }
      const results = subBuilder.runSync(ctx)
      const allPassed = results.assertions.every((a) => a.status === 'passed')
      return {
        type: 'all',
        status: allPassed ? 'passed' : 'failed',
        expected: 'All conditions to pass',
        actual: `${results.assertions.filter((a) => a.status === 'passed').length}/${results.assertions.length} passed`,
        message: allPassed
          ? undefined
          : `${results.assertions.filter((a) => a.status === 'failed').length} condition(s) failed`,
      }
    })
    return this
  }

  /** Create a compound assertion: any must pass */
  any(builders: ((builder: AssertionBuilder) => void)[]): AssertionBuilder {
    this._add((ctx) => {
      const subBuilder = new AssertionBuilder(ctx)
      for (const fn of builders) {
        fn(subBuilder)
      }
      const results = subBuilder.runSync(ctx)
      const anyPassed = results.assertions.some((a) => a.status === 'passed')
      return {
        type: 'any',
        status: anyPassed ? 'passed' : 'failed',
        expected: 'Any condition to pass',
        actual: `${results.assertions.filter((a) => a.status === 'passed').length}/${results.assertions.length} passed`,
        message: anyPassed ? undefined : 'No conditions passed',
      }
    })
    return this
  }

  /**
   * Run all queued assertions against a context and return results.
   */
  run(context?: AssertionContext | RunResult): AssertionRunResult {
    const startTime = this._startTime
    const ctx = this._resolveContext(context)

    const assertions = this._assertions.map((fn) => {
      try {
        return fn(ctx)
      } catch (err) {
        return {
          type: 'error',
          status: 'error' as const,
          expected: null,
          actual: null,
          message: err instanceof Error ? err.message : String(err),
        }
      }
    })

    const passed = assertions.filter((a) => a.status === 'passed').length
    const failed = assertions.filter((a) => a.status === 'failed').length
    const errored = assertions.filter((a) => a.status === 'error').length
    const skipped = assertions.filter((a) => a.status === 'skipped').length

    return {
      assertions,
      passed,
      failed,
      errored,
      skipped,
      allPassed: failed === 0 && errored === 0,
      duration: Date.now() - startTime,
    }
  }

  /** Synchronous run (for internal use) */
  runSync(context: AssertionContext): AssertionRunResult {
    return this._runAgainst(context)
  }

  private _runAgainst(ctx: AssertionContext): AssertionRunResult {
    const assertions = this._assertions.map((fn) => {
      try {
        return fn(ctx)
      } catch (err) {
        return {
          type: 'error',
          status: 'error' as const,
          expected: null,
          actual: null,
          message: err instanceof Error ? err.message : String(err),
        }
      }
    })

    const passed = assertions.filter((a) => a.status === 'passed').length
    const failed = assertions.filter((a) => a.status === 'failed').length
    const errored = assertions.filter((a) => a.status === 'error').length
    const skipped = assertions.filter((a) => a.status === 'skipped').length

    return {
      assertions,
      passed,
      failed,
      errored,
      skipped,
      allPassed: failed === 0 && errored === 0,
      duration: Date.now() - this._startTime,
    }
  }

  private _resolveContext(context?: AssertionContext | RunResult): AssertionContext {
    if (!context) {
      if (this._context) return this._context
      throw new Error('No assertion context provided')
    }

    // Check if it's a RunResult (has trace property) or plain context
    if ('trace' in context && context.trace) {
      return buildContextFromRun(context as RunResult)
    }

    return context as AssertionContext
  }
}

// ============================================================
// Entry point
// ============================================================

/**
 * Create a new assertion builder, optionally from a RunResult or context.
 *
 * @example
 * ```typescript
 * // From a RunResult
 * const result = await expect(runResult)
 *   .tool("search").toBeCalled()
 *   .output().toContain("success")
 *   .run()
 *
 * // From a plain context
 * const result = expect(context)
 *   .tokens().toBeLessThan(4096)
 *   .latency().toBeLessThan(5000)
 *   .run()
 * ```
 */
export function expect(context?: AssertionContext | RunResult): AssertionBuilder {
  if (context && 'trace' in context && (context as RunResult).trace) {
    return new AssertionBuilder(buildContextFromRun(context as RunResult))
  }
  return new AssertionBuilder(context as AssertionContext | undefined)
}

/**
 * Create an empty assertion builder.
 */
export function createAssertionBuilder(): AssertionBuilder {
  return new AssertionBuilder()
}
