import type { AgentConfig, RunInput, RunOptions } from './run'
import type { ExecutionTrace, Message } from './trace'

export type SnapshotType = 'manual' | 'auto' | 'ci'

export interface Snapshot {
  id: string
  projectId: string
  runId?: string
  name: string
  description?: string
  type: SnapshotType
  data: SnapshotData
  tags?: string[]
  createdAt: Date
}

export interface SnapshotData {
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
  tools: SnapshotTool[]
  context: {
    messages: Message[]
    memory?: Record<string, unknown>
    documents?: SnapshotDocument[]
  }
  input: RunInput
  options: RunOptions
  execution?: ExecutionTrace
  environment: {
    os: string
    runtime: string
    dependencies: Record<string, string>
  }
}

export interface SnapshotTool {
  name: string
  description: string
  parameters: Record<string, unknown>
}

export interface SnapshotDocument {
  id: string
  content: string
  metadata?: Record<string, unknown>
}
