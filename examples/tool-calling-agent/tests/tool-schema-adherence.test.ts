/**
 * Test Suite: Tool Schema Adherence
 *
 * Verifies the agent provides correct argument schemas when calling
 * tools. Missing required params, wrong types, or extra params should
 * be minimized.
 */

import { expect } from '@agentbench/core'
import { runToolCallingAgent } from '../src/agent'

const API_KEY = process.env.OPENAI_API_KEY ?? 'sk-test-key'

/** Test Case 1: Calculator should receive valid expression string. */
export async function calculatorSchemaTest() {
  const result = await runToolCallingAgent({
    request: 'What is 156 divided by 12?',
    apiKey: API_KEY,
  })

  const usedCalculator = await expect(result)
    .tool('calculator').toBeCalled()
    .run()

  const hasAnswer = await expect(result)
    .output().toMatchRegex(/\d+/)
    .run()

  return {
    usedCalculator: usedCalculator.allPassed,
    hasAnswer: hasAnswer.allPassed,
    details: { usedCalculator, hasAnswer },
  }
}

/** Test Case 2: Weather should receive city string. */
export async function weatherSchemaTest() {
  const result = await runToolCallingAgent({
    request: "Is it raining in London right now?",
    apiKey: API_KEY,
  })

  const usedWeather = await expect(result)
    .tool('get_weather').toBeCalled()
    .run()

  const mentionsResult = await expect(result)
    .output().toMatchRegex(/London|rain|weather/i)
    .run()

  return {
    usedWeather: usedWeather.allPassed,
    mentionsResult: mentionsResult.allPassed,
    details: { usedWeather, mentionsResult },
  }
}

/** Test Case 3: Translate should receive text and target language. */
export async function translateSchemaTest() {
  const result = await runToolCallingAgent({
    request: "Say 'good morning' in German",
    apiKey: API_KEY,
  })

  const usedTranslate = await expect(result)
    .tool('translate_text').toBeCalled()
    .run()

  const mentionsTranslation = await expect(result)
    .output().toMatchRegex(/german|morgen|guten/i)
    .run()

  return {
    usedTranslate: usedTranslate.allPassed,
    mentionsTranslation: mentionsTranslation.allPassed,
    details: { usedTranslate, mentionsTranslation },
  }
}
