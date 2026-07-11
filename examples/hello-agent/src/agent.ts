/**
 * Hello Agent — The minimal AgentBench agent implementation.
 *
 * This is the simplest possible agent: a single-turn chat agent with
 * no tools, no multi-step reasoning, and no external dependencies beyond
 * the OpenAI API. It serves as the "getting started" reference for
 * building your first AgentBench project.
 *
 * Architecture:
 *   User Message  -->  OpenAI Chat Completion  -->  Response
 *
 * Key concepts demonstrated:
 *   - Wrapping OpenAI calls with runWithOpenAI for tracing
 *   - Returning structured results for the assertion DSL
 *   - Minimal configuration for quick iteration
 */

import { createOpenAIClient, runWithOpenAI } from '@agentbench/openai'
import type { ExecutionTrace } from '@agentbench/core'

// ---------------------------------------------------------------------------
// Agent runner
// ---------------------------------------------------------------------------

export interface RunHelloAgentParams {
  message: string
  apiKey: string
  model?: string
  temperature?: number
}

export interface HelloAgentResult {
  output: string
  trace: ExecutionTrace
  cost: number
  model: string
}

export async function runHelloAgent(params: RunHelloAgentParams): Promise<HelloAgentResult> {
  const { message, apiKey, model = 'gpt-4o-mini', temperature = 0.3 } = params

  const client = createOpenAIClient({
    apiKey,
    tracing: true,
    timeout: 15000,
  })

  const result = await runWithOpenAI({
    client,
    agent: {
      provider: 'openai',
      model,
      temperature,
      maxTokens: 1024,
      systemPrompt: `You are a helpful, concise assistant. Answer questions accurately and keep responses brief.
When asked a factual question, give the answer directly without unnecessary preamble.
When greeted, respond warmly but briefly.`,
      tools: [],
    },
    messages: [{ role: 'user', content: message }],
    tools: [],
    maxSteps: 3,
  })

  return {
    output: result.output,
    trace: result.trace,
    cost: result.cost,
    model,
  }
}
