import { describe, it, expect } from 'vitest'
import { validateJsonNode, deepEqual, truncate, countOccurrences } from './json-validator'

describe('deepEqual', () => {
  it('compares primitives', () => {
    expect(deepEqual(1, 1)).toBe(true)
    expect(deepEqual(1, 2)).toBe(false)
    expect(deepEqual('hello', 'hello')).toBe(true)
    expect(deepEqual('hello', 'world')).toBe(false)
    expect(deepEqual(null, null)).toBe(true)
    expect(deepEqual(null, undefined)).toBe(false)
  })

  it('compares objects deeply', () => {
    expect(deepEqual({ a: 1, b: 2 }, { a: 1, b: 2 })).toBe(true)
    expect(deepEqual({ a: 1, b: 2 }, { a: 1, b: 3 })).toBe(false)
    expect(deepEqual({ a: { b: 1 } }, { a: { b: 1 } })).toBe(true)
    expect(deepEqual({ a: { b: 1 } }, { a: { b: 2 } })).toBe(false)
  })

  it('compares arrays', () => {
    expect(deepEqual([1, 2, 3], [1, 2, 3])).toBe(true)
    expect(deepEqual([1, 2], [1, 2, 3])).toBe(false)
  })
})

describe('truncate', () => {
  it('truncates long strings', () => {
    expect(truncate('hello world', 5)).toBe('hello...')
  })
  it('keeps short strings', () => {
    expect(truncate('hi', 5)).toBe('hi')
  })
})

describe('countOccurrences', () => {
  it('counts occurrences', () => {
    expect(countOccurrences('hello hello world', 'hello')).toBe(2)
    expect(countOccurrences('aaa', 'a')).toBe(3)
    expect(countOccurrences('test', 'x')).toBe(0)
    expect(countOccurrences('', 'a')).toBe(0)
  })
})

describe('validateJsonNode', () => {
  it('validates string type', () => {
    expect(validateJsonNode('hello', { type: 'string' }, 'root')).toEqual([])
    expect(validateJsonNode(42, { type: 'string' }, 'root').length).toBeGreaterThan(0)
  })

  it('validates number type', () => {
    expect(validateJsonNode(42, { type: 'number' }, 'root')).toEqual([])
    expect(validateJsonNode('hi', { type: 'number' }, 'root').length).toBeGreaterThan(0)
  })

  it('validates boolean type', () => {
    expect(validateJsonNode(true, { type: 'boolean' }, 'root')).toEqual([])
    expect(validateJsonNode(1, { type: 'boolean' }, 'root').length).toBeGreaterThan(0)
  })

  it('validates array type with items schema', () => {
    expect(
      validateJsonNode(
        [1, 2, 3],
        {
          type: 'array',
          items: { type: 'number' },
        },
        'root'
      )
    ).toEqual([])

    const errors = validateJsonNode(
      [1, 'two'],
      {
        type: 'array',
        items: { type: 'number' },
      },
      'root'
    )
    expect(errors.length).toBeGreaterThan(0)
  })

  it('validates object with properties', () => {
    const schema = {
      type: 'object',
      properties: {
        name: { type: 'string' },
        age: { type: 'number' },
      },
      required: ['name'],
    }

    expect(validateJsonNode({ name: 'Alice', age: 30 }, schema, 'root')).toEqual([])
    const errors = validateJsonNode({ age: 30 }, schema, 'root')
    expect(errors.some((e) => e.includes('name'))).toBe(true)
  })

  it('validates enum', () => {
    const schema = { type: 'string', enum: ['red', 'green', 'blue'] }
    expect(validateJsonNode('red', schema, 'root')).toEqual([])
    expect(validateJsonNode('yellow', schema, 'root').length).toBeGreaterThan(0)
  })

  it('validates string constraints', () => {
    const schema = { type: 'string', minLength: 3, maxLength: 10 }
    expect(validateJsonNode('abc', schema, 'root')).toEqual([])
    expect(validateJsonNode('ab', schema, 'root').length).toBeGreaterThan(0)
    expect(validateJsonNode('abcdefghijkl', schema, 'root').length).toBeGreaterThan(0)
  })

  it('validates number constraints', () => {
    const schema = { type: 'number', minimum: 0, maximum: 100 }
    expect(validateJsonNode(50, schema, 'root')).toEqual([])
    expect(validateJsonNode(-1, schema, 'root').length).toBeGreaterThan(0)
    expect(validateJsonNode(101, schema, 'root').length).toBeGreaterThan(0)
  })

  it('handles null', () => {
    expect(validateJsonNode(null, { type: 'null' }, 'root')).toEqual([])
    expect(validateJsonNode('not null', { type: 'null' }, 'root').length).toBeGreaterThan(0)
  })

  it('validates nested objects', () => {
    const schema = {
      type: 'object',
      properties: {
        user: {
          type: 'object',
          properties: {
            name: { type: 'string' },
            address: {
              type: 'object',
              properties: { city: { type: 'string' } },
            },
          },
        },
      },
    }
    expect(
      validateJsonNode({ user: { name: 'Alice', address: { city: 'NYC' } } }, schema, 'root')
    ).toEqual([])
  })
})
