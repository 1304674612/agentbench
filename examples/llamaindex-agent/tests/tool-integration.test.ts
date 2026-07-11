/** Test Suite: Tool Integration - Verifies index tools work with LLM queries. */
import { expect } from '@agentbench/core'
import { runLlamaIndexAgent } from '../src/agent'
const API_KEY = process.env.OPENAI_API_KEY ?? 'sk-test-key'

export async function toolWithIndexTest() {
  const result = await runLlamaIndexAgent({
    query: 'Use the summarize tool on the database design document.',
    apiKey: API_KEY,
  })
  const completed = await expect(result).status().toBeCompleted().run()
  const hasOutput = await expect(result)
    .output()
    .toMatchRegex(/.{20,}/)
    .run()
  return {
    completed: completed.allPassed,
    hasOutput: hasOutput.allPassed,
    details: { completed, hasOutput },
  }
}
