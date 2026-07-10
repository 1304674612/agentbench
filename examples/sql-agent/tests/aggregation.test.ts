/**
 * Test Suite: Aggregation Queries
 *
 * Verifies the SQL agent generates correct aggregation queries using
 * COUNT, SUM, AVG, MAX, MIN with GROUP BY and HAVING clauses.
 */

import { expect } from '@agentbench/core'
import { runSqlAgent } from '../src/agent'

const API_KEY = process.env.OPENAI_API_KEY ?? 'sk-test-key'

/** Test Case 1: COUNT with GROUP BY. */
export async function countGroupByTest() {
  const result = await runSqlAgent({
    question: 'Count how many products are in each category',
    apiKey: API_KEY,
  })

  const hasCount = await expect(result)
    .output().toMatchRegex(/COUNT/i)
    .run()

  const hasGroupBy = await expect(result)
    .output().toMatchRegex(/GROUP\s+BY/i)
    .run()

  const usesCategories = await expect(result)
    .output().toMatchRegex(/categories/i)
    .run()

  return {
    hasCount: hasCount.allPassed,
    hasGroupBy: hasGroupBy.allPassed,
    usesCategories: usesCategories.allPassed,
    details: { hasCount, hasGroupBy, usesCategories },
  }
}

/** Test Case 2: AVG with GROUP BY. */
export async function avgGroupByTest() {
  const result = await runSqlAgent({
    question: 'Find the average rating for each product',
    apiKey: API_KEY,
  })

  const hasAvg = await expect(result)
    .output().toMatchRegex(/AVG/i)
    .run()

  const hasGroupBy = await expect(result)
    .output().toMatchRegex(/GROUP\s+BY/i)
    .run()

  const usesReviews = await expect(result)
    .output().toMatchRegex(/reviews/i)
    .run()

  return {
    hasAvg: hasAvg.allPassed,
    hasGroupBy: hasGroupBy.allPassed,
    usesReviews: usesReviews.allPassed,
    details: { hasAvg, hasGroupBy, usesReviews },
  }
}

/** Test Case 3: HAVING with GROUP BY. */
export async function havingClauseTest() {
  const result = await runSqlAgent({
    question: 'Find users who have placed more than 2 orders',
    apiKey: API_KEY,
  })

  const hasCount = await expect(result)
    .output().toMatchRegex(/COUNT/i)
    .run()

  const hasHaving = await expect(result)
    .output().toMatchRegex(/HAVING/i)
    .run()

  const usesOrders = await expect(result)
    .output().toMatchRegex(/orders/i)
    .run()

  return {
    hasCount: hasCount.allPassed,
    hasHaving: hasHaving.allPassed,
    usesOrders: usesOrders.allPassed,
    details: { hasCount, hasHaving, usesOrders },
  }
}
