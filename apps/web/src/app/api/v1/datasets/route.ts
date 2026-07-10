import { type NextRequest, NextResponse } from 'next/server'
import { withRateLimit } from '@/shared/lib/api-middleware'
import { db } from '@/shared/lib/db'
import { handleApiError } from '@/shared/lib/error-handler'
import { z } from 'zod'

const listDatasetsSchema = z.object({
  projectId: z.string(),
  search: z.string().optional(),
  limit: z.coerce.number().min(1).max(100).optional().default(50),
  offset: z.coerce.number().min(0).optional().default(0),
  orderBy: z.enum(['createdAt', 'updatedAt', 'name', 'itemCount']).optional().default('updatedAt'),
  orderDir: z.enum(['asc', 'desc']).optional().default('desc'),
})

const createDatasetSchema = z.object({
  projectId: z.string(),
  name: z.string().min(1).max(256),
  description: z.string().max(1000).optional(),
  format: z.enum(['CSV', 'JSON', 'JSONL', 'MARKDOWN', 'CONVERSATION', 'CUSTOM']).default('JSON'),
  items: z
    .array(
      z.object({
        input: z.record(z.unknown()),
        expected: z.record(z.unknown()).optional(),
        metadata: z.record(z.unknown()).optional(),
      })
    )
    .optional(),
  tags: z.array(z.string()).optional().default([]),
})

export const POST = withRateLimit(async (req: NextRequest) => {
  try {
    const body = await req.json()
    const parsed = createDatasetSchema.parse(body)

    const { items, ...datasetData } = parsed

    const dataset = await db.dataset.create({
      data: {
        projectId: datasetData.projectId,
        name: datasetData.name,
        description: datasetData.description,
        format: datasetData.format,
        tags: datasetData.tags,
        ...(items && items.length > 0
          ? {
              itemCount: items.length,
              items: {
                create: items.map((item, i) => ({
                  input: item.input as any,
                  expected: (item.expected ?? null) as any,
                  metadata: (item.metadata ?? {}) as any,
                  sortOrder: i,
                })),
              },
            }
          : {}),
      },
      include: {
        _count: { select: { items: true } },
      },
    })

    const result = {
      ...dataset,
      itemCount: dataset._count.items,
      _count: undefined,
    }

    return NextResponse.json(result, { status: 201 })
  } catch (error) {
    return handleApiError(error)
  }
})

export const GET = async (req: NextRequest) => {
  try {
    const { searchParams } = new URL(req.url)
    const params = Object.fromEntries(searchParams.entries())
    const parsed = listDatasetsSchema.safeParse(params)
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid query parameters', details: parsed.error.flatten() },
        { status: 400 }
      )
    }

    const { projectId, search, limit, offset, orderBy, orderDir } = parsed.data

    const where: Record<string, unknown> = { projectId }
    if (search) {
      where.name = { contains: search, mode: 'insensitive' }
    }

    const [datasets, total] = await Promise.all([
      db.dataset.findMany({
        where,
        orderBy: { [orderBy]: orderDir },
        take: limit,
        skip: offset,
        include: {
          _count: { select: { items: true } },
        },
      }),
      db.dataset.count({ where }),
    ])

    const result = datasets.map((d) => ({
      ...d,
      itemCount: d._count.items,
      _count: undefined,
    }))

    return NextResponse.json({ datasets: result, total, limit, offset })
  } catch (error) {
    return handleApiError(error)
  }
}
