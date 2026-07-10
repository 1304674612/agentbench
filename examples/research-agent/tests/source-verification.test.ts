/**
 * Test Suite: Source Verification
 *
 * Verifies the research agent cross-references claims across multiple
 * sources rather than relying on a single source or hallucinating.
 */

import { expect } from '@agentbench/core'
import { runResearchAgent } from '../agent'

const API_KEY = process.env.OPENAI_API_KEY ?? 'sk-test-key'

export async function sourceVerificationTest() {
  const result = await runResearchAgent({
    query: 'What is the scientific consensus on climate change?',
    apiKey: API_KEY,
  })

  // Assertion 1: Agent searched the web (should search before answering)
  // The agent should search with relevant queries to gather information
  const searched = await expect(result)
    .tool('web_search').toBeCalled()
    .run()

  // Assertion 2: Agent fetched at least one page to verify claims
  const fetchedPages = await expect(result)
    .tool('fetch_page').toBeCalled()
    .run()

  // Assertion 3: Output references sources or attribution language
  const hasAttribution = await expect(result)
    .output().toMatchRegex(/according to|source|reference|reported by|found that|states that/i)
    .run()

  // Assertion 4: Output mentions specific organizations or reports
  const specificSources = await expect(result)
    .any([
      (b) => b.output().toContain('IPCC'),
      (b) => b.output().toContain('NOAA'),
      (b) => b.output().toContain('NASA'),
      (b) => b.output().toContain('Climate.gov'),
    ])
    .run()

  // Assertion 5: Agent summarized fetched content (indicates reading, not just collecting URLs)
  const summarized = await expect(result)
    .tool('summarize').toBeCalled()
    .run()

  return {
    searched: searched.allPassed,
    fetchedPages: fetchedPages.allPassed,
    hasAttribution: hasAttribution.allPassed,
    specificSources: specificSources.allPassed,
    summarized: summarized.allPassed,
    details: { searched, fetchedPages, hasAttribution, specificSources, summarized },
  }
}
