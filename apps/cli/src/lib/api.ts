import { getApiUrl } from './config'

// ── API Types ────────────────────────────────────────────────────────────────

export interface RunConfig {
  agent?: {
    provider?: string
    model?: string
    temperature?: number
    maxTokens?: number
    systemPrompt?: string
    tools?: unknown[]
  }
  input?: {
    messages?: unknown[]
  }
  options?: Record<string, unknown>
}

export interface RunMetrics {
  totalTokens?: number
  totalCost?: number
  stepCount?: number
}

export interface Run {
  id: string
  name: string
  status: string
  projectId?: string
  duration?: number
  config?: RunConfig
  metrics?: RunMetrics
  tags?: string[]
  createdAt?: string
}

export interface Assertion {
  type: string
  params: Record<string, unknown>
}

export interface TestCase {
  id: string
  name: string
  status: string
  assertions: Assertion[]
  evaluators: Array<{ type: string; config: unknown }>
}

export interface Suite {
  id: string
  name: string
  cases: TestCase[]
}

export interface EvalSummary {
  totalRules: number
  passed: number
  failed: number
  errored: number
}

export interface EvalScore {
  evaluator: string
  score: number
  maxScore: number
  reason: string
}

export interface AssertionResult {
  type: string
  status: string
  message?: string
}

export interface EvalResult {
  runId: string
  summary: EvalSummary
  scores: EvalScore[]
  assertionResults: AssertionResult[]
}

export interface RunResult {
  id: string
  status: string
}

export interface ReplayRun {
  id: string
  name: string
}

export interface ReplayResult {
  message: string
  mode: string
  originalRunId: string
  replayRuns: ReplayRun[]
}

export interface SnapshotListItem {
  id: string
  name: string
  type: string
  createdAt: string
  toolCount: number
  messageCount: number
}

export interface CreateRunParams {
  projectId: string
  name: string
  config?: RunConfig
  tags?: string[]
  testCaseId?: string
}

export interface EvaluateRunParams {
  rules: Array<{ type: string; params: Record<string, unknown> }>
}

export interface ReplayRunParams {
  mode: string
  parallel: boolean
  model?: string
  provider?: string
  temperature?: number
  seed?: number
  batchCount?: number
}

export interface CreateSnapshotParams {
  name: string
  description?: string
  type?: string
  runId: string
  data: Record<string, unknown>
  tags?: string[]
}

export interface ExperimentVariant {
  name: string
  config: Record<string, unknown>
}

export interface ExperimentRun {
  run: { status: string; duration?: number }
}

export interface ExperimentSummaryItem {
  runCount: number
  passedCount: number
  avgDuration: number
}

export interface Experiment {
  name: string
  status: string
  conclusion?: string
  variants: ExperimentVariant[]
  runs: ExperimentRun[]
  summary: Record<string, ExperimentSummaryItem>
}

export interface ExperimentExecResult {
  message: string
  runs: Array<{ id: string; variant: string }>
}

// ── API Client ───────────────────────────────────────────────────────────────

export class ApiError extends Error {
  status: number
  body: unknown

  constructor(message: string, status: number, body?: unknown) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.body = body
  }
}

export function createApiClient(baseUrl?: string) {
  const apiBase = baseUrl ?? getApiUrl()

  async function apiFetch<T = unknown>(path: string, options?: RequestInit): Promise<T> {
    const res = await fetch(`${apiBase}${path}`, {
      headers: { 'Content-Type': 'application/json', ...options?.headers },
      ...options,
    })
    if (!res.ok) {
      const body = await res.json().catch(() => undefined)
      const message =
        body && typeof body === 'object' && 'error' in body
          ? String((body as Record<string, unknown>).error)
          : `HTTP ${res.status}`
      throw new ApiError(message, res.status, body)
    }
    return res.json() as Promise<T>
  }

  return {
    apiBase,
    apiFetch,

    // ── Run APIs ─────────────────────────────────────────────────────────────

    createRun(params: CreateRunParams): Promise<Run> {
      return apiFetch<Run>('/runs', {
        method: 'POST',
        body: JSON.stringify({
          projectId: params.projectId,
          name: params.name,
          config: params.config,
          tags: params.tags ?? ['cli'],
          ...(params.testCaseId ? { testCaseId: params.testCaseId } : {}),
        }),
      })
    },

    getRun(runId: string): Promise<Run> {
      return apiFetch<Run>(`/runs/${runId}`)
    },

    listRuns(limit = 5): Promise<{ runs: Run[] }> {
      return apiFetch<{ runs: Run[] }>(`/runs?limit=${limit}`)
    },

    evaluateRun(runId: string, params: EvaluateRunParams): Promise<EvalResult> {
      return apiFetch<EvalResult>(`/runs/${runId}/evaluate`, {
        method: 'POST',
        body: JSON.stringify(params),
      })
    },

    replayRun(runId: string, params: ReplayRunParams): Promise<ReplayResult> {
      return apiFetch<ReplayResult>(`/runs/${runId}/replay`, {
        method: 'POST',
        body: JSON.stringify(params),
      })
    },

    // ── Suite APIs ───────────────────────────────────────────────────────────

    getSuite(suiteId: string): Promise<Suite> {
      return apiFetch<Suite>(`/suites/${suiteId}`)
    },

    listSuites(projectId: string): Promise<{ suites: Suite[] }> {
      return apiFetch<{ suites: Suite[] }>(`/suites?projectId=${projectId}`)
    },

    // ── Snapshot APIs ────────────────────────────────────────────────────────

    createSnapshot(projectId: string, params: CreateSnapshotParams) {
      return apiFetch<{ id: string }>(`/projects/${projectId}/snapshots`, {
        method: 'POST',
        body: JSON.stringify(params),
      })
    },

    listSnapshots(projectId: string): Promise<{ snapshots: SnapshotListItem[] }> {
      return apiFetch<{ snapshots: SnapshotListItem[] }>(`/projects/${projectId}/snapshots`)
    },

    restoreSnapshot(snapshotId: string, overrides?: { model?: string }) {
      return apiFetch<{ runId: string; snapshotId: string }>(`/snapshots/${snapshotId}`, {
        method: 'POST',
        body: JSON.stringify({
          createRun: true,
          overrides,
        }),
      })
    },

    // ── Experiment APIs ──────────────────────────────────────────────────────

    runExperiment(experimentId: string) {
      return apiFetch<ExperimentExecResult>(`/experiments/${experimentId}`, {
        method: 'POST',
        body: JSON.stringify({ dryRun: false }),
      })
    },

    getExperiment(experimentId: string): Promise<Experiment> {
      return apiFetch<Experiment>(`/experiments/${experimentId}`)
    },
  }
}

// Default singleton for the CLI
const defaultClient = createApiClient()
export const apiClient = defaultClient
