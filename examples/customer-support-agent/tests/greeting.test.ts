/**
 * Test Suite: Greeting
 *
 * Verifies the customer support agent responds to a simple "Hello" with
 * a friendly, professional greeting that invites the customer to share
 * their issue.
 */

import { expect } from '@agentbench/core'
import { runCustomerSupportAgent } from '../agent'

const API_KEY = process.env.OPENAI_API_KEY ?? 'sk-test-key'

export async function greetingTest() {
  const result = await runCustomerSupportAgent({
    messages: [{ role: 'user', content: 'Hello' }],
    apiKey: API_KEY,
  })

  // Assertion 1: Agent completed successfully without errors or timeouts
  const completed = await expect(result).status().toBeCompleted().run()

  // Assertion 2: Agent output contains a friendly greeting
  const friendly = await expect(result).output().toContain('hello').run()

  // Fallback: check for alternative greetings if 'hello' not found
  const alternativeGreeting = await expect(result)
    .any([
      (b) => b.output().toContain('Hi'),
      (b) => b.output().toContain('help'),
      (b) => b.output().toContain('How can I'),
      (b) => b.output().toContain('assist'),
    ])
    .run()

  // Assertion 3: Token usage is reasonable for a simple greeting
  const tokens = await expect(result).tokens().toBeLessThan(1000).run()

  // Assertion 4: Response time is under 10 seconds
  const latency = await expect(result).latency().toBeLessThan(10000).run()

  return {
    completed: completed.allPassed,
    friendly: friendly.allPassed || alternativeGreeting.allPassed,
    tokens: tokens.allPassed,
    latency: latency.allPassed,
    details: { completed, friendly, alternativeGreeting, tokens, latency },
  }
}
