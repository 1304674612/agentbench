/**
 * State Graph — Defines the LangGraph-style workflow graph.
 *
 * The graph specifies:
 * 1. Nodes — processing functions that transform state
 * 2. Edges — transitions between nodes (linear, conditional, and loop-back)
 * 3. Conditional routing — deciding which node to visit next based on state
 *
 * Graph structure:
 *
 *   START
 *     │
 *     ▼
 *  [classify] ──────────────────────────────┐
 *     │                                      │
 *     ▼                                      │
 *  [retrieve]                                │
 *     │                                      │
 *     ▼                                      │
 *  [reason]                                  │
 *     │                                      │
 *     ▼                                      │
 *  [generate] ◄──────────────────────┐      │
 *     │                               │      │
 *     ▼                               │      │
 *  [validate] ──needs_revision────────┘      │
 *     │                                       │
 *     ├──pass────────▶ END                    │
 *     │                                       │
 *     ├──needs_human──▶ [human_review] ──▶ END│
 *     │                                       │
 *     └──fail─────────▶ [fallback] ──────▶ END│
 */

import type { WorkflowState, WorkflowStatus } from './state'
import {
  classifyNode,
  retrieveNode,
  reasonNode,
  generateNode,
  validateNode,
  humanReviewNode,
  fallbackNode,
} from './nodes'

// ---------------------------------------------------------------------------
// Edge definitions
// ---------------------------------------------------------------------------

export type NodeType =
  | 'classify'
  | 'retrieve'
  | 'reason'
  | 'generate'
  | 'validate'
  | 'human_review'
  | 'fallback'

export interface Edge {
  from: NodeType
  to: NodeType | ((state: WorkflowState) => NodeType)
  label: string
}

/**
 * Define all edges in the graph.
 */
export const EDGES: Edge[] = [
  { from: 'classify', to: 'retrieve', label: 'Always → retrieve after classify' },
  { from: 'retrieve', to: 'reason', label: 'Always → reason after retrieve' },
  { from: 'reason', to: 'generate', label: 'Always → generate after reason' },
  {
    from: 'generate',
    to: 'validate',
    label: 'Always → validate after generate',
  },
  {
    from: 'validate',
    to: (state: WorkflowState): NodeType => {
      if (state.validation === 'pass') return 'validate' // Terminal: completed
      if (state.validation === 'needs_revision') return 'generate'
      if (state.validation === 'needs_human') return 'human_review'
      return 'fallback'
    },
    label: 'Conditional: based on validation result',
  },
  {
    from: 'human_review',
    to: 'validate', // Terminal after review
    label: 'Always → complete after human review',
  },
  {
    from: 'fallback',
    to: 'validate', // Terminal fallback
    label: 'Always → complete after fallback',
  },
]

// ---------------------------------------------------------------------------
// Node execution map
// ---------------------------------------------------------------------------

export type NodeExecutor = (state: WorkflowState) => WorkflowState

export const NODES: Record<NodeType, NodeExecutor> = {
  classify: classifyNode,
  retrieve: retrieveNode,
  reason: reasonNode,
  generate: generateNode,
  validate: validateNode,
  human_review: humanReviewNode as NodeExecutor,
  fallback: fallbackNode,
}

/**
 * Get the next node based on current state and edge definitions.
 */
export function getNextNode(state: WorkflowState): NodeType | null {
  const currentNode = state.currentNode as NodeType

  // Terminal states
  if (state.status === 'completed' || state.status === 'failed') {
    return null
  }

  // If human review is required, route there
  if (state.humanReviewRequired && currentNode !== 'human_review') {
    return 'human_review'
  }

  // Find matching edges
  for (const edge of EDGES) {
    if (edge.from === currentNode) {
      if (typeof edge.to === 'function') {
        const next = edge.to(state)
        // If validate returns 'validate' (completed), treat as terminal
        if (next === 'validate' && state.status === 'completed') {
          return null
        }
        return next
      }
      return edge.to
    }
  }

  return null
}

/**
 * Execute one step in the graph: run the current node and determine the next.
 */
export function executeStep(state: WorkflowState): {
  state: WorkflowState
  nextNode: NodeType | null
} {
  const currentNode = state.currentNode as NodeType
  const executor = NODES[currentNode]

  if (!executor) {
    const failed = fallbackNode(state)
    return { state: failed, nextNode: null }
  }

  const nextState = executor(state)
  const nextNode = getNextNode(nextState)

  // Set the next node in state if there is one
  const finalState = nextNode ? { ...nextState, currentNode: nextNode } : nextState

  return { state: finalState, nextNode }
}

/**
 * Execute the full graph workflow from start to completion.
 */
export function executeGraph(initialState: WorkflowState): {
  finalState: WorkflowState
  steps: number
  traversalPath: NodeType[]
} {
  let state = initialState
  let steps = 0
  const maxSteps = 20

  while (steps < maxSteps) {
    const { state: nextState, nextNode } = executeStep(state)
    state = nextState
    steps++

    if (!nextNode) break
  }

  return {
    finalState: state,
    steps,
    traversalPath: state.nodeTraversalPath as NodeType[],
  }
}

/**
 * Get a summary of the graph structure for display/inspection.
 */
export function getGraphSummary(): string {
  return `
State Graph: Agent Workflow
============================
Nodes: classify → retrieve → reason → generate → validate → [human_review|fallback]
Edges:
  - classify → retrieve (always)
  - retrieve → reason (always)
  - reason → generate (always)
  - generate → validate (always)
  - validate → generate (conditional: needs_revision)
  - validate → human_review (conditional: needs_human)
  - validate → END (conditional: pass)
  - validate → fallback (conditional: fail)
  - human_review → END
  - fallback → END
`.trim()
}
