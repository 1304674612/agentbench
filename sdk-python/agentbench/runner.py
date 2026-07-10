"""
Local agent runner — execute agent functions and capture traces.

No AgentBench server is required. The Runner executes an agent function
locally, captures the trace via the Tracer, and produces a RunResult.
"""

from __future__ import annotations

import asyncio
import time
import uuid
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, timezone
from typing import Any, Callable, Dict, List, Optional

from agentbench.tracer import Tracer
from agentbench.types import (
    AgentConfig,
    AgentProvider,
    ExecutionTrace,
    Message,
    RunConfig,
    RunInput,
    RunMetrics,
    RunOptions,
    RunResult,
    RunStatus,
    Score,
    TraceMetadata,
)


class Runner:
    """
    Local agent runner for executing agent functions and capturing traces.

    Parameters
    ----------
    tracer : Tracer, optional
        A pre-configured Tracer instance. A new one is created if not provided.
    agent_config : AgentConfig, optional
        Default agent configuration applied to every run unless overridden.

    Examples
    --------
    >>> from agentbench import Runner, AgentConfig
    >>> runner = Runner()
    >>> result = runner.run(my_agent_function, {"message": "Hello"})
    >>> print(result.status)
    """

    def __init__(
        self,
        tracer: Optional[Tracer] = None,
        agent_config: Optional[AgentConfig] = None,
    ):
        self.tracer = tracer or Tracer()
        self.agent_config = agent_config or AgentConfig()

    def run(
        self,
        agent_func: Callable[[Any], Any],
        input_data: Any,
        *,
        config: Optional[RunConfig] = None,
        agent_config: Optional[AgentConfig] = None,
    ) -> RunResult:
        """
        Execute an agent function once and capture the full trace.

        Parameters
        ----------
        agent_func : callable
            The agent function to run. Receives ``input_data`` as its argument.
            For LLM-based agents, this is typically the entry point that
            orchestrates LLM calls and tool invocations.
        input_data : any
            The input passed to the agent function.
        config : RunConfig, optional
            Full run configuration. Generated from defaults if omitted.
        agent_config : AgentConfig, optional
            Agent-specific configuration (overrides ``self.agent_config``).

        Returns
        -------
        RunResult
            The complete run result including trace, metrics, and status.
        """
        effective_agent_config = agent_config or self.agent_config
        run_id = str(uuid.uuid4())
        run_config = config or RunConfig(
            name=f"run-{run_id[:8]}",
            agent=effective_agent_config,
            input=RunInput(
                messages=[Message(role="user", content=str(input_data))]
            ),
        )

        self.tracer.start_trace(
            run_id=run_id,
            metadata=TraceMetadata(
                agent_name=effective_agent_config.provider.value,
                agent_version=effective_agent_config.model or None,
            ),
        )

        started_at = datetime.now(tz=timezone.utc)
        error_msg: Optional[str] = None
        status = RunStatus.RUNNING

        try:
            _ = agent_func(input_data)
            status = RunStatus.PASSED
        except Exception as exc:
            error_msg = str(exc)
            status = RunStatus.ERROR

        ended_at = datetime.now(tz=timezone.utc)
        duration = (ended_at - started_at).total_seconds() * 1000
        trace = self.tracer.build_trace()
        metrics = self._compute_metrics(trace)

        return RunResult(
            id=run_id,
            config=run_config,
            status=status,
            trace=trace,
            metrics=metrics,
            scores=[],
            assertion_results=[],
            started_at=started_at,
            ended_at=ended_at,
            duration=duration,
            summary=f"Run completed with status: {status.value}",
            error=error_msg,
        )

    def run_batch(
        self,
        configs: List[Dict[str, Any]],
        *,
        concurrency: int = 1,
    ) -> List[RunResult]:
        """
        Run multiple agent configurations concurrently.

        Each item in ``configs`` should contain:

        - ``agent_func`` (callable) — the agent function
        - ``input_data`` (any) — input for the agent
        - ``config`` (RunConfig, optional) — run configuration
        - ``agent_config`` (AgentConfig, optional) — agent configuration

        Parameters
        ----------
        configs : list of dict
            List of run configuration dictionaries.
        concurrency : int
            Maximum number of concurrent runs (default 1).

        Returns
        -------
        list of RunResult
            Results in the same order as the input configs.
        """
        if concurrency <= 1:
            return [self.run(**cfg) for cfg in configs]

        with ThreadPoolExecutor(max_workers=concurrency) as pool:
            futures = [
                pool.submit(self.run, **cfg)
                for cfg in configs
            ]
            return [f.result() for f in futures]

    @staticmethod
    def _compute_metrics(trace: ExecutionTrace) -> RunMetrics:
        """Aggregate metrics from an execution trace."""
        metrics = RunMetrics()
        metrics.step_count = len(trace.steps)

        for step in trace.steps:
            if step.total_tokens:
                metrics.prompt_tokens += step.prompt_tokens or 0
                metrics.completion_tokens += step.completion_tokens or 0
                metrics.total_tokens += step.total_tokens
            if step.cost:
                metrics.total_cost += step.cost
            if step.duration:
                metrics.total_latency += step.duration
            if step.type.value == "llm_call":
                metrics.llm_call_count += 1
            elif step.type.value == "tool_call":
                metrics.tool_call_count += 1
                if step.status.value == "success":
                    metrics.tool_success_count += 1
                else:
                    metrics.tool_failure_count += 1

        return metrics
