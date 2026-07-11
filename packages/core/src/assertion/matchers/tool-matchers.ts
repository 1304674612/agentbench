/**
 * Tool assertion matchers.
 */

import type { AssertionResult } from '../../types/run'

export interface ToolCallRecord {
  name: string
  arguments: Record<string, unknown>
  result?: unknown
  error?: string
}

/**
 * Assert that a specific tool was called.
 */
export function toolToBeCalled(toolCalls: ToolCallRecord[], toolName: string): AssertionResult {
  const called = toolCalls.some((t) => t.name === toolName)
  return {
    type: 'tool_called',
    status: called ? 'passed' : 'failed',
    expected: `Tool "${toolName}" to be called`,
    actual: called
      ? `Tool "${toolName}" was called`
      : `Tool "${toolName}" was not called. Called tools: ${toolCalls.map((t) => t.name).join(', ') || '(none)'}`,
    message: called ? undefined : `Expected tool "${toolName}" to be called`,
  }
}

/**
 * Assert that a specific tool was NOT called.
 */
export function toolNotToBeCalled(toolCalls: ToolCallRecord[], toolName: string): AssertionResult {
  const called = toolCalls.some((t) => t.name === toolName)
  return {
    type: 'tool_not_called',
    status: called ? 'failed' : 'passed',
    expected: `Tool "${toolName}" not to be called`,
    actual: called ? `Tool "${toolName}" was called` : `Tool "${toolName}" was not called`,
    message: called ? `Expected tool "${toolName}" not to be called` : undefined,
  }
}

/**
 * Assert that a tool was called with specific arguments.
 */
export function toolToBeCalledWith(
  toolCalls: ToolCallRecord[],
  toolName: string,
  expectedArgs: Record<string, unknown>
): AssertionResult {
  const toolCall = toolCalls.find((t) => t.name === toolName)

  if (!toolCall) {
    return {
      type: 'tool_called_with',
      status: 'failed',
      expected: `Tool "${toolName}" called with ${JSON.stringify(expectedArgs)}`,
      actual: `Tool "${toolName}" was not called`,
      message: `Expected tool "${toolName}" to be called with specific arguments, but it was not called`,
    }
  }

  const mismatches: string[] = []
  for (const [key, expectedValue] of Object.entries(expectedArgs)) {
    const actualValue = toolCall.arguments[key]
    if (JSON.stringify(actualValue) !== JSON.stringify(expectedValue)) {
      mismatches.push(
        `${key}: expected ${JSON.stringify(expectedValue)}, got ${JSON.stringify(actualValue)}`
      )
    }
  }

  const passed = mismatches.length === 0
  return {
    type: 'tool_called_with',
    status: passed ? 'passed' : 'failed',
    expected: expectedArgs,
    actual: toolCall.arguments,
    message: passed
      ? undefined
      : `Tool "${toolName}" argument mismatches: ${mismatches.join('; ')}`,
  }
}

/**
 * Assert that a tool was called exactly N times.
 */
export function toolToBeCalledTimes(
  toolCalls: ToolCallRecord[],
  toolName: string,
  expectedCount: number
): AssertionResult {
  const count = toolCalls.filter((t) => t.name === toolName).length
  const passed = count === expectedCount
  return {
    type: 'tool_called_times',
    status: passed ? 'passed' : 'failed',
    expected: expectedCount,
    actual: count,
    message: passed
      ? undefined
      : `Expected tool "${toolName}" to be called ${expectedCount} time(s), but was called ${count} time(s)`,
  }
}
