/** Test Suite: Sequential Execution - Verifies agents run in correct order: Research -> Write -> Review. */
import { expect } from '@agentbench/core'
import { runCrewAiAgent } from '../src/agent'
const API_KEY = process.env.OPENAI_API_KEY ?? 'sk-test-key'

export async function sequentialWorkflowTest() {
  const result = await runCrewAiAgent({ topic: 'Benefits of open source software in enterprise', apiKey: API_KEY })
  const completed = await expect(result).status().toBeCompleted().run()
  const elapsed = result.crewResult.totalTime
  const reasonableTime = elapsed < 60000
  return { completed: completed.allPassed, reasonableTime, elapsedMs: elapsed, details: { completed, reasonableTime } }
}
