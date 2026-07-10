/** Test Suite: Output Quality - Verifies review agent scores and final output quality. */
import { expect } from '@agentbench/core'
import { runCrewAiAgent } from '../src/agent'
const API_KEY = process.env.OPENAI_API_KEY ?? 'sk-test-key'

export async function qualityReviewTest() {
  const result = await runCrewAiAgent({ topic: 'Electric vehicles vs hydrogen fuel cells', apiKey: API_KEY })
  const completed = await expect(result).status().toBeCompleted().run()
  const hasOutput = await expect(result).output().toMatchRegex(/.{80,}/).run()
  return { completed: completed.allPassed, hasOutput: hasOutput.allPassed, details: { completed, hasOutput } }
}
