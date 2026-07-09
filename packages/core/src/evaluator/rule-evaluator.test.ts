import { describe, it, expect } from 'vitest'
import { evaluateRule, evaluateRules, type RuleEvalContext } from './rule-evaluator'

const baseContext: RuleEvalContext = {
  output: 'The refund policy allows returns within 30 days of purchase.',
  toolCalls: [
    { name: 'search_docs', arguments: { query: 'refund policy' }, result: 'found' },
    { name: 'create_ticket', arguments: { priority: 'high' }, result: 'created', error: undefined },
  ],
  metrics: {
    totalTokens: 2500,
    totalCost: 0.005,
    totalLatency: 3200,
    stepCount: 3,
    llmCallCount: 2,
  },
  status: 'passed',
}

describe('evaluateRule', () => {
  it('exact_match — passes when output matches', () => {
    const r = evaluateRule(
      { type: 'exact_match', params: { expected: baseContext.output } },
      baseContext,
    )
    expect(r.passed).toBe(true)
    expect(r.score).toBe(1)
  })

  it('exact_match — fails when output differs', () => {
    const r = evaluateRule(
      { type: 'exact_match', params: { expected: 'wrong' } },
      baseContext,
    )
    expect(r.passed).toBe(false)
  })

  it('contains — passes when substring found', () => {
    const r = evaluateRule(
      { type: 'contains', params: { substring: '30 days' } },
      baseContext,
    )
    expect(r.passed).toBe(true)
  })

  it('contains — fails when substring not found', () => {
    const r = evaluateRule(
      { type: 'contains', params: { substring: 'no refunds' } },
      baseContext,
    )
    expect(r.passed).toBe(false)
  })

  it('contains — case insensitive', () => {
    const r = evaluateRule(
      { type: 'contains', params: { substring: 'REFUND', caseSensitive: false } },
      baseContext,
    )
    expect(r.passed).toBe(true)
  })

  it('contains — respects minOccurrences', () => {
    const r = evaluateRule(
      { type: 'contains', params: { substring: 'the', minOccurrences: 3 } },
      baseContext,
    )
    expect(r.passed).toBe(false)
  })

  it('regex_match — passes', () => {
    const r = evaluateRule(
      { type: 'regex_match', params: { pattern: '\\d+ days' } },
      baseContext,
    )
    expect(r.passed).toBe(true)
  })

  it('regex_match — fails', () => {
    const r = evaluateRule(
      { type: 'regex_match', params: { pattern: '\\\\d+ years' } },
      baseContext,
    )
    expect(r.passed).toBe(false)
  })

  it('json_schema — validates JSON output', () => {
    const ctx: RuleEvalContext = {
      ...baseContext,
      output: '{"name":"Alice","age":30}',
    }
    const r = evaluateRule(
      {
        type: 'json_schema',
        params: {
          schema: {
            type: 'object',
            properties: { name: { type: 'string' }, age: { type: 'number' } },
            required: ['name'],
          },
        },
      },
      ctx,
    )
    expect(r.passed).toBe(true)
  })

  it('json_schema — rejects invalid JSON', () => {
    const ctx: RuleEvalContext = { ...baseContext, output: 'not json' }
    const r = evaluateRule(
      { type: 'json_schema', params: { schema: { type: 'object' } } },
      ctx,
    )
    expect(r.passed).toBe(false)
  })

  it('tool_called — passes', () => {
    const r = evaluateRule(
      { type: 'tool_called', params: { tool: 'search_docs' } },
      baseContext,
    )
    expect(r.passed).toBe(true)
  })

  it('tool_called — fails for uncalled tool', () => {
    const r = evaluateRule(
      { type: 'tool_called', params: { tool: 'delete_everything' } },
      baseContext,
    )
    expect(r.passed).toBe(false)
  })

  it('tool_not_called — passes', () => {
    const r = evaluateRule(
      { type: 'tool_not_called', params: { tool: 'delete_everything' } },
      baseContext,
    )
    expect(r.passed).toBe(true)
  })

  it('tool_called_with — checks arguments', () => {
    const r = evaluateRule(
      { type: 'tool_called_with', params: { tool: 'search_docs', arguments: { query: 'refund policy' } } },
      baseContext,
    )
    expect(r.passed).toBe(true)
  })

  it('tool_called_times — checks count', () => {
    const r = evaluateRule(
      { type: 'tool_called_times', params: { tool: 'search_docs', count: 1 } },
      baseContext,
    )
    expect(r.passed).toBe(true)
  })

  it('latency_lt — passes under threshold', () => {
    const r = evaluateRule(
      { type: 'latency_lt', params: { threshold: 5000 } },
      baseContext,
    )
    expect(r.passed).toBe(true)
  })

  it('latency_lt — fails over threshold', () => {
    const r = evaluateRule(
      { type: 'latency_lt', params: { threshold: 1000 } },
      baseContext,
    )
    expect(r.passed).toBe(false)
  })

  it('tokens_lt — passes', () => {
    const r = evaluateRule(
      { type: 'tokens_lt', params: { threshold: 4096 } },
      baseContext,
    )
    expect(r.passed).toBe(true)
  })

  it('cost_lt — passes', () => {
    const r = evaluateRule(
      { type: 'cost_lt', params: { threshold: 0.01 } },
      baseContext,
    )
    expect(r.passed).toBe(true)
  })

  it('status_code — checks status', () => {
    const ctx: RuleEvalContext = { ...baseContext, statusCode: 200 }
    const r = evaluateRule(
      { type: 'status_code', params: { code: 200 } },
      ctx,
    )
    expect(r.passed).toBe(true)
  })
})

describe('evaluateRules', () => {
  it('aggregates multiple rules', () => {
    const { results, totalScore, maxScore, allPassed } = evaluateRules(
      [
        { type: 'contains', params: { substring: '30 days' } },
        { type: 'tokens_lt', params: { threshold: 4096 } },
        { type: 'latency_lt', params: { threshold: 5000 } },
      ],
      baseContext,
    )
    expect(results).toHaveLength(3)
    expect(totalScore).toBe(3)
    expect(maxScore).toBe(3)
    expect(allPassed).toBe(true)
  })

  it('detects when not all pass', () => {
    const { allPassed } = evaluateRules(
      [
        { type: 'contains', params: { substring: 'no refunds' } },
        { type: 'tokens_lt', params: { threshold: 4096 } },
      ],
      baseContext,
    )
    expect(allPassed).toBe(false)
  })
})
