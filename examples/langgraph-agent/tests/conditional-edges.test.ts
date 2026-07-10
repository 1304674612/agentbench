/**
 * Test Suite: Conditional Edges
 *
 * Verifies that conditional edge routing works correctly. Different
 * validation results should route to different next nodes: pass routes
 * to completion, needs_revision routes back to generate, needs_human
 * routes to human_review.
 */

import { expect } from '@agentbench/core'
import { runLangGraphAgent } from '../src/agent'
import { getNextNode } from '../src/graph'
import { createInitialState, updateState } from '../src/state'

const API_KEY = process.env.OPENAI_API_KEY ?? 'sk-test-key'

/** Test Case 1: When validation passes, graph should terminate. */
export async function validationPassTerminationTest() {
  const result = await runLangGraphAgent({
    request: 'Tell me about the solar system',
    apiKey: API_KEY,
  })

  const completed = result.workflowState.status === 'completed'

  const hasOutput = await expect(result)
    .output().toMatchRegex(/.{50,}/)
    .run()

  return {
    completed,
    hasOutput: hasOutput.allPassed,
    details: { completed, hasOutput, status: result.workflowState.status },
  }
}

/** Test Case 2: Edge routing for needs_revision returns to generate. */
export async function needsRevisionRoutingTest() {
  // Test the routing directly with constructed state
  const state = updateState(
    createInitialState('test input'),
    {
      intent: 'question_answering',
      currentNode: 'validate',
      validation: 'needs_revision',
      status: 'validating',
    },
  )

  const nextNode = getNextNode(state)

  // When validation says needs_revision, should go back to generate
  const routesToGenerate = nextNode === 'generate'

  return {
    routesToGenerate,
    details: { routesToGenerate, nextNode },
  }
}

/** Test Case 3: Edge routing for needs_human should route to human_review. */
export async function needsHumanRoutingTest() {
  const state = updateState(
    createInitialState('test input'),
    {
      intent: 'question_answering',
      currentNode: 'validate',
      validation: 'needs_human',
      status: 'validating',
      humanReviewRequired: true,
    },
  )

  const nextNode = getNextNode(state)

  const routesToHumanReview = nextNode === 'human_review'

  return {
    routesToHumanReview,
    details: { routesToHumanReview, nextNode },
  }
}
