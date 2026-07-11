/**
 * Test Suite: Research Quality
 *
 * Verifies the research agent follows a proper research process:
 * searches before answering, cites sources, and stays factual rather than
 * hallucinating information.
 */

import { expect } from '@agentbench/core'
import { runResearchAgent } from '../agent'

const API_KEY = process.env.OPENAI_API_KEY ?? 'sk-test-key'

export async function researchQualityTest() {
  const result = await runResearchAgent({
    query: 'What are the latest developments in quantum computing?',
    apiKey: API_KEY,
  })

  // Assertion 1: Agent searched the web before answering
  const searchedFirst = await expect(result).tool('web_search').toBeCalled().run()

  // Assertion 2: Agent cited its sources
  const citedSources = await expect(result).tool('cite_sources').toBeCalled().run()

  // Assertion 3: Output contains URLs (i.e., actual citations, not just claims)
  const containsUrls = await expect(result).output().toContain('http').run()

  // Assertion 4: Output is substantial (not just a one-liner)
  const substantial = await expect(result)
    .output()
    .toMatchRegex(/.{200,}/)
    .run()

  // Assertion 5: Faithfulness score > 7/10
  const faithfulness = await expect(result).score('faithfulness').toBeGreaterThan(7).run()

  return {
    searchedFirst: searchedFirst.allPassed,
    citedSources: citedSources.allPassed,
    containsUrls: containsUrls.allPassed,
    substantial: substantial.allPassed,
    faithfulness: faithfulness.allPassed,
    details: { searchedFirst, citedSources, containsUrls, substantial, faithfulness },
  }
}
