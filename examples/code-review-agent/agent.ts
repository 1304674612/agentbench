/**
 * Code Review Agent — Example implementation using @agentbench/anthropic.
 *
 * This agent reviews code for bugs, security vulnerabilities, and best
 * practice violations. It uses Claude via the Anthropic wrapper with
 * automatic tracing.
 *
 * Tools implemented:
 *   - read_file: reads source code from a given path
 *   - analyze_code: runs mock static analysis on a code snippet
 *   - check_best_practices: verifies adherence to coding standards
 *   - suggest_improvements: generates refactoring suggestions
 */

import { createAnthropicClient } from '@agentbench/anthropic'
import { tokenCounter, costCalculator } from '@agentbench/core'
import type { AgentConfig, ExecutionTrace, TraceStep } from '@agentbench/core'

// ---------------------------------------------------------------------------
// Tool implementations with realistic mock data
// ---------------------------------------------------------------------------

interface AnalysisIssue {
  severity: 'critical' | 'high' | 'medium' | 'low'
  line: number
  message: string
  rule: string
}

interface BestPracticeCheck {
  category: string
  passed: boolean
  details: string
}

interface ImprovementSuggestion {
  title: string
  description: string
  before: string
  after: string
  impact: 'high' | 'medium' | 'low'
}

// Mock file contents for read_file
const mockFiles: Record<string, string> = {
  'src/auth.ts': `
import bcrypt from 'bcrypt'
import jwt from 'jsonwebtoken'

const SECRET = 'my-hardcoded-secret-key-12345'

export async function login(username: string, password: string) {
  const query = "SELECT * FROM users WHERE username = '" + username + "' AND password = '" + password + "'"
  const user = await db.query(query)
  if (!user) throw new Error('Invalid credentials')
  const token = jwt.sign({ id: user.id }, SECRET)
  return { token, user }
}

export function validateToken(token: string) {
  return jwt.verify(token, SECRET)
}
`.trim(),

  'src/api.ts': `
import express from 'express'

const app = express()

app.get('/api/users/:id', async (req, res) => {
  const user = await db.users.find(req.params.id)
  res.json(user)
})

app.post('/api/users', async (req, res) => {
  const { name, email, password } = req.body
  const user = await db.users.create({ name, email, password })
  res.json(user)
})

app.listen(3000, () => console.log('Server running on port 3000'))
`.trim(),
}

// Mock static analysis results
function mockAnalyzeCode(code: string, language: string): AnalysisIssue[] {
  const issues: AnalysisIssue[] = []

  if (code.includes('hardcoded-secret') || code.includes("SECRET = '")) {
    issues.push({
      severity: 'critical',
      line: 4,
      message: 'Hardcoded secret detected. Use environment variables or a secrets manager.',
      rule: 'security/no-hardcoded-credentials',
    })
  }

  if (code.includes("'" + ") AND password = '")) {
    issues.push({
      severity: 'critical',
      line: 7,
      message: 'SQL injection vulnerability. String concatenation in SQL queries allows arbitrary SQL execution. Use parameterized queries instead.',
      rule: 'security/sql-injection',
    })
  }

  if (code.includes('console.log') && !code.includes('logger.')) {
    issues.push({
      severity: 'low',
      line: code.indexOf('console.log') > 0 ? 17 : 1,
      message: 'Using console.log instead of a structured logger. Replace with a proper logging library.',
      rule: 'best-practices/use-structured-logging',
    })
  }

  if (code.includes('req.body.') && !code.includes('validate') && !code.includes('zod') && !code.includes('schema')) {
    issues.push({
      severity: 'medium',
      line: 15,
      message: 'No input validation on request body. This can lead to type confusion and injection attacks.',
      rule: 'security/input-validation',
    })
  }

  if (code.includes('res.json(user)') && code.includes('password')) {
    issues.push({
      severity: 'high',
      line: 17,
      message: 'User object returned directly may leak sensitive fields (e.g., password hash). Use a DTO or select specific fields.',
      rule: 'security/data-exposure',
    })
  }

  return issues
}

// Mock best practices check
function mockCheckBestPractices(code: string, category: string): BestPracticeCheck[] {
  const checks: BestPracticeCheck[] = [
    {
      category: 'security',
      passed: !code.includes('hardcoded-secret'),
      details: code.includes('hardcoded-secret')
        ? 'Hardcoded credentials found. Move to environment variables.'
        : 'No hardcoded credentials detected.',
    },
    {
      category: 'security',
      passed: !code.includes("'" +"),
      details: code.includes("'" +")
        ? 'Potential SQL injection via string concatenation. Use parameterized queries.'
        : 'No obvious SQL injection patterns detected.',
    },
    {
      category: 'readability',
      passed: code.includes('async') || code.includes('try'),
      details: code.includes('async')
        ? 'Async/await used for asynchronous operations.'
        : 'Consider using async/await for asynchronous code.',
    },
    {
      category: 'performance',
      passed: !code.includes('for (') || code.includes('map('),
      details: code.includes('for (')
        ? 'Traditional for-loop detected. Consider using array methods like .map(), .filter(), .reduce().'
        : 'Modern array methods in use.',
    },
  ]

  if (category !== 'all') {
    return checks.filter((c) => c.category === category)
  }
  return checks
}

// Mock improvement suggestions
function mockSuggestImprovements(issue: string, context: string): ImprovementSuggestion[] {
  if (issue.toLowerCase().includes('sql injection')) {
    return [
      {
        title: 'Use Parameterized Queries',
        description: 'Replace string concatenation with parameterized queries to prevent SQL injection.',
        before: 'const query = "SELECT * FROM users WHERE username = \'" + username + "\'"',
        after: 'const query = "SELECT * FROM users WHERE username = $1"\nconst user = await db.query(query, [username])',
        impact: 'high',
      },
    ]
  }

  if (issue.toLowerCase().includes('hardcoded') || issue.toLowerCase().includes('secret')) {
    return [
      {
        title: 'Use Environment Variables',
        description: 'Move secrets out of source code into environment variables or a secrets manager.',
        before: 'const SECRET = \'my-hardcoded-secret-key-12345\'',
        after: 'const SECRET = process.env.JWT_SECRET\nif (!SECRET) throw new Error(\'JWT_SECRET is required\')',
        impact: 'high',
      },
    ]
  }

  if (issue.toLowerCase().includes('validation')) {
    return [
      {
        title: 'Add Input Validation with Zod',
        description: 'Use a schema validation library to validate and sanitize user inputs.',
        before: 'const { name, email, password } = req.body',
        after: 'const schema = z.object({\n  name: z.string().min(1),\n  email: z.string().email(),\n  password: z.string().min(8),\n})\nconst { name, email, password } = schema.parse(req.body)',
        impact: 'high',
      },
    ]
  }

  return [
    {
      title: 'General Code Improvement',
      description: 'Follow SOLID principles and keep functions small and focused.',
      before: '// current implementation',
      after: '// refactored implementation with improved separation of concerns',
      impact: 'medium',
    },
  ]
}

// ---------------------------------------------------------------------------
// Tool handler
// ---------------------------------------------------------------------------

export function executeTool(name: string, args: Record<string, unknown>): Record<string, unknown> {
  switch (name) {
    case 'read_file': {
      const path = String(args.path ?? '')
      const content = mockFiles[path]
      if (!content) return { path, found: false, content: null, error: `File not found: ${path}` }
      return { path, found: true, content, lines: content.split('\n').length }
    }

    case 'analyze_code': {
      const code = String(args.code ?? '')
      const language = String(args.language ?? 'typescript')
      const issues = mockAnalyzeCode(code, language)
      return {
        issues,
        summary: {
          total: issues.length,
          critical: issues.filter((i) => i.severity === 'critical').length,
          high: issues.filter((i) => i.severity === 'high').length,
          medium: issues.filter((i) => i.severity === 'medium').length,
          low: issues.filter((i) => i.severity === 'low').length,
        },
      }
    }

    case 'check_best_practices': {
      const code = String(args.code ?? '')
      const category = String(args.category ?? 'all')
      const results = mockCheckBestPractices(code, category)
      return {
        results,
        score: results.filter((r) => r.passed).length / Math.max(results.length, 1),
        passed: results.filter((r) => r.passed).length,
        total: results.length,
      }
    }

    case 'suggest_improvements': {
      const issue = String(args.issue ?? '')
      const context = String(args.context ?? '')
      const suggestions = mockSuggestImprovements(issue, context)
      return { suggestions, count: suggestions.length }
    }

    default:
      return { error: `Unknown tool: ${name}` }
  }
}

// ---------------------------------------------------------------------------
// Agent runner
// ---------------------------------------------------------------------------

export interface RunCodeReviewParams {
  code: string
  language?: string
  apiKey: string
  model?: string
  maxSteps?: number
}

export interface CodeReviewResult {
  output: string
  trace: ExecutionTrace
  cost: number
}

export async function runCodeReviewAgent(params: RunCodeReviewParams): Promise<CodeReviewResult> {
  const { code, language = 'typescript', apiKey, model = 'claude-sonnet-4-20250514', maxSteps = 10 } = params

  const client = createAnthropicClient({
    apiKey,
    tracing: true,
    timeout: 60000,
  })

  const steps: TraceStep[] = []
  let totalCost = 0

  client.setContext({
    onStep: (step) => {
      steps.push(step)
      totalCost += step.cost ?? 0
    },
  })

  const result = await client.createMessage({
    model,
    system: `You are a senior code reviewer. Analyze the provided code and provide feedback.
Always:
1. Identify bugs and logic errors
2. Flag security vulnerabilities
3. Check best practices compliance
4. Suggest concrete improvements

Use the available tools: read_file, analyze_code, check_best_practices, suggest_improvements.`,
    messages: [
      {
        role: 'user',
        content: `Please review the following ${language} code:\n\n\`\`\`${language}\n${code}\n\`\`\`\n\nRun analysis and provide a comprehensive review with specific, actionable suggestions.`,
      },
    ],
    max_tokens: 4096,
    temperature: 0.2,
    tools: [
      {
        name: 'read_file',
        description: 'Read the contents of a source file',
        input_schema: {
          type: 'object',
          properties: { path: { type: 'string', description: 'Path to the file to read' } },
          required: ['path'],
        },
      },
      {
        name: 'analyze_code',
        description: 'Run static analysis to detect bugs and anti-patterns',
        input_schema: {
          type: 'object',
          properties: {
            code: { type: 'string', description: 'Code to analyze' },
            language: { type: 'string', description: 'Programming language' },
          },
          required: ['code', 'language'],
        },
      },
      {
        name: 'check_best_practices',
        description: 'Check code against best practices',
        input_schema: {
          type: 'object',
          properties: {
            code: { type: 'string', description: 'Code to check' },
            category: { type: 'string', description: 'Category: security, performance, readability, or all' },
          },
          required: ['code'],
        },
      },
      {
        name: 'suggest_improvements',
        description: 'Generate specific improvement suggestions',
        input_schema: {
          type: 'object',
          properties: {
            issue: { type: 'string', description: 'Issue description' },
            context: { type: 'string', description: 'Surrounding code context' },
          },
          required: ['issue'],
        },
      },
    ],
  })

  const trace: ExecutionTrace = {
    id: `trace-${Date.now()}`,
    runId: '',
    steps,
    metadata: {
      agentName: model,
      environment: 'development',
    },
    createdAt: new Date(),
  }

  return {
    output: result.content,
    trace,
    cost: result.cost + totalCost,
  }
}
