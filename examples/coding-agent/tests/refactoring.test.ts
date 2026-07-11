/**
 * Test Suite: Refactoring
 *
 * Verifies the coding agent can refactor code while preserving original
 * behavior. Tests improvements in readability, performance, and structure.
 */

import { expect } from '@agentbench/core'
import { runCodingAgent } from '../src/agent'

const API_KEY = process.env.OPENAI_API_KEY ?? 'sk-test-key'

/** Test Case 1: Refactor imperative loop to functional style. */
export async function refactorToFunctionalTest() {
  const task = `Refactor this code to use Array methods (map, filter, reduce) instead of imperative loops. Preserve the exact same behavior.

\`\`\`typescript
function getActiveUserNames(users: Array<{ name: string; active: boolean }>): string[] {
  const names: string[] = []
  for (let i = 0; i < users.length; i++) {
    if (users[i].active) {
      names.push(users[i].name)
    }
  }
  return names
}
\`\`\`

Write the refactored version to src/refactored-users.ts.`

  const result = await runCodingAgent({ task, apiKey: API_KEY })

  const completed = await expect(result).status().toBeCompleted().run()
  const usesFunctional = await expect(result)
    .output()
    .toMatchRegex(/filter|map|reduce|\.filter|\.map/i)
    .run()

  return {
    completed: completed.allPassed,
    usesFunctional: usesFunctional.allPassed,
    details: { completed, usesFunctional },
  }
}

/** Test Case 2: Extract reusable function. */
export async function extractFunctionTest() {
  const task = `Refactor this code to extract the validation logic into a separate function:

\`\`\`typescript
function processOrder(order: { items: Array<{ price: number; quantity: number }>; shipping: number }): number {
  if (order.items.length === 0) throw new Error('Order must have at least one item')
  if (order.shipping < 0) throw new Error('Shipping cannot be negative')
  let total = 0
  for (const item of order.items) {
    if (item.price < 0) throw new Error('Price cannot be negative')
    if (item.quantity <= 0) throw new Error('Quantity must be positive')
    total += item.price * item.quantity
  }
  return total + order.shipping
}
\`\`\`

Extract validation into a function called validateOrder. Write to src/refactored-order.ts.`

  const result = await runCodingAgent({ task, apiKey: API_KEY })

  const completed = await expect(result).status().toBeCompleted().run()
  const extractedValidation = await expect(result)
    .output()
    .toMatchRegex(/validateOrder|validate.*function/i)
    .run()

  return {
    completed: completed.allPassed,
    extractedValidation: extractedValidation.allPassed,
    details: { completed, extractedValidation },
  }
}
