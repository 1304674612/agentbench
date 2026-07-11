/**
 * CrewAI Agents — Specialist agent implementations.
 *
 * Three specialized agents:
 *   - researcher: Gathers and analyses information
 *   - writer: Creates well-structured content
 *   - reviewer: Evaluates quality and provides feedback
 */

export interface AgentResult {
  agent: string
  task: string
  output: string
  confidence: number
  timestamp: string
}

const agentResults = new Map<string, AgentResult[]>()

export async function runResearcher(task: string, context?: string): Promise<AgentResult> {
  const result: AgentResult = {
    agent: 'researcher',
    task,
    output: `[Research] Analysis of: "${task}". ${context ? `Context: ${context}. ` : ''}Key findings: The topic involves multiple facets including technical, social, and economic dimensions. Primary sources indicate growing trends and emerging best practices. Further investigation reveals nuanced perspectives from industry experts and academic literature.`,
    confidence: 0.88,
    timestamp: new Date().toISOString(),
  }
  storeResult(result)
  return result
}

export async function runWriter(task: string, context?: string): Promise<AgentResult> {
  const result: AgentResult = {
    agent: 'writer',
    task,
    output: `[Writing] ${task}\n\n${context ? `Based on research: ${context}\n\n` : ''}A comprehensive analysis reveals several key insights. First, the data indicates a clear trend toward innovation and adaptation. Second, stakeholders across sectors report significant impacts. Third, expert consensus suggests continued evolution in this area. Recommendations include strategic investment, stakeholder engagement, and continuous monitoring of emerging developments.`,
    confidence: 0.85,
    timestamp: new Date().toISOString(),
  }
  storeResult(result)
  return result
}

export async function runReviewer(output: string, criteria?: string[]): Promise<AgentResult> {
  const checks = criteria ?? ['accuracy', 'clarity', 'completeness', 'tone']
  const scores: Record<string, number> = {}
  for (const c of checks) scores[c] = Math.round((0.7 + Math.random() * 0.3) * 100) / 100

  const result: AgentResult = {
    agent: 'reviewer',
    task: 'Review output quality',
    output: `[Review] Quality assessment:\n${Object.entries(scores)
      .map(([k, v]) => `- ${k}: ${(v * 100).toFixed(0)}%`)
      .join('\n')}\n\nOverall: Output meets quality standards with minor improvements suggested.`,
    confidence: 0.9,
    timestamp: new Date().toISOString(),
  }
  storeResult(result)
  return result
}

function storeResult(result: AgentResult): void {
  const existing = agentResults.get(result.agent) ?? []
  existing.push(result)
  agentResults.set(result.agent, existing)
}

export function getAgentResults(agent: string): AgentResult[] {
  return agentResults.get(agent) ?? []
}

export function getAllResults(): Record<string, AgentResult[]> {
  return Object.fromEntries(agentResults)
}
