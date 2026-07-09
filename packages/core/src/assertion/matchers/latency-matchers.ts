/**
 * Latency assertion matchers.
 */

import type { AssertionResult } from '../../types/run'

export interface LatencyMetrics {
  totalLatency: number
  firstTokenLatency?: number
}

/**
 * Assert total latency is less than a threshold (in ms).
 */
export function latencyToBeLessThan(
  metrics: LatencyMetrics,
  threshold: number,
): AssertionResult {
  const actual = metrics.totalLatency
  const passed = actual < threshold
  return {
    type: 'latency_lt',
    status: passed ? 'passed' : 'failed',
    expected: `< ${threshold}ms`,
    actual: `${actual}ms`,
    message: passed ? undefined : `Expected latency < ${threshold}ms, but got ${actual}ms`,
  }
}

/**
 * Assert total latency is greater than a threshold (in ms).
 */
export function latencyToBeGreaterThan(
  metrics: LatencyMetrics,
  threshold: number,
): AssertionResult {
  const actual = metrics.totalLatency
  const passed = actual > threshold
  return {
    type: 'latency_gt',
    status: passed ? 'passed' : 'failed',
    expected: `> ${threshold}ms`,
    actual: `${actual}ms`,
    message: passed ? undefined : `Expected latency > ${threshold}ms, but got ${actual}ms`,
  }
}

/**
 * Assert first-token latency is less than a threshold (in ms).
 */
export function firstTokenToBeLessThan(
  metrics: LatencyMetrics,
  threshold: number,
): AssertionResult {
  const actual = metrics.firstTokenLatency
  const passed = actual !== undefined && actual < threshold
  return {
    type: 'first_token_lt',
    status: passed ? 'passed' : 'failed',
    expected: `< ${threshold}ms`,
    actual: actual !== undefined ? `${actual}ms` : 'N/A',
    message: passed
      ? undefined
      : actual === undefined
        ? 'First token latency not available'
        : `Expected first token latency < ${threshold}ms, but got ${actual}ms`,
  }
}
