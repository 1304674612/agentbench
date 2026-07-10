import { describe, it, expect, vi } from 'vitest'
import {
  buildJudgePrompt,
  parseJudgeResponse,
  runLLMJudge,
  runMultiDimensionJudge,
  aggregateScores,
  type JudgeContext,
} from './llm-judge'
import { getJudgePrompt } from './judge-prompts'
import type { LLMJudgeConfig, JudgeDimension } from '../types/evaluator'

const mockCallLLM = vi.fn()

const defaultConfig: LLMJudgeConfig = {
  provider: 'openai',
  model: 'gpt-4o',
  dimensions: ['correctness'],
}

const defaultContext: JudgeContext = {
  input: 'What is the capital of France?',
  output: 'The capital of France is Paris, a city known for the Eiffel Tower.',
  expected: 'Paris',
}

describe('LLM Judge', () => {
  beforeEach(() => {
    mockCallLLM.mockReset()
  })

  describe('buildJudgePrompt', () => {
    it('builds a prompt for a given dimension', () => {
      const { systemPrompt, userPrompt } = buildJudgePrompt(
        'correctness',
        defaultContext,
      )

      expect(systemPrompt).toBeDefined()
      expect(systemPrompt.length).toBeGreaterThan(0)
      expect(userPrompt).toContain('What is the capital of France?')
      expect(userPrompt).toContain('The capital of France is Paris')
      expect(userPrompt).toContain('Paris')
    })

    it('includes expected answer in correctness prompt', () => {
      const { userPrompt } = buildJudgePrompt('correctness', defaultContext)

      expect(userPrompt).toContain('## Expected Answer')
      expect(userPrompt).toContain('Paris')
    })

    it('faithfulness prompt does not include expected section', () => {
      const { userPrompt } = buildJudgePrompt('faithfulness', {
        ...defaultContext,
        expected: undefined,
      })

      // Faithfulness prompt template does not have {expected} placeholder
      expect(userPrompt).toContain('Source Input/Context')
      expect(userPrompt).not.toContain('Expected Answer')
    })

    it('allows overriding the system prompt', () => {
      const { systemPrompt } = buildJudgePrompt('correctness', defaultContext, {
        systemPrompt: 'Custom system prompt for evaluation.',
      })

      expect(systemPrompt).toBe('Custom system prompt for evaluation.')
    })

    it('includes tools in tool_usage dimension', () => {
      const { userPrompt } = buildJudgePrompt('tool_usage', {
        ...defaultContext,
        tools: 'search, calculator',
        toolCalls: 'search(query="capital of France")',
      })

      expect(userPrompt).toContain('search, calculator')
      expect(userPrompt).toContain('search(query="capital of France")')
    })
  })

  describe('parseJudgeResponse', () => {
    it('parses a valid JSON response', () => {
      const result = parseJudgeResponse(
        '{"score": 8, "reasoning": "Good answer, minor omission."}',
        'correctness',
      )

      expect(result.dimension).toBe('correctness')
      expect(result.score).toBe(8)
      expect(result.maxScore).toBe(10)
      expect(result.reasoning).toBe('Good answer, minor omission.')
    })

    it('parses JSON from markdown code block', () => {
      const result = parseJudgeResponse(
        '```json\n{"score": 6, "reasoning": "Partially correct."}\n```',
        'correctness',
      )

      expect(result.score).toBe(6)
      expect(result.reasoning).toBe('Partially correct.')
    })

    it('extracts JSON from markdown code block', () => {
      const result = parseJudgeResponse(
        '```json\n{"score": 9, "reasoning": "Excellent answer."}\n```',
        'faithfulness',
      )

      expect(result.score).toBe(9)
      expect(result.reasoning).toBe('Excellent answer.')
    })

    it('clamps score to 0-10 range', () => {
      const tooHigh = parseJudgeResponse(
        '{"score": 15, "reasoning": "test"}',
        'correctness',
      )
      expect(tooHigh.score).toBe(10)

      const tooLow = parseJudgeResponse(
        '{"score": -5, "reasoning": "test"}',
        'correctness',
      )
      expect(tooLow.score).toBe(0)
    })

    it('handles invalid JSON gracefully', () => {
      const result = parseJudgeResponse(
        'Not JSON at all, just some text.',
        'correctness',
      )

      expect(result.score).toBe(0)
      expect(result.reasoning).toBe('No reasoning provided')
      expect(result.dimension).toBe('correctness')
    })

    it('handles empty response', () => {
      const result = parseJudgeResponse('', 'correctness')

      expect(result.score).toBe(0)
      expect(result.maxScore).toBe(10)
    })

    it('handles NaN score', () => {
      const result = parseJudgeResponse(
        '{"score": null, "reasoning": "test"}',
        'correctness',
      )

      expect(result.score).toBe(0)
    })

    it('preserves confidence when provided', () => {
      const result = parseJudgeResponse(
        '{"score": 8, "reasoning": "Good.", "confidence": 0.95}',
        'correctness',
      )

      expect(result.confidence).toBe(0.95)
    })
  })

  describe('runLLMJudge', () => {
    it('evaluates correctness with a mock LLM', async () => {
      mockCallLLM.mockResolvedValue('{"score": 9, "reasoning": "Accurate and complete answer."}')

      const result = await runLLMJudge(
        'correctness',
        defaultContext,
        defaultConfig,
        mockCallLLM,
      )

      expect(result.dimension).toBe('correctness')
      expect(result.score).toBe(9)
      expect(result.maxScore).toBe(10)
      expect(result.reasoning).toContain('Accurate')
      expect(result.duration).toBeGreaterThanOrEqual(0)
      expect(mockCallLLM).toHaveBeenCalledTimes(1)
      expect(mockCallLLM).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(String),
        'gpt-4o',
      )
    })

    it('evaluates faithfulness', async () => {
      mockCallLLM.mockResolvedValue('{"score": 8, "reasoning": "Mostly faithful with minor extrapolation."}')

      const result = await runLLMJudge(
        'faithfulness',
        { input: 'Tell me about dogs', output: 'Dogs are mammals.' },
        defaultConfig,
        mockCallLLM,
      )

      expect(result.dimension).toBe('faithfulness')
      expect(result.score).toBe(8)
    })

    it('handles LLM API errors gracefully', async () => {
      mockCallLLM.mockRejectedValue(new Error('API rate limit exceeded'))

      const result = await runLLMJudge(
        'correctness',
        defaultContext,
        defaultConfig,
        mockCallLLM,
      )

      expect(result.score).toBe(0)
      expect(result.reasoning).toContain('failed')
      expect(result.reasoning).toContain('API rate limit')
    })

    it('uses default model from config if not specified', async () => {
      mockCallLLM.mockResolvedValue('{"score": 7, "reasoning": "OK."}')

      await runLLMJudge('correctness', defaultContext, {
        provider: 'openai',
        model: 'gpt-4o-mini',
        dimensions: ['correctness'],
      }, mockCallLLM)

      expect(mockCallLLM).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(String),
        'gpt-4o-mini',
      )
    })
  })

  describe('runMultiDimensionJudge', () => {
    it('evaluates across multiple dimensions', async () => {
      mockCallLLM
        .mockResolvedValueOnce('{"score": 8, "reasoning": "Correct."}')
        .mockResolvedValueOnce('{"score": 9, "reasoning": "Faithful."}')
        .mockResolvedValueOnce('{"score": 7, "reasoning": "Relevant."}')

      const results = await runMultiDimensionJudge(
        ['correctness', 'faithfulness', 'relevance'],
        defaultContext,
        defaultConfig,
        mockCallLLM,
      )

      expect(results).toHaveLength(3)
      expect(results[0].dimension).toBe('correctness')
      expect(results[1].dimension).toBe('faithfulness')
      expect(results[2].dimension).toBe('relevance')
      expect(mockCallLLM).toHaveBeenCalledTimes(3)
    })

    it('runs evaluations in parallel', async () => {
      const start = Date.now()
      mockCallLLM.mockImplementation(() =>
        new Promise((resolve) => setTimeout(() => resolve('{"score": 8, "reasoning": "OK."}'), 10)),
      )

      await runMultiDimensionJudge(
        ['correctness', 'faithfulness', 'safety'],
        defaultContext,
        defaultConfig,
        mockCallLLM,
      )

      const elapsed = Date.now() - start
      // Should be roughly 10ms if parallel, not 30ms
      expect(elapsed).toBeLessThan(100)
    })
  })

  describe('aggregateScores', () => {
    const scores = [
      { dimension: 'correctness' as JudgeDimension, score: 8, maxScore: 10, reasoning: 'Good.' },
      { dimension: 'faithfulness' as JudgeDimension, score: 6, maxScore: 10, reasoning: 'OK.' },
      { dimension: 'relevance' as JudgeDimension, score: 10, maxScore: 10, reasoning: 'Perfect.' },
    ]

    it('aggregates with average strategy', () => {
      const result = aggregateScores(scores, 'average')

      // (8 + 6 + 10) / 3 = 8
      expect(result.overallScore).toBe(8)
      expect(result.maxScore).toBe(10)
      expect(result.scores).toHaveLength(3)
    })

    it('aggregates with min strategy', () => {
      const result = aggregateScores(scores, 'min')

      expect(result.overallScore).toBe(6)
    })

    it('aggregates with max strategy', () => {
      const result = aggregateScores(scores, 'max')

      expect(result.overallScore).toBe(10)
    })

    it('aggregates with weighted strategy', () => {
      const result = aggregateScores(scores, 'weighted', {
        correctness: 2,
        faithfulness: 1,
        relevance: 1,
      })

      // (8*2 + 6*1 + 10*1) / 4 = 32/4 = 8
      expect(result.overallScore).toBe(8)
    })

    it('uses equal weights when no weights provided for weighted strategy', () => {
      const result = aggregateScores(scores, 'weighted')

      expect(result.overallScore).toBe(8) // same as average
    })

    it('handles empty scores array', () => {
      const result = aggregateScores([], 'average')

      expect(result.overallScore).toBe(0)
      expect(result.scores).toHaveLength(0)
    })

    it('defaults to average strategy', () => {
      const result = aggregateScores(scores)

      expect(result.overallScore).toBe(8)
    })
  })

  describe('getJudgePrompt', () => {
    it('returns prompt for each dimension', () => {
      const dimensions: JudgeDimension[] = [
        'correctness', 'faithfulness', 'safety', 'relevance',
        'completeness', 'reasoning', 'conciseness', 'tool_usage',
      ]

      for (const dim of dimensions) {
        const prompt = getJudgePrompt(dim)
        expect(prompt.dimension).toBe(dim)
        expect(prompt.systemPrompt).toBeTruthy()
        expect(prompt.userPromptTemplate).toBeTruthy()
      }
    })
  })
})
