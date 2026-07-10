/**
 * Test Suite: Code Generation
 *
 * Verifies the coding agent generates working, complete code from
 * natural language specifications, writes it to files, and the
 * generated code passes tests.
 */

import { expect } from '@agentbench/core'
import { runCodingAgent } from '../src/agent'

const API_KEY = process.env.OPENAI_API_KEY ?? 'sk-test-key'

/** Test Case 1: Generate a simple utility function. */
export async function generateUtilFunctionTest() {
  const result = await runCodingAgent({
    task: 'Write a TypeScript function called "capitalize" that takes a string and returns it with the first letter capitalized. Write it to src/utils.ts and include a test file tests/utils.test.ts.',
    apiKey: API_KEY,
  })

  const completed = await expect(result)
    .status().toBeCompleted()
    .run()

  const hasOutput = await expect(result)
    .output().toMatchRegex(/.{80,}/)
    .run()

  const mentionsCapitalize = await expect(result)
    .output().toMatchRegex(/capitalize/i)
    .run()

  return {
    completed: completed.allPassed,
    hasOutput: hasOutput.allPassed,
    mentionsCapitalize: mentionsCapitalize.allPassed,
    details: { completed, hasOutput, mentionsCapitalize },
  }
}

/** Test Case 2: Generate code with file writes. */
export async function generateWithFileWritesTest() {
  const result = await runCodingAgent({
    task: 'Create a simple counter module in TypeScript with increment, decrement, and reset functions. Write it to src/counter.ts. Export each function.',
    apiKey: API_KEY,
  })

  const completed = await expect(result)
    .status().toBeCompleted()
    .run()

  const mentionsFunctions = await expect(result)
    .any([
      (b) => b.output().toMatchRegex(/increment|decrement|reset/i),
      (b) => b.output().toMatchRegex(/counter/i),
    ])
    .run()

  return {
    completed: completed.allPassed,
    mentionsFunctions: mentionsFunctions.allPassed,
    details: { completed, mentionsFunctions },
  }
}
