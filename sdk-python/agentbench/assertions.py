"""
Chainable assertion builder for validating agent run results.

Inspired by Jest / Vitest expect-style APIs, the AssertionBuilder lets you
write expressive, chainable assertions against any :class:`RunResult`.
"""

from __future__ import annotations

import re
from dataclasses import dataclass, field
from typing import Any, Callable, Dict, List, Optional, Union

from agentbench.types import (
    AssertionResult,
    AssertionStatus,
    RunResult,
    TraceStepType,
)


def expect(run_result: RunResult) -> AssertionBuilder:
    """
    Entry point for building assertions against a run result.

    Parameters
    ----------
    run_result : RunResult
        The result of a completed agent run.

    Returns
    -------
    AssertionBuilder
        A builder object for chaining assertions.

    Examples
    --------
    >>> from agentbench import expect
    >>> results = expect(run_result)
    >>> results.status().to_be_completed()
    >>> results.output().to_contain("success")
    >>> results.tokens().to_be_less_than(5000)
    >>> all_passed = results.run()
    """
    return AssertionBuilder(run_result)


@dataclass
class AssertionBuilder:
    """
    Fluent API for asserting properties of a :class:`RunResult`.

    Assertions are not executed until :meth:`run` is called.  Each method
    registers an assertion that will be evaluated against the run result.

    Parameters
    ----------
    run_result : RunResult
        The run result to assert against.
    """

    run_result: RunResult
    _assertions: List[Callable[[], AssertionResult]] = field(default_factory=list)

    # ── Status ────────────────────────────────────────────────────────────

    def status(self) -> _StatusAssertions:
        """Assert on the run's completion status."""
        return _StatusAssertions(self)

    def output(self) -> _OutputAssertions:
        """Assert on the agent's output content."""
        return _OutputAssertions(self)

    def tokens(self) -> _TokenAssertions:
        """Assert on token usage."""
        return _TokenAssertions(self)

    def latency(self) -> _LatencyAssertions:
        """Assert on run latency."""
        return _LatencyAssertions(self)

    def tool(self, name: str) -> _ToolAssertions:
        """Assert on a specific tool's usage."""
        return _ToolAssertions(self, name)

    def score(self, dimension: str) -> _ScoreAssertions:
        """Assert on an evaluation score dimension."""
        return _ScoreAssertions(self, dimension)

    # ── Execution ─────────────────────────────────────────────────────────

    def add(self, assertion_func: Callable[[], AssertionResult]) -> None:
        """Register a custom assertion callable."""
        self._assertions.append(assertion_func)

    def run(self) -> List[AssertionResult]:
        """
        Execute all registered assertions and return results.

        Returns
        -------
        list of AssertionResult
            One result per registered assertion.
        """
        results = []
        for assertion in self._assertions:
            result = assertion()
            results.append(result)
            # Attach results to the run_result for later inspection
            self.run_result.assertion_results.append(result)
        return results

    def passed(self) -> bool:
        """Return ``True`` if **all** registered assertions passed."""
        if not self._assertions:
            return True
        results = self.run()
        return all(r.status == AssertionStatus.PASSED for r in results)

    def summary(self) -> str:
        """Return a human-readable summary of assertion results."""
        results = self.run()
        passed = sum(1 for r in results if r.status == AssertionStatus.PASSED)
        failed = sum(1 for r in results if r.status == AssertionStatus.FAILED)
        errored = sum(1 for r in results if r.status == AssertionStatus.ERROR)
        skipped = sum(1 for r in results if r.status == AssertionStatus.SKIPPED)
        lines = [
            f"Assertions: {len(results)} total, {passed} passed, "
            f"{failed} failed, {errored} error, {skipped} skipped",
        ]
        for r in results:
            if r.status != AssertionStatus.PASSED:
                lines.append(f"  [{r.status.value}] {r.type}: {r.message}")
        return "\n".join(lines)


# ── Sub-builders for specific assertion types ────────────────────────────────


class _StatusAssertions:
    """Assertions on run status."""

    def __init__(self, builder: AssertionBuilder):
        self._builder = builder

    def to_be_completed(self) -> AssertionBuilder:
        """Assert the run completed successfully (passed)."""
        def _assert() -> AssertionResult:
            status = self._builder.run_result.status.value
            passed = status == "passed"
            return AssertionResult(
                type="completed_successfully",
                status=AssertionStatus.PASSED if passed else AssertionStatus.FAILED,
                expected="passed",
                actual=status,
                message=None if passed else f"Expected status 'passed', got '{status}'",
            )

        self._builder.add(_assert)
        return self._builder

    def to_have_failed(self) -> AssertionBuilder:
        """Assert the run resulted in an error."""
        def _assert() -> AssertionResult:
            status = self._builder.run_result.status.value
            passed = status in ("failed", "error")
            return AssertionResult(
                type="completed_with_error",
                status=AssertionStatus.PASSED if passed else AssertionStatus.FAILED,
                expected="failed or error",
                actual=status,
                message=None if passed else f"Expected error, got '{status}'",
            )

        self._builder.add(_assert)
        return self._builder


class _OutputAssertions:
    """Assertions on output content."""

    def __init__(self, builder: AssertionBuilder):
        self._builder = builder

    def _get_output(self) -> str:
        """Extract concatenated output from all response/llm_call steps."""
        parts: List[str] = []
        for step in self._builder.run_result.trace.steps:
            if step.llm_response and step.llm_response.content:
                parts.append(step.llm_response.content)
        return "\n".join(parts)

    def to_contain(self, text: str) -> AssertionBuilder:
        """Assert the output contains the given substring."""
        def _assert() -> AssertionResult:
            output = self._get_output()
            passed = text in output
            return AssertionResult(
                type="contains",
                status=AssertionStatus.PASSED if passed else AssertionStatus.FAILED,
                expected=text,
                actual=output[:500],
                message=None if passed else f"Expected output to contain '{text}'",
            )

        self._builder.add(_assert)
        return self._builder

    def not_to_contain(self, text: str) -> AssertionBuilder:
        """Assert the output does **not** contain the given substring."""
        def _assert() -> AssertionResult:
            output = self._get_output()
            passed = text not in output
            return AssertionResult(
                type="not_contains",
                status=AssertionStatus.PASSED if passed else AssertionStatus.FAILED,
                expected=f"not '{text}'",
                actual=output[:500],
                message=None if passed else f"Expected output NOT to contain '{text}'",
            )

        self._builder.add(_assert)
        return self._builder

    def to_match_regex(self, pattern: str) -> AssertionBuilder:
        """Assert the output matches a regular expression."""
        def _assert() -> AssertionResult:
            output = self._get_output()
            passed = bool(re.search(pattern, output))
            return AssertionResult(
                type="matches_regex",
                status=AssertionStatus.PASSED if passed else AssertionStatus.FAILED,
                expected=pattern,
                actual=output[:500],
                message=None if passed else f"Expected output to match /{pattern}/",
            )

        self._builder.add(_assert)
        return self._builder

    def to_equal(self, expected: str) -> AssertionBuilder:
        """Assert the output equals the expected string exactly."""
        def _assert() -> AssertionResult:
            output = self._get_output()
            passed = output == expected
            return AssertionResult(
                type="exact_match",
                status=AssertionStatus.PASSED if passed else AssertionStatus.FAILED,
                expected=expected,
                actual=output[:500],
                message=None if passed else "Expected exact match",
            )

        self._builder.add(_assert)
        return self._builder


class _TokenAssertions:
    """Assertions on token usage."""

    def __init__(self, builder: AssertionBuilder):
        self._builder = builder

    def to_be_less_than(self, n: int) -> AssertionBuilder:
        """Assert total tokens are strictly less than *n*."""
        def _assert() -> AssertionResult:
            total = self._builder.run_result.metrics.total_tokens
            passed = total < n
            return AssertionResult(
                type="tokens_lt",
                status=AssertionStatus.PASSED if passed else AssertionStatus.FAILED,
                expected=f"< {n}",
                actual=str(total),
                message=None if passed else f"Expected tokens < {n}, got {total}",
            )

        self._builder.add(_assert)
        return self._builder

    def to_be_greater_than(self, n: int) -> AssertionBuilder:
        """Assert total tokens are strictly greater than *n*."""
        def _assert() -> AssertionResult:
            total = self._builder.run_result.metrics.total_tokens
            passed = total > n
            return AssertionResult(
                type="tokens_gt",
                status=AssertionStatus.PASSED if passed else AssertionStatus.FAILED,
                expected=f"> {n}",
                actual=str(total),
                message=None if passed else f"Expected tokens > {n}, got {total}",
            )

        self._builder.add(_assert)
        return self._builder

    def to_be_between(self, low: int, high: int) -> AssertionBuilder:
        """Assert total tokens are in [*low*, *high*]."""
        def _assert() -> AssertionResult:
            total = self._builder.run_result.metrics.total_tokens
            passed = low <= total <= high
            return AssertionResult(
                type="tokens_between",
                status=AssertionStatus.PASSED if passed else AssertionStatus.FAILED,
                expected=f"between {low} and {high}",
                actual=str(total),
                message=None if passed else f"Expected tokens in [{low}, {high}], got {total}",
            )

        self._builder.add(_assert)
        return self._builder


class _LatencyAssertions:
    """Assertions on run latency."""

    def __init__(self, builder: AssertionBuilder):
        self._builder = builder

    def to_be_less_than(self, ms: float) -> AssertionBuilder:
        """Assert total latency is less than *ms* milliseconds."""
        def _assert() -> AssertionResult:
            latency = self._builder.run_result.duration or 0
            passed = latency < ms
            return AssertionResult(
                type="latency_lt",
                status=AssertionStatus.PASSED if passed else AssertionStatus.FAILED,
                expected=f"< {ms}ms",
                actual=f"{latency:.1f}ms",
                message=None if passed else f"Expected latency < {ms}ms, got {latency:.1f}ms",
            )

        self._builder.add(_assert)
        return self._builder

    def to_be_greater_than(self, ms: float) -> AssertionBuilder:
        """Assert total latency is greater than *ms* milliseconds."""
        def _assert() -> AssertionResult:
            latency = self._builder.run_result.duration or 0
            passed = latency > ms
            return AssertionResult(
                type="latency_gt",
                status=AssertionStatus.PASSED if passed else AssertionStatus.FAILED,
                expected=f"> {ms}ms",
                actual=f"{latency:.1f}ms",
                message=None if passed else f"Expected latency > {ms}ms, got {latency:.1f}ms",
            )

        self._builder.add(_assert)
        return self._builder


class _ToolAssertions:
    """Assertions on tool usage."""

    def __init__(self, builder: AssertionBuilder, name: str):
        self._builder = builder
        self._name = name

    def to_be_called(self) -> AssertionBuilder:
        """Assert the named tool was called at least once."""
        def _assert() -> AssertionResult:
            called = any(
                step.tool_name == self._name
                for step in self._builder.run_result.trace.steps
                if step.type == TraceStepType.TOOL_CALL
            )
            return AssertionResult(
                type="tool_called",
                status=AssertionStatus.PASSED if called else AssertionStatus.FAILED,
                expected=self._name,
                actual="called" if called else "not called",
                message=None if called else f"Expected tool '{self._name}' to be called",
            )

        self._builder.add(_assert)
        return self._builder

    def to_be_called_times(self, count: int) -> AssertionBuilder:
        """Assert the named tool was called exactly *count* times."""
        def _assert() -> AssertionResult:
            actual = sum(
                1 for step in self._builder.run_result.trace.steps
                if step.type == TraceStepType.TOOL_CALL and step.tool_name == self._name
            )
            passed = actual == count
            return AssertionResult(
                type="tool_called_times",
                status=AssertionStatus.PASSED if passed else AssertionStatus.FAILED,
                expected=str(count),
                actual=str(actual),
                message=None if passed else f"Expected '{self._name}' called {count} times, got {actual}",
            )

        self._builder.add(_assert)
        return self._builder

    def not_to_be_called(self) -> AssertionBuilder:
        """Assert the named tool was **not** called."""
        def _assert() -> AssertionResult:
            called = any(
                step.tool_name == self._name
                for step in self._builder.run_result.trace.steps
                if step.type == TraceStepType.TOOL_CALL
            )
            return AssertionResult(
                type="tool_not_called",
                status=AssertionStatus.PASSED if not called else AssertionStatus.FAILED,
                expected=f"not '{self._name}'",
                actual="called" if called else "not called",
                message=None if not called else f"Expected tool '{self._name}' NOT to be called",
            )

        self._builder.add(_assert)
        return self._builder


class _ScoreAssertions:
    """Assertions on evaluation scores."""

    def __init__(self, builder: AssertionBuilder, dimension: str):
        self._builder = builder
        self._dimension = dimension

    def _get_score(self) -> Optional[float]:
        for s in self._builder.run_result.scores:
            if s.evaluator == self._dimension:
                return s.score
        return None

    def to_be_greater_than(self, threshold: float) -> AssertionBuilder:
        """Assert the score is greater than *threshold*."""
        def _assert() -> AssertionResult:
            score = self._get_score()
            if score is None:
                return AssertionResult(
                    type="score_gt",
                    status=AssertionStatus.ERROR,
                    expected=f"score '{self._dimension}' > {threshold}",
                    actual="missing",
                    message=f"No score found for dimension '{self._dimension}'",
                )
            passed = score > threshold
            return AssertionResult(
                type="score_gt",
                status=AssertionStatus.PASSED if passed else AssertionStatus.FAILED,
                expected=f"> {threshold}",
                actual=str(score),
                message=None if passed else f"Expected {self._dimension} > {threshold}, got {score}",
            )

        self._builder.add(_assert)
        return self._builder

    def to_be_less_than(self, threshold: float) -> AssertionBuilder:
        """Assert the score is less than *threshold*."""
        def _assert() -> AssertionResult:
            score = self._get_score()
            if score is None:
                return AssertionResult(
                    type="score_lt",
                    status=AssertionStatus.ERROR,
                    expected=f"score '{self._dimension}' < {threshold}",
                    actual="missing",
                    message=f"No score found for dimension '{self._dimension}'",
                )
            passed = score < threshold
            return AssertionResult(
                type="score_lt",
                status=AssertionStatus.PASSED if passed else AssertionStatus.FAILED,
                expected=f"< {threshold}",
                actual=str(score),
                message=None if passed else f"Expected {self._dimension} < {threshold}, got {score}",
            )

        self._builder.add(_assert)
        return self._builder
