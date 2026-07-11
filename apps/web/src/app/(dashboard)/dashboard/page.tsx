import type { Metadata } from 'next'
import { db } from '@/shared/lib/db'
import Link from 'next/link'
import {
  TrendingUp,
  TrendingDown,
  Play,
  Activity,
  AlertTriangle,
  Clock,
  DollarSign,
  Zap,
  BarChart3,
  CheckCircle2,
  XCircle,
  ArrowRight,
  FlaskConical,
} from 'lucide-react'
import {
  formatNumber,
  formatCurrency,
  formatDuration,
  formatRelativeTime,
} from '@/shared/lib/utils'
import { QualityTrends } from '@/features/trends/quality-trends'
import type { QualityDimension, QualityDataPoint } from '@/features/trends/quality-trends'

export const metadata: Metadata = {
  title: 'Dashboard',
  description:
    'Monitor your AI agent runs, pass rates, costs, and performance metrics at a glance.',
}

export default async function DashboardPage() {
  // Real data from database
  const [
    totalRuns,
    passedRuns,
    failedRuns,
    pendingRuns,
    recentRuns,
    totalProjects,
    totalSuites,
    totalCases,
  ] = await Promise.all([
    db.run.count(),
    db.run.count({ where: { status: 'PASSED' } }),
    db.run.count({ where: { status: { in: ['FAILED', 'ERROR'] } } }),
    db.run.count({ where: { status: { in: ['PENDING', 'RUNNING'] } } }),
    db.run.findMany({
      orderBy: { createdAt: 'desc' },
      take: 8,
      select: {
        id: true,
        name: true,
        status: true,
        duration: true,
        metrics: true,
        scores: true,
        createdAt: true,
        project: { select: { id: true, name: true } },
      },
    }),
    db.project.count(),
    db.testSuite.count(),
    db.testCase.count(),
  ])

  // Quality trend data: scores from the last 30 days
  const thirtyDaysAgo = new Date()
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

  const recentScores = await db.score.findMany({
    where: { createdAt: { gte: thirtyDaysAgo } },
    orderBy: { createdAt: 'asc' },
    select: { evaluator: true, score: true, createdAt: true },
  })

  // Group scores by date and evaluator, then average
  const scoresByDate = new Map<string, Map<string, { total: number; count: number }>>()
  for (const s of recentScores) {
    const dateKey = s.createdAt.toISOString().slice(0, 10) // YYYY-MM-DD
    if (!scoresByDate.has(dateKey)) {
      scoresByDate.set(dateKey, new Map())
    }
    const dateMap = scoresByDate.get(dateKey)!
    const existing = dateMap.get(s.evaluator)
    if (existing) {
      existing.total += s.score
      existing.count += 1
    } else {
      dateMap.set(s.evaluator, { total: s.score, count: 1 })
    }
  }

  // Convert to QualityDataPoint[]
  const sortedDates = Array.from(scoresByDate.keys()).sort()
  const qualityData: QualityDataPoint[] = sortedDates.map((date) => {
    const dateMap = scoresByDate.get(date)!
    const point: QualityDataPoint = { date }
    for (const [evaluator, agg] of dateMap) {
      point[evaluator] = Math.round((agg.total / agg.count) * 10) / 10
    }
    return point
  })

  // Derive available dimensions from the data
  const allEvaluators = new Set(recentScores.map((s) => s.evaluator))
  const dimensionColors: Record<string, string> = {
    correctness: '#818cf8',
    faithfulness: '#34d399',
    safety: '#fbbf24',
    relevance: '#c084fc',
    robustness: '#60a5fa',
    conciseness: '#fb7185',
    completeness: '#38bdf8',
  }
  const qualityDimensions: QualityDimension[] = Array.from(allEvaluators)
    .slice(0, 7)
    .map((key) => ({
      key,
      label: key.charAt(0).toUpperCase() + key.slice(1),
      color: dimensionColors[key] ?? '#a3a3a3',
    }))

  const completedRuns = passedRuns + failedRuns
  const passRate = completedRuns > 0 ? Math.round((passedRuns / completedRuns) * 1000) / 10 : null

  // Aggregate metrics from recent runs
  const runsWithMetrics = recentRuns.filter((r) => r.metrics != null)
  const avgTokens =
    runsWithMetrics.length > 0
      ? Math.round(
          runsWithMetrics.reduce(
            (s, r) => s + ((r.metrics as Record<string, number>).totalTokens ?? 0),
            0
          ) / runsWithMetrics.length
        )
      : 0
  const avgCost =
    runsWithMetrics.length > 0
      ? runsWithMetrics.reduce(
          (s, r) => s + ((r.metrics as Record<string, number>).totalCost ?? 0),
          0
        ) / runsWithMetrics.length
      : 0
  const avgLatency =
    runsWithMetrics.length > 0
      ? Math.round(
          runsWithMetrics.reduce(
            (s, r) => s + ((r.metrics as Record<string, number>).totalLatency ?? 0),
            0
          ) / runsWithMetrics.length
        )
      : 0

  const statCards = [
    {
      label: 'Pass Rate',
      value: passRate != null ? `${passRate}%` : 'N/A',
      icon: CheckCircle2,
      color: 'text-emerald-400',
      bg: 'bg-emerald-500/10',
      desc: `${passedRuns} passed · ${failedRuns} failed · ${pendingRuns} pending`,
    },
    {
      label: 'Test Suites',
      value: formatNumber(totalSuites),
      icon: FlaskConical,
      color: 'text-amber-400',
      bg: 'bg-amber-500/10',
      desc: `${totalCases} test cases across ${totalProjects} projects`,
    },
    {
      label: 'Total Runs',
      value: formatNumber(totalRuns),
      icon: Play,
      color: 'text-indigo-400',
      bg: 'bg-indigo-500/10',
      desc: `${completedRuns} completed · ${pendingRuns} pending`,
    },
    {
      label: 'Avg Cost',
      value: avgCost > 0 ? `$${avgCost.toFixed(4)}` : 'N/A',
      icon: DollarSign,
      color: 'text-purple-400',
      bg: 'bg-purple-500/10',
      desc: avgTokens > 0 ? `${formatNumber(avgTokens)} avg tokens` : 'Run tests to see cost data',
    },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Overview of your agent testing pipeline.
        </p>
        <p className="text-xs text-muted-foreground/60 mt-1">
          New here? Read the{' '}
          <a
            href="https://github.com/1304674612/agentbench/blob/main/docs/guides/web-dashboard-guide.md"
            className="underline hover:text-foreground"
            target="_blank"
          >
            Web Dashboard Guide
          </a>{' '}
          to understand how everything fits together.
        </p>
      </div>

      {/* Stat Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {statCards.map((s) => (
          <div
            key={s.label}
            className="rounded-xl border border-border bg-card p-4 hover:border-foreground/10 transition-colors"
          >
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
              <BarRow
                label="Pending"
                value={pendingRuns}
                total={totalRuns}
                color="bg-muted-foreground/30"
              />
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
                      <span
                        className={`shrink-0 w-2 h-2 rounded-full ${run.status === 'PASSED' ? 'bg-emerald-400' : run.status === 'FAILED' || run.status === 'ERROR' ? 'bg-red-400' : 'bg-amber-400'}`}
                      />
                      <span className="text-sm truncate">{run.name}</span>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground shrink-0 ml-3">
                      <span>{formatRelativeTime(run.createdAt)}</span>
                      {m.totalTokens && <span>{formatNumber(m.totalTokens)} tok</span>}
                    </div>
                  </Link>
                )
              })}
              <Link
                href="/runs"
                className="flex items-center justify-center gap-1 text-xs text-muted-foreground hover:text-foreground py-2 transition-colors"
              >
                View all runs <ArrowRight className="h-3 w-3" />
              </Link>
            </div>
          )}
        </div>
      </div>

      {/* Quality Trends Chart */}
      <QualityTrends dimensions={qualityDimensions} data={qualityData} />

      {/* Quick Actions */}
      <div className="rounded-xl border border-border bg-card p-5">
        <h3 className="font-semibold text-sm mb-4">Quick Actions</h3>
        <div className="grid gap-3 sm:grid-cols-4">
          <ActionCard href="/runs" icon={Play} label="New Run" desc="Execute an agent" />
          <ActionCard
            href="/tests"
            icon={CheckCircle2}
            label="Test Suites"
            desc="Manage test cases"
          />
          <ActionCard
            href="/experiments"
            icon={FlaskConical}
            label="Experiments"
            desc="A/B test agents"
          />
          <ActionCard
            href="/coverage"
            icon={BarChart3}
            label="Coverage"
            desc="View test coverage"
          />
        </div>
      </div>
    </div>
  )
}

function BarRow({
  label,
  value,
  total,
  color,
}: {
  label: string
  value: number
  total: number
  color: string
}) {
  const pct = total > 0 ? Math.round((value / total) * 100) : 0
  return (
    <div>
      <div className="flex items-center justify-between mb-1 text-xs">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-mono">
          {value} <span className="text-muted-foreground">({pct}%)</span>
        </span>
      </div>
      <div className="h-2 rounded-full bg-muted overflow-hidden">
        <div
          className={`h-full rounded-full ${color} transition-all`}
          style={{ width: `${Math.max(pct, 3)}%` }}
        />
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

function ActionCard({
  href,
  icon: Icon,
  label,
  desc,
}: {
  href: string
  icon: React.ComponentType<{ className?: string }>
  label: string
  desc: string
}) {
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
