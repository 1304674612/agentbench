import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/shared/lib/db'
import { z } from 'zod'

const replaySchema = z.object({
  /** Replay mode */
  mode: z.enum(['deterministic', 'cross_model', 'batch']).default('deterministic'),
  /** Cross-model override */
  model: z.string().optional(),
  provider: z.string().optional(),
  temperature: z.number().optional(),
  maxTokens: z.number().optional(),
  /** Prompt override */
  systemPrompt: z.string().optional(),
  /** Batch count */
  batchCount: z.number().int().min(2).max(50).optional().default(5),
  /** Seed for deterministic replay */
  seed: z.number().int().optional(),
  /** Run batch in parallel */
  parallel: z.boolean().optional().default(true),
})

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id: runId } = await params
    const body = await req.json()
    const parsed = replaySchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: 'Validation failed', details: parsed.error.flatten() }, { status: 400 })
    }

    const originalRun = await db.run.findUnique({ where: { id: runId } })
    if (!originalRun) {
      return NextResponse.json({ error: 'Run not found' }, { status: 404 })
    }

    const originalConfig = (originalRun.config ?? {}) as Record<string, unknown>
    const agentConfig = (originalConfig.agent ?? {}) as Record<string, unknown>
    const input = (originalConfig.input ?? {}) as Record<string, unknown>
    const options = (originalConfig.options ?? {}) as Record<string, unknown>

    const count = parsed.data.mode === 'batch' ? parsed.data.batchCount : 1
    const createdRuns = []

    for (let i = 0; i < count; i++) {
      const replayConfig = {
        agent: {
          ...agentConfig,
          provider: parsed.data.provider ?? (agentConfig.provider as string) ?? 'openai',
          model: parsed.data.model ?? (agentConfig.model as string) ?? 'gpt-4o',
          temperature: parsed.data.temperature ?? (agentConfig.temperature as number) ?? 0.7,
          maxTokens: parsed.data.maxTokens ?? (agentConfig.maxTokens as number) ?? 4096,
          systemPrompt: parsed.data.systemPrompt ?? (agentConfig.systemPrompt as string) ?? '',
        },
        input,
        options: {
          ...options,
          seed: parsed.data.seed ?? (options.seed as number),
        },
      }

      const run = await db.run.create({
        data: {
          projectId: originalRun.projectId,
          testCaseId: originalRun.testCaseId,
          name: count > 1
            ? `${originalRun.name} (replay #${i + 1})`
            : `${originalRun.name} (replay)`,
          config: replayConfig as any,
          tags: ['replay', `original:${runId}`, parsed.data.mode],
        },
      })

      createdRuns.push(run)
    }

    return NextResponse.json(
      {
        message: `Created ${createdRuns.length} replay run(s)`,
        mode: parsed.data.mode,
        originalRunId: runId,
        replayRuns: createdRuns.map((r) => ({
          id: r.id,
          name: r.name,
          status: r.status,
        })),
      },
      { status: 201 },
    )
  } catch (error) {
    console.error('Failed to create replay:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
