/**
 * Snapshot Manager
 *
 * Create, list, restore, and compare snapshots of agent state.
 * A snapshot captures the complete agent context for reproducible execution.
 */

import type { Snapshot, SnapshotData } from '../types/snapshot'
import type { AgentConfig, RunConfig, RunInput, RunOptions } from '../types/run'
import type { ExecutionTrace } from '../types/trace'

// ============================================================
// Snapshot Creation
// ============================================================

export interface SnapshotCreateInput {
  projectId: string
  runId?: string
  name: string
  description?: string
  type: 'manual' | 'auto' | 'ci'
  agent: {
    name: string
    version?: string
    config: AgentConfig
  }
  prompt: {
    system: string
    user?: string
    template?: string
    variables: Record<string, string>
  }
  model: {
    provider: string
    name: string
    temperature: number
    maxTokens: number
    topP?: number
  }
  tools: Array<{
    name: string
    description: string
    parameters: Record<string, unknown>
  }>
  context: {
    messages: Array<{ role: string; content: string | null; name?: string }>
    memory?: Record<string, unknown>
    documents?: Array<{ id: string; content: string; metadata?: Record<string, unknown> }>
  }
  input: RunInput
  options: RunOptions
  execution?: ExecutionTrace
  environment?: {
    os?: string
    runtime?: string
    dependencies?: Record<string, string>
  }
  tags?: string[]
}

export interface SnapshotSummary {
  id: string
  projectId: string
  runId?: string
  name: string
  description?: string
  type: string
  tags: string[]
  /** Number of tools in the snapshot */
  toolCount: number
  /** Number of messages in context */
  messageCount: number
  /** Number of steps if execution trace is captured */
  stepCount: number
  createdAt: Date
}

/**
 * Build a SnapshotData object from the creation input.
 */
export function buildSnapshotData(input: SnapshotCreateInput): SnapshotData {
  return {
    agent: {
      name: input.agent.name,
      version: input.agent.version,
      config: input.agent.config,
    },
    prompt: {
      system: input.prompt.system,
      user: input.prompt.user,
      template: input.prompt.template,
      variables: input.prompt.variables,
    },
    model: {
      provider: input.model.provider,
      name: input.model.name,
      temperature: input.model.temperature,
      maxTokens: input.model.maxTokens,
      topP: input.model.topP,
    },
    tools: input.tools.map((t) => ({
      name: t.name,
      description: t.description,
      parameters: t.parameters,
    })),
    context: {
      messages: input.context.messages.map((m) => ({
        role: m.role as 'system' | 'user' | 'assistant' | 'tool',
        content: m.content,
        name: m.name,
      })),
      memory: input.context.memory,
      documents: input.context.documents?.map((d) => ({
        id: d.id,
        content: d.content,
        metadata: d.metadata,
      })),
    },
    input: input.input,
    options: input.options,
    execution: input.execution,
    environment: {
      os: input.environment?.os ?? 'unknown',
      runtime: input.environment?.runtime ?? 'node',
      dependencies: input.environment?.dependencies ?? {},
    },
  }
}

/**
 * Extract SnapshotData from a completed RunConfig and ExecutionTrace.
 */
export function captureSnapshotFromRun(
  runId: string,
  projectId: string,
  name: string,
  config: RunConfig,
  trace: ExecutionTrace,
  options?: { description?: string; tags?: string[]; type?: 'manual' | 'auto' | 'ci' },
): SnapshotCreateInput {
  return {
    projectId,
    runId,
    name,
    description: options?.description,
    type: options?.type ?? 'auto',
    agent: {
      name: config.name,
      config: config.agent,
    },
    prompt: {
      system: config.agent.systemPrompt,
      variables: config.input.variables ?? {},
    },
    model: {
      provider: config.agent.provider,
      name: config.agent.model,
      temperature: config.agent.temperature,
      maxTokens: config.agent.maxTokens,
    },
    tools: (config.agent.tools ?? []).map((t) => ({
      name: t.name,
      description: t.description,
      parameters: t.parameters,
    })),
    context: {
      messages: config.input.messages.map((m) => ({
        role: m.role,
        content: m.content,
      })),
    },
    input: config.input,
    options: config.options,
    execution: trace,
    tags: options?.tags ?? [],
  }
}

/**
 * Create a summary from a snapshot for listing.
 */
export function snapshotToSummary(snapshot: Snapshot): SnapshotSummary {
  const data = snapshot.data
  return {
    id: snapshot.id,
    projectId: snapshot.projectId,
    runId: snapshot.runId,
    name: snapshot.name,
    description: snapshot.description,
    type: snapshot.type,
    tags: snapshot.tags ?? [],
    toolCount: data.tools?.length ?? 0,
    messageCount: data.context?.messages?.length ?? 0,
    stepCount: data.execution?.steps?.length ?? 0,
    createdAt: snapshot.createdAt,
  }
}

// ============================================================
// Snapshot Comparison
// ============================================================

export interface SnapshotDiff {
  /** Whether the snapshots are identical */
  identical: boolean
  /** Differences found */
  changes: SnapshotChange[]
  /** Summary of the comparison */
  summary: string
}

export interface SnapshotChange {
  path: string
  type: 'added' | 'removed' | 'modified'
  before?: unknown
  after?: unknown
  description: string
}

/**
 * Compare two snapshots and return the differences.
 */
export function compareSnapshots(
  snapshotA: SnapshotData,
  snapshotB: SnapshotData,
): SnapshotDiff {
  const changes: SnapshotChange[] = []

  // Compare prompt
  if (snapshotA.prompt.system !== snapshotB.prompt.system) {
    changes.push({
      path: 'prompt.system',
      type: 'modified',
      description: 'System prompt changed',
    })
  }

  // Compare model
  if (snapshotA.model.provider !== snapshotB.model.provider) {
    changes.push({
      path: 'model.provider',
      type: 'modified',
      before: snapshotA.model.provider,
      after: snapshotB.model.provider,
      description: `Model provider changed: ${snapshotA.model.provider} → ${snapshotB.model.provider}`,
    })
  }
  if (snapshotA.model.name !== snapshotB.model.name) {
    changes.push({
      path: 'model.name',
      type: 'modified',
      before: snapshotA.model.name,
      after: snapshotB.model.name,
      description: `Model changed: ${snapshotA.model.name} → ${snapshotB.model.name}`,
    })
  }
  if (snapshotA.model.temperature !== snapshotB.model.temperature) {
    changes.push({
      path: 'model.temperature',
      type: 'modified',
      before: snapshotA.model.temperature,
      after: snapshotB.model.temperature,
      description: `Temperature changed: ${snapshotA.model.temperature} → ${snapshotB.model.temperature}`,
    })
  }
  if (snapshotA.model.maxTokens !== snapshotB.model.maxTokens) {
    changes.push({
      path: 'model.maxTokens',
      type: 'modified',
      before: snapshotA.model.maxTokens,
      after: snapshotB.model.maxTokens,
      description: `Max tokens changed: ${snapshotA.model.maxTokens} → ${snapshotB.model.maxTokens}`,
    })
  }

  // Compare tools
  const toolsA = new Set(snapshotA.tools.map((t) => t.name))
  const toolsB = new Set(snapshotB.tools.map((t) => t.name))

  for (const tool of snapshotA.tools) {
    if (!toolsB.has(tool.name)) {
      changes.push({
        path: `tools.${tool.name}`,
        type: 'removed',
        description: `Tool "${tool.name}" removed`,
      })
    }
  }
  for (const tool of snapshotB.tools) {
    if (!toolsA.has(tool.name)) {
      changes.push({
        path: `tools.${tool.name}`,
        type: 'added',
        description: `Tool "${tool.name}" added`,
      })
    }
  }

  // Compare tools that exist in both — check parameter changes
  for (const toolA of snapshotA.tools) {
    const toolB = snapshotB.tools.find((t) => t.name === toolA.name)
    if (toolB) {
      if (JSON.stringify(toolA.parameters) !== JSON.stringify(toolB.parameters)) {
        changes.push({
          path: `tools.${toolA.name}.parameters`,
          type: 'modified',
          description: `Tool "${toolA.name}" parameters changed`,
        })
      }
    }
  }

  // Compare messages count
  const msgsA = snapshotA.context?.messages?.length ?? 0
  const msgsB = snapshotB.context?.messages?.length ?? 0
  if (msgsA !== msgsB) {
    changes.push({
      path: 'context.messages',
      type: 'modified',
      before: msgsA,
      after: msgsB,
      description: `Message count changed: ${msgsA} → ${msgsB}`,
    })
  }

  // Compare options
  const optsA = snapshotA.options
  const optsB = snapshotB.options
  if (optsA && optsB) {
    if (optsA.timeout !== optsB.timeout) {
      changes.push({
        path: 'options.timeout',
        type: 'modified',
        before: optsA.timeout,
        after: optsB.timeout,
        description: `Timeout changed: ${optsA.timeout}ms → ${optsB.timeout}ms`,
      })
    }
    if (optsA.maxSteps !== optsB.maxSteps) {
      changes.push({
        path: 'options.maxSteps',
        type: 'modified',
        before: optsA.maxSteps,
        after: optsB.maxSteps,
        description: `Max steps changed: ${optsA.maxSteps} → ${optsB.maxSteps}`,
      })
    }
  }

  return {
    identical: changes.length === 0,
    changes,
    summary:
      changes.length === 0
        ? 'Snapshots are identical'
        : `${changes.length} change(s) detected`,
  }
}

/**
 * Restore a RunConfig from a snapshot for replay.
 */
export function restoreConfigFromSnapshot(data: SnapshotData): RunConfig {
  return {
    name: `${data.agent.name} (replay)`,
    description: `Replay from snapshot`,
    projectId: '', // Must be set by caller
    agent: {
      ...data.agent.config,
      provider: data.model.provider as AgentConfig['provider'],
      model: data.model.name,
      temperature: data.model.temperature,
      maxTokens: data.model.maxTokens,
      systemPrompt: data.prompt.system,
      tools: data.tools.map((t) => ({
        name: t.name,
        description: t.description,
        parameters: t.parameters,
      })),
    },
    input: {
      messages: (data.context?.messages ?? []).map((m) => ({
        role: m.role as 'user' | 'assistant',
        content: m.content ?? '',
      })),
      variables: data.prompt.variables,
    },
    options: data.options,
    tags: ['replay', 'from-snapshot'],
  }
}
