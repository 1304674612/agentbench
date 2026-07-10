import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/shared/lib/db'
import { z } from 'zod'

const listItemsSchema = z.object({
  offset: z.coerce.number().min(0).optional().default(0),
  limit: z.coerce.number().min(1).max(100).optional().default(50),
})

const addItemsSchema = z.object({
  items: z
    .array(
      z.object({
        input: z.record(z.unknown()),
        expected: z.record(z.unknown()).optional(),
        metadata: z.record(z.unknown()).optional(),
      })
    )
    .min(1),
})

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ datasetId: string }> },
) {
  try {
    const { datasetId } = await params
    const { searchParams } = new URL(req.url)
    const parsed = listItemsSchema.safeParse(
      Object.fromEntries(searchParams.entries())
    )
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid query parameters', details: parsed.error.flatten() },
        { status: 400 }
      )
    }

    const { offset, limit } = parsed.data

    // Verify dataset exists
    const dataset = await db.dataset.findUnique({
      where: { id: datasetId },
      select: { id: true },
    })
    if (!dataset) {
      return NextResponse.json({ error: 'Dataset not found' }, { status: 404 })
    }

    const [items, total] = await Promise.all([
      db.datasetItem.findMany({
        where: { datasetId },
        orderBy: { sortOrder: 'asc' },
        take: limit,
        skip: offset,
      }),
      db.datasetItem.count({ where: { datasetId } }),
    ])

    return NextResponse.json({ items, total, limit, offset })
  } catch (error) {
    console.error('Failed to list dataset items:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ datasetId: string }> },
) {
  try {
    const { datasetId } = await params
    const body = await req.json()
    const parsed = addItemsSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.flatten() },
        { status: 400 }
      )
    }

    // Verify dataset exists
    const dataset = await db.dataset.findUnique({
      where: { id: datasetId },
      select: { id: true },
    })
    if (!dataset) {
      return NextResponse.json({ error: 'Dataset not found' }, { status: 404 })
    }

    // Get the current max sortOrder to append items
    const lastItem = await db.datasetItem.findFirst({
      where: { datasetId },
      orderBy: { sortOrder: 'desc' },
      select: { sortOrder: true },
    })
    const startOrder = (lastItem?.sortOrder ?? -1) + 1

    const created = await db.datasetItem.createMany({
      data: parsed.data.items.map((item, i) => ({
        datasetId,
        input: item.input as any,
        expected: (item.expected ?? null) as any,
        metadata: (item.metadata ?? {}) as any,
        sortOrder: startOrder + i,
      })),
    })

    // Update dataset itemCount
    await db.dataset.update({
      where: { id: datasetId },
      data: { itemCount: { increment: created.count } },
    })

    return NextResponse.json({ added: created.count }, { status: 201 })
  } catch (error) {
    console.error('Failed to add dataset items:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
