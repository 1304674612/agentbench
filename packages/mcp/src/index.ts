/**
 * @agentbench/mcp
 *
 * MCP (Model Context Protocol) client wrapper with automatic tracing.
 * Intercepts tool invocations and resource access for full observability.
 */

import type { TraceStep } from '@agentbench/core'

export interface AgentBenchMCPConfig {
  /** MCP server endpoint */
  serverUrl: string
  /** Authentication token */
  authToken?: string
  /** Enable automatic tracing */
  tracing?: boolean
  /** Timeout for MCP operations (ms) */
  timeout?: number
}

export interface MCPInterceptContext {
  runId?: string
  onStep?: (step: TraceStep) => void
}

export interface MCPToolDefinition {
  name: string
  description: string
  inputSchema: Record<string, unknown>
}

export interface MCPToolCallResult {
  toolName: string
  arguments: Record<string, unknown>
  result: unknown
  error?: string
  duration: number
  trace: TraceStep
}

export class AgentBenchMCP {
  public config: AgentBenchMCPConfig
  private _context: MCPInterceptContext = {}
  private _tools: MCPToolDefinition[] = []
  private _connected = false

  constructor(config: AgentBenchMCPConfig) {
    this.config = { tracing: true, timeout: 30000, ...config }
  }

  setContext(ctx: MCPInterceptContext): void {
    this._context = ctx
  }

  /**
   * Connect to the MCP server and initialize.
   */
  async connect(): Promise<{ connected: boolean; tools: MCPToolDefinition[] }> {
    const startTime = Date.now()
    try {
      const response = await this._sendMCPRequest('initialize', {
        protocolVersion: '2024-11-05',
        capabilities: { tools: {} },
        clientInfo: { name: 'agentbench-mcp', version: '0.1.0' },
      })

      this._connected = true
      this._tools = (response.tools ?? []) as MCPToolDefinition[]

      // MCP connection is infrastructure, not an LLM call — skip trace or log as system step
      // The actual tool calls will be traced individually

      return { connected: true, tools: this._tools }
    } catch (err) {
      if (this._context.onStep) {
        this._context.onStep({
          id: `step-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          sequence: 0,
          type: 'error',
          startedAt: new Date(startTime),
          endedAt: new Date(),
          duration: Date.now() - startTime,
          status: 'error',
          error: {
            message: err instanceof Error ? err.message : String(err),
            type: 'api_error',
            retryable: true,
          },
        } as TraceStep)
      }
      throw err
    }
  }

  /**
   * List available tools from the MCP server.
   */
  async listTools(): Promise<MCPToolDefinition[]> {
    if (!this._connected) await this.connect()
    const response = await this._sendMCPRequest('tools/list', {})
    this._tools = (response.tools ?? []) as MCPToolDefinition[]
    return this._tools
  }

  /**
   * Call a tool on the MCP server with tracing.
   */
  async callTool(params: {
    name: string
    arguments: Record<string, unknown>
  }): Promise<MCPToolCallResult> {
    const startTime = Date.now()
    const stepId = `step-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`

    try {
      const response = await this._sendMCPRequest('tools/call', {
        name: params.name,
        arguments: params.arguments,
      })

      const duration = Date.now() - startTime
      const result = response.content ?? response.result
      const hasError = response.isError === true

      const traceStep: TraceStep = {
        id: stepId,
        sequence: 0,
        type: 'tool_call',
        startedAt: new Date(startTime),
        endedAt: new Date(),
        duration,
        toolName: params.name,
        toolRequest: { name: params.name, arguments: params.arguments },
        toolResponse: { result, error: hasError ? String(result) : undefined },
        status: hasError ? 'error' : 'success',
      } as TraceStep

      this._context.onStep?.(traceStep)

      return {
        toolName: params.name,
        arguments: params.arguments,
        result,
        error: hasError ? String(result) : undefined,
        duration,
        trace: traceStep,
      }
    } catch (err) {
      const duration = Date.now() - startTime
      const errorTrace: TraceStep = {
        id: stepId,
        sequence: 0,
        type: 'error',
        startedAt: new Date(startTime),
        endedAt: new Date(),
        duration,
        status: 'error',
        error: {
          message: err instanceof Error ? err.message : String(err),
          type: 'api_error',
          retryable: true,
        },
      } as TraceStep

      this._context.onStep?.(errorTrace)

      return {
        toolName: params.name,
        arguments: params.arguments,
        result: null,
        error: err instanceof Error ? err.message : String(err),
        duration,
        trace: errorTrace,
      }
    }
  }

  /**
   * Access an MCP resource with tracing.
   */
  async readResource(
    uri: string
  ): Promise<{ contents: unknown[]; duration: number; trace: TraceStep }> {
    const startTime = Date.now()
    try {
      const response = await this._sendMCPRequest('resources/read', { uri })
      const duration = Date.now() - startTime

      const traceStep: TraceStep = {
        id: `step-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        sequence: 0,
        type: 'tool_call',
        startedAt: new Date(startTime),
        endedAt: new Date(),
        duration,
        toolName: 'resources/read',
        toolRequest: { name: 'resources/read', arguments: { uri } },
        toolResponse: { result: response.contents },
        status: 'success',
      } as TraceStep

      this._context.onStep?.(traceStep)
      return { contents: response.contents as unknown[], duration, trace: traceStep }
    } catch (err) {
      this._emitError(startTime, err)
      throw err
    }
  }

  private _emitError(startTime: number, err: unknown): void {
    if (this._context.onStep) {
      this._context.onStep({
        id: `step-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        sequence: 0,
        type: 'error',
        startedAt: new Date(startTime),
        endedAt: new Date(),
        duration: Date.now() - startTime,
        status: 'error',
        error: {
          message: err instanceof Error ? err.message : String(err),
          type: 'api_error',
          retryable: true,
        },
      } as TraceStep)
    }
  }

  disconnect(): void {
    this._connected = false
    this._tools = []
  }

  private async _sendMCPRequest(
    method: string,
    params: Record<string, unknown>
  ): Promise<Record<string, unknown>> {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), this.config.timeout)
    try {
      const res = await fetch(this.config.serverUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(this.config.authToken ? { Authorization: `Bearer ${this.config.authToken}` } : {}),
        },
        body: JSON.stringify({ jsonrpc: '2.0', id: Date.now(), method, params }),
        signal: controller.signal,
      })
      if (!res.ok) throw new Error(`MCP error ${res.status}: ${res.statusText}`)
      const data = (await res.json()) as {
        result?: Record<string, unknown>
        error?: { message: string }
      }
      if (data.error) throw new Error(`MCP method error: ${data.error.message}`)
      return data.result ?? {}
    } finally {
      clearTimeout(timeoutId)
    }
  }
}

// ============================================================
// Type alias — Provider S suffix convention
// ============================================================

export { AgentBenchMCP as MCPProvider }

// ============================================================
// Factory function
// ============================================================

export function createMCPProvider(config: AgentBenchMCPConfig): AgentBenchMCP {
  return new AgentBenchMCP(config)
}

/** @deprecated Use {@link createMCPProvider} instead */
export const createMCPClient = createMCPProvider
