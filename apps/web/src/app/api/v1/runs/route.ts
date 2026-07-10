import { type NextRequest, NextResponse } from 'next/server'
import { withRateLimit } from '@/shared/lib/api-middleware'
import { db } from '@/shared/lib/db'
import { handleApiError } from '@/shared/lib/error-handler'
import { createRunSchema, paginationSchema } from '@/shared/lib/validations'

const runQuerySchema = paginationSchema.extend({
  projectId: z.string().optional(),
  status: z.string().optional(),
  search: z.string().optional(),
  limit: z.coerce.number().min(1).max(100).optional().default(50),
  offset: z.coerce.number().min(0).optional().default(0),
  orderBy: z
    .enum(['createdAt', 'duration', 'totalTokens', 'totalCost'])
    .optional()
    .default('createdAt'),
  orderDir: z.enum(['asc', 'desc']).optional().default('desc'),
})

import { z } from 'zod'

export const POST = withRateLimit(async (req: NextRequest) => {
  try {
    const body = await req.json()
    const parsed = createRunSchema.parse(body)

    const run = await db.run.create({
      data: {
        projectId: parsed.projectId,
        testCaseId: parsed.testCaseId,
        name: parsed.name,
        config: (parsed.config ?? {}) as any,
        tags: parsed.tags ?? [],
        metadata: {},
      },
    })

    // Schedule notification creation after run completes
    // In production, this would happen in a background job after agent execution
    // For now, we create a pending notification that will be updated when the run completes
    if (parsed.projectId) {
      try {
        const { createNotification } = await import('@/shared/lib/notifications')
        // Use the first user associated with this project, or anonymous
        const project = await db.project.findUnique({
          where: { id: parsed.projectId },
          select: { ownerId: true },
        })
        if (project?.ownerId) {
          const score = (parsed.config as Record<string, unknown>)?.expectedScore as
            | number
            | undefined
          await createNotification(
            project.ownerId,
            'RUN_COMPLETED',
            `Run "${parsed.name}" completed`,
            `Your run "${parsed.name}" has been created and is pending execution. It will be automatically evaluated once processing completes.`,
            `/runs/${run.id}`,
            { runId: run.id, status: 'PENDING', score }
          )
        }
      } catch (notifError) {
        // Don't fail the run creation if notification fails
        console.error('[runs] Failed to create notification:', notifError)
      }
    }

    return NextResponse.json(run, { status: 201 })
  } catch (error) {
    return handleApiError(error)
  }
})

export const GET = async (req: NextRequest) => {
  try {
    const { searchParams } = new URL(req.url)
    const params = Object.fromEntries(searchParams.entries())
    const parsed = runQuerySchema.safeParse(params)
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

    const summaries = runs.map(
      (r: {
        id: string
        name: string
        status: string
        projectId: string
        testCaseId?: string | null
        duration?: number | null
        metrics?: unknown
        tags: string[]
        createdAt: Date
      }) => ({
        ...r,
        totalTokens: (r.metrics as Record<string, unknown> | null)?.totalTokens as
          | number
          | undefined,
        totalCost: (r.metrics as Record<string, unknown> | null)?.totalCost as number | undefined,
        metrics: undefined,
      })
    )

    return NextResponse.json({ runs: summaries, total, limit, offset })
  } catch (error) {
    return handleApiError(error)
  }
}
