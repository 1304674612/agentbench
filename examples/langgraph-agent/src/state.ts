/**
 * State Schema — Defines the state shape for the LangGraph-style workflow.
 *
 * The state flows through nodes in the graph, accumulating information
 * as it passes through CLASSIFY, RETRIEVE, REASON, GENERATE, and VALIDATE.
 */

export type IntentType =
  | 'question_answering'
  | 'summarization'
  | 'code_generation'
  | 'data_analysis'
  | 'translation'
  | 'unknown'

export type WorkflowStatus =
  | 'idle'
  | 'classifying'
  | 'retrieving'
  | 'reasoning'
  | 'generating'
  | 'validating'
  | 'completed'
  | 'human_review'
  | 'failed'

export type ValidationResult = 'pass' | 'needs_revision' | 'needs_human' | 'fail'

export interface WorkflowState {
  /** Unique ID for this workflow execution */
  executionId: string

  /** The original user input */
  userInput: string

  /** Classified intent */
  intent: IntentType

  /** Confidence score for the classification (0-1) */
  confidence: number

  /** Current node being executed */
  currentNode: string

  /** Overall workflow status */
  status: WorkflowStatus

  /** Retrieved context items from the RETRIEVE node */
  retrievedContext: string[]

  /** Reasoning output from the REASON node */
  reasoning: string

  /** Generated response from the GENERATE node */
  generatedResponse: string

  /** Validation result from the VALIDATE node */
  validation: ValidationResult

  /** Validation feedback if revision is needed */
  validationFeedback: string

  /** Whether human review is required */
  humanReviewRequired: boolean

  /** The traversal path (ordered list of visited nodes) */
  nodeTraversalPath: string[]

  /** Accumulated messages for conversational context */
  messages: Array<{ role: 'user' | 'assistant' | 'system'; content: string }>

  /** Metadata for debugging */
  metadata: Record<string, unknown>
}

/**
 * Create an initial workflow state from user input.
 */
export function createInitialState(userInput: string): WorkflowState {
  return {
    executionId: `exec_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    userInput,
    intent: 'unknown',
    confidence: 0,
    currentNode: 'classify',
    status: 'idle',
    retrievedContext: [],
    reasoning: '',
    generatedResponse: '',
    validation: 'pass',
    validationFeedback: '',
    humanReviewRequired: false,
    nodeTraversalPath: [],
    messages: [{ role: 'user', content: userInput }],
    metadata: {},
  }
}

/**
 * Update specific fields in the state and return a new state object.
 */
export function updateState(state: WorkflowState, updates: Partial<WorkflowState>): WorkflowState {
  const next = { ...state, ...updates }
  if (updates.currentNode && !state.nodeTraversalPath.includes(updates.currentNode)) {
    next.nodeTraversalPath = [...state.nodeTraversalPath, updates.currentNode]
  }
  return next
}
