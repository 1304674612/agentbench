export interface CoverageReport {
  projectId: string
  timestamp: Date
  overall: number // 0-100 percentage
  dimensions: CoverageDimension[]
  uncoveredPaths: UncoveredPath[]
  suggestions: CoverageSuggestion[]
  trend?: CoverageTrendPoint[]
}

export interface CoverageDimension {
  name: string
  percentage: number
  covered: number
  total: number
  details?: CoverageDetail[]
}

export type CoverageDimensionName =
  | 'prompt'
  | 'workflow'
  | 'tool'
  | 'state'
  | 'edge'

export interface CoverageDetail {
  label: string
  covered: boolean
  count?: number
}

export interface UncoveredPath {
  dimension: CoverageDimensionName
  description: string
  severity: 'low' | 'medium' | 'high' | 'critical'
  suggestedTest?: string
}

export interface CoverageSuggestion {
  dimension: CoverageDimensionName
  message: string
  exampleInput?: Record<string, unknown>
}

export interface CoverageTrendPoint {
  date: Date
  overall: number
  dimensions: Record<string, number>
}
