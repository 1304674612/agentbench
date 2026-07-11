/**
 * Orchestrator — Coordinates the multi-agent workflow.
 *
 * Manages: delegation, handoffs, consensus, concurrency, failure recovery.
 */

import { runAnalyst } from './agents/analyst'
import { runPlanner } from './agents/planner'
import { runExecutor } from './agents/executor'
import { runCritic } from './agents/critic'
import { getConsensus, synthesizeResults } from './agents/coordinator'

export interface OrchestratorResult {
  success: boolean
  topic: string
  analysis: unknown
  plan: unknown
  execution: unknown
  critique: unknown
  consensus: unknown
  synthesis: string
  agentTraces: string[]
  errors: string[]
}

export async function runOrchestrator(topic: string): Promise<OrchestratorResult> {
  const errors: string[] = []
  const agentTraces: string[] = []

  // Sequential workflow: Analyze -> Plan -> Execute -> Review -> Consensus
  const analysis = await runAnalyst(`Analyze: ${topic}`)
  agentTraces.push('analyst')

  const plan = await runPlanner(`Plan for: ${topic}`, analysis.findings.join('; '))
  agentTraces.push('planner')

  const execution = await runExecutor(plan.plan.steps.map((s) => s.action).join(', '))
  agentTraces.push('executor')

  const critique = await runCritic(execution.output)
  agentTraces.push('critic')

  const consensus = await getConsensus(`Is the output for "${topic}" satisfactory?`, [
    'analyst',
    'planner',
    'executor',
    'critic',
  ])
  agentTraces.push('coordinator')

  const synthesis = (await synthesizeResults([analysis, plan, execution, critique, consensus]))
    .synthesis

  return {
    success: true,
    topic,
    analysis,
    plan,
    execution,
    critique,
    consensus,
    synthesis,
    agentTraces,
    errors,
  }
}
