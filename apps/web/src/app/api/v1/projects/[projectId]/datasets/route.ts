import { NextRequest, NextResponse } from 'next/server'
import { withApiAuth } from '@/shared/lib/api-middleware'
import { db } from '@/shared/lib/db'
import { z } from 'zod'

const createDatasetSchema = z.object({
  name: z.string().min(1).max(256),
  description: z.string().optional(),
  format: z.enum(['CSV', 'JSON', 'JSONL', 'MARKDOWN']).default('JSON'),
  tags: z.array(z.string()).optional().default([]),
})

const importSchema = z.object({
  format: z.enum(['CSV', 'JSON', 'JSONL']),
  data: z.union([z.string(), z.array(z.unknown())]),
  /** Split ratio: { train: 0.7, test: 0.2, validation: 0.1 } */
  split: z.object({
    train: z.number().optional(),
    test: z.number().optional(),
    validation: z.number().optional(),
  }).optional(),
})

type ParamsCtx = { params: Promise<{ projectId: string }> }

export const GET = withApiAuth(async (
  req: NextRequest,
  ctx: ParamsCtx,
) => {
  const { projectId } = await ctx.params
  try {
    const { searchParams } = new URL(req.url)
    const split = searchParams.get('split')

    const where: Record<string, unknown> = { projectId }
    const itemWhere: Record<string, unknown> = {}
    if (split) itemWhere.split = split

    const datasets = await db.dataset.findMany({
      where,
      include: {
        _count: { select: { items: true } },
      },
      orderBy: { updatedAt: 'desc' },
    })

    return NextResponse.json({
      datasets: datasets.map((d: { id: string; name: string; description?: string | null; format: string; tags: string[]; createdAt: Date; updatedAt: Date; _count: { items: number } }) => ({
        ...d,
        itemCount: d._count.items,
        _count: undefined,
      })),
    })
  } catch (error) {
    console.error('Failed to list datasets:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
})

export const POST = withApiAuth(async (
  req: NextRequest,
  ctx: ParamsCtx,
) => {
  const { projectId } = await ctx.params
  try {
    const body = await req.json()
    const action = body.action ?? 'create'

    if (action === 'import') {
      const parsed = importSchema.safeParse(body)
      if (!parsed.success) {
        return NextResponse.json({ error: 'Validation failed', details: parsed.error.flatten() }, { status: 400 })
      }
      return handleImport(projectId, parsed.data)
    }

    const parsed = createDatasetSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: 'Validation failed', details: parsed.error.flatten() }, { status: 400 })
    }

    const dataset = await db.dataset.create({
      data: {
        projectId,
        name: parsed.data.name,
        description: parsed.data.description,
        format: parsed.data.format,
        tags: parsed.data.tags,
      },
    })

    return NextResponse.json(dataset, { status: 201 })
  } catch (error) {
    console.error('Failed to create dataset:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}, { requireWrite: true })

async function handleImport(
  projectId: string,
  params: z.infer<typeof importSchema>,
): Promise<NextResponse> {
  let items: Array<{ input: unknown; expected?: unknown }> = []

  if (Array.isArray(params.data)) {
    items = params.data as Array<{ input: unknown; expected?: unknown }>
  } else if (params.format === 'JSONL') {
    items = params.data
      .split('\n')
      .filter((line) => line.trim())
      .map((line) => JSON.parse(line))
  } else if (params.format === 'CSV') {
    const lines = params.data.split('\n')
    const headers = lines[0].split(',').map((h) => h.trim().toLowerCase())
    items = lines.slice(1).map((line) => {
      const values = line.split(',').map((v) => v.trim())
      const obj: Record<string, string> = {}
      headers.forEach((h, i) => { obj[h] = values[i] ?? '' })
      return {
        input: { messages: [{ role: 'user', content: obj.input ?? obj.question ?? line }] },
        expected: obj.expected ?? obj.answer ?? obj.output ? { content: obj.expected ?? obj.answer ?? obj.output } : undefined,
      }
    })
  }

  if (items.length === 0) {
    return NextResponse.json({ error: 'No valid items found in import data' }, { status: 400 })
  }

  // Create the dataset
  const dataset = await db.dataset.create({
    data: {
      projectId,
      name: `Imported Dataset (${new Date().toISOString().slice(0, 10)})`,
      format: 'JSON',
      tags: ['imported'],
    },
  })

  // Create items with optional split
  const split = params.split ?? { train: 0.8, test: 0.2, validation: 0 }
  const total = items.length
  const trainEnd = Math.floor(total * (split.train ?? 0.8))
  const testEnd = trainEnd + Math.floor(total * (split.test ?? 0.2))

  await db.datasetItem.createMany({
    data: items.map((item, i) => ({
      datasetId: dataset.id,
      input: item.input as any,
      expected: item.expected as any,
      split: i < trainEnd ? 'TRAIN' : i < testEnd ? 'TEST' : 'VALIDATION',
      sortOrder: i,
    })),
  })

  return NextResponse.json({
    dataset,
    imported: items.length,
    split: { train: trainEnd, test: testEnd - trainEnd, validation: total - testEnd },
  }, { status: 201 })
}

export const DELETE = withApiAuth(async (
  req: NextRequest,
  ctx: ParamsCtx,
) => {
  const { projectId } = await ctx.params
  try {
    const { searchParams } = new URL(req.url)
    const id = searchParams.get('id')

    if (id) {
      await db.dataset.delete({ where: { id } })
    } else {
      return NextResponse.json({ error: 'Dataset ID required' }, { status: 400 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Failed to delete dataset:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}, { requireWrite: true })
