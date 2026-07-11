/**
 * Test Suite: Bug Fix
 *
 * Verifies the coding agent can identify and fix bugs in provided code.
 * The agent should diagnose the root cause and produce a corrected version.
 */

import { expect } from '@agentbench/core'
import { runCodingAgent } from '../src/agent'

const API_KEY = process.env.OPENAI_API_KEY ?? 'sk-test-key'

/** Test Case 1: Fix a classic off-by-one error. */
export async function fixOffByOneTest() {
  const task = `Fix the bug in this TypeScript code:

\`\`\`typescript
function sumArray(arr: number[]): number {
  let sum = 0
  for (let i = 0; i <= arr.length; i++) {
    sum += arr[i]
  }
  return sum
}
\`\`\`

This function produces NaN for some inputs. Find the bug and write the corrected version to src/fixed-sum.ts.`

  const result = await runCodingAgent({ task, apiKey: API_KEY })

  const completed = await expect(result).status().toBeCompleted().run()
  const mentionsFix = await expect(result)
    .output()
    .toMatchRegex(/off.by.one|i < arr|<= .*length/i)
    .run()

  return {
    completed: completed.allPassed,
    mentionsFix: mentionsFix.allPassed,
    details: { completed, mentionsFix },
  }
}

/** Test Case 2: Fix type safety issue. */
export async function fixTypeErrorTest() {
  const task = `Fix this TypeScript code that has type errors:

\`\`\`typescript
function getFullName(user: any): string {
  return user.first + ' ' + user.last
}
\`\`\`

Add proper types and handle cases where first or last name might be undefined. Write to src/fixed-user.ts.`

  const result = await runCodingAgent({ task, apiKey: API_KEY })

  const completed = await expect(result).status().toBeCompleted().run()
  const mentionsTypes = await expect(result)
    .output()
    .toMatchRegex(/interface|type|undefined|null|optional/i)
    .run()

  return {
    completed: completed.allPassed,
    mentionsTypes: mentionsTypes.allPassed,
    details: { completed, mentionsTypes },
  }
}
