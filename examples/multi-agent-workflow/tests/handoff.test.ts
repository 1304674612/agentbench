/** Test Suite: Handoff - Verifies context is correctly transferred between agents. */
import { expect } from '@agentbench/core'
import { runMultiAgentWorkflow } from '../src/agent'
const API_KEY = process.env.OPENAI_API_KEY ?? 'sk-test-key'

export async function handoffFlowTest() {
  const result = await runMultiAgentWorkflow({
    topic: 'Evaluate the security implications of quantum computing',
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
