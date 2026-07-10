/**
 * Test Suite: JOIN Queries
 *
 * Verifies the SQL agent generates correct JOIN queries across multiple
 * tables. Tests INNER JOIN, LEFT JOIN, and multi-table JOINs.
 */

import { expect } from '@agentbench/core'
import { runSqlAgent } from '../src/agent'

const API_KEY = process.env.OPENAI_API_KEY ?? 'sk-test-key'

/** Test Case 1: INNER JOIN between orders and users. */
export async function innerJoinTest() {
  const result = await runSqlAgent({
    question: 'Show me all orders for user Alice',
    apiKey: API_KEY,
  })

  const hasJoin = await expect(result)
    .output().toMatchRegex(/JOIN/i)
    .run()

  const hasOnCondition = await expect(result)
    .output().toMatchRegex(/ON\s+.*=\s*.*/i)
    .run()

  const mentionsUsers = await expect(result)
    .output().toMatchRegex(/users/i)
    .run()

  return {
    hasJoin: hasJoin.allPassed,
    hasOnCondition: hasOnCondition.allPassed,
    mentionsUsers: mentionsUsers.allPassed,
    details: { hasJoin, hasOnCondition, mentionsUsers },
  }
}

/** Test Case 2: LEFT JOIN to find products without reviews. */
export async function leftJoinTest() {
  const result = await runSqlAgent({
    question: 'List all products that have never been reviewed',
    apiKey: API_KEY,
  })

  const hasJoin = await expect(result)
    .output().toMatchRegex(/LEFT\s+(OUTER\s+)?JOIN/i)
    .run()

  const hasNullCheck = await expect(result)
    .output().toMatchRegex(/IS\s+(NULL|NULL)/i)
    .run()

  const mentionsReviews = await expect(result)
    .output().toMatchRegex(/reviews/i)
    .run()

  return {
    hasJoin: hasJoin.allPassed,
    hasNullCheck: hasNullCheck.allPassed,
    mentionsReviews: mentionsReviews.allPassed,
    details: { hasJoin, hasNullCheck, mentionsReviews },
  }
}

/** Test Case 3: Multi-table JOIN for order details. */
export async function multiJoinTest() {
  const result = await runSqlAgent({
    question: 'Find all cancelled orders with their items and product names',
    apiKey: API_KEY,
  })

  const hasJoin = await expect(result)
    .output().toMatchRegex(/JOIN/i)
    .run()

  const hasCancelled = await expect(result)
    .output().toMatchRegex(/cancelled/i)
    .run()

  const mentionsOrderItems = await expect(result)
    .output().toMatchRegex(/order_items/i)
    .run()

  return {
    hasJoin: hasJoin.allPassed,
    hasCancelled: hasCancelled.allPassed,
    mentionsOrderItems: mentionsOrderItems.allPassed,
    details: { hasJoin, hasCancelled, mentionsOrderItems },
  }
}
