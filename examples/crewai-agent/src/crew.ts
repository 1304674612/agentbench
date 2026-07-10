/**
 * CrewAI Crew — Orchestrator that manages the agent workflow.
 *
 * Executes tasks in sequence: Research -> Write -> Review.
 * Each agent's output feeds into the next agent's context.
 */

import { runResearcher, runWriter, runReviewer, getAllResults } from './agents'
import type { AgentResult } from './agents'

export interface CrewResult {
  success: boolean
  topic: string
  research: AgentResult
  writing: AgentResult
  review: AgentResult
  finalOutput: string
  totalTime: number
}

export async function runCrew(topic: string): Promise<CrewResult> {
  const startTime = Date.now()

  // Step 1: Research
  const research = await runResearcher(`Research the topic: ${topic}`)

  // Step 2: Write based on research
  const writing = await runWriter(`Write about: ${topic}`, research.output)

  // Step 3: Review the writing
  const review = await runReviewer(writing.output, ['accuracy', 'clarity', 'completeness', 'tone'])

  const totalTime = Date.now() - startTime

  return {
    success: true,
    topic,
    research,
    writing,
    review,
    finalOutput: `# ${topic}\n\n${writing.output}\n\n## Quality Review\n${review.output}`,
    totalTime,
  }
}

export function getCrewStatus(): Record<string, unknown> {
  return {
    agents: ['researcher', 'writer', 'reviewer'],
    workflow: 'Research -> Write -> Review',
    results: getAllResults(),
  }
}
