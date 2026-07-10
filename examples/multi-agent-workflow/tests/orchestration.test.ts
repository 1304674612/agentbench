/** Test Suite: Orchestration - Verifies the orchestrator coordinates all agents correctly. */
import { expect } from '@agentbench/core'
import { runMultiAgentWorkflow } from '../src/agent'
const API_KEY = process.env.OPENAI_API_KEY ?? 'sk-test-key'

export async function fullOrchestrationTest() {
  const result = await runMultiAgentWorkflow({ topic: 'Analyze the market for renewable energy technologies', apiKey: API_KEY })
  const completed = await expect(result).status().toBeCompleted().run()
  const hasOutput = await expect(result).output().toMatchRegex(/.{50,}/).run()
  const allAgentsRun = result.orchestration.agentTraces.length >= 4
  return { completed: completed.allPassed, hasOutput: hasOutput.allPassed, allAgentsRun, agentTrace: result.orchestration.agentTraces, details: { completed, hasOutput, allAgentsRun } }
}
