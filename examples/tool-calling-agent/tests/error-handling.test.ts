/**
 * Test Suite: Error Handling
 *
 * Verifies the agent handles tool errors gracefully: invalid inputs,
 * missing resources, and tool failures. The agent should not crash
 * but instead explain the issue to the user.
 */

import { expect } from '@agentbench/core'
import { runToolCallingAgent } from '../src/agent'

const API_KEY = process.env.OPENAI_API_KEY ?? 'sk-test-key'

/** Test Case 1: Invalid email address should be caught. */
export async function invalidEmailTest() {
  const result = await runToolCallingAgent({
    request: 'Send an email to "not-an-email" with subject "test" and body "hello"',
    apiKey: API_KEY,
  })

  const usedEmail = await expect(result)
    .tool('send_email').toBeCalled()
    .run()

  const handledError = await expect(result)
    .output().toMatchRegex(/invalid|error|fail|not valid/i)
    .run()

  return {
    usedEmail: usedEmail.allPassed,
    handledError: handledError.allPassed,
    details: { usedEmail, handledError },
  }
}

/** Test Case 2: Reading a non-existent file should not crash. */
export async function missingFileTest() {
  const result = await runToolCallingAgent({
    request: 'Read the file at /nonexistent/file.txt',
    apiKey: API_KEY,
  })

  const usedFileRead = await expect(result)
    .tool('read_file').toBeCalled()
    .run()

  const handled = await expect(result)
    .output().toMatchRegex(/not found|error|missing|doesn't exist|no/i)
    .run()

  return {
    usedFileRead: usedFileRead.allPassed,
    handled: handled.allPassed,
    details: { usedFileRead, handled },
  }
}

/** Test Case 3: Unknown tool request should be handled gracefully. */
export async function unknownCapabilityTest() {
  const result = await runToolCallingAgent({
    request: 'Can you book a flight to Paris for me?',
    apiKey: API_KEY,
  })

  const handled = await expect(result)
    .output().toMatchRegex(/cannot|can't|not able|don't have|unable|sorry/i)
    .run()

  return {
    handled: handled.allPassed,
    details: { handled },
  }
}
