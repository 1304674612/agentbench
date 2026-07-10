/**
 * CrewAI Tasks — Task definitions for the crew workflow.
 *
 * Tasks define what each agent should do, in what order, and with
 * what expected outputs.
 */

export interface Task {
  id: string
  agent: 'researcher' | 'writer' | 'reviewer'
  description: string
  expectedOutput: string
  context?: string
  dependsOn?: string[]
}

export function createResearchTask(topic: string): Task {
  return {
    id: 'research-1',
    agent: 'researcher',
    description: `Research the topic: ${topic}`,
    expectedOutput: 'Comprehensive analysis with key findings and sources',
  }
}

export function createWritingTask(topic: string, context?: string): Task {
  return {
    id: 'writing-1',
    agent: 'writer',
    description: `Write content about: ${topic}`,
    expectedOutput: 'Well-structured content with clear sections',
    context,
    dependsOn: ['research-1'],
  }
}

export function createReviewTask(output: string): Task {
  return {
    id: 'review-1',
    agent: 'reviewer',
    description: 'Review and assess the quality of the written output',
    expectedOutput: 'Quality scores and improvement suggestions',
    context: output,
    dependsOn: ['writing-1'],
  }
}

export function createFullWorkflow(topic: string): Task[] {
  return [createResearchTask(topic), createWritingTask(topic), createReviewTask('')]
}
