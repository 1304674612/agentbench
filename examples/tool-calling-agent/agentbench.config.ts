import type { AgentConfig, RunOptions } from '@agentbench/core'

export interface ToolCallingProjectConfig {
  name: string
  description: string
  agent: AgentConfig
  options: Partial<RunOptions>
  testSuites: string[]
}

const config: ToolCallingProjectConfig = {
  name: 'tool-calling-agent',
  description:
    'Agent with tool orchestration — weather, calculator, search, database, email, calendar, translate, file operations',

  agent: {
    provider: 'openai',
    model: 'gpt-4o',
    temperature: 0.1,
    maxTokens: 4096,
    systemPrompt: `You are an intelligent assistant with access to multiple tools. Use the appropriate tools to answer user queries accurately.

Available tools:
- get_weather(city, units?) — Get current weather conditions
- calculator(expression) — Evaluate mathematical expressions
- search_docs(query, maxResults?) — Search a document knowledge base
- query_database(sql) — Run a read-only SQL query
- send_email(to, subject, body) — Send an email
- check_calendar(date?, days?) — Check calendar events
- translate_text(text, targetLanguage) — Translate text
- read_file(path) — Read file contents

Rules:
- Select the most appropriate tool(s) for each request
- When multiple operations are needed, call tools in logical order
- Handle errors gracefully and explain issues to the user
- For calculations, use the calculator tool — do not compute manually
- Verify tool results before presenting them to the user`,
    tools: [
      { name: 'get_weather', description: 'Get weather', parameters: { city: 'string', units: 'string' } },
      { name: 'calculator', description: 'Evaluate math', parameters: { expression: 'string' } },
      { name: 'search_docs', description: 'Search documents', parameters: { query: 'string', maxResults: 'number' } },
      { name: 'query_database', description: 'Run SQL query', parameters: { sql: 'string' } },
      { name: 'send_email', description: 'Send email', parameters: { to: 'string', subject: 'string', body: 'string' } },
      { name: 'check_calendar', description: 'Check calendar', parameters: { date: 'string', days: 'number' } },
      { name: 'translate_text', description: 'Translate text', parameters: { text: 'string', targetLanguage: 'string' } },
      { name: 'read_file', description: 'Read file', parameters: { path: 'string' } },
    ],
  },

  options: {
    timeout: 30000,
    maxSteps: 10,
    retries: 1,
    concurrency: 1,
  },

  testSuites: [
    './tests/tool-selection.test.ts',
    './tests/parallel-tools.test.ts',
    './tests/tool-ordering.test.ts',
    './tests/error-handling.test.ts',
    './tests/tool-schema-adherence.test.ts',
  ],
}

export default config
