'use client'

import { useState, useMemo, useCallback, useRef } from 'react'
import { TrendingUp, Calendar } from 'lucide-react'

// ── Types ────────────────────────────────────────────────────────────────────

export interface QualityDimension {
  key: string
  label: string
  color: string
}

export interface QualityDataPoint {
  date: string
  [key: string]: number | string
}

export type TimeRange = '7d' | '14d' | '30d'

export interface QualityTrendsProps {
  dimensions: QualityDimension[]
  data: QualityDataPoint[]
  timeRange?: TimeRange
  onTimeRangeChange?: (range: TimeRange) => void
  className?: string
}

// ── Constants ────────────────────────────────────────────────────────────────

const DEFAULT_DIMENSIONS: QualityDimension[] = [
  { key: 'correctness', label: 'Correctness', color: '#818cf8' },
  { key: 'faithfulness', label: 'Faithfulness', color: '#34d399' },
  { key: 'safety', label: 'Safety', color: '#fbbf24' },
  { key: 'relevance', label: 'Relevance', color: '#c084fc' },
  { key: 'robustness', label: 'Robustness', color: '#60a5fa' },
]

const TIME_RANGE_OPTIONS: { value: TimeRange; label: string }[] = [
  { value: '7d', label: '7d' },
  { value: '14d', label: '14d' },
  { value: '30d', label: '30d' },
]

const CHART_PADDING = { top: 16, right: 24, bottom: 32, left: 40 }
const Y_MIN = 0
const Y_MAX = 10
const Y_TICK_COUNT = 5

// ── SVG chart sub-components ─────────────────────────────────────────────────

function GridLines({
  width,
  height,
  padding,
}: {
  width: number
  height: number
  padding: typeof CHART_PADDING
}) {
  const chartH = height - padding.top - padding.bottom
  const ticks = Array.from({ length: Y_TICK_COUNT + 1 }, (_, i) => {
    const y = padding.top + (chartH / Y_TICK_COUNT) * (Y_TICK_COUNT - i)
    const value = Y_MIN + ((Y_MAX - Y_MIN) / Y_TICK_COUNT) * i
    return { y, value }
  })

  return (
    <g>
      {ticks.map((t) => (
        <g key={t.value}>
          <line
            x1={padding.left}
            x2={width - padding.right}
            y1={t.y}
            y2={t.y}
            stroke="hsl(var(--border))"
            strokeWidth={0.5}
          />
          <text
            x={padding.left - 8}
            y={t.y + 4}
            textAnchor="end"
            className="fill-muted-foreground"
            style={{ fontSize: '10px', fill: 'hsl(var(--muted-foreground))' }}
          >
            {t.value}
          </text>
        </g>
      ))}
    </g>
  )
}

function XAxisLabels({
  labels,
  width,
  height,
  padding,
}: {
  labels: string[]
  width: number
  height: number
  padding: typeof CHART_PADDING
}) {
  const chartW = width - padding.left - padding.right
  if (labels.length === 0) return null

  // Show at most ~7 labels to avoid crowding
  const maxLabels = 7
  const step = Math.max(1, Math.ceil(labels.length / maxLabels))
  const visible = labels.filter((_, i) => i % step === 0 || i === labels.length - 1)

  return (
    <g>
      {visible.map((label) => {
        const idx = labels.indexOf(label)
        const x = padding.left + (chartW / Math.max(labels.length - 1, 1)) * idx
        return (
          <text
            key={label}
            x={x}
            y={height - 4}
            textAnchor="middle"
            className="fill-muted-foreground"
            style={{ fontSize: '10px', fill: 'hsl(var(--muted-foreground))' }}
          >
            {label}
          </text>
        )
      })}
    </g>
  )
}

function DataLine({
  points,
  color,
  width,
  height,
  padding,
}: {
  points: (number | null)[]
  color: string
  width: number
  height: number
  padding: typeof CHART_PADDING
}) {
  const chartW = width - padding.left - padding.right
  const chartH = height - padding.top - padding.bottom

  const validPoints = points
    .map((val, i) => {
      if (val == null) return null
      const x = padding.left + (chartW / Math.max(points.length - 1, 1)) * i
      const y = padding.top + chartH - (val / (Y_MAX - Y_MIN)) * chartH
      return { x, y }
    })
    .filter((p): p is { x: number; y: number } => p !== null)

  if (validPoints.length < 2) return null

  const pathD = validPoints
    .map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`)
    .join(' ')

  return (
    <g>
      <path
        d={pathD}
        fill="none"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {validPoints.map((p, i) => (
        <circle
          key={i}
          cx={p.x}
          cy={p.y}
          r={3}
          fill={color}
          stroke="hsl(var(--card))"
          strokeWidth={1.5}
        />
      ))}
    </g>
  )
}

function Tooltip({
  x,
  y,
  items,
}: {
  x: number
  y: number
  items: { label: string; value: number | null; color: string }[]
}) {
  const tooltipWidth = 160
  const tooltipX = Math.min(x + 12, 800 - tooltipWidth)
  const tooltipY = Math.max(y - 80, 8)

  return (
    <g>
      <line
        x1={x}
        x2={x}
        y1={CHART_PADDING.top}
        y2={300 - CHART_PADDING.bottom}
        stroke="hsl(var(--muted-foreground) / 0.3)"
        strokeWidth={1}
        strokeDasharray="4 4"
      />
      <foreignObject
        x={tooltipX}
        y={tooltipY}
        width={tooltipWidth}
        height={120}
        style={{ overflow: 'visible' }}
      >
        <div
          style={{
            background: 'hsl(var(--card))',
            border: '1px solid hsl(var(--border))',
            borderRadius: '8px',
            padding: '8px 10px',
            fontSize: '12px',
            color: 'hsl(var(--card-foreground))',
            boxShadow: '0 4px 12px rgba(0,0,0,0.25)',
          }}
        >
          {items.map((item) => (
            <div key={item.label} style={{ display: 'flex', justifyContent: 'space-between', gap: 8, marginBottom: 4 }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: '50%',
                    backgroundColor: item.color,
                    flexShrink: 0,
                  }}
                />
                <span style={{ color: 'hsl(var(--muted-foreground))' }}>{item.label}</span>
              </span>
              <span style={{ fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>
                {item.value != null ? item.value.toFixed(1) : '--'}
              </span>
            </div>
          ))}
        </div>
      </foreignObject>
    </g>
  )
}

// ── Main component ───────────────────────────────────────────────────────────

export function QualityTrends({
  dimensions = DEFAULT_DIMENSIONS,
  data = [],
  timeRange: externalTimeRange,
  onTimeRangeChange,
  className = '',
}: QualityTrendsProps) {
  const [internalTimeRange, setInternalTimeRange] = useState<TimeRange>('7d')
  const timeRange = externalTimeRange ?? internalTimeRange
  const [hoverIndex, setHoverIndex] = useState<number | null>(null)
  const svgRef = useRef<SVGSVGElement>(null)

  const handleTimeRangeChange = useCallback(
    (range: TimeRange) => {
      setInternalTimeRange(range)
      onTimeRangeChange?.(range)
    },
    [onTimeRangeChange],
  )

  // Filter data by time range
  const filteredData = useMemo(() => {
    if (data.length === 0) return []
    const days = timeRange === '7d' ? 7 : timeRange === '14d' ? 14 : 30
    const cutoff = new Date()
    cutoff.setDate(cutoff.getDate() - days)
    return data.filter((d) => new Date(d.date) >= cutoff)
  }, [data, timeRange])

  const dateLabels = useMemo(
    () =>
      filteredData.map((d) => {
        const dt = new Date(d.date)
        return `${dt.getMonth() + 1}/${dt.getDate()}`
      }),
    [filteredData],
  )

  const dimensionLines = useMemo(
    () =>
      dimensions.map((dim) => ({
        ...dim,
        points: filteredData.map((d) => {
          const v = d[dim.key]
          return typeof v === 'number' ? v : null
        }),
      })),
    [dimensions, filteredData],
  )

  // Tooltip data
  const hoverTooltipItems = useMemo(() => {
    if (hoverIndex == null || hoverIndex >= filteredData.length) return null
    return dimensions.map((dim) => ({
      label: dim.label,
      value:
        typeof filteredData[hoverIndex][dim.key] === 'number'
          ? (filteredData[hoverIndex][dim.key] as number)
          : null,
      color: dim.color,
    }))
  }, [hoverIndex, filteredData, dimensions])

  // Mouse handlers
  const handleMouseMove = useCallback(
    (e: React.MouseEvent<SVGSVGElement>) => {
      if (filteredData.length === 0 || !svgRef.current) return
      const rect = svgRef.current.getBoundingClientRect()
      const svgWidth = rect.width
      const chartW = svgWidth - CHART_PADDING.left - CHART_PADDING.right
      const mouseX = ((e.clientX - rect.left) / svgWidth) * 800 // 800 = viewBox width

      const relX = mouseX - CHART_PADDING.left
      const ratio = Math.max(0, Math.min(1, relX / chartW))
      const idx = Math.round(ratio * (filteredData.length - 1))
      setHoverIndex(idx)
    },
    [filteredData],
  )

  const handleMouseLeave = useCallback(() => setHoverIndex(null), [])

  const hoverX = useMemo(() => {
    if (hoverIndex == null || filteredData.length === 0) return null
    const chartW = 800 - CHART_PADDING.left - CHART_PADDING.right
    return CHART_PADDING.left + (chartW / Math.max(filteredData.length - 1, 1)) * hoverIndex
  }, [hoverIndex, filteredData.length])

  const hasData = filteredData.length > 0

  return (
    <div className={`rounded-xl border border-border bg-card p-5 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-sm flex items-center gap-2">
          <TrendingUp className="h-4 w-4 text-muted-foreground" />
          Quality Trends
        </h3>

        {/* Time range selector */}
        <div className="flex items-center rounded-lg border border-border bg-muted/30 p-0.5">
          {TIME_RANGE_OPTIONS.map((opt) => {
            const isActive = timeRange === opt.value
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => handleTimeRangeChange(opt.value)}
                className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
                  isActive
                    ? 'bg-card text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {opt.label}
              </button>
            )
          })}
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-4 mb-3">
        {dimensions.map((dim) => (
          <div key={dim.key} className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <span
              className="w-2.5 h-2.5 rounded-full shrink-0"
              style={{ backgroundColor: dim.color }}
            />
            {dim.label}
          </div>
        ))}
      </div>

      {/* Chart area */}
      {hasData ? (
        <div className="relative w-full" style={{ aspectRatio: '2.8 / 1' }}>
          <svg
            ref={svgRef}
            viewBox="0 0 800 300"
            className="w-full h-full"
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
          >
            <GridLines width={800} height={300} padding={CHART_PADDING} />
            <XAxisLabels labels={dateLabels} width={800} height={300} padding={CHART_PADDING} />

            {dimensionLines.map((dim) => (
              <DataLine
                key={dim.key}
                points={dim.points}
                color={dim.color}
                width={800}
                height={300}
                padding={CHART_PADDING}
              />
            ))}

            {hoverX != null && hoverTooltipItems && (
              <Tooltip x={hoverX} y={CHART_PADDING.top} items={hoverTooltipItems} />
            )}
          </svg>
        </div>
      ) : (
        /* Empty state */
        <div className="py-12 text-center">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-muted mx-auto mb-3">
            <Calendar className="h-5 w-5 text-muted-foreground" />
          </div>
          <p className="text-sm font-medium text-foreground mb-1">No quality data yet</p>
          <p className="text-xs text-muted-foreground max-w-xs mx-auto">
            Run your first test to see quality trends over time.
          </p>
        </div>
      )}
    </div>
  )
}
