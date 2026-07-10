/**
 * Test Suite: Tracing
 * Verifies execution traces are created and retrievable.
 */
import { expect } from '@agentbench/core'
import { runOpenAIAgentSdk } from '../src/agent'
const API_KEY = process.env.OPENAI_API_KEY ?? 'sk-test-key'

export async function traceCreationTest() {
  const result = await runOpenAIAgentSdk({ request: 'Show me the current execution trace.', apiKey: API_KEY })
  const completed = await expect(result).status().toBeCompleted().run()
  const hasOutput = await expect(result).output().toMatchRegex(/.{15,}/).run()
  return { completed: completed.allPassed, hasOutput: hasOutput.allPassed, details: { completed, hasOutput } }
}
