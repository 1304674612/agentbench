'use client'

import {
  AlertCircle,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  FileText,
  Gauge,
  Link2,
  Search,
  SkipForward,
  Wrench,
  XCircle,
} from 'lucide-react'
import { useMemo, useState } from 'react'
import { AssertionResult as AssertionResultCard } from '@/features/evaluator/assertion-result'
import { cn } from '@/shared/lib/utils'

// ============================================================
// Types
// ============================================================

export interface FailedAssertion {
  id: string
  type: string
  status: string
  expected?: unknown
  actual?: unknown
  message?: string | null
}

export interface FailureGuidanceProps {
  failedAssertions: FailedAssertion[]
  className?: string
}

// ============================================================
// Guidance mapping — assertion type → human-readable triage
// ============================================================

interface TriageSection {
  what: string
  why: string
  fix: string
  impact: 'correctness' | 'quality' | 'performance' | 'behavior'
}

function getTriage(assertion: FailedAssertion): TriageSection {
  const type = assertion.type
  const msg = assertion.message ?? ''
  const expected = assertion.expected
  const _actual = assertion.actual

  // Normalize — rule evaluator may use different type names than assertion config
  const normalized = type.toLowerCase().replace(/[^a-z0-9_]/g, '_')

  switch (normalized) {
    // ---- Tool assertions ----
    case 'tool_called': {
      const tool = extractParam(expected, 'tool', 'name', 'toolName')
      const toolName = tool || 'the required tool'
      return {
        what: `The agent was expected to call the \`${toolName}\` tool`,
        why:
          msg ||
          `The tool "${toolName}" was not invoked during execution. The agent completed its run without calling this tool.`,
        fix: `Check that your agent's system prompt or tool definitions correctly instruct it to use the \`${toolName}\` tool when handling this scenario. Verify the tool is registered and accessible.`,
        impact: 'correctness',
      }
    }
    case 'tool_not_called': {
      const tool = extractParam(expected, 'tool', 'name', 'toolName')
      const toolName = tool || 'the forbidden tool'
      return {
        what: `The agent was expected to NOT call \`${toolName}\``,
        why:
          msg ||
          `The tool "${toolName}" was invoked when it should not have been. This may indicate the agent is taking shortcuts or using incorrect tools.`,
        fix: `Add guardrails in your system prompt to prevent the agent from calling \`${toolName}\` in this type of scenario. Consider constraining the available tool set.`,
        impact: 'correctness',
      }
    }
    case 'tool_called_with': {
      const tool = extractParam(expected, 'tool', 'name', 'toolName')
      const toolName = tool || 'the tool'
      return {
        what: `The agent called \`${toolName}\` with incorrect arguments`,
        why:
          msg ||
          `The tool was called but the arguments passed did not match expectations. The agent may be hallucinating parameters or using wrong values.`,
        fix: `Review the argument schema for \`${toolName}\`. Check that your system prompt provides enough context about expected parameter values. Add argument validation to catch mismatches early.`,
        impact: 'correctness',
      }
    }
    case 'tool_called_times': {
      const tool = extractParam(expected, 'tool', 'name', 'toolName')
      const toolName = tool || 'the tool'
      return {
        what: `The agent called \`${toolName}\` the wrong number of times`,
        why:
          msg ||
          `The tool was called an incorrect number of times — either too many or too few invocations.`,
        fix: `Adjust the agent's reasoning to call \`${toolName}\` only when necessary. If the agent is calling too few times, check that it is not skipping required steps. If too many, check for redundant calls.`,
        impact: 'correctness',
      }
    }

    // ---- Output content assertions ----
    case 'contains':
    case 'output_contains': {
      const sub = extractParam(expected, 'substring', 'value', 'expected')
      const text = sub || 'the expected text'
      return {
        what: `The agent output is missing required content`,
        why: msg || `The output does not contain "${text}".`,
        fix: `Check your system prompt to ensure the agent understands it must include "${text}" in its response. Verify the output format instructions are clear and unambiguous.`,
        impact: 'quality',
      }
    }
    case 'not_contains':
    case 'output_not_contains': {
      const sub = extractParam(expected, 'substring', 'value', 'expected')
      const text = sub || 'forbidden text'
      return {
        what: `The agent output contains disallowed content`,
        why: msg || `The output contains "${text}" which should not appear.`,
        fix: `Add explicit instructions in the system prompt that the agent must NOT include "${text}" in its response. Consider adding a post-processing filter for critical disallowed phrases.`,
        impact: 'quality',
      }
    }
    case 'exact_match':
    case 'output_exact_match': {
      return {
        what: 'The agent output does not exactly match the expected text',
        why: msg || 'The generated output differs from the expected reference answer.',
        fix: 'Check that your system prompt produces deterministic, predictable outputs for this scenario. If minor variations are acceptable (spacing, casing), consider switching to a `contains` or `matches_regex` assertion instead of exact_match.',
        impact: 'quality',
      }
    }
    case 'matches_regex':
    case 'regex_match':
    case 'output_matches_regex': {
      const pattern = extractParam(expected, 'pattern', 'regex')
      const pat = pattern || 'the expected pattern'
      return {
        what: `The agent output does not match the expected pattern`,
        why: msg || `The output does not match the regex pattern \`${pat}\`.`,
        fix: `Verify the output format matches the expected pattern. Check your system prompt for formatting instructions. If the output format has changed intentionally, update the regex pattern to match the new format.`,
        impact: 'quality',
      }
    }
    case 'matches_schema':
    case 'json_schema':
    case 'output_matches_schema': {
      return {
        what: 'The agent output does not conform to the expected JSON schema',
        why:
          msg ||
          'The output has schema validation errors — required fields may be missing or have incorrect types.',
        fix: 'Add the expected JSON schema to your system prompt so the agent knows the required structure. Consider using structured output / JSON mode on your model if available. Add field-level descriptions to guide the agent.',
        impact: 'quality',
      }
    }
    case 'matches_snapshot':
    case 'output_matches_snapshot': {
      return {
        what: 'The agent output has diverged from the baseline snapshot',
        why:
          msg ||
          'The current output differs from a previously approved baseline, indicating a regression.',
        fix: "Compare the current output against the snapshot to identify the change. If the new output is correct and expected (intentional improvement), update the snapshot. If it's a regression, revert the prompt or model change that caused it.",
        impact: 'quality',
      }
    }

    // ---- Performance assertions ----
    case 'tokens_lt':
    case 'tokens_below': {
      const threshold = extractParam(expected, 'threshold', 'count', 'maxTokens')
      return {
        what: `Token usage exceeds the limit${threshold ? ` of ${threshold} tokens` : ''}`,
        why:
          msg ||
          'The agent used more tokens than allowed, which may indicate verbosity or inefficiency.',
        fix: 'Add token budget instructions to your system prompt (e.g., "Keep responses concise, under N words"). Consider reducing the context window or limiting the number of tool calls.',
        impact: 'performance',
      }
    }
    case 'tokens_gt':
    case 'tokens_above': {
      return {
        what: 'Token usage is below the expected minimum',
        why:
          msg ||
          'The agent used fewer tokens than expected, which may indicate an incomplete or truncated response.',
        fix: 'Check that the agent completes its full reasoning chain. The response may be getting cut off early — verify max_tokens settings and ensure the agent has enough room to produce complete answers.',
        impact: 'performance',
      }
    }
    case 'tokens_between': {
      return {
        what: 'Token usage is outside the acceptable range',
        why:
          msg || 'The agent used either too few or too many tokens compared to the expected range.',
        fix: 'Tune the verbosity of your system prompt. If the agent is too concise, add instructions to elaborate. If too verbose, add conciseness constraints.',
        impact: 'performance',
      }
    }
    case 'latency_lt':
    case 'latency_below': {
      const threshold = extractParam(expected, 'threshold', 'ms', 'maxMs')
      return {
        what: `Response time exceeds the threshold${threshold ? ` of ${threshold}ms` : ''}`,
        why:
          msg ||
          'The agent took too long to respond, which may indicate excessive tool calls, large context, or slow model inference.',
        fix: 'Reduce the number of tool calls by consolidating queries. Consider using a faster model. Add a timeout to prevent hanging on slow operations.',
        impact: 'performance',
      }
    }
    case 'latency_gt':
    case 'latency_above': {
      return {
        what: 'Response time is faster than expected',
        why:
          msg ||
          'The agent responded unusually quickly, which may indicate it skipped reasoning steps or returned a cached/stub response.',
        fix: 'Verify the agent is actually performing the required reasoning and not returning canned responses. Check for early termination or missing tool calls.',
        impact: 'performance',
      }
    }
    case 'first_token_lt': {
      return {
        what: 'Time to first token (TTFT) exceeds the threshold',
        why:
          msg ||
          'The model took too long to start generating output, which may indicate a large system prompt, slow model, or provider latency.',
        fix: 'Reduce the system prompt size. Consider using a faster model or provider. Implement streaming to improve perceived performance.',
        impact: 'performance',
      }
    }
    case 'cost_lt': {
      return {
        what: 'Run cost exceeds the budget threshold',
        why: msg || 'The execution cost was higher than expected.',
        fix: 'Switch to a cheaper model, reduce context window size, or limit the number of tool calls / steps.',
        impact: 'performance',
      }
    }
    case 'cost_gt': {
      return {
        what: 'Run cost is below the expected minimum',
        why:
          msg ||
          'The execution cost was lower than expected, possibly indicating premature termination.',
        fix: 'Ensure the run completed fully and did not abort early. If the low cost is intentional, adjust the threshold.',
        impact: 'performance',
      }
    }

    // ---- Score assertions ----
    case 'score_gt': {
      const dimension = extractParam(expected, 'dimension', 'evaluator')
      const dim = dimension || 'quality'
      return {
        what: `The ${dim} score is below the minimum threshold`,
        why:
          msg ||
          `The ${dim} score did not meet the required threshold. The judge found issues with the agent's output quality.`,
        fix: `Review the judge's feedback for specific areas where the ${dim} score can be improved. Adjust the system prompt to address the identified weaknesses.`,
        impact: 'quality',
      }
    }
    case 'score_lt': {
      const dimension = extractParam(expected, 'dimension', 'evaluator')
      const dim = dimension || 'quality'
      return {
        what: `The ${dim} score exceeds the maximum allowed threshold`,
        why:
          msg ||
          `The ${dim} score was higher than expected — this is unusual and may indicate an evaluation issue.`,
        fix: `Review the scoring to ensure the judge is calibrated correctly. If the high score is legitimate, adjust the threshold or remove this assertion.`,
        impact: 'quality',
      }
    }
    case 'score_between': {
      const dimension = extractParam(expected, 'dimension', 'evaluator')
      const dim = dimension || 'quality'
      return {
        what: `The ${dim} score is outside the acceptable range`,
        why:
          msg ||
          `The ${dim} score fell outside the expected range, indicating a quality deviation.`,
        fix: `Check the judge's reasoning for the score. If the score is too low, address the specific quality issues raised. If too high, verify judge calibration.`,
        impact: 'quality',
      }
    }

    // ---- Status assertions ----
    case 'completed_successfully':
    case 'status_success': {
      return {
        what: 'The agent run did not complete successfully',
        why:
          msg ||
          'The run terminated with an unexpected status — possibly an error, timeout, or crash.',
        fix: 'Check the execution trace for errors. Verify the agent has proper error handling. Ensure all required tools are available and API keys are configured correctly.',
        impact: 'behavior',
      }
    }
    case 'completed_with_error':
    case 'status_error': {
      return {
        what: 'The agent run completed with an unexpected error',
        why: msg || 'The run finished with an error status when it was expected to succeed.',
        fix: 'Check the trace for the specific error. Common causes: invalid tool arguments, model API failures, context length exceeded, or runtime exceptions in the agent logic.',
        impact: 'behavior',
      }
    }

    // ---- Status code ----
    case 'status_code': {
      const code = extractParam(expected, 'code', 'status', 'expected')
      return {
        what: `The HTTP status code${code ? ` was not ${code}` : ' was unexpected'}`,
        why: msg || 'The request returned an unexpected HTTP status code.',
        fix: 'Check the request payload and endpoint configuration. Verify authentication headers and request format.',
        impact: 'behavior',
      }
    }

    // ---- Compound (should rarely reach here, but handle gracefully) ----
    case 'all':
    case 'any':
    case 'not': {
      return {
        what: 'A compound assertion failed',
        why: msg || 'One or more sub-assertions did not pass.',
        fix: 'Expand the compound assertion to identify which specific sub-assertion failed. Each sub-assertion will have its own triage information.',
        impact: 'correctness',
      }
    }

    // ---- Unknown / fallback ----
    default: {
      return {
        what: `The "${type}" assertion failed`,
        why: msg || 'An assertion condition was not met during this run.',
        fix: 'Review the assertion configuration and the agent trace to understand what condition was violated. Check the technical details below for the full expected vs. actual comparison.',
        impact: 'quality',
      }
    }
  }
}

// ============================================================
// Helper: extract a named parameter from expected JSON
// ============================================================

function extractParam(expected: unknown, ...keys: string[]): string | undefined {
  if (expected === null || expected === undefined) return undefined
  if (typeof expected !== 'object') {
    return String(expected)
  }
  const obj = expected as Record<string, unknown>
  for (const key of keys) {
    const val = obj[key]
    if (val !== undefined && val !== null) {
      if (typeof val === 'string') return val
      if (typeof val === 'number') return String(val)
    }
  }
  return undefined
}

// ============================================================
// Impact classification
// ============================================================

const impactConfig: Record<
  TriageSection['impact'],
  { label: string; className: string; description: string }
> = {
  correctness: {
    label: 'Correctness',
    className: 'bg-red-500/10 text-red-400 border-red-500/20',
    description:
      'This failure affects the functional correctness of the agent. Other scenarios that depend on this tool call or output may also be impacted.',
  },
  quality: {
    label: 'Output Quality',
    className: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
    description:
      'This failure indicates the output quality is below expectations. It may affect user experience or downstream processing but does not necessarily indicate broken functionality.',
  },
  performance: {
    label: 'Performance',
    className: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
    description:
      'This failure is performance-related (tokens, latency, cost). It does not affect correctness but may indicate inefficiency or cost overruns.',
  },
  behavior: {
    label: 'Behavior',
    className: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
    description:
      'This failure indicates unexpected runtime behavior. The agent may have crashed, timed out, or produced an unexpected status.',
  },
}

// ============================================================
// Component
// ============================================================

export function FailureGuidance({ failedAssertions, className }: FailureGuidanceProps) {
  const [showTechnicalDetails, setShowTechnicalDetails] = useState(false)
  const [expandedTriage, setExpandedTriage] = useState<Record<string, boolean>>(() => {
    // Expand the first failure by default
    const initial: Record<string, boolean> = {}
    if (failedAssertions.length > 0) {
      initial[failedAssertions[0].id] = true
    }
    return initial
  })

  const triages = useMemo(
    () => failedAssertions.map((a) => ({ assertion: a, triage: getTriage(a) })),
    [failedAssertions]
  )

  const failedCount = failedAssertions.filter((a) => a.status === 'FAILED').length
  const errorCount = failedAssertions.filter((a) => a.status === 'ERROR').length

  const toggleExpand = (id: string) => {
    setExpandedTriage((prev) => ({ ...prev, [id]: !prev[id] }))
  }

  if (failedAssertions.length === 0) return null

  return (
    <div className={cn('space-y-6', className)}>
      {/* ---- Summary Banner ---- */}
      <div className="rounded-xl border border-red-500/20 bg-red-500/5 overflow-hidden">
        <div className="p-5">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-red-500/10">
              <AlertTriangle className="h-5 w-5 text-red-400" />
            </div>
            <div className="min-w-0 flex-1">
              <h2 className="text-base font-semibold text-foreground">
                {failedCount > 0 && errorCount > 0
                  ? `${failedCount} assertion failure${failedCount !== 1 ? 's' : ''} and ${errorCount} error${errorCount !== 1 ? 's' : ''}`
                  : failedCount > 0
                    ? `${failedCount} assertion failure${failedCount !== 1 ? 's' : ''}`
                    : `${errorCount} evaluation error${errorCount !== 1 ? 's' : ''}`}
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Review the triage below to understand what went wrong and how to fix it.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* ---- Triage Cards ---- */}
      <div className="space-y-3">
        {triages.map(({ assertion, triage }) => {
          const isExpanded = expandedTriage[assertion.id] ?? false
          const impact = impactConfig[triage.impact]

          return (
            <div
              key={assertion.id}
              className="rounded-xl border border-border bg-card overflow-hidden transition-colors"
            >
              {/* Header — always visible */}
              <button
                type="button"
                onClick={() => toggleExpand(assertion.id)}
                className="w-full flex items-center gap-3 p-4 text-left hover:bg-muted/30 transition-colors"
              >
                {/* Status icon */}
                {assertion.status === 'FAILED' ? (
                  <XCircle className="h-5 w-5 text-red-400 shrink-0" />
                ) : assertion.status === 'ERROR' ? (
                  <AlertCircle className="h-5 w-5 text-amber-400 shrink-0" />
                ) : (
                  <SkipForward className="h-5 w-5 text-muted-foreground shrink-0" />
                )}

                {/* Type badge + summary */}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <code className="text-xs font-mono bg-muted rounded px-1.5 py-0.5">
                      {assertion.type}
                    </code>
                    <span
                      className={cn(
                        'inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium',
                        assertion.status === 'FAILED'
                          ? 'bg-red-500/10 text-red-400 border-red-500/20'
                          : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                      )}
                    >
                      {assertion.status === 'FAILED' ? 'Failed' : 'Error'}
                    </span>
                    <span
                      className={cn(
                        'inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium',
                        impact.className
                      )}
                    >
                      {impact.label}
                    </span>
                  </div>
                  <p className="text-sm text-foreground mt-1.5 line-clamp-1">{triage.what}</p>
                </div>

                {/* Expand chevron */}
                {isExpanded ? (
                  <ChevronUp className="h-4 w-4 text-muted-foreground shrink-0" />
                ) : (
                  <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
                )}
              </button>

              {/* Expanded triage details */}
              {isExpanded && (
                <div className="border-t border-border px-4 py-4 space-y-4 bg-muted/20">
                  {/* Why it failed */}
                  <div className="flex gap-3">
                    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-red-500/10">
                      <Search className="h-3.5 w-3.5 text-red-400" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">
                        Why it failed
                      </h4>
                      <p className="text-sm text-foreground">{triage.why}</p>
                      {assertion.message && (
                        <div className="mt-2 rounded-md border border-border bg-background px-3 py-2">
                          <p className="font-mono text-xs text-muted-foreground break-words">
                            {assertion.message}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* How to fix */}
                  <div className="flex gap-3">
                    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-blue-500/10">
                      <Wrench className="h-3.5 w-3.5 text-blue-400" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">
                        How to fix
                      </h4>
                      <p className="text-sm text-foreground">{triage.fix}</p>
                    </div>
                  </div>

                  {/* Impact */}
                  <div className="flex gap-3">
                    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-purple-500/10">
                      <Link2 className="h-3.5 w-3.5 text-purple-400" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">
                        Impact
                      </h4>
                      <p className="text-sm text-foreground">{impact.description}</p>
                    </div>
                  </div>

                  {/* Expected vs Actual summary */}
                  {(assertion.expected !== undefined || assertion.actual !== undefined) && (
                    <div className="flex gap-3">
                      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-muted">
                        <Gauge className="h-3.5 w-3.5 text-muted-foreground" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                          Expected vs Actual
                        </h4>
                        <div className="grid gap-2 sm:grid-cols-2">
                          <div className="rounded-md border border-border bg-background px-3 py-2">
                            <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">
                              Expected
                            </span>
                            <pre className="mt-1 text-xs font-mono text-muted-foreground whitespace-pre-wrap break-all max-h-32 overflow-y-auto">
                              {assertion.expected !== undefined && assertion.expected !== null
                                ? typeof assertion.expected === 'string'
                                  ? assertion.expected
                                  : JSON.stringify(assertion.expected, null, 2)
                                : '—'}
                            </pre>
                          </div>
                          <div className="rounded-md border border-border bg-background px-3 py-2">
                            <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">
                              Actual
                            </span>
                            <pre className="mt-1 text-xs font-mono text-muted-foreground whitespace-pre-wrap break-all max-h-32 overflow-y-auto">
                              {assertion.actual !== undefined && assertion.actual !== null
                                ? typeof assertion.actual === 'string'
                                  ? assertion.actual
                                  : JSON.stringify(assertion.actual, null, 2)
                                : '—'}
                            </pre>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* ---- Technical Details (Collapsible) ---- */}
      <div className="rounded-xl border border-border overflow-hidden">
        <button
          type="button"
          onClick={() => setShowTechnicalDetails((prev) => !prev)}
          className="w-full flex items-center gap-2 px-4 py-3 text-left hover:bg-muted/30 transition-colors"
        >
          <FileText className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium">Technical Details</span>
          <span className="text-xs text-muted-foreground">
            ({failedAssertions.length} assertion{failedAssertions.length !== 1 ? 's' : ''})
          </span>
          <div className="flex-1" />
          {showTechnicalDetails ? (
            <ChevronUp className="h-4 w-4 text-muted-foreground" />
          ) : (
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          )}
        </button>

        {showTechnicalDetails && (
          <div className="border-t border-border px-4 py-4 space-y-3 bg-muted/20">
            <p className="text-xs text-muted-foreground">
              Raw assertion results for debugging. Each entry shows the assertion type, status,
              expected value, actual value, and the evaluation message.
            </p>
            <div className="space-y-2">
              {failedAssertions.map((result) => (
                <AssertionResultCard
                  key={result.id}
                  type={result.type}
                  status={result.status}
                  expected={result.expected}
                  actual={result.actual}
                  message={result.message}
                />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
