import type { AgentConfig, RunOptions } from '@agentbench/core'

export interface CrewAiConfig {
  name: string; description: string; agent: AgentConfig; options: Partial<RunOptions>; testSuites: string[]
}

const config: CrewAiConfig = {
  name: 'crewai-agent',
  description: 'CrewAI multi-agent orchestration with researcher, writer, and reviewer agents working sequentially',

  agent: {
    provider: 'openai',
    model: 'gpt-4o',
    temperature: 0.3,
    maxTokens: 4096,
    systemPrompt: `You are a CrewAI orchestrator managing a team of specialized agents:
- researcher: Finds and analyzes information
- writer: Creates well-structured content
- reviewer: Evaluates quality and provides feedback

Workflow: Research -> Write -> Review -> Final Output`,
    tools: [
      { name: 'assign_task', description: 'Assign a task to a crew agent', parameters: { type: 'object', properties: { agent: { type: 'string', enum: ['researcher', 'writer', 'reviewer'] }, task: { type: 'string' }, context: { type: 'string' } }, required: ['agent', 'task'] } },
      { name: 'get_result', description: 'Get the result from a crew agent', parameters: { type: 'object', properties: { agent: { type: 'string' } }, required: ['agent'] } },
      { name: 'review_output', description: 'Review and score agent output quality', parameters: { type: 'object', properties: { output: { type: 'string' }, criteria: { type: 'array', items: { type: 'string' } } }, required: ['output'] } },
      { name: 'finalize', description: 'Finalize the crew workflow output', parameters: { type: 'object', properties: { summary: { type: 'string' } }, required: ['summary'] } },
    ],
  },

  options: { timeout: 45000, maxSteps: 12, retries: 1, concurrency: 1 },
  testSuites: ['./tests/task-completion.test.ts', './tests/agent-delegation.test.ts', './tests/sequential.test.ts', './tests/output-quality.test.ts'],
}

export default config
