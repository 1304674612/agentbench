# Research Agent

A production-grade multi-step research AI agent tested with AgentBench. Demonstrates a structured research workflow: web search, page fetch, summarization, and source citation with faithfulness verification.

## Quick Start

```bash
# Install dependencies
pnpm install

# Set your OpenAI API key
export OPENAI_API_KEY="sk-..."

# Run all tests
pnpm test
```

## Architecture

```
Research Query
    |
    v
[web_search] --> Find relevant articles
    |
    v
[fetch_page] --> Retrieve full content from top results
    |
    v
[summarize]  --> Extract key findings from each source
    |
    v
[cite_sources] --> Format proper citations with URLs
    |
    v
Final Answer  --> Synthesized, well-sourced response
```

## What This Tests

| Test Suite | What It Verifies | Key Assertions |
|---|---|---|
| `research-quality.test.ts` | Agent searches before answering, cites sources, produces substantial output | `tool('web_search').toBeCalled()`, `output().toContain('http')`, `score('faithfulness').toBeGreaterThan(7)` |
| `source-verification.test.ts` | Agent cross-references multiple sources, fetches pages, uses attribution language | `tool('fetch_page').toBeCalled()`, `output().toMatchRegex(/according to|source|reference/)` |

## Running

```bash
# Run all test suites
agentbench run --project research-agent

# Run specific suite
agentbench test --project research-agent --suite tests/source-verification.test.ts
```

## Replay

```bash
# Replay from a trace
agentbench replay --trace .agentbench/traces/latest.json
```

## CI Integration

```yaml
# .github/workflows/agentbench.yml
- name: Run Research Agent Tests
  run: pnpm test
  env:
    OPENAI_API_KEY: ${{ secrets.OPENAI_API_KEY }}
```

## Expected Output

```
Running: Research Quality ... ✓ 5/5 passed (4321ms)
Running: Source Verification ... ✓ 5/5 passed (5678ms)

Summary:
  ✓ 2 passed
  Total: 2 test(s)
```

## File Structure

```
research-agent/
├── package.json                  # Package config
├── agentbench.config.ts          # AgentBench project configuration
├── agent.ts                      # Multi-step agent with 4 tools
├── README.md                     # This file
└── tests/
    ├── research-quality.test.ts  # Research process quality tests
    └── source-verification.test.ts # Cross-referencing and attribution tests
```

## Key Takeaways

- **Search-before-answer is non-negotiable.** `tool('web_search').toBeCalled()` enforces the research workflow.
- **Citation verification catches hallucination.** `output().toContain('http')` confirms real URLs, not fabricated ones.
- **Faithfulness scoring fills the gap.** `score('faithfulness').toBeGreaterThan(7)` evaluates whether the answer stays true to sources.
- **Multi-step workflows need tool-ordering tests.** Verify `web_search` is called before `summarize` and `cite_sources`.
- **Mock search indexes must be realistic.** The agent's research quality depends on retrieving plausible content.
