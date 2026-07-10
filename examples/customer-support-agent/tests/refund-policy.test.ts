/**
 * Test Suite: Refund Policy
 *
 * Verifies the agent correctly explains the 30-day refund policy when asked
 * and uses the search_knowledge_base tool to retrieve accurate information.
 */

import { expect } from '@agentbench/core'
import { runCustomerSupportAgent } from '../agent'

const API_KEY = process.env.OPENAI_API_KEY ?? 'sk-test-key'

export async function refundPolicyTest() {
  const result = await runCustomerSupportAgent({
    messages: [
      {
        role: 'user',
        content: 'Hi, I purchased your Professional plan last week but it is not meeting my needs. Can I get a refund?',
      },
    ],
    apiKey: API_KEY,
  })

  // Assertion 1: Agent used the knowledge base to look up policy (not hallucinating)
  const usedKB = await expect(result)
    .tool('search_knowledge_base').toBeCalled()
    .run()

  // Assertion 2: Response mentions "refund"
  const mentionsRefund = await expect(result)
    .output().toContain('refund')
    .run()

  // Assertion 3: Response mentions the 30-day window (correct policy detail)
  const mentionsDays = await expect(result)
    .output().toContain('30')
    .run()

  // Alternative check for "30-day" or "thirty" if "30" not found
  const mentionsPolicy = await expect(result)
    .any([
      (b) => b.output().toContain('30-day'),
      (b) => b.output().toContain('thirty'),
      (b) => b.output().toContain('money-back'),
      (b) => b.output().toContain('guarantee'),
    ])
    .run()

  // Assertion 4: Agent did NOT escalate (refund policy is within its capabilities)
  const noEscalation = await expect(result)
    .tool('escalate_to_human').not.toBeCalled()
    .run()

  // Assertion 5: Correctness score via LLM judge > 7/10
  const correctness = await expect(result)
    .score('correctness').toBeGreaterThan(7)
    .run()

  return {
    usedKB: usedKB.allPassed,
    mentionsRefund: mentionsRefund.allPassed,
    mentionsDays: mentionsDays.allPassed || mentionsPolicy.allPassed,
    noEscalation: noEscalation.allPassed,
    correctness: correctness.allPassed,
    details: { usedKB, mentionsRefund, mentionsDays, mentionsPolicy, noEscalation, correctness },
  }
}
