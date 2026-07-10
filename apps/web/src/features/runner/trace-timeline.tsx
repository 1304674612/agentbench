export interface TraceStep {
  id: string
  sequence: number
  type: string
  duration?: number | null
  totalTokens?: number | null
  status: string
  toolName?: string | null
  llmRequest?: Record<string, unknown> | null
  llmResponse?: Record<string, unknown> | null
  error?: { message?: string } | null
}

export interface TraceTimelineProps {
  steps: TraceStep[]
  formatDuration: (ms: number) => string
  formatNumber: (num: number) => string
}

const stepTypeStyles: Record<string, string> = {
  llm_call: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  tool_call: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
  error: 'bg-red-500/10 text-red-400 border-red-500/20',
}

const stepTypeLabels: Record<string, string> = {
  llm_call: 'LLM',
  tool_call: 'Tool',
  response: 'Output',
  error: 'Error',
}

export function TraceTimeline({ steps, formatDuration, formatNumber }: TraceTimelineProps) {
  if (steps.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-border p-8 text-center text-muted-foreground text-sm">
        No trace steps recorded for this run.
      </div>
    )
  }

  return (
    <div className="rounded-xl border border-border overflow-hidden">
      <table className="w-full">
        <thead>
          <tr className="border-b border-border bg-muted/50">
            <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground uppercase w-12">
              #
            </th>
            <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground uppercase">
              Type
            </th>
            <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground uppercase">
              Detail
            </th>
            <th className="px-4 py-2.5 text-right text-xs font-medium text-muted-foreground uppercase">
              Duration
            </th>
            <th className="px-4 py-2.5 text-right text-xs font-medium text-muted-foreground uppercase">
              Tokens
            </th>
            <th className="px-4 py-2.5 text-right text-xs font-medium text-muted-foreground uppercase">
              Status
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {steps.map((step) => {
            const llmReq = step.llmRequest as Record<string, unknown> | null
            const toolName = step.toolName

            return (
              <tr key={step.id} className="hover:bg-muted/30 transition-colors">
                <td className="px-4 py-2.5 text-xs text-muted-foreground font-mono">
                  {step.sequence}
                </td>
                <td className="px-4 py-2.5">
                  <span
                    className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${
                      stepTypeStyles[step.type] ?? 'bg-muted text-muted-foreground border-border'
                    }`}
                  >
                    {stepTypeLabels[step.type] ?? step.type}
                  </span>
                </td>
                <td className="px-4 py-2.5">
                  <div className="text-sm">
                    {step.type === 'llm_call' && llmReq && (
                      <span className="text-muted-foreground">
                        {llmReq.model as string}
                      </span>
                    )}
                    {step.type === 'tool_call' && toolName && (
                      <span className="font-mono text-xs">{toolName}()</span>
                    )}
                    {step.type === 'response' && (
                      <span className="text-muted-foreground">Final response</span>
                    )}
                    {step.type === 'error' && (
                      <span className="text-red-400">{step.error?.message ?? 'Unknown error'}</span>
                    )}
                  </div>
                </td>
                <td className="px-4 py-2.5 text-right">
                  <span className="text-xs font-mono text-muted-foreground">
                    {step.duration ? formatDuration(step.duration) : '—'}
                  </span>
                </td>
                <td className="px-4 py-2.5 text-right">
                  <span className="text-xs font-mono text-muted-foreground">
                    {step.totalTokens ? formatNumber(step.totalTokens) : '—'}
                  </span>
                </td>
                <td className="px-4 py-2.5 text-right">
                  <span
                    className={`text-xs font-medium ${
                      step.status === 'success'
                        ? 'text-emerald-400'
                        : 'text-red-400'
                    }`}
                  >
                    {step.status === 'success' ? '✓' : '✗'}
                  </span>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
