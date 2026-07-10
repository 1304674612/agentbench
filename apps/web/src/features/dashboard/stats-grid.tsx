import type { LucideIcon } from 'lucide-react'
import { StatCard } from '@/shared/components/ui/stat-card'

export interface StatCardData {
  label: string
  value: string
  icon: LucideIcon
  color: string
  bg: string
  desc: string
}

export interface StatsGridProps {
  stats: StatCardData[]
  className?: string
}

export function StatsGrid({ stats, className = '' }: StatsGridProps) {
  return (
    <div className={`grid gap-4 sm:grid-cols-2 lg:grid-cols-4 ${className}`}>
      {stats.map((s) => (
        <StatCard
          key={s.label}
          icon={s.icon}
          label={s.label}
          value={s.value}
          color={s.color}
          bg={s.bg}
          desc={s.desc}
        />
      ))}
    </div>
  )
}
