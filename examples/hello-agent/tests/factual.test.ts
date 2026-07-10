/**
 * Test Suite: Factual Accuracy
 *
 * Verifies the agent gives correct, grounded answers to simple
 * factual questions. Tests the agent does not hallucinate when
 * answering questions with well-known answers.
 *
 * Test cases cover:
 *   1. Capital cities (basic geography)
 *   2. Simple arithmetic (closed-form answer)
 */

import { expect } from '@agentbench/core'
import { runHelloAgent } from '../src/agent'

const API_KEY = process.env.OPENAI_API_KEY ?? 'sk-test-key'

/** Test Case 1: The agent should correctly identify the capital of France. */
export async function capitalOfFranceTest() {
  const result = await runHelloAgent({
    message: 'What is the capital of France?',
    apiKey: API_KEY,
  })

  const completed = await expect(result)
    .status().toBeCompleted()
    .run()

  const correctAnswer = await expect(result)
    .output().toContain('Paris')
    .run()

  const tokensReasonable = await expect(result)
    .tokens().toBeLessThan(500)
    .run()

  return {
    completed: completed.allPassed,
    correctAnswer: correctAnswer.allPassed,
    tokensReasonable: tokensReasonable.allPassed,
    details: { completed, correctAnswer, tokensReasonable },
  }
}

/** Test Case 2: The agent should correctly answer a simple arithmetic question. */
export async function arithmeticTest() {
  const result = await runHelloAgent({
    message: 'What is 128 divided by 8?',
    apiKey: API_KEY,
  })

  const completed = await expect(result)
    .status().toBeCompleted()
    .run()

  const correctAnswer = await expect(result)
    .output().toContain('16')
    .run()

  const tokensReasonable = await expect(result)
    .tokens().toBeLessThan(500)
    .run()

  return {
    completed: completed.allPassed,
    correctAnswer: correctAnswer.allPassed,
    tokensReasonable: tokensReasonable.allPassed,
    details: { completed, correctAnswer, tokensReasonable },
  }
}
