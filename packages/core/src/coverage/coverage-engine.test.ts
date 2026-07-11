import { describe, it, expect } from 'vitest'
import {
  calculateCoverage,
  computeCoverageTrend,
  generateCoverageSuggestions,
  type CoverageInput,
  type EdgeCaseDefinition,
} from './coverage-engine'
import type { CoverageReport } from '../types/coverage'
import type { ExecutionTrace, TraceStep } from '../types/trace'

function makeTraceStep(overrides?: Partial<TraceStep>): TraceStep {
  return {
    id: 'step_1',
    sequence: 1,
    type: 'llm_call',
    startedAt: new Date(),
    endedAt: new Date(),
    duration: 100,
    llmProvider: 'openai',
    llmModel: 'gpt-4o',
    status: 'success',
    ...overrides,
  }
}

function makeTrace(steps?: Partial<TraceStep>[]): ExecutionTrace {
  return {
    id: 'trace_1',
    runId: 'run_1',
    steps: (steps ?? [makeTraceStep()]).map((s, i) => ({
      id: `step_${i + 1}`,
      sequence: i + 1,
      ...(s as TraceStep),
    })),
    metadata: { agentName: 'test', environment: 'development' },
    createdAt: new Date(),
  }
}

function makeCoverageInput(overrides?: Partial<CoverageInput>): CoverageInput {
  return {
    projectId: 'proj_1',
    runs: [
      {
        id: 'run_1',
        config: {
          input: {
            messages: [{ role: 'user', content: 'Hello' }],
            variables: { lang: 'en', tone: 'formal' },
          },
        },
        trace: makeTrace([
          makeTraceStep({ sequence: 1, type: 'llm_call', llmModel: 'gpt-4o' }),
          makeTraceStep({ sequence: 2, type: 'tool_call', toolName: 'search' }),
          makeTraceStep({ sequence: 3, type: 'response' }),
        ]),
        metrics: { totalTokens: 150 },
      },
      {
        id: 'run_2',
        config: {
          input: {
            messages: [{ role: 'user', content: 'Bonjour' }],
            variables: { lang: 'fr', tone: 'casual' },
          },
        },
        trace: makeTrace([
          makeTraceStep({ sequence: 1, type: 'llm_call', llmModel: 'gpt-4o' }),
          makeTraceStep({ sequence: 2, type: 'tool_call', toolName: 'translate' }),
          makeTraceStep({ sequence: 3, type: 'response' }),
        ]),
        metrics: { totalTokens: 200 },
      },
    ],
    promptVariables: {
      lang: ['en', 'fr', 'de', 'es'],
      tone: ['formal', 'casual', 'friendly'],
    },
    availableTools: ['search', 'translate', 'calculator', 'summarize'],
    edgeCases: [
      { name: 'empty_input', description: 'Empty user input', testHint: 'Test with empty input' },
      {
        name: 'very_long_input',
        description: 'Very long input',
        testHint: 'Test with 50k char input',
      },
    ],
    ...overrides,
  }
}

describe('Coverage Engine', () => {
  describe('calculateCoverage', () => {
    it('calculates comprehensive coverage report', () => {
      const input = makeCoverageInput()
      const report = calculateCoverage(input)

      expect(report.projectId).toBe('proj_1')
      expect(report.timestamp).toBeInstanceOf(Date)
      expect(report.overall).toBeGreaterThanOrEqual(0)
      expect(report.overall).toBeLessThanOrEqual(100)
      expect(report.dimensions).toHaveLength(4)
      expect(report.dimensions.map((d) => d.name)).toEqual(['prompt', 'workflow', 'tool', 'edge'])
      expect(report.uncoveredPaths).toBeDefined()
      expect(report.suggestions).toBeDefined()
    })

    it('calculates prompt coverage with defined variables', () => {
      const input = makeCoverageInput()
      const report = calculateCoverage(input)

      const promptDim = report.dimensions.find((d) => d.name === 'prompt')
      expect(promptDim).toBeDefined()
      expect(promptDim!.percentage).toBeGreaterThanOrEqual(0)
    })

    it('handles no prompt variables by inferring from runs', () => {
      const input = makeCoverageInput({
        promptVariables: undefined,
      })
      const report = calculateCoverage(input)

      const promptDim = report.dimensions.find((d) => d.name === 'prompt')
      expect(promptDim).toBeDefined()
      expect(promptDim!.percentage).toBeGreaterThanOrEqual(0)
    })

    it('flags uncovered prompt variable values', () => {
      const input = makeCoverageInput({
        promptVariables: {
          lang: ['en', 'fr', 'de', 'es'],
          tone: ['formal', 'casual', 'friendly'],
        },
      })

      const report = calculateCoverage(input)

      const promptUncovered = report.uncoveredPaths.filter((p) => p.dimension === 'prompt')
      expect(promptUncovered.length).toBeGreaterThan(0)
    })

    it('calculates workflow coverage from trace paths', () => {
      const input = makeCoverageInput()
      const report = calculateCoverage(input)

      const workflowDim = report.dimensions.find((d) => d.name === 'workflow')
      expect(workflowDim).toBeDefined()
      expect(workflowDim!.details).toBeDefined()
    })

    it('flags single workflow path as uncovered', () => {
      const input = makeCoverageInput({
        runs: [
          {
            id: 'run_1',
            config: {},
            trace: makeTrace([
              makeTraceStep({ sequence: 1, type: 'llm_call' }),
              makeTraceStep({ sequence: 2, type: 'response' }),
            ]),
          },
          {
            id: 'run_2',
            config: {},
            trace: makeTrace([
              makeTraceStep({ sequence: 1, type: 'llm_call' }),
              makeTraceStep({ sequence: 2, type: 'response' }),
            ]),
          },
        ],
      })

      const report = calculateCoverage(input)

      const workflowUncovered = report.uncoveredPaths.filter((p) => p.dimension === 'workflow')
      expect(workflowUncovered.length).toBeGreaterThan(0)
    })

    it('calculates tool coverage against available tools', () => {
      const input = makeCoverageInput()
      const report = calculateCoverage(input)

      const toolDim = report.dimensions.find((d) => d.name === 'tool')
      expect(toolDim).toBeDefined()
      // 2 of 4 tools used (search, translate)
      expect(toolDim!.percentage).toBe(50)
      expect(toolDim!.covered).toBe(2)
      expect(toolDim!.total).toBe(4)
    })

    it('flags untested tools', () => {
      const input = makeCoverageInput()
      const report = calculateCoverage(input)

      const toolUncovered = report.uncoveredPaths.filter((p) => p.dimension === 'tool')
      expect(toolUncovered.length).toBeGreaterThan(0)
      expect(toolUncovered.some((u) => u.description.includes('calculator'))).toBe(true)
    })

    it('handles no available tools gracefully', () => {
      const input = makeCoverageInput({ availableTools: [] })
      const report = calculateCoverage(input)

      const toolDim = report.dimensions.find((d) => d.name === 'tool')
      expect(toolDim!.percentage).toBe(100)
    })

    it('calculates edge case coverage', () => {
      const input = makeCoverageInput()
      const report = calculateCoverage(input)

      const edgeDim = report.dimensions.find((d) => d.name === 'edge')
      expect(edgeDim).toBeDefined()
      expect(edgeDim!.percentage).toBe(0)
    })

    it('generates default edge cases when none provided', () => {
      const input = makeCoverageInput({ edgeCases: undefined })
      const report = calculateCoverage(input)

      const edgeDim = report.dimensions.find((d) => d.name === 'edge')
      expect(edgeDim).toBeDefined()
      expect(edgeDim!.total).toBeGreaterThan(0)
      expect(report.suggestions.some((s) => s.dimension === 'edge')).toBe(true)
    })

    it('computes coverage trend from previous reports', () => {
      const previous: CoverageReport = {
        projectId: 'proj_1',
        timestamp: new Date('2025-01-01'),
        overall: 40,
        dimensions: [
          { name: 'prompt', percentage: 50, covered: 1, total: 2 },
          { name: 'workflow', percentage: 30, covered: 1, total: 3 },
        ],
        uncoveredPaths: [],
        suggestions: [],
      }

      const input = makeCoverageInput({ previousReports: [previous] })
      const report = calculateCoverage(input)

      expect(report.trend).toBeDefined()
      expect(report.trend!.length).toBe(1)
      expect(report.trend![0].overall).toBe(40)
    })
  })

  describe('computeCoverageTrend', () => {
    function makeReport(overall: number, date: Date): CoverageReport {
      return {
        projectId: 'proj_1',
        timestamp: date,
        overall,
        dimensions: [],
        uncoveredPaths: [],
        suggestions: [],
      }
    }

    it('detects improving trend', () => {
      const reports = [
        makeReport(50, new Date('2025-01-01')),
        makeReport(65, new Date('2025-02-01')),
      ]

      const trend = computeCoverageTrend(reports)
      expect(trend.trend).toBe('improving')
      expect(trend.change).toBe(15)
    })

    it('detects declining trend', () => {
      const reports = [
        makeReport(80, new Date('2025-01-01')),
        makeReport(60, new Date('2025-02-01')),
      ]

      const trend = computeCoverageTrend(reports)
      expect(trend.trend).toBe('declining')
      expect(trend.change).toBe(-20)
    })

    it('detects stable trend', () => {
      const reports = [
        makeReport(60, new Date('2025-01-01')),
        makeReport(62, new Date('2025-02-01')),
      ]

      const trend = computeCoverageTrend(reports)
      expect(trend.trend).toBe('stable')
    })

    it('returns stable for single report', () => {
      const reports = [makeReport(70, new Date())]

      const trend = computeCoverageTrend(reports)
      expect(trend.trend).toBe('stable')
      expect(trend.change).toBe(0)
    })

    it('sorts reports by date', () => {
      const reports = [
        makeReport(90, new Date('2025-03-01')),
        makeReport(60, new Date('2025-01-01')),
        makeReport(75, new Date('2025-02-01')),
      ]

      const trend = computeCoverageTrend(reports)
      expect(trend.trend).toBe('improving')
      expect(trend.change).toBe(30)
    })
  })

  describe('generateCoverageSuggestions', () => {
    it('generates suggestions for low coverage dimensions', () => {
      const report: CoverageReport = {
        projectId: 'proj_1',
        timestamp: new Date(),
        overall: 30,
        dimensions: [
          { name: 'prompt', percentage: 25, covered: 1, total: 4 },
          { name: 'tool', percentage: 60, covered: 6, total: 10 },
        ],
        uncoveredPaths: [
          { dimension: 'prompt', description: 'Var x not tested', severity: 'high' },
          { dimension: 'prompt', description: 'Var y not tested', severity: 'high' },
          { dimension: 'tool', description: 'Tool z not tested', severity: 'high' },
          { dimension: 'tool', description: 'Tool w not tested', severity: 'medium' },
          { dimension: 'tool', description: 'Tool v not tested', severity: 'medium' },
          { dimension: 'tool', description: 'Tool u not tested', severity: 'low' },
        ],
        suggestions: [],
      }

      const tips = generateCoverageSuggestions(report)

      expect(tips.length).toBeGreaterThan(0)
      expect(tips.some((t) => t.includes('prompt'))).toBe(true)
      expect(tips.some((t) => t.includes('uncovered'))).toBe(true)
    })

    it('generates positive message for strong coverage', () => {
      const report: CoverageReport = {
        projectId: 'proj_1',
        timestamp: new Date(),
        overall: 95,
        dimensions: [{ name: 'prompt', percentage: 95, covered: 19, total: 20 }],
        uncoveredPaths: [],
        suggestions: [],
      }

      const tips = generateCoverageSuggestions(report)

      expect(tips.some((t) => t.includes('strong'))).toBe(true)
    })

    it('flags moderate coverage for improvement', () => {
      const report: CoverageReport = {
        projectId: 'proj_1',
        timestamp: new Date(),
        overall: 60,
        dimensions: [{ name: 'tool', percentage: 60, covered: 6, total: 10 }],
        uncoveredPaths: [],
        suggestions: [],
      }

      const tips = generateCoverageSuggestions(report)

      expect(tips.some((t) => t.includes('tool') && t.includes('good'))).toBe(true)
    })
  })
})
