# Customer Support Agent Example

A complete, runnable example of testing a customer support AI agent using AgentBench.

## What This Example Demonstrates

- **Realistic agent implementation** -- a GPT-4o customer support agent for Acme Corp (a fictional SaaS company) with three tools: `search_knowledge_base`, `escalate_to_human`, and `check_order_status`.
- **Tool-using agent with tracing** -- uses `@agentbench/openai`'s `runWithOpenAI()` for automatic trace capture, token counting, and cost calculation.
- **Comprehensive test suites** -- 4 test suites covering greetings, policy accuracy, escalation, and multi-turn conversations.
- **Chained assertion DSL** -- uses `expect()` from `@agentbench/core` for expressive, readable assertions.
- **Mock knowledge base** -- realistic mock data (not "foo bar") so tests produce meaningful results.

## Test Suites

| Suite | Description |
|-------|-------------|
| `greeting.test.ts` | Agent responds to "Hello" with a friendly, professional greeting |
| `refund-policy.test.ts` | Agent looks up and accurately explains the 30-day refund policy |
| `escalation.test.ts` | Agent escalates sensitive/complex requests to a human |
| `multi-turn.test.ts` | Agent maintains context across 3 conversation turns |

## Quick Start

```bash
# 1. Install dependencies
pnpm install

# 2. Copy and configure environment
cp .env.example .env
# Edit .env — add your OPENAI_API_KEY

# 3. Run tests
pnpm test
```

## Expected Output

```
Running: Greeting ... ✓ 3/3 passed (1245ms)
Running: Refund Policy ... ✓ 4/4 passed (1876ms)
Running: Escalation ... ✓ 3/3 passed (1543ms)
Running: Multi-Turn ... ✓ 4/4 passed (2412ms)

Summary:
  ✓ 4 passed
  Total: 4 test(s)
```

## File Structure

```
customer-support-agent/
├── package.json              # Package config with test/run scripts
├── agentbench.config.ts      # AgentBench project configuration
├── agent.ts                  # Agent implementation with tools
├── .env.example              # Environment variable template
├── README.md                 # This file
└── tests/
    ├── greeting.test.ts      # Basic greeting test
    ├── refund-policy.test.ts # Policy accuracy test
    ├── escalation.test.ts    # Escalation behavior test
    └── multi-turn.test.ts    # Multi-turn conversation test
```

## Customizing for Your Own Agent

1. **Update the system prompt** in `agentbench.config.ts` to match your brand voice and policies
2. **Replace the knowledge base** in `agent.ts` with your actual product/policy content
3. **Add or modify tools** -- update the `tools` array in `runCustomerSupportAgent()`
4. **Add test suites** -- create new files in `tests/` and reference them in `agentbench.config.ts`
5. **Change the model** -- update `model` in the config or `agent.ts`

### Example: Adding a New Tool

```typescript
// In agent.ts, add to the knowledge base and tool definitions:
const tools = [
  // ... existing tools
  {
    type: 'function' as const,
    function: {
      name: 'schedule_callback',
      description: 'Schedule a callback from a support agent',
      parameters: {
        type: 'object',
        properties: {
          phone: { type: 'string', description: 'Phone number' },
          preferredTime: { type: 'string', description: 'Preferred callback time' },
        },
        required: ['phone'],
      },
    },
  },
]
```

## Assertions Reference

| Assertion | Example |
|-----------|---------|
| `tool(name).toBeCalled()` | Verify a specific tool was invoked |
| `tool(name).not.toBeCalled()` | Verify a tool was NOT invoked |
| `output().toContain(text)` | Check output contains a substring |
| `output().toMatchRegex(pattern)` | Check output matches a regex |
| `tokens().toBeLessThan(n)` | Verify token usage is under budget |
| `latency().toBeLessThan(ms)` | Verify response time is acceptable |
| `score(dim).toBeGreaterThan(n)` | Verify LLM judge score meets threshold |
| `status().toBeCompleted()` | Verify the run completed without errors |
| `any([...])` | At least one assertion must pass |
