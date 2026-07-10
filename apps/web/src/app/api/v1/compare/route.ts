import { type NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { db } from '@/shared/lib/db'

const compareSchema = z.object({
  runAId: z.string(),
  runBId: z.string(),
})

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const parsed = compareSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.flatten() },
        { status: 400 }
      )
    }

    const [runA, runB] = await Promise.all([
      db.run.findUnique({
        where: { id: parsed.data.runAId },
        include: {
          traceSteps: { orderBy: { sequence: 'asc' } },
          scores: true,
        },
      }),
      db.run.findUnique({
        where: { id: parsed.data.runBId },
        include: {
          traceSteps: { orderBy: { sequence: 'asc' } },
          scores: true,
        },
      }),
    ])

    if (!runA || !runB) {
      return NextResponse.json({ error: 'One or both runs not found' }, { status: 404 })
    }

    const configA = (runA.config ?? {}) as Record<string, unknown>
    const configB = (runB.config ?? {}) as Record<string, unknown>
    const agentA = (configA.agent ?? {}) as Record<string, unknown>
    const agentB = (configB.agent ?? {}) as Record<string, unknown>
    const metricsA = (runA.metrics ?? {}) as Record<string, number>
    const metricsB = (runB.metrics ?? {}) as Record<string, number>

    // Build comparison
    const comparison = {
      runA: {
        id: runA.id,
        name: runA.name,
        status: runA.status,
        model: agentA.model ?? 'unknown',
        provider: agentA.provider ?? 'unknown',
        duration: runA.duration ?? 0,
        metrics: {
          totalTokens: metricsA.totalTokens ?? 0,
          totalCost: metricsA.totalCost ?? 0,
          totalLatency: metricsA.totalLatency ?? 0,
          stepCount: metricsA.stepCount ?? 0,
          llmCallCount: metricsA.llmCallCount ?? 0,
          toolCallCount: metricsA.toolCallCount ?? 0,
        },
        scores: runA.scores.map((s: { evaluator: string; score: number; maxScore: number }) => ({
          evaluator: s.evaluator,
          score: s.score,
          maxScore: s.maxScore,
        })),
      },
      runB: {
        id: runB.id,
        name: runB.name,
        status: runB.status,
        model: agentB.model ?? 'unknown',
        provider: agentB.provider ?? 'unknown',
        duration: runB.duration ?? 0,
        metrics: {
          totalTokens: metricsB.totalTokens ?? 0,
          totalCost: metricsB.totalCost ?? 0,
          totalLatency: metricsB.totalLatency ?? 0,
          stepCount: metricsB.stepCount ?? 0,
          llmCallCount: metricsB.llmCallCount ?? 0,
          toolCallCount: metricsB.toolCallCount ?? 0,
        },
        scores: runB.scores.map((s: { evaluator: string; score: number; maxScore: number }) => ({
          evaluator: s.evaluator,
          score: s.score,
          maxScore: s.maxScore,
        })),
      },
      diffs: {
        status: runA.status === runB.status ? 'same' : 'different',
        duration: {
          diff: (runB.duration ?? 0) - (runA.duration ?? 0),
          changePercent: runA.duration
            ? Math.round((((runB.duration ?? 0) - (runA.duration ?? 0)) / runA.duration) * 10000) /
              100
            : 0,
        },
        metrics: Object.keys(metricsA).map((key) => {
          const a = metricsA[key] ?? 0
          const b = metricsB[key] ?? 0
          return {
            metric: key,
            valueA: a,
            valueB: b,
            diff: b - a,
            changePercent: a === 0 ? (b === 0 ? 0 : 100) : Math.round(((b - a) / a) * 10000) / 100,
          }
        }),
        scores: runA.scores.map((sA: { evaluator: string; score: number }) => {
          const sB = runB.scores.find(
            (s: { evaluator: string; score: number }) => s.evaluator === sA.evaluator
          )
          return {
            evaluator: sA.evaluator,
            scoreA: sA.score,
            scoreB: sB?.score ?? 0,
            diff: (sB?.score ?? 0) - sA.score,
          }
        }),
      },
      traceDiff: {
        stepsA: runA.traceSteps.length,
        stepsB: runB.traceSteps.length,
        diff: runB.traceSteps.length - runA.traceSteps.length,
      },
    }

    // Detect regressions and create notifications
    const regressions: Array<{ metric: string; before: number; after: number; pctChange: number }> =
      []

    // Check score regressions (score dropped by more than 10%)
    for (const scoreDiff of comparison.diffs.scores) {
      if (scoreDiff.diff < 0 && scoreDiff.scoreA > 0) {
        const pctDropped = Math.abs(scoreDiff.diff / scoreDiff.scoreA)
        if (pctDropped > 0.1) {
          regressions.push({
            metric: `${scoreDiff.evaluator} score`,
            before: scoreDiff.scoreA,
            after: scoreDiff.scoreB,
            pctChange: Math.round(pctDropped * 100),
          })
        }
      }
    }

    // Check latency regression (duration increased by more than 20%)
    if (comparison.diffs.duration.changePercent > 20 && comparison.diffs.duration.diff > 0) {
      regressions.push({
        metric: 'duration',
        before: runA.duration ?? 0,
        after: runB.duration ?? 0,
        pctChange: comparison.diffs.duration.changePercent,
      })
    }

    // Create notifications for significant regressions
    if (regressions.length > 0) {
      try {
        const { createNotification } = await import('@/shared/lib/notifications')
        const project = await db.project.findUnique({
          where: { id: runA.projectId },
          select: { ownerId: true },
        })
        if (project?.ownerId) {
          for (const reg of regressions) {
            await createNotification(
              project.ownerId,
              'REGRESSION_DETECTED',
              `Regression detected in ${runA.name}`,
              `${reg.metric} dropped by ${reg.pctChange}% (${reg.before} → ${reg.after})`,
              `/runs/${runB.id}`,
              {
                runAId: runA.id,
                runBId: runB.id,
                projectName: (runA as { project?: { name?: string } }).project?.name ?? 'Unknown',
                metric: reg.metric,
                before: reg.before,
                after: reg.after,
                pctChange: reg.pctChange,
              }
            )
          }
        }
      } catch (notifError) {
        console.error('[compare] Failed to create regression notification:', notifError)
      }
    }

    return NextResponse.json(comparison)
  } catch (error) {
    console.error('Failed to compare runs:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
