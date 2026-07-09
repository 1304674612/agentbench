/**
 * @agentbench/core — Assertion Module
 *
 * Chained assertion DSL for validating agent behavior.
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
 *   .status().toBeCompleted()
 *   .run()
 * ```
 */

// Main assertion builder
export {
  AssertionBuilder,
  expect,
  createAssertionBuilder,
  buildContextFromRun,
  type AssertionContext,
  type AssertionRunResult,
} from './assert'

// Matchers (for direct use without the DSL)
export {
  toolToBeCalled,
  toolNotToBeCalled,
  toolToBeCalledWith,
  toolToBeCalledTimes,
  type ToolCallRecord,
} from './matchers/tool-matchers'

export {
  tokensToBeLessThan,
  tokensToBeGreaterThan,
  tokensToBeBetween,
  promptTokensToBeLessThan,
  type TokenMetrics,
} from './matchers/token-matchers'

export {
  latencyToBeLessThan,
  latencyToBeGreaterThan,
  firstTokenToBeLessThan,
  type LatencyMetrics,
} from './matchers/latency-matchers'

export {
  outputToContain,
  outputNotToContain,
  outputToMatchRegex,
  outputToEqual,
  outputToMatchSchema,
  outputToMatchSnapshot,
} from './matchers/output-matchers'

export {
  scoreToBeGreaterThan,
  scoreToBeLessThan,
  scoreToBeBetween,
} from './matchers/score-matchers'
