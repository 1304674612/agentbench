/**
 * Test Suite: Code Quality Review
 *
 * Verifies the code review agent identifies bugs, suggests improvements,
 * and provides thorough analysis when reviewing code with known issues.
 */

import { expect } from '@agentbench/core'
import { runCodeReviewAgent } from '../agent'

const API_KEY = process.env.ANTHROPIC_API_KEY ?? 'sk-ant-test-key'

const CODE_WITH_BUGS = `
function calculateDiscount(price, discountPercent) {
  // Potential bug: no type checking, division by zero risk
  var final = price - (price * discountPercent / 100)
  return final
}

// Unused variable
var TAX_RATE = 0.08

function processOrder(items) {
  for (var i = 0; i <= items.length; i++) {
    // Bug: off-by-one error (should be i < items.length)
    console.log(items[i])
  }

  // Nested loops — performance concern
  for (var i = 0; i < items.length; i++) {
    for (var j = 0; j < items.length; j++) {
      if (items[i].id == items[j].id) {
        // Deep equality should use ===
      }
    }
  }
}
`.trim()

export async function codeQualityTest() {
  const result = await runCodeReviewAgent({
    code: CODE_WITH_BUGS,
    language: 'javascript',
    apiKey: API_KEY,
  })

  // Assertion 1: Agent used the analysis tool
  const usedAnalyzer = await expect(result)
    .tool('analyze_code').toBeCalled()
    .run()

  // Assertion 2: Output mentions bugs, issues, or improvements
  const identifiesIssues = await expect(result)
    .any([
      (b) => b.output().toContain('bug'),
      (b) => b.output().toContain('issue'),
      (b) => b.output().toContain('improvement'),
      (b) => b.output().toContain('error'),
      (b) => b.output().toContain('problem'),
    ])
    .run()

  // Assertion 3: Output mentions off-by-one or loop issue
  const catchesOffByOne = await expect(result)
    .any([
      (b) => b.output().toContain('off-by-one'),
      (b) => b.output().toContain('off by one'),
      (b) => b.output().toContain('loop'),
      (b) => b.output().toContain('<= items.length'),
      (b) => b.output().toContain('i <= items'),
    ])
    .run()

  // Assertion 4: Output mentions type safety or == vs ===
  const catchesTypeIssues = await expect(result)
    .any([
      (b) => b.output().toContain('==='),
      (b) => b.output().toContain('type'),
      (b) => b.output().toContain('strict equality'),
      (b) => b.output().toContain('var'),
      (b) => b.output().toMatchRegex(/\\bvar\\b/),
    ])
    .run()

  // Assertion 5: Completeness score > 6/10
  const completeness = await expect(result)
    .score('completeness').toBeGreaterThan(6)
    .run()

  return {
    usedAnalyzer: usedAnalyzer.allPassed,
    identifiesIssues: identifiesIssues.allPassed,
    catchesOffByOne: catchesOffByOne.allPassed,
    catchesTypeIssues: catchesTypeIssues.allPassed,
    completeness: completeness.allPassed,
    details: { usedAnalyzer, identifiesIssues, catchesOffByOne, catchesTypeIssues, completeness },
  }
}
