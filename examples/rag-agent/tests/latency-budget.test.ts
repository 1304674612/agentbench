/**
 * Test Suite: Latency Budget
 *
 * Verifies the RAG agent completes within acceptable time bounds.
 * RAG pipelines add retrieval latency to the LLM call — this suite
 * ensures the combined latency stays within defined budgets.
 */

import { expect } from '@agentbench/core'
import { runRagAgent } from '../src/agent'

const API_KEY = process.env.OPENAI_API_KEY ?? 'sk-test-key'

/** Test Case 1: Simple query should complete within 20 seconds. */
export async function simpleQueryLatencyTest() {
  const start = Date.now()
  const result = await runRagAgent({
    query: 'What does Python 3.13 improve?',
    apiKey: API_KEY,
    topK: 3,
  })
  const elapsed = Date.now() - start

  const underBudget = elapsed < 20000

  const completed = await expect(result).status().toBeCompleted().run()

  return {
    underBudget,
    elapsedMs: elapsed,
    completed: completed.allPassed,
    details: { underBudget, elapsedMs, completed },
  }
}

/** Test Case 2: Complex query with large topK should complete within 30 seconds. */
export async function complexQueryLatencyTest() {
  const start = Date.now()
  const result = await runRagAgent({
    query: 'Compare Tesla safety statistics with Python 3.13 features and Kubernetes v1.30 changes',
    apiKey: API_KEY,
    topK: 10,
    maxSteps: 5,
  })
  const elapsed = Date.now() - start

  const underBudget = elapsed < 30000

  const completed = await expect(result).status().toBeCompleted().run()

  return {
    underBudget,
    elapsedMs: elapsed,
    completed: completed.allPassed,
    details: { underBudget, elapsedMs, completed },
  }
}
