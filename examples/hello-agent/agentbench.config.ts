import type { AgentConfig, RunOptions } from '@agentbench/core'

/**
 * AgentBench configuration for the Hello Agent — the minimal starter example.
 *
 * This is the simplest possible AgentBench project. It configures a basic
 * chat agent with no tools, a short timeout, and three minimal test suites.
 * Use this as a template to bootstrap your own agent evaluation project.
 */

export interface HelloAgentProjectConfig {
  name: string
  description: string
  agent: AgentConfig
  options: Partial<RunOptions>
  testSuites: string[]
}

const config: HelloAgentProjectConfig = {
  name: 'hello-agent',
  description:
    'Minimal starter agent — a simple chat agent that demonstrates the basic AgentBench testing workflow',

  agent: {
    provider: 'openai',
    model: 'gpt-4o-mini',
    temperature: 0.3,
    maxTokens: 1024,
    systemPrompt: `You are a helpful, concise assistant. Answer questions accurately and keep responses brief.
When asked a factual question, give the answer directly without unnecessary preamble.
When greeted, respond warmly but briefly.`,
    tools: [],
  },

  options: {
    timeout: 15000,
    maxSteps: 3,
    retries: 1,
    concurrency: 1,
  },

  testSuites: ['./tests/greeting.test.ts', './tests/factual.test.ts', './tests/replay.test.ts'],
}

export default config
