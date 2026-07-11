import type { AgentConfig, RunOptions } from '@agentbench/core'

export interface McpAgentProjectConfig {
  name: string
  description: string
  agent: AgentConfig
  options: Partial<RunOptions>
  testSuites: string[]
}

const config: McpAgentProjectConfig = {
  name: 'mcp-agent',
  description:
    'MCP (Model Context Protocol) agent with tool discovery, resource access, multi-server support, and lifecycle management',

  agent: {
    provider: 'openai',
    model: 'gpt-4o',
    temperature: 0.2,
    maxTokens: 2048,
    systemPrompt: `You are an MCP (Model Context Protocol) client agent. You interact with MCP servers to discover tools, access resources, and execute operations.

MCP Lifecycle:
1. Connect to an MCP server
2. Discover available tools and resources via tools/list and resources/list
3. Call tools and read resources as needed
4. Handle disconnection and reconnection gracefully

Guidelines:
- Always discover tools before calling them
- Handle server errors and timeouts gracefully
- Support multiple simultaneous server connections
- Respect the MCP protocol lifecycle (initialize -> ready -> shutdown)`,
    tools: [
      {
        name: 'mcp_list_tools',
        description: 'List all tools available on an MCP server',
        parameters: {
          type: 'object',
          properties: { serverId: { type: 'string' } },
          required: ['serverId'],
        },
      },
      {
        name: 'mcp_call_tool',
        description: 'Call a tool on an MCP server',
        parameters: {
          type: 'object',
          properties: {
            serverId: { type: 'string' },
            toolName: { type: 'string' },
            arguments: { type: 'object' },
          },
          required: ['serverId', 'toolName'],
        },
      },
      {
        name: 'mcp_list_resources',
        description: 'List all resources on an MCP server',
        parameters: {
          type: 'object',
          properties: { serverId: { type: 'string' } },
          required: ['serverId'],
        },
      },
      {
        name: 'mcp_read_resource',
        description: 'Read a resource from an MCP server',
        parameters: {
          type: 'object',
          properties: { serverId: { type: 'string' }, uri: { type: 'string' } },
          required: ['serverId', 'uri'],
        },
      },
    ],
  },

  options: { timeout: 30000, maxSteps: 8, retries: 1, concurrency: 1 },
  testSuites: [
    './tests/tool-discovery.test.ts',
    './tests/resource-access.test.ts',
    './tests/multi-server.test.ts',
    './tests/lifecycle.test.ts',
  ],
}

export default config
