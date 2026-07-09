import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/shared/lib/db'
import { z } from 'zod'

const createCaseSchema = z.object({
  name: z.string().min(1).max(256),
  description: z.string().optional(),
  agentConfig: z.record(z.unknown()).optional().default({}),
  input: z.record(z.unknown()).optional().default({}),
  options: z.record(z.unknown()).optional().default({}),
  tags: z.array(z.string()).optional().default([]),
  assertions: z.array(z.object({
    type: z.string(),
    params: z.record(z.unknown()).optional().default({}),
  })).optional().default([]),
  evaluators: z.array(z.object({
    type: z.enum(['RULE_BASED', 'LLM_JUDGE', 'HYBRID']).optional().default('RULE_BASED'),
    config: z.record(z.unknown()).optional().default({}),
  })).optional().default([]),
})

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ suiteId: string }> },
) {
  try {
    const { suiteId } = await params
    const { searchParams } = new URL(req.url)
    const status = searchParams.get('status') ?? undefined
    const search = searchParams.get('search') ?? undefined

    const where: Record<string, unknown> = { suiteId }
    if (status) where.status = status
    if (search) {
      where.name = { contains: search, mode: 'insensitive' }
    }

    const cases = await db.testCase.findMany({
      where,
      orderBy: { sortOrder: 'asc' },
      include: {
        assertions: { orderBy: { sortOrder: 'asc' } },
        evaluators: { orderBy: { sortOrder: 'asc' } },
      },
    })

    return NextResponse.json({ cases })
  } catch (error) {
    console.error('Failed to list cases:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ suiteId: string }> },
) {
  try {
    const { suiteId } = await params
    const body = await req.json()
    const parsed = createCaseSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: 'Validation failed', details: parsed.error.flatten() }, { status: 400 })
    }

    const { assertions, evaluators, ...caseData } = parsed.data

    const testCase = await db.testCase.create({
      data: {
        ...caseData,
        suiteId,
        agentConfig: caseData.agentConfig as any,
        input: caseData.input as any,
        options: caseData.options as any,
        assertions: {
          create: assertions.map((a, i) => ({
            type: a.type,
            params: a.params as any,
            sortOrder: i,
          })),
        } as any,
        evaluators: {
          create: evaluators.map((e, i) => ({
            type: e.type as 'RULE_BASED' | 'LLM_JUDGE' | 'HYBRID',
            config: e.config as any,
            sortOrder: i,
          })),
        } as any,
      },
      include: {
        assertions: true,
        evaluators: true,
      },
    })

    return NextResponse.json(testCase, { status: 201 })
  } catch (error) {
    console.error('Failed to create case:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
