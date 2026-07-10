import type { Metadata } from 'next'
import Link from 'next/link'
import { db } from '@/shared/lib/db'
import { formatNumber, formatCurrency, formatDuration, formatRelativeTime } from '@/shared/lib/utils'
import { Play, Search, Filter } from 'lucide-react'

export const metadata: Metadata = {
  title: 'Runs',
  description: 'View and manage all agent test runs — replay, evaluate, and compare execution results.',
}

const statusStyles: Record<string, string> = {
  passed: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  failed: 'bg-red-500/10 text-red-400 border-red-500/20',
  error: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  pending: 'bg-muted text-muted-foreground border-border',
  running: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  timeout: 'bg-orange-500/10 text-orange-400 border-orange-500/20',
  cancelled: 'bg-muted text-muted-foreground border-border',
}

export default async function RunsPage() {
  const runs = await db.run.findMany({
    orderBy: { createdAt: 'desc' },
    take: 50,
    select: {
      id: true,
      name: true,
      status: true,
      projectId: true,
      duration: true,
      metrics: true,
      tags: true,
      createdAt: true,
      config: true,
      error: true,
    },
  })

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Runs</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Agent execution history and results.
          </p>
        </div>
        <button
          type="button"
          className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
        >
          <Play className="h-4 w-4" />
          New Run
        </button>
      </div>

      {/* Toolbar */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search runs..."
            className="w-full rounded-lg border border-border bg-background pl-10 pr-4 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
          />
        </div>
        <button
          type="button"
          className="inline-flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm text-muted-foreground hover:bg-accent transition-colors"
        >
          <Filter className="h-4 w-4" />
          Filter
        </button>
      </div>

      {/* Empty State */}
      {runs.length === 0 && (
        <div className="rounded-xl border border-dashed border-border p-16 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-muted mx-auto mb-4">
            <Play className="h-6 w-6 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-semibold mb-2">No runs yet</h3>
          <p className="text-sm text-muted-foreground mb-4 max-w-sm mx-auto">
            Run your first agent test to see results here. Use the CLI or SDK to start testing.
          </p>
          <button
            type="button"
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            <Play className="h-4 w-4" />
            Run First Test
          </button>
        </div>
      )}

      {/* Runs Table */}
      {runs.length > 0 && (
        <div className="rounded-xl border border-border overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Name
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Status
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Duration
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Tokens
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Cost
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Model
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Time
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {(runs as Array<{ id: string; name: string; status: string; config?: unknown; duration?: number | null; createdAt: Date; error?: string | null; metrics?: Record<string, number> | null; project?: { id: string; name: string } | null; testCase?: { id: string; name: string } | null }>).map((run) => {
                const model =
                  (run.config as Record<string, unknown>)?.agent &&
                  ((run.config as Record<string, unknown>).agent as Record<string, unknown>)?.model as string
                const metrics = run.metrics as Record<string, number> | null

                return (
                  <tr
                    key={run.id}
                    className="hover:bg-muted/30 transition-colors cursor-pointer"
                  >
                    <td className="px-4 py-3">
                      <Link
                        href={`/runs/${run.id}`}
                        className="block"
                      >
                        <div className="text-sm font-medium hover:text-primary transition-colors">
                          {run.name}
                        </div>
                        {run.error && (
                          <div className="text-xs text-red-400 mt-0.5 line-clamp-1">
                            {run.error}
                          </div>
                        )}
                      </Link>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${
                          statusStyles[run.status] ?? statusStyles.pending
                        }`}
                      >
                        {run.status === 'passed' && '✓'}
                        {run.status === 'failed' && '✗'}
                        {run.status === 'error' && '!'}
                        {run.status === 'running' && '◎'}
                        {run.status === 'timeout' && '⏱'}
                        {' '}
                        {run.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className="text-sm font-mono text-muted-foreground">
                        {run.duration ? formatDuration(run.duration) : '—'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className="text-sm font-mono text-muted-foreground">
                        {metrics?.totalTokens ? formatNumber(metrics.totalTokens as number) : '—'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className="text-sm font-mono text-muted-foreground">
                        {metrics?.totalCost !== undefined ? formatCurrency(metrics.totalCost as number) : '—'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-xs font-mono text-muted-foreground">
                        {model ? String(model).split('/').pop()?.slice(0, 20) : '—'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-xs text-muted-foreground">
                        {formatRelativeTime(run.createdAt)}
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
  )
}
