/**
 * Test Suite: Tool Use
 * Verifies the agent uses tools correctly via the OpenAI Agents SDK pattern.
 */
import { expect } from '@agentbench/core'
import { runOpenAIAgentSdk } from '../src/agent'
const API_KEY = process.env.OPENAI_API_KEY ?? 'sk-test-key'

export async function callToolTest() {
  const result = await runOpenAIAgentSdk({ request: 'Use a tool called "search" to find information about renewable energy.', apiKey: API_KEY })
  const completed = await expect(result).status().toBeCompleted().run()
  const hasOutput = await expect(result).output().toMatchRegex(/.{20,}/).run()
  return { completed: completed.allPassed, hasOutput: hasOutput.allPassed, details: { completed, hasOutput } }
}
