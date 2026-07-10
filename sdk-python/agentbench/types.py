"""
Pydantic models for all core AgentBench types.

These models mirror the TypeScript types from @agentbench/core and provide
validation and serialization for the Python SDK.
"""

from __future__ import annotations

from datetime import datetime, timezone
from enum import Enum
from typing import Any, Dict, List, Literal, Optional, Union

from pydantic import BaseModel, Field


def _utcnow() -> datetime:
    """Return the current UTC datetime (timezone-aware)."""
    return datetime.now(tz=timezone.utc)


# ── Enums ────────────────────────────────────────────────────────────────────


class RunStatus(str, Enum):
    """Status of a run execution."""

    PENDING = "pending"
    RUNNING = "running"
    PASSED = "passed"
    FAILED = "failed"
    ERROR = "error"
    TIMEOUT = "timeout"
    CANCELLED = "cancelled"


class TraceStepType(str, Enum):
    """Type of a trace step."""

    LLM_CALL = "llm_call"
    TOOL_CALL = "tool_call"
    RESPONSE = "response"
    ERROR = "error"


class StepStatus(str, Enum):
    """Status of an individual trace step."""

    SUCCESS = "success"
    ERROR = "error"
    TIMEOUT = "timeout"


class AssertionType(str, Enum):
    """Type of assertion to perform."""

    TOOL_CALLED = "tool_called"
    TOOL_NOT_CALLED = "tool_not_called"
    TOOL_CALLED_WITH = "tool_called_with"
    TOOL_CALLED_TIMES = "tool_called_times"
    TOKENS_LT = "tokens_lt"
    TOKENS_GT = "tokens_gt"
    TOKENS_BETWEEN = "tokens_between"
    LATENCY_LT = "latency_lt"
    LATENCY_GT = "latency_gt"
    FIRST_TOKEN_LT = "first_token_lt"
    CONTAINS = "contains"
    NOT_CONTAINS = "not_contains"
    MATCHES_REGEX = "matches_regex"
    MATCHES_SCHEMA = "matches_schema"
    MATCHES_SNAPSHOT = "matches_snapshot"
    EXACT_MATCH = "exact_match"
    SCORE_GT = "score_gt"
    SCORE_LT = "score_lt"
    SCORE_BETWEEN = "score_between"
    COMPLETED_SUCCESSFULLY = "completed_successfully"
    COMPLETED_WITH_ERROR = "completed_with_error"
    ALL = "all"
    ANY = "any"
    NOT = "not"


class AssertionStatus(str, Enum):
    """Result status of an assertion."""

    PASSED = "passed"
    FAILED = "failed"
    ERROR = "error"
    SKIPPED = "skipped"


class ExperimentStatus(str, Enum):
    """Status of an experiment."""

    DRAFT = "draft"
    RUNNING = "running"
    COMPLETED = "completed"
    FAILED = "failed"
    CANCELLED = "cancelled"


class ExperimentConclusion(str, Enum):
    """Conclusion of an A/B experiment."""

    WINNER_A = "winner_a"
    WINNER_B = "winner_b"
    INCONCLUSIVE = "inconclusive"
    TIE = "tie"


class TraceErrorType(str, Enum):
    """Category of a trace error."""

    API_ERROR = "api_error"
    TIMEOUT = "timeout"
    RATE_LIMIT = "rate_limit"
    VALIDATION = "validation"
    UNKNOWN = "unknown"


class AgentProvider(str, Enum):
    """Supported LLM providers."""

    OPENAI = "openai"
    ANTHROPIC = "anthropic"
    GEMINI = "gemini"
    DEEPSEEK = "deepseek"
    OPENROUTER = "openrouter"
    CUSTOM = "custom"


# ── Trace Models ─────────────────────────────────────────────────────────────


class ToolCallFunction(BaseModel):
    """Function definition within a tool call."""

    name: str
    arguments: str


class ToolCall(BaseModel):
    """A tool call made by the agent."""

    id: str
    type: Literal["function"] = "function"
    function: ToolCallFunction


class Message(BaseModel):
    """A message in an LLM conversation."""

    role: Literal["system", "user", "assistant", "tool"]
    content: Optional[str] = None
    name: Optional[str] = None
    tool_calls: Optional[List[ToolCall]] = None
    tool_call_id: Optional[str] = None


class ToolDefinitionFunction(BaseModel):
    """Function schema within a tool definition."""

    name: str
    description: str
    parameters: Dict[str, Any] = Field(default_factory=dict)


class ToolDefinition(BaseModel):
    """A tool available to the agent."""

    type: Literal["function"] = "function"
    function: ToolDefinitionFunction


class TokenUsage(BaseModel):
    """Token usage for an LLM call."""

    prompt_tokens: int = 0
    completion_tokens: int = 0
    total_tokens: int = 0


class LLMRequest(BaseModel):
    """Request sent to an LLM provider."""

    provider: str
    model: str
    messages: List[Message] = Field(default_factory=list)
    tools: Optional[List[ToolDefinition]] = None
    temperature: float = 0.0
    max_tokens: int = 1024
    top_p: Optional[float] = None
    stop: Optional[List[str]] = None
    seed: Optional[int] = None
    metadata: Optional[Dict[str, Any]] = None


class LLMResponse(BaseModel):
    """Response received from an LLM provider."""

    content: Optional[str] = None
    tool_calls: Optional[List[ToolCall]] = None
    finish_reason: str = "stop"
    usage: TokenUsage = Field(default_factory=TokenUsage)
    model: str = ""


class ToolRequest(BaseModel):
    """A tool invocation request."""

    name: str
    arguments: Dict[str, Any] = Field(default_factory=dict)


class ToolResponse(BaseModel):
    """Result of a tool invocation."""

    result: Any = None
    error: Optional[str] = None


class TraceError(BaseModel):
    """Error that occurred during a trace step."""

    message: str
    type: TraceErrorType = TraceErrorType.UNKNOWN
    status_code: Optional[int] = None
    retryable: bool = False
    details: Optional[Dict[str, Any]] = None


class TraceMetadata(BaseModel):
    """Metadata about the execution environment."""

    agent_name: str = "unknown"
    agent_version: Optional[str] = None
    environment: Literal["development", "staging", "production", "ci"] = "development"
    os: Optional[str] = None
    runtime: Optional[str] = None
    dependencies: Optional[Dict[str, str]] = None
    tags: Optional[List[str]] = None
    custom: Optional[Dict[str, Any]] = None


class TraceStep(BaseModel):
    """A single step in an execution trace."""

    id: str
    sequence: int = 0
    type: TraceStepType

    started_at: datetime = Field(default_factory=_utcnow)
    ended_at: Optional[datetime] = None
    duration: Optional[float] = None  # milliseconds

    # LLM Call specific
    llm_provider: Optional[str] = None
    llm_model: Optional[str] = None
    llm_request: Optional[LLMRequest] = None
    llm_response: Optional[LLMResponse] = None

    # Tool Call specific
    tool_name: Optional[str] = None
    tool_request: Optional[ToolRequest] = None
    tool_response: Optional[ToolResponse] = None

    # Usage
    prompt_tokens: Optional[int] = None
    completion_tokens: Optional[int] = None
    total_tokens: Optional[int] = None
    cost: Optional[float] = None

    # Status
    status: StepStatus = StepStatus.SUCCESS
    error: Optional[TraceError] = None

    # Streaming
    is_streaming: bool = False
    stream_chunks: Optional[int] = None
    stream_latency: Optional[float] = None

    # Extra
    metadata: Optional[Dict[str, Any]] = None


class ExecutionTrace(BaseModel):
    """Complete execution trace for a run."""

    id: str
    run_id: str
    steps: List[TraceStep] = Field(default_factory=list)
    metadata: TraceMetadata = Field(default_factory=TraceMetadata)
    created_at: datetime = Field(default_factory=_utcnow)


# ── Run / Config Models ──────────────────────────────────────────────────────


class ToolConfig(BaseModel):
    """Configuration for a tool available to the agent."""

    name: str
    description: str
    parameters: Dict[str, Any] = Field(default_factory=dict)


class AgentConfig(BaseModel):
    """Configuration for the agent under test."""

    provider: AgentProvider = AgentProvider.CUSTOM
    model: str = ""
    temperature: float = 0.0
    max_tokens: int = 1024
    system_prompt: str = ""
    tools: Optional[List[ToolConfig]] = None
    api_key: Optional[str] = None
    api_base: Optional[str] = None


class RunInput(BaseModel):
    """Input for a test run."""

    messages: List[Message] = Field(default_factory=list)
    variables: Optional[Dict[str, str]] = None
    context: Optional[Dict[str, Any]] = None


class RunOptions(BaseModel):
    """Execution options for a run."""

    timeout: int = 60000  # milliseconds
    max_steps: int = 10
    retries: int = 0
    concurrency: int = 1
    seed: Optional[int] = None


class RunConfig(BaseModel):
    """Full configuration for a test run."""

    name: str
    description: Optional[str] = None
    project_id: str = "default"
    test_case_id: Optional[str] = None
    agent: AgentConfig = Field(default_factory=AgentConfig)
    input: RunInput = Field(default_factory=RunInput)
    options: RunOptions = Field(default_factory=RunOptions)
    tags: Optional[List[str]] = None
    metadata: Optional[Dict[str, Any]] = None


class Score(BaseModel):
    """An evaluation score."""

    evaluator: str
    score: float = 0.0
    max_score: float = 1.0
    reason: Optional[str] = None
    judge_model: Optional[str] = None
    duration: Optional[float] = None
    metadata: Optional[Dict[str, Any]] = None


class AssertionResult(BaseModel):
    """Result of running an assertion."""

    type: str
    status: AssertionStatus = AssertionStatus.PASSED
    expected: Optional[Any] = None
    actual: Optional[Any] = None
    message: Optional[str] = None
    duration: Optional[float] = None


class RunMetrics(BaseModel):
    """Aggregate metrics for a run."""

    total_tokens: int = 0
    prompt_tokens: int = 0
    completion_tokens: int = 0
    total_cost: float = 0.0
    total_latency: float = 0.0
    first_token_latency: Optional[float] = None
    tool_call_count: int = 0
    tool_success_count: int = 0
    tool_failure_count: int = 0
    step_count: int = 0
    llm_call_count: int = 0


class RunResult(BaseModel):
    """Full result of a test run."""

    id: str
    config: RunConfig = Field(default_factory=lambda: RunConfig(name="default"))
    status: RunStatus = RunStatus.PENDING
    trace: ExecutionTrace = Field(
        default_factory=lambda: ExecutionTrace(id="", run_id="")
    )
    metrics: RunMetrics = Field(default_factory=RunMetrics)
    scores: List[Score] = Field(default_factory=list)
    assertion_results: List[AssertionResult] = Field(default_factory=list)
    started_at: datetime = Field(default_factory=_utcnow)
    ended_at: Optional[datetime] = None
    duration: Optional[float] = None
    summary: Optional[str] = None
    error: Optional[str] = None


class Run(BaseModel):
    """Persisted Run record."""

    id: str
    project_id: str
    test_case_id: Optional[str] = None
    user_id: Optional[str] = None
    name: str
    status: RunStatus = RunStatus.PENDING
    config: Dict[str, Any] = Field(default_factory=dict)
    metrics: Optional[Dict[str, Any]] = None
    started_at: Optional[datetime] = None
    ended_at: Optional[datetime] = None
    duration: Optional[float] = None
    summary: Optional[str] = None
    error: Optional[str] = None
    tags: Optional[List[str]] = None
    metadata: Optional[Dict[str, Any]] = None
    created_at: datetime = Field(default_factory=_utcnow)


class RunSummary(BaseModel):
    """Lightweight summary of a run."""

    id: str
    name: str
    status: RunStatus
    project_id: str
    test_case_id: Optional[str] = None
    duration: Optional[float] = None
    total_tokens: Optional[int] = None
    total_cost: Optional[float] = None
    created_at: datetime = Field(default_factory=_utcnow)
    tags: Optional[List[str]] = None


# ── Experiment Models ────────────────────────────────────────────────────────


class VariantConfig(BaseModel):
    """Configuration for an experiment variant."""

    prompt: Optional[str] = None
    model: Optional[str] = None
    temperature: Optional[float] = None
    max_tokens: Optional[int] = None
    tools: Optional[List[str]] = None
    system_prompt: Optional[str] = None


class ExperimentVariant(BaseModel):
    """A single variant in an A/B experiment."""

    name: str  # "A" or "B"
    config: VariantConfig = Field(default_factory=VariantConfig)


class ExperimentMetric(BaseModel):
    """A metric tracked during an experiment."""

    name: str
    type: Literal["score", "latency", "tokens", "cost", "tool_calls", "custom"]
    evaluator: Optional[str] = None
    direction: Literal["higher_is_better", "lower_is_better"] = "higher_is_better"


class ExperimentOptions(BaseModel):
    """Execution options for an experiment."""

    runs_per_variant: int = 10
    concurrency: int = 1
    timeout: int = 60000
    seed: Optional[int] = None


class ExperimentConfig(BaseModel):
    """Full configuration for an A/B experiment."""

    name: str
    description: Optional[str] = None
    project_id: str = "default"
    variants: List[ExperimentVariant] = Field(default_factory=list)
    metrics: List[ExperimentMetric] = Field(default_factory=list)
    options: ExperimentOptions = Field(default_factory=ExperimentOptions)


class VariantResultMetric(BaseModel):
    """Statistical results for a single metric in a variant."""

    mean: float
    median: float
    std_dev: float
    p_value: Optional[float] = None
    significant: bool = False
    effect_size: Optional[float] = None


class VariantResult(BaseModel):
    """Aggregate result for an experiment variant."""

    name: str
    runs: int
    metrics: Dict[str, VariantResultMetric] = Field(default_factory=dict)


class ExperimentStatistics(BaseModel):
    """Statistical analysis of experiment results."""

    test: Literal["t_test", "bootstrap", "mann_whitney"] = "t_test"
    confidence_level: float = 0.95
    significant_difference: bool = False
    winner: Optional[str] = None
    summary: str = ""


class ExperimentResult(BaseModel):
    """Full result of an experiment."""

    id: str
    experiment_id: str
    status: ExperimentStatus = ExperimentStatus.DRAFT
    conclusion: Optional[ExperimentConclusion] = None
    variants: List[VariantResult] = Field(default_factory=list)
    statistics: ExperimentStatistics = Field(default_factory=ExperimentStatistics)
    started_at: Optional[datetime] = None
    ended_at: Optional[datetime] = None
    duration: Optional[float] = None


class ExperimentRun(BaseModel):
    """Link between an experiment and a run."""

    id: str
    experiment_id: str
    variant_id: str
    run_id: str
    created_at: datetime = Field(default_factory=_utcnow)


class Experiment(BaseModel):
    """Persisted Experiment record."""

    id: str
    project_id: str
    name: str
    description: Optional[str] = None
    status: ExperimentStatus = ExperimentStatus.DRAFT
    config: ExperimentConfig = Field(
        default_factory=lambda: ExperimentConfig(name="default")
    )
    variants: List[ExperimentVariant] = Field(default_factory=list)
    runs: List[ExperimentRun] = Field(default_factory=list)
    results: Optional[ExperimentResult] = None
    conclusion: Optional[ExperimentConclusion] = None
    started_at: Optional[datetime] = None
    ended_at: Optional[datetime] = None
    created_at: datetime = Field(default_factory=_utcnow)
    updated_at: datetime = Field(default_factory=_utcnow)


# ── Assertion Config ─────────────────────────────────────────────────────────


class AssertionConfig(BaseModel):
    """Serializable assertion configuration."""

    type: AssertionType
    params: Dict[str, Any] = Field(default_factory=dict)
    description: Optional[str] = None


# ── Snapshot ─────────────────────────────────────────────────────────────────


class SnapshotData(BaseModel):
    """A stored snapshot of a run's trace output."""

    id: str
    run_id: str
    trace_hash: str
    output: Optional[str] = None
    scores: List[Score] = Field(default_factory=list)
    created_at: datetime = Field(default_factory=_utcnow)
    tags: Optional[List[str]] = None


# ── Project / Suite ──────────────────────────────────────────────────────────


class Project(BaseModel):
    """A project grouping related tests and runs."""

    id: str
    name: str
    description: Optional[str] = None
    created_at: datetime = Field(default_factory=_utcnow)
    updated_at: datetime = Field(default_factory=_utcnow)


class TestCase(BaseModel):
    """A single test case definition."""

    id: str
    project_id: str
    name: str
    description: Optional[str] = None
    input: RunInput = Field(default_factory=RunInput)
    expected_output: Optional[str] = None
    assertions: List[AssertionConfig] = Field(default_factory=list)
    tags: Optional[List[str]] = None
    created_at: datetime = Field(default_factory=_utcnow)


class TestSuite(BaseModel):
    """A collection of related test cases."""

    id: str
    project_id: str
    name: str
    description: Optional[str] = None
    test_case_ids: List[str] = Field(default_factory=list)
    created_at: datetime = Field(default_factory=_utcnow)
