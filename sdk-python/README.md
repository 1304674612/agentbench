# AgentBench Python SDK

The official Python SDK for [AgentBench](https://github.com/agentbench/agentbench) — the Regression Testing Framework for AI Agents.

## Installation

```bash
pip install agentbench
```

With optional provider wrappers:

```bash
pip install "agentbench[openai]"      # OpenAI tracing support
pip install "agentbench[anthropic]"   # Anthropic tracing support
pip install "agentbench[all]"         # All extras
```

## Quick Start

```python
from agentbench import Runner, Tracer, expect, AgentConfig

# Define your agent
def my_agent(input_data):
    # Your agent logic here — call LLMs, use tools, return a result
    return {"answer": "Hello, world!"}

# Run it locally — no server needed
runner = Runner()
result = runner.run(my_agent, {"query": "What's up?"})

# Inspect the trace
print(f"Status: {result.status}")
print(f"Steps: {len(result.trace.steps)}")
print(f"Total tokens: {result.metrics.total_tokens}")

# Write assertions
expect(result).status().to_be_completed()
expect(result).tokens().to_be_less_than(10000)
expect(result).latency().to_be_less_than(30000)

# Batch runs
results = runner.run_batch([
    {"agent_func": my_agent, "input_data": {"query": "A"}},
    {"agent_func": my_agent, "input_data": {"query": "B"}},
])
```

## Talking to the Server

```python
from agentbench import AgentBench

client = AgentBench(api_key="ab_xxx")  # or set AB_API_KEY env var

# Create and run
run = client.create_run({"name": "my-run", ...})
print(run.status)

# List runs
for summary in client.list_runs():
    print(summary.name, summary.status)

# Create projects, test suites, experiments
client.create_project("my-project")
client.create_test_suite("proj_123", "Smoke tests")
```

## Automatic LLM Tracing

```python
from agentbench import Tracer
from agentbench.openai_wrapper import OpenAIWrapper
import openai

tracer = Tracer()
tracer.start_trace(run_id="my-run")
client = OpenAIWrapper(openai.OpenAI(), tracer)

# All chat completions are automatically traced
response = client.chat.completions.create(
    model="gpt-4o",
    messages=[{"role": "user", "content": "Hello"}],
)

trace = tracer.build_trace()
print(f"Recorded {tracer.step_count} steps")
```

## CLI

```bash
agentbench --version
agentbench init                    # Create agentbench.config.json
agentbench run my_module:main      # Run an agent function
agentbench test                    # Run test files
```

## API Reference

| Component | Description |
|-----------|-------------|
| `AgentBench` | HTTP client for the AgentBench server |
| `Runner` | Local agent execution and batch runner |
| `Tracer` | Intercept and record LLM/tool calls |
| `AssertionBuilder` / `expect()` | Chainable assertion API |
| `OpenAIWrapper` | Auto-trace OpenAI chat completions |
| `AnthropicWrapper` | Auto-trace Anthropic messages |

Full type definitions are in `agentbench.types`.

## License

Apache-2.0 — see the [main repository](https://github.com/agentbench/agentbench) for details.
