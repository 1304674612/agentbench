/**
 * Test Suite: Context Window
 *
 * Verifies the RAG agent respects context window constraints when retrieving
 * multiple chunks. Ensures the agent does not exceed token limits or lose
 * coherence when working with many retrieved documents.
 */

import { expect } from '@agentbench/core'
import { runRagAgent } from '../src/agent'

const API_KEY = process.env.OPENAI_API_KEY ?? 'sk-test-key'

/** Test Case 1: Agent handles large retrieval (topK=10) without errors. */
export async function largeTopKRetrievalTest() {
  const result = await runRagAgent({
    query:
      'Tell me everything you know about recent technology releases and climate change findings',
    apiKey: API_KEY,
    topK: 10,
  })

  const completed = await expect(result).status().toBeCompleted().run()

  const hasContent = await expect(result)
    .output()
    .toMatchRegex(/.{200,}/)
    .run()

  return {
    completed: completed.allPassed,
    hasContent: hasContent.allPassed,
    details: { completed, hasContent },
  }
}

/** Test Case 2: Agent handles minimal retrieval (topK=1) and still answers. */
export async function minimalTopKRetrievalTest() {
  const result = await runRagAgent({
    query: 'What is the main finding about Tesla Autopilot safety?',
    apiKey: API_KEY,
    topK: 1,
  })

  const completed = await expect(result).status().toBeCompleted().run()

  const outputRelevant = await expect(result)
    .output()
    .toMatchRegex(/Tesla|Autopilot|safety/i)
    .run()

  return {
    completed: completed.allPassed,
    outputRelevant: outputRelevant.allPassed,
    details: { completed, outputRelevant },
  }
}
