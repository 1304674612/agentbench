export interface ScoreCardProps {
  evaluator: string
  score: number
  maxScore: number
  reason?: string | null
  judgeModel?: string | null
  className?: string
}

function getScoreColor(score: number, maxScore: number): string {
  const ratio = maxScore > 0 ? score / maxScore : 0
  if (ratio >= 0.8) return 'bg-emerald-500'
  if (ratio >= 0.5) return 'bg-amber-500'
  return 'bg-red-500'
}

function getScoreTextColor(score: number, maxScore: number): string {
  const ratio = maxScore > 0 ? score / maxScore : 0
  if (ratio >= 0.8) return 'text-emerald-400'
  if (ratio >= 0.5) return 'text-amber-400'
  return 'text-red-400'
}

export function ScoreCard({
  evaluator,
  score,
  maxScore,
  reason,
  judgeModel,
  className = '',
}: ScoreCardProps) {
  const ratio = maxScore > 0 ? score / maxScore : 0
  const pct = Math.round(ratio * 100)

  return (
    <div className={`rounded-xl border border-border bg-card p-4 ${className}`}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium capitalize">{evaluator.replace(/_/g, ' ')}</span>
        <span className={`text-sm font-mono font-bold ${getScoreTextColor(score, maxScore)}`}>
          {score.toFixed(1)}
          <span className="text-muted-foreground font-normal">/{maxScore}</span>
        </span>
      </div>
      <div className="h-2 rounded-full bg-muted overflow-hidden mb-2">
        <div
          className={`h-full rounded-full ${getScoreColor(score, maxScore)} transition-all`}
          style={{ width: `${Math.max(pct, 3)}%` }}
        />
      </div>
      {reason && <p className="text-xs text-muted-foreground line-clamp-2">{reason}</p>}
      {judgeModel && <p className="text-[10px] text-muted-foreground mt-2">Judge: {judgeModel}</p>}
    </div>
  )
}
