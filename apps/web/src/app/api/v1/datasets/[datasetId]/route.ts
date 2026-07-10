import { NextRequest, NextResponse } from 'next/server'
import { withApiAuth } from '@/shared/lib/api-middleware'
import { db } from '@/shared/lib/db'
import { z } from 'zod'

const updateDatasetSchema = z.object({
  name: z.string().min(1).max(256).optional(),
  description: z.string().max(1000).optional(),
  format: z.enum(['CSV', 'JSON', 'JSONL', 'MARKDOWN', 'CONVERSATION', 'CUSTOM']).optional(),
  tags: z.array(z.string()).optional(),
})

type ParamsCtx = { params: Promise<{ datasetId: string }> }

export const GET = withApiAuth(async (
  _req: NextRequest,
  ctx: ParamsCtx,
) => {
  const { datasetId } = await ctx.params
  try {
    const dataset = await db.dataset.findUnique({
      where: { id: datasetId },
      include: {
        items: {
          orderBy: { sortOrder: 'asc' },
        },
        _count: { select: { items: true, runs: true } },
      },
    })

    if (!dataset) {
      return NextResponse.json({ error: 'Dataset not found' }, { status: 404 })
    }

    const result = {
      ...dataset,
      itemCount: dataset._count.items,
      runCount: dataset._count.runs,
      _count: undefined,
    }

    return NextResponse.json(result)
  } catch (error) {
    console.error('Failed to get dataset:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
})

export const PUT = withApiAuth(async (
  req: NextRequest,
  ctx: ParamsCtx,
) => {
  const { datasetId } = await ctx.params
  try {
    const body = await req.json()
    const parsed = updateDatasetSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.flatten() },
        { status: 400 }
      )
    }

    const dataset = await db.dataset.update({
      where: { id: datasetId },
      data: parsed.data,
    })

    return NextResponse.json(dataset)
  } catch (error) {
    console.error('Failed to update dataset:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}, { requireWrite: true })

export const DELETE = withApiAuth(async (
  _req: NextRequest,
  ctx: ParamsCtx,
) => {
  const { datasetId } = await ctx.params
  try {
    await db.dataset.delete({ where: { id: datasetId } })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Failed to delete dataset:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}, { requireWrite: true })
