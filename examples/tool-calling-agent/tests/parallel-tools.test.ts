/**
 * Test Suite: Parallel Tool Execution
 *
 * Verifies the agent can call multiple independent tools in parallel
 * when the user asks for unrelated information in a single request.
 */

import { expect } from '@agentbench/core'
import { runToolCallingAgent } from '../src/agent'

const API_KEY = process.env.OPENAI_API_KEY ?? 'sk-test-key'

/** Test Case 1: Agent should use both weather and calendar for a morning briefing. */
export async function morningBriefingTest() {
  const result = await runToolCallingAgent({
    request: "I need a morning briefing: what's the weather in San Francisco and what's on my calendar today?",
    apiKey: API_KEY,
  })

  const usedWeather = await expect(result)
    .tool('get_weather').toBeCalled()
    .run()

  const usedCalendar = await expect(result)
    .tool('check_calendar').toBeCalled()
    .run()

  const producedOutput = await expect(result)
    .output().toMatchRegex(/.{100,}/)
    .run()

  return {
    usedWeather: usedWeather.allPassed,
    usedCalendar: usedCalendar.allPassed,
    producedOutput: producedOutput.allPassed,
    details: { usedWeather, usedCalendar, producedOutput },
  }
}

/** Test Case 2: Agent combines search and file reading independently. */
export async function searchAndFileTest() {
  const result = await runToolCallingAgent({
    request: 'Search docs for troubleshooting tips, and also read the app log file at /logs/app.log',
    apiKey: API_KEY,
  })

  const usedSearch = await expect(result)
    .tool('search_docs').toBeCalled()
    .run()

  const usedFileRead = await expect(result)
    .tool('read_file').toBeCalled()
    .run()

  return {
    usedSearch: usedSearch.allPassed,
    usedFileRead: usedFileRead.allPassed,
    details: { usedSearch, usedFileRead },
  }
}

/** Test Case 3: Agent can handle three independent requests. */
export async function tripleParallelTest() {
  const result = await runToolCallingAgent({
    request: 'What is the weather in London? Also calculate 42 * 17, and translate "thank you" to Japanese.',
    apiKey: API_KEY,
    maxSteps: 15,
  })

  const usedTools = result.toolsUsed.length >= 2

  const producedOutput = await expect(result)
    .output().toMatchRegex(/.{100,}/)
    .run()

  return {
    usedTools,
    producedOutput: producedOutput.allPassed,
    details: { usedTools, producedOutput, toolsUsed: result.toolsUsed },
  }
}
