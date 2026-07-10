/**
 * Test Suite: Test-Driven Development
 *
 * Verifies the coding agent can work in a TDD loop: write a test,
 * write code to pass it, then run the tests and iterate.
 */

import { expect } from '@agentbench/core'
import { runCodingAgent } from '../src/agent'

const API_KEY = process.env.OPENAI_API_KEY ?? 'sk-test-key'

/** Test Case 1: Write code that satisfies a given test. */
export async function writeToPassTestTest() {
  const task = `Write a TypeScript function that passes this test:

\`\`\`typescript
// tests/calculator.test.ts
import { expect } from 'vitest'
import { add } from '../src/calculator'

test('add returns the sum of two numbers', () => {
  expect(add(2, 3)).toBe(5)
  expect(add(-1, 1)).toBe(0)
  expect(add(0, 0)).toBe(0)
  expect(add(100, 200)).toBe(300)
})
\`\`\`

Write the implementation to src/calculator.ts and then run the tests to verify.`

  const result = await runCodingAgent({ task, apiKey: API_KEY })

  const completed = await expect(result).status().toBeCompleted().run()
  const mentionsAdd = await expect(result).output().toMatchRegex(/add|sum|calculator/i).run()

  return {
    completed: completed.allPassed,
    mentionsAdd: mentionsAdd.allPassed,
    details: { completed, mentionsAdd },
  }
}

/** Test Case 2: Handle edge cases in TDD style. */
export async function handleEdgeCasesTest() {
  const task = `Given this test file, write code that handles all edge cases:

\`\`\`typescript
test('divide returns correct result', () => {
  expect(divide(10, 2)).toBe(5)
  expect(divide(7, 2)).toBe(3.5)
})

test('divide throws on division by zero', () => {
  expect(() => divide(5, 0)).toThrow('Cannot divide by zero')
})

test('divide handles negative numbers', () => {
  expect(divide(-10, 2)).toBe(-5)
  expect(divide(10, -2)).toBe(-5)
})
\`\`\`

Implement the divide function in src/divide.ts.`

  const result = await runCodingAgent({ task, apiKey: API_KEY })

  const completed = await expect(result).status().toBeCompleted().run()
  const handlesZero = await expect(result).output().toMatchRegex(/divide|zero|throw/i).run()

  return {
    completed: completed.allPassed,
    handlesZero: handlesZero.allPassed,
    details: { completed, handlesZero },
  }
}
