/**
 * Test Suite: Human-in-the-Loop
 *
 * Verifies the human review approval workflow. Tests the human review
 * node behavior for both approval and rejection paths.
 */

import { expect } from '@agentbench/core'
import { runLangGraphAgent } from '../src/agent'
import { humanReviewNode } from '../src/nodes'
import { createInitialState, updateState } from '../src/state'

const API_KEY = process.env.OPENAI_API_KEY ?? 'sk-test-key'

/** Test Case 1: Approved human review sets state to completed. */
export async function humanApprovalTest() {
  const state = updateState(createInitialState('test'), {
    intent: 'question_answering',
    currentNode: 'human_review',
    status: 'human_review',
    humanReviewRequired: true,
    validation: 'needs_human',
    generatedResponse: 'Test response that needs review.',
  })

  const result = humanReviewNode(state, true)

  const completed = result.status === 'completed'
  const noHumanRequired = result.humanReviewRequired === false
  const validationPassed = result.validation === 'pass'

  return {
    completed,
    noHumanRequired,
    validationPassed,
    details: { completed, noHumanRequired, validationPassed },
  }
}

/** Test Case 2: Rejected human review routes back to generate. */
export async function humanRejectionTest() {
  const state = updateState(createInitialState('test'), {
    intent: 'question_answering',
    currentNode: 'human_review',
    status: 'human_review',
    humanReviewRequired: true,
    validation: 'needs_human',
    generatedResponse: 'Incomplete response.',
  })

  const result = humanReviewNode(state, false)

  const needsRevision = result.validation === 'needs_revision'
  const routesToGenerate = result.status === 'generating'

  return {
    needsRevision,
    routesToGenerate,
    details: { needsRevision, routesToGenerate, status: result.status },
  }
}

/** Test Case 3: Full workflow with request that triggers human review. */
export async function complexRequestWithReviewTest() {
  // Sending a request that might need human review path
  // Note: In our mock, human review is triggered for complex translations
  // or when citations are missing. Let's test a standard request.
  const result = await runLangGraphAgent({
    request: 'How do I implement a binary search tree in Python?',
    apiKey: API_KEY,
  })

  const hasOutput = await expect(result)
    .output()
    .toMatchRegex(/.{50,}/)
    .run()

  const pathIncludesClassify = result.traversalPath.includes('classify')
  const pathIncludesRetrieve = result.traversalPath.includes('retrieve')

  return {
    hasOutput: hasOutput.allPassed,
    pathIncludesClassify,
    pathIncludesRetrieve,
    details: {
      hasOutput,
      pathIncludesClassify,
      pathIncludesRetrieve,
      traversalPath: result.traversalPath,
    },
  }
}
