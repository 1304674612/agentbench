/**
 * SQL Agent — Natural language to SQL generation agent.
 *
 * This agent translates natural language questions into SQL queries.
 * It uses the database schema to generate correct queries and provides
 * the generated SQL, explanation, and execution trace.
 *
 * Architecture:
 *   NL Question + DB Schema  -->  OpenAI  -->  SQL Query + Explanation
 *
 * Key concepts demonstrated:
 *   - Schema-aware query generation
 *   - SQL injection prevention
 *   - Structured output (SQL + explanation)
 *   - Handling of unsupported queries
 */

import { createOpenAIClient, runWithOpenAI } from '@agentbench/openai'
import type { ExecutionTrace } from '@agentbench/core'
import { getSchemaDescription } from './db-schema'

// ---------------------------------------------------------------------------
// Agent runner
// ---------------------------------------------------------------------------

export interface RunSqlAgentParams {
  question: string
  apiKey: string
  model?: string
  temperature?: number
}

export interface SqlAgentResult {
  sql: string
  explanation: string
  output: string
  trace: ExecutionTrace
  cost: number
}

export async function runSqlAgent(params: RunSqlAgentParams): Promise<SqlAgentResult> {
  const { question, apiKey, model = 'gpt-4o', temperature = 0.1 } = params

  const schema = getSchemaDescription()

  const client = createOpenAIClient({
    apiKey,
    tracing: true,
    timeout: 20000,
  })

  const systemPrompt = `You are a SQL expert. Given a database schema, generate the correct SQL query for the user's question.

## Database Schema
${schema}

## Rules
1. ONLY use tables and columns that exist in the schema above
2. Use standard SQL syntax compatible with SQLite
3. For SELECT queries, include appropriate WHERE clauses
4. For JOIN queries, use explicit JOIN syntax with correct ON conditions
5. For aggregation, use GROUP BY with appropriate aggregate functions (COUNT, SUM, AVG, MAX, MIN)
6. NEVER generate queries that could cause SQL injection
7. If the question cannot be answered with the given schema, explain why clearly

## Response Format
Respond in this exact format:

SQL: <the SQL query>
EXPLANATION: <brief explanation of what the query does and why>`

  const result = await runWithOpenAI({
    client,
    agent: {
      provider: 'openai',
      model,
      temperature,
      maxTokens: 2048,
      systemPrompt,
      tools: [],
    },
    messages: [{ role: 'user', content: question }],
    tools: [],
    maxSteps: 3,
  })

  // Parse the structured output
  const output = result.output
  const sqlMatch = output.match(/SQL:\s*(.+?)(?:\n|$)/s)
  const explanationMatch = output.match(/EXPLANATION:\s*(.+?)(?:\n|$)/s)

  const sql = sqlMatch ? sqlMatch[1].trim() : ''
  const explanation = explanationMatch ? explanationMatch[1].trim() : ''

  return {
    sql,
    explanation,
    output: result.output,
    trace: result.trace,
    cost: result.cost,
  }
}
