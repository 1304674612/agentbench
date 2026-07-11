import type { AgentConfig, RunOptions } from '@agentbench/core'

export interface LlamaIndexConfig {
  name: string
  description: string
  agent: AgentConfig
  options: Partial<RunOptions>
  testSuites: string[]
}

const config: LlamaIndexConfig = {
  name: 'llamaindex-agent',
  description:
    'LlamaIndex agent with query engine, chat engine, tool integration, and index quality evaluation',

  agent: {
    provider: 'openai',
    model: 'gpt-4o',
    temperature: 0.2,
    maxTokens: 2048,
    systemPrompt: `You are a LlamaIndex agent with access to indexed documents. You can query the index, chat with context, and use tools integrated with the index.

Capabilities:
- Query Engine: Execute structured queries against the document index
- Chat Engine: Maintain conversational context with indexed documents
- Tool Integration: Use external tools in combination with indexed data
- Index Management: Inspect index quality, size, and structure`,
    tools: [
      {
        name: 'query_index',
        description: 'Query the document index with a natural language question',
        parameters: {
          type: 'object',
          properties: { query: { type: 'string' }, top_k: { type: 'number' } },
          required: ['query'],
        },
      },
      {
        name: 'chat_with_index',
        description: 'Chat conversationally with indexed documents',
        parameters: {
          type: 'object',
          properties: {
            message: { type: 'string' },
            history: { type: 'array', items: { type: 'object' } },
          },
          required: ['message'],
        },
      },
      {
        name: 'use_index_tool',
        description: 'Use a tool that accesses the index',
        parameters: {
          type: 'object',
          properties: { tool_name: { type: 'string' }, params: { type: 'object' } },
          required: ['tool_name'],
        },
      },
      {
        name: 'inspect_index',
        description: 'Get index metadata and quality metrics',
        parameters: { type: 'object', properties: {} },
      },
    ],
  },

  options: { timeout: 30000, maxSteps: 8, retries: 1, concurrency: 1 },
  testSuites: [
    './tests/query-engine.test.ts',
    './tests/chat-engine.test.ts',
    './tests/tool-integration.test.ts',
    './tests/index-quality.test.ts',
  ],
}

export default config
