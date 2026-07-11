/**
 * Test Suite: Schema Awareness
 *
 * Verifies the SQL agent respects the provided schema and does not
 * hallucinate table or column names. Tests that queries only reference
 * valid tables and columns, and the agent handles unsupported queries
 * gracefully.
 */

import { expect } from '@agentbench/core'
import { runSqlAgent } from '../src/agent'

const API_KEY = process.env.OPENAI_API_KEY ?? 'sk-test-key'

/** Test Case 1: Agent uses valid table names from the schema. */
export async function validTableNamesTest() {
  const result = await runSqlAgent({
    question: 'Show all products with their category names',
    apiKey: API_KEY,
  })

  const hasSelect = await expect(result)
    .output()
    .toMatchRegex(/SELECT/i)
    .run()

  // Should use actual schema tables: products, categories
  const usesProducts = await expect(result)
    .output()
    .toMatchRegex(/products/i)
    .run()

  // Should NOT reference non-existent tables
  const noHallucination = await expect(result)
    .output()
    .not.toMatchRegex(/inventory|items|goods/i)
    .run()

  return {
    hasSelect: hasSelect.allPassed,
    usesProducts: usesProducts.allPassed,
    noHallucination: noHallucination.allPassed,
    details: { hasSelect, usesProducts, noHallucination },
  }
}

/** Test Case 2: Agent uses correct column names from schema. */
export async function validColumnNamesTest() {
  const result = await runSqlAgent({
    question: 'Get the email and status of all active users',
    apiKey: API_KEY,
  })

  // Should use 'email' not 'mail' or 'email_address'
  const usesEmail = await expect(result).output().toMatchRegex(/email/i).run()

  // Should use 'status' not 'state' or 'active_status'
  const usesStatus = await expect(result)
    .output()
    .toMatchRegex(/status/i)
    .run()

  const fromUsers = await expect(result)
    .output()
    .toMatchRegex(/FROM\s+users/i)
    .run()

  return {
    usesEmail: usesEmail.allPassed,
    usesStatus: usesStatus.allPassed,
    fromUsers: fromUsers.allPassed,
    details: { usesEmail, usesStatus, fromUsers },
  }
}

/** Test Case 3: Agent handles unsupported queries by explaining. */
export async function unsupportedQueryTest() {
  const result = await runSqlAgent({
    question: 'Plot a chart of sales trends over the last decade',
    apiKey: API_KEY,
  })

  const hasOutput = await expect(result)
    .output()
    .toMatchRegex(/.{20,}/)
    .run()

  // Agent should either explain it can't do plotting, or generate a data-fetching query
  const reasonable = await expect(result)
    .any([
      (b) => b.output().toMatchRegex(/cannot|not possible|unable|can't|chart|plot|visualization/i),
      (b) => b.output().toMatchRegex(/SELECT/i),
    ])
    .run()

  return {
    hasOutput: hasOutput.allPassed,
    reasonable: reasonable.allPassed,
    details: { hasOutput, reasonable },
  }
}
