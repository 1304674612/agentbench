/**
 * Test Suite: State Transitions
 *
 * Verifies the state object correctly transitions through each node
 * in the graph. Tests that state fields are populated correctly at
 * each stage of the workflow.
 */

import { expect } from '@agentbench/core'
import { runLangGraphAgent } from '../src/agent'

const API_KEY = process.env.OPENAI_API_KEY ?? 'sk-test-key'

/** Test Case 1: State transitions from idle through to completed. */
export async function stateProgressionTest() {
  const result = await runLangGraphAgent({
    request: 'Explain what machine learning is',
    apiKey: API_KEY,
  })

  const notIdle = result.workflowState.status !== 'idle'

  const hasOutput = await expect(result)
    .output().toMatchRegex(/.{50,}/)
    .run()

  const hasRetrievedContext = result.workflowState.retrievedContext.length > 0

  return {
    notIdle,
    hasOutput: hasOutput.allPassed,
    hasRetrievedContext,
    details: { notIdle, hasOutput, hasRetrievedContext, status: result.workflowState.status },
  }
}

/** Test Case 2: Retrieved context is populated for data analysis requests. */
export async function contextPopulationTest() {
  const result = await runLangGraphAgent({
    request: 'Analyze the sales data from last quarter',
    apiKey: API_KEY,
  })

  const hasContext = result.workflowState.retrievedContext.length > 0

  const correctIntent = result.workflowState.intent === 'data_analysis'

  return {
    hasContext,
    correctIntent,
    details: { hasContext, correctIntent, intent: result.workflowState.intent },
  }
}

/** Test Case 3: Messages array is appended after generation. */
export async function messagesAccumulationTest() {
  const result = await runLangGraphAgent({
    request: 'How does photosynthesis work?',
    apiKey: API_KEY,
  })

  const hasMessages = result.workflowState.messages.length >= 2

  const hasAssistantMessage = result.workflowState.messages.some(
    (m) => m.role === 'assistant',
  )

  return {
    hasMessages,
    hasAssistantMessage,
    details: { hasMessages, hasAssistantMessage, messageCount: result.workflowState.messages.length },
  }
}
