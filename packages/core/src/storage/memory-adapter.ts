/**
 * In-Memory Storage Adapter — for testing and development without a database.
 * All data is lost on process exit.
 */
import type { StorageAdapter } from './adapter'
import type {
  Project,
  TestSuite,
  TestCase,
  Run,
  RunSummary,
  TraceStep,
  Score,
  AssertionResult,
  Snapshot,
  Experiment,
  Dataset,
  DatasetItem,
} from '../types'
import type {
  RunQuery,
  ProjectQuery,
  CreateProjectInput,
  CreateTestSuiteInput,
  CreateTestCaseInput,
  CreateRunInput,
  UpdateRunInput,
  CreateTraceStepInput,
  CreateScoreInput,
  CreateAssertionResultInput,
  CreateSnapshotInput,
  CreateExperimentInput,
  CreateDatasetInput,
  CreateDatasetItemInput,
} from './adapter'

function cuid(): string {
  return `mem_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`
}

export class MemoryStorageAdapter implements StorageAdapter {
  private projects = new Map<string, Project>()
  private testSuites = new Map<string, TestSuite>()
  private testCases = new Map<string, TestCase>()
  private runs = new Map<string, Run>()
  private traceSteps = new Map<string, TraceStep[]>()
  private scores = new Map<string, Score[]>()
  private assertionResults = new Map<string, AssertionResult[]>()
  private snapshots = new Map<string, Snapshot>()
  private experiments = new Map<string, Experiment>()
  private datasets = new Map<string, Dataset>()
  private datasetItems = new Map<string, DatasetItem[]>()

  async connect(): Promise<void> {}
  async disconnect(): Promise<void> {}
  async healthCheck(): Promise<boolean> {
    return true
  }

  // Projects
  async createProject(data: CreateProjectInput): Promise<Project> {
    const project: Project = {
      id: cuid(),
      name: data.name,
      slug: data.slug,
      description: data.description,
      plan: 'community',
      ownerId: data.ownerId,
      organizationId: data.organizationId,
      settings: {},
      createdAt: new Date(),
      updatedAt: new Date(),
    }
    this.projects.set(project.id, project)
    return project
  }
  async getProject(id: string): Promise<Project | null> {
    return this.projects.get(id) ?? null
  }
  async listProjects(query?: ProjectQuery): Promise<Project[]> {
    let results = [...this.projects.values()]
    if (query?.ownerId) results = results.filter((p) => p.ownerId === query.ownerId)
    if (query?.search) {
      const s = query.search.toLowerCase()
      results = results.filter((p) => p.name.toLowerCase().includes(s))
    }
    return results.slice(query?.offset ?? 0, (query?.offset ?? 0) + (query?.limit ?? 100))
  }
  async updateProject(id: string, data: Partial<CreateProjectInput>): Promise<Project> {
    const project = this.projects.get(id)
    if (!project) throw new Error(`Project not found: ${id}`)
    Object.assign(project, data, { updatedAt: new Date() })
    return project
  }
  async deleteProject(id: string): Promise<void> {
    this.projects.delete(id)
  }

  // Test Suites
  async createTestSuite(data: CreateTestSuiteInput): Promise<TestSuite> {
    const suite: TestSuite = {
      id: cuid(),
      projectId: data.projectId,
      name: data.name,
      description: data.description,
      sortOrder: data.sortOrder ?? 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    }
    this.testSuites.set(suite.id, suite)
    return suite
  }
  async getTestSuite(id: string): Promise<TestSuite | null> {
    return this.testSuites.get(id) ?? null
  }
  async listTestSuites(projectId: string): Promise<TestSuite[]> {
    return [...this.testSuites.values()].filter((s) => s.projectId === projectId)
  }

  // Test Cases
  async createTestCase(data: CreateTestCaseInput): Promise<TestCase> {
    const tc: TestCase = {
      id: cuid(),
      suiteId: data.suiteId,
      name: data.name,
      description: data.description,
      status: 'active',
      agentConfig: (data.agentConfig ?? {}) as Record<string, unknown>,
      input: (data.input ?? {}) as Record<string, unknown>,
      options: (data.options ?? {}) as Record<string, unknown>,
      tags: data.tags ?? [],
      sortOrder: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    }
    this.testCases.set(tc.id, tc)
    return tc
  }
  async getTestCase(id: string): Promise<TestCase | null> {
    return this.testCases.get(id) ?? null
  }
  async listTestCases(suiteId: string): Promise<TestCase[]> {
    return [...this.testCases.values()].filter((tc) => tc.suiteId === suiteId)
  }
  async updateTestCase(id: string, data: Partial<CreateTestCaseInput>): Promise<TestCase> {
    const tc = this.testCases.get(id)
    if (!tc) throw new Error(`TestCase not found: ${id}`)
    Object.assign(tc, data, { updatedAt: new Date() })
    return tc
  }
  async deleteTestCase(id: string): Promise<void> {
    this.testCases.delete(id)
  }

  // Runs
  async createRun(data: CreateRunInput): Promise<Run> {
    const run: Run = {
      id: cuid(),
      projectId: data.projectId,
      testCaseId: data.testCaseId,
      userId: data.userId,
      name: data.name,
      status: 'pending',
      config: (data.config ?? {}) as Record<string, unknown>,
      metrics: undefined,
      startedAt: undefined,
      endedAt: undefined,
      duration: undefined,
      summary: undefined,
      error: undefined,
      tags: data.tags ?? [],
      metadata: data.metadata ?? {},
      createdAt: new Date(),
    }
    this.runs.set(run.id, run)
    return run
  }
  async getRun(id: string): Promise<Run | null> {
    return this.runs.get(id) ?? null
  }
  async listRuns(query?: RunQuery): Promise<RunSummary[]> {
    let results = [...this.runs.values()]
    if (query?.projectId) results = results.filter((r) => r.projectId === query.projectId)
    if (query?.status) results = results.filter((r) => r.status === query.status)
    if (query?.tags?.length) {
      results = results.filter((r) => query.tags!.some((t) => r.tags?.includes(t)))
    }
    if (query?.search) {
      const s = query.search.toLowerCase()
      results = results.filter((r) => r.name.toLowerCase().includes(s))
    }
    results.sort((a, b) => {
      const aVal = query?.orderBy ? (a as any)[query.orderBy] : a.createdAt
      const bVal = query?.orderBy ? (b as any)[query.orderBy] : b.createdAt
      return query?.orderDir === 'asc' ? (aVal > bVal ? 1 : -1) : aVal < bVal ? 1 : -1
    })
    const offset = query?.offset ?? 0
    const limit = query?.limit ?? 50
    return results.slice(offset, offset + limit).map((r) => ({
      id: r.id,
      name: r.name,
      status: r.status,
      projectId: r.projectId,
      testCaseId: r.testCaseId,
      duration: r.duration,
      totalTokens: r.metrics?.totalTokens as number | undefined,
      totalCost: r.metrics?.totalCost as number | undefined,
      createdAt: r.createdAt,
      tags: r.tags,
    }))
  }
  async updateRun(id: string, data: UpdateRunInput): Promise<Run> {
    const run = this.runs.get(id)
    if (!run) throw new Error(`Run not found: ${id}`)
    if (data.status !== undefined) run.status = data.status as Run['status']
    if (data.metrics !== undefined) run.metrics = data.metrics
    if (data.startedAt !== undefined) run.startedAt = data.startedAt
    if (data.endedAt !== undefined) run.endedAt = data.endedAt
    if (data.duration !== undefined) run.duration = data.duration
    if (data.summary !== undefined) run.summary = data.summary
    if (data.error !== undefined) run.error = data.error
    return run
  }
  async deleteRun(id: string): Promise<void> {
    this.runs.delete(id)
    this.traceSteps.delete(id)
    this.scores.delete(id)
    this.assertionResults.delete(id)
  }

  // Trace Steps
  async createTraceStep(data: CreateTraceStepInput): Promise<TraceStep> {
    const step: TraceStep = {
      id: cuid(),
      sequence: data.sequence,
      type: data.type as TraceStep['type'],
      startedAt: data.startedAt,
      endedAt: data.endedAt,
      duration: data.duration,
      llmProvider: data.llmProvider,
      llmModel: data.llmModel,
      llmRequest: data.llmRequest as unknown as TraceStep['llmRequest'],
      llmResponse: data.llmResponse as unknown as TraceStep['llmResponse'],
      toolName: data.toolName,
      toolRequest: data.toolRequest as unknown as TraceStep['toolRequest'],
      toolResponse: data.toolResponse as unknown as TraceStep['toolResponse'],
      promptTokens: data.promptTokens,
      completionTokens: data.completionTokens,
      totalTokens: data.totalTokens,
      cost: data.cost ?? 0,
      status: (data.status ?? 'success') as TraceStep['status'],
      error: data.error
        ? { message: data.error, type: 'unknown' as const, retryable: false }
        : undefined,
      metadata: data.metadata ?? {},
    }
    const steps = this.traceSteps.get(data.runId) ?? []
    steps.push(step)
    this.traceSteps.set(data.runId, steps)
    return step
  }
  async batchCreateTraceSteps(data: CreateTraceStepInput[]): Promise<TraceStep[]> {
    const steps: TraceStep[] = []
    for (const d of data) {
      steps.push(await this.createTraceStep(d))
    }
    return steps
  }
  async getTraceSteps(runId: string): Promise<TraceStep[]> {
    return (this.traceSteps.get(runId) ?? []).sort((a, b) => a.sequence - b.sequence)
  }

  // Scores
  async createScore(data: CreateScoreInput): Promise<Score> {
    const score: Score = {
      evaluator: data.evaluator,
      score: data.score,
      maxScore: data.maxScore ?? 10,
      reason: data.reason,
      judgeModel: data.judgeModel,
      duration: data.duration,
      metadata: data.metadata ?? {},
    }
    const scores = this.scores.get(data.runId) ?? []
    scores.push(score)
    this.scores.set(data.runId, scores)
    return score
  }
  async batchCreateScores(data: CreateScoreInput[]): Promise<Score[]> {
    const scores: Score[] = []
    for (const d of data) {
      scores.push(await this.createScore(d))
    }
    return scores
  }
  async getScores(runId: string): Promise<Score[]> {
    return this.scores.get(runId) ?? []
  }

  // Assertion Results
  async createAssertionResult(data: CreateAssertionResultInput): Promise<AssertionResult> {
    const ar: AssertionResult = {
      type: data.type,
      status: data.status as AssertionResult['status'],
      expected: data.expected,
      actual: data.actual,
      message: data.message,
      duration: data.duration,
    }
    const results = this.assertionResults.get(data.runId) ?? []
    results.push(ar)
    this.assertionResults.set(data.runId, results)
    return ar
  }
  async batchCreateAssertionResults(
    data: CreateAssertionResultInput[]
  ): Promise<AssertionResult[]> {
    const results: AssertionResult[] = []
    for (const d of data) {
      results.push(await this.createAssertionResult(d))
    }
    return results
  }
  async getAssertionResults(runId: string): Promise<AssertionResult[]> {
    return this.assertionResults.get(runId) ?? []
  }

  // Snapshots
  async createSnapshot(data: CreateSnapshotInput): Promise<Snapshot> {
    const snapshot: Snapshot = {
      id: cuid(),
      projectId: data.projectId,
      runId: data.runId,
      name: data.name,
      description: data.description,
      type: (data.type ?? 'manual') as Snapshot['type'],
      data: data.data as unknown as Snapshot['data'],
      tags: data.tags ?? [],
      createdAt: new Date(),
    }
    this.snapshots.set(snapshot.id, snapshot)
    return snapshot
  }
  async getSnapshot(id: string): Promise<Snapshot | null> {
    return this.snapshots.get(id) ?? null
  }
  async listSnapshots(projectId: string): Promise<Snapshot[]> {
    return [...this.snapshots.values()].filter((s) => s.projectId === projectId)
  }
  async deleteSnapshot(id: string): Promise<void> {
    this.snapshots.delete(id)
  }

  // Experiments
  async createExperiment(data: CreateExperimentInput): Promise<Experiment> {
    const exp: Experiment = {
      id: cuid(),
      projectId: data.projectId,
      name: data.name,
      description: data.description,
      status: 'draft',
      config: data.config as unknown as Experiment['config'],
      variants: [],
      runs: [],
      results: undefined,
      conclusion: undefined,
      startedAt: undefined,
      endedAt: undefined,
      createdAt: new Date(),
      updatedAt: new Date(),
    }
    this.experiments.set(exp.id, exp)
    return exp
  }
  async getExperiment(id: string): Promise<Experiment | null> {
    return this.experiments.get(id) ?? null
  }
  async listExperiments(projectId: string): Promise<Experiment[]> {
    return [...this.experiments.values()].filter((e) => e.projectId === projectId)
  }
  async updateExperiment(id: string, data: Partial<CreateExperimentInput>): Promise<Experiment> {
    const exp = this.experiments.get(id)
    if (!exp) throw new Error(`Experiment not found: ${id}`)
    Object.assign(exp, data, { updatedAt: new Date() })
    return exp
  }

  // Datasets
  async createDataset(data: CreateDatasetInput): Promise<Dataset> {
    const ds: Dataset = {
      id: cuid(),
      projectId: data.projectId,
      name: data.name,
      description: data.description,
      format: (data.format ?? 'json') as Dataset['format'],
      tags: data.tags ?? [],
      createdAt: new Date(),
      updatedAt: new Date(),
    }
    this.datasets.set(ds.id, ds)
    return ds
  }
  async getDataset(id: string): Promise<Dataset | null> {
    return this.datasets.get(id) ?? null
  }
  async listDatasets(projectId: string): Promise<Dataset[]> {
    return [...this.datasets.values()].filter((d) => d.projectId === projectId)
  }
  async createDatasetItem(data: CreateDatasetItemInput): Promise<DatasetItem> {
    const item: DatasetItem = {
      id: cuid(),
      datasetId: data.datasetId,
      split: (data.split ?? 'test') as DatasetItem['split'],
      input: data.input,
      expected: data.expected,
      labels: data.labels ?? [],
      metadata: data.metadata ?? {},
      sortOrder: 0,
      createdAt: new Date(),
    }
    const items = this.datasetItems.get(data.datasetId) ?? []
    items.push(item)
    this.datasetItems.set(data.datasetId, items)
    return item
  }
  async batchCreateDatasetItems(data: CreateDatasetItemInput[]): Promise<DatasetItem[]> {
    const items: DatasetItem[] = []
    for (const d of data) {
      items.push(await this.createDatasetItem(d))
    }
    return items
  }
  async listDatasetItems(datasetId: string): Promise<DatasetItem[]> {
    return this.datasetItems.get(datasetId) ?? []
  }
}
