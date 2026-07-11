/**
 * LlamaIndex Agent — Query engine, chat engine, and tool integration.
 *
 * Architecture:
 *   User Query --> query_index / chat_with_index --> Index Results --> LLM Synthesis --> Response
 */

import { createOpenAIClient, runWithOpenAI } from '@agentbench/openai'
import { queryIndex, chatWithIndex, inspectIndex } from './index'
import type { ExecutionTrace } from '@agentbench/core'

export async function executeTool(
  name: string,
  args: Record<string, unknown>
): Promise<Record<string, unknown>> {
  switch (name) {
    case 'query_index': {
      const query = String(args.query ?? '')
      const topK = Number(args.top_k ?? 3)
      return queryIndex(query, topK) as unknown as Record<string, unknown>
    }
    case 'chat_with_index': {
      const message = String(args.message ?? '')
      const history = (args.history ?? []) as Array<{ role: string; content: string }>
      return chatWithIndex(message, history) as unknown as Record<string, unknown>
    }
    case 'use_index_tool': {
      const toolName = String(args.tool_name ?? '')
      return { toolUsed: toolName, result: `[Result from index tool: ${toolName}]` }
    }
    case 'inspect_index':
      return inspectIndex() as unknown as Record<string, unknown>
    default:
      return { error: `Unknown tool: ${name}` }
  }
}

export interface RunLlamaIndexParams {
  query: string
  apiKey: string
  model?: string
}
export interface LlamaIndexResult {
  output: string
  trace: ExecutionTrace
  cost: number
}

export async function runLlamaIndexAgent(params: RunLlamaIndexParams): Promise<LlamaIndexResult> {
  const { query, apiKey, model = 'gpt-4o' } = params
  const client = createOpenAIClient({ apiKey, tracing: true, timeout: 30000 })

  const tools = [
    {
      type: 'function' as const,
      function: {
        name: 'query_index',
        description: 'Query the document index',
        parameters: {
          type: 'object',
          properties: { query: { type: 'string' }, top_k: { type: 'number' } },
          required: ['query'],
        },
      },
    },
    {
      type: 'function' as const,
      function: {
        name: 'chat_with_index',
        description: 'Chat with indexed documents',
        parameters: {
          type: 'object',
          properties: {
            message: { type: 'string' },
            history: { type: 'array', items: { type: 'object' } },
          },
          required: ['message'],
        },
      },
    },
    {
      type: 'function' as const,
      function: {
        name: 'use_index_tool',
        description: 'Use a tool on the index',
        parameters: {
          type: 'object',
          properties: { tool_name: { type: 'string' }, params: { type: 'object' } },
          required: ['tool_name'],
        },
      },
    },
    {
      type: 'function' as const,
      function: {
        name: 'inspect_index',
        description: 'Get index metadata',
        parameters: { type: 'object', properties: {} },
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
      systemPrompt:
        'You are a LlamaIndex agent. Use query_index to search documents, chat_with_index for conversations with context, inspect_index for metadata, and use_index_tool for integrated tools. Always cite document sources.',
      tools: [
        {
          name: 'query_index',
          description: 'Query index',
          parameters: { query: 'string', top_k: 'number' },
        },
        {
          name: 'chat_with_index',
          description: 'Chat with index',
          parameters: { message: 'string', history: 'array' },
        },
        {
          name: 'use_index_tool',
          description: 'Use index tool',
          parameters: { tool_name: 'string', params: 'object' },
        },
        { name: 'inspect_index', description: 'Inspect index', parameters: {} },
      ],
    },
    messages: [{ role: 'user', content: query }],
    tools,
    maxSteps: 8,
  })

  return { output: result.output, trace: result.trace, cost: result.cost }
}
