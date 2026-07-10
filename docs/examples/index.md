# AgentBench Official Examples (v0.3.0)

14 production-quality reference implementations. Each example is a complete, runnable project with an agent implementation, a test suite, a dataset, and a CI workflow. Use them to learn AgentBench patterns or as templates for your own projects.

**Start with: [hello-agent](#hello-agent) if you are new to AgentBench.**

---

## By Difficulty

### Beginner

Examples with simple agents, no tools, and straightforward assertions.

| Example | What It Demonstrates |
|---------|---------------------|
| [Hello Agent](#hello-agent) | Minimal setup, basic assertions, replay mode, CI workflow |
| [Customer Support Agent](#customer-support-agent) | Multi-turn conversation, tool calling, knowledge base, regression testing |

### Intermediate

Examples with tools, multiple providers, RAG, and domain-specific testing.

| Example | What It Demonstrates |
|---------|---------------------|
| [RAG Agent](#rag-agent) | Retrieval quality, grounding verification, context windows, latency budgets |
| [Tool-Calling Agent](#tool-calling-agent) | 8-tool orchestration, parallel execution, schema adherence, error handling |
| [SQL Agent](#sql-agent) | Text-to-SQL, schema awareness, SQL injection safety, aggregation |
| [MCP Agent](#mcp-agent) | MCP protocol, tool server testing, multi-transport |
| [OpenAI Agent SDK](#openai-agent-sdk) | OpenAI Agents SDK native integration, guardrails, handoffs |
| [LlamaIndex Agent](#llamaindex-agent) | RAG with LlamaIndex, index-based retrieval, embedding comparison |

### Advanced

Examples with multi-agent orchestration, state graphs, complex workflows, and comprehensive safety testing.

| Example | What It Demonstrates |
|---------|---------------------|
| [Research Agent](#research-agent) | Multi-step research, web search, source verification, citation accuracy |
| [Code Review Agent](#code-review-agent) | Code analysis, security vulnerability detection, false positive testing |
| [Coding Agent](#coding-agent) | Code generation, edit-apply loop, test-driven development |
| [LangGraph Agent](#langgraph-agent) | State graphs, conditional edge routing, human-in-the-loop |
| [CrewAI Agent](#crewai-agent) | Multi-agent collaboration, role-based agents, task delegation |
| [Multi-Agent Workflow](#multi-agent-workflow) | Orchestration, handoffs, consensus, concurrency, failure recovery |

---

## All Examples

### Hello Agent

**Difficulty:** Beginner | **Framework:** Standalone (OpenAI) | **Reading time:** 5 min

The simplest possible AgentBench project. A single-turn chat agent with no tools, no multi-step reasoning, and no external dependencies beyond the OpenAI API. Use this as your template to bootstrap a new agent evaluation project.

**Key testing concepts:**
- `status().toBeCompleted()` -- Agent runs without crashing
- `output().toContain()` -- Output contains expected content
- `tokens().toBeLessThan()` -- Token budget enforcement
- `latency().toBeLessThan()` -- Response time SLA
- `toMatchSnapshot()` -- Replay testing with snapshots
- Deterministic testing at temperature=0

**Quick run:**
```bash
cd examples/hello-agent
cp .env.example .env   # Add your API key
npm install
agentbench test
```

**Link:** [examples/hello-agent/](https://github.com/1304674612/agentbench/tree/main/examples/hello-agent)

---

### Customer Support Agent

**Difficulty:** Beginner | **Framework:** LangGraph-style | **Reading time:** 5 min

A production-grade customer support AI agent. Handles greetings, refund policies, escalations, and multi-turn conversations with tool-augmented responses. Demonstrates the most common AgentBench testing patterns.

**Key testing concepts:**
- `tool().toBeCalled()` -- Verify correct tool selection
- `tool().toBeCalledWith()` -- Verify tool arguments
- `tool().not.toBeCalled()` -- Negative tool assertions
- Multi-turn session testing with `agent.session()`
- `score('faithfulness')` -- LLM judge for grounding
- Regression detection with snapshot comparisons
- Dataset-driven testing with 200 customer queries

**Quick run:**
```bash
cd examples/customer-support-agent
cp .env.example .env   # Add your API key
npm install
agentbench test
```

**Link:** [examples/customer-support-agent/](https://github.com/1304674612/agentbench/tree/main/examples/customer-support-agent)

---

### RAG Agent

**Difficulty:** Intermediate | **Framework:** Custom (Vector DB) | **Reading time:** 5 min

A production-grade Retrieval-Augmented Generation agent. Demonstrates embedding-based retrieval, document chunking, grounding verification, context window management, and latency budgeting.

**Key testing concepts:**
- Retrieval quality assertions
- Grounding / faithfulness verification
- Context window overflow handling
- Latency budget enforcement
- `score('faithfulness')` with strict thresholds
- Embedding comparison tests

**Quick run:**
```bash
cd examples/rag-agent
cp .env.example .env   # Add your API key
npm install
agentbench test
```

**Link:** [examples/rag-agent/](https://github.com/1304674612/agentbench/tree/main/examples/rag-agent)

---

### Tool-Calling Agent

**Difficulty:** Intermediate | **Framework:** Standalone (OpenAI function calling) | **Reading time:** 5 min

A production-grade agent with 8 tools: search, calculator, weather, database query, file reader, email sender, calendar, and translator. Tests correct tool selection, parallel execution, argument schema adherence, and error handling.

**Key testing concepts:**
- `tool().toBeCalled()` with multiple tools
- `tool().toBeCalledWith()` schema verification
- Parallel tool call assertions
- `tool().not.toBeCalled()` for forbidden tools
- Tool ordering verification
- Error propagation testing
- Token and cost tracking across complex tool chains

**Quick run:**
```bash
cd examples/tool-calling-agent
cp .env.example .env   # Add your API key
npm install
agentbench test
```

**Link:** [examples/tool-calling-agent/](https://github.com/1304674612/agentbench/tree/main/examples/tool-calling-agent)

---

### SQL Agent

**Difficulty:** Intermediate | **Framework:** Custom (Database) | **Reading time:** 5 min

A Text-to-SQL agent with schema awareness. Tests SELECT queries, JOINs, aggregations, schema introspection, and SQL injection safety.

**Key testing concepts:**
- Schema awareness assertions
- Query correctness verification
- SQL injection safety testing
- Aggregation accuracy
- JOIN correctness
- `tool().toBeCalledWith()` with SQL validation
- Dataset with seeded database

**Quick run:**
```bash
cd examples/sql-agent
cp .env.example .env   # Add your API key
npm install
agentbench test
```

**Link:** [examples/sql-agent/](https://github.com/1304674612/agentbench/tree/main/examples/sql-agent)

---

### MCP Agent

**Difficulty:** Intermediate | **Framework:** MCP (Model Context Protocol) | **Reading time:** 5 min

An agent using the Model Context Protocol to interact with external tool servers. Demonstrates testing of MCP-connected tools across multiple transports.

**Key testing concepts:**
- MCP tool server testing
- Multi-transport testing (stdio, SSE, WebSocket)
- Tool discovery and capability verification
- Error handling for disconnected servers
- Cross-provider replay

**Quick run:**
```bash
cd examples/mcp-agent
cp .env.example .env   # Add your API key
npm install
agentbench test
```

**Link:** [examples/mcp-agent/](https://github.com/1304674612/agentbench/tree/main/examples/mcp-agent)

---

### OpenAI Agent SDK

**Difficulty:** Intermediate | **Framework:** OpenAI Agents SDK | **Reading time:** 5 min

An agent built with the OpenAI Agents SDK, demonstrating native integration with AgentBench. Includes guardrails, handoffs between sub-agents, and tracing.

**Key testing concepts:**
- OpenAI Agents SDK native integration
- Guardrail assertion testing
- Handoff / delegation testing
- Agent-to-agent communication verification
- Trace inspection for multi-agent flows

**Quick run:**
```bash
cd examples/openai-agent-sdk
cp .env.example .env   # Add your API key
npm install
agentbench test
```

**Link:** [examples/openai-agent-sdk/](https://github.com/1304674612/agentbench/tree/main/examples/openai-agent-sdk)

---

### LlamaIndex Agent

**Difficulty:** Intermediate | **Framework:** LlamaIndex | **Reading time:** 5 min

A RAG agent built with LlamaIndex. Demonstrates testing of index-based retrieval, embedding quality comparison, and response synthesis.

**Key testing concepts:**
- LlamaIndex native integration
- Index retrieval quality testing
- Embedding model comparison
- Response synthesis assertion
- Source node attribution verification

**Quick run:**
```bash
cd examples/llamaindex-agent
cp .env.example .env   # Add your API key
npm install
agentbench test
```

**Link:** [examples/llamaindex-agent/](https://github.com/1304674612/agentbench/tree/main/examples/llamaindex-agent)

---

### Research Agent

**Difficulty:** Advanced | **Framework:** Custom (Multi-step) | **Reading time:** 5 min

A production-grade multi-step research AI agent. Demonstrates a structured research workflow: web search, page fetch, summarization, and source citation with faithfulness verification.

**Key testing concepts:**
- Multi-step workflow testing
- Source / citation verification
- `score('faithfulness')` at each step
- Hallucination detection
- Research quality evaluation
- Web search tool verification
- Summarization quality scoring

**Quick run:**
```bash
cd examples/research-agent
cp .env.example .env   # Add your API key
npm install
agentbench test
```

**Link:** [examples/research-agent/](https://github.com/1304674612/agentbench/tree/main/examples/research-agent)

---

### Code Review Agent

**Difficulty:** Advanced | **Framework:** Custom (Code Analysis) | **Reading time:** 5 min

A production-grade code review AI agent. Uses Claude to analyze code for bugs, security vulnerabilities, and best practice violations with specialized static analysis tools.

**Key testing concepts:**
- Security vulnerability detection assertions
- False positive rate testing
- Code quality assessment scoring
- Large diff handling
- Tool-based code analysis (read_file, git_diff, lint)
- `score('correctness')` for bug detection accuracy

**Quick run:**
```bash
cd examples/code-review-agent
cp .env.example .env   # Add your API key
npm install
agentbench test
```

**Link:** [examples/code-review-agent/](https://github.com/1304674612/agentbench/tree/main/examples/code-review-agent)

---

### Coding Agent

**Difficulty:** Advanced | **Framework:** Custom (Code Generation) | **Reading time:** 5 min

A code generation agent with an edit-apply loop. Demonstrates write_file, run_test, and git_commit tools. Tests code correctness by running generated code against test suites.

**Key testing concepts:**
- Generated code correctness (compile + run tests)
- Edit-apply loop testing
- Tool sequence assertions
- Regression detection across code generation runs
- Token budget for code generation tasks
- Test-driven development workflow

**Quick run:**
```bash
cd examples/coding-agent
cp .env.example .env   # Add your API key
npm install
agentbench test
```

**Link:** [examples/coding-agent/](https://github.com/1304674612/agentbench/tree/main/examples/coding-agent)

---

### LangGraph Agent

**Difficulty:** Advanced | **Framework:** LangGraph | **Reading time:** 5 min

A LangGraph-style agent with a 5-node state graph, conditional edge routing, state transition tracking, and human-in-the-loop approval workflows.

**Key testing concepts:**
- State graph node traversal testing
- Conditional edge routing assertions
- State transition verification
- Human-in-the-loop interruption testing
- Graph execution tracing
- State snapshot comparison

**Quick run:**
```bash
cd examples/langgraph-agent
cp .env.example .env   # Add your API key
npm install
agentbench test
```

**Link:** [examples/langgraph-agent/](https://github.com/1304674612/agentbench/tree/main/examples/langgraph-agent)

---

### CrewAI Agent

**Difficulty:** Advanced | **Framework:** CrewAI | **Reading time:** 5 min

A multi-agent collaboration system using CrewAI. Demonstrates role-based agents, task delegation, inter-agent communication, and collaborative output verification.

**Key testing concepts:**
- Multi-agent role assignment testing
- Task delegation assertions
- Inter-agent message passing verification
- Collaborative output scoring
- Agent handoff testing
- Crew hierarchy validation

**Quick run:**
```bash
cd examples/crewai-agent
cp .env.example .env   # Add your API key
npm install
agentbench test
```

**Link:** [examples/crewai-agent/](https://github.com/1304674612/agentbench/tree/main/examples/crewai-agent)

---

### Multi-Agent Workflow

**Difficulty:** Advanced | **Framework:** Custom Orchestrator | **Reading time:** 5 min

A complex multi-agent orchestration system with researcher, writer, reviewer, and coordinator agents. Tests orchestration correctness, handoffs, consensus building, concurrency, and failure recovery.

**Key testing concepts:**
- Orchestrator routing assertions
- Handoff protocol verification
- Consensus mechanism testing
- Concurrent agent execution testing
- Failure recovery and retry logic
- Full workflow regression detection
- Cross-agent state consistency

**Quick run:**
```bash
cd examples/multi-agent-workflow
cp .env.example .env   # Add your API key
npm install
agentbench test
```

**Link:** [examples/multi-agent-workflow/](https://github.com/1304674612/agentbench/tree/main/examples/multi-agent-workflow)

---

## Example Quality Bar

Every official example meets these standards:

- [x] Passes `agentbench test` with 100% success rate
- [x] Includes at least 3 test suites
- [x] Includes at least 8 test cases
- [x] Demonstrates at least 3 different assertion types (tool, output, score, latency, tokens)
- [x] Includes a replay test suite
- [x] Includes a CI workflow file (`.github/workflows/agentbench.yml`)
- [x] Has a README following the standard template
- [x] Is reproducible (no hardcoded secrets; uses `.env`)
- [x] Includes a dataset of at least 20 test inputs
- [x] Has expected output documented in the README

## Choosing Your First Example

| Your Situation | Start With |
|---------------|-----------|
| "I have never used AgentBench" | [Hello Agent](#hello-agent) |
| "I have a support/chat agent" | [Customer Support Agent](#customer-support-agent) |
| "My agent uses a knowledge base" | [RAG Agent](#rag-agent) |
| "My agent calls external tools" | [Tool-Calling Agent](#tool-calling-agent) |
| "I am building an agent framework" | [OpenAI Agent SDK](#openai-agent-sdk) |
| "I have multiple agents working together" | [Multi-Agent Workflow](#multi-agent-workflow) |

---

[Back to Documentation Index](../INDEX.md)
