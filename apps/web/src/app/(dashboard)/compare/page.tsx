'use client'

import { useState, useEffect } from 'react'
import { ArrowRightLeft, Loader2, TrendingDown, TrendingUp, Minus, Search } from 'lucide-react'
import { apiGet, apiPost, ApiFetchError } from '@/shared/lib/client-fetch'

interface RunSummary {
  id: string
  name: string
  status: string
  createdAt: string
  project?: { name: string } | null
}

interface ComparisonResult {
  runA: {
    id: string
    name: string
    status: string
    model: string
    duration: number
    metrics: Record<string, number>
    scores: Array<{ evaluator: string; score: number }>
  }
  runB: {
    id: string
    name: string
    status: string
    model: string
    duration: number
    metrics: Record<string, number>
    scores: Array<{ evaluator: string; score: number }>
  }
  diffs: {
    status: string
    duration: { diff: number; changePercent: number }
    metrics: Array<{
      metric: string
      valueA: number
      valueB: number
      diff: number
      changePercent: number
    }>
    scores: Array<{ evaluator: string; scoreA: number; scoreB: number; diff: number }>
  }
  traceDiff: { stepsA: number; stepsB: number; diff: number }
}

const LABELS: Record<string, string> = {
  totalTokens: 'Total Tokens',
  promptTokens: 'Prompt Tokens',
  completionTokens: 'Completion Tokens',
  totalCost: 'Total Cost',
  totalLatency: 'Total Latency',
  stepCount: 'Steps',
  llmCallCount: 'LLM Calls',
  toolCallCount: 'Tool Calls',
}

export default function ComparePage() {
  const [runs, setRuns] = useState<RunSummary[]>([])
  const [runsLoading, setRunsLoading] = useState(true)

  const [runAId, setRunAId] = useState('')
  const [runBId, setRunBId] = useState('')
  const [runASearch, setRunASearch] = useState('')
  const [runBSearch, setRunBSearch] = useState('')

  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<ComparisonResult | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    async function loadRuns() {
      try {
        const data = await apiGet<{ runs: RunSummary[]; total: number }>('/api/v1/runs', {
          limit: '50',
        })
        setRuns(data.runs || [])
      } catch (err) {
        console.error('[Compare] Failed to load runs:', err)
      } finally {
        setRunsLoading(false)
      }
    }
    loadRuns()
  }, [])

  const filteredRunsA = runs.filter((r) => {
    const q = runASearch.toLowerCase()
    return !q || r.name.toLowerCase().includes(q) || r.id.toLowerCase().includes(q)
  })
  const filteredRunsB = runs.filter((r) => {
    const q = runBSearch.toLowerCase()
    return !q || r.name.toLowerCase().includes(q) || r.id.toLowerCase().includes(q)
  })

  async function handleCompare() {
    if (!runAId.trim() || !runBId.trim()) return
    setLoading(true)
    setError('')
    try {
      const data = await apiPost<ComparisonResult>('/api/v1/compare', {
        runAId: runAId.trim(),
        runBId: runBId.trim(),
      })
      setResult(data)
    } catch (err) {
      if (err instanceof ApiFetchError) {
        if (err.status === 401) setError('Please sign in to continue')
        else if (err.status === 403) setError('You do not have permission')
        else setError(err.message)
      } else {
        setError(err instanceof Error ? err.message : 'Unknown error')
      }
    } finally {
      setLoading(false)
    }
  }

  const statusBadge = (status: string) => {
    const colors: Record<string, string> = {
      PASSED: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
      FAILED: 'bg-red-500/10 text-red-400 border-red-500/20',
      ERROR: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
      PENDING: 'bg-muted text-muted-foreground border-border',
      RUNNING: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
    }
    return `inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-medium ${colors[status] ?? colors.PENDING}`
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Compare Runs</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Select two runs to compare metrics, scores, and execution paths side-by-side.
        </p>
      </div>

      {/* Run Selectors */}
      <div className="rounded-xl border border-border bg-card p-5">
        <div className="grid gap-4 sm:grid-cols-2">
          {/* Run A */}
          <div>
            <label className="text-sm font-medium mb-2 block">
              Run A <span className="text-muted-foreground font-normal">(Baseline)</span>
            </label>
            {runsLoading ? (
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground mt-2" />
            ) : (
              <>
                <div className="relative mb-2">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                  <input
                    type="text"
                    value={runASearch}
                    onChange={(e) => setRunASearch(e.target.value)}
                    placeholder="Filter runs..."
                    className="w-full rounded-lg border border-border bg-background pl-8 pr-3 py-1.5 text-xs placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-foreground/10"
                  />
                </div>
                <select
                  value={runAId}
                  onChange={(e) => setRunAId(e.target.value)}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-foreground/20"
                >
                  <option value="">Select a run...</option>
                  {filteredRunsA.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.name} — {r.status} ({r.createdAt?.slice(0, 10)})
                    </option>
                  ))}
                </select>
              </>
            )}
            {runAId && (
              <p className="text-[10px] text-muted-foreground font-mono mt-1 truncate">{runAId}</p>
            )}
          </div>

          {/* Run B */}
          <div>
            <label className="text-sm font-medium mb-2 block">
              Run B <span className="text-muted-foreground font-normal">(Comparison)</span>
            </label>
            {runsLoading ? (
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground mt-2" />
            ) : (
              <>
                <div className="relative mb-2">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                  <input
                    type="text"
                    value={runBSearch}
                    onChange={(e) => setRunBSearch(e.target.value)}
                    placeholder="Filter runs..."
                    className="w-full rounded-lg border border-border bg-background pl-8 pr-3 py-1.5 text-xs placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-foreground/10"
                  />
                </div>
                <select
                  value={runBId}
                  onChange={(e) => setRunBId(e.target.value)}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-foreground/20"
                >
                  <option value="">Select a run...</option>
                  {filteredRunsB.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.name} — {r.status} ({r.createdAt?.slice(0, 10)})
                    </option>
                  ))}
                </select>
              </>
            )}
            {runBId && (
              <p className="text-[10px] text-muted-foreground font-mono mt-1 truncate">{runBId}</p>
            )}
          </div>
        </div>

        <button
          onClick={handleCompare}
          disabled={loading || !runAId || !runBId}
          className="mt-4 inline-flex items-center gap-2 rounded-lg bg-foreground px-4 py-2 text-sm font-medium text-background hover:bg-foreground/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          <ArrowRightLeft className={`h-4 w-4 ${loading ? 'hidden' : ''}`} />
          <Loader2 className={`h-4 w-4 animate-spin ${loading ? '' : 'hidden'}`} />
          <span>{loading ? 'Comparing...' : 'Compare'}</span>
        </button>
        {error && <p className="mt-3 text-sm text-red-400">{error}</p>}
      </div>

      {/* Results */}
      {result && (
        <div className="space-y-6">
          {/* Headers */}
          <div className="grid gap-4 sm:grid-cols-2">
            {(['runA', 'runB'] as const).map((key) => {
              const run = result[key]
              return (
                <div key={key} className="rounded-xl border border-border bg-card p-4">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-semibold text-sm truncate">{run.name}</h3>
                    <span className={statusBadge(run.status)}>{run.status}</span>
                  </div>
                  <p className="text-xs text-muted-foreground font-mono">
                    {run.id.slice(0, 12)}...
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">Model: {run.model || '—'}</p>
                  <p className="text-xs text-muted-foreground">Duration: {run.duration}ms</p>
                </div>
              )
            })}
          </div>

          {/* Metrics */}
          {result.diffs.metrics.length > 0 && (
            <div>
              <h2 className="text-lg font-semibold mb-3">Metrics</h2>
              <div className="rounded-xl border border-border overflow-hidden">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border bg-muted/30">
                      <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground uppercase">
                        Metric
                      </th>
                      <th className="px-4 py-2.5 text-right text-xs font-medium text-muted-foreground uppercase">
                        Run A
                      </th>
                      <th className="px-4 py-2.5 text-right text-xs font-medium text-muted-foreground uppercase">
                        Run B
                      </th>
                      <th className="px-4 py-2.5 text-right text-xs font-medium text-muted-foreground uppercase">
                        Change
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {result.diffs.metrics.map((m) => {
                      const isCost = m.metric === 'totalCost'
                      const isLatency = m.metric === 'totalLatency'
                      return (
                        <tr key={m.metric} className="hover:bg-muted/20">
                          <td className="px-4 py-2.5 text-sm">{LABELS[m.metric] ?? m.metric}</td>
                          <td className="px-4 py-2.5 text-right font-mono text-sm">
                            {isCost
                              ? `$${m.valueA.toFixed(4)}`
                              : isLatency
                                ? `${m.valueA}ms`
                                : m.valueA}
                          </td>
                          <td className="px-4 py-2.5 text-right font-mono text-sm">
                            {isCost
                              ? `$${m.valueB.toFixed(4)}`
                              : isLatency
                                ? `${m.valueB}ms`
                                : m.valueB}
                          </td>
                          <td className="px-4 py-2.5 text-right">
                            <span
                              className={`inline-flex items-center gap-1 text-xs font-mono ${m.changePercent > 0 ? 'text-amber-400' : m.changePercent < 0 ? 'text-emerald-400' : 'text-muted-foreground'}`}
                            >
                              {m.changePercent > 0 ? (
                                <TrendingUp className="h-3 w-3" />
                              ) : m.changePercent < 0 ? (
                                <TrendingDown className="h-3 w-3" />
                              ) : (
                                <Minus className="h-3 w-3" />
                              )}
                              {m.changePercent > 0 ? '+' : ''}
                              {m.changePercent}%
                            </span>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Scores */}
          {result.diffs.scores.length > 0 && (
            <div>
              <h2 className="text-lg font-semibold mb-3">Scores</h2>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {result.diffs.scores.map((s) => (
                  <div key={s.evaluator} className="rounded-xl border border-border bg-card p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium capitalize">
                        {s.evaluator.replace(/_/g, ' ')}
                      </span>
                      <span
                        className={`text-xs font-mono font-bold ${s.diff > 0 ? 'text-emerald-400' : s.diff < 0 ? 'text-red-400' : 'text-muted-foreground'}`}
                      >
                        {s.diff > 0 ? '↑' : s.diff < 0 ? '↓' : '—'} {Math.abs(s.diff).toFixed(1)}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
                        <div
                          className="h-full rounded-full bg-emerald-500/60"
                          style={{ width: `${(s.scoreA / 10) * 100}%` }}
                        />
                      </div>
                      <span className="text-xs font-mono text-muted-foreground">
                        {s.scoreA.toFixed(1)}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
                        <div
                          className="h-full rounded-full bg-blue-500/60"
                          style={{ width: `${(s.scoreB / 10) * 100}%` }}
                        />
                      </div>
                      <span className="text-xs font-mono text-muted-foreground">
                        {s.scoreB.toFixed(1)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Trace Diff */}
          <div>
            <h2 className="text-lg font-semibold mb-3">Execution Path</h2>
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="rounded-xl border border-border bg-card p-4">
                <div className="text-sm text-muted-foreground mb-1">Steps A</div>
                <div className="text-xl font-bold">{result.traceDiff.stepsA}</div>
              </div>
              <div className="rounded-xl border border-border bg-card p-4">
                <div className="text-sm text-muted-foreground mb-1">Steps B</div>
                <div className="text-xl font-bold">{result.traceDiff.stepsB}</div>
              </div>
              <div className="rounded-xl border border-border bg-card p-4">
                <div className="text-sm text-muted-foreground mb-1">Difference</div>
                <div
                  className={`text-xl font-bold ${result.traceDiff.diff !== 0 ? 'text-amber-400' : ''}`}
                >
                  {result.traceDiff.diff > 0 ? '+' : ''}
                  {result.traceDiff.diff}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {!result && !loading && (
        <div className="rounded-xl border border-dashed border-border p-12 text-center">
          <ArrowRightLeft className="h-8 w-8 text-muted-foreground/50 mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">Select two runs above and click Compare.</p>
        </div>
      )}
    </div>
  )
}
