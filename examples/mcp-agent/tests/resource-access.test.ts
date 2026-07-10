/**
 * Test Suite: Resource Access
 *
 * Verifies the MCP agent can list and read resources from MCP servers.
 */

import { expect } from '@agentbench/core'
import { runMcpAgent } from '../src/agent'

const API_KEY = process.env.OPENAI_API_KEY ?? 'sk-test-key'

export async function listResourcesTest() {
  const result = await runMcpAgent({
    request: 'Show me all resources available on the filesystem server.',
    apiKey: API_KEY,
  })

  const completed = await expect(result).status().toBeCompleted().run()
  const listed = await expect(result).tool('mcp_list_resources').toBeCalled().run()

  return {
    completed: completed.allPassed,
    listed: listed.allPassed,
    details: { completed, listed },
  }
}

export async function readResourceTest() {
  const result = await runMcpAgent({
    request: 'Read the README resource from the filesystem server.',
    apiKey: API_KEY,
  })

  const completed = await expect(result).status().toBeCompleted().run()
  const read = await expect(result).tool('mcp_read_resource').toBeCalled().run()

  return {
    completed: completed.allPassed,
    read: read.allPassed,
    details: { completed, read },
  }
}
