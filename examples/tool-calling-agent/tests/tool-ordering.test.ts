/**
 * Test Suite: Tool Ordering
 *
 * Verifies the agent calls tools in the correct order when tools
 * have dependencies (e.g., read config THEN send email, query DB
 * THEN calculate).
 */

import { expect } from '@agentbench/core'
import { runToolCallingAgent } from '../src/agent'

const API_KEY = process.env.OPENAI_API_KEY ?? 'sk-test-key'

/** Test Case 1: Read file first, then use its contents. */
export async function readThenActTest() {
  const result = await runToolCallingAgent({
    request: 'Read the config file at /data/config.json and tell me what port the server runs on',
    apiKey: API_KEY,
  })

  const usedFileRead = await expect(result)
    .tool('read_file').toBeCalled()
    .run()

  const mentionsPort = await expect(result)
    .output().toMatchRegex(/3000|port/i)
    .run()

  return {
    usedFileRead: usedFileRead.allPassed,
    mentionsPort: mentionsPort.allPassed,
    details: { usedFileRead, mentionsPort },
  }
}

/** Test Case 2: Query data then calculate from results. */
export async function queryThenCalculateTest() {
  const result = await runToolCallingAgent({
    request: 'Get all users from the database and tell me how many there are',
    apiKey: API_KEY,
  })

  const usedDatabase = await expect(result)
    .tool('query_database').toBeCalled()
    .run()

  const producedOutput = await expect(result)
    .output().toMatchRegex(/.{20,}/)
    .run()

  return {
    usedDatabase: usedDatabase.allPassed,
    producedOutput: producedOutput.allPassed,
    details: { usedDatabase, producedOutput },
  }
}

/** Test Case 3: Calendar check then email based on events. */
export async function calendarThenEmailTest() {
  const result = await runToolCallingAgent({
    request: 'Check what meetings I have today and send a summary to alice@example.com',
    apiKey: API_KEY,
  })

  const usedCalendar = await expect(result)
    .tool('check_calendar').toBeCalled()
    .run()

  const usedEmail = await expect(result)
    .tool('send_email').toBeCalled()
    .run()

  const producedOutput = await expect(result)
    .output().toMatchRegex(/.{30,}/)
    .run()

  return {
    usedCalendar: usedCalendar.allPassed,
    usedEmail: usedEmail.allPassed,
    producedOutput: producedOutput.allPassed,
    details: { usedCalendar, usedEmail, producedOutput },
  }
}
