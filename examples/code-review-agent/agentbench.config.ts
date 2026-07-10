import type { AgentConfig, RunOptions } from '@agentbench/core'

/**
 * AgentBench configuration for the Code Review Agent example.
 *
 * This config defines a project named "code-review" that tests a
 * Claude-based code review agent with tools for analyzing code
 * quality, security, and suggesting improvements.
 */

export interface CodeReviewProjectConfig {
  name: string
  description: string
  agent: AgentConfig
  options: Partial<RunOptions>
  testSuites: string[]
}

const config: CodeReviewProjectConfig = {
  name: 'code-review',
  description: 'Claude-powered code review agent that identifies bugs, security issues, and suggests improvements',

  agent: {
    provider: 'anthropic',
    model: 'claude-sonnet-4-20250514',
    temperature: 0.2,
    maxTokens: 4096,
    systemPrompt: `You are a senior code reviewer. Your job is to analyze code and provide actionable feedback.

Guidelines:
- Identify bugs, logic errors, and potential runtime exceptions
- Flag security vulnerabilities (SQL injection, XSS, hardcoded secrets, insecure dependencies)
- Check adherence to best practices and coding standards
- Suggest performance improvements and code simplifications
- Rate the overall code quality on a scale of 1-10
- Be constructive and specific — cite exact line numbers when possible
- Prioritize issues by severity: critical > high > medium > low

When reviewing, always:
1. Read and understand the code first
2. Run analysis tools to check for issues
3. Verify against best practices
4. Provide specific, actionable suggestions`,
    tools: [
      {
        name: 'read_file',
        description: 'Read the contents of a source file',
        parameters: {
          type: 'object',
          properties: { path: { type: 'string', description: 'Path to the file to read' } },
          required: ['path'],
        },
      },
      {
        name: 'analyze_code',
        description: 'Run static analysis on code to detect bugs, code smells, and anti-patterns',
        parameters: {
          type: 'object',
          properties: {
            code: { type: 'string', description: 'Code snippet to analyze' },
            language: { type: 'string', description: 'Programming language (typescript, python, etc.)' },
          },
          required: ['code', 'language'],
        },
      },
      {
        name: 'check_best_practices',
        description: 'Check code against industry best practices and coding standards',
        parameters: {
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
        description: 'Generate specific, actionable code improvement suggestions',
        parameters: {
          type: 'object',
          properties: {
            issue: { type: 'string', description: 'Description of the issue to improve' },
            context: { type: 'string', description: 'Surrounding code context' },
          },
          required: ['issue'],
        },
      },
    ],
  },

  options: {
    timeout: 60000,
    maxSteps: 10,
    retries: 1,
    concurrency: 1,
  },

  testSuites: [
    './tests/code-quality.test.ts',
    './tests/security-review.test.ts',
  ],
}

export default config
