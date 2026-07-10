import type { LucideIcon } from 'lucide-react'

export interface StatCardProps {
  icon: LucideIcon
  label: string
  value: string
  color?: string
  bg?: string
  desc?: string
  className?: string
}

export function StatCard({
  icon: Icon,
  label,
  value,
  color = 'text-muted-foreground',
  bg = 'bg-muted',
  desc,
  className = '',
}: StatCardProps) {
  return (
    <div className={`rounded-xl border border-border bg-card p-4 hover:border-foreground/10 transition-colors ${className}`}>
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm text-muted-foreground">{label}</span>
        <div className={`rounded-lg p-1.5 ${bg}`}>
          <Icon className={`h-4 w-4 ${color}`} />
        </div>
      </div>
      <div className="text-2xl font-bold">{value}</div>
      {desc && <div className="text-xs text-muted-foreground mt-1">{desc}</div>}
    </div>
  )
}
