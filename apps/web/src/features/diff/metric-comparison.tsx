import { TrendingUp, TrendingDown, Minus } from 'lucide-react'

export interface MetricComparisonData {
  label: string
  valueA: string
  valueB: string
  winner?: 'a' | 'b' | 'tie'
  unit?: string
}

export interface MetricComparisonProps {
  metrics: MetricComparisonData[]
  labelA?: string
  labelB?: string
  className?: string
}

export function MetricComparison({
  metrics,
  labelA = 'Variant A',
  labelB = 'Variant B',
  className = '',
}: MetricComparisonProps) {
  return (
    <div className={`rounded-xl border border-border overflow-hidden ${className}`}>
      <table className="w-full">
        <thead>
          <tr className="border-b border-border bg-muted/50">
            <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground uppercase">
              Metric
            </th>
            <th className="px-4 py-2.5 text-right text-xs font-medium text-muted-foreground uppercase">
              {labelA}
            </th>
            <th className="px-4 py-2.5 text-right text-xs font-medium text-muted-foreground uppercase">
              {labelB}
            </th>
            <th className="px-4 py-2.5 text-center text-xs font-medium text-muted-foreground uppercase w-16">
              Delta
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {metrics.map((m) => {
            const isAWinner = m.winner === 'a'
            const isBWinner = m.winner === 'b'

            return (
              <tr key={m.label} className="hover:bg-muted/30 transition-colors">
                <td className="px-4 py-2.5 text-sm">{m.label}</td>
                <td
                  className={`px-4 py-2.5 text-right text-sm font-mono ${
                    isAWinner ? 'text-emerald-400' : ''
                  }`}
                >
                  {m.valueA}
                  {isAWinner && <TrendingUp className="inline h-3 w-3 ml-1 text-emerald-400" />}
                </td>
                <td
                  className={`px-4 py-2.5 text-right text-sm font-mono ${
                    isBWinner ? 'text-emerald-400' : ''
                  }`}
                >
                  {m.valueB}
                  {isBWinner && <TrendingUp className="inline h-3 w-3 ml-1 text-emerald-400" />}
                </td>
                <td className="px-4 py-2.5 text-center">
                  {m.winner === 'tie' ? (
                    <Minus className="h-3 w-3 text-muted-foreground mx-auto" />
                  ) : isAWinner ? (
                    <TrendingUp className="h-3 w-3 text-emerald-400 mx-auto" />
                  ) : isBWinner ? (
                    <TrendingDown className="h-3 w-3 text-red-400 mx-auto" />
                  ) : (
                    <span className="text-xs text-muted-foreground">—</span>
                  )}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
