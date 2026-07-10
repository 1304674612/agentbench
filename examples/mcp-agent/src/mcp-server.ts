/**
 * MCP Server — Mock MCP server implementations.
 *
 * Implements the Model Context Protocol server-side logic:
 *   - Tool listing and invocation
 *   - Resource listing and reading
 *   - Server lifecycle (initialize, ready, shutdown)
 */

export interface McpTool {
  name: string
  description: string
  inputSchema: Record<string, unknown>
}

export interface McpResource {
  uri: string
  name: string
  description: string
  mimeType: string
}

export interface McpServer {
  serverId: string
  name: string
  version: string
  status: 'disconnected' | 'initializing' | 'ready' | 'error'
  tools: McpTool[]
  resources: McpResource[]
}

// Server registry
const servers = new Map<string, McpServer>()

// Pre-registered servers
const PREDEFINED_SERVERS: McpServer[] = [
  {
    serverId: 'filesystem',
    name: 'FileSystem MCP Server',
    version: '1.0.0',
    status: 'ready',
    tools: [
      { name: 'read_file', description: 'Read a file from the filesystem', inputSchema: { type: 'object', properties: { path: { type: 'string' } }, required: ['path'] } },
      { name: 'write_file', description: 'Write a file to the filesystem', inputSchema: { type: 'object', properties: { path: { type: 'string' }, content: { type: 'string' } }, required: ['path', 'content'] } },
      { name: 'list_directory', description: 'List contents of a directory', inputSchema: { type: 'object', properties: { path: { type: 'string' } }, required: ['path'] } },
    ],
    resources: [
      { uri: 'file:///workspace/readme.md', name: 'README', description: 'Project readme', mimeType: 'text/markdown' },
      { uri: 'file:///workspace/config.json', name: 'Config', description: 'Project configuration', mimeType: 'application/json' },
    ],
  },
  {
    serverId: 'database',
    name: 'Database MCP Server',
    version: '2.1.0',
    status: 'ready',
    tools: [
      { name: 'query', description: 'Execute a SQL query', inputSchema: { type: 'object', properties: { sql: { type: 'string' } }, required: ['sql'] } },
      { name: 'list_tables', description: 'List all database tables', inputSchema: { type: 'object', properties: {} } },
    ],
    resources: [
      { uri: 'db://schema/users', name: 'Users Schema', description: 'Users table schema', mimeType: 'application/json' },
      { uri: 'db://schema/products', name: 'Products Schema', description: 'Products table schema', mimeType: 'application/json' },
    ],
  },
  {
    serverId: 'weather',
    name: 'Weather MCP Server',
    version: '1.2.0',
    status: 'ready',
    tools: [
      { name: 'get_forecast', description: 'Get weather forecast', inputSchema: { type: 'object', properties: { city: { type: 'string' }, days: { type: 'number' } }, required: ['city'] } },
    ],
    resources: [
      { uri: 'weather://alerts', name: 'Weather Alerts', description: 'Active weather alerts', mimeType: 'application/json' },
    ],
  },
]

// Initialize servers
PREDEFINED_SERVERS.forEach((s) => servers.set(s.serverId, { ...s }))

export async function listTools(serverId: string): Promise<{ serverId: string; tools: McpTool[] }> {
  const server = servers.get(serverId)
  if (!server) throw new Error(`MCP server not found: ${serverId}`)
  if (server.status !== 'ready') throw new Error(`Server ${serverId} is not ready (status: ${server.status})`)
  return { serverId, tools: server.tools }
}

export async function callTool(serverId: string, toolName: string, args: Record<string, unknown>): Promise<{ serverId: string; toolName: string; result: unknown }> {
  const server = servers.get(serverId)
  if (!server) throw new Error(`MCP server not found: ${serverId}`)
  const tool = server.tools.find((t) => t.name === toolName)
  if (!tool) throw new Error(`Tool not found on server ${serverId}: ${toolName}`)
  return { serverId, toolName, result: { executed: true, tool: toolName, args } }
}

export async function listResources(serverId: string): Promise<{ serverId: string; resources: McpResource[] }> {
  const server = servers.get(serverId)
  if (!server) throw new Error(`MCP server not found: ${serverId}`)
  return { serverId, resources: server.resources }
}

export async function readResource(serverId: string, uri: string): Promise<{ serverId: string; uri: string; content: string }> {
  const server = servers.get(serverId)
  if (!server) throw new Error(`MCP server not found: ${serverId}`)
  const resource = server.resources.find((r) => r.uri === uri)
  if (!resource) throw new Error(`Resource not found: ${uri}`)
  return { serverId, uri, content: `[Content of ${uri} on ${serverId}]` }
}

export async function initializeServer(serverId: string): Promise<{ serverId: string; status: string }> {
  const server = servers.get(serverId)
  if (!server) throw new Error(`MCP server not found: ${serverId}`)
  server.status = 'ready'
  return { serverId, status: server.status }
}

export async function shutdownServer(serverId: string): Promise<{ serverId: string; status: string }> {
  const server = servers.get(serverId)
  if (!server) throw new Error(`MCP server not found: ${serverId}`)
  server.status = 'disconnected'
  return { serverId, status: server.status }
}

export function getServerIds(): string[] {
  return [...servers.keys()]
}
