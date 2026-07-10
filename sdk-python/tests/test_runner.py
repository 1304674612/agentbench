"""Tests for the Runner class."""

import pytest
from agentbench import Runner, AgentConfig, RunConfig
from agentbench.types import RunStatus


def dummy_agent(input_data):
    """A minimal agent that simply echoes input."""
    return {"echo": input_data}


def failing_agent(input_data):
    """An agent that always raises."""
    raise RuntimeError("simulated failure")


class TestRunner:
    """Tests for agentbench.Runner."""

    def test_run_basic(self):
        """A simple agent run should produce a passed result."""
        runner = Runner()
        result = runner.run(dummy_agent, "hello")

        assert result.status == RunStatus.PASSED
        assert result.id is not None
        assert result.duration is not None
        assert result.duration >= 0

    def test_run_with_config(self):
        """Custom RunConfig should be reflected in the result."""
        runner = Runner()
        config = RunConfig(
            name="test-config",
            description="A test run",
            agent=AgentConfig(provider="openai", model="gpt-4o"),
        )
        result = runner.run(dummy_agent, {"key": "value"}, config=config)

        assert result.config.name == "test-config"
        assert result.config.agent.provider == "openai"
        assert result.config.agent.model == "gpt-4o"

    def test_run_error(self):
        """A failing agent should produce an error status."""
        runner = Runner()
        result = runner.run(failing_agent, "boom")

        assert result.status == RunStatus.ERROR
        assert result.error is not None
        assert "simulated failure" in result.error

    def test_run_batch_sequential(self):
        """Batch run with concurrency=1 processes sequentially."""
        runner = Runner()
        configs = [
            {"agent_func": dummy_agent, "input_data": f"input-{i}"}
            for i in range(3)
        ]
        results = runner.run_batch(configs, concurrency=1)

        assert len(results) == 3
        for r in results:
            assert r.status == RunStatus.PASSED

    def test_run_batch_concurrent(self):
        """Batch run with concurrency>1 processes in parallel."""
        runner = Runner()
        configs = [
            {"agent_func": dummy_agent, "input_data": f"input-{i}"}
            for i in range(5)
        ]
        results = runner.run_batch(configs, concurrency=3)

        assert len(results) == 5
        statuses = {r.status for r in results}
        assert statuses == {RunStatus.PASSED}

    def test_run_produces_trace(self):
        """A run should always produce a non-empty trace."""
        runner = Runner()
        result = runner.run(dummy_agent, "trace-test")

        assert result.trace is not None
        assert result.trace.run_id == result.id
        assert isinstance(result.trace.steps, list)

    def test_run_metrics(self):
        """Metrics should be computed from the trace."""
        runner = Runner()
        result = runner.run(dummy_agent, "metrics-test")

        assert result.metrics is not None
        assert result.metrics.total_tokens >= 0
        assert result.metrics.total_cost >= 0.0
