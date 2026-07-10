import type { LucideIcon } from 'lucide-react'
import { TrendingUp, TrendingDown, Minus } from 'lucide-react'

export type TrendDirection = 'up' | 'down' | 'neutral'

export interface MetricCardProps {
  icon?: LucideIcon
  label: string
  value: string
  trend?: TrendDirection
  trendValue?: string
  className?: string
}

export function MetricCard({
  icon: Icon,
  label,
  value,
  trend,
  trendValue,
  className = '',
}: MetricCardProps) {
  return (
    <div className={`rounded-xl border border-border bg-card p-4 ${className}`}>
      <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
        {Icon && <Icon className="h-4 w-4" />}
        {label}
      </div>
      <div className="flex items-baseline gap-2">
        <div className="text-2xl font-bold">{value}</div>
        {trend && trendValue && (
          <span
            className={`inline-flex items-center gap-0.5 text-xs font-medium ${
              trend === 'up'
                ? 'text-emerald-400'
                : trend === 'down'
                  ? 'text-red-400'
                  : 'text-muted-foreground'
            }`}
          >
            {trend === 'up' && <TrendingUp className="h-3 w-3" />}
            {trend === 'down' && <TrendingDown className="h-3 w-3" />}
            {trend === 'neutral' && <Minus className="h-3 w-3" />}
            {trendValue}
          </span>
        )}
      </div>
    </div>
  )
}
