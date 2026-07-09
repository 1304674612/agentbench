/**
 * Storage Adapter Interface — abstract data persistence layer.
 * Implementations: PostgresAdapter, MemoryAdapter, SQLiteAdapter.
 */
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

// ============================================================
// Query Filters
// ============================================================

export interface RunQuery {
  projectId?: string
  testCaseId?: string
  status?: string
  tags?: string[]
  search?: string
  limit?: number
  offset?: number
  orderBy?: 'createdAt' | 'duration' | 'totalTokens' | 'totalCost'
  orderDir?: 'asc' | 'desc'
}

export interface ProjectQuery {
  ownerId?: string
  organizationId?: string
  search?: string
  limit?: number
  offset?: number
}

// ============================================================
// Storage Adapter Interface
// ============================================================

export interface StorageAdapter {
  // Connection
  connect(): Promise<void>
  disconnect(): Promise<void>
  healthCheck(): Promise<boolean>

  // Projects
  createProject(data: CreateProjectInput): Promise<Project>
  getProject(id: string): Promise<Project | null>
  listProjects(query?: ProjectQuery): Promise<Project[]>
  updateProject(id: string, data: Partial<CreateProjectInput>): Promise<Project>
  deleteProject(id: string): Promise<void>

  // Test Suites
  createTestSuite(data: CreateTestSuiteInput): Promise<TestSuite>
  getTestSuite(id: string): Promise<TestSuite | null>
  listTestSuites(projectId: string): Promise<TestSuite[]>

  // Test Cases
  createTestCase(data: CreateTestCaseInput): Promise<TestCase>
  getTestCase(id: string): Promise<TestCase | null>
  listTestCases(suiteId: string): Promise<TestCase[]>
  updateTestCase(id: string, data: Partial<CreateTestCaseInput>): Promise<TestCase>
  deleteTestCase(id: string): Promise<void>

  // Runs
  createRun(data: CreateRunInput): Promise<Run>
  getRun(id: string): Promise<Run | null>
  listRuns(query?: RunQuery): Promise<RunSummary[]>
  updateRun(id: string, data: UpdateRunInput): Promise<Run>
  deleteRun(id: string): Promise<void>

  // Trace Steps
  createTraceStep(data: CreateTraceStepInput): Promise<TraceStep>
  batchCreateTraceSteps(data: CreateTraceStepInput[]): Promise<TraceStep[]>
  getTraceSteps(runId: string): Promise<TraceStep[]>

  // Scores
  createScore(data: CreateScoreInput): Promise<Score>
  batchCreateScores(data: CreateScoreInput[]): Promise<Score[]>
  getScores(runId: string): Promise<Score[]>

  // Assertion Results
  createAssertionResult(data: CreateAssertionResultInput): Promise<AssertionResult>
  batchCreateAssertionResults(data: CreateAssertionResultInput[]): Promise<AssertionResult[]>
  getAssertionResults(runId: string): Promise<AssertionResult[]>

  // Snapshots
  createSnapshot(data: CreateSnapshotInput): Promise<Snapshot>
  getSnapshot(id: string): Promise<Snapshot | null>
  listSnapshots(projectId: string): Promise<Snapshot[]>
  deleteSnapshot(id: string): Promise<void>

  // Experiments
  createExperiment(data: CreateExperimentInput): Promise<Experiment>
  getExperiment(id: string): Promise<Experiment | null>
  listExperiments(projectId: string): Promise<Experiment[]>
  updateExperiment(id: string, data: Partial<CreateExperimentInput>): Promise<Experiment>

  // Datasets
  createDataset(data: CreateDatasetInput): Promise<Dataset>
  getDataset(id: string): Promise<Dataset | null>
  listDatasets(projectId: string): Promise<Dataset[]>
  createDatasetItem(data: CreateDatasetItemInput): Promise<DatasetItem>
  batchCreateDatasetItems(data: CreateDatasetItemInput[]): Promise<DatasetItem[]>
  listDatasetItems(datasetId: string): Promise<DatasetItem[]>
}

// ============================================================
// Input Types
// ============================================================

export interface CreateProjectInput {
  name: string
  slug: string
  description?: string
  ownerId: string
  organizationId?: string
}

export interface CreateTestSuiteInput {
  projectId: string
  name: string
  description?: string
  sortOrder?: number
}

export interface CreateTestCaseInput {
  suiteId: string
  name: string
  description?: string
  agentConfig?: Record<string, unknown>
  input?: Record<string, unknown>
  options?: Record<string, unknown>
  tags?: string[]
}

export interface CreateRunInput {
  projectId: string
  testCaseId?: string
  userId?: string
  name: string
  config?: Record<string, unknown>
  tags?: string[]
  metadata?: Record<string, unknown>
}

export interface UpdateRunInput {
  status?: string
  metrics?: Record<string, unknown>
  startedAt?: Date
  endedAt?: Date
  duration?: number
  summary?: string
  error?: string
}

export interface CreateTraceStepInput {
  runId: string
  sequence: number
  type: string
  startedAt: Date
  endedAt?: Date
  duration?: number
  llmProvider?: string
  llmModel?: string
  llmRequest?: Record<string, unknown>
  llmResponse?: Record<string, unknown>
  toolName?: string
  toolRequest?: Record<string, unknown>
  toolResponse?: Record<string, unknown>
  promptTokens?: number
  completionTokens?: number
  totalTokens?: number
  cost?: number
  status?: string
  error?: string
  metadata?: Record<string, unknown>
}

export interface CreateScoreInput {
  runId: string
  evaluator: string
  score: number
  maxScore?: number
  reason?: string
  judgeModel?: string
  duration?: number
  metadata?: Record<string, unknown>
}

export interface CreateAssertionResultInput {
  runId: string
  assertionId?: string
  type: string
  status: string
  expected?: Record<string, unknown>
  actual?: Record<string, unknown>
  message?: string
  duration?: number
}

export interface CreateSnapshotInput {
  projectId: string
  runId?: string
  name: string
  description?: string
  type?: string
  data: Record<string, unknown>
  tags?: string[]
}

export interface CreateExperimentInput {
  projectId: string
  name: string
  description?: string
  config: Record<string, unknown>
}

export interface CreateDatasetInput {
  projectId: string
  name: string
  description?: string
  format?: string
  tags?: string[]
}

export interface CreateDatasetItemInput {
  datasetId: string
  split?: string
  input: Record<string, unknown>
  expected?: Record<string, unknown>
  labels?: string[]
  metadata?: Record<string, unknown>
}
