/**
 * LangGraph Agent — State-graph-based workflow agent.
 *
 * This agent uses the state graph defined in graph.ts to process user
 * requests through a LangGraph-style workflow. It combines the graph
 * execution with an LLM call for enriched response generation.
 *
 * Architecture:
 *   User Input  -->  State Graph  -->  LLM Enrichment  -->  Response
 *
 * Key concepts demonstrated:
 *   - State graph with 5+ custom processing nodes
 *   - Conditional edge routing based on state
 *   - Human-in-the-loop approval simulation
 *   - Workflow traversal path tracking
 *   - State transition transparency
 */

import { createOpenAIClient, runWithOpenAI } from '@agentbench/openai'
import type { ExecutionTrace } from '@agentbench/core'
import { createInitialState } from './state'
import type { WorkflowState } from './state'
import { executeGraph, getGraphSummary } from './graph'

// ---------------------------------------------------------------------------
// Agent runner
// ---------------------------------------------------------------------------

export interface RunLangGraphAgentParams {
  request: string
  apiKey: string
  model?: string
  humanApproved?: boolean
}

export interface LangGraphAgentResult {
  output: string
  trace: ExecutionTrace
  workflowState: WorkflowState
  traversalPath: string[]
  steps: number
  cost: number
}

export async function runLangGraphAgent(
  params: RunLangGraphAgentParams
): Promise<LangGraphAgentResult> {
  const { request, apiKey, model = 'gpt-4o', humanApproved = true } = params

  // Step 1: Execute the state graph
  const initialState = createInitialState(request)
  const { finalState, steps, traversalPath } = executeGraph(initialState)

  // If human review is needed, apply the approval decision
  let resolvedState = finalState
  if (finalState.humanReviewRequired) {
    const { humanReviewNode } = await import('./nodes')
    resolvedState = humanReviewNode(finalState, humanApproved)
  }

  // Step 2: Use the graph output as input for LLM enrichment
  const graphSummary = [
    `Graph Execution Summary:`,
    `- Intent: ${resolvedState.intent} (confidence: ${resolvedState.confidence})`,
    `- Traversal: ${traversalPath.join(' → ')}`,
    `- Steps: ${steps}`,
    `- Status: ${resolvedState.status}`,
    `- Validation: ${resolvedState.validation}`,
    `- Retrieved Context: ${resolvedState.retrievedContext.length} items`,
    `- Human Review: ${resolvedState.humanReviewRequired ? 'Required' : 'Not required'}`,
  ].join('\n')

  const client = createOpenAIClient({
    apiKey,
    tracing: true,
    timeout: 30000,
  })

  const systemPrompt = `${getGraphSummary()}

You are a workflow orchestration agent. You just processed a user request through the state graph above.
Use the graph execution summary to produce a helpful, enriched response for the user.

Rules:
- Reference the graph traversal in your response when relevant
- If the validation passed, deliver the response confidently
- If the validation needs human review, mention that the response has been reviewed
- Keep responses clear and actionable`

  const result = await runWithOpenAI({
    client,
    agent: {
      provider: 'openai',
      model,
      temperature: 0.2,
      maxTokens: 4096,
      systemPrompt,
      tools: [],
    },
    messages: [
      { role: 'system', content: graphSummary },
      { role: 'user', content: request },
    ],
    tools: [],
    maxSteps: 8,
  })

  return {
    output: result.output,
    trace: result.trace,
    workflowState: resolvedState,
    traversalPath,
    steps,
    cost: result.cost,
  }
}
