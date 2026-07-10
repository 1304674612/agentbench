/** Test Suite: Task Completion - Verifies all agents complete their assigned tasks. */
import { expect } from '@agentbench/core'
import { runCrewAiAgent } from '../src/agent'
const API_KEY = process.env.OPENAI_API_KEY ?? 'sk-test-key'

export async function fullWorkflowCompletionTest() {
  const result = await runCrewAiAgent({ topic: 'The impact of remote work on productivity', apiKey: API_KEY })
  const completed = await expect(result).status().toBeCompleted().run()
  const hasOutput = await expect(result).output().toMatchRegex(/.{50,}/).run()
  return { completed: completed.allPassed, hasOutput: hasOutput.allPassed, crewSuccess: result.crewResult.success, details: { completed, hasOutput } }
}
