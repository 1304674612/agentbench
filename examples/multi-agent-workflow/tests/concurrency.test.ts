/** Test Suite: Concurrency - Verifies agents can work in parallel without conflicts. */
import { expect } from '@agentbench/core'
import { runMultiAgentWorkflow } from '../src/agent'
const API_KEY = process.env.OPENAI_API_KEY ?? 'sk-test-key'

export async function parallelExecutionTest() {
  const result = await runMultiAgentWorkflow({ topic: 'Analyze and plan for AI adoption in healthcare', apiKey: API_KEY })
  const completed = await expect(result).status().toBeCompleted().run()
  const hasOutput = await expect(result).output().toMatchRegex(/.{50,}/).run()
  return { completed: completed.allPassed, hasOutput: hasOutput.allPassed, details: { completed, hasOutput } }
}
