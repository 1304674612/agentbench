import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/shared/lib/db'
import { z } from 'zod'

const createEvaluatorSchema = z.object({
  type: z.enum(['RULE_BASED', 'LLM_JUDGE', 'HYBRID']).default('RULE_BASED'),
  config: z.record(z.unknown()).optional().default({}),
  sortOrder: z.number().int().optional().default(0),
})

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ caseId: string }> },
) {
  try {
    const { caseId } = await params
    const evaluators = await db.testEvaluator.findMany({
      where: { testCaseId: caseId },
      orderBy: { sortOrder: 'asc' },
    })
    return NextResponse.json({ evaluators })
  } catch (error) {
    console.error('Failed to list evaluators:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ caseId: string }> },
) {
  try {
    const { caseId } = await params
    const body = await req.json()
    const parsed = createEvaluatorSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: 'Validation failed', details: parsed.error.flatten() }, { status: 400 })
    }

    const evaluator = await db.testEvaluator.create({
      data: {
        testCaseId: caseId,
        type: parsed.data.type,
        config: parsed.data.config,
        sortOrder: parsed.data.sortOrder,
      },
    })

    return NextResponse.json(evaluator, { status: 201 })
  } catch (error) {
    console.error('Failed to create evaluator:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ caseId: string }> },
) {
  try {
    const { caseId } = await params
    const { searchParams } = new URL(req.url)
    const id = searchParams.get('id')

    if (id) {
      await db.testEvaluator.delete({ where: { id } })
    } else {
      await db.testEvaluator.deleteMany({ where: { testCaseId: caseId } })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Failed to delete evaluator:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
