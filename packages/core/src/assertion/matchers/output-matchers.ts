/**
 * Output assertion matchers.
 */

import type { AssertionResult } from '../../types/run'
import { validateJsonNode, truncate } from '../../utils/json-validator'

/**
 * Assert output contains a substring.
 */
export function outputToContain(
  output: string,
  substring: string,
  caseSensitive = true
): AssertionResult {
  const searchIn = caseSensitive ? output : output.toLowerCase()
  const searchFor = caseSensitive ? substring : substring.toLowerCase()
  const passed = searchIn.includes(searchFor)
  return {
    type: 'contains',
    status: passed ? 'passed' : 'failed',
    expected: `Output to contain "${truncate(substring, 80)}"`,
    actual: `Output ${passed ? 'contains' : 'does not contain'} it`,
    message: passed ? undefined : `Expected output to contain "${truncate(substring, 80)}"`,
  }
}

/**
 * Assert output does NOT contain a substring.
 */
export function outputNotToContain(
  output: string,
  substring: string,
  caseSensitive = true
): AssertionResult {
  const searchIn = caseSensitive ? output : output.toLowerCase()
  const searchFor = caseSensitive ? substring : substring.toLowerCase()
  const found = searchIn.includes(searchFor)
  return {
    type: 'not_contains',
    status: found ? 'failed' : 'passed',
    expected: `Output not to contain "${truncate(substring, 80)}"`,
    actual: found ? 'Output contains it' : 'Output does not contain it',
    message: found ? `Output unexpectedly contains "${truncate(substring, 80)}"` : undefined,
  }
}

/**
 * Assert output matches a regex pattern.
 */
export function outputToMatchRegex(
  output: string,
  pattern: string,
  flags?: string
): AssertionResult {
  try {
    const regex = new RegExp(pattern, flags)
    const passed = regex.test(output)
    return {
      type: 'matches_regex',
      status: passed ? 'passed' : 'failed',
      expected: `Output to match /${pattern}/${flags ?? ''}`,
      actual: passed ? 'Output matches' : 'Output does not match',
      message: passed ? undefined : `Expected output to match /${pattern}/${flags ?? ''}`,
    }
  } catch (err) {
    return {
      type: 'matches_regex',
      status: 'error',
      expected: `Valid regex pattern`,
      actual: `Invalid regex: ${err instanceof Error ? err.message : String(err)}`,
      message: `Invalid regex pattern: ${err instanceof Error ? err.message : String(err)}`,
    }
  }
}

/**
 * Assert output exactly equals a value.
 */
export function outputToEqual(
  output: string,
  expected: string,
  normalize = false
): AssertionResult {
  let actual = output
  let exp = expected
  if (normalize) {
    actual = actual.replace(/\s+/g, ' ').trim()
    exp = exp.replace(/\s+/g, ' ').trim()
  }
  const passed = actual === exp
  return {
    type: 'exact_match',
    status: passed ? 'passed' : 'failed',
    expected: truncate(exp, 120),
    actual: truncate(actual, 120),
    message: passed ? undefined : 'Output does not match expected value exactly',
  }
}

/**
 * Assert output matches a JSON schema.
 */
export function outputToMatchSchema(
  output: string,
  schema: Record<string, unknown>
): AssertionResult {
  let parsed: unknown
  try {
    parsed = JSON.parse(output.trim())
  } catch (error) {
    console.error('[OUTPUT-MATCHERS] Failed to parse output as JSON:', error)
    return {
      type: 'matches_schema',
      status: 'failed',
      expected: 'Valid JSON matching schema',
      actual: 'Output is not valid JSON',
      message: 'Expected output to be valid JSON',
    }
  }

  // Delegate to the evaluator's JSON schema validator
  // For minimal coupling, we do a basic structural check here
  const errors = validateJsonNode(parsed, schema, 'root')
  const passed = errors.length === 0
  return {
    type: 'matches_schema',
    status: passed ? 'passed' : 'failed',
    expected: 'JSON matching schema',
    actual: passed ? 'Output matches schema' : `Schema errors: ${errors.join('; ')}`,
    message: passed ? undefined : `Schema validation failed: ${errors.join('; ')}`,
  }
}

/**
 * Assert output matches a snapshot (shallow compare).
 */
export function outputToMatchSnapshot(output: string, snapshot: string): AssertionResult {
  const passed = output === snapshot
  return {
    type: 'matches_snapshot',
    status: passed ? 'passed' : 'failed',
    expected: 'Output to match snapshot',
    actual: passed ? 'Output matches snapshot' : 'Output differs from snapshot',
    message: passed ? undefined : 'Output does not match snapshot',
  }
}

// Helpers imported from '../../../utils/json-validator'
