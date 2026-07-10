/**
 * Coding Agent — Code generation, debugging, and refactoring agent.
 *
 * Architecture:
 *   Task Spec  -->  OpenAI (gpt-4o)  -->  Generated/Fixed Code
 *                (with write_file, read_file, run_tests tools)
 *
 * Key concepts demonstrated:
 *   - Code generation from natural language specs
 *   - Bug identification and fixing
 *   - Code refactoring with behavior preservation
 *   - Test-driven development loop (write code, run tests, iterate)
 */

import { createOpenAIClient, runWithOpenAI } from '@agentbench/openai'
import type { ExecutionTrace } from '@agentbench/core'

// ---------------------------------------------------------------------------
// Virtual filesystem for the coding agent
// ---------------------------------------------------------------------------

const virtualFS = new Map<string, string>()

// Mock test runner
function runVirtualTests(testFile: string): { passed: number; failed: number; output: string } {
  const testContent = virtualFS.get(testFile)
  if (!testContent) return { passed: 0, failed: 1, output: `Test file not found: ${testFile}` }

  if (testContent.includes('expect(') && !testContent.includes('throw')) {
    return { passed: 3, failed: 0, output: 'All tests passed (3/3)' }
  }
  return { passed: 2, failed: 1, output: '2 passed, 1 failed: TypeError at line 5' }
}

// ---------------------------------------------------------------------------
// Tool handler
// ---------------------------------------------------------------------------

export async function executeTool(
  name: string,
  args: Record<string, unknown>,
): Promise<Record<string, unknown>> {
  switch (name) {
    case 'write_file': {
      const path = String(args.path ?? '')
      const content = String(args.content ?? '')
      virtualFS.set(path, content)
      return { path, written: true, size: content.length }
    }
    case 'read_file': {
      const path = String(args.path ?? '')
      const content = virtualFS.get(path)
      return content ? { path, content, found: true } : { path, found: false, error: 'File not found' }
    }
    case 'run_tests': {
      const testFile = String(args.testFile ?? '')
      const result = runVirtualTests(testFile)
      return { ...result, testFile }
    }
    default:
      return { error: `Unknown tool: ${name}` }
  }
}

// ---------------------------------------------------------------------------
// Agent runner
// ---------------------------------------------------------------------------

export interface RunCodingAgentParams {
  task: string
  apiKey: string
  model?: string
  maxSteps?: number
}

export interface CodingAgentResult {
  output: string
  trace: ExecutionTrace
  cost: number
}

export async function runCodingAgent(params: RunCodingAgentParams): Promise<CodingAgentResult> {
  const { task, apiKey, model = 'gpt-4o', maxSteps = 12 } = params

  const client = createOpenAIClient({
    apiKey,
    tracing: true,
    timeout: 60000,
  })

  const tools = [
    {
      type: 'function' as const,
      function: {
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
    },
    {
      type: 'function' as const,
      function: {
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
    },
    {
      type: 'function' as const,
      function: {
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
    },
  ]

  const result = await runWithOpenAI({
    client,
    agent: {
      provider: 'openai',
      model,
      temperature: 0.2,
      maxTokens: 4096,
      systemPrompt: `You are an expert software engineer. Write complete, working code for the task.
- Write all code to files using write_file
- Read existing code with read_file when needed
- Run tests with run_tests to verify your solutions
- No placeholders — every line must be real, working code
- Include proper error handling, type annotations, and comments`,
      tools: [
        { name: 'write_file', description: 'Write code to file', parameters: { path: 'string', content: 'string' } },
        { name: 'read_file', description: 'Read file contents', parameters: { path: 'string' } },
        { name: 'run_tests', description: 'Run test suite', parameters: { testFile: 'string' } },
      ],
    },
    messages: [{ role: 'user', content: task }],
    tools,
    maxSteps,
  })

  return {
    output: result.output,
    trace: result.trace,
    cost: result.cost,
  }
}
