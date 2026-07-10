import type { AgentConfig, RunOptions } from '@agentbench/core'

export interface LangGraphProjectConfig {
  name: string
  description: string
  agent: AgentConfig
  options: Partial<RunOptions>
  testSuites: string[]
}

const config: LangGraphProjectConfig = {
  name: 'langgraph-agent',
  description:
    'LangGraph-style state graph agent with nodes, conditional edges, state transitions, and human-in-the-loop patterns',

  agent: {
    provider: 'openai',
    model: 'gpt-4o',
    temperature: 0.2,
    maxTokens: 4096,
    systemPrompt: `You are a workflow orchestration agent that processes user requests through a state graph. Your responses simulate a LangGraph-style execution with clear node transitions and state management.

The workflow follows this pattern:
1. CLASSIFY — classify the user intent
2. RETRIEVE — retrieve relevant context
3. REASON — analyze the information
4. GENERATE — produce the response
5. VALIDATE — check the response quality

For each user request, explain which nodes were traversed, the state transitions, and the final output.`,
    tools: [],
  },

  options: {
    timeout: 30000,
    maxSteps: 8,
    retries: 1,
    concurrency: 1,
  },

  testSuites: [
    './tests/workflow-paths.test.ts',
    './tests/state-transitions.test.ts',
    './tests/conditional-edges.test.ts',
    './tests/human-in-loop.test.ts',
  ],
}

export default config
