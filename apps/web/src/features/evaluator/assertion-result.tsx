import { CheckCircle2, XCircle, AlertCircle, SkipForward } from 'lucide-react'

export interface AssertionResultProps {
  type: string
  status: string
  expected?: unknown
  actual?: unknown
  message?: string | null
  className?: string
}

const statusConfig: Record<
  string,
  { icon: typeof CheckCircle2; label: string; className: string }
> = {
  PASSED: {
    icon: CheckCircle2,
    label: 'Passed',
    className: 'text-emerald-400',
  },
  FAILED: {
    icon: XCircle,
    label: 'Failed',
    className: 'text-red-400',
  },
  ERROR: {
    icon: AlertCircle,
    label: 'Error',
    className: 'text-amber-400',
  },
  SKIPPED: {
    icon: SkipForward,
    label: 'Skipped',
    className: 'text-muted-foreground',
  },
}

export function AssertionResult({
  type,
  status,
  expected,
  actual,
  message,
  className = '',
}: AssertionResultProps) {
  const config = statusConfig[status] ?? statusConfig.SKIPPED
  const Icon = config.icon

  return (
    <div className={`flex items-start gap-3 rounded-lg border border-border p-3 ${className}`}>
      <Icon className={`h-4 w-4 mt-0.5 shrink-0 ${config.className}`} />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 mb-1">
          <code className="text-xs font-mono bg-muted rounded px-1.5 py-0.5">{type}</code>
          <span className={`text-xs font-medium ${config.className}`}>{config.label}</span>
        </div>
        <div className="grid gap-0.5 text-xs">
          <div className="flex gap-2">
            <span className="text-muted-foreground shrink-0">Expected:</span>
            <span className="text-muted-foreground truncate">
              {expected != null ? JSON.stringify(expected) : '—'}
            </span>
          </div>
          <div className="flex gap-2">
            <span className="text-muted-foreground shrink-0">Actual:</span>
            <span className="text-muted-foreground truncate">
              {actual != null ? JSON.stringify(actual) : '—'}
            </span>
          </div>
        </div>
        {message && <p className="text-xs text-muted-foreground mt-1">{message}</p>}
      </div>
    </div>
  )
}
