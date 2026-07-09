import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/shared/lib/db'
import { z } from 'zod'

const createRunSchema = z.object({
  projectId: z.string(),
  testCaseId: z.string().optional(),
  name: z.string().min(1).max(256),
  config: z.record(z.unknown()).optional(),
  tags: z.array(z.string()).optional(),
  metadata: z.record(z.unknown()).optional(),
})

const runQuerySchema = z.object({
  projectId: z.string().optional(),
  status: z.string().optional(),
  search: z.string().optional(),
  limit: z.coerce.number().min(1).max(100).optional().default(50),
  offset: z.coerce.number().min(0).optional().default(0),
  orderBy: z.enum(['createdAt', 'duration', 'totalTokens', 'totalCost']).optional().default('createdAt'),
  orderDir: z.enum(['asc', 'desc']).optional().default('desc'),
})

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const parsed = createRunSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: 'Validation failed', details: parsed.error.flatten() }, { status: 400 })
    }

    const run = await db.run.create({
      data: {
        projectId: parsed.data.projectId,
        testCaseId: parsed.data.testCaseId,
        name: parsed.data.name,
        config: (parsed.data.config ?? {}) as any,
        tags: parsed.data.tags ?? [],
        metadata: (parsed.data.metadata ?? {}) as any,
      },
    })

    return NextResponse.json(run, { status: 201 })
  } catch (error) {
    console.error('Failed to create run:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const params = Object.fromEntries(searchParams.entries())
    const parsed = runQuerySchema.safeParse(params)
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid query parameters', details: parsed.error.flatten() }, { status: 400 })
    }

    const { projectId, status, search, limit, offset, orderBy, orderDir } = parsed.data

    const where: Record<string, unknown> = {}
    if (projectId) where.projectId = projectId
    if (status) where.status = status
    if (search) {
      where.name = { contains: search, mode: 'insensitive' }
    }

    const [runs, total] = await Promise.all([
      db.run.findMany({
        where,
        orderBy: { [orderBy]: orderDir },
        take: limit,
        skip: offset,
        select: {
          id: true,
          name: true,
          status: true,
          projectId: true,
          testCaseId: true,
          duration: true,
          metrics: true,
          tags: true,
          createdAt: true,
        },
      }),
      db.run.count({ where }),
    ])

    const summaries = runs.map((r: { id: string; name: string; status: string; projectId: string; testCaseId?: string | null; duration?: number | null; metrics?: unknown; tags: string[]; createdAt: Date }) => ({
      ...r,
      totalTokens: (r.metrics as Record<string, unknown> | null)?.totalTokens as number | undefined,
      totalCost: (r.metrics as Record<string, unknown> | null)?.totalCost as number | undefined,
      metrics: undefined,
    }))

    return NextResponse.json({ runs: summaries, total, limit, offset })
  } catch (error) {
    console.error('Failed to list runs:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
