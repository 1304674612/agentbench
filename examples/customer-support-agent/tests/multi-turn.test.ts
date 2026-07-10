/**
 * Test Suite: Multi-Turn Conversation
 *
 * Verifies the agent handles a multi-turn conversation correctly —
 * maintaining context across exchanges and reaching a resolution.
 */

import { expect } from '@agentbench/core'
import { runCustomerSupportAgent } from '../agent'

const API_KEY = process.env.OPENAI_API_KEY ?? 'sk-test-key'

export async function multiTurnTest() {
  // Simulate a 3-turn conversation about order status and refund
  const result = await runCustomerSupportAgent({
    messages: [
      {
        role: 'user',
        content: 'Hi, I want to check the status of my order ORD-12345.',
      },
      {
        role: 'assistant',
        content: 'Let me look that up for you.',
      },
      {
        role: 'user',
        content: 'Also, I am thinking about cancelling. What is your refund policy?',
      },
      {
        role: 'assistant',
        content: 'Let me check our refund policy for you.',
      },
      {
        role: 'user',
        content: 'OK, based on that information, I would like to proceed with a refund.',
      },
    ],
    apiKey: API_KEY,
    maxSteps: 8,
  })

  // Assertion 1: Agent completed the multi-turn interaction
  const completed = await expect(result)
    .status().toBeCompleted()
    .run()

  // Assertion 2: Agent used order lookup tool in the conversation
  const checkedOrder = await expect(result)
    .tool('check_order_status').toBeCalled()
    .run()

  // Assertion 3: Agent used knowledge base to look up refund policy
  const checkedPolicy = await expect(result)
    .tool('search_knowledge_base').toBeCalled()
    .run()

  // Assertion 4: Output should contain resolution-related language
  const resolution = await expect(result)
    .any([
      (b) => b.output().toContain('resolution'),
      (b) => b.output().toContain('refund'),
      (b) => b.output().toContain('process'),
      (b) => b.output().toContain('help'),
    ])
    .run()

  // Assertion 5: Agent handled multi-turn without excessive token bloat
  const tokensReasonable = await expect(result)
    .tokens().toBeLessThan(3000)
    .run()

  return {
    completed: completed.allPassed,
    checkedOrder: checkedOrder.allPassed,
    checkedPolicy: checkedPolicy.allPassed,
    resolution: resolution.allPassed,
    tokensReasonable: tokensReasonable.allPassed,
    details: { completed, checkedOrder, checkedPolicy, resolution, tokensReasonable },
  }
}
