/** Test Suite: Index Quality - Verifies index metadata and quality metrics. */
import { expect } from '@agentbench/core'
import { runLlamaIndexAgent } from '../src/agent'
const API_KEY = process.env.OPENAI_API_KEY ?? 'sk-test-key'

export async function indexMetadataTest() {
  const result = await runLlamaIndexAgent({ query: 'Show me the index metadata and document statistics.', apiKey: API_KEY })
  const completed = await expect(result).status().toBeCompleted().run()
  const hasOutput = await expect(result).output().toMatchRegex(/.{20,}/).run()
  return { completed: completed.allPassed, hasOutput: hasOutput.allPassed, details: { completed, hasOutput } }
}
