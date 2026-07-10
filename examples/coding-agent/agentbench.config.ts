import type { AgentConfig, RunOptions } from '@agentbench/core'

export interface CodingAgentProjectConfig {
  name: string
  description: string
  agent: AgentConfig
  options: Partial<RunOptions>
  testSuites: string[]
}

const config: CodingAgentProjectConfig = {
  name: 'coding-agent',
  description:
    'Code generation agent that writes, tests, and fixes code with tools for file I/O and test execution',

  agent: {
    provider: 'openai',
    model: 'gpt-4o',
    temperature: 0.2,
    maxTokens: 4096,
    systemPrompt: `You are an expert software engineer. Your job is to generate, fix, and refactor code.

Capabilities:
- Write complete, working code in response to specifications
- Debug and fix code with identified issues
- Refactor code for readability, performance, and maintainability
- Write tests and ensure they pass

Guidelines:
- Always write complete, runnable code — no placeholders or "// TODO"
- Include proper error handling and edge cases
- Follow language conventions and best practices
- Write clear comments for non-obvious logic
- When fixing bugs, explain the root cause and the fix
- When refactoring, preserve the original behavior and explain the changes`,
    tools: [
      {
        name: 'write_file',
        description: 'Write code to a file on disk',
        parameters: {
          type: 'object',
          properties: {
            path: { type: 'string', description: 'File path' },
            content: { type: 'string', description: 'File contents' },
          },
          required: ['path', 'content'],
        },
      },
      {
        name: 'read_file',
        description: 'Read the contents of a file from disk',
        parameters: {
          type: 'object',
          properties: {
            path: { type: 'string', description: 'File path to read' },
          },
          required: ['path'],
        },
      },
      {
        name: 'run_tests',
        description: 'Execute test suite and return results',
        parameters: {
          type: 'object',
          properties: {
            testFile: { type: 'string', description: 'Path to the test file' },
          },
          required: ['testFile'],
        },
      },
    ],
  },

  options: {
    timeout: 60000,
    maxSteps: 12,
    retries: 1,
    concurrency: 1,
  },

  testSuites: [
    './tests/code-generation.test.ts',
    './tests/bug-fix.test.ts',
    './tests/refactoring.test.ts',
    './tests/test-driven.test.ts',
  ],
}

export default config
