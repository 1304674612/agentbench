/**
 * Tool-Calling Agent — Multi-tool orchestration agent.
 *
 * This agent can select and invoke 8 different tools to fulfill user
 * requests. It demonstrates complex tool orchestration including
 * parallel tool calls, sequential ordering, error handling, and
 * schema adherence.
 *
 * Architecture:
 *   User Request  -->  Tool Selection  -->  Tool Execution  -->  Result Synthesis
 *
 * Key concepts demonstrated:
 *   - Dynamic tool selection from 8 available tools
 *   - Parallel tool execution for independent operations
 *   - Sequential tool ordering when tools depend on each other
 *   - Error handling and graceful degradation
 *   - Tool schema adherence verification
 */

import { createOpenAIClient, runWithOpenAI } from '@agentbench/openai'
import type { ExecutionTrace } from '@agentbench/core'
import {
  getWeather,
  calculator,
  searchDocs,
  queryDatabase,
  sendEmail,
  checkCalendar,
  translateText,
  readFile,
} from './tools'

// ---------------------------------------------------------------------------
// Tool handler mapping
// ---------------------------------------------------------------------------

export type ToolName =
  | 'get_weather'
  | 'calculator'
  | 'search_docs'
  | 'query_database'
  | 'send_email'
  | 'check_calendar'
  | 'translate_text'
  | 'read_file'

const toolExecutors: Record<string, (args: Record<string, unknown>) => Promise<unknown>> = {
  get_weather: (args) => getWeather(String(args.city ?? ''), (args.units as 'celsius' | 'fahrenheit') ?? 'celsius'),
  calculator: (args) => calculator(String(args.expression ?? '')),
  search_docs: (args) => searchDocs(String(args.query ?? ''), Number(args.maxResults ?? 3)),
  query_database: (args) => queryDatabase(String(args.sql ?? '')),
  send_email: (args) => sendEmail(String(args.to ?? ''), String(args.subject ?? ''), String(args.body ?? '')),
  check_calendar: (args) => checkCalendar(args.date ? String(args.date) : undefined, Number(args.days ?? 3)),
  translate_text: (args) => translateText(String(args.text ?? ''), String(args.targetLanguage ?? 'spanish')),
  read_file: (args) => readFile(String(args.path ?? '')),
}

export async function executeTool(
  name: string,
  args: Record<string, unknown>,
): Promise<Record<string, unknown>> {
  const executor = toolExecutors[name]
  if (!executor) {
    return { error: `Unknown tool: ${name}. Available: ${Object.keys(toolExecutors).join(', ')}` }
  }
  try {
    const result = await executor(args)
    return result as Record<string, unknown>
  } catch (err) {
    return { error: `Tool execution failed: ${err instanceof Error ? err.message : String(err)}` }
  }
}

// ---------------------------------------------------------------------------
// Agent runner
// ---------------------------------------------------------------------------

export interface RunToolCallingAgentParams {
  request: string
  apiKey: string
  model?: string
  maxSteps?: number
}

export interface ToolCallingAgentResult {
  output: string
  trace: ExecutionTrace
  toolsUsed: string[]
  cost: number
}

export async function runToolCallingAgent(params: RunToolCallingAgentParams): Promise<ToolCallingAgentResult> {
  const {
    request,
    apiKey,
    model = 'gpt-4o',
    maxSteps = 10,
  } = params

  const client = createOpenAIClient({
    apiKey,
    tracing: true,
    timeout: 30000,
  })

  const toolDefs = [
    {
      type: 'function' as const,
      function: {
        name: 'get_weather',
        description: 'Get the current weather conditions for a city. Use for weather-related questions.',
        parameters: {
          type: 'object',
          properties: {
            city: { type: 'string', description: 'City name (e.g., "New York", "Tokyo")' },
            units: { type: 'string', enum: ['celsius', 'fahrenheit'], description: 'Temperature units' },
          },
          required: ['city'],
        },
      },
    },
    {
      type: 'function' as const,
      function: {
        name: 'calculator',
        description: 'Evaluate a mathematical expression. Use for arithmetic, percentage, and math problems.',
        parameters: {
          type: 'object',
          properties: {
            expression: { type: 'string', description: 'Math expression (e.g., "2 + 2 * 3", "(100 - 20) / 4")' },
          },
          required: ['expression'],
        },
      },
    },
    {
      type: 'function' as const,
      function: {
        name: 'search_docs',
        description: 'Search the documentation knowledge base. Use for help, setup, and configuration questions.',
        parameters: {
          type: 'object',
          properties: {
            query: { type: 'string', description: 'Search query string' },
            maxResults: { type: 'number', description: 'Max results to return (default 3)' },
          },
          required: ['query'],
        },
      },
    },
    {
      type: 'function' as const,
      function: {
        name: 'query_database',
        description: 'Run a read-only SQL query against the database. Only SELECT queries are allowed.',
        parameters: {
          type: 'object',
          properties: {
            sql: { type: 'string', description: 'SQL SELECT query to execute' },
          },
          required: ['sql'],
        },
      },
    },
    {
      type: 'function' as const,
      function: {
        name: 'send_email',
        description: 'Send an email to a recipient. Use for email-related tasks.',
        parameters: {
          type: 'object',
          properties: {
            to: { type: 'string', description: 'Recipient email address' },
            subject: { type: 'string', description: 'Email subject line' },
            body: { type: 'string', description: 'Email body content' },
          },
          required: ['to', 'subject', 'body'],
        },
      },
    },
    {
      type: 'function' as const,
      function: {
        name: 'check_calendar',
        description: 'Check calendar events for a date range. Use for scheduling and availability questions.',
        parameters: {
          type: 'object',
          properties: {
            date: { type: 'string', description: 'Start date in YYYY-MM-DD format (default: today)' },
            days: { type: 'number', description: 'Number of days to check (default: 3)' },
          },
          required: [],
        },
      },
    },
    {
      type: 'function' as const,
      function: {
        name: 'translate_text',
        description: 'Translate text to another language. Use for translation requests.',
        parameters: {
          type: 'object',
          properties: {
            text: { type: 'string', description: 'Text to translate' },
            targetLanguage: { type: 'string', description: 'Target language (e.g., spanish, french, japanese)' },
          },
          required: ['text', 'targetLanguage'],
        },
      },
    },
    {
      type: 'function' as const,
      function: {
        name: 'read_file',
        description: 'Read the contents of a file. Use for accessing configuration, logs, or data files.',
        parameters: {
          type: 'object',
          properties: {
            path: { type: 'string', description: 'File path (e.g., "/data/config.json", "/logs/app.log")' },
          },
          required: ['path'],
        },
      },
    },
  ]

  const result = await runWithOpenAI({
    client,
    agent: {
      provider: 'openai',
      model,
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
    messages: [{ role: 'user', content: request }],
    tools: toolDefs,
    maxSteps,
  })

  // Collect tools used from trace
  const toolsUsed: string[] = []
  if (result.trace?.steps) {
    for (const step of result.trace.steps) {
      if (step.toolName && !toolsUsed.includes(step.toolName)) {
        toolsUsed.push(step.toolName)
      }
    }
  }

  return {
    output: result.output,
    trace: result.trace,
    toolsUsed,
    cost: result.cost,
  }
}
