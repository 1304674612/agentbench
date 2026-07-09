import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/shared/lib/db'
import { z } from 'zod'

const createExperimentSchema = z.object({
  name: z.string().min(1).max(256),
  description: z.string().optional(),
  /** Variant A configuration */
  variantA: z.object({
    prompt: z.string().optional(),
    model: z.string().optional(),
    temperature: z.number().optional(),
    maxTokens: z.number().optional(),
    systemPrompt: z.string().optional(),
  }),
  /** Variant B configuration */
  variantB: z.object({
    prompt: z.string().optional(),
    model: z.string().optional(),
    temperature: z.number().optional(),
    maxTokens: z.number().optional(),
    systemPrompt: z.string().optional(),
  }),
  runsPerVariant: z.number().int().min(2).max(100).optional().default(10),
  metrics: z.array(z.object({
    name: z.string(),
    type: z.enum(['score', 'latency', 'tokens', 'cost', 'tool_calls', 'custom']),
    direction: z.enum(['higher_is_better', 'lower_is_better']),
  })).optional(),
})

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ projectId: string }> },
) {
  try {
    const { projectId } = await params
    const experiments = await db.experiment.findMany({
      where: { projectId },
      orderBy: { createdAt: 'desc' },
      include: {
        variants: true,
        _count: { select: { runs: true } },
      },
    })

    return NextResponse.json({
      experiments: experiments.map((e: { id: string; name: string; description?: string | null; status: string; config: unknown; conclusion?: string | null; createdAt: Date; variants: Array<unknown>; _count: { runs: number } }) => ({
        ...e,
        runCount: e._count.runs,
        _count: undefined,
      })),
    })
  } catch (error) {
    console.error('Failed to list experiments:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ projectId: string }> },
) {
  try {
    const { projectId } = await params
    const body = await req.json()
    const parsed = createExperimentSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: 'Validation failed', details: parsed.error.flatten() }, { status: 400 })
    }

    const defaultMetrics = [
      { name: 'score', type: 'score' as const, direction: 'higher_is_better' as const },
      { name: 'latency', type: 'latency' as const, direction: 'lower_is_better' as const },
      { name: 'tokens', type: 'tokens' as const, direction: 'lower_is_better' as const },
      { name: 'cost', type: 'cost' as const, direction: 'lower_is_better' as const },
    ]

    const experiment = await db.experiment.create({
      data: {
        projectId,
        name: parsed.data.name,
        description: parsed.data.description,
        config: {
          name: parsed.data.name,
          projectId,
          variants: [
            { name: 'A', config: parsed.data.variantA },
            { name: 'B', config: parsed.data.variantB },
          ],
          metrics: parsed.data.metrics ?? defaultMetrics,
          options: {
            runsPerVariant: parsed.data.runsPerVariant,
            concurrency: 2,
            timeout: 60000,
          },
        },
        variants: {
          create: [
            { name: 'A', config: parsed.data.variantA },
            { name: 'B', config: parsed.data.variantB },
          ],
        },
      },
      include: { variants: true },
    })

    return NextResponse.json(experiment, { status: 201 })
  } catch (error) {
    console.error('Failed to create experiment:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
