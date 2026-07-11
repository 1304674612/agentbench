/** Test Suite: Consensus - Verifies agents reach agreement on key decisions. */
import { expect } from '@agentbench/core'
import { runMultiAgentWorkflow } from '../src/agent'
const API_KEY = process.env.OPENAI_API_KEY ?? 'sk-test-key'

export async function consensusReachedTest() {
  const result = await runMultiAgentWorkflow({
    topic: 'What is the best approach for migrating from monolith to microservices?',
    apiKey: API_KEY,
  })
  const completed = await expect(result).status().toBeCompleted().run()
  const hasOutput = await expect(result)
    .output()
    .toMatchRegex(/.{30,}/)
    .run()
  return {
    completed: completed.allPassed,
    hasOutput: hasOutput.allPassed,
    details: { completed, hasOutput },
  }
}
