/**
 * Shared JSON Schema Validator & Utilities
 *
 * Used by both the evaluator (rule-evaluator) and assertion (output-matchers) modules.
 * Single source of truth for structural JSON validation.
 */

/**
 * Simple structural JSON schema validation.
 * Supports: type, required, properties, items, enum, minLength, maxLength, minimum, maximum.
 */
export function validateJsonNode(
  value: unknown,
  schema: Record<string, unknown>,
  path: string
): string[] {
  const errors: string[] = []

  const type = schema.type as string | undefined
  if (type) {
    if (!checkJsonType(value, type)) {
      errors.push(`${path}: expected type "${type}" but got "${typeof value}"`)
      return errors
    }
  }

  if (schema.enum !== undefined) {
    const enumVals = schema.enum as unknown[]
    if (!enumVals.some((v) => deepEqual(value, v))) {
      errors.push(`${path}: value not in enum`)
    }
  }

  if (typeof value === 'string') {
    const minLength = schema.minLength as number | undefined
    const maxLength = schema.maxLength as number | undefined
    if (minLength !== undefined && value.length < minLength) {
      errors.push(`${path}: length ${value.length} < minLength ${minLength}`)
    }
    if (maxLength !== undefined && value.length > maxLength) {
      errors.push(`${path}: length ${value.length} > maxLength ${maxLength}`)
    }
  }

  if (typeof value === 'number') {
    if (schema.minimum !== undefined && value < (schema.minimum as number)) {
      errors.push(`${path}: ${value} < minimum ${schema.minimum}`)
    }
    if (schema.maximum !== undefined && value > (schema.maximum as number)) {
      errors.push(`${path}: ${value} > maximum ${schema.maximum}`)
    }
  }

  if (type === 'object' && schema.properties && typeof value === 'object' && value !== null) {
    const obj = value as Record<string, unknown>
    const props = schema.properties as Record<string, Record<string, unknown>>
    const required = (schema.required as string[] | undefined) ?? []

    for (const key of required) {
      if (!(key in obj)) {
        errors.push(`${path}.${key}: required`)
      }
    }

    for (const [key, propSchema] of Object.entries(props)) {
      if (key in obj) {
        errors.push(...validateJsonNode(obj[key], propSchema, `${path}.${key}`))
      }
    }

    // Check for additional properties
    if (schema.additionalProperties === false) {
      const allowedKeys = new Set([...Object.keys(props), ...required])
      for (const key of Object.keys(obj)) {
        if (!allowedKeys.has(key)) {
          errors.push(`${path}.${key}: additional property not allowed`)
        }
      }
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
    if (minItems !== undefined && value.length < minItems) {
      errors.push(`${path}: length ${value.length} < minItems ${minItems}`)
    }
    if (maxItems !== undefined && value.length > maxItems) {
      errors.push(`${path}: length ${value.length} > maxItems ${maxItems}`)
    }
  }

  return errors
}

function checkJsonType(value: unknown, type: string): boolean {
  switch (type) {
    case 'string':
      return typeof value === 'string'
    case 'number':
    case 'integer':
      return typeof value === 'number'
    case 'boolean':
      return typeof value === 'boolean'
    case 'null':
      return value === null
    case 'array':
      return Array.isArray(value)
    case 'object':
      return value !== null && typeof value === 'object' && !Array.isArray(value)
    default:
      return true
  }
}

/**
 * Deep equality check for JSON-compatible values.
 */
export function deepEqual(a: unknown, b: unknown): boolean {
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

export function truncate(str: string, maxLen: number): string {
  if (str.length <= maxLen) return str
  return str.slice(0, maxLen) + '...'
}

export function countOccurrences(str: string, substr: string): number {
  if (!substr) return 0
  let count = 0
  let pos = 0
  while ((pos = str.indexOf(substr, pos)) !== -1) {
    count++
    pos += substr.length
  }
  return count
}
