import {
  TrendingUp,
  TrendingDown,
  FlaskConical,
  Zap,
  Activity,
  AlertTriangle,
  Play,
  Clock,
  DollarSign,
} from 'lucide-react'
import { formatNumber, formatCurrency, formatDuration } from '@/shared/lib/utils'

// Mock data — will be replaced with real API calls
const stats = [
  {
    label: 'Pass Rate',
    value: '94.2%',
    change: '+2.1%',
    trend: 'up',
    icon: TrendingUp,
    color: 'text-emerald-500',
    bgColor: 'bg-emerald-500/10',
  },
  {
    label: 'Avg Score',
    value: '8.7',
    change: '+0.3',
    trend: 'up',
    icon: Activity,
    color: 'text-blue-500',
    bgColor: 'bg-blue-500/10',
  },
  {
    label: 'Total Runs',
    value: formatNumber(12340),
    change: '',
    trend: 'neutral',
    icon: Play,
    color: 'text-indigo-500',
    bgColor: 'bg-indigo-500/10',
  },
  {
    label: 'Open Issues',
    value: '3',
    change: '-2',
    trend: 'down',
    icon: AlertTriangle,
    color: 'text-amber-500',
    bgColor: 'bg-amber-500/10',
  },
]

const recentRuns = [
  {
    id: 'run_abc123',
    name: 'Customer Support Agent — v1.2',
    status: 'passed',
    score: 9.1,
    tokens: 2340,
    cost: 0.018,
    duration: 3200,
    model: 'claude-sonnet-4-20250514',
    createdAt: '2 minutes ago',
  },
  {
    id: 'run_def456',
    name: 'Code Review Agent — Baseline',
    status: 'passed',
    score: 8.5,
    tokens: 4500,
    cost: 0.042,
    duration: 5100,
    model: 'gpt-4o',
    createdAt: '15 minutes ago',
  },
  {
    id: 'run_ghi789',
    name: 'Research Agent — Edge Case Test',
    status: 'failed',
    score: 5.2,
    tokens: 8900,
    cost: 0.089,
    duration: 12000,
    model: 'claude-opus-4-20250514',
    createdAt: '1 hour ago',
  },
  {
    id: 'run_jkl012',
    name: 'Data Extraction Agent — Happy Path',
    status: 'passed',
    score: 9.7,
    tokens: 1200,
    cost: 0.008,
    duration: 1800,
    model: 'gpt-4o-mini',
    createdAt: '2 hours ago',
  },
  {
    id: 'run_mno345',
    name: 'Translation Agent — Batch Test',
    status: 'error',
    score: null,
    tokens: 0,
    cost: 0,
    duration: 30000,
    model: 'claude-sonnet-4-20250514',
    createdAt: '3 hours ago',
  },
]

const statusStyles = {
  passed: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20',
  failed: 'bg-red-500/10 text-red-500 border-red-500/20',
  error: 'bg-amber-500/10 text-amber-500 border-amber-500/20',
  pending: 'bg-muted text-muted-foreground border-border',
  running: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
}

export default function DashboardPage() {
  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Overview of your agent testing infrastructure.
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <div
            key={stat.label}
            className="rounded-xl border border-border bg-card p-5 transition-all hover:shadow-sm"
          >
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-muted-foreground">
                {stat.label}
              </span>
              <div className={`rounded-lg p-2 ${stat.bgColor}`}>
                <stat.icon className={`h-4 w-4 ${stat.color}`} />
              </div>
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-2xl font-bold tracking-tight">
                {stat.value}
              </span>
              {stat.change && (
                <span
                  className={`text-xs font-medium ${
                    stat.trend === 'up'
                      ? 'text-emerald-500'
                      : stat.trend === 'down'
                        ? 'text-red-500'
                        : 'text-muted-foreground'
                  }`}
                >
                  {stat.trend === 'up' ? '↑' : '↓'} {stat.change}
                </span>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Charts Row */}
      <div className="grid gap-4 lg:grid-cols-2">
        {/* Trend Chart Placeholder */}
        <div className="rounded-xl border border-border bg-card p-6">
          <h3 className="text-sm font-semibold mb-4">Pass Rate Trend</h3>
          <div className="flex items-center justify-center h-48 text-muted-foreground text-sm border border-dashed border-border rounded-lg">
            <div className="text-center">
              <TrendingUp className="h-8 w-8 mx-auto mb-2 opacity-30" />
              <span>Chart will render here</span>
              <p className="text-xs mt-1 opacity-50">
                Recharts integration pending
              </p>
            </div>
          </div>
        </div>

        {/* Score Distribution Placeholder */}
        <div className="rounded-xl border border-border bg-card p-6">
          <h3 className="text-sm font-semibold mb-4">Score Distribution</h3>
          <div className="flex items-center justify-center h-48 text-muted-foreground text-sm border border-dashed border-border rounded-lg">
            <div className="text-center">
              <Activity className="h-8 w-8 mx-auto mb-2 opacity-30" />
              <span>Chart will render here</span>
              <p className="text-xs mt-1 opacity-50">
                Histogram integration pending
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Runs */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Recent Runs</h2>
          <button
            type="button"
            className="text-sm text-primary hover:underline"
          >
            View all
          </button>
        </div>

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
                  Score
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Tokens
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Cost
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Duration
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Model
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {recentRuns.map((run) => (
                <tr
                  key={run.id}
                  className="hover:bg-muted/30 transition-colors cursor-pointer"
                >
                  <td className="px-4 py-3">
                    <div className="text-sm font-medium">{run.name}</div>
                    <div className="text-xs text-muted-foreground">
                      {run.createdAt}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${
                        statusStyles[run.status]
                      }`}
                    >
                      {run.status === 'passed' ? '✓' : run.status === 'failed' ? '✗' : '!'}{' '}
                      {run.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <span className="text-sm font-mono">
                      {run.score?.toFixed(1) ?? '—'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <span className="text-sm font-mono text-muted-foreground">
                      {formatNumber(run.tokens)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <span className="text-sm font-mono text-muted-foreground">
                      {formatCurrency(run.cost)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <span className="text-sm font-mono text-muted-foreground">
                      {formatDuration(run.duration)}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-xs font-mono text-muted-foreground">
                      {run.model}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid gap-4 sm:grid-cols-3">
        <button
          type="button"
          className="flex items-center gap-3 rounded-xl border border-border bg-card p-4 text-left hover:bg-accent/50 transition-colors"
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
            <Play className="h-5 w-5 text-primary" />
          </div>
          <div>
            <div className="text-sm font-medium">New Run</div>
            <div className="text-xs text-muted-foreground">
              Execute an agent test
            </div>
          </div>
        </button>

        <button
          type="button"
          className="flex items-center gap-3 rounded-xl border border-border bg-card p-4 text-left hover:bg-accent/50 transition-colors"
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-500/10">
            <FlaskConical className="h-5 w-5 text-emerald-500" />
          </div>
          <div>
            <div className="text-sm font-medium">Create Test</div>
            <div className="text-xs text-muted-foreground">
              Define a new test case
            </div>
          </div>
        </button>

        <button
          type="button"
          className="flex items-center gap-3 rounded-xl border border-border bg-card p-4 text-left hover:bg-accent/50 transition-colors"
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-500/10">
            <Zap className="h-5 w-5 text-amber-500" />
          </div>
          <div>
            <div className="text-sm font-medium">View Docs</div>
            <div className="text-xs text-muted-foreground">
              Getting started guide
            </div>
          </div>
        </button>
      </div>
    </div>
  )
}
