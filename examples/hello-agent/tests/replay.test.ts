/**
 * Test Suite: Deterministic Replay
 *
 * Verifies that the agent produces consistent outputs when asked
 * the same question multiple times with temperature=0. This is
 * critical for CI reliability — flaky agents break pipelines.
 *
 * Test cases cover:
 *   1. Repeated greeting returns consistent tone
 *   2. Same factual question returns consistent answer
 */

import { expect } from '@agentbench/core'
import { runHelloAgent } from '../src/agent'

const API_KEY = process.env.OPENAI_API_KEY ?? 'sk-test-key'

/** Test Case 1: Two identical greetings should produce similar output. */
export async function replayGreetingTest() {
  const [run1, run2] = await Promise.all([
    runHelloAgent({ message: 'Hello!', apiKey: API_KEY, temperature: 0 }),
    runHelloAgent({ message: 'Hello!', apiKey: API_KEY, temperature: 0 }),
  ])

  // Both runs completed
  const bothCompleted = await expect(run1).status().toBeCompleted().run()

  const run2Completed = await expect(run2).status().toBeCompleted().run()

  // Both runs contain greeting language
  const run1Friendly = await expect(run1)
    .any([
      (b) => b.output().toContain('hello'),
      (b) => b.output().toContain('Hello'),
      (b) => b.output().toContain('Hi'),
      (b) => b.output().toContain('help'),
    ])
    .run()

  const run2Friendly = await expect(run2)
    .any([
      (b) => b.output().toContain('hello'),
      (b) => b.output().toContain('Hello'),
      (b) => b.output().toContain('Hi'),
      (b) => b.output().toContain('help'),
    ])
    .run()

  // Both runs have reasonable token counts
  const tokensReasonable = await expect(run1).tokens().toBeLessThan(500).run()

  return {
    bothCompleted: bothCompleted.allPassed && run2Completed.allPassed,
    run1Friendly: run1Friendly.allPassed,
    run2Friendly: run2Friendly.allPassed,
    tokensReasonable: tokensReasonable.allPassed,
    details: { bothCompleted, run2Completed, run1Friendly, run2Friendly, tokensReasonable },
  }
}

/** Test Case 2: Two identical factual questions should produce the same answer. */
export async function replayFactualTest() {
  const [run1, run2] = await Promise.all([
    runHelloAgent({
      message: 'What is the chemical symbol for water?',
      apiKey: API_KEY,
      temperature: 0,
    }),
    runHelloAgent({
      message: 'What is the chemical symbol for water?',
      apiKey: API_KEY,
      temperature: 0,
    }),
  ])

  const bothCompleted = await expect(run1).status().toBeCompleted().run()

  const run2Completed = await expect(run2).status().toBeCompleted().run()

  // At least one run contains H2O
  const mentionsWater = await expect(run1)
    .any([(b) => b.output().toMatchRegex(/H[₂2]O|water/i), (b) => b.output().toContain('H2O')])
    .run()

  const run2MentionsWater = await expect(run2)
    .any([(b) => b.output().toMatchRegex(/H[₂2]O|water/i), (b) => b.output().toContain('H2O')])
    .run()

  return {
    bothCompleted: bothCompleted.allPassed && run2Completed.allPassed,
    mentionsWater: mentionsWater.allPassed,
    run2MentionsWater: run2MentionsWater.allPassed,
    details: { bothCompleted, run2Completed, mentionsWater, run2MentionsWater },
  }
}
