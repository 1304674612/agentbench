/**
 * Test Suite: Tool Discovery
 *
 * Verifies the MCP agent discovers tools on servers before calling them.
 */

import { expect } from '@agentbench/core'
import { runMcpAgent } from '../src/agent'

const API_KEY = process.env.OPENAI_API_KEY ?? 'sk-test-key'

export async function discoverFilesystemToolsTest() {
  const result = await runMcpAgent({
    request: 'What tools are available on the filesystem MCP server?',
    apiKey: API_KEY,
  })

  const completed = await expect(result).status().toBeCompleted().run()
  const discovered = await expect(result).tool('mcp_list_tools').toBeCalled().run()

  return {
    completed: completed.allPassed,
    discovered: discovered.allPassed,
    details: { completed, discovered },
  }
}

export async function discoverDatabaseToolsTest() {
  const result = await runMcpAgent({
    request: 'List all tools available on the database server.',
    apiKey: API_KEY,
  })

  const completed = await expect(result).status().toBeCompleted().run()
  const discovered = await expect(result).tool('mcp_list_tools').toBeCalled().run()

  return {
    completed: completed.allPassed,
    discovered: discovered.allPassed,
    details: { completed, discovered },
  }
}
