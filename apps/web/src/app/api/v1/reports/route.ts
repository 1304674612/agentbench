import { NextRequest, NextResponse } from 'next/server'
import { withApiAuth, type ApiContext } from '@/shared/lib/api-middleware'
import { db } from '@/shared/lib/db'
import { z } from 'zod'

const formatEnum = z.enum(['json', 'markdown', 'html', 'junit'])

export const GET = withApiAuth(async (req: NextRequest, _ctx: ApiContext) => {
  try {
    const { searchParams } = new URL(req.url)
    const runId = searchParams.get('runId')
    const projectId = searchParams.get('projectId')
    const format = formatEnum.safeParse(searchParams.get('format') ?? 'markdown')

    if (!runId && !projectId) {
      return NextResponse.json({ error: 'runId or projectId required' }, { status: 400 })
    }

    if (runId) {
      const run = await db.run.findUnique({
        where: { id: runId },
        include: { scores: true, assertionResults: true },
      })

      if (!run) {
        return NextResponse.json({ error: 'Run not found' }, { status: 404 })
      }

      const metrics = (run.metrics ?? {}) as Record<string, number>
      const data = {
        id: run.id,
        name: run.name,
        status: run.status,
        duration: run.duration,
        metrics: {
          totalTokens: metrics.totalTokens ?? 0,
          promptTokens: metrics.promptTokens ?? 0,
          completionTokens: metrics.completionTokens ?? 0,
          totalCost: metrics.totalCost ?? 0,
          totalLatency: metrics.totalLatency ?? 0,
          stepCount: metrics.stepCount ?? 0,
          llmCallCount: metrics.llmCallCount ?? 0,
          toolCallCount: metrics.toolCallCount ?? 0,
        },
        scores: run.scores.map((s: { evaluator: string; score: number; maxScore: number }) => ({
          evaluator: s.evaluator,
          score: s.score,
          maxScore: s.maxScore,
        })),
        assertionResults: run.assertionResults.map(
          (a: {
            type: string
            status: string
            message?: string | null
            expected?: unknown
            actual?: unknown
          }) => ({
            type: a.type,
            status: a.status,
            message: a.message,
            expected: a.expected,
            actual: a.actual,
          })
        ),
        summary: run.summary,
        config: run.config,
        generatedAt: new Date().toISOString(),
      }

      const fmt = format.success ? format.data : 'markdown'
      switch (fmt) {
        case 'json':
          return NextResponse.json(data)
        case 'markdown': {
          const md = buildMarkdown(data)
          return new NextResponse(md, {
            headers: {
              'Content-Type': 'text/markdown',
              'Content-Disposition': `attachment; filename="report-${runId.slice(0, 8)}.md"`,
            },
          })
        }
        case 'html': {
          const html = buildHTML(data)
          return new NextResponse(html, {
            headers: {
              'Content-Type': 'text/html',
              'Content-Disposition': `attachment; filename="report-${runId.slice(0, 8)}.html"`,
            },
          })
        }
        case 'junit': {
          const xml = buildJUnitXML(data)
          return new NextResponse(xml, {
            headers: {
              'Content-Type': 'application/xml',
              'Content-Disposition': `attachment; filename="report-${runId.slice(0, 8)}.xml"`,
            },
          })
        }
        default:
          return NextResponse.json(data)
      }
    }

    // Batch report
    const runs = await db.run.findMany({
      where: { projectId: projectId! },
      orderBy: { createdAt: 'desc' },
      take: 50,
      include: { scores: true, assertionResults: true },
    })

    const summaries = runs.map(
      (r: {
        id: string
        name: string
        status: string
        duration?: number | null
        metrics?: unknown
      }) => {
        const m = (r.metrics ?? {}) as Record<string, number>
        return {
          id: r.id,
          name: r.name,
          status: r.status,
          duration: r.duration,
          totalTokens: m.totalTokens ?? 0,
          totalCost: m.totalCost ?? 0,
          totalLatency: m.totalLatency ?? 0,
        }
      }
    )

    return NextResponse.json({
      projectId,
      generatedAt: new Date().toISOString(),
      totalRuns: runs.length,
      passed: runs.filter((r: { status: string }) => r.status === 'PASSED').length,
      failed: runs.filter((r: { status: string }) => r.status === 'FAILED' || r.status === 'ERROR')
        .length,
      runs: summaries,
    })
  } catch (error) {
    console.error('Failed to generate report:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
})

function buildMarkdown(data: Record<string, unknown>): string {
  const metrics = (data.metrics ?? {}) as Record<string, number>
  const scores = (data.scores ?? []) as Array<{
    evaluator: string
    score: number
    maxScore: number
  }>
  const assertions = (data.assertionResults ?? []) as Array<{
    type: string
    status: string
    message?: string | null
  }>
  const lines = [
    `# ${data.name ?? 'Run Report'}`,
    '',
    `**Status**: ${data.status} · **Duration**: ${data.duration ?? 'N/A'}ms`,
    '',
    '## Metrics',
    '',
    '| Metric | Value |',
    '|--------|-------|',
    `| Tokens | ${metrics.totalTokens} |`,
    `| Cost | $${metrics.totalCost.toFixed(4)} |`,
    `| Latency | ${metrics.totalLatency}ms |`,
    `| Steps | ${metrics.stepCount} |`,
    '',
  ]
  if (scores.length > 0) {
    lines.push('## Scores', '', '| Dimension | Score |', '|-----------|-------|')
    scores.forEach((s) => lines.push(`| ${s.evaluator} | ${s.score.toFixed(1)}/${s.maxScore} |`))
    lines.push('')
  }
  if (assertions.length > 0) {
    const p = assertions.filter((a) => a.status === 'PASSED').length
    lines.push('## Assertions', '', `✅ ${p} passed · ❌ ${assertions.length - p} failed`, '')
  }
  lines.push('---', '', `*Generated by AgentBench at ${new Date().toISOString()}*`)
  return lines.join('\n')
}

function buildHTML(data: Record<string, unknown>): string {
  const metrics = (data.metrics ?? {}) as Record<string, number>
  const scores = (data.scores ?? []) as Array<{
    evaluator: string
    score: number
    maxScore: number
  }>
  const assertions = (data.assertionResults ?? []) as Array<{
    type: string
    status: string
    message?: string | null
  }>
  const scoreRows = scores
    .map((s) => `<tr><td>${s.evaluator}</td><td>${s.score.toFixed(1)}/${s.maxScore}</td></tr>`)
    .join('')
  const assertionRows = assertions
    .map(
      (a) =>
        `<tr class="${a.status.toLowerCase()}"><td>${a.type}</td><td>${a.status}</td><td>${a.message ?? ''}</td></tr>`
    )
    .join('')
  return `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><title>${data.name ?? 'Report'} — AgentBench</title>
<style>body{font-family:system-ui,sans-serif;max-width:800px;margin:2rem auto;padding:0 1rem;background:#0a0a0a;color:#e5e5e5}h1{border-bottom:1px solid #27272a;padding-bottom:.5rem}table{width:100%;border-collapse:collapse;margin:1rem 0}th,td{padding:.5rem .75rem;text-align:left;border-bottom:1px solid #27272a}th{background:#18181b;font-size:.75rem;text-transform:uppercase;color:#a1a1aa}.passed{color:#34d399}.failed{color:#f87171}.card{background:#18181b;border-radius:.75rem;padding:1rem;margin:1rem 0}.metric{display:inline-block;width:23%;text-align:center}.metric-value{font-size:1.5rem;font-weight:700}.metric-label{font-size:.75rem;color:#a1a1aa}</style></head><body>
<h1>${data.name ?? 'Run Report'}</h1><p>Status: <strong class="${data.status === 'PASSED' || data.status === 'passed' ? 'passed' : 'failed'}">${String(data.status).toUpperCase()}</strong> · Duration: ${data.duration ?? 'N/A'}ms</p>
<div class="card"><div class="metric"><div class="metric-value">${metrics.totalTokens}</div><div class="metric-label">Tokens</div></div><div class="metric"><div class="metric-value">$${metrics.totalCost.toFixed(4)}</div><div class="metric-label">Cost</div></div><div class="metric"><div class="metric-value">${metrics.totalLatency}ms</div><div class="metric-label">Latency</div></div><div class="metric"><div class="metric-value">${metrics.stepCount}</div><div class="metric-label">Steps</div></div></div>
${scores.length ? `<h2>Scores</h2><table><tr><th>Dimension</th><th>Score</th></tr>${scoreRows}</table>` : ''}
${assertions.length ? `<h2>Assertions</h2><table><tr><th>Type</th><th>Status</th><th>Message</th></tr>${assertionRows}</table>` : ''}
<footer style="margin-top:2rem;font-size:.75rem;color:#a1a1aa">Generated by AgentBench v0.1.0</footer></body></html>`
}

function buildJUnitXML(data: Record<string, unknown>): string {
  const assertions = (data.assertionResults ?? []) as Array<{
    type: string
    status: string
    message?: string | null
  }>
  const duration = (data.duration as number) ?? 0
  let cases = ''
  if (assertions.length === 0) {
    cases = `<testcase name="run.status" time="${(duration / 1000).toFixed(3)}"/>`
  } else {
    assertions.forEach((a) => {
      cases += `\n    <testcase name="${a.type}" time="0.001">`
      if (a.status === 'FAILED') cases += `\n      <failure message="${a.message ?? 'Failed'}"/>`
      if (a.status === 'ERROR') cases += `\n      <error message="${a.message ?? 'Error'}"/>`
      cases += '\n    </testcase>'
    })
  }
  return `<?xml version="1.0" encoding="UTF-8"?>\n<testsuite name="${data.name ?? 'AgentBench'}" tests="${assertions.length || 1}" failures="${assertions.filter((a: { status: string }) => a.status === 'FAILED').length}" time="${(duration / 1000).toFixed(3)}">${cases}\n</testsuite>`
}
