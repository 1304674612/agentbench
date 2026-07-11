import type { AgentConfig, RunOptions } from '@agentbench/core'

/**
 * AgentBench configuration for the RAG (Retrieval-Augmented Generation) Agent example.
 *
 * This config defines a project that tests a RAG agent with an embedding-based
 * retriever, chunked document store, and grounding verification.
 */

export interface RagAgentProjectConfig {
  name: string
  description: string
  agent: AgentConfig
  options: Partial<RunOptions>
  testSuites: string[]
}

const config: RagAgentProjectConfig = {
  name: 'rag-agent',
  description:
    'RAG agent with embedding-based retrieval, document chunking, and grounding verification',

  agent: {
    provider: 'openai',
    model: 'gpt-4o',
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
      {
        name: 'retrieve',
        description:
          'Search the document knowledge base using semantic similarity. Returns the top-k most relevant document chunks with relevance scores.',
        parameters: {
          type: 'object',
          properties: {
            query: { type: 'string', description: 'The search query' },
            topK: { type: 'number', description: 'Number of chunks to retrieve (1-10)' },
          },
          required: ['query'],
        },
      },
    ],
  },

  options: {
    timeout: 30000,
    maxSteps: 5,
    retries: 1,
    concurrency: 2,
  },

  testSuites: [
    './tests/retrieval-quality.test.ts',
    './tests/grounding.test.ts',
    './tests/context-window.test.ts',
    './tests/latency-budget.test.ts',
  ],
}

export default config
