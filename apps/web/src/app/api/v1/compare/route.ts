import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/shared/lib/db'
import { z } from 'zod'

const compareSchema = z.object({
  runAId: z.string(),
  runBId: z.string(),
})

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const parsed = compareSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: 'Validation failed', details: parsed.error.flatten() }, { status: 400 })
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
          changePercent: runA.duration ? Math.round((((runB.duration ?? 0) - (runA.duration ?? 0)) / runA.duration) * 10000) / 100 : 0,
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
          const sB = runB.scores.find((s: { evaluator: string; score: number }) => s.evaluator === sA.evaluator)
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

    return NextResponse.json(comparison)
  } catch (error) {
    console.error('Failed to compare runs:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
