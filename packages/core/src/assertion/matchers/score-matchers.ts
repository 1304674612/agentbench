/**
 * Score assertion matchers.
 */

import type { AssertionResult } from '../../types/run'

export interface ScoreMetrics {
  scores: Array<{ evaluator: string; score: number; maxScore: number }>
}

/**
 * Assert overall score is greater than a threshold.
 */
export function scoreToBeGreaterThan(
  scores: ScoreMetrics['scores'],
  threshold: number,
  dimension?: string
): AssertionResult {
  const relevant = dimension ? scores.filter((s) => s.evaluator === dimension) : scores

  if (relevant.length === 0) {
    return {
      type: 'score_gt',
      status: 'skipped',
      expected: `Score > ${threshold}`,
      actual: 'No scores available',
      message: 'No matching scores to evaluate',
    }
  }

  const avgScore = relevant.reduce((sum, s) => sum + s.score, 0) / relevant.length
  const passed = avgScore > threshold

  return {
    type: 'score_gt',
    status: passed ? 'passed' : 'failed',
    expected: `> ${threshold}`,
    actual: `${avgScore.toFixed(2)}`,
    message: passed ? undefined : `Expected score > ${threshold}, but got ${avgScore.toFixed(2)}`,
  }
}

/**
 * Assert overall score is less than a threshold.
 */
export function scoreToBeLessThan(
  scores: ScoreMetrics['scores'],
  threshold: number,
  dimension?: string
): AssertionResult {
  const relevant = dimension ? scores.filter((s) => s.evaluator === dimension) : scores

  if (relevant.length === 0) {
    return {
      type: 'score_lt',
      status: 'skipped',
      expected: `Score < ${threshold}`,
      actual: 'No scores available',
      message: 'No matching scores to evaluate',
    }
  }

  const avgScore = relevant.reduce((sum, s) => sum + s.score, 0) / relevant.length
  const passed = avgScore < threshold

  return {
    type: 'score_lt',
    status: passed ? 'passed' : 'failed',
    expected: `< ${threshold}`,
    actual: `${avgScore.toFixed(2)}`,
    message: passed ? undefined : `Expected score < ${threshold}, but got ${avgScore.toFixed(2)}`,
  }
}

/**
 * Assert score is within a range.
 */
export function scoreToBeBetween(
  scores: ScoreMetrics['scores'],
  min: number,
  max: number,
  dimension?: string
): AssertionResult {
  const relevant = dimension ? scores.filter((s) => s.evaluator === dimension) : scores

  if (relevant.length === 0) {
    return {
      type: 'score_between',
      status: 'skipped',
      expected: `${min} - ${max}`,
      actual: 'No scores available',
      message: 'No matching scores to evaluate',
    }
  }

  const avgScore = relevant.reduce((sum, s) => sum + s.score, 0) / relevant.length
  const passed = avgScore >= min && avgScore <= max

  return {
    type: 'score_between',
    status: passed ? 'passed' : 'failed',
    expected: `${min} - ${max}`,
    actual: `${avgScore.toFixed(2)}`,
    message: passed
      ? undefined
      : `Expected score between ${min} and ${max}, but got ${avgScore.toFixed(2)}`,
  }
}
