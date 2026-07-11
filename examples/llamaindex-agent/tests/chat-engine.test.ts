/** Test Suite: Chat Engine - Verifies conversational context with indexed documents. */
import { expect } from '@agentbench/core'
import { runLlamaIndexAgent } from '../src/agent'
const API_KEY = process.env.OPENAI_API_KEY ?? 'sk-test-key'

export async function conversationalQueryTest() {
  const result = await runLlamaIndexAgent({
    query: 'Continue our discussion about React. What hooks are available?',
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
