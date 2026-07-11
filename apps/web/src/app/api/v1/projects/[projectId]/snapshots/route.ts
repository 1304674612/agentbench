import { NextRequest, NextResponse } from 'next/server'
import { withApiAuth } from '@/shared/lib/api-middleware'
import { db } from '@/shared/lib/db'
import { z } from 'zod'

const createSnapshotSchema = z.object({
  name: z.string().min(1).max(256),
  description: z.string().optional(),
  type: z.enum(['MANUAL', 'AUTO', 'CI']).default('MANUAL'),
  runId: z.string().optional(),
  data: z.record(z.unknown()),
  tags: z.array(z.string()).optional().default([]),
})

type ParamsCtx = { params: Promise<{ projectId: string }> }

export const GET = withApiAuth(async (_req: NextRequest, ctx: ParamsCtx) => {
  const { projectId } = await ctx.params
  try {
    const snapshots = await db.snapshot.findMany({
      where: { projectId },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        projectId: true,
        runId: true,
        name: true,
        description: true,
        type: true,
        tags: true,
        data: true,
        createdAt: true,
      },
    })

    const summaries = snapshots.map(
      (s: {
        id: string
        projectId: string
        runId?: string | null
        name: string
        description?: string | null
        type: string
        tags: string[]
        data: unknown
        createdAt: Date
      }) => {
        const d = s.data as Record<string, unknown>
        const tools = (d.tools as Array<unknown>) ?? []
        const ctx = (d.context ?? {}) as Record<string, unknown>
        const messages = (ctx.messages as Array<unknown>) ?? []
        const exec = (d.execution ?? {}) as Record<string, unknown>
        const steps = (exec.steps as Array<unknown>) ?? []
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { data, ...rest } = s
        return {
          ...rest,
          toolCount: tools.length,
          messageCount: messages.length,
          stepCount: steps.length,
        }
      }
    )

    return NextResponse.json({ snapshots: summaries })
  } catch (error) {
    console.error('Failed to list snapshots:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
})

export const POST = withApiAuth(
  async (req: NextRequest, ctx: ParamsCtx) => {
    const { projectId } = await ctx.params
    try {
      const body = await req.json()
      const parsed = createSnapshotSchema.safeParse(body)
      if (!parsed.success) {
        return NextResponse.json(
          { error: 'Validation failed', details: parsed.error.flatten() },
          { status: 400 }
        )
      }

      const snapshot = await db.snapshot.create({
        data: {
          projectId,
          name: parsed.data.name,
          description: parsed.data.description,
          type: parsed.data.type,
          runId: parsed.data.runId,
          data: parsed.data.data as any,
          tags: parsed.data.tags,
        },
      })

      return NextResponse.json(snapshot, { status: 201 })
    } catch (error) {
      console.error('Failed to create snapshot:', error)
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
  },
  { requireWrite: true }
)
