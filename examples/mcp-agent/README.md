# MCP Agent - AgentBench Example

**Reading time:** 5 min | **Prerequisites:** Node.js 20+, OpenAI API key

## Quick Start

```bash
cd examples/mcp-agent && cp .env.example .env && npm install && agentbench test
```

## Architecture

```
┌──────────────────────────────────────────────────────────────────┐
│                      MCP Agent                                    │
│                                                                  │
│  ┌──────────────┐     ┌──────────────────────────────────┐      │
│  │  User Query   │ --> │  Agent (GPT-4o)                 │      │
│  └──────────────┘     │  discovers tools + resources     │      │
│                       └──────────┬───────────────────────┘      │
│                                  │                               │
│                  ┌───────────────┼───────────────┐              │
│                  ▼               ▼               ▼              │
│           ┌──────────┐  ┌──────────────┐  ┌──────────────┐     │
│           │ MCP Svr 1│  │  MCP Server 2│  │  MCP Server 3│     │
│           │ (files)  │  │  (database)  │  │  (weather)   │     │
│           │          │  │              │  │              │     │
│           │ tools:   │  │ tools:       │  │ resources:   │     │
│           │ read_file│  │ query_db     │  │ forecast://  │     │
│           │ write_f  │  │ list_tables  │  │ alerts://    │     │
│           └──────────┘  └──────────────┘  └──────────────┘     │
│                                                                  │
│                  Protocol: JSON-RPC over stdio/HTTP              │
│                  Lifecycle: init -> discover -> use -> shutdown   │
└──────────────────────────────────────────────────────────────────┘
```

## What This Example Tests

| Test Suite | What It Verifies | Assertion Type |
|------------|-----------------|----------------|
| `tool-discovery.test.ts` | Agent correctly discovers all tools and resources from connected MCP servers | `tool().toBeDiscovered()`, `tool().count().toBeGreaterThan(2)` |
| `resource-access.test.ts` | Agent reads resources via resource URIs and uses them in responses | `resource().toBeAccessed()`, `output().toContain()` |
| `multi-server.test.ts` | Agent routes requests to the correct MCP server among multiple | `tool('query_db').toBeCalled()`, `tool('get_weather').not.toBeCalled()` |
| `lifecycle.test.ts` | Server initialization, tool listing, and graceful shutdown work correctly | `lifecycle('init').toBeCompleted()`, `lifecycle('shutdown').toBeCalled()` |

## Running Individual Tests

```bash
agentbench test --suite "tool-discovery"
agentbench test --grep "multi-server"
```

## Replay (Zero-Cost Testing)

```bash
agentbench test --replay
```

## Compare Mode

```bash
agentbench compare --baseline last-good-run
```

## CI Integration

This example includes `.github/workflows/agentbench.yml`.

## Expected Output

```
Running: Tool Discovery ... ✓ 3/3 passed (2340ms)
Running: Resource Access ... ✓ 4/4 passed (3100ms)
Running: Multi-Server ... ✓ 3/3 passed (2890ms)
Running: Lifecycle ... ✓ 4/4 passed (1980ms)

Summary:
  ✓ 4 passed
  Total: 4 test(s)
```

## File Structure

```
mcp-agent/
├── package.json                    # Package config
├── agentbench.config.ts            # AgentBench project configuration
├── .env.example                    # Environment variable template
├── README.md                       # This file
├── src/
│   ├── agent.ts                    # MCP client agent implementation
│   ├── servers/
│   │   ├── filesystem.ts           # File system MCP server (read/write)
│   │   ├── database.ts             # Database MCP server (query/tables)
│   │   └── weather.ts              # Weather MCP server (forecast/alerts)
│   └── client.ts                   # MCP client with multi-server connection management
├── tests/
│   ├── tool-discovery.test.ts      # Tool listing and capability discovery
│   ├── resource-access.test.ts     # Resource URI reading and usage
│   ├── multi-server.test.ts        # Cross-server routing verification
│   └── lifecycle.test.ts           # Init, discover, use, shutdown flow
└── dataset/
    └── queries.jsonl               # Queries targeting different servers/resources
```

## Key Takeaways

1. **MCP servers are independent processes.** Test tool discovery with servers in different states (running, stopped, restarting).
2. **Resource URIs follow a standard format.** Verify that `resource://` and custom scheme URIs are correctly resolved.
3. **Multi-server routing is the critical path.** The agent must select the right server when multiple can satisfy a request.
4. **Lifecycle tests catch connection leaks.** Ensure shutdown releases stdio pipes and HTTP connections.
5. **Mock MCP servers for deterministic testing.** Use in-process mock servers to avoid network flakiness in CI.
