import { describe, it, expect } from 'vitest'
import {
  generateReport,
  generateBatchReport,
  type ReportFormat,
} from './report-generator'
import type { RunResult } from '../types/run'

function makeRunResult(overrides?: Partial<RunResult>): RunResult {
  return {
    id: 'run_test_12345678',
    config: {
      name: 'Test Agent Run',
      projectId: 'proj_1',
      agent: {
        provider: 'openai',
        model: 'gpt-4o',
        temperature: 0.7,
        maxTokens: 4096,
        systemPrompt: 'You are a helpful assistant.',
      },
      input: {
        messages: [{ role: 'user', content: 'What is CI/CD?' }],
      },
      options: {
        timeout: 120000,
        maxSteps: 50,
        retries: 0,
        concurrency: 1,
      },
    },
    status: 'passed',
    trace: {
      id: 'trace_1',
      runId: 'run_1',
      steps: [],
      metadata: { agentName: 'Test Agent', environment: 'development' },
      createdAt: new Date(),
    },
    metrics: {
      totalTokens: 1500,
      promptTokens: 600,
      completionTokens: 900,
      totalCost: 0.0075,
      totalLatency: 3200,
      stepCount: 3,
      llmCallCount: 2,
      toolCallCount: 3,
      toolSuccessCount: 3,
      toolFailureCount: 0,
    },
    scores: [
      { evaluator: 'correctness', score: 8.5, maxScore: 10 },
      { evaluator: 'faithfulness', score: 9, maxScore: 10 },
    ],
    assertionResults: [
      { type: 'contains', status: 'passed', expected: '"CI/CD"', actual: 'contains "CI/CD"' },
      { type: 'tool_called', status: 'passed', expected: 'Tool "search" called', actual: '"search" called' },
      { type: 'tokens_lt', status: 'passed', expected: '< 4096 tokens', actual: '1500 tokens' },
    ],
    startedAt: new Date(),
    endedAt: new Date(),
    duration: 3200,
    summary: 'Completed in 3 steps, 1500 tokens, $0.0075',
    ...overrides,
  } as RunResult
}

function makeFailedRunResult(): RunResult {
  return {
    ...makeRunResult(),
    id: 'run_failed_87654321',
    status: 'failed',
    config: {
      ...makeRunResult().config,
      name: 'Failing Run',
    },
    metrics: {
      ...makeRunResult().metrics,
      totalTokens: 300,
      totalCost: 0.001,
    },
    scores: [
      { evaluator: 'correctness', score: 3, maxScore: 10 },
    ],
    assertionResults: [
      { type: 'contains', status: 'passed', expected: '"CI/CD"', actual: 'contains "CI/CD"' },
      { type: 'tool_called', status: 'failed', expected: 'Tool "search" called', actual: 'Not called', message: 'Expected tool "search" to be called' },
      { type: 'error', status: 'error', expected: null, actual: null, message: 'Evaluation error' },
    ],
    duration: 1200,
    summary: 'Failed: tool not called',
    error: 'Tool "search" was not called',
  } as RunResult
}

describe('Report Generator', () => {
  describe('JSON format', () => {
    it('generates JSON report with required fields', () => {
      const run = makeRunResult()
      const report = generateReport(run, 'json')

      expect(report.format).toBe('json')
      expect(report.mimeType).toBe('application/json')

      const parsed = JSON.parse(report.content)
      expect(parsed.id).toBe('run_test_12345678')
      expect(parsed.status).toBe('passed')
      expect(parsed.duration).toBe(3200)
      expect(parsed.metrics.totalTokens).toBe(1500)
      expect(parsed.scores).toHaveLength(2)
      expect(parsed.assertionResults).toHaveLength(3)
      expect(parsed.generatedAt).toBeDefined()
    })

    it('includes trace when includeTrace option is true', () => {
      const run = makeRunResult()
      const report = generateReport(run, 'json', { includeTrace: true })

      const parsed = JSON.parse(report.content)
      expect(parsed.trace).toBeDefined()
      expect(parsed.trace.id).toBe('trace_1')
    })

    it('excludes trace by default', () => {
      const run = makeRunResult()
      const report = generateReport(run, 'json')

      const parsed = JSON.parse(report.content)
      expect(parsed.trace).toBeUndefined()
    })

    it('includes config when includeConfig option is true', () => {
      const run = makeRunResult()
      const report = generateReport(run, 'json', { includeConfig: true })

      const parsed = JSON.parse(report.content)
      expect(parsed.config).toBeDefined()
      expect(parsed.config.name).toBe('Test Agent Run')
    })

    it('generates compact JSON when pretty is false', () => {
      const run = makeRunResult()
      const report = generateReport(run, 'json', { pretty: false })

      // Should not have line breaks (compact)
      expect(report.content.split('\n').length).toBe(1)
    })

    it('generates filename with run id prefix', () => {
      const run = makeRunResult()
      const report = generateReport(run, 'json')

      expect(report.filename).toContain('run_test')
      expect(report.filename).toMatch(/\.json$/)
    })
  })

  describe('Markdown format', () => {
    it('generates Markdown report with sections', () => {
      const run = makeRunResult()
      const report = generateReport(run, 'markdown')

      expect(report.format).toBe('markdown')
      expect(report.mimeType).toBe('text/markdown')
      expect(report.filename).toMatch(/\.md$/)

      const content = report.content

      // Header
      expect(content).toContain('# Test Agent Run')
      expect(content).toContain('**Status**: passed')

      // Metrics table
      expect(content).toContain('## Metrics')
      expect(content).toContain('Total Tokens')
      expect(content).toContain('1500')
      expect(content).toContain('$0.0075')
      expect(content).toContain('3200ms')

      // Scores
      expect(content).toContain('## Scores')
      expect(content).toContain('correctness')
      expect(content).toContain('8.5')

      // Assertions
      expect(content).toContain('## Assertions')
      expect(content).toContain('passed')
    })

    it('shows scores with proper formatting', () => {
      const run = makeRunResult()
      const report = generateReport(run, 'markdown')

      expect(report.content).toContain('8.5/10')
      expect(report.content).toContain('9.0/10') || expect(report.content).toContain('9/10')
    })

    it('includes summary section', () => {
      const run = makeRunResult()
      const report = generateReport(run, 'markdown')

      expect(report.content).toContain('## Summary')
      expect(report.content).toContain('Completed')
    })

    it('shows failed assertion count', () => {
      const run = makeFailedRunResult()
      const report = generateReport(run, 'markdown')

      expect(report.content).toContain('failed')
      expect(report.content).toContain('Expected tool')
    })
  })

  describe('HTML format', () => {
    it('generates HTML report with proper structure', () => {
      const run = makeRunResult()
      const report = generateReport(run, 'html')

      expect(report.format).toBe('html')
      expect(report.mimeType).toBe('text/html')
      expect(report.filename).toMatch(/\.html$/)

      const content = report.content

      expect(content).toContain('<!DOCTYPE html>')
      expect(content).toContain('<html lang="en">')
      expect(content).toContain('<title>')
      expect(content).toContain('<style>')
      expect(content).toContain('</html>')

      // Metric cards
      expect(content).toContain('1500')
      expect(content).toContain('$0.0075')
      expect(content).toContain('3200ms')

      // Score table
      expect(content).toContain('<table>')
      expect(content).toContain('correctness')
    })

    it('applies correct CSS classes for status', () => {
      const run = makeRunResult()
      const report = generateReport(run, 'html')

      expect(report.content).toContain('class="passed"')
    })

    it('handles failed status styling', () => {
      const run = makeFailedRunResult()
      const report = generateReport(run, 'html')

      expect(report.content).toContain('FAILED')
      expect(report.content).toContain('class="failed"')
    })
  })

  describe('JUnit XML format', () => {
    it('generates JUnit XML report', () => {
      const run = makeRunResult()
      const report = generateReport(run, 'junit')

      expect(report.format).toBe('junit')
      expect(report.mimeType).toBe('application/xml')
      expect(report.filename).toMatch(/\.xml$/)

      const content = report.content

      expect(content).toContain('<?xml version="1.0" encoding="UTF-8"?>')
      expect(content).toContain('<testsuite')
      expect(content).toContain('name="Test Agent Run"')
      expect(content).toContain('<testcase')
      expect(content).toContain('</testsuite>')
    })

    it('includes failure elements for failed assertions', () => {
      const run = makeFailedRunResult()
      const report = generateReport(run, 'junit')

      expect(report.content).toContain('<failure')
      expect(report.content).toContain('Expected tool')
    })

    it('includes error elements for errored assertions', () => {
      const run = makeFailedRunResult()
      const report = generateReport(run, 'junit')

      expect(report.content).toContain('<error')
      expect(report.content).toContain('Evaluation error')
    })

    it('handles runs without assertions', () => {
      const run = makeRunResult({
        assertionResults: [],
      })
      const report = generateReport(run, 'junit')

      expect(report.content).toContain('<testcase')
      expect(report.content).toContain('run.passed')
    })
  })

  describe('batch reports', () => {
    it('generates batch JSON report', () => {
      const runs = [makeRunResult(), makeFailedRunResult()]
      const report = generateBatchReport(runs, 'json', 'Batch Test Report')

      expect(report.format).toBe('json')

      const parsed = JSON.parse(report.content)
      expect(parsed.title).toBe('Batch Test Report')
      expect(parsed.totalRuns).toBe(2)
      expect(parsed.passed).toBe(1)
      expect(parsed.failed).toBe(1)
      expect(parsed.runs).toHaveLength(2)
    })

    it('generates batch Markdown report', () => {
      const runs = [makeRunResult(), makeFailedRunResult()]
      const report = generateBatchReport(runs, 'markdown', 'CI Report')

      expect(report.format).toBe('markdown')
      expect(report.content).toContain('# CI Report')
      expect(report.content).toContain('✅ Passed')
      expect(report.content).toContain('❌ Failed')
      expect(report.content).toContain('### Test Agent Run')
      expect(report.content).toContain('### Failing Run')
    })

    it('generates batch JUnit report', () => {
      const runs = [makeRunResult(), makeFailedRunResult()]
      const report = generateBatchReport(runs, 'junit', 'Test Suite Report')

      expect(report.format).toBe('junit')
      expect(report.content).toContain('<testsuites')
      expect(report.content).toContain('tests="2"')
      expect(report.content).toContain('</testsuites>')
    })

    it('defaults batch to JSON for unsupported format', () => {
      const runs = [makeRunResult()]
      const report = generateBatchReport(runs, 'html')

      expect(report.format).toBe('json')
    })
  })

  describe('report metadata', () => {
    it('all reports include generatedAt timestamp', () => {
      const formats: ReportFormat[] = ['json', 'markdown', 'html', 'junit']

      for (const format of formats) {
        const run = makeRunResult()
        const report = generateReport(run, format)

        expect(report.generatedAt).toBeInstanceOf(Date)
      }
    })

    it('all reports include correct mime type', () => {
      const run = makeRunResult()

      expect(generateReport(run, 'json').mimeType).toBe('application/json')
      expect(generateReport(run, 'markdown').mimeType).toBe('text/markdown')
      expect(generateReport(run, 'html').mimeType).toBe('text/html')
      expect(generateReport(run, 'junit').mimeType).toBe('application/xml')
    })
  })
})
