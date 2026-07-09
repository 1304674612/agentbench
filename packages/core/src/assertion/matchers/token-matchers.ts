/**
 * Token usage assertion matchers.
 */

import type { AssertionResult } from '../../types/run'

export interface TokenMetrics {
  totalTokens: number
  promptTokens: number
  completionTokens: number
}

/**
 * Assert total tokens are less than a threshold.
 */
export function tokensToBeLessThan(
  metrics: TokenMetrics,
  threshold: number,
): AssertionResult {
  const actual = metrics.totalTokens
  const passed = actual < threshold
  return {
    type: 'tokens_lt',
    status: passed ? 'passed' : 'failed',
    expected: `< ${threshold} tokens`,
    actual: `${actual} tokens`,
    message: passed ? undefined : `Expected tokens < ${threshold}, but got ${actual}`,
  }
}

/**
 * Assert total tokens are greater than a threshold.
 */
export function tokensToBeGreaterThan(
  metrics: TokenMetrics,
  threshold: number,
): AssertionResult {
  const actual = metrics.totalTokens
  const passed = actual > threshold
  return {
    type: 'tokens_gt',
    status: passed ? 'passed' : 'failed',
    expected: `> ${threshold} tokens`,
    actual: `${actual} tokens`,
    message: passed ? undefined : `Expected tokens > ${threshold}, but got ${actual}`,
  }
}

/**
 * Assert total tokens are within a range.
 */
export function tokensToBeBetween(
  metrics: TokenMetrics,
  min: number,
  max: number,
): AssertionResult {
  const actual = metrics.totalTokens
  const passed = actual >= min && actual <= max
  return {
    type: 'tokens_between',
    status: passed ? 'passed' : 'failed',
    expected: `${min} - ${max} tokens`,
    actual: `${actual} tokens`,
    message: passed ? undefined : `Expected tokens between ${min} and ${max}, but got ${actual}`,
  }
}

/**
 * Assert prompt tokens are less than a threshold.
 */
export function promptTokensToBeLessThan(
  metrics: TokenMetrics,
  threshold: number,
): AssertionResult {
  const actual = metrics.promptTokens
  const passed = actual < threshold
  return {
    type: 'tokens_lt',
    status: passed ? 'passed' : 'failed',
    expected: `< ${threshold} prompt tokens`,
    actual: `${actual} prompt tokens`,
    message: passed ? undefined : `Expected prompt tokens < ${threshold}, but got ${actual}`,
  }
}
