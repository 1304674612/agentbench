import type { Metadata } from 'next'
import Link from 'next/link'
import { db } from '@/shared/lib/db'
import {
  formatNumber,
  formatCurrency,
  formatDuration,
  formatRelativeTime,
} from '@/shared/lib/utils'
import { Play } from 'lucide-react'
import { RunsSearch } from './search'

export const metadata: Metadata = {
  title: 'Runs',
  description:
    'View and manage all agent test runs — replay, evaluate, and compare execution results.',
}

const statusStyles: Record<string, string> = {
  PASSED: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  FAILED: 'bg-red-500/10 text-red-400 border-red-500/20',
  ERROR: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  PENDING: 'bg-muted text-muted-foreground border-border',
  RUNNING: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  TIMEOUT: 'bg-orange-500/10 text-orange-400 border-orange-500/20',
  CANCELLED: 'bg-muted text-muted-foreground border-border',
}

interface Props {
  searchParams: Promise<{ q?: string }>
}

export default async function RunsPage({ searchParams }: Props) {
  const { q } = await searchParams

  const runs = await db.run.findMany({
    where: q ? { name: { contains: q, mode: 'insensitive' } } : undefined,
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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Runs</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {runs.length} run{runs.length !== 1 ? 's' : ''} total
          </p>
        </div>
      </div>

      <RunsSearch defaultValue={q} />

      {runs.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border p-12 text-center text-muted-foreground">
          <Play className="mx-auto h-8 w-8 mb-3 opacity-50" />
          <p className="text-sm">
            {q
              ? 'No runs match your search.'
              : 'No runs yet. Create a test suite and run it to see results here.'}
          </p>
        </div>
      ) : (
        <div className="rounded-xl border border-border overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Run
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Status
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider hidden sm:table-cell">
                  Duration
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider hidden md:table-cell">
                  Tokens
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider hidden md:table-cell">
                  Cost
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider hidden lg:table-cell">
                  Created
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {runs.map((run) => (
                <tr key={run.id} className="hover:bg-muted/20 transition-colors">
                  <td className="px-4 py-3">
                    <Link href={`/runs/${run.id}`} className="text-sm font-medium hover:underline">
                      {run.name}
                    </Link>
                    {run.tags?.length > 0 && (
                      <div className="flex gap-1 mt-1">
                        {run.tags.map((tag) => (
                          <span
                            key={tag}
                            className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border ${statusStyles[run.status] ?? statusStyles.PENDING}`}
                    >
                      {run.status}
                    </span>
                    {run.error && (
                      <p className="text-xs text-red-400 mt-1 truncate max-w-[200px]">
                        {run.error}
                      </p>
                    )}
                  </td>
                  <td className="px-4 py-3 text-sm text-muted-foreground hidden sm:table-cell">
                    {run.duration ? formatDuration(run.duration) : '—'}
                  </td>
                  <td className="px-4 py-3 text-sm text-muted-foreground hidden md:table-cell">
                    {run.metrics
                      ? formatNumber((run.metrics as Record<string, number>).totalTokens ?? 0)
                      : '—'}
                  </td>
                  <td className="px-4 py-3 text-sm text-muted-foreground hidden md:table-cell">
                    {run.metrics
                      ? formatCurrency((run.metrics as Record<string, number>).totalCost ?? 0)
                      : '—'}
                  </td>
                  <td className="px-4 py-3 text-sm text-muted-foreground text-right hidden lg:table-cell">
                    {formatRelativeTime(run.createdAt)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
