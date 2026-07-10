"""Tests for the AssertionBuilder and expect() entry point."""

import pytest
from agentbench import AssertionBuilder, expect, Runner, RunConfig
from agentbench.types import (
    AssertionStatus,
    RunResult,
    RunStatus,
    Score,
    ExecutionTrace,
    RunMetrics,
    TraceStep,
    TraceStepType,
    StepStatus,
    LLMResponse,
    TokenUsage,
)


def _make_result(status=RunStatus.PASSED, **kwargs) -> RunResult:
    """Build a minimal RunResult for assertion testing."""
    trace = ExecutionTrace(id="trace-1", run_id="run-1")
    metrics = RunMetrics()

    # Add trace steps if provided
    for step_data in kwargs.pop("steps", []):
        step = TraceStep(
            id=step_data.get("id", "step-1"),
            type=step_data.get("type", TraceStepType.LLM_CALL),
            status=step_data.get("status", StepStatus.SUCCESS),
            tool_name=step_data.get("tool_name"),
            duration=step_data.get("duration"),
            total_tokens=step_data.get("total_tokens"),
            llm_response=step_data.get("llm_response"),
        )
        trace.steps.append(step)

    if "metrics" in kwargs:
        metrics = kwargs.pop("metrics")

    scores = kwargs.pop("scores", [])
    duration = kwargs.pop("duration", None)

    return RunResult(
        id="run-1",
        config=RunConfig(name="test-run"),
        status=status,
        trace=trace,
        metrics=metrics,
        scores=scores,
        duration=duration,
        **kwargs,
    )


class TestExpectFunction:
    """Tests for the expect() entry point."""

    def test_expect_returns_builder(self):
        result = _make_result()
        builder = expect(result)
        assert isinstance(builder, AssertionBuilder)
        assert builder.run_result is result


class TestStatusAssertions:
    """Tests for status() assertions."""

    def test_to_be_completed_pass(self):
        result = _make_result(status=RunStatus.PASSED)
        assert expect(result).status().to_be_completed().passed()

    def test_to_be_completed_fail(self):
        result = _make_result(status=RunStatus.ERROR)
        assert not expect(result).status().to_be_completed().passed()

    def test_to_have_failed_pass(self):
        result = _make_result(status=RunStatus.FAILED)
        assert expect(result).status().to_have_failed().passed()

    def test_to_have_failed_with_error(self):
        result = _make_result(status=RunStatus.ERROR)
        assert expect(result).status().to_have_failed().passed()


class TestOutputAssertions:
    """Tests for output() assertions."""

    def test_to_contain_found(self):
        result = _make_result(steps=[
            {"id": "s1", "type": TraceStepType.LLM_CALL, "llm_response": LLMResponse(content="The answer is 42.")},
        ])
        assert expect(result).output().to_contain("42").passed()

    def test_to_contain_not_found(self):
        result = _make_result(steps=[
            {"id": "s1", "type": TraceStepType.LLM_CALL, "llm_response": LLMResponse(content="Hello world")},
        ])
        assert not expect(result).output().to_contain("missing text").passed()

    def test_not_to_contain(self):
        result = _make_result(steps=[
            {"id": "s1", "type": TraceStepType.LLM_CALL, "llm_response": LLMResponse(content="Safe content")},
        ])
        assert expect(result).output().not_to_contain("dangerous").passed()

    def test_to_match_regex(self):
        result = _make_result(steps=[
            {"id": "s1", "type": TraceStepType.LLM_CALL, "llm_response": LLMResponse(content="Price: $123.45")},
        ])
        assert expect(result).output().to_match_regex(r"\$\d+\.\d{2}").passed()
        assert not expect(result).output().to_match_regex(r"€\d+").passed()


class TestTokenAssertions:
    """Tests for tokens() assertions."""

    def test_to_be_less_than_pass(self):
        result = _make_result(metrics=RunMetrics(total_tokens=500))
        assert expect(result).tokens().to_be_less_than(1000).passed()

    def test_to_be_less_than_fail(self):
        result = _make_result(metrics=RunMetrics(total_tokens=1500))
        assert not expect(result).tokens().to_be_less_than(1000).passed()

    def test_to_be_greater_than_pass(self):
        result = _make_result(metrics=RunMetrics(total_tokens=5000))
        assert expect(result).tokens().to_be_greater_than(1000).passed()

    def test_to_be_between_pass(self):
        result = _make_result(metrics=RunMetrics(total_tokens=500))
        assert expect(result).tokens().to_be_between(100, 1000).passed()

    def test_to_be_between_fail(self):
        result = _make_result(metrics=RunMetrics(total_tokens=50))
        assert not expect(result).tokens().to_be_between(100, 1000).passed()


class TestLatencyAssertions:
    """Tests for latency() assertions."""

    def test_to_be_less_than_pass(self):
        result = _make_result(duration=100.0)
        assert expect(result).latency().to_be_less_than(500).passed()

    def test_to_be_less_than_fail(self):
        result = _make_result(duration=1000.0)
        assert not expect(result).latency().to_be_less_than(500).passed()

    def test_to_be_greater_than_pass(self):
        result = _make_result(duration=2000.0)
        assert expect(result).latency().to_be_greater_than(500).passed()


class TestToolAssertions:
    """Tests for tool() assertions."""

    def test_to_be_called_pass(self):
        result = _make_result(steps=[
            {"id": "s1", "type": TraceStepType.TOOL_CALL, "tool_name": "search"},
        ])
        assert expect(result).tool("search").to_be_called().passed()

    def test_to_be_called_fail(self):
        result = _make_result(steps=[
            {"id": "s1", "type": TraceStepType.TOOL_CALL, "tool_name": "calc"},
        ])
        assert not expect(result).tool("search").to_be_called().passed()

    def test_not_to_be_called_pass(self):
        result = _make_result(steps=[])
        assert expect(result).tool("search").not_to_be_called().passed()

    def test_to_be_called_times_pass(self):
        result = _make_result(steps=[
            {"id": "s1", "type": TraceStepType.TOOL_CALL, "tool_name": "search"},
            {"id": "s2", "type": TraceStepType.TOOL_CALL, "tool_name": "search"},
            {"id": "s3", "type": TraceStepType.TOOL_CALL, "tool_name": "calc"},
        ])
        assert expect(result).tool("search").to_be_called_times(2).passed()

    def test_to_be_called_times_fail(self):
        result = _make_result(steps=[
            {"id": "s1", "type": TraceStepType.TOOL_CALL, "tool_name": "search"},
        ])
        assert not expect(result).tool("search").to_be_called_times(3).passed()


class TestScoreAssertions:
    """Tests for score() assertions."""

    def test_to_be_greater_than_pass(self):
        result = _make_result(scores=[
            Score(evaluator="accuracy", score=0.95, max_score=1.0),
        ])
        assert expect(result).score("accuracy").to_be_greater_than(0.9).passed()

    def test_to_be_greater_than_fail(self):
        result = _make_result(scores=[
            Score(evaluator="accuracy", score=0.5, max_score=1.0),
        ])
        assert not expect(result).score("accuracy").to_be_greater_than(0.9).passed()

    def test_to_be_less_than_pass(self):
        result = _make_result(scores=[
            Score(evaluator="latency_score", score=0.2, max_score=1.0),
        ])
        assert expect(result).score("latency_score").to_be_less_than(0.5).passed()

    def test_missing_score_dimension(self):
        result = _make_result(scores=[])
        assert not expect(result).score("missing").to_be_greater_than(0.5).passed()


class TestAssertionBuilder:
    """Tests for AssertionBuilder itself."""

    def test_run_returns_results(self):
        result = _make_result(status=RunStatus.PASSED)
        builder = expect(result).status().to_be_completed()
        results = builder.run()

        assert len(results) == 1
        assert results[0].status == AssertionStatus.PASSED

    def test_summary(self):
        result = _make_result(status=RunStatus.ERROR)
        builder = expect(result).status().to_be_completed()
        summary = builder.summary()

        assert isinstance(summary, str)
        assert "failed" in summary

    def test_multiple_assertions(self):
        result = _make_result(
            status=RunStatus.PASSED,
            metrics=RunMetrics(total_tokens=500),
            steps=[
                {"id": "s1", "type": TraceStepType.TOOL_CALL, "tool_name": "search"},
            ],
        )
        builder = (
            expect(result)
            .status().to_be_completed()
            .tokens().to_be_less_than(1000)
            .tool("search").to_be_called()
        )
        assert builder.passed()

    def test_passed_with_no_assertions(self):
        result = _make_result()
        builder = expect(result)
        assert builder.passed()
