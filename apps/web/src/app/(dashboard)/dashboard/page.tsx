import { db } from '@/shared/lib/db'
import Link from 'next/link'
import {
  TrendingUp, TrendingDown, Play, Activity, AlertTriangle,
  Clock, DollarSign, Zap, BarChart3, CheckCircle2, XCircle, ArrowRight,
  FlaskConical,
} from 'lucide-react'
import { formatNumber, formatCurrency, formatDuration, formatRelativeTime } from '@/shared/lib/utils'

export default async function DashboardPage() {
  // Real data from database
  const [totalRuns, passedRuns, failedRuns, recentRuns, totalProjects, totalSuites] = await Promise.all([
    db.run.count(),
    db.run.count({ where: { status: 'PASSED' } }),
    db.run.count({ where: { status: { in: ['FAILED', 'ERROR'] } } }),
    db.run.findMany({
      orderBy: { createdAt: 'desc' },
      take: 8,
      select: {
        id: true, name: true, status: true, duration: true,
        metrics: true, scores: true, createdAt: true,
        project: { select: { id: true, name: true } },
      },
    }),
    db.project.count(),
    db.testSuite.count(),
  ])

  const passRate = totalRuns > 0 ? Math.round((passedRuns / totalRuns) * 1000) / 10 : 0

  // Aggregate metrics from recent runs
  const runsWithMetrics = recentRuns.filter((r) => r.metrics != null)
  const avgTokens = runsWithMetrics.length > 0
    ? Math.round(runsWithMetrics.reduce((s, r) => s + ((r.metrics as Record<string, number>).totalTokens ?? 0), 0) / runsWithMetrics.length)
    : 0
  const avgCost = runsWithMetrics.length > 0
    ? runsWithMetrics.reduce((s, r) => s + ((r.metrics as Record<string, number>).totalCost ?? 0), 0) / runsWithMetrics.length
    : 0
  const avgLatency = runsWithMetrics.length > 0
    ? Math.round(runsWithMetrics.reduce((s, r) => s + ((r.metrics as Record<string, number>).totalLatency ?? 0), 0) / runsWithMetrics.length)
    : 0

  const statCards = [
    { label: 'Pass Rate', value: `${passRate}%`, icon: CheckCircle2, color: 'text-emerald-400', bg: 'bg-emerald-500/10', desc: `${passedRuns} of ${totalRuns} runs` },
    { label: 'Avg Score', value: '—', icon: Activity, color: 'text-blue-400', bg: 'bg-blue-500/10', desc: 'Run evaluations to see' },
    { label: 'Total Runs', value: formatNumber(totalRuns), icon: Play, color: 'text-indigo-400', bg: 'bg-indigo-500/10', desc: `${totalProjects} projects · ${totalSuites} suites` },
    { label: 'Avg Latency', value: avgLatency > 0 ? formatDuration(avgLatency) : '—', icon: Clock, color: 'text-purple-400', bg: 'bg-purple-500/10', desc: avgCost > 0 ? `$${avgCost.toFixed(3)} avg cost` : 'No data yet' },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Overview of your agent testing pipeline.
        </p>
      </div>

      {/* Stat Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {statCards.map((s) => (
          <div key={s.label} className="rounded-xl border border-border bg-card p-4 hover:border-foreground/10 transition-colors">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm text-muted-foreground">{s.label}</span>
              <div className={`rounded-lg p-1.5 ${s.bg}`}>
                <s.icon className={`h-4 w-4 ${s.color}`} />
              </div>
            </div>
            <div className="text-2xl font-bold">{s.value}</div>
            <div className="text-xs text-muted-foreground mt-1">{s.desc}</div>
          </div>
        ))}
      </div>

      {/* Charts Row */}
      <div className="grid gap-4 lg:grid-cols-2">
        {/* Pass/Fail Distribution */}
        <div className="rounded-xl border border-border bg-card p-5">
          <h3 className="font-semibold text-sm mb-4 flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
            Pass / Fail Distribution
          </h3>
          {totalRuns === 0 ? (
            <EmptyInCard message="No runs yet. Start by running your first agent test." />
          ) : (
            <div className="space-y-3">
              <BarRow label="Passed" value={passedRuns} total={totalRuns} color="bg-emerald-500" />
              <BarRow label="Failed" value={failedRuns} total={totalRuns} color="bg-red-500" />
              <BarRow label="Other" value={totalRuns - passedRuns - failedRuns} total={totalRuns} color="bg-muted-foreground/30" />
            </div>
          )}
        </div>

        {/* Recent Activity */}
        <div className="rounded-xl border border-border bg-card p-5">
          <h3 className="font-semibold text-sm mb-4 flex items-center gap-2">
            <Activity className="h-4 w-4 text-muted-foreground" />
            Recent Runs
          </h3>
          {recentRuns.length === 0 ? (
            <EmptyInCard message="No runs recorded. Create your first run to see it here." />
          ) : (
            <div className="space-y-2">
              {recentRuns.slice(0, 5).map((run) => {
                const m = (run.metrics ?? {}) as Record<string, number>
                return (
                  <Link
                    key={run.id}
                    href={`/runs/${run.id}`}
                    className="flex items-center justify-between rounded-lg p-2 hover:bg-muted/30 transition-colors"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span className={`shrink-0 w-2 h-2 rounded-full ${run.status === 'PASSED' ? 'bg-emerald-400' : run.status === 'FAILED' || run.status === 'ERROR' ? 'bg-red-400' : 'bg-amber-400'}`} />
                      <span className="text-sm truncate">{run.name}</span>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground shrink-0 ml-3">
                      <span>{formatRelativeTime(run.createdAt)}</span>
                      {m.totalTokens && <span>{formatNumber(m.totalTokens)} tok</span>}
                    </div>
                  </Link>
                )
              })}
              <Link href="/runs" className="flex items-center justify-center gap-1 text-xs text-muted-foreground hover:text-foreground py-2 transition-colors">
                View all runs <ArrowRight className="h-3 w-3" />
              </Link>
            </div>
          )}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="rounded-xl border border-border bg-card p-5">
        <h3 className="font-semibold text-sm mb-4">Quick Actions</h3>
        <div className="grid gap-3 sm:grid-cols-4">
          <ActionCard href="/runs" icon={Play} label="New Run" desc="Execute an agent" />
          <ActionCard href="/tests" icon={CheckCircle2} label="Test Suites" desc="Manage test cases" />
          <ActionCard href="/experiments" icon={FlaskConical} label="Experiments" desc="A/B test agents" />
          <ActionCard href="/coverage" icon={BarChart3} label="Coverage" desc="View test coverage" />
        </div>
      </div>
    </div>
  )
}

function BarRow({ label, value, total, color }: { label: string; value: number; total: number; color: string }) {
  const pct = total > 0 ? Math.round((value / total) * 100) : 0
  return (
    <div>
      <div className="flex items-center justify-between mb-1 text-xs">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-mono">{value} <span className="text-muted-foreground">({pct}%)</span></span>
      </div>
      <div className="h-2 rounded-full bg-muted overflow-hidden">
        <div className={`h-full rounded-full ${color} transition-all`} style={{ width: `${Math.max(pct, 3)}%` }} />
      </div>
    </div>
  )
}

function EmptyInCard({ message }: { message: string }) {
  return (
    <div className="py-8 text-center">
      <p className="text-xs text-muted-foreground">{message}</p>
    </div>
  )
}

function ActionCard({ href, icon: Icon, label, desc }: { href: string; icon: React.ComponentType<{ className?: string }>; label: string; desc: string }) {
  return (
    <Link
      href={href}
      className="flex items-center gap-3 rounded-lg border border-border p-3 hover:bg-muted/30 transition-colors"
    >
      <div className="rounded-lg bg-muted p-2">
        <Icon className="h-4 w-4 text-muted-foreground" />
      </div>
      <div>
        <div className="text-sm font-medium">{label}</div>
        <div className="text-xs text-muted-foreground">{desc}</div>
      </div>
    </Link>
  )
}

