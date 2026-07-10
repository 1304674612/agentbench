import { type NextRequest, NextResponse } from 'next/server'
import { withRateLimit } from '@/shared/lib/api-middleware'
import { db } from '@/shared/lib/db'
import { handleApiError } from '@/shared/lib/error-handler'
import { z } from 'zod'

const listExperimentsSchema = z.object({
  projectId: z.string().optional(),
  status: z.enum(['DRAFT', 'RUNNING', 'COMPLETED', 'FAILED', 'CANCELLED']).optional(),
  search: z.string().optional(),
  limit: z.coerce.number().min(1).max(100).optional().default(50),
  offset: z.coerce.number().min(0).optional().default(0),
  orderBy: z.enum(['createdAt', 'updatedAt', 'name']).optional().default('createdAt'),
  orderDir: z.enum(['asc', 'desc']).optional().default('desc'),
})

const createExperimentSchema = z.object({
  projectId: z.string(),
  name: z.string().min(1).max(256),
  description: z.string().max(1000).optional(),
  config: z.object({
    variants: z
      .array(
        z.object({
          name: z.string().min(1),
          config: z.record(z.unknown()).default({}),
        })
      )
      .min(2)
      .max(10),
    metrics: z
      .array(
        z.object({
          name: z.string(),
          type: z.enum(['score', 'latency', 'tokens', 'cost', 'tool_calls', 'custom']),
          direction: z.enum(['higher_is_better', 'lower_is_better']),
        })
      )
      .optional(),
    options: z
      .object({
        runsPerVariant: z.number().int().min(1).max(100).optional(),
        concurrency: z.number().int().min(1).max(10).optional(),
        timeout: z.number().int().min(1000).optional(),
      })
      .optional(),
  }),
})

export const POST = withRateLimit(async (req: NextRequest) => {
  try {
    const body = await req.json()
    const parsed = createExperimentSchema.parse(body)

    const experiment = await db.experiment.create({
      data: {
        projectId: parsed.projectId,
        name: parsed.name,
        description: parsed.description,
        config: parsed.config as any,
        variants: {
          create: parsed.config.variants.map((v) => ({
            name: v.name,
            config: v.config as any,
          })),
        },
      },
      include: { variants: true },
    })

    return NextResponse.json(experiment, { status: 201 })
  } catch (error) {
    return handleApiError(error)
  }
})

export const GET = async (req: NextRequest) => {
  try {
    const { searchParams } = new URL(req.url)
    const params = Object.fromEntries(searchParams.entries())
    const parsed = listExperimentsSchema.safeParse(params)
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid query parameters', details: parsed.error.flatten() },
        { status: 400 }
      )
    }

    const { projectId, status, search, limit, offset, orderBy, orderDir } = parsed.data

    const where: Record<string, unknown> = {}
    if (projectId) where.projectId = projectId
    if (status) where.status = status
    if (search) {
      where.name = { contains: search, mode: 'insensitive' }
    }

    const [experiments, total] = await Promise.all([
      db.experiment.findMany({
        where,
        orderBy: { [orderBy]: orderDir },
        take: limit,
        skip: offset,
        include: {
          variants: true,
          _count: { select: { runs: true } },
        },
      }),
      db.experiment.count({ where }),
    ])

    const result = experiments.map((e) => ({
      ...e,
      runCount: e._count.runs,
      _count: undefined,
    }))

    return NextResponse.json({ experiments: result, total, limit, offset })
  } catch (error) {
    return handleApiError(error)
  }
}
