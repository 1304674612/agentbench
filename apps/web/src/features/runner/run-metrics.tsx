import { Clock, Zap, DollarSign, BarChart3 } from 'lucide-react'
import { MetricCard } from '@/shared/components/ui/metric-card'

export interface RunMetricsData {
  duration?: number | null
  totalTokens?: number
  totalCost?: number
  stepCount?: number
}

export interface RunMetricsProps {
  metrics: RunMetricsData
  formatDuration: (ms: number) => string
  formatNumber: (num: number) => string
  formatCurrency: (amount: number) => string
}

export function RunMetrics({ metrics, formatDuration, formatNumber, formatCurrency }: RunMetricsProps) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <MetricCard
        icon={Clock}
        label="Duration"
        value={metrics.duration ? formatDuration(metrics.duration) : '—'}
      />
      <MetricCard
        icon={Zap}
        label="Total Tokens"
        value={metrics.totalTokens ? formatNumber(metrics.totalTokens) : '—'}
      />
      <MetricCard
        icon={DollarSign}
        label="Cost"
        value={metrics.totalCost !== undefined ? formatCurrency(metrics.totalCost) : '—'}
      />
      <MetricCard
        icon={BarChart3}
        label="Steps"
        value={String(metrics.stepCount ?? '—')}
      />
    </div>
  )
}
