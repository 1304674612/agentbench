/**
 * Graph Nodes — Each node represents a processing step in the workflow graph.
 *
 * Nodes are pure functions: WorkflowState -> WorkflowState.
 *
 * Available nodes:
 * - classifyNode — classify user intent using pattern matching
 * - retrieveNode — retrieve relevant context based on intent
 * - reasonNode — analyze information and plan the response
 * - generateNode — produce the final response
 * - validateNode — check response quality and decide next action
 * - humanReviewNode — pause for human approval (simulated)
 * - fallbackNode — handle unknown or failed states
 */

import type { WorkflowState } from './state'
import { updateState } from './state'

// ---------------------------------------------------------------------------
// classifyNode — classify user intent via keyword matching
// ---------------------------------------------------------------------------

const intentPatterns: Array<{
  pattern: RegExp
  intent: WorkflowState['intent']
  confidence: number
}> = [
  {
    pattern: /\b(what|who|where|when|why|how|explain|define|describe)\b/i,
    intent: 'question_answering',
    confidence: 0.9,
  },
  {
    pattern: /\b(summarize|summarise|summary|tldr|sum up|recap)\b/i,
    intent: 'summarization',
    confidence: 0.95,
  },
  {
    pattern: /\b(code|function|implement|write|program|script|algorithm|bug|fix|debug)\b/i,
    intent: 'code_generation',
    confidence: 0.85,
  },
  {
    pattern: /\b(analyze|analysis|chart|graph|statistics|trend|data|metrics|report)\b/i,
    intent: 'data_analysis',
    confidence: 0.85,
  },
  {
    pattern: /\b(translate|translation|convert.*language|in .* language)\b/i,
    intent: 'translation',
    confidence: 0.95,
  },
]

export function classifyNode(state: WorkflowState): WorkflowState {
  const updated = updateState(state, {
    currentNode: 'classify',
    status: 'classifying',
  })

  for (const { pattern, intent, confidence } of intentPatterns) {
    if (pattern.test(state.userInput)) {
      return updateState(updated, {
        intent,
        confidence,
        status: 'retrieving',
      })
    }
  }

  return updateState(updated, {
    intent: 'question_answering',
    confidence: 0.5,
    status: 'retrieving',
  })
}

// ---------------------------------------------------------------------------
// retrieveNode — retrieve context based on the classified intent
// ---------------------------------------------------------------------------

const knowledgeBase: Record<string, string[]> = {
  question_answering: [
    'Relevant facts about the topic from the knowledge base',
    'Context from previous conversations on similar topics',
    'Reference documentation and FAQ entries',
  ],
  summarization: [
    'Full source text for summarization',
    'Key points and entities extracted from the source',
    'Length constraints and format requirements',
  ],
  code_generation: [
    'API documentation and code examples',
    'Language-specific best practices and patterns',
    'Similar implementations from the codebase',
  ],
  data_analysis: [
    'Dataset schema and column descriptions',
    'Statistical methods and visualization options',
    'Previous analysis results and benchmarks',
  ],
  translation: [
    'Bilingual dictionary and phrase database',
    'Context-specific terminology glossaries',
    'Grammar rules for the target language',
  ],
  unknown: ['General knowledge base search results'],
}

export function retrieveNode(state: WorkflowState): WorkflowState {
  const updated = updateState(state, {
    currentNode: 'retrieve',
    status: 'retrieving',
  })

  const context = knowledgeBase[state.intent] ?? knowledgeBase.unknown

  return updateState(updated, {
    retrievedContext: context,
    status: 'reasoning',
  })
}

// ---------------------------------------------------------------------------
// reasonNode — analyze the information and plan the response
// ---------------------------------------------------------------------------

export function reasonNode(state: WorkflowState): WorkflowState {
  const updated = updateState(state, {
    currentNode: 'reason',
    status: 'reasoning',
  })

  const reasoningPlan = [
    `Intent: ${state.intent} (confidence: ${state.confidence})`,
    `Context chunks available: ${state.retrievedContext.length}`,
    `User query length: ${state.userInput.length} chars`,
    'Plan: synthesize context, address user query directly, cite sources where available.',
  ].join('\n')

  return updateState(updated, {
    reasoning: reasoningPlan,
    status: 'generating',
  })
}

// ---------------------------------------------------------------------------
// generateNode — produce the final response
// ---------------------------------------------------------------------------

export function generateNode(state: WorkflowState): WorkflowState {
  const updated = updateState(state, {
    currentNode: 'generate',
    status: 'generating',
  })

  const response = generateResponse(state)
  return updateState(updated, {
    generatedResponse: response,
    messages: [...state.messages, { role: 'assistant', content: response }],
    status: 'validating',
  })
}

function generateResponse(state: WorkflowState): string {
  const { intent, userInput, retrievedContext } = state

  switch (intent) {
    case 'question_answering':
      return (
        `Based on the available knowledge base, here is the answer to "${userInput}":\n\n` +
        `The information was retrieved from ${retrievedContext.length} context sources and synthesized into a comprehensive response.`
      )

    case 'summarization':
      return (
        `Summary of the provided content:\n\n` +
        `Key points have been extracted and condensed. The summary covers the main topics while preserving essential details.`
      )

    case 'code_generation':
      return (
        `Here is the code implementation for "${userInput}":\n\n` +
        `The solution follows best practices, includes error handling, and is documented with inline comments.`
      )

    case 'data_analysis':
      return (
        `Analysis results for "${userInput}":\n\n` +
        `Data has been processed, trends identified, and insights extracted. Key findings are presented with supporting metrics.`
      )

    case 'translation':
      return (
        `Translation result:\n\n` +
        `The text has been translated accurately, preserving both meaning and tone. Context-specific terminology has been applied.`
      )

    default:
      return `I processed your request "${userInput}" through the standard workflow pipeline. Here is the result based on available context.`
  }
}

// ---------------------------------------------------------------------------
// validateNode — check response quality and decide next action
// ---------------------------------------------------------------------------

export function validateNode(state: WorkflowState): WorkflowState {
  const updated = updateState(state, {
    currentNode: 'validate',
    status: 'validating',
  })

  const response = state.generatedResponse

  // Validation checks
  const isTooShort = response.length < 50
  const isTooVague = /I (think|guess|suppose)/i.test(response)
  const needsCitation = state.intent === 'question_answering' && !response.includes('source')
  const isComplexTranslation = state.intent === 'translation' && state.userInput.length > 200

  if (isTooShort || isTooVague) {
    return updateState(updated, {
      validation: 'needs_revision',
      validationFeedback: isTooShort
        ? 'Response is too short. Expand with more details.'
        : 'Response language is too vague. Be more specific.',
      status: 'generating',
    })
  }

  if (needsCitation || isComplexTranslation) {
    return updateState(updated, {
      validation: 'needs_human',
      validationFeedback: needsCitation
        ? 'Response lacks source citations.'
        : 'Complex translation requires human review.',
      humanReviewRequired: true,
      status: 'human_review',
    })
  }

  return updateState(updated, {
    validation: 'pass',
    status: 'completed',
  })
}

// ---------------------------------------------------------------------------
// humanReviewNode — simulate human review (approval required)
// ---------------------------------------------------------------------------

export function humanReviewNode(state: WorkflowState, approved = true): WorkflowState {
  const updated = updateState(state, {
    currentNode: 'human_review',
    status: 'human_review',
  })

  if (approved) {
    return updateState(updated, {
      humanReviewRequired: false,
      validation: 'pass',
      validationFeedback: 'Approved by human reviewer.',
      status: 'completed',
    })
  }

  return updateState(updated, {
    validation: 'needs_revision',
    validationFeedback: 'Rejected by human reviewer. Please revise.',
    humanReviewRequired: false,
    status: 'generating',
  })
}

// ---------------------------------------------------------------------------
// fallbackNode — handle unknown or failed states
// ---------------------------------------------------------------------------

export function fallbackNode(state: WorkflowState): WorkflowState {
  return updateState(state, {
    currentNode: 'fallback',
    status: 'failed',
    generatedResponse:
      'I was unable to process your request. Please try rephrasing or contact support for assistance.',
    validation: 'fail',
    messages: [
      ...state.messages,
      {
        role: 'assistant',
        content:
          'I was unable to process your request. Please try rephrasing or contact support for assistance.',
      },
    ],
  })
}
