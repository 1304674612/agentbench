/**
 * Test Suite: Multi-Server
 *
 * Verifies the MCP agent works across multiple servers simultaneously.
 */

import { expect } from '@agentbench/core'
import { runMcpAgent } from '../src/agent'

const API_KEY = process.env.OPENAI_API_KEY ?? 'sk-test-key'

export async function crossServerQueryTest() {
  const result = await runMcpAgent({
    request:
      'Check the weather forecast on the weather server and read the config resource from the filesystem server.',
    apiKey: API_KEY,
  })

  const completed = await expect(result).status().toBeCompleted().run()
  const hasOutput = await expect(result)
    .output()
    .toMatchRegex(/.{30,}/)
    .run()

  return {
    completed: completed.allPassed,
    hasOutput: hasOutput.allPassed,
    details: { completed, hasOutput },
  }
}
