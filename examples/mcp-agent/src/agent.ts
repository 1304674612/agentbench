/**
 * MCP Agent — Model Context Protocol client agent.
 *
 * Architecture:
 *   User Request --> Tool Discovery --> Tool Call --> Resource Access --> Response
 *
 * Key concepts:
 *   - MCP lifecycle (initialize -> ready -> operate -> shutdown)
 *   - Multi-server tool and resource discovery
 *   - Protocol-compliant tool invocation
 */

import { createOpenAIClient, runWithOpenAI } from '@agentbench/openai'
import type { ExecutionTrace } from '@agentbench/core'
import { listTools, callTool, listResources, readResource } from './mcp-server'

export async function executeTool(name: string, args: Record<string, unknown>): Promise<Record<string, unknown>> {
  switch (name) {
    case 'mcp_list_tools': {
      try {
        const result = await listTools(String(args.serverId ?? ''))
        return result as unknown as Record<string, unknown>
      } catch (e) { return { error: (e as Error).message } }
    }
    case 'mcp_call_tool': {
      try {
        const result = await callTool(String(args.serverId ?? ''), String(args.toolName ?? ''), (args.arguments ?? {}) as Record<string, unknown>)
        return result as unknown as Record<string, unknown>
      } catch (e) { return { error: (e as Error).message } }
    }
    case 'mcp_list_resources': {
      try {
        const result = await listResources(String(args.serverId ?? ''))
        return result as unknown as Record<string, unknown>
      } catch (e) { return { error: (e as Error).message } }
    }
    case 'mcp_read_resource': {
      try {
        const result = await readResource(String(args.serverId ?? ''), String(args.uri ?? ''))
        return result as unknown as Record<string, unknown>
      } catch (e) { return { error: (e as Error).message } }
    }
    default: return { error: `Unknown tool: ${name}` }
  }
}

export interface RunMcpAgentParams {
  request: string
  apiKey: string
  model?: string
}

export interface McpAgentResult {
  output: string
  trace: ExecutionTrace
  cost: number
}

export async function runMcpAgent(params: RunMcpAgentParams): Promise<McpAgentResult> {
  const { request, apiKey, model = 'gpt-4o' } = params
  const client = createOpenAIClient({ apiKey, tracing: true, timeout: 30000 })

  const tools = [
    { type: 'function' as const, function: { name: 'mcp_list_tools', description: 'List tools on an MCP server', parameters: { type: 'object', properties: { serverId: { type: 'string' } }, required: ['serverId'] } } },
    { type: 'function' as const, function: { name: 'mcp_call_tool', description: 'Call a tool on an MCP server', parameters: { type: 'object', properties: { serverId: { type: 'string' }, toolName: { type: 'string' }, arguments: { type: 'object' } }, required: ['serverId', 'toolName'] } } },
    { type: 'function' as const, function: { name: 'mcp_list_resources', description: 'List resources on an MCP server', parameters: { type: 'object', properties: { serverId: { type: 'string' } }, required: ['serverId'] } } },
    { type: 'function' as const, function: { name: 'mcp_read_resource', description: 'Read a resource from an MCP server', parameters: { type: 'object', properties: { serverId: { type: 'string' }, uri: { type: 'string' } }, required: ['serverId', 'uri'] } } },
  ]

  const result = await runWithOpenAI({
    client,
    agent: {
      provider: 'openai', model, temperature: 0.2, maxTokens: 2048,
      systemPrompt: 'You are an MCP client agent. Use mcp_list_tools to discover tools on servers (filesystem, database, weather), then call them. Use mcp_list_resources and mcp_read_resource to access resources. Available server IDs: filesystem, database, weather.',
      tools: [
        { name: 'mcp_list_tools', description: 'List tools', parameters: { serverId: 'string' } },
        { name: 'mcp_call_tool', description: 'Call tool', parameters: { serverId: 'string', toolName: 'string', arguments: 'object' } },
        { name: 'mcp_list_resources', description: 'List resources', parameters: { serverId: 'string' } },
        { name: 'mcp_read_resource', description: 'Read resource', parameters: { serverId: 'string', uri: 'string' } },
      ],
    },
    messages: [{ role: 'user', content: request }],
    tools,
    maxSteps: 8,
  })

  return { output: result.output, trace: result.trace, cost: result.cost }
}
