import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/shared/lib/db'

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params

    const run = await db.run.findUnique({
      where: { id },
      include: {
        traceSteps: {
          orderBy: { sequence: 'asc' },
        },
        scores: true,
        assertionResults: true,
      },
    })

    if (!run) {
      return NextResponse.json({ error: 'Run not found' }, { status: 404 })
    }

    return NextResponse.json(run)
  } catch (error) {
    console.error('Failed to get run:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const body = await req.json()

    const run = await db.run.update({
      where: { id },
      data: {
        status: body.status,
        metrics: body.metrics,
        startedAt: body.startedAt,
        endedAt: body.endedAt,
        duration: body.duration,
        summary: body.summary,
        error: body.error,
      },
    })

    return NextResponse.json(run)
  } catch (error) {
    console.error('Failed to update run:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    await db.run.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Failed to delete run:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
