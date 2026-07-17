"""
AgentBench — The Regression Testing Framework for AI Agents.

Python SDK providing HTTP client, local runner, tracer, and assertion builder.
"""

__version__ = "0.5.1"

from agentbench.assertions import AssertionBuilder, expect
from agentbench.client import AgentBench
from agentbench.runner import Runner
from agentbench.tracer import Tracer
from agentbench.types import (
    AgentConfig,
    AgentProvider,
    AssertionResult,
    ExecutionTrace,
    ExperimentConfig,
    LLMRequest,
    LLMResponse,
    Message,
    RunConfig,
    RunInput,
    RunMetrics,
    RunOptions,
    RunResult,
    RunStatus,
    Score,
    SnapshotData,
    StepStatus,
    TokenUsage,
    ToolCall,
    ToolConfig,
    ToolDefinition,
    TraceError,
    TraceMetadata,
    TraceStep,
    TraceStepType,
)

__all__ = [
    "__version__",
    "AgentBench",
    "Runner",
    "Tracer",
    "AssertionBuilder",
    "expect",
    # Types
    "AgentConfig",
    "AgentProvider",
    "AssertionResult",
    "ExecutionTrace",
    "ExperimentConfig",
    "LLMRequest",
    "LLMResponse",
    "Message",
    "RunConfig",
    "RunInput",
    "RunMetrics",
    "RunOptions",
    "RunResult",
    "RunStatus",
    "Score",
    "SnapshotData",
    "StepStatus",
    "TokenUsage",
    "ToolCall",
    "ToolConfig",
    "ToolDefinition",
    "TraceError",
    "TraceMetadata",
    "TraceStep",
    "TraceStepType",
]
