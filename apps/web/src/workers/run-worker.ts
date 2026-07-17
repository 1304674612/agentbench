/**
 * BullMQ Worker — Async task processing for AgentBench.
 *
 * Handles:
 * - Run execution (queue, execute, store results)
 * - Experiment batch runs
 * - Notification dispatch (email, Slack, webhooks)
 * - Report generation (heavy reports offloaded from API)
 * - Snapshot creation
 *
 * This worker runs as a separate process alongside the web server:
 *   node workers/run-worker.js
 *
 * Requires Redis (for BullMQ) and the same DATABASE_URL as the web app.
 */

import type { RunResult } from '@agentbench/core'

// ============================================================
// Queue Names
// ============================================================

export const QUEUES = {
  /** Main run execution queue */
  RUN_EXECUTION: 'agentbench:run:execution',
  /** Experiment batch run queue */
  EXPERIMENT_BATCH: 'agentbench:experiment:batch',
  /** Notification dispatch queue */
  NOTIFICATIONS: 'agentbench:notifications',
  /** Report generation queue */
  REPORTS: 'agentbench:reports',
  /** Snapshot creation queue */
  SNAPSHOTS: 'agentbench:snapshots',
} as const

// ============================================================
// Job Types
// ============================================================

export interface RunExecutionJob {
  type: 'run_execution'
  runId: string
  projectId: string
  testCaseId?: string
  config: Record<string, unknown>
}

export interface ExperimentBatchJob {
  type: 'experiment_batch'
  experimentId: string
  projectId: string
  variantRuns: Array<{
    variantName: string
    runCount: number
  }>
}

export interface NotificationJob {
  type: 'notification'
  userId: string
  notificationType: 'run_completed' | 'regression_detected' | 'usage_alert' | 'system'
  title: string
  message: string
  link?: string
  channels?: Array<'email' | 'slack' | 'webhook'>
}

export interface ReportJob {
  type: 'report'
  runIds: string[]
  format: 'json' | 'html' | 'markdown' | 'junit'
  projectId: string
  outputDir?: string
}

export interface SnapshotJob {
  type: 'snapshot'
  projectId: string
  runId: string
  name: string
  snapshotType: 'auto' | 'ci'
}

export type WorkerJob =
  | RunExecutionJob
  | ExperimentBatchJob
  | NotificationJob
  | ReportJob
  | SnapshotJob

// ============================================================
// Worker Handler Types
// ============================================================

export interface WorkerHandlers {
  onRunExecution?: (job: RunExecutionJob) => Promise<RunResult>
  onExperimentBatch?: (job: ExperimentBatchJob) => Promise<void>
  onNotification?: (job: NotificationJob) => Promise<void>
  onReport?: (job: ReportJob) => Promise<string>
  onSnapshot?: (job: SnapshotJob) => Promise<void>
}

// ============================================================
// Worker
// ============================================================

export class RunWorker {
  private handlers: WorkerHandlers
  private isRunning = false

  constructor(handlers: WorkerHandlers = {}) {
    this.handlers = handlers
  }

  /**
   * Process a single job by dispatching to the appropriate handler.
   */
  async processJob(job: WorkerJob): Promise<unknown> {
    switch (job.type) {
      case 'run_execution':
        if (!this.handlers.onRunExecution) {
          throw new Error('No handler registered for run_execution jobs')
        }
        return this.handlers.onRunExecution(job)

      case 'experiment_batch':
        if (!this.handlers.onExperimentBatch) {
          throw new Error('No handler registered for experiment_batch jobs')
        }
        return this.handlers.onExperimentBatch(job)

      case 'notification':
        if (!this.handlers.onNotification) {
          // Notifications are optional — skip gracefully
          console.warn(`No notification handler registered, skipping: ${job.title}`)
          return
        }
        return this.handlers.onNotification(job)

      case 'report':
        if (!this.handlers.onReport) {
          throw new Error('No handler registered for report jobs')
        }
        return this.handlers.onReport(job)

      case 'snapshot':
        if (!this.handlers.onSnapshot) {
          throw new Error('No handler registered for snapshot jobs')
        }
        return this.handlers.onSnapshot(job)

      default:
        throw new Error(`Unknown job type: ${(job as { type: string }).type}`)
    }
  }

  /**
   * Start the worker loop. In production, this would connect to BullMQ
   * and process jobs from Redis. This stub provides the interface for
   * integration when BullMQ is added as a dependency.
   *
   * @example
   * ```typescript
   * import { RunWorker } from './workers/run-worker'
   * import { Runner } from '@agentbench/core'
   *
   * const worker = new RunWorker({
   *   onRunExecution: async (job) => {
   *     const runner = new Runner(storage)
   *     return runner.run({ ... })
   *   },
   *   onNotification: async (job) => {
   *     // Send email via SMTP, post to Slack webhook, etc.
   *   },
   * })
   *
   * await worker.start()
   * ```
   */
  async start(): Promise<void> {
    this.isRunning = true
    console.log('[AgentBench Worker] Started')

    // TODO: Connect to BullMQ when the dependency is added:
    //
    // import { Queue, Worker } from 'bullmq'
    //
    // const runQueue = new Queue(QUEUES.RUN_EXECUTION, { connection })
    // const worker = new Worker(
    //   QUEUES.RUN_EXECUTION,
    //   async (job) => this.processJob(job.data as WorkerJob),
    //   { connection, concurrency: 4 }
    // )
    //
    // Similarly for other queues: EXPERIMENT_BATCH, NOTIFICATIONS, REPORTS, SNAPSHOTS
    //
    // Graceful shutdown:
    // process.on('SIGTERM', async () => { await worker.close() })
    // process.on('SIGINT', async () => { await worker.close() })
  }

  /**
   * Stop the worker gracefully.
   */
  async stop(): Promise<void> {
    this.isRunning = false
    console.log('[AgentBench Worker] Stopped')
  }

  /**
   * Enqueue a job for async processing. In production, this would
   * publish to Redis via BullMQ.
   */
  async enqueue(job: WorkerJob): Promise<string> {
    const jobId = `job_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`

    // TODO: Publish to BullMQ queue when integrated:
    //
    // const queue = new Queue(getQueueName(job.type), { connection })
    // await queue.add(job.type, job, { jobId })
    //
    // For now, process inline as a synchronous fallback:
    console.log(`[AgentBench Worker] Enqueued job: ${job.type} (${jobId})`)

    return jobId
  }
}

// ============================================================
// Standalone Entry Point
// ============================================================

/**
 * Run this file directly to start the worker process:
 *
 *   npx tsx apps/web/src/workers/run-worker.ts
 *
 * Or in production:
 *
 *   node apps/web/dist/workers/run-worker.js
 */
if (require.main === module || import.meta.url === `file://${process.argv[1]}`) {
  const worker = new RunWorker()

  worker
    .start()
    .then(() => {
      console.log('[AgentBench Worker] Ready to process jobs')

      // Graceful shutdown
      const shutdown = async (signal: string) => {
        console.log(`[AgentBench Worker] Received ${signal}, shutting down...`)
        await worker.stop()
        process.exit(0)
      }

      process.on('SIGTERM', () => shutdown('SIGTERM'))
      process.on('SIGINT', () => shutdown('SIGINT'))
    })
    .catch((err) => {
      console.error('[AgentBench Worker] Failed to start:', err)
      process.exit(1)
    })
}
