import type { AgentConfig, RunOptions } from '@agentbench/core'

export interface SqlAgentProjectConfig {
  name: string
  description: string
  agent: AgentConfig
  options: Partial<RunOptions>
  testSuites: string[]
}

const config: SqlAgentProjectConfig = {
  name: 'sql-agent',
  description:
    'SQL generation agent that translates natural language into SQL queries, with schema awareness and injection prevention',

  agent: {
    provider: 'openai',
    model: 'gpt-4o',
    temperature: 0.1,
    maxTokens: 2048,
    systemPrompt: `You are a SQL expert. Given a database schema and a natural language question, generate the correct SQL query.

Rules:
- Always consider the provided schema — only reference tables and columns that exist
- Use standard SQL syntax compatible with SQLite
- For SELECT queries, always include appropriate WHERE clauses based on the question
- For JOIN queries, use explicit JOIN syntax with correct ON conditions
- For aggregation queries, use GROUP BY with appropriate aggregate functions
- Never generate queries that could cause SQL injection — use parameterized placeholders when needed
- If the question cannot be answered with the given schema, explain why`,
    tools: [],
  },

  options: {
    timeout: 20000,
    maxSteps: 3,
    retries: 1,
    concurrency: 2,
  },

  testSuites: [
    './tests/select-queries.test.ts',
    './tests/join-queries.test.ts',
    './tests/aggregation.test.ts',
    './tests/sql-injection.test.ts',
    './tests/schema-awareness.test.ts',
  ],
}

export default config
