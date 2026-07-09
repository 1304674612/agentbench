import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/shared/lib/db'
import { z } from 'zod'

const evaluateSchema = z.object({
  /** Rule-based evaluators to run */
  rules: z.array(z.object({
    type: z.string(),
    params: z.record(z.unknown()).optional().default({}),
    weight: z.number().optional(),
  })).optional().default([]),
  /** LLM judge dimensions to evaluate */
  dimensions: z.array(z.enum([
    'correctness', 'faithfulness', 'safety', 'relevance',
    'completeness', 'reasoning', 'conciseness', 'tool_usage',
  ])).optional().default(['correctness']),
  /** Expected answer for correctness/completeness evaluation */
  expected: z.string().optional(),
  /** Re-evaluate even if scores already exist */
  force: z.boolean().optional().default(false),
})

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id: runId } = await params
    const body = await req.json()
    const parsed = evaluateSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: 'Validation failed', details: parsed.error.flatten() }, { status: 400 })
    }

    // Fetch the run with traces
    const run = await db.run.findUnique({
      where: { id: runId },
      include: {
        traceSteps: { orderBy: { sequence: 'asc' } },
        scores: true,
        assertionResults: true,
      },
    })

    if (!run) {
      return NextResponse.json({ error: 'Run not found' }, { status: 404 })
    }

    // Check if already evaluated
    if (run.scores.length > 0 && !parsed.data.force) {
      return NextResponse.json({
        message: 'Run already has scores. Use force=true to re-evaluate.',
        scores: run.scores,
        assertionResults: run.assertionResults,
      })
    }

    const { rules, dimensions, expected } = parsed.data

    // Extract output from trace steps
    const responseSteps = run.traceSteps.filter((s: { type: string; llmResponse?: Record<string, unknown> | null }) => s.type === 'RESPONSE')
    const output = responseSteps.map((s: { llmResponse?: Record<string, unknown> | null }) => (s.llmResponse as Record<string, unknown> | null)?.content ?? '').join('\n')

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    interface ToolCallItem {
      name: string
      arguments: unknown
      result?: unknown
      error?: unknown
    }
    const rawSteps = run.traceSteps as Array<{
      type: string
      toolName?: string | null
      toolRequest?: Record<string, unknown> | null
      toolResponse?: Record<string, unknown> | null
    }>
    const toolCalls: ToolCallItem[] = rawSteps
      .filter((s) => s.type === 'TOOL_CALL')
      .map((s) => ({
        name: s.toolName ?? 'unknown',
        arguments: (s.toolRequest as Record<string, unknown> | null)?.arguments ?? {},
        result: (s.toolResponse as Record<string, unknown> | null)?.result,
        error: (s.toolResponse as Record<string, unknown> | null)?.error,
      }))

    const metrics = (run.metrics ?? {}) as Record<string, number>

    // Run rule-based evaluations
    const newScores: Array<{
      runId: string
      evaluator: string
      score: number
      maxScore: number
      reason: string
      judgeModel?: string
      duration?: number
      metadata?: Record<string, unknown>
    }> = []

    const newAssertionResults: Array<{
      runId: string
      assertionId?: string
      type: string
      status: 'PASSED' | 'FAILED' | 'ERROR' | 'SKIPPED'
      expected?: unknown
      actual?: unknown
      message?: string
      duration?: number
    }> = []

    // Process rule-based evaluators
    for (const rule of rules) {
      const startTime = Date.now()
      const ruleType = rule.type
      const params = rule.params ?? {}

      let passed = false
      let reason = ''
      let score = 0

      switch (ruleType) {
        case 'exact_match': {
          const expectedStr = String(params.expected ?? expected ?? '')
          passed = output === expectedStr
          score = passed ? 1 : 0
          reason = passed ? 'Output matches expected exactly' : 'Output does not match expected'
          break
        }
        case 'contains': {
          const substr = String(params.substring ?? params.value ?? '')
          passed = output.includes(substr)
          score = passed ? 1 : 0
          reason = passed ? `Output contains "${substr}"` : `Output does not contain "${substr}"`
          break
        }
        case 'regex_match': {
          const pattern = String(params.pattern ?? '')
          try {
            passed = new RegExp(pattern, String(params.flags ?? '')).test(output)
            score = passed ? 1 : 0
            reason = passed ? `Output matches /${pattern}/` : `Output does not match /${pattern}/`
          } catch {
            reason = `Invalid regex: ${pattern}`
          }
          break
        }
        case 'tool_called': {
          const toolName = String(params.tool ?? params.name ?? '')
          passed = toolCalls.some((t) => t.name === toolName)
          score = passed ? 1 : 0
          reason = passed ? `Tool "${toolName}" was called` : `Tool "${toolName}" was not called`
          break
        }
        case 'tool_not_called': {
          const toolName = String(params.tool ?? params.name ?? '')
          passed = !toolCalls.some((t) => t.name === toolName)
          score = passed ? 1 : 0
          reason = passed ? `Tool "${toolName}" was not called` : `Tool "${toolName}" was called`
          break
        }
        case 'latency_lt': {
          const threshold = Number(params.threshold ?? params.ms ?? 10000)
          const latency = metrics.totalLatency ?? run.duration ?? 0
          passed = latency < threshold
          score = passed ? 1 : 0
          reason = passed ? `Latency ${latency}ms < ${threshold}ms` : `Latency ${latency}ms >= ${threshold}ms`
          break
        }
        case 'tokens_lt': {
          const threshold = Number(params.threshold ?? params.count ?? 4096)
          const tokens = metrics.totalTokens ?? 0
          passed = tokens < threshold
          score = passed ? 1 : 0
          reason = passed ? `Tokens ${tokens} < ${threshold}` : `Tokens ${tokens} >= ${threshold}`
          break
        }
        case 'cost_lt': {
          const threshold = Number(params.threshold ?? params.dollars ?? 0.1)
          const cost = metrics.totalCost ?? 0
          passed = cost < threshold
          score = passed ? 1 : 0
          reason = passed ? `Cost $${cost.toFixed(4)} < $${threshold}` : `Cost $${cost.toFixed(4)} >= $${threshold}`
          break
        }
        default: {
          reason = `Unknown rule type: ${ruleType}`
          break
        }
      }

      newScores.push({
        runId,
        evaluator: ruleType,
        score: score * 10, // Normalize to 0-10 scale
        maxScore: 10,
        reason,
        duration: Date.now() - startTime,
      })

      newAssertionResults.push({
        runId,
        type: ruleType,
        status: passed ? 'PASSED' : 'FAILED',
        expected: params,
        actual: ruleType.startsWith('tool_') ? toolCalls.map((t) => t.name) : output.slice(0, 200),
        message: passed ? undefined : reason,
        duration: Date.now() - startTime,
      })
    }

    // Save scores and assertion results
    if (newScores.length > 0) {
      // Delete old scores if force re-evaluating
      if (parsed.data.force) {
        await db.score.deleteMany({ where: { runId } })
        await db.assertionResult.deleteMany({ where: { runId } })
      }

      await db.score.createMany({ data: newScores })
      await db.assertionResult.createMany({ data: newAssertionResults })
    }

    // Return results
    return NextResponse.json({
      runId,
      scores: newScores,
      assertionResults: newAssertionResults,
      summary: {
        totalRules: rules.length,
        totalDimensions: dimensions.length,
        passed: newAssertionResults.filter((a) => a.status === 'PASSED').length,
        failed: newAssertionResults.filter((a) => a.status === 'FAILED').length,
        errored: newAssertionResults.filter((a) => a.status === 'ERROR').length,
      },
    })
  } catch (error) {
    console.error('Failed to evaluate run:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
