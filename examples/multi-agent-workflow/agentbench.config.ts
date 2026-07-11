import type { AgentConfig, RunOptions } from '@agentbench/core'

export interface MultiAgentConfig {
  name: string
  description: string
  agent: AgentConfig
  options: Partial<RunOptions>
  testSuites: string[]
}

const config: MultiAgentConfig = {
  name: 'multi-agent-workflow',
  description:
    'Complex multi-agent orchestration with consensus, handoffs, concurrency, and failure recovery',

  agent: {
    provider: 'openai',
    model: 'gpt-4o',
    temperature: 0.2,
    maxTokens: 4096,
    systemPrompt: `You are an orchestrator managing a team of specialized agents:
- analyst: Analyzes data and identifies patterns
- planner: Creates execution plans and strategies
- executor: Carries out tasks according to plans
- critic: Reviews outputs and provides critical feedback
- coordinator: Manages handoffs and consensus among agents

Workflow: Analyze -> Plan -> Execute -> Review -> Consensus -> Final Output`,
    tools: [
      {
        name: 'delegate',
        description: 'Delegate a task to a specific agent',
        parameters: {
          type: 'object',
          properties: {
            agent: {
              type: 'string',
              enum: ['analyst', 'planner', 'executor', 'critic', 'coordinator'],
            },
            task: { type: 'string' },
            priority: { type: 'number' },
          },
          required: ['agent', 'task'],
        },
      },
      {
        name: 'handoff',
        description: 'Hand off work between agents',
        parameters: {
          type: 'object',
          properties: {
            from: { type: 'string' },
            to: { type: 'string' },
            context: { type: 'object' },
          },
          required: ['from', 'to'],
        },
      },
      {
        name: 'get_consensus',
        description: 'Get consensus from multiple agents',
        parameters: {
          type: 'object',
          properties: {
            question: { type: 'string' },
            agents: { type: 'array', items: { type: 'string' } },
          },
          required: ['question'],
        },
      },
      {
        name: 'run_concurrent',
        description: 'Run tasks concurrently across agents',
        parameters: {
          type: 'object',
          properties: {
            tasks: {
              type: 'array',
              items: {
                type: 'object',
                properties: { agent: { type: 'string' }, task: { type: 'string' } },
              },
            },
          },
          required: ['tasks'],
        },
      },
      {
        name: 'handle_failure',
        description: 'Handle agent failure and recover',
        parameters: {
          type: 'object',
          properties: {
            agent: { type: 'string' },
            error: { type: 'string' },
            recovery: { type: 'string' },
          },
          required: ['agent', 'error'],
        },
      },
    ],
  },

  options: { timeout: 60000, maxSteps: 15, retries: 2, concurrency: 3 },
  testSuites: [
    './tests/orchestration.test.ts',
    './tests/handoff.test.ts',
    './tests/consensus.test.ts',
    './tests/concurrency.test.ts',
    './tests/failure-recovery.test.ts',
  ],
}

export default config
