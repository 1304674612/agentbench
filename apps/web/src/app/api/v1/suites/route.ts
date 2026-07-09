import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/shared/lib/db'
import { z } from 'zod'

const createSuiteSchema = z.object({
  projectId: z.string(),
  name: z.string().min(1).max(256),
  description: z.string().optional(),
  sortOrder: z.number().int().optional().default(0),
})

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const projectId = searchParams.get('projectId')

    if (!projectId) {
      return NextResponse.json({ error: 'projectId is required' }, { status: 400 })
    }

    const suites = await db.testSuite.findMany({
      where: { projectId },
      orderBy: { sortOrder: 'asc' },
      include: {
        _count: { select: { cases: true } },
      },
    })

    const result = suites.map((s: { _count: { cases: number }; [key: string]: unknown }) => ({
      ...s,
      caseCount: s._count.cases,
      _count: undefined,
    }))

    return NextResponse.json({ suites: result })
  } catch (error) {
    console.error('Failed to list suites:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const parsed = createSuiteSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: 'Validation failed', details: parsed.error.flatten() }, { status: 400 })
    }

    const suite = await db.testSuite.create({
      data: {
        projectId: parsed.data.projectId,
        name: parsed.data.name,
        description: parsed.data.description,
        sortOrder: parsed.data.sortOrder,
      },
    })

    return NextResponse.json(suite, { status: 201 })
  } catch (error) {
    console.error('Failed to create suite:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
