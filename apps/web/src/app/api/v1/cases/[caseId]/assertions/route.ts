import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/shared/lib/db'
import { z } from 'zod'

const createAssertionSchema = z.object({
  type: z.string(),
  params: z.record(z.unknown()).optional().default({}),
  sortOrder: z.number().int().optional().default(0),
})

export async function GET(_req: NextRequest, { params }: { params: Promise<{ caseId: string }> }) {
  try {
    const { caseId } = await params
    const assertions = await db.testAssertion.findMany({
      where: { testCaseId: caseId },
      orderBy: { sortOrder: 'asc' },
    })
    return NextResponse.json({ assertions })
  } catch (error) {
    console.error('Failed to list assertions:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ caseId: string }> }) {
  try {
    const { caseId } = await params
    const body = await req.json()
    const parsed = createAssertionSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.flatten() },
        { status: 400 }
      )
    }

    const assertion = await db.testAssertion.create({
      data: {
        testCaseId: caseId,
        type: parsed.data.type,
        params: parsed.data.params as any,
        sortOrder: parsed.data.sortOrder,
      },
    })

    return NextResponse.json(assertion, { status: 201 })
  } catch (error) {
    console.error('Failed to create assertion:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ caseId: string }> }
) {
  try {
    const { caseId } = await params
    const { searchParams } = new URL(req.url)
    const id = searchParams.get('id')

    if (id) {
      await db.testAssertion.delete({ where: { id } })
    } else {
      // Delete all assertions for this case
      await db.testAssertion.deleteMany({ where: { testCaseId: caseId } })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Failed to delete assertion:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
