/**
 * Test Suite: Workflow Paths
 *
 * Verifies the state graph traverses the correct paths for different
 * types of user requests. Tests the full graph execution from
 * classification to response generation.
 */

import { expect } from '@agentbench/core'
import { runLangGraphAgent } from '../src/agent'

const API_KEY = process.env.OPENAI_API_KEY ?? 'sk-test-key'

/** Test Case 1: Question-answering request should follow the full path. */
export async function questionAnsweringPathTest() {
  const result = await runLangGraphAgent({
    request: 'What are the key features of TypeScript?',
    apiKey: API_KEY,
  })

  const hasOutput = await expect(result)
    .output().toMatchRegex(/.{50,}/)
    .run()

  const pathComplete = result.traversalPath.length >= 2

  const correctIntent = result.workflowState.intent === 'question_answering'

  return {
    hasOutput: hasOutput.allPassed,
    pathComplete,
    correctIntent,
    details: { hasOutput, pathComplete, correctIntent, traversalPath: result.traversalPath },
  }
}

/** Test Case 2: Code generation request should classify correctly. */
export async function codeGenerationPathTest() {
  const result = await runLangGraphAgent({
    request: 'Write a function to sort an array of numbers',
    apiKey: API_KEY,
  })

  const hasOutput = await expect(result)
    .output().toMatchRegex(/.{50,}/)
    .run()

  const correctIntent = result.workflowState.intent === 'code_generation'

  return {
    hasOutput: hasOutput.allPassed,
    correctIntent,
    details: { hasOutput, correctIntent, traversalPath: result.traversalPath },
  }
}

/** Test Case 3: Summarization request should follow summarization path. */
export async function summarizationPathTest() {
  const result = await runLangGraphAgent({
    request: 'Please summarize the quarterly earnings report',
    apiKey: API_KEY,
  })

  const hasOutput = await expect(result)
    .output().toMatchRegex(/.{50,}/)
    .run()

  const correctIntent = result.workflowState.intent === 'summarization'

  return {
    hasOutput: hasOutput.allPassed,
    correctIntent,
    details: { hasOutput, correctIntent, traversalPath: result.traversalPath },
  }
}
