import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/shared/lib/db'
import { createTestSuiteSchema } from '@/shared/lib/validations'
import { handleApiError } from '@/shared/lib/error-handler'

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

    const result = suites.map(
      (s: { _count: { cases: number }; [key: string]: unknown }) => ({
        ...s,
        caseCount: s._count.cases,
        _count: undefined,
      }),
    )

    return NextResponse.json({ suites: result })
  } catch (error) {
    return handleApiError(error)
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const parsed = createTestSuiteSchema.parse(body)

    const suite = await db.testSuite.create({
      data: {
        projectId: parsed.projectId,
        name: parsed.name,
        description: parsed.description,
      },
    })

    return NextResponse.json(suite, { status: 201 })
  } catch (error) {
    return handleApiError(error)
  }
}
