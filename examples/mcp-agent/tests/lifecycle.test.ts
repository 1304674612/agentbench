/**
 * Test Suite: Lifecycle
 *
 * Verifies the MCP agent handles server connection states correctly.
 */

import { expect } from '@agentbench/core'
import { runMcpAgent } from '../src/agent'

const API_KEY = process.env.OPENAI_API_KEY ?? 'sk-test-key'

export async function discoverThenCallTest() {
  const result = await runMcpAgent({
    request: 'First discover tools on the database server, then use the query tool to run: SELECT * FROM users.',
    apiKey: API_KEY,
  })

  const completed = await expect(result).status().toBeCompleted().run()
  const hasOutput = await expect(result).output().toMatchRegex(/.{30,}/).run()

  return {
    completed: completed.allPassed,
    hasOutput: hasOutput.allPassed,
    details: { completed, hasOutput },
  }
}
