# Research Agent Example

A complete example of testing a multi-step AI research agent using AgentBench.

## What This Example Demonstrates

- **Multi-step agent workflow** -- the agent follows a structured research process: search -> fetch -> summarize -> cite
- **Tool chaining** -- each step depends on the output of previous steps, testing complex agent orchestration
- **Faithfulness testing** -- verifies the agent reports facts from sources rather than hallucinating
- **Source verification** -- tests that the agent cross-references claims across multiple sources
- **Citation quality** -- verifies proper attribution with URLs and source references

## Test Suites

| Suite | Description |
|-------|-------------|
| `research-quality.test.ts` | Agent searches before answering, cites sources, produces substantial output |
| `source-verification.test.ts` | Agent cross-references multiple sources, fetches pages, uses attribution language |

## Quick Start

```bash
# 1. Install dependencies
pnpm install

# 2. Set your OpenAI API key
export OPENAI_API_KEY=sk-...

# 3. Run tests
pnpm test
```

## Expected Output

```
Running: Research Quality ... ✓ 4/4 passed (4321ms)
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

## How the Research Workflow Works

```
User Query
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

## Key Assertions Explained

| Assertion | Why It Matters |
|-----------|---------------|
| `tool('web_search').toBeCalled()` | Ensures agent searches instead of hallucinating from training data |
| `tool('web_search').toBeCalledTimes({ min: 2 })` | Verifies cross-referencing across multiple queries/sources |
| `output().toContain('http')` | Confirms actual URL citations in the output |
| `output().toMatchRegex(/according to\|source\|reference/i)` | Checks for proper attribution language |
| `score('faithfulness').toBeGreaterThan(7)` | Validates the output stays true to retrieved sources |

## Customizing for Your Own Research Agent

1. **Replace mock search index** -- swap `mockSearchIndex` and `mockPageContent` in `agent.ts` with real API calls to Google/Bing/Tavily search and web scraping
2. **Add more tools** -- e.g., `fact_check` for claim verification, `extract_entities` for named entity recognition
3. **Adjust the system prompt** -- customize the research methodology and output format
4. **Add domain-specific tests** -- test against your specific research domains (legal, medical, financial)
