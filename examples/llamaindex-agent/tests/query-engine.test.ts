/** Test Suite: Query Engine - Verifies index queries return relevant results. */
import { expect } from '@agentbench/core'
import { runLlamaIndexAgent } from '../src/agent'
const API_KEY = process.env.OPENAI_API_KEY ?? 'sk-test-key'

export async function basicQueryTest() {
  const result = await runLlamaIndexAgent({
    query: 'What are Python best practices for type hints?',
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

export async function crossDomainQueryTest() {
  const result = await runLlamaIndexAgent({
    query: 'How does machine learning relate to cloud architecture?',
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
