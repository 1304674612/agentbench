"""Tests for the Tracer class."""

import uuid
import pytest
from agentbench import Tracer
from agentbench.types import (
    LLMRequest,
    LLMResponse,
    Message,
    TokenUsage,
    TraceStepType,
    StepStatus,
    TokenUsage as TU,
)


def _make_request(model="gpt-4o") -> LLMRequest:
    return LLMRequest(
        provider="openai",
        model=model,
        messages=[Message(role="user", content="Hello")],
    )


def _make_response(content="Hi!", usage=None) -> LLMResponse:
    return LLMResponse(
        content=content,
        usage=usage or TokenUsage(prompt_tokens=10, completion_tokens=5, total_tokens=15),
        model="gpt-4o",
    )


class TestTracer:
    """Tests for agentbench.Tracer."""

    def test_start_trace_initializes_state(self):
        tracer = Tracer()
        tracer.start_trace(run_id="run-abc")

        assert tracer._run_id == "run-abc"
        assert tracer.step_count == 0

    def test_trace_llm_call(self):
        tracer = Tracer()
        tracer.start_trace(run_id="run-1")

        step = tracer.trace_llm_call(
            provider="openai",
            model="gpt-4o",
            request=_make_request(),
            response=_make_response(),
            duration_ms=250.0,
        )

        assert step.type == TraceStepType.LLM_CALL
        assert step.llm_provider == "openai"
        assert step.llm_model == "gpt-4o"
        assert step.status == StepStatus.SUCCESS
        assert step.duration == 250.0
        assert step.total_tokens == 15
        assert step.cost is not None
        assert step.cost > 0
        assert tracer.step_count == 1

    def test_trace_tool_call(self):
        tracer = Tracer()
        tracer.start_trace(run_id="run-2")

        step = tracer.trace_tool_call(
            name="search",
            arguments={"query": "test"},
            result="found it",
            duration_ms=50.0,
        )

        assert step.type == TraceStepType.TOOL_CALL
        assert step.tool_name == "search"
        assert step.status == StepStatus.SUCCESS
        assert step.tool_request.arguments == {"query": "test"}
        assert step.tool_response.result == "found it"
        assert tracer.step_count == 1

    def test_trace_tool_call_error(self):
        tracer = Tracer()
        tracer.start_trace(run_id="run-3")

        step = tracer.trace_tool_call(
            name="broken_tool",
            arguments={},
            result=None,
            error="something went wrong",
        )

        assert step.status == StepStatus.ERROR
        assert step.error is not None
        assert "something went wrong" in step.error.message

    def test_trace_llm_call_error(self):
        tracer = Tracer()
        tracer.start_trace(run_id="run-4")

        step = tracer.trace_llm_call(
            provider="openai",
            model="gpt-4o",
            request=_make_request(),
            response=_make_response(),
            error=Exception("rate limit"),
        )

        assert step.status == StepStatus.ERROR
        assert step.error is not None
        assert "rate limit" in step.error.message

    def test_build_trace(self):
        tracer = Tracer()
        tracer.start_trace(run_id="run-build")

        tracer.trace_llm_call("openai", "gpt-4o", _make_request(), _make_response())
        tracer.trace_tool_call("calc", {"expr": "1+1"}, 2)
        tracer.trace_llm_call("openai", "gpt-4o", _make_request(), _make_response("result"))

        trace = tracer.build_trace()
        assert trace.run_id == "run-build"
        assert len(trace.steps) == 3
        assert trace.steps[0].sequence == 1
        assert trace.steps[1].sequence == 2
        assert trace.steps[2].sequence == 3

    def test_get_stats(self):
        tracer = Tracer()
        tracer.start_trace(run_id="run-stats")

        tracer.trace_llm_call(
            "openai", "gpt-4o",
            _make_request(),
            _make_response(usage=TokenUsage(prompt_tokens=100, completion_tokens=50, total_tokens=150)),
        )
        tracer.trace_tool_call("search", {"q": "x"}, "result")

        stats = tracer.get_stats()
        assert stats.total_tokens == 150
        assert stats.llm_call_count == 1
        assert stats.tool_call_count == 1
        assert stats.tool_success_count == 1
        assert stats.tool_failure_count == 0
        assert stats.step_count == 2

    def test_reset(self):
        tracer = Tracer()
        tracer.start_trace(run_id="run-reset")
        tracer.trace_llm_call("openai", "gpt-4o", _make_request(), _make_response())
        assert tracer.step_count == 1

        tracer.reset()
        assert tracer.step_count == 0
        assert tracer._run_id is None

    def test_disabled_tracer(self):
        tracer = Tracer(enabled=False)
        tracer.start_trace(run_id="run-disabled")

        step = tracer.trace_llm_call("openai", "gpt-4o", _make_request(), _make_response())
        assert tracer.step_count == 0
        assert step.total_tokens is None  # defaults

    def test_cost_estimation_openai(self):
        tracer = Tracer()
        cost = tracer._estimate_cost("openai", "gpt-4o", TokenUsage(prompt_tokens=1000, completion_tokens=1000, total_tokens=2000))
        # 1000 prompt * 0.0025/1k + 1000 completion * 0.01/1k = 0.0025 + 0.01 = 0.0125
        assert cost == pytest.approx(0.0125)

    def test_cost_estimation_anthropic(self):
        tracer = Tracer()
        cost = tracer._estimate_cost("anthropic", "claude-sonnet-4-20250514", TokenUsage(prompt_tokens=1000000, completion_tokens=1000000, total_tokens=2000000))
        # 1M prompt * 0.003/1k + 1M completion * 0.015/1k = 3 + 15 = 18
        assert cost == pytest.approx(18.0)

    def test_cost_estimation_unknown_provider(self):
        tracer = Tracer()
        cost = tracer._estimate_cost("unknown", "some-model", TokenUsage(prompt_tokens=1000, completion_tokens=1000, total_tokens=2000))
        assert cost == 0.0
