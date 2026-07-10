import { describe, it, expect } from 'vitest'
import {
  buildSnapshotData,
  captureSnapshotFromRun,
  snapshotToSummary,
  compareSnapshots,
  restoreConfigFromSnapshot,
  type SnapshotCreateInput,
} from './snapshot-manager'
import type { Snapshot, SnapshotData } from '../types/snapshot'
import type { RunConfig, AgentConfig, RunInput, RunOptions } from '../types/run'
import type { ExecutionTrace } from '../types/trace'

function createSnapshotInput(overrides?: Partial<SnapshotCreateInput>): SnapshotCreateInput {
  return {
    projectId: 'proj_1',
    runId: 'run_1',
    name: 'Test Snapshot',
    description: 'Snapshot for testing',
    type: 'manual',
    agent: {
      name: 'TestAgent',
      version: '1.0.0',
      config: {
        provider: 'openai',
        model: 'gpt-4o',
        temperature: 0.7,
        maxTokens: 4096,
        systemPrompt: 'You are a helpful assistant.',
        tools: [{ name: 'search', description: 'Search the web', parameters: { type: 'object' } }],
      },
    },
    prompt: {
      system: 'You are a helpful assistant.',
      user: 'What is AI?',
      template: 'Answer the question: {question}',
      variables: { question: 'What is AI?' },
    },
    model: {
      provider: 'openai',
      name: 'gpt-4o',
      temperature: 0.7,
      maxTokens: 4096,
      topP: 0.9,
    },
    tools: [
      { name: 'search', description: 'Search the web', parameters: { type: 'object', properties: { query: { type: 'string' } } } },
      { name: 'calculator', description: 'Perform calculations', parameters: { type: 'object', properties: { expression: { type: 'string' } } } },
    ],
    context: {
      messages: [
        { role: 'system', content: 'You are helpful.' },
        { role: 'user', content: 'What is AI?' },
      ],
      memory: { previous_topic: 'machine learning' },
      documents: [{ id: 'doc_1', content: 'AI is artificial intelligence.', metadata: { source: 'wiki' } }],
    },
    input: {
      messages: [{ role: 'user', content: 'What is AI?' }],
      variables: { question: 'What is AI?' },
    },
    options: {
      timeout: 120000,
      maxSteps: 50,
      retries: 0,
      concurrency: 1,
    },
    environment: {
      os: 'macOS',
      runtime: 'Node.js 20',
      dependencies: { '@agentbench/core': '1.0.0' },
    },
    tags: ['test', 'v1'],
    ...overrides,
  }
}

function createMockTrace(): ExecutionTrace {
  return {
    id: 'trace_1',
    runId: 'run_1',
    steps: [
      {
        id: 'step_1',
        sequence: 1,
        type: 'llm_call',
        startedAt: new Date('2025-01-01T00:00:00Z'),
        endedAt: new Date('2025-01-01T00:00:01Z'),
        duration: 1000,
        llmProvider: 'openai',
        llmModel: 'gpt-4o',
        status: 'success',
        promptTokens: 100,
        completionTokens: 50,
        totalTokens: 150,
        cost: 0.001,
      },
      {
        id: 'step_2',
        sequence: 2,
        type: 'tool_call',
        startedAt: new Date('2025-01-01T00:00:01Z'),
        endedAt: new Date('2025-01-01T00:00:02Z'),
        duration: 500,
        toolName: 'search',
        status: 'success',
      },
      {
        id: 'step_3',
        sequence: 3,
        type: 'response',
        startedAt: new Date('2025-01-01T00:00:02Z'),
        endedAt: new Date('2025-01-01T00:00:02Z'),
        duration: 100,
        llmResponse: {
          content: 'AI stands for Artificial Intelligence.',
          finishReason: 'stop',
          usage: { promptTokens: 0, completionTokens: 0, totalTokens: 0 },
          model: 'gpt-4o',
        },
        status: 'success',
      },
    ],
    metadata: { agentName: 'TestAgent', environment: 'development' },
    createdAt: new Date('2025-01-01T00:00:00Z'),
  }
}

describe('Snapshot Manager', () => {
  describe('buildSnapshotData', () => {
    it('builds snapshot data from input', () => {
      const input = createSnapshotInput()
      const data = buildSnapshotData(input)

      expect(data.agent.name).toBe('TestAgent')
      expect(data.agent.version).toBe('1.0.0')
      expect(data.prompt.system).toBe('You are a helpful assistant.')
      expect(data.prompt.variables).toEqual({ question: 'What is AI?' })
      expect(data.model.provider).toBe('openai')
      expect(data.model.name).toBe('gpt-4o')
      expect(data.model.temperature).toBe(0.7)
      expect(data.tools).toHaveLength(2)
      expect(data.tools[0].name).toBe('search')
      expect(data.context.messages).toHaveLength(2)
      expect(data.context.documents).toHaveLength(1)
      expect(data.environment.os).toBe('macOS')
      expect(data.environment.runtime).toBe('Node.js 20')
    })

    it('includes full context: messages, memory, documents', () => {
      const input = createSnapshotInput()
      const data = buildSnapshotData(input)

      expect(data.context.messages[0].role).toBe('system')
      expect(data.context.messages[1].role).toBe('user')
      expect(data.context.memory).toEqual({ previous_topic: 'machine learning' })
      expect(data.context.documents![0].id).toBe('doc_1')
      expect(data.context.documents![0].metadata).toEqual({ source: 'wiki' })
    })

    it('handles missing optional fields', () => {
      const input = createSnapshotInput({
        description: undefined,
        environment: undefined,
        context: {
          messages: [{ role: 'user', content: 'Hello' }],
        },
      })

      const data = buildSnapshotData(input)

      expect(data.environment.os).toBe('unknown')
      expect(data.environment.runtime).toBe('node')
      expect(data.environment.dependencies).toEqual({})
    })

    it('preserves execution trace when provided', () => {
      const trace = createMockTrace()
      const input = createSnapshotInput()
      input.execution = trace

      const data = buildSnapshotData(input)

      expect(data.execution).toBeDefined()
      expect(data.execution!.steps).toHaveLength(3)
    })
  })

  describe('captureSnapshotFromRun', () => {
    it('creates snapshot input from a run config and trace', () => {
      const runConfig: RunConfig = {
        name: 'Test Run',
        projectId: 'proj_1',
        agent: {
          provider: 'openai',
          model: 'gpt-4o',
          temperature: 0.7,
          maxTokens: 4096,
          systemPrompt: 'You are helpful.',
          tools: [{ name: 'search', description: 'Search', parameters: { type: 'object' } }],
        },
        input: {
          messages: [{ role: 'user', content: 'Hello' }],
          variables: { lang: 'en' },
        },
        options: { timeout: 60000, maxSteps: 10, retries: 2, concurrency: 1, seed: 42 },
      }

      const trace = createMockTrace()

      const input = captureSnapshotFromRun('run_1', 'proj_1', 'Auto Snapshot', runConfig, trace, {
        description: 'Auto-captured',
        tags: ['auto'],
        type: 'auto',
      })

      expect(input.projectId).toBe('proj_1')
      expect(input.runId).toBe('run_1')
      expect(input.name).toBe('Auto Snapshot')
      expect(input.type).toBe('auto')
      expect(input.agent.name).toBe('Test Run')
      expect(input.model.provider).toBe('openai')
      expect(input.model.name).toBe('gpt-4o')
      expect(input.tools).toHaveLength(1)
      expect(input.tools[0].name).toBe('search')
      expect(input.execution).toBeDefined()
      expect(input.tags).toEqual(['auto'])
    })

    it('uses default type auto', () => {
      const runConfig: RunConfig = {
        name: 'Run',
        projectId: 'proj_1',
        agent: {
          provider: 'openai',
          model: 'gpt-4o',
          temperature: 0.7,
          maxTokens: 4096,
          systemPrompt: '',
        },
        input: { messages: [] },
        options: { timeout: 60000, maxSteps: 10, retries: 0, concurrency: 1 },
      }

      const input = captureSnapshotFromRun('run_1', 'proj_1', 'Snap', runConfig, createMockTrace())

      expect(input.type).toBe('auto')
      expect(input.tags).toEqual([])
    })
  })

  describe('snapshotToSummary', () => {
    it('creates a summary from a snapshot', () => {
      const input = createSnapshotInput()
      const data = buildSnapshotData(input)

      const snapshot: Snapshot = {
        id: 'snap_1',
        projectId: 'proj_1',
        runId: 'run_1',
        name: 'Test Snapshot',
        description: 'A test snapshot',
        type: 'manual',
        data,
        tags: ['test', 'v1'],
        createdAt: new Date('2025-01-01T00:00:00Z'),
      }

      const summary = snapshotToSummary(snapshot)

      expect(summary.id).toBe('snap_1')
      expect(summary.projectId).toBe('proj_1')
      expect(summary.runId).toBe('run_1')
      expect(summary.name).toBe('Test Snapshot')
      expect(summary.description).toBe('A test snapshot')
      expect(summary.type).toBe('manual')
      expect(summary.tags).toEqual(['test', 'v1'])
      expect(summary.toolCount).toBe(2)
      expect(summary.messageCount).toBe(2)
      expect(summary.createdAt).toBeInstanceOf(Date)
    })

    it('counts execution steps', () => {
      const input = createSnapshotInput()
      const trace = createMockTrace()
      input.execution = trace
      const data = buildSnapshotData(input)

      const snapshot: Snapshot = {
        id: 'snap_1',
        projectId: 'proj_1',
        name: 'Snapshot',
        type: 'auto',
        data,
        createdAt: new Date(),
      }

      const summary = snapshotToSummary(snapshot)

      expect(summary.stepCount).toBe(3)
    })
  })

  describe('compareSnapshots', () => {
    function makeSnapshotData(overrides: {
      systemPrompt?: string
      provider?: string
      model?: string
      temperature?: number
      maxTokens?: number
      tools?: Array<{ name: string; description: string; parameters: Record<string, unknown> }>
      messageCount?: number
      timeout?: number
      maxSteps?: number
    }): SnapshotData {
      const base = buildSnapshotData(createSnapshotInput())
      if (overrides.systemPrompt !== undefined) base.prompt.system = overrides.systemPrompt
      if (overrides.provider !== undefined) base.model.provider = overrides.provider
      if (overrides.model !== undefined) base.model.name = overrides.model
      if (overrides.temperature !== undefined) base.model.temperature = overrides.temperature
      if (overrides.maxTokens !== undefined) base.model.maxTokens = overrides.maxTokens
      if (overrides.tools !== undefined) base.tools = overrides.tools
      if (overrides.messageCount !== undefined) {
        base.context.messages = Array.from({ length: overrides.messageCount }, (_, i) => ({
          role: 'user' as const,
          content: `msg ${i + 1}`,
        }))
      }
      if (overrides.timeout !== undefined) base.options.timeout = overrides.timeout
      if (overrides.maxSteps !== undefined) base.options.maxSteps = overrides.maxSteps
      return base
    }

    it('returns identical when snapshots are the same', () => {
      const data = buildSnapshotData(createSnapshotInput())
      const diff = compareSnapshots(data, data)

      expect(diff.identical).toBe(true)
      expect(diff.changes).toHaveLength(0)
      expect(diff.summary).toBe('Snapshots are identical')
    })

    it('detects system prompt changes', () => {
      const dataA = makeSnapshotData({ systemPrompt: 'Prompt A' })
      const dataB = makeSnapshotData({ systemPrompt: 'Prompt B' })

      const diff = compareSnapshots(dataA, dataB)

      expect(diff.identical).toBe(false)
      expect(diff.changes.some((c) => c.path === 'prompt.system')).toBe(true)
    })

    it('detects model provider changes', () => {
      const dataA = makeSnapshotData({ provider: 'openai' })
      const dataB = makeSnapshotData({ provider: 'anthropic' })

      const diff = compareSnapshots(dataA, dataB)

      expect(diff.identical).toBe(false)
      const change = diff.changes.find((c) => c.path === 'model.provider')
      expect(change).toBeDefined()
      expect(change!.before).toBe('openai')
      expect(change!.after).toBe('anthropic')
    })

    it('detects model name changes', () => {
      const dataA = makeSnapshotData({ model: 'gpt-4o' })
      const dataB = makeSnapshotData({ model: 'gpt-5' })

      const diff = compareSnapshots(dataA, dataB)

      const change = diff.changes.find((c) => c.path === 'model.name')
      expect(change).toBeDefined()
    })

    it('detects temperature changes', () => {
      const dataA = makeSnapshotData({ temperature: 0.7 })
      const dataB = makeSnapshotData({ temperature: 0.9 })

      const diff = compareSnapshots(dataA, dataB)

      const change = diff.changes.find((c) => c.path === 'model.temperature')
      expect(change).toBeDefined()
    })

    it('detects added and removed tools', () => {
      const dataA = makeSnapshotData({
        tools: [{ name: 'tool_a', description: 'A', parameters: {} }],
      })
      const dataB = makeSnapshotData({
        tools: [{ name: 'tool_b', description: 'B', parameters: {} }],
      })

      const diff = compareSnapshots(dataA, dataB)

      expect(diff.identical).toBe(false)
      expect(diff.changes.some((c) => c.path === 'tools.tool_a' && c.type === 'removed')).toBe(true)
      expect(diff.changes.some((c) => c.path === 'tools.tool_b' && c.type === 'added')).toBe(true)
    })

    it('detects tool parameter changes', () => {
      const dataA = makeSnapshotData({
        tools: [{ name: 'search', description: 'Search', parameters: { type: 'object' } }],
      })
      const dataB = makeSnapshotData({
        tools: [{ name: 'search', description: 'Search', parameters: { type: 'object', properties: { q: { type: 'string' } } } }],
      })

      const diff = compareSnapshots(dataA, dataB)

      const change = diff.changes.find((c) => c.path === 'tools.search.parameters')
      expect(change).toBeDefined()
    })

    it('detects message count changes', () => {
      const dataA = makeSnapshotData({ messageCount: 3 })
      const dataB = makeSnapshotData({ messageCount: 5 })

      const diff = compareSnapshots(dataA, dataB)

      const change = diff.changes.find((c) => c.path === 'context.messages')
      expect(change).toBeDefined()
    })

    it('detects option changes', () => {
      const dataA = makeSnapshotData({ timeout: 10000 })
      const dataB = makeSnapshotData({ timeout: 30000 })

      const diff = compareSnapshots(dataA, dataB)

      const change = diff.changes.find((c) => c.path === 'options.timeout')
      expect(change).toBeDefined()
    })

    it('reports change summary', () => {
      const dataA = makeSnapshotData({ systemPrompt: 'A', provider: 'openai' })
      const dataB = makeSnapshotData({ systemPrompt: 'B', provider: 'anthropic' })

      const diff = compareSnapshots(dataA, dataB)

      expect(diff.summary).toContain('2 change(s)')
    })
  })

  describe('restoreConfigFromSnapshot', () => {
    it('restores a run config from snapshot data', () => {
      const input = createSnapshotInput()
      const data = buildSnapshotData(input)

      const config = restoreConfigFromSnapshot(data)

      expect(config.name).toContain('TestAgent')
      expect(config.name).toContain('replay')
      expect(config.agent.provider).toBe('openai')
      expect(config.agent.model).toBe('gpt-4o')
      expect(config.agent.systemPrompt).toBe('You are a helpful assistant.')
      expect(config.agent.tools).toHaveLength(2)
      expect(config.input.messages).toHaveLength(2)
      expect(config.options.timeout).toBe(120000)
      expect(config.tags).toContain('replay')
      expect(config.tags).toContain('from-snapshot')
    })

    it('restores temperature and maxTokens from model', () => {
      const input = createSnapshotInput()
      const data = buildSnapshotData(input)

      const config = restoreConfigFromSnapshot(data)

      expect(config.agent.temperature).toBe(0.7)
      expect(config.agent.maxTokens).toBe(4096)
    })

    it('handles missing context messages', () => {
      const input = createSnapshotInput()
      const data = buildSnapshotData(input)
      data.context = { messages: [] }

      const config = restoreConfigFromSnapshot(data)

      expect(config.input.messages).toHaveLength(0)
    })
  })
})
