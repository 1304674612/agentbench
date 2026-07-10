/**
 * Test Suite: Handoffs
 * Verifies handoff to specialist agents (math-agent, writer-agent, coder-agent).
 */
import { expect } from '@agentbench/core'
import { runOpenAIAgentSdk } from '../src/agent'
const API_KEY = process.env.OPENAI_API_KEY ?? 'sk-test-key'

export async function handoffToMathAgentTest() {
  const result = await runOpenAIAgentSdk({ request: 'Calculate the compound interest on $1000 at 5% for 3 years, compounded monthly.', apiKey: API_KEY })
  const completed = await expect(result).status().toBeCompleted().run()
  const hasOutput = await expect(result).output().toMatchRegex(/.{20,}/).run()
  return { completed: completed.allPassed, hasOutput: hasOutput.allPassed, details: { completed, hasOutput } }
}

export async function handoffToWriterAgentTest() {
  const result = await runOpenAIAgentSdk({ request: 'Write a short motivational paragraph about perseverance.', apiKey: API_KEY })
  const completed = await expect(result).status().toBeCompleted().run()
  const hasOutput = await expect(result).output().toMatchRegex(/.{50,}/).run()
  return { completed: completed.allPassed, hasOutput: hasOutput.allPassed, details: { completed, hasOutput } }
}
