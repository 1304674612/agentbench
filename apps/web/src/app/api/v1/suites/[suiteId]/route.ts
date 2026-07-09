import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/shared/lib/db'
import { z } from 'zod'

const updateSuiteSchema = z.object({
  name: z.string().min(1).max(256).optional(),
  description: z.string().optional(),
  sortOrder: z.number().int().optional(),
})

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ suiteId: string }> },
) {
  try {
    const { suiteId } = await params
    const suite = await db.testSuite.findUnique({
      where: { id: suiteId },
      include: {
        cases: { orderBy: { sortOrder: 'asc' } },
        _count: { select: { cases: true } },
      },
    })

    if (!suite) {
      return NextResponse.json({ error: 'Suite not found' }, { status: 404 })
    }

    const result = { ...suite, caseCount: suite._count.cases, _count: undefined }
    return NextResponse.json(result)
  } catch (error) {
    console.error('Failed to get suite:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ suiteId: string }> },
) {
  try {
    const { suiteId } = await params
    const body = await req.json()
    const parsed = updateSuiteSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: 'Validation failed', details: parsed.error.flatten() }, { status: 400 })
    }

    const suite = await db.testSuite.update({
      where: { id: suiteId },
      data: parsed.data,
    })

    return NextResponse.json(suite)
  } catch (error) {
    console.error('Failed to update suite:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ suiteId: string }> },
) {
  try {
    const { suiteId } = await params
    await db.testSuite.delete({ where: { id: suiteId } })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Failed to delete suite:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
