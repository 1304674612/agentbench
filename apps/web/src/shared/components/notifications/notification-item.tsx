'use client'

import type { Notification } from '@prisma/client'
import { AlertTriangle, BarChart3, Bell, CheckCircle, CreditCard, Shield } from 'lucide-react'
import timeAgo from '@/shared/lib/time-ago'

interface NotificationItemProps {
  notification: Notification
  onClick: (notification: Notification) => void
}

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  SYSTEM: Bell,
  BILLING: CreditCard,
  SECURITY: Shield,
  RUN_COMPLETED: CheckCircle,
  REGRESSION_DETECTED: AlertTriangle,
  USAGE_ALERT: BarChart3,
}

const colorMap: Record<string, string> = {
  SYSTEM: 'text-blue-400 bg-blue-500/10',
  BILLING: 'text-amber-400 bg-amber-500/10',
  SECURITY: 'text-red-400 bg-red-500/10',
  RUN_COMPLETED: 'text-emerald-400 bg-emerald-500/10',
  REGRESSION_DETECTED: 'text-red-400 bg-red-500/10',
  USAGE_ALERT: 'text-amber-400 bg-amber-500/10',
}

export function NotificationItem({ notification, onClick }: NotificationItemProps) {
  const Icon = iconMap[notification.type] ?? Bell
  const colorClass = colorMap[notification.type] ?? 'text-muted-foreground bg-muted'

  return (
    <button
      type="button"
      onClick={() => onClick(notification)}
      className="w-full flex items-start gap-3 px-4 py-3 text-left hover:bg-accent/50 transition-colors border-b border-border last:border-b-0"
    >
      {/* Icon */}
      <div
        className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${colorClass}`}
      >
        <Icon className="h-4 w-4" />
      </div>

      {/* Content */}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-foreground truncate">{notification.title}</span>
          {!notification.isRead && <span className="h-2 w-2 shrink-0 rounded-full bg-blue-500" />}
        </div>
        <p className="mt-0.5 text-xs text-muted-foreground line-clamp-2">{notification.message}</p>
        <p className="mt-1 text-[11px] text-muted-foreground/60">
          {timeAgo(notification.createdAt)}
        </p>
      </div>
    </button>
  )
}
