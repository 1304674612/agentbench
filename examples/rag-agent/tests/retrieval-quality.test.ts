/**
 * Test Suite: Retrieval Quality
 *
 * Verifies the RAG agent retrieves relevant document chunks for queries
 * and that retrieval scores meet quality thresholds. Tests the core
 * promise of RAG: the right documents come back for the right questions.
 */

import { expect } from '@agentbench/core'
import { runRagAgent } from '../src/agent'
import { retrieve, computeEmbeddingSimilarity } from '../src/retriever'

const API_KEY = process.env.OPENAI_API_KEY ?? 'sk-test-key'

/** Test Case 1: Query for Tesla safety data should retrieve doc1 chunks. */
export async function teslaSafetyRetrievalTest() {
  const result = await runRagAgent({
    query: 'How safe is Tesla Autopilot compared to human drivers?',
    apiKey: API_KEY,
  })

  const usedRetrieve = await expect(result)
    .tool('retrieve').toBeCalled()
    .run()

  const mentionsTesla = await expect(result)
    .output().toMatchRegex(/Tesla|Autopilot|safety/i)
    .run()

  const retrievedSomething = await expect(result)
    .output().toMatchRegex(/.{100,}/)
    .run()

  return {
    usedRetrieve: usedRetrieve.allPassed,
    mentionsTesla: mentionsTesla.allPassed,
    retrievedSomething: retrievedSomething.allPassed,
    details: { usedRetrieve, mentionsTesla, retrievedSomething },
  }
}

/** Test Case 2: Query for Python 3.13 features should retrieve doc2 chunks. */
export async function pythonFeaturesRetrievalTest() {
  const result = await runRagAgent({
    query: 'What new features were added in Python 3.13?',
    apiKey: API_KEY,
  })

  const usedRetrieve = await expect(result)
    .tool('retrieve').toBeCalled()
    .run()

  const mentionsPython = await expect(result)
    .output().toMatchRegex(/Python|3\.13|GIL|JIT/i)
    .run()

  // Retriever should have found chunks about Python 3.13
  const hasContent = await expect(result)
    .output().toMatchRegex(/.{150,}/)
    .run()

  return {
    usedRetrieve: usedRetrieve.allPassed,
    mentionsPython: mentionsPython.allPassed,
    hasContent: hasContent.allPassed,
    details: { usedRetrieve, mentionsPython, hasContent },
  }
}

/** Test Case 3: Verify retriever similarity scoring quality directly. */
export async function retrievalSimilarityQualityTest() {
  // Test the retriever directly (not through agent) to validate scoring
  const query = 'Tesla Autopilot crash statistics 2025'
  const result = await retrieve(query, 3)

  // Top result should have a high relevance score
  const topScoreHigh = result.chunks.length > 0 && result.chunks[0].score > 0.1

  // Top result title should contain Tesla
  const topResultRelevant = result.chunks.length > 0 &&
    result.chunks[0].title.toLowerCase().includes('tesla')

  // Similarity score for the best match should be > 0
  if (result.chunks.length > 0) {
    const sim = computeEmbeddingSimilarity(query, result.chunks[0].content)
    const simAboveZero = sim > 0

    return {
      topScoreHigh,
      topResultRelevant,
      simAboveZero,
      details: { topScoreHigh, topResultRelevant, simAboveZero },
    }
  }

  return {
    topScoreHigh: false,
    topResultRelevant: false,
    simAboveZero: false,
    details: { topScoreHigh, topResultRelevant, simAboveZero: false },
  }
}
