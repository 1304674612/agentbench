export interface AssertionConfig {
  type: AssertionType
  params: Record<string, unknown>
  description?: string
}

export type AssertionType =
  // Tool assertions
  | 'tool_called'
  | 'tool_not_called'
  | 'tool_called_with'
  | 'tool_called_times'
  // Token assertions
  | 'tokens_lt'
  | 'tokens_gt'
  | 'tokens_between'
  // Latency assertions
  | 'latency_lt'
  | 'latency_gt'
  | 'first_token_lt'
  // Output assertions
  | 'contains'
  | 'not_contains'
  | 'matches_regex'
  | 'matches_schema'
  | 'matches_snapshot'
  | 'exact_match'
  // Score assertions
  | 'score_gt'
  | 'score_lt'
  | 'score_between'
  // Status assertions
  | 'completed_successfully'
  | 'completed_with_error'
  // Compound
  | 'all'
  | 'any'
  | 'not'
