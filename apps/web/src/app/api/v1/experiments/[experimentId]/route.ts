import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/shared/lib/db'
import { z } from 'zod'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ experimentId: string }> },
) {
  try {
    const { experimentId } = await params
    const experiment = await db.experiment.findUnique({
      where: { id: experimentId },
      include: {
        variants: true,
        runs: {
          include: {
            run: {
              select: { id: true, name: true, status: true, metrics: true, scores: true, duration: true },
            },
          },
        },
      },
    })

    if (!experiment) {
      return NextResponse.json({ error: 'Experiment not found' }, { status: 404 })
    }

    // Compute summary
    const variantRuns = new Map<string, Array<{ metrics: unknown; scores: unknown; status: string }>>()
    for (const er of experiment.runs) {
      const name = experiment.variants.find((v: { id: string; name: string }) => v.id === er.variantId)?.name ?? 'unknown'
      if (!variantRuns.has(name)) variantRuns.set(name, [])
      variantRuns.get(name)!.push(er.run)
    }

    const summary: Record<string, { runCount: number; passedCount: number; avgDuration: number }> = {}
    for (const [name, runs] of variantRuns) {
      const durations = runs.map((r) => (r as { duration?: number }).duration ?? 0)
      summary[name] = {
        runCount: runs.length,
        passedCount: runs.filter((r) => r.status === 'PASSED').length,
        avgDuration: runs.length > 0 ? Math.round(durations.reduce((s: number, d: number) => s + d, 0) / runs.length) : 0,
      }
    }

    return NextResponse.json({ ...experiment, summary })
  } catch (error) {
    console.error('Failed to get experiment:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

const runExperimentSchema = z.object({
  /** Whether to actually create runs (or simulate) */
  dryRun: z.boolean().optional().default(false),
})

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ experimentId: string }> },
) {
  try {
    const { experimentId } = await params
    const body = await req.json()
    const parsed = runExperimentSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: 'Validation failed', details: parsed.error.flatten() }, { status: 400 })
    }

    const experiment = await db.experiment.findUnique({
      where: { id: experimentId },
      include: { variants: true },
    })
    if (!experiment) {
      return NextResponse.json({ error: 'Experiment not found' }, { status: 404 })
    }

    const config = experiment.config as Record<string, unknown>
    const options = (config.options ?? {}) as Record<string, number>
    const runsPerVariant = options.runsPerVariant ?? 10

    if (parsed.data.dryRun) {
      return NextResponse.json({
        message: 'Dry run — no actual runs created',
        variantCount: experiment.variants.length,
        runsPerVariant,
        totalRuns: experiment.variants.length * runsPerVariant,
      })
    }

    // Create runs for each variant
    const createdRuns = []
    for (const variant of experiment.variants) {
      const varConfig = variant.config as Record<string, unknown>
      for (let i = 0; i < runsPerVariant; i++) {
        const run = await db.run.create({
          data: {
            projectId: experiment.projectId,
            name: `${experiment.name} — ${variant.name} #${i + 1}`,
            config: {
              agent: {
                provider: 'openai',
                model: varConfig.model ?? 'gpt-4o',
                temperature: varConfig.temperature ?? 0.7,
                maxTokens: varConfig.maxTokens ?? 4096,
                systemPrompt: varConfig.systemPrompt ?? varConfig.prompt ?? '',
              },
            },
            tags: ['experiment', `experiment:${experimentId}`, `variant:${variant.name}`],
          },
        })

        await db.experimentRun.create({
          data: {
            experimentId: experiment.id,
            variantId: variant.id,
            runId: run.id,
          },
        })

        createdRuns.push({ id: run.id, variant: variant.name, index: i })
      }
    }

    // Update experiment status
    await db.experiment.update({
      where: { id: experimentId },
      data: { status: 'RUNNING', startedAt: new Date() },
    })

    return NextResponse.json({
      message: `Created ${createdRuns.length} runs across ${experiment.variants.length} variants`,
      runs: createdRuns,
    }, { status: 201 })
  } catch (error) {
    console.error('Failed to run experiment:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ experimentId: string }> },
) {
  try {
    const { experimentId } = await params
    await db.experiment.delete({ where: { id: experimentId } })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Failed to delete experiment:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
