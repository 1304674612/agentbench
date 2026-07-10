/**
 * RAG Agent — Retrieval-Augmented Generation agent using @agentbench/openai.
 *
 * This agent demonstrates the standard RAG architecture:
 *   1. User asks a question
 *   2. Agent invokes the `retrieve` tool to search the knowledge base
 *   3. Retrieved chunks are injected into the LLM context
 *   4. Agent synthesizes a grounded, cited answer
 *
 * Architecture:
 *   User Query  -->  retrieve (tool)  -->  Chunks  -->  LLM Synthesis  -->  Answer
 *
 * Key concepts demonstrated:
 *   - Tool-based retrieval instead of hardcoded retrieval
 *   - Grounding verification via chunk citation checking
 *   - Context window management with top-k limits
 *   - Latency-aware retrieval with timing instrumentation
 */

import { createOpenAIClient, runWithOpenAI } from '@agentbench/openai'
import { retrieve } from './retriever'
import type { ExecutionTrace } from '@agentbench/core'

// ---------------------------------------------------------------------------
// Tool handler
// ---------------------------------------------------------------------------

export async function executeTool(
  name: string,
  args: Record<string, unknown>,
): Promise<Record<string, unknown>> {
  switch (name) {
    case 'retrieve': {
      const query = String(args.query ?? '')
      const topK = Math.min(Number(args.topK ?? 5), 10)
      if (!query) return { chunks: [], totalMatches: 0, error: 'No query provided' }

      const result = await retrieve(query, topK)
      return {
        chunks: result.chunks.map((c) => ({
          chunkId: c.chunkId,
          title: c.title,
          content: c.content,
          page: c.page,
          score: Math.round(c.score * 100) / 100,
        })),
        totalMatches: result.totalMatches,
        retrievalTimeMs: result.retrievalTimeMs,
        query,
      }
    }

    default:
      return { error: `Unknown tool: ${name}` }
  }
}

// ---------------------------------------------------------------------------
// Agent runner
// ---------------------------------------------------------------------------

export interface RunRagAgentParams {
  query: string
  apiKey: string
  model?: string
  topK?: number
  maxSteps?: number
}

export interface RagAgentResult {
  output: string
  trace: ExecutionTrace
  retrievedChunks: number
  retrievalTimeMs: number
  cost: number
}

export async function runRagAgent(params: RunRagAgentParams): Promise<RagAgentResult> {
  const {
    query,
    apiKey,
    model = 'gpt-4o',
    topK = 5,
    maxSteps = 5,
  } = params

  const client = createOpenAIClient({
    apiKey,
    tracing: true,
    timeout: 30000,
  })

  const tools = [
    {
      type: 'function' as const,
      function: {
        name: 'retrieve',
        description:
          'Search the document knowledge base using semantic similarity. Returns the top-k most relevant document chunks with relevance scores. Use this before answering any question.',
        parameters: {
          type: 'object',
          properties: {
            query: { type: 'string', description: 'The search query' },
            topK: { type: 'number', description: 'Number of chunks to retrieve (1-10, default 5)' },
          },
          required: ['query'],
        },
      },
    },
  ]

  const result = await runWithOpenAI({
    client,
    agent: {
      provider: 'openai',
      model,
      temperature: 0.2,
      maxTokens: 2048,
      systemPrompt: `You are a research assistant with access to a document knowledge base.
Your job is to answer questions using ONLY the retrieved document chunks provided to you.

Rules:
- Always use the retrieve tool to search for relevant documents before answering
- Base your answer SOLELY on the retrieved document content — do not hallucinate
- If the retrieved documents do not contain the answer, say "I could not find that information in the knowledge base"
- Cite the document title and chunk number for every claim you make
- Keep answers concise and directly relevant to the question
- When multiple documents provide information, synthesize the findings`,
      tools: [
        { name: 'retrieve', description: 'Search document knowledge base', parameters: { query: 'string', topK: 'number' } },
      ],
    },
    messages: [
      {
        role: 'user',
        content: `Please answer this question using the retrieve tool to find relevant information in the knowledge base:\n\n${query}`,
      },
    ],
    tools,
    maxSteps,
  })

  // Extract retrieval metadata from trace
  let retrievedChunks = 0
  let retrievalTimeMs = 0
  if (result.trace?.steps) {
    for (const step of result.trace.steps) {
      if (step.toolName === 'retrieve' && step.output) {
        retrievedChunks += (step.output as any).totalMatches ?? 0
        retrievalTimeMs += (step.output as any).retrievalTimeMs ?? 0
      }
    }
  }

  return {
    output: result.output,
    trace: result.trace,
    retrievedChunks,
    retrievalTimeMs,
    cost: result.cost,
  }
}
