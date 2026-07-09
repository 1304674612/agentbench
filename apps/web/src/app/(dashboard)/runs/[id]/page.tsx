import { notFound } from 'next/navigation'
import Link from 'next/link'
import { db } from '@/shared/lib/db'
import { formatNumber, formatCurrency, formatDuration, formatRelativeTime } from '@/shared/lib/utils'
import { ArrowLeft, Clock, Zap, DollarSign, BarChart3, AlertTriangle, CheckCircle2, XCircle, SkipForward, AlertCircle, ThumbsUp, RotateCcw } from 'lucide-react'

const statusStyles: Record<string, string> = {
  passed: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  failed: 'bg-red-500/10 text-red-400 border-red-500/20',
  error: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
}

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function RunDetailPage({ params }: PageProps) {
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
    notFound()
  }

  const config = run.config as Record<string, unknown>
  const agentConfig = (config?.agent ?? {}) as Record<string, unknown>
  const metrics = (run.metrics ?? {}) as Record<string, number>
  const model = agentConfig?.model as string

  return (
    <div className="space-y-6">
      {/* Back + Header */}
      <div className="flex items-center gap-4">
        <Link
          href="/runs"
          className="rounded-lg p-2 text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-bold tracking-tight">{run.name}</h1>
            <span
              className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${
                statusStyles[run.status] ?? 'bg-muted text-muted-foreground border-border'
              }`}
            >
              {run.status}
            </span>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            {model && <span>Model: {String(model)} · </span>}
            Run {id.slice(0, 8)} · {run.createdAt ? formatRelativeTime(run.createdAt) : ''}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href={`/compare?runA=${id}`}
            className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            Replay
          </Link>
        </div>
      </div>

      {/* Metrics Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border border-border bg-card p-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
            <Clock className="h-4 w-4" />
            Duration
          </div>
          <div className="text-2xl font-bold">
            {run.duration ? formatDuration(run.duration) : '—'}
          </div>
        </div>
        <div className="rounded-xl border border-border bg-card p-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
            <Zap className="h-4 w-4" />
            Total Tokens
          </div>
          <div className="text-2xl font-bold">
            {metrics.totalTokens ? formatNumber(metrics.totalTokens as number) : '—'}
          </div>
        </div>
        <div className="rounded-xl border border-border bg-card p-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
            <DollarSign className="h-4 w-4" />
            Cost
          </div>
          <div className="text-2xl font-bold">
            {metrics.totalCost !== undefined ? formatCurrency(metrics.totalCost as number) : '—'}
          </div>
        </div>
        <div className="rounded-xl border border-border bg-card p-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
            <BarChart3 className="h-4 w-4" />
            Steps
          </div>
          <div className="text-2xl font-bold">
            {run.traceSteps.length || (metrics.stepCount as number) || '—'}
          </div>
        </div>
      </div>

      {/* Error Banner */}
      {run.error && (
        <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-4 flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 text-red-400 mt-0.5 shrink-0" />
          <div>
            <div className="text-sm font-medium text-red-400">Error</div>
            <div className="text-sm text-red-300/80 mt-1">{run.error}</div>
          </div>
        </div>
      )}

      {/* Timeline */}
      <div>
        <h2 className="text-lg font-semibold mb-4">Execution Timeline</h2>

        {run.traceSteps.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border p-8 text-center text-muted-foreground text-sm">
            No trace steps recorded for this run.
          </div>
        ) : (
          <div className="rounded-xl border border-border overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border bg-muted/50">
                  <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground uppercase w-12">
                    #
                  </th>
                  <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground uppercase">
                    Type
                  </th>
                  <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground uppercase">
                    Detail
                  </th>
                  <th className="px-4 py-2.5 text-right text-xs font-medium text-muted-foreground uppercase">
                    Duration
                  </th>
                  <th className="px-4 py-2.5 text-right text-xs font-medium text-muted-foreground uppercase">
                    Tokens
                  </th>
                  <th className="px-4 py-2.5 text-right text-xs font-medium text-muted-foreground uppercase">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {(run.traceSteps as Array<{ id: string; sequence: number; type: string; duration?: number | null; totalTokens?: number | null; status: string; toolName?: string | null; llmRequest?: Record<string, unknown> | null; llmResponse?: Record<string, unknown> | null; error?: { message?: string } | null }>).map((step) => {
                  const llmReq = step.llmRequest as Record<string, unknown> | null
                  const toolName = step.toolName

                  return (
                    <tr key={step.id} className="hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-2.5 text-xs text-muted-foreground font-mono">
                        {step.sequence}
                      </td>
                      <td className="px-4 py-2.5">
                        <span
                          className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${
                            step.type === 'llm_call'
                              ? 'bg-blue-500/10 text-blue-400 border-blue-500/20'
                              : step.type === 'tool_call'
                                ? 'bg-purple-500/10 text-purple-400 border-purple-500/20'
                                : step.type === 'error'
                                  ? 'bg-red-500/10 text-red-400 border-red-500/20'
                                  : 'bg-muted text-muted-foreground border-border'
                          }`}
                        >
                          {step.type === 'llm_call' && 'LLM'}
                          {step.type === 'tool_call' && 'Tool'}
                          {step.type === 'response' && 'Output'}
                          {step.type === 'error' && 'Error'}
                        </span>
                      </td>
                      <td className="px-4 py-2.5">
                        <div className="text-sm">
                          {step.type === 'llm_call' && llmReq && (
                            <span className="text-muted-foreground">
                              {llmReq.model as string}
                            </span>
                          )}
                          {step.type === 'tool_call' && toolName && (
                            <span className="font-mono text-xs">{toolName}()</span>
                          )}
                          {step.type === 'response' && (
                            <span className="text-muted-foreground">Final response</span>
                          )}
                          {step.type === 'error' && (
                            <span className="text-red-400">{step.error?.message ?? 'Unknown error'}</span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-2.5 text-right">
                        <span className="text-xs font-mono text-muted-foreground">
                          {step.duration ? formatDuration(step.duration) : '—'}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 text-right">
                        <span className="text-xs font-mono text-muted-foreground">
                          {step.totalTokens ? formatNumber(step.totalTokens) : '—'}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 text-right">
                        <span
                          className={`text-xs font-medium ${
                            step.status === 'success'
                              ? 'text-emerald-400'
                              : 'text-red-400'
                          }`}
                        >
                          {step.status === 'success' ? '✓' : '✗'}
                        </span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Scores */}
      {run.scores.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold mb-4">Scores</h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {run.scores.map((score: { id: string; evaluator: string; score: number; maxScore: number; reason?: string | null; judgeModel?: string | null }) => (
              <div
                key={score.id}
                className="rounded-xl border border-border bg-card p-4"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium capitalize">
                    {score.evaluator.replace(/_/g, ' ')}
                  </span>
                  <span className="text-sm font-mono font-bold">
                    {score.score.toFixed(1)}
                    <span className="text-muted-foreground font-normal">
                      /{score.maxScore}
                    </span>
                  </span>
                </div>
                {score.reason && (
                  <p className="text-xs text-muted-foreground line-clamp-2">
                    {score.reason}
                  </p>
                )}
                {score.judgeModel && (
                  <p className="text-[10px] text-muted-foreground mt-2">
                    Judge: {score.judgeModel}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Assertion Results */}
      {run.assertionResults.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold mb-4">Assertion Results</h2>
          <div className="rounded-xl border border-border overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border bg-muted/50">
                  <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground uppercase">
                    Type
                  </th>
                  <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground uppercase">
                    Status
                  </th>
                  <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground uppercase">
                    Expected
                  </th>
                  <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground uppercase">
                    Actual
                  </th>
                  <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground uppercase">
                    Message
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {run.assertionResults.map((result: { id: string; type: string; status: string; expected?: unknown; actual?: unknown; message?: string | null }) => (
                  <tr key={result.id} className="hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-2.5">
                      <code className="text-xs font-mono bg-muted rounded px-1.5 py-0.5">
                        {result.type}
                      </code>
                    </td>
                    <td className="px-4 py-2.5">
                      {result.status === 'PASSED' && (
                        <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-400">
                          <CheckCircle2 className="h-3.5 w-3.5" /> Passed
                        </span>
                      )}
                      {result.status === 'FAILED' && (
                        <span className="inline-flex items-center gap-1 text-xs font-medium text-red-400">
                          <XCircle className="h-3.5 w-3.5" /> Failed
                        </span>
                      )}
                      {result.status === 'ERROR' && (
                        <span className="inline-flex items-center gap-1 text-xs font-medium text-amber-400">
                          <AlertCircle className="h-3.5 w-3.5" /> Error
                        </span>
                      )}
                      {result.status === 'SKIPPED' && (
                        <span className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground">
                          <SkipForward className="h-3.5 w-3.5" /> Skipped
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-2.5 text-xs text-muted-foreground max-w-[200px] truncate">
                      {result.expected ? JSON.stringify(result.expected as unknown) : '—'}
                    </td>
                    <td className="px-4 py-2.5 text-xs text-muted-foreground max-w-[200px] truncate">
                      {result.actual ? JSON.stringify(result.actual as unknown) : '—'}
                    </td>
                    <td className="px-4 py-2.5 text-xs text-muted-foreground max-w-[250px] truncate">
                      {result.message ?? '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Summary */}
      {run.summary && (
        <div className="rounded-xl border border-border bg-card p-4">
          <h3 className="text-sm font-medium mb-1">Summary</h3>
          <p className="text-sm text-muted-foreground">{run.summary}</p>
        </div>
      )}
    </div>
  )
}
