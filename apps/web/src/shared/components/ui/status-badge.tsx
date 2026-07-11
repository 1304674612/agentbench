import type { LucideIcon } from 'lucide-react'
import { CheckCircle2, XCircle, Loader2, Clock, AlertTriangle, Ban, Timer } from 'lucide-react'

const statusConfig: Record<string, { label: string; icon: LucideIcon; className: string }> = {
  PASSED: {
    label: 'Passed',
    icon: CheckCircle2,
    className: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  },
  FAILED: {
    label: 'Failed',
    icon: XCircle,
    className: 'bg-red-500/10 text-red-400 border-red-500/20',
  },
  RUNNING: {
    label: 'Running',
    icon: Loader2,
    className: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  },
  PENDING: {
    label: 'Pending',
    icon: Clock,
    className: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  },
  ERROR: {
    label: 'Error',
    icon: AlertTriangle,
    className: 'bg-red-500/10 text-red-400 border-red-500/20',
  },
  CANCELLED: {
    label: 'Cancelled',
    icon: Ban,
    className: 'bg-muted text-muted-foreground border-border',
  },
  TIMEOUT: {
    label: 'Timeout',
    icon: Timer,
    className: 'bg-orange-500/10 text-orange-400 border-orange-500/20',
  },
  DRAFT: {
    label: 'Draft',
    icon: Clock,
    className: 'bg-muted text-muted-foreground border-border',
  },
  COMPLETED: {
    label: 'Completed',
    icon: CheckCircle2,
    className: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  },
  SKIPPED: {
    label: 'Skipped',
    icon: Ban,
    className: 'bg-muted text-muted-foreground border-border',
  },
  ACTIVE: {
    label: 'Active',
    icon: CheckCircle2,
    className: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  },
}

export interface StatusBadgeProps {
  status: string
  className?: string
  showIcon?: boolean
}

export function StatusBadge({ status, className = '', showIcon = true }: StatusBadgeProps) {
  const config = statusConfig[status.toUpperCase()] ?? statusConfig.PENDING
  const Icon = config.icon

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium ${config.className} ${className}`}
    >
      {showIcon && (
        <Icon className={`h-3 w-3 ${status.toUpperCase() === 'RUNNING' ? 'animate-spin' : ''}`} />
      )}
      {config.label}
    </span>
  )
}
