/**
 * Test Suite: Tool Selection
 *
 * Verifies the agent selects the correct tool(s) for different types
 * of requests. Each test case maps a user request to its expected tool.
 */

import { expect } from '@agentbench/core'
import { runToolCallingAgent } from '../src/agent'

const API_KEY = process.env.OPENAI_API_KEY ?? 'sk-test-key'

/** Test Case 1: Weather requests should use get_weather. */
export async function weatherToolSelectionTest() {
  const result = await runToolCallingAgent({
    request: "What's the weather like in Tokyo today?",
    apiKey: API_KEY,
  })

  const usedWeather = await expect(result)
    .tool('get_weather').toBeCalled()
    .run()

  const mentionsTokyo = await expect(result)
    .output().toMatchRegex(/Tokyo|28|sunny/i)
    .run()

  return {
    usedWeather: usedWeather.allPassed,
    mentionsTokyo: mentionsTokyo.allPassed,
    details: { usedWeather, mentionsTokyo },
  }
}

/** Test Case 2: Math requests should use calculator. */
export async function calculatorToolSelectionTest() {
  const result = await runToolCallingAgent({
    request: 'Calculate 15% tip on a bill of 85.50 dollars',
    apiKey: API_KEY,
  })

  const usedCalculator = await expect(result)
    .tool('calculator').toBeCalled()
    .run()

  const producedAnswer = await expect(result)
    .output().toMatchRegex(/.{20,}/)
    .run()

  return {
    usedCalculator: usedCalculator.allPassed,
    producedAnswer: producedAnswer.allPassed,
    details: { usedCalculator, producedAnswer },
  }
}

/** Test Case 3: Translation requests should use translate_text. */
export async function translateToolSelectionTest() {
  const result = await runToolCallingAgent({
    request: 'Translate "hello" to French',
    apiKey: API_KEY,
  })

  const usedTranslate = await expect(result)
    .tool('translate_text').toBeCalled()
    .run()

  const mentionsTranslation = await expect(result)
    .output().toMatchRegex(/bonjour|tradui/i)
    .run()

  return {
    usedTranslate: usedTranslate.allPassed,
    mentionsTranslation: mentionsTranslation.allPassed,
    details: { usedTranslate, mentionsTranslation },
  }
}
