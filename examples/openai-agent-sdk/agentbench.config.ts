import type { AgentConfig, RunOptions } from '@agentbench/core'

export interface OpenAIAgentSdkConfig {
  name: string
  description: string
  agent: AgentConfig
  options: Partial<RunOptions>
  testSuites: string[]
}

const config: OpenAIAgentSdkConfig = {
  name: 'openai-agent-sdk',
  description: 'OpenAI Agents SDK agent with guardrails, handoffs, tool use, and tracing',

  agent: {
    provider: 'openai',
    model: 'gpt-4o',
    temperature: 0.2,
    maxTokens: 2048,
    systemPrompt: `You are an agent built with the OpenAI Agents SDK. You have guardrails that validate inputs and outputs, the ability to hand off to specialized sub-agents, and comprehensive tracing.

Capabilities:
- Guardrails: Validate user input before processing and vet output before returning
- Handoffs: Delegate to specialist agents (math-agent, writer-agent, coder-agent)
- Tool use: Access external tools for calculations, searches, and data retrieval
- Tracing: Every step is traced for observability and debugging`,
    tools: [
      {
        name: 'check_guardrail',
        description: 'Run input/output guardrail validation',
        parameters: {
          type: 'object',
          properties: {
            content: { type: 'string' },
            stage: { type: 'string', enum: ['input', 'output'] },
          },
          required: ['content', 'stage'],
        },
      },
      {
        name: 'handoff',
        description: 'Hand off to a specialist agent',
        parameters: {
          type: 'object',
          properties: {
            agent: { type: 'string', enum: ['math-agent', 'writer-agent', 'coder-agent'] },
            task: { type: 'string' },
          },
          required: ['agent', 'task'],
        },
      },
      {
        name: 'use_tool',
        description: 'Use an available tool',
        parameters: {
          type: 'object',
          properties: { toolName: { type: 'string' }, params: { type: 'object' } },
          required: ['toolName'],
        },
      },
      {
        name: 'get_trace',
        description: 'Retrieve execution trace',
        parameters: { type: 'object', properties: {} },
      },
    ],
  },

  options: { timeout: 30000, maxSteps: 8, retries: 1, concurrency: 1 },
  testSuites: [
    './tests/guardrail.test.ts',
    './tests/handoff.test.ts',
    './tests/tool-use.test.ts',
    './tests/tracing.test.ts',
  ],
}

export default config
