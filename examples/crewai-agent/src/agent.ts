/**
 * CrewAI Agent — Multi-agent orchestration with AgentBench integration.
 *
 * Architecture:
 *   Topic --> Researcher --> Writer --> Reviewer --> Final Output
 */

import { createOpenAIClient, runWithOpenAI } from '@agentbench/openai'
import { runCrew } from './crew'
import type { ExecutionTrace } from '@agentbench/core'

export async function executeTool(
  name: string,
  args: Record<string, unknown>
): Promise<Record<string, unknown>> {
  switch (name) {
    case 'assign_task': {
      const agent = String(args.agent ?? '')
      const task = String(args.task ?? '')
      const context = args.context ? String(args.context) : undefined
      if (agent === 'researcher')
        return (await import('./agents')).runResearcher(task, context) as unknown as Record<
          string,
          unknown
        >
      if (agent === 'writer')
        return (await import('./agents')).runWriter(task, context) as unknown as Record<
          string,
          unknown
        >
      if (agent === 'reviewer')
        return (await import('./agents')).runReviewer(task) as unknown as Record<string, unknown>
      return { error: `Unknown agent: ${agent}` }
    }
    case 'get_result': {
      const agentResults = (await import('./agents')).getAgentResults(String(args.agent ?? ''))
      return { results: agentResults, count: agentResults.length }
    }
    case 'review_output': {
      const output = String(args.output ?? '')
      return (await import('./agents')).runReviewer(output) as unknown as Record<string, unknown>
    }
    case 'finalize':
      return {
        finalized: true,
        summary: String(args.summary ?? ''),
        timestamp: new Date().toISOString(),
      }
    default:
      return { error: `Unknown tool: ${name}` }
  }
}

export interface RunCrewAiParams {
  topic: string
  apiKey: string
  model?: string
}
export interface CrewAiAgentResult {
  output: string
  trace: ExecutionTrace
  crewResult: { success: boolean; totalTime: number }
  cost: number
}

export async function runCrewAiAgent(params: RunCrewAiParams): Promise<CrewAiAgentResult> {
  const { topic, apiKey, model = 'gpt-4o' } = params
  const crewResult = await runCrew(topic)

  const client = createOpenAIClient({ apiKey, tracing: true, timeout: 45000 })
  const tools = [
    {
      type: 'function' as const,
      function: {
        name: 'assign_task',
        description: 'Assign task to agent',
        parameters: {
          type: 'object',
          properties: {
            agent: { type: 'string' },
            task: { type: 'string' },
            context: { type: 'string' },
          },
          required: ['agent', 'task'],
        },
      },
    },
    {
      type: 'function' as const,
      function: {
        name: 'get_result',
        description: 'Get agent results',
        parameters: {
          type: 'object',
          properties: { agent: { type: 'string' } },
          required: ['agent'],
        },
      },
    },
    {
      type: 'function' as const,
      function: {
        name: 'review_output',
        description: 'Review output quality',
        parameters: {
          type: 'object',
          properties: {
            output: { type: 'string' },
            criteria: { type: 'array', items: { type: 'string' } },
          },
          required: ['output'],
        },
      },
    },
    {
      type: 'function' as const,
      function: {
        name: 'finalize',
        description: 'Finalize workflow',
        parameters: {
          type: 'object',
          properties: { summary: { type: 'string' } },
          required: ['summary'],
        },
      },
    },
  ]

  const result = await runWithOpenAI({
    client,
    agent: {
      provider: 'openai',
      model,
      temperature: 0.3,
      maxTokens: 4096,
      systemPrompt: `You are a CrewAI orchestrator. Assign tasks to agents (researcher, writer, reviewer), get their results, and finalize. Workflow: Research -> Write -> Review -> Finalize.`,
      tools: [
        {
          name: 'assign_task',
          description: 'Assign task',
          parameters: { agent: 'string', task: 'string', context: 'string' },
        },
        { name: 'get_result', description: 'Get results', parameters: { agent: 'string' } },
        { name: 'review_output', description: 'Review output', parameters: { output: 'string' } },
        { name: 'finalize', description: 'Finalize', parameters: { summary: 'string' } },
      ],
    },
    messages: [{ role: 'user', content: `Research, write about, and review this topic: ${topic}` }],
    tools,
    maxSteps: 12,
  })

  return {
    output: result.output,
    trace: result.trace,
    crewResult: { success: crewResult.success, totalTime: crewResult.totalTime },
    cost: result.cost,
  }
}
