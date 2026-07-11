/** Test Suite: Failure Recovery - Verifies the workflow recovers from agent failures. */
import { expect } from '@agentbench/core'
import { runMultiAgentWorkflow } from '../src/agent'
const API_KEY = process.env.OPENAI_API_KEY ?? 'sk-test-key'

export async function gracefulFailureTest() {
  const result = await runMultiAgentWorkflow({
    topic: 'Handle a scenario where data analysis encounters corrupted data',
    apiKey: API_KEY,
  })
  const completed = await expect(result).status().toBeCompleted().run()
  const hasOutput = await expect(result)
    .output()
    .toMatchRegex(/.{30,}/)
    .run()
  const noErrors = result.orchestration.errors.length === 0
  return {
    completed: completed.allPassed,
    hasOutput: hasOutput.allPassed,
    noErrors,
    errors: result.orchestration.errors,
    details: { completed, hasOutput, noErrors },
  }
}
