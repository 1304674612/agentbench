"""
Execution tracer — intercepts and records LLM calls, tool calls, and
produces a complete trace with aggregate statistics.

Used by the local Runner; does not require a server.
"""

from __future__ import annotations

import time
import uuid
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional, Tuple

from agentbench.types import (
    ExecutionTrace,
    LLMRequest,
    LLMResponse,
    RunMetrics,
    StepStatus,
    TokenUsage,
    ToolRequest,
    ToolResponse,
    TraceError,
    TraceErrorType,
    TraceMetadata,
    TraceStep,
    TraceStepType,
)


class Tracer:
    """
    Intercept and trace LLM calls and tool invocations.

    The Tracer is the core observability primitive. It records every LLM call
    and tool invocation during an agent run, then produces a structured
    :class:`ExecutionTrace` with aggregate statistics.

    Parameters
    ----------
    enabled : bool
        Whether tracing is active (default ``True``).

    Examples
    --------
    >>> tracer = Tracer()
    >>> tracer.start_trace(run_id="run-123")
    >>> tracer.trace_llm_call("openai", "gpt-4o", request, response)
    >>> tracer.trace_tool_call("search", {"query": "..."}, result)
    >>> trace = tracer.build_trace()
    >>> stats = tracer.get_stats()
    """

    def __init__(self, enabled: bool = True):
        self.enabled = enabled
        self._steps: List[TraceStep] = []
        self._run_id: Optional[str] = None
        self._metadata: Optional[TraceMetadata] = None
        self._trace_started_at: Optional[datetime] = None
        self._sequence = 0

    # ── Lifecycle ─────────────────────────────────────────────────────────

    def start_trace(
        self,
        run_id: str,
        metadata: Optional[TraceMetadata] = None,
    ) -> None:
        """
        Begin a new trace.

        Parameters
        ----------
        run_id : str
            Identifier of the run this trace belongs to.
        metadata : TraceMetadata, optional
            Execution environment metadata.
        """
        self._run_id = run_id
        self._metadata = metadata or TraceMetadata()
        self._trace_started_at = datetime.now(tz=timezone.utc)
        self._steps = []
        self._sequence = 0

    def reset(self) -> None:
        """Reset the tracer, clearing all recorded steps."""
        self._steps = []
        self._run_id = None
        self._metadata = None
        self._trace_started_at = None
        self._sequence = 0

    # ── Recording ─────────────────────────────────────────────────────────

    def trace_llm_call(
        self,
        provider: str,
        model: str,
        request: LLMRequest,
        response: LLMResponse,
        *,
        duration_ms: Optional[float] = None,
        error: Optional[Exception] = None,
        is_streaming: bool = False,
        stream_chunks: Optional[int] = None,
        stream_latency: Optional[float] = None,
    ) -> TraceStep:
        """
        Record an LLM call step.

        Parameters
        ----------
        provider : str
            LLM provider name (e.g., ``"openai"``, ``"anthropic"``).
        model : str
            Model identifier (e.g., ``"gpt-4o"``, ``"claude-sonnet-4-20250514"``).
        request : LLMRequest
            The request payload.
        response : LLMResponse
            The response payload.
        duration_ms : float, optional
            Call duration in milliseconds.
        error : Exception, optional
            If the call resulted in an error.
        is_streaming : bool
            Whether the call used streaming.
        stream_chunks : int, optional
            Number of stream chunks received.
        stream_latency : float, optional
            Time-to-first-token in milliseconds.

        Returns
        -------
        TraceStep
            The recorded trace step.
        """
        if not self.enabled:
            return self._make_empty_step(TraceStepType.LLM_CALL)  # type: ignore[return-value]

        self._sequence += 1
        now = datetime.now(tz=timezone.utc)
        step = TraceStep(
            id=self._make_step_id(),
            sequence=self._sequence,
            type=TraceStepType.LLM_CALL,
            started_at=now,
            ended_at=now,
            duration=duration_ms or 0.0,
            llm_provider=provider,
            llm_model=model,
            llm_request=request,
            llm_response=response,
            prompt_tokens=response.usage.prompt_tokens,
            completion_tokens=response.usage.completion_tokens,
            total_tokens=response.usage.total_tokens,
            cost=self._estimate_cost(provider, model, response.usage),
            status=StepStatus.ERROR if error else StepStatus.SUCCESS,
            error=self._make_trace_error(error) if error else None,
            is_streaming=is_streaming,
            stream_chunks=stream_chunks,
            stream_latency=stream_latency,
        )
        self._steps.append(step)
        return step

    def trace_tool_call(
        self,
        name: str,
        arguments: Dict[str, Any],
        result: Any,
        *,
        duration_ms: Optional[float] = None,
        error: Optional[str] = None,
    ) -> TraceStep:
        """
        Record a tool invocation step.

        Parameters
        ----------
        name : str
            Tool name.
        arguments : dict
            Arguments passed to the tool.
        result : any
            Result returned by the tool.
        duration_ms : float, optional
            Call duration in milliseconds.
        error : str, optional
            Error message if the tool call failed.

        Returns
        -------
        TraceStep
            The recorded trace step.
        """
        if not self.enabled:
            return self._make_empty_step(TraceStepType.TOOL_CALL)  # type: ignore[return-value]

        self._sequence += 1
        now = datetime.now(tz=timezone.utc)
        step = TraceStep(
            id=self._make_step_id(),
            sequence=self._sequence,
            type=TraceStepType.TOOL_CALL,
            started_at=now,
            ended_at=now,
            duration=duration_ms or 0.0,
            tool_name=name,
            tool_request=ToolRequest(name=name, arguments=arguments),
            tool_response=ToolResponse(result=result, error=error),
            status=StepStatus.ERROR if error else StepStatus.SUCCESS,
            error=TraceError(
                message=error or "Unknown tool error",
                type=TraceErrorType.UNKNOWN,
            )
            if error
            else None,
        )
        self._steps.append(step)
        return step

    # ── Build / Query ─────────────────────────────────────────────────────

    def build_trace(self) -> ExecutionTrace:
        """
        Produce the complete :class:`ExecutionTrace` from recorded steps.

        Returns
        -------
        ExecutionTrace
            The full trace with all steps and metadata.
        """
        return ExecutionTrace(
            id=str(uuid.uuid4()),
            run_id=self._run_id or "",
            steps=list(self._steps),
            metadata=self._metadata or TraceMetadata(),
            created_at=datetime.now(tz=timezone.utc),
        )

    def get_stats(self) -> RunMetrics:
        """
        Compute aggregate metrics from the recorded trace.

        Returns
        -------
        RunMetrics
            Aggregated token counts, cost, latency, tool counts.
        """
        metrics = RunMetrics()
        metrics.step_count = len(self._steps)

        for step in self._steps:
            if step.total_tokens:
                metrics.prompt_tokens += step.prompt_tokens or 0
                metrics.completion_tokens += step.completion_tokens or 0
                metrics.total_tokens += step.total_tokens
            if step.cost:
                metrics.total_cost += step.cost
            if step.duration:
                metrics.total_latency += step.duration

            if step.type == TraceStepType.LLM_CALL:
                metrics.llm_call_count += 1
            elif step.type == TraceStepType.TOOL_CALL:
                metrics.tool_call_count += 1
                if step.status == StepStatus.SUCCESS:
                    metrics.tool_success_count += 1
                else:
                    metrics.tool_failure_count += 1

        return metrics

    def steps(self) -> List[TraceStep]:
        """Return the list of recorded steps so far."""
        return list(self._steps)

    @property
    def step_count(self) -> int:
        """Number of steps recorded."""
        return len(self._steps)

    # ── Helpers ───────────────────────────────────────────────────────────

    def _make_step_id(self) -> str:
        return f"step-{self._sequence:04d}-{uuid.uuid4().hex[:8]}"

    @staticmethod
    def _make_empty_step(step_type: TraceStepType) -> TraceStep:
        return TraceStep(
            id=str(uuid.uuid4()),
            sequence=0,
            type=step_type,
        )

    @staticmethod
    def _make_trace_error(exc: Exception) -> TraceError:
        return TraceError(
            message=str(exc),
            type=TraceErrorType.UNKNOWN,
            retryable=False,
        )

    @staticmethod
    def _estimate_cost(provider: str, model: str, usage: TokenUsage) -> float:
        """
        Estimate cost for a known provider/model.

        These are approximate rates and may not reflect current pricing.
        """
        model_lower = model.lower()
        # OpenAI approximate pricing per 1K tokens (input / output)
        if provider == "openai":
            if "gpt-4o" in model_lower:
                input_rate, output_rate = 0.0025, 0.01
            elif "gpt-4" in model_lower:
                input_rate, output_rate = 0.03, 0.06
            elif "gpt-3.5" in model_lower:
                input_rate, output_rate = 0.0005, 0.0015
            else:
                input_rate, output_rate = 0.0025, 0.01
        # Anthropic approximate pricing per 1M tokens (convert to per-1K)
        elif provider == "anthropic":
            if "sonnet" in model_lower:
                input_rate, output_rate = 0.003, 0.015
            elif "opus" in model_lower:
                input_rate, output_rate = 0.015, 0.075
            elif "haiku" in model_lower:
                input_rate, output_rate = 0.0008, 0.004
            else:
                input_rate, output_rate = 0.003, 0.015
        else:
            return 0.0

        prompt_cost = (usage.prompt_tokens / 1000) * input_rate
        completion_cost = (usage.completion_tokens / 1000) * output_rate
        return round(prompt_cost + completion_cost, 6)
