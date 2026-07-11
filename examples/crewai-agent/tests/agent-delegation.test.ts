/** Test Suite: Agent Delegation - Verifies correct agent selection and delegation. */
import { expect } from '@agentbench/core'
import { runCrewAiAgent } from '../src/agent'
const API_KEY = process.env.OPENAI_API_KEY ?? 'sk-test-key'

export async function researchDelegationTest() {
  const result = await runCrewAiAgent({
    topic: 'Latest developments in AI safety research',
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
