import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/shared/lib/db'
import { z } from 'zod'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ snapshotId: string }> },
) {
  try {
    const { snapshotId } = await params
    const snapshot = await db.snapshot.findUnique({
      where: { id: snapshotId },
      include: {
        run: { select: { id: true, name: true, status: true } },
      },
    })

    if (!snapshot) {
      return NextResponse.json({ error: 'Snapshot not found' }, { status: 404 })
    }

    return NextResponse.json(snapshot)
  } catch (error) {
    console.error('Failed to get snapshot:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

const restoreSchema = z.object({
  /** If true, create a new run from the snapshot */
  createRun: z.boolean().optional().default(true),
  /** Optional overrides for the restored run */
  overrides: z
    .object({
      model: z.string().optional(),
      provider: z.string().optional(),
      temperature: z.number().optional(),
      maxTokens: z.number().optional(),
    })
    .optional(),
})

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ snapshotId: string }> },
) {
  try {
    const { snapshotId } = await params
    const body = await req.json()
    const parsed = restoreSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: 'Validation failed', details: parsed.error.flatten() }, { status: 400 })
    }

    const snapshot = await db.snapshot.findUnique({ where: { id: snapshotId } })
    if (!snapshot) {
      return NextResponse.json({ error: 'Snapshot not found' }, { status: 404 })
    }

    const snapshotData = snapshot.data as Record<string, unknown>
    const model = (snapshotData.model ?? {}) as Record<string, unknown>
    const agent = (snapshotData.agent ?? {}) as Record<string, unknown>
    const agentConfig = (agent.config ?? {}) as Record<string, unknown>
    const input = (snapshotData.input ?? {}) as Record<string, unknown>
    const options = (snapshotData.options ?? {}) as Record<string, unknown>

    if (parsed.data.createRun) {
      const ov = parsed.data.overrides ?? {}
      const run = await db.run.create({
        data: {
          projectId: snapshot.projectId,
          name: `${snapshot.name} (restored)`,
          config: {
            agent: {
              ...agentConfig,
              provider: ov.provider ?? (model.provider as string) ?? agentConfig.provider,
              model: ov.model ?? (model.name as string) ?? agentConfig.model,
              temperature: ov.temperature ?? (model.temperature as number) ?? agentConfig.temperature,
              maxTokens: ov.maxTokens ?? (model.maxTokens as number) ?? agentConfig.maxTokens,
            },
            input,
            options,
          } as any,
          tags: ['restored', `snapshot:${snapshotId}`],
        },
      })

      return NextResponse.json({ restored: true, runId: run.id, snapshotId })
    }

    return NextResponse.json({ restored: false, snapshotId, message: 'Snapshot data ready (no run created)' })
  } catch (error) {
    console.error('Failed to restore snapshot:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ snapshotId: string }> },
) {
  try {
    const { snapshotId } = await params
    await db.snapshot.delete({ where: { id: snapshotId } })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Failed to delete snapshot:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
