/**
 * Test Suite: Greeting
 *
 * Verifies the agent responds to a simple greeting with a warm,
 * professional acknowledgement. This is the most basic possible
 * AgentBench test — a single-turn interaction with no tools.
 */

import { expect } from '@agentbench/core'
import { runHelloAgent } from '../src/agent'

const API_KEY = process.env.OPENAI_API_KEY ?? 'sk-test-key'

export async function greetingTest() {
  const result = await runHelloAgent({
    message: 'Hello! How are you today?',
    apiKey: API_KEY,
  })

  // Assertion 1: Agent completed without errors
  const completed = await expect(result)
    .status().toBeCompleted()
    .run()

  // Assertion 2: Agent output is a non-empty string
  const hasOutput = await expect(result)
    .output().toMatchRegex(/.{3,}/)
    .run()

  // Assertion 3: Response is warm and appropriate
  const friendly = await expect(result)
    .any([
      (b) => b.output().toContain('hello'),
      (b) => b.output().toContain('Hello'),
      (b) => b.output().toContain('Hi'),
      (b) => b.output().toContain('help'),
      (b) => b.output().toContain('How can I'),
    ])
    .run()

  // Assertion 4: Token usage is minimal for a simple greeting
  const tokensMinimal = await expect(result)
    .tokens().toBeLessThan(500)
    .run()

  // Assertion 5: Response time is reasonable
  const latencyOk = await expect(result)
    .latency().toBeLessThan(10000)
    .run()

  return {
    completed: completed.allPassed,
    hasOutput: hasOutput.allPassed,
    friendly: friendly.allPassed,
    tokensMinimal: tokensMinimal.allPassed,
    latencyOk: latencyOk.allPassed,
    details: { completed, hasOutput, friendly, tokensMinimal, latencyOk },
  }
}
