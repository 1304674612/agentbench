/**
 * Output assertion matchers.
 */

import type { AssertionResult } from '../../types/run'

/**
 * Assert output contains a substring.
 */
export function outputToContain(
  output: string,
  substring: string,
  caseSensitive = true,
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
  caseSensitive = true,
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
  flags?: string,
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
  normalize = false,
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
  schema: Record<string, unknown>,
): AssertionResult {
  let parsed: unknown
  try {
    parsed = JSON.parse(output.trim())
  } catch {
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
export function outputToMatchSnapshot(
  output: string,
  snapshot: string,
): AssertionResult {
  const passed = output === snapshot
  return {
    type: 'matches_snapshot',
    status: passed ? 'passed' : 'failed',
    expected: 'Output to match snapshot',
    actual: passed ? 'Output matches snapshot' : 'Output differs from snapshot',
    message: passed ? undefined : 'Output does not match snapshot',
  }
}

// ============================================================
// Helpers
// ============================================================

function truncate(str: string, maxLen: number): string {
  if (str.length <= maxLen) return str
  return str.slice(0, maxLen) + '...'
}

function validateJsonNode(
  value: unknown,
  schema: Record<string, unknown>,
  path: string,
): string[] {
  const errors: string[] = []
  const type = schema.type as string | undefined

  if (type) {
    let typeMatch = false
    switch (type) {
      case 'string': typeMatch = typeof value === 'string'; break
      case 'number': case 'integer': typeMatch = typeof value === 'number'; break
      case 'boolean': typeMatch = typeof value === 'boolean'; break
      case 'null': typeMatch = value === null; break
      case 'array': typeMatch = Array.isArray(value); break
      case 'object': typeMatch = value !== null && typeof value === 'object' && !Array.isArray(value); break
    }
    if (!typeMatch) {
      errors.push(`${path}: expected ${type}, got ${typeof value}`)
      return errors
    }
  }

  if (schema.enum !== undefined && !(schema.enum as unknown[]).some((v) => deepEqual(value, v))) {
    errors.push(`${path}: value not in enum`)
  }

  if (typeof value === 'string') {
    const minLength = schema.minLength as number | undefined
    const maxLength = schema.maxLength as number | undefined
    if (minLength !== undefined && value.length < minLength) errors.push(`${path}: length < ${minLength}`)
    if (maxLength !== undefined && value.length > maxLength) errors.push(`${path}: length > ${maxLength}`)
  }

  if (typeof value === 'number') {
    if (schema.minimum !== undefined && value < (schema.minimum as number)) errors.push(`${path}: < ${schema.minimum}`)
    if (schema.maximum !== undefined && value > (schema.maximum as number)) errors.push(`${path}: > ${schema.maximum}`)
  }

  if (type === 'object' && schema.properties && typeof value === 'object' && value !== null) {
    const obj = value as Record<string, unknown>
    const props = schema.properties as Record<string, Record<string, unknown>>
    const required = (schema.required as string[] | undefined) ?? []
    for (const key of required) {
      if (!(key in obj)) errors.push(`${path}.${key}: required`)
    }
    for (const [key, propSchema] of Object.entries(props)) {
      if (key in obj) errors.push(...validateJsonNode(obj[key], propSchema, `${path}.${key}`))
    }
  }

  if (type === 'array' && Array.isArray(value)) {
    const itemSchema = schema.items as Record<string, unknown> | undefined
    if (itemSchema) {
      for (let i = 0; i < value.length; i++) {
        errors.push(...validateJsonNode(value[i], itemSchema, `${path}[${i}]`))
      }
    }
    const minItems = schema.minItems as number | undefined
    const maxItems = schema.maxItems as number | undefined
    if (minItems !== undefined && value.length < minItems) errors.push(`${path}: length < ${minItems}`)
    if (maxItems !== undefined && value.length > maxItems) errors.push(`${path}: length > ${maxItems}`)
  }

  return errors
}

function deepEqual(a: unknown, b: unknown): boolean {
  if (a === b) return true
  if (typeof a !== typeof b) return false
  if (a === null || b === null) return a === b
  if (typeof a !== 'object' || typeof b !== 'object') return false
  const aObj = a as Record<string, unknown>
  const bObj = b as Record<string, unknown>
  const aKeys = Object.keys(aObj)
  const bKeys = Object.keys(bObj)
  if (aKeys.length !== bKeys.length) return false
  return aKeys.every((key) => deepEqual(aObj[key], bObj[key]))
}
