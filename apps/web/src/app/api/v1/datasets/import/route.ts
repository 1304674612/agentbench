import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/shared/lib/db'
import { handleApiError } from '@/shared/lib/error-handler'
import { z } from 'zod'

const importDatasetSchema = z.object({
  projectId: z.string(),
  name: z.string().min(1).max(256).optional(),
  format: z.enum(['CSV', 'JSON', 'JSONL']),
  data: z.union([z.string(), z.array(z.unknown())]),
  /** Split ratio: { train: 0.7, test: 0.2, validation: 0.1 } */
  split: z
    .object({
      train: z.number().min(0).max(1).optional(),
      test: z.number().min(0).max(1).optional(),
      validation: z.number().min(0).max(1).optional(),
    })
    .optional(),
})

export const POST = async (req: NextRequest) => {
  try {
    const contentType = req.headers.get('content-type') ?? ''

    let body: Record<string, unknown>

    if (contentType.includes('multipart/form-data')) {
      const formData = await req.formData()
      const file = formData.get('file') as File | null
      const projectId = formData.get('projectId') as string | null
      const name = formData.get('name') as string | null
      const format = formData.get('format') as string | null
      const splitStr = formData.get('split') as string | null

      if (!file || !projectId || !format) {
        return NextResponse.json(
          { error: 'file, projectId, and format are required' },
          { status: 400 }
        )
      }

      const data = await file.text()
      body = {
        projectId,
        name: name ?? file.name.replace(/\.[^.]+$/, ''),
        format,
        data,
        ...(splitStr ? { split: JSON.parse(splitStr) } : {}),
      }
    } else {
      body = await req.json()
    }

    const parsed = importDatasetSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.flatten() },
        { status: 400 }
      )
    }

    const { projectId, name, format, data, split } = parsed.data

    // Parse data into items
    let items: Array<{ input: unknown; expected?: unknown }> = []

    if (Array.isArray(data)) {
      items = data as Array<{ input: unknown; expected?: unknown }>
    } else if (format === 'JSONL') {
      items = data
        .split('\n')
        .filter((line) => line.trim())
        .map((line) => JSON.parse(line))
    } else if (format === 'CSV') {
      const lines = data.split('\n')
      if (lines.length < 2) {
        return NextResponse.json(
          { error: 'CSV must have a header row and at least one data row' },
          { status: 400 }
        )
      }
      const headers = lines[0].split(',').map((h) => h.trim().toLowerCase())
      items = lines
        .slice(1)
        .filter((line) => line.trim())
        .map((line) => {
          const values = line.split(',').map((v) => v.trim())
          const obj: Record<string, string> = {}
          headers.forEach((h, i) => {
            obj[h] = values[i] ?? ''
          })
          return {
            input: { messages: [{ role: 'user', content: obj.input ?? obj.question ?? line }] },
            expected:
              obj.expected ?? obj.answer ?? obj.output
                ? { content: obj.expected ?? obj.answer ?? obj.output }
                : undefined,
          }
        })
    }

    if (items.length === 0) {
      return NextResponse.json({ error: 'No valid items found in import data' }, { status: 400 })
    }

    // Calculate splits based on ratios
    const splitConfig = split ?? { train: 0.8, test: 0.2, validation: 0 }
    const total = items.length
    const trainEnd = Math.floor(total * (splitConfig.train ?? 0.8))
    const testEnd = trainEnd + Math.floor(total * (splitConfig.test ?? 0.2))

    // Store split info in metadata since the DatasetItem model uses metadata for extensibility
    const dataset = await db.dataset.create({
      data: {
        projectId,
        name: name ?? `Imported Dataset (${new Date().toISOString().slice(0, 10)})`,
        format,
        itemCount: items.length,
        tags: ['imported'],
        items: {
          create: items.map((item, i) => ({
            input: item.input as any,
            expected: (item.expected ?? null) as any,
            metadata: {
              split: i < trainEnd ? 'TRAIN' : i < testEnd ? 'TEST' : 'VALIDATION',
            } as any,
            sortOrder: i,
          })),
        },
      },
    })

    return NextResponse.json(
      {
        dataset: { id: dataset.id, name: dataset.name, format: dataset.format },
        imported: items.length,
        split: { train: trainEnd, test: testEnd - trainEnd, validation: total - testEnd },
      },
      { status: 201 }
    )
  } catch (error) {
    return handleApiError(error)
  }
}
