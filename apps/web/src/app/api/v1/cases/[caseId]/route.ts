import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/shared/lib/db'
import { z } from 'zod'

const updateCaseSchema = z.object({
  name: z.string().min(1).max(256).optional(),
  description: z.string().optional(),
  status: z.enum(['ACTIVE', 'DRAFT', 'ARCHIVED']).optional(),
  agentConfig: z.record(z.unknown()).optional(),
  input: z.record(z.unknown()).optional(),
  options: z.record(z.unknown()).optional(),
  tags: z.array(z.string()).optional(),
  sortOrder: z.number().int().optional(),
})

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ caseId: string }> },
) {
  try {
    const { caseId } = await params
    const testCase = await db.testCase.findUnique({
      where: { id: caseId },
      include: {
        suite: { select: { id: true, name: true, projectId: true } },
        assertions: { orderBy: { sortOrder: 'asc' } },
        evaluators: { orderBy: { sortOrder: 'asc' } },
      },
    })

    if (!testCase) {
      return NextResponse.json({ error: 'Test case not found' }, { status: 404 })
    }

    return NextResponse.json(testCase)
  } catch (error) {
    console.error('Failed to get case:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ caseId: string }> },
) {
  try {
    const { caseId } = await params
    const body = await req.json()
    const parsed = updateCaseSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: 'Validation failed', details: parsed.error.flatten() }, { status: 400 })
    }

    const testCase = await db.testCase.update({
      where: { id: caseId },
      data: parsed.data as any,
      include: {
        assertions: { orderBy: { sortOrder: 'asc' } },
        evaluators: { orderBy: { sortOrder: 'asc' } },
      },
    })

    return NextResponse.json(testCase)
  } catch (error) {
    console.error('Failed to update case:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ caseId: string }> },
) {
  try {
    const { caseId } = await params
    await db.testCase.delete({ where: { id: caseId } })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Failed to delete case:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
