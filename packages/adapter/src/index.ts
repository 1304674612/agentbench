/**
 * @agentbench/adapter
 *
 * Generic adapter for wrapping any agent framework.
 * Provides base classes and utilities for:
 * - LangGraph agents
 * - CrewAI agents
 * - LlamaIndex agents
 * - Custom agent implementations
 *
 * @example
 * ```typescript
 * import { GenericAgentAdapter, createAdapter } from '@agentbench/adapter'
 * import { Runner } from '@agentbench/core'
 *
 * const adapter = createAdapter({
 *   name: 'my-custom-agent',
 *   provider: 'custom',
 *   run: async (input) => {
 *     // Your agent logic here
 *     return { output: 'result', toolCalls: [] }
 *   },
 * })
 *
 * const runner = new Runner({ agent: adapter.toAgentConfig() })
 * ```
 */

import type { AgentConfig, RunResult, TraceStep, ToolConfig } from '@agentbench/core'
import { LangGraphAdapter } from '@agentbench/langgraph'

// ============================================================
// Types
// ============================================================

export type AgentProvider = 'openai' | 'anthropic' | 'gemini' | 'deepseek' | 'langgraph' | 'crewai' | 'llamaindex' | 'custom'

export interface AdapterConfig {
  name: string
  version?: string
  provider: AgentProvider
  description?: string
  /** The run function — called by the Runner */
  run: (input: AdapterRunInput) => Promise<AdapterRunOutput>
  /** Optional setup/teardown hooks */
  hooks?: {
    onStart?: (config: AgentConfig) => Promise<void> | void
    onStep?: (step: TraceStep) => Promise<void> | void
    onEnd?: (result: RunResult) => Promise<void> | void
    onError?: (error: Error) => Promise<void> | void
  }
  /** Tools available to the agent */
  tools?: ToolConfig[]
}

export interface AdapterRunInput {
  messages: Array<{ role: 'user' | 'assistant'; content: string }>
  systemPrompt: string
  variables?: Record<string, string>
  context?: Record<string, unknown>
  tools?: ToolConfig[]
}

export interface AdapterRunOutput {
  output: string
  toolCalls: Array<{
    name: string
    arguments: Record<string, unknown>
    result?: unknown
    error?: string
  }>
  metrics?: {
    totalTokens?: number
    totalCost?: number
    totalLatency?: number
    stepCount?: number
    llmCallCount?: number
    toolCallCount?: number
  }
  trace?: TraceStep[]
}

// ============================================================
// Generic Agent Adapter
// ============================================================

export class GenericAgentAdapter {
  public config: AdapterConfig

  constructor(config: AdapterConfig) {
    this.config = config
  }

  /**
   * Run the agent with the given input.
   */
  async run(input: AdapterRunInput): Promise<AdapterRunOutput> {
    const startTime = Date.now()
    await this.config.hooks?.onStart?.(this.toAgentConfig())

    try {
      const output = await this.config.run(input)

      const totalTokens = output.metrics?.totalTokens ?? 0
      const totalCost = output.metrics?.totalCost ?? 0
      const stepCount = output.metrics?.stepCount ?? (output.trace?.length ?? 0)

      const result: AdapterRunOutput = {
        ...output,
        metrics: {
          totalTokens,
          totalCost,
          totalLatency: Date.now() - startTime,
          stepCount,
          llmCallCount: output.metrics?.llmCallCount ?? 0,
          toolCallCount: output.toolCalls.length,
        },
      }

      return result
    } catch (err) {
      await this.config.hooks?.onError?.(err instanceof Error ? err : new Error(String(err)))
      throw err
    }
  }

  /**
   * Convert to AgentConfig for use with @agentbench/core Runner.
   */
  toAgentConfig(): AgentConfig {
    return {
      provider: this.config.provider === 'custom' ? 'openai' : this.config.provider as AgentConfig['provider'],
      model: this.config.name,
      temperature: 0.7,
      maxTokens: 4096,
      systemPrompt: '',
      tools: this.config.tools,
    }
  }
}

// ============================================================
// Factory Functions
// ============================================================

/**
 * Create a generic adapter from a simple run function.
 */
export function createAdapter(config: AdapterConfig): GenericAgentAdapter {
  return new GenericAgentAdapter(config)
}

/**
 * Create a LangGraph adapter.
 *
 * Delegates to @agentbench/langgraph for real execution.
 * Wraps the LangGraph compiled graph and produces trace-compatible output.
 *
 * @example
 * ```typescript
 * import { createLangGraphAdapter } from '@agentbench/adapter'
 * import { Runner } from '@agentbench/core'
 *
 * const adapter = createLangGraphAdapter({
 *   name: 'my-agent',
 *   graph: compiledGraph,
 * })
 *
 * const runner = new Runner({ agent: adapter.toAgentConfig() })
 * const result = await runner.run({
 *   messages: [{ role: 'user', content: 'Hello!' }],
 *   systemPrompt: 'You are a helpful assistant.',
 * })
 * ```
 */
export function createLangGraphAdapter(options: {
  name: string
  graph: unknown // LangGraph compiled graph (duck-typed)
  apiKey?: string
  maxSteps?: number
  timeout?: number
}): GenericAgentAdapter {
  const langGraphAdapter = new LangGraphAdapter({
    name: options.name,
    graph: options.graph,
    apiKey: options.apiKey,
    maxSteps: options.maxSteps,
    timeout: options.timeout,
  })

  return new GenericAgentAdapter({
    name: options.name,
    provider: 'langgraph',
    description: `LangGraph adapter for ${options.name}`,
    run: async (input) => {
      const result = await langGraphAdapter.run({
        messages: input.messages,
        systemPrompt: input.systemPrompt,
        variables: input.variables,
      })

      return {
        output: result.output,
        toolCalls: result.toolCalls,
        metrics: result.metrics,
        trace: result.traceSteps,
      }
    },
  })
}

/**
 * Create a CrewAI adapter.
 *
 * CrewAI is a Python-native framework. To evaluate CrewAI agents with AgentBench:
 *
 * 1. Use the @agentbench Python SDK to run CrewAI agents natively:
 *    ```bash
 *    pip install agentbench crewai
 *    ```
 *
 * 2. Or wrap your CrewAI agent behind an HTTP API and use createAdapter():
 *    ```typescript
 *    const adapter = createAdapter({
 *      name: 'my-crew',
 *      provider: 'custom',
 *      run: async (input) => {
 *        const res = await fetch('http://localhost:8000/run', {
 *          method: 'POST',
 *          body: JSON.stringify(input),
 *        })
 *        return res.json()
 *      },
 *    })
 *    ```
 *
 * @see https://docs.agentbench.dev/integrations/crewai
 */
export function createCrewAIAdapter(options: {
  name: string
  crew: unknown // CrewAI crew configuration
}): GenericAgentAdapter {
  return new GenericAgentAdapter({
    name: options.name,
    provider: 'crewai',
    description: `CrewAI adapter for ${options.name}`,
    run: async () => {
      throw new Error(
        'CrewAI is a Python-native framework. ' +
        'Use the @agentbench Python SDK (pip install agentbench crewai) to evaluate CrewAI agents, ' +
        'or wrap your CrewAI agent behind an HTTP API and use createAdapter() with fetch calls. ' +
        'See https://docs.agentbench.dev/integrations/crewai for details.'
      )
    },
  })
}

/**
 * Create a LlamaIndex adapter.
 *
 * LlamaIndex is a Python-native framework. To evaluate LlamaIndex agents with AgentBench:
 *
 * 1. Use the @agentbench Python SDK to run LlamaIndex agents natively:
 *    ```bash
 *    pip install agentbench llama-index
 *    ```
 *
 * 2. Or wrap your LlamaIndex agent behind an HTTP API and use createAdapter():
 *    ```typescript
 *    const adapter = createAdapter({
 *      name: 'my-llamaindex',
 *      provider: 'custom',
 *      run: async (input) => {
 *        const res = await fetch('http://localhost:8000/run', {
 *          method: 'POST',
 *          body: JSON.stringify(input),
 *        })
 *        return res.json()
 *      },
 *    })
 *    ```
 *
 * @see https://docs.agentbench.dev/integrations/llamaindex
 */
export function createLlamaIndexAdapter(options: {
  name: string
  agent: unknown // LlamaIndex agent
}): GenericAgentAdapter {
  return new GenericAgentAdapter({
    name: options.name,
    provider: 'llamaindex',
    description: `LlamaIndex adapter for ${options.name}`,
    run: async () => {
      throw new Error(
        'LlamaIndex is a Python-native framework. ' +
        'Use the @agentbench Python SDK (pip install agentbench llama-index) to evaluate LlamaIndex agents, ' +
        'or wrap your LlamaIndex agent behind an HTTP API and use createAdapter() with fetch calls. ' +
        'See https://docs.agentbench.dev/integrations/llamaindex for details.'
      )
    },
  })
}

// ============================================================
// Registry
// ============================================================

/**
 * Registry of agent adapters for discovery.
 */
export const adapterRegistry = new Map<string, GenericAgentAdapter>()

export function registerAdapter(adapter: GenericAgentAdapter): void {
  adapterRegistry.set(adapter.config.name, adapter)
}

export function getAdapter(name: string): GenericAgentAdapter | undefined {
  return adapterRegistry.get(name)
}

export function listAdapters(): Array<{ name: string; provider: AgentProvider; description?: string }> {
  return Array.from(adapterRegistry.values()).map((a) => ({
    name: a.config.name,
    provider: a.config.provider,
    description: a.config.description,
  }))
}
