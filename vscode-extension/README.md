# AgentBench VS Code Extension

The official VS Code extension for **[AgentBench](https://agentbench.dev)** -- the Regression Testing Framework for AI Agents. Run, debug, and monitor your AI agent tests directly from VS Code.

## Quick Start

### 1. Install AgentBench CLI

```bash
npm install -g agentbench
```

Verify the installation:

```bash
agentbench --version
```

### 2. Install the VS Code Extension

Install **AgentBench** from the [VS Code Marketplace](https://marketplace.visualstudio.com/items?itemName=agentbench.agentbench-vscode), or from the Command Palette (`Ctrl+Shift+P` / `Cmd+Shift+P`):

```
Extensions: Install Extensions > Search "AgentBench"
```

### 3. Initialize Your Project

Open your project folder in VS Code, then run the **AgentBench: Initialize Project** command from the Command Palette. This creates an `agentbench.config.ts` file with sensible defaults.

Alternatively, run from the terminal:

```bash
agentbench init
```

### 4. Run Tests

- **All tests**: `Ctrl+Shift+A R` (`Cmd+Shift+A R` on macOS), or click the ▶ Run All button in the AgentBench sidebar.
- **Current test**: `Ctrl+Shift+A T` (`Cmd+Shift+A T` on macOS), or click the ▶ Run CodeLens above your test function.
- **Single suite**: Right-click a suite in the Test Suites view and select "Run Suite".

## Features

### Inline CodeLens
Every `test()`, `suite()`, `describe()`, and `it()` call gets a ▶ Run, Debug, and Replay CodeLens above it.

### Activity Bar Panel
A dedicated sidebar panel with five views:

| View | Description |
|------|-------------|
| **Run** | Quick actions: Run All, Run Current, Run Suite, Debug, Replay |
| **History** | Recent test runs with pass/fail icons and timestamps |
| **Test Suites** | Discovered test suites and cases in your workspace |
| **Coverage** | Coverage statistics with progress indicators |
| **Snapshots** | Snapshot management (create, update, view) |

### Status Bar
The status bar shows a live summary: `AgentBench: 24/25` with color coding (green for all passing, red for failures). Click it to open a quick-pick menu with common actions.

### Diagnostics
Test failures appear as inline diagnostics (red squiggly underlines) in your test files, so you can see exactly which tests failed without switching contexts.

### Trace Viewer
Use **AgentBench: View Execution Trace** to inspect the step-by-step execution of any test run -- LLM calls, tool invocations, token usage, and latency breakdowns.

### Snapshot Management
Create and update test snapshots to track agent behavior changes over time. The Snapshots view lists all snapshots in your workspace.

## Configuration

Configure the extension in your VS Code settings (`settings.json`):

```json
{
  "agentbench.cliPath": "agentbench",
  "agentbench.configPath": "",
  "agentbench.autoRun": false
}
```

| Setting | Type | Default | Description |
|---------|------|---------|-------------|
| `agentbench.cliPath` | `string` | `"agentbench"` | Path to the agentbench CLI binary |
| `agentbench.configPath` | `string` | `""` | Path to agentbench config file (auto-detect if empty) |
| `agentbench.autoRun` | `boolean` | `false` | Auto-run tests when a test file is saved |

## Keyboard Shortcuts

| Shortcut | Command |
|----------|---------|
| `Ctrl+Shift+A R` / `Cmd+Shift+A R` | Run All Tests |
| `Ctrl+Shift+A T` / `Cmd+Shift+A T` | Run Current Test |

## Commands

All commands are available via the Command Palette (`Ctrl+Shift+P`):

| Command | Description |
|---------|-------------|
| `AgentBench: Run All Tests` | Execute all tests in the project |
| `AgentBench: Run Current Test` | Run the test at the cursor position |
| `AgentBench: Run Suite` | Run all tests in the current suite |
| `AgentBench: Debug Test` | Debug the test at the cursor position |
| `AgentBench: Replay Last Run` | Replay the most recent test run |
| `AgentBench: Replay Selected Test` | Choose a past run to replay |
| `AgentBench: View Execution Trace` | Open the trace viewer for a run |
| `AgentBench: Compare Runs` | Compare results across two runs |
| `AgentBench: Show Coverage Report` | Display test coverage statistics |
| `AgentBench: Update Snapshots` | Update all snapshots to current output |
| `AgentBench: Create Snapshot` | Capture a new snapshot |
| `AgentBench: Open Dashboard` | Open the AgentBench web dashboard |
| `AgentBench: Initialize Project` | Set up AgentBench in your project |

## Troubleshooting

**"agentbench: command not found"**
- Make sure `agentbench` is installed globally: `npm install -g agentbench`
- Set `agentbench.cliPath` to the absolute path of the agentbench binary
- Check the AgentBench output channel for detailed logs

**Tests not discovered**
- Ensure your test files are named `*.test.ts`, `*.test.js`, etc.
- Check that `agentbench.config.*` exists in your workspace root
- Run **AgentBench: Initialize Project** to generate a config file

**No API keys configured**
- Set API keys as environment variables (`OPENAI_API_KEY`, `ANTHROPIC_API_KEY`, etc.)
- Or configure them in your `agentbench.config.ts` file

## Links

- [AgentBench Documentation](https://agentbench.dev)
- [GitHub Repository](https://github.com/agentbench/agentbench)
- [Report an Issue](https://github.com/agentbench/agentbench/issues)
- [VS Code Marketplace](https://marketplace.visualstudio.com/items?itemName=agentbench.agentbench-vscode)
