/**
 * Multi-Agent Workflow Agent — Complex orchestration with AgentBench integration.
 *
 * Architecture:
 *   Topic --> Analyst --> Planner --> Executor --> Critic --> Coordinator --> Consensus --> Final Output
 */

import { createOpenAIClient, runWithOpenAI } from '@agentbench/openai'
import { runOrchestrator } from './orchestrator'
import type { ExecutionTrace } from '@agentbench/core'

export async function executeTool(
  name: string,
  args: Record<string, unknown>
): Promise<Record<string, unknown>> {
  switch (name) {
    case 'delegate': {
      const agent = String(args.agent ?? '')
      const task = String(args.task ?? '')
      switch (agent) {
        case 'analyst':
          return (await import('./agents/analyst')).runAnalyst(task) as unknown as Record<
            string,
            unknown
          >
        case 'planner':
          return (await import('./agents/planner')).runPlanner(task) as unknown as Record<
            string,
            unknown
          >
        case 'executor':
          return (await import('./agents/executor')).runExecutor(task) as unknown as Record<
            string,
            unknown
          >
        case 'critic':
          return (await import('./agents/critic')).runCritic(task) as unknown as Record<
            string,
            unknown
          >
        default:
          return { error: `Unknown agent: ${agent}` }
      }
    }
    case 'handoff': {
      const from = String(args.from ?? '')
      const to = String(args.to ?? '')
      return {
        handedOff: true,
        from,
        to,
        context: args.context ?? {},
        timestamp: new Date().toISOString(),
      }
    }
    case 'get_consensus': {
      const question = String(args.question ?? '')
      const agents = (args.agents ?? ['analyst', 'planner', 'executor']) as string[]
      return (await import('./agents/coordinator')).getConsensus(
        question,
        agents
      ) as unknown as Record<string, unknown>
    }
    case 'run_concurrent': {
      const tasks = (args.tasks ?? []) as Array<{ agent: string; task: string }>
      const results = await Promise.all(
        tasks.map(async (t) => {
          try {
            switch (t.agent) {
              case 'analyst':
                return await (await import('./agents/analyst')).runAnalyst(t.task)
              case 'executor':
                return await (await import('./agents/executor')).runExecutor(t.task)
              case 'critic':
                return await (await import('./agents/critic')).runCritic(t.task)
              default:
                return { error: `Unknown: ${t.agent}` }
            }
          } catch (e) {
            return { error: (e as Error).message }
          }
        })
      )
      return { results, completed: results.length, timestamp: new Date().toISOString() }
    }
    case 'handle_failure': {
      const agent = String(args.agent ?? '')
      const error = String(args.error ?? '')
      const recovery = String(args.recovery ?? 'retry')
      return {
        handled: true,
        agent,
        error,
        recovery,
        action:
          recovery === 'retry' ? 'Retrying task with backoff' : 'Falling back to alternative agent',
      }
    }
    default:
      return { error: `Unknown tool: ${name}` }
  }
}

export interface RunMultiAgentParams {
  topic: string
  apiKey: string
  model?: string
}
export interface MultiAgentResult {
  output: string
  trace: ExecutionTrace
  orchestration: OrchestratorResult
  cost: number
}

import type { OrchestratorResult } from './orchestrator'

export async function runMultiAgentWorkflow(
  params: RunMultiAgentParams
): Promise<MultiAgentResult> {
  const { topic, apiKey, model = 'gpt-4o' } = params
  const orchestration = await runOrchestrator(topic)

  const client = createOpenAIClient({ apiKey, tracing: true, timeout: 60000 })

  const tools = [
    {
      type: 'function' as const,
      function: {
        name: 'delegate',
        description: 'Delegate to agent',
        parameters: {
          type: 'object',
          properties: {
            agent: { type: 'string' },
            task: { type: 'string' },
            priority: { type: 'number' },
          },
          required: ['agent', 'task'],
        },
      },
    },
    {
      type: 'function' as const,
      function: {
        name: 'handoff',
        description: 'Hand off between agents',
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
    },
    {
      type: 'function' as const,
      function: {
        name: 'get_consensus',
        description: 'Get agent consensus',
        parameters: {
          type: 'object',
          properties: {
            question: { type: 'string' },
            agents: { type: 'array', items: { type: 'string' } },
          },
          required: ['question'],
        },
      },
    },
    {
      type: 'function' as const,
      function: {
        name: 'run_concurrent',
        description: 'Run concurrent tasks',
        parameters: {
          type: 'object',
          properties: { tasks: { type: 'array', items: { type: 'object' } } },
          required: ['tasks'],
        },
      },
    },
    {
      type: 'function' as const,
      function: {
        name: 'handle_failure',
        description: 'Handle agent failure',
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
    },
  ]

  const result = await runWithOpenAI({
    client,
    agent: {
      provider: 'openai',
      model,
      temperature: 0.2,
      maxTokens: 4096,
      systemPrompt: `You are a multi-agent workflow orchestrator. Delegate tasks to agents (analyst, planner, executor, critic, coordinator). Use handoff to transfer context, get_consensus for group decisions, run_concurrent for parallel work, and handle_failure for errors. Workflow: Analyze -> Plan -> Execute -> Review -> Consensus -> Synthesize.`,
      tools: [
        {
          name: 'delegate',
          description: 'Delegate task',
          parameters: { agent: 'string', task: 'string' },
        },
        {
          name: 'handoff',
          description: 'Handoff between agents',
          parameters: { from: 'string', to: 'string', context: 'object' },
        },
        {
          name: 'get_consensus',
          description: 'Get consensus',
          parameters: { question: 'string', agents: 'array' },
        },
        { name: 'run_concurrent', description: 'Run concurrently', parameters: { tasks: 'array' } },
        {
          name: 'handle_failure',
          description: 'Handle failure',
          parameters: { agent: 'string', error: 'string', recovery: 'string' },
        },
      ],
    },
    messages: [
      {
        role: 'user',
        content: `Coordinate a multi-agent workflow to analyze this topic: ${topic}. Delegate to all agents, get consensus, and synthesize the results.`,
      },
    ],
    tools,
    maxSteps: 15,
  })

  return { output: result.output, trace: result.trace, orchestration, cost: result.cost }
}
