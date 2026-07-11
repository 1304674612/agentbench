import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/shared/lib/db'
import { z } from 'zod'

const exportQuerySchema = z.object({
  format: z.enum(['csv', 'json', 'jsonl']).optional().default('json'),
})

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ datasetId: string }> }
) {
  try {
    const { datasetId } = await params
    const { searchParams } = new URL(req.url)
    const parsed = exportQuerySchema.safeParse(Object.fromEntries(searchParams.entries()))
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid query parameters', details: parsed.error.flatten() },
        { status: 400 }
      )
    }

    const { format } = parsed.data

    const dataset = await db.dataset.findUnique({
      where: { id: datasetId },
      select: { id: true, name: true, format: true },
    })
    if (!dataset) {
      return NextResponse.json({ error: 'Dataset not found' }, { status: 404 })
    }

    const items = await db.datasetItem.findMany({
      where: { datasetId },
      orderBy: { sortOrder: 'asc' },
      select: {
        input: true,
        expected: true,
        metadata: true,
      },
    })

    const rows = items.map((item) => ({
      input: item.input,
      expected: item.expected,
      metadata: item.metadata,
    }))

    switch (format) {
      case 'csv': {
        const headers = ['input', 'expected']
        const csvRows = [headers.join(',')]
        for (const row of rows) {
          csvRows.push(
            [JSON.stringify(row.input), row.expected ? JSON.stringify(row.expected) : ''].join(',')
          )
        }
        return new NextResponse(csvRows.join('\n'), {
          status: 200,
          headers: {
            'Content-Type': 'text/csv',
            'Content-Disposition': `attachment; filename="${dataset.name}.csv"`,
          },
        })
      }
      case 'jsonl': {
        const jsonlRows = rows.map((row) => JSON.stringify(row))
        return new NextResponse(jsonlRows.join('\n'), {
          status: 200,
          headers: {
            'Content-Type': 'application/jsonl',
            'Content-Disposition': `attachment; filename="${dataset.name}.jsonl"`,
          },
        })
      }
      case 'json':
      default: {
        return NextResponse.json({
          dataset: { id: dataset.id, name: dataset.name },
          items: rows,
          exportedAt: new Date().toISOString(),
        })
      }
    }
  } catch (error) {
    console.error('Failed to export dataset:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
