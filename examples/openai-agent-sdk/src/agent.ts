/**
 * OpenAI Agents SDK Agent — Guardrails, handoffs, tools, and tracing.
 *
 * Architecture:
 *   User Input --> Guardrail (input) --> Agent --> Tool Use --> Handoff? --> Guardrail (output) --> Response
 */

import { createOpenAIClient, runWithOpenAI } from '@agentbench/openai'
import type { ExecutionTrace } from '@agentbench/core'

const traces: Record<string, unknown>[] = []

export async function executeTool(name: string, args: Record<string, unknown>): Promise<Record<string, unknown>> {
  traces.push({ tool: name, args, timestamp: new Date().toISOString() })

  switch (name) {
    case 'check_guardrail': {
      const content = String(args.content ?? '')
      const stage = String(args.stage ?? 'input')
      const blocked = content.includes('DROP TABLE') || content.includes('<script>') || content.includes('rm -rf')
      return { stage, passed: !blocked, reason: blocked ? 'Content blocked by safety guardrail' : 'OK' }
    }
    case 'handoff': {
      const agentName = String(args.agent ?? '')
      const task = String(args.task ?? '')
      const specialists: Record<string, string> = { 'math-agent': 'Computation complete.', 'writer-agent': 'Content drafted.', 'coder-agent': 'Code generated and tested.' }
      return { handedOff: true, to: agentName, result: specialists[agentName] ?? 'Task completed by specialist.', task }
    }
    case 'use_tool': {
      const toolName = String(args.toolName ?? '')
      return { toolUsed: toolName, result: `[Result from ${toolName}]` }
    }
    case 'get_trace':
      return { traces, count: traces.length }
    default:
      return { error: `Unknown tool: ${name}` }
  }
}

export interface RunOpenAIAgentParams { request: string; apiKey: string; model?: string }
export interface OpenAIAgentResult { output: string; trace: ExecutionTrace; cost: number }

export async function runOpenAIAgentSdk(params: RunOpenAIAgentParams): Promise<OpenAIAgentResult> {
  const { request, apiKey, model = 'gpt-4o' } = params
  const client = createOpenAIClient({ apiKey, tracing: true, timeout: 30000 })

  const tools = [
    { type: 'function' as const, function: { name: 'check_guardrail', description: 'Run guardrail check', parameters: { type: 'object', properties: { content: { type: 'string' }, stage: { type: 'string' } }, required: ['content', 'stage'] } } },
    { type: 'function' as const, function: { name: 'handoff', description: 'Hand off to specialist agent', parameters: { type: 'object', properties: { agent: { type: 'string' }, task: { type: 'string' } }, required: ['agent', 'task'] } } },
    { type: 'function' as const, function: { name: 'use_tool', description: 'Use a tool', parameters: { type: 'object', properties: { toolName: { type: 'string' }, params: { type: 'object' } }, required: ['toolName'] } } },
    { type: 'function' as const, function: { name: 'get_trace', description: 'Get execution trace', parameters: { type: 'object', properties: {} } } },
  ]

  const result = await runWithOpenAI({
    client,
    agent: {
      provider: 'openai', model, temperature: 0.2, maxTokens: 2048,
      systemPrompt: `You are an OpenAI Agents SDK agent. Before processing, run check_guardrail for input. Use handoff for specialized tasks (math-agent, writer-agent, coder-agent). Use use_tool for external tool access. Get traces with get_trace. Always run check_guardrail on your output before returning it.`,
      tools: [
        { name: 'check_guardrail', description: 'Validate content', parameters: { content: 'string', stage: 'string' } },
        { name: 'handoff', description: 'Hand off to specialist', parameters: { agent: 'string', task: 'string' } },
        { name: 'use_tool', description: 'Use a tool', parameters: { toolName: 'string', params: 'object' } },
        { name: 'get_trace', description: 'Get traces', parameters: {} },
      ],
    },
    messages: [{ role: 'user', content: request }],
    tools,
    maxSteps: 8,
  })

  return { output: result.output, trace: result.trace, cost: result.cost }
}
