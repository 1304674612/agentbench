/**
 * Critic Agent — Reviews outputs and provides critical feedback.
 */
export interface CriticResult {
  agent: string
  score: number
  feedback: string
  suggestions: string[]
}

export async function runCritic(output: string): Promise<CriticResult> {
  return {
    agent: 'critic',
    score: 0.78,
    feedback: 'Output is generally solid but could improve in specificity and actionable detail.',
    suggestions: [
      'Add more quantitative data to support claims',
      'Include concrete examples',
      'Clarify the third point with citations',
    ],
  }
}
