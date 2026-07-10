/**
 * Test Suite: SELECT Queries
 *
 * Verifies the SQL agent generates correct SELECT queries for basic
 * data retrieval operations. Tests simple SELECTs, filtered SELECTs,
 * and multi-condition queries.
 */

import { expect } from '@agentbench/core'
import { runSqlAgent } from '../src/agent'

const API_KEY = process.env.OPENAI_API_KEY ?? 'sk-test-key'

/** Test Case 1: Simple SELECT with all columns from a table. */
export async function simpleSelectTest() {
  const result = await runSqlAgent({
    question: 'Find all active users',
    apiKey: API_KEY,
  })

  const hasSelect = await expect(result)
    .output().toMatchRegex(/SELECT/i)
    .run()

  const usesUsersTable = await expect(result)
    .output().toMatchRegex(/FROM\s+users/i)
    .run()

  const hasWhereClause = await expect(result)
    .output().toMatchRegex(/WHERE\s+.*status/i)
    .run()

  return {
    hasSelect: hasSelect.allPassed,
    usesUsersTable: usesUsersTable.allPassed,
    hasWhereClause: hasWhereClause.allPassed,
    details: { hasSelect, usesUsersTable, hasWhereClause },
  }
}

/** Test Case 2: SELECT with price filtering. */
export async function filteredSelectTest() {
  const result = await runSqlAgent({
    question: 'List all products with price greater than 50 dollars',
    apiKey: API_KEY,
  })

  const hasSelect = await expect(result)
    .output().toMatchRegex(/SELECT/i)
    .run()

  const usesCondition = await expect(result)
    .output().toMatchRegex(/WHERE.*price\s*>\s*50/i)
    .run()

  const usesProducts = await expect(result)
    .output().toMatchRegex(/FROM\s+products/i)
    .run()

  return {
    hasSelect: hasSelect.allPassed,
    usesCondition: usesCondition.allPassed,
    usesProducts: usesProducts.allPassed,
    details: { hasSelect, usesCondition, usesProducts },
  }
}

/** Test Case 3: SELECT with ORDER BY and LIMIT. */
export async function sortedSelectTest() {
  const result = await runSqlAgent({
    question: 'Get the top 5 most expensive products',
    apiKey: API_KEY,
  })

  const hasOrderBy = await expect(result)
    .output().toMatchRegex(/ORDER\s+BY/i)
    .run()

  const hasLimit = await expect(result)
    .output().toMatchRegex(/LIMIT\s+5/i)
    .run()

  const hasDesc = await expect(result)
    .output().toMatchRegex(/DESC/i)
    .run()

  return {
    hasOrderBy: hasOrderBy.allPassed,
    hasLimit: hasLimit.allPassed,
    hasDesc: hasDesc.allPassed,
    details: { hasOrderBy, hasLimit, hasDesc },
  }
}
