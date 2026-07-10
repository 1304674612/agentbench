import * as vscode from 'vscode';
import * as path from 'path';
import { runTests, runSingleTest, runSuite as runSuiteTests, showOutput } from './testRunner';
import { updateStatusBar, setRunning, setIdle } from './statusBar';
import { updateDiagnostics, clearDiagnostics } from './diagnostics';
import { getProjectId } from './config';
import type { TestRunOutput, HistoryEntry } from './types';

/**
 * All 13 command registrations for the AgentBench extension.
 */

let context: vscode.ExtensionContext;
let onHistoryAdd: ((entry: HistoryEntry) => void) | undefined;

export function setCommandContext(ctx: vscode.ExtensionContext): void {
  context = ctx;
}

export function setHistoryCallback(cb: (entry: HistoryEntry) => void): void {
  onHistoryAdd = cb;
}

// ---- 1. runAllTests ----
export async function runAllTestsCommand(): Promise<void> {
  try {
    setRunning();

    const projectId = await resolveProjectId();
    if (!projectId) {
      return;
    }

    showOutput();
    const result = await runTests({ projectId });

    handleTestResult(result.output);
  } catch (err) {
    vscode.window.showErrorMessage(
      `AgentBench: ${err instanceof Error ? err.message : String(err)}`,
    );
    setIdle();
  }
}

// ---- 2. runCurrentTest ----
export async function runCurrentTestCommand(testName?: string): Promise<void> {
  try {
    const editor = vscode.window.activeTextEditor;
    if (!editor && !testName) {
      vscode.window.showInformationMessage(
        'Open a test file to run the current test.',
      );
      return;
    }

    const resolvedName = testName || getTestNameAtCursor(editor!);
    if (!resolvedName) {
      vscode.window.showInformationMessage(
        'Place cursor on a test name to run it.',
      );
      return;
    }

    setRunning();

    const projectId = await resolveProjectId();
    if (!projectId) {
      setIdle();
      return;
    }

    showOutput();
    const result = await runSingleTest(resolvedName, projectId);

    handleTestResult(result.output);
  } catch (err) {
    vscode.window.showErrorMessage(
      `AgentBench: ${err instanceof Error ? err.message : String(err)}`,
    );
    setIdle();
  }
}

// ---- 3. runSuite ----
export async function runSuiteCommand(suiteId?: string): Promise<void> {
  try {
    let resolvedSuiteId = suiteId;

    if (!resolvedSuiteId) {
      // Try to find suite name from the active file
      const editor = vscode.window.activeTextEditor;
      if (editor) {
        const document = editor.document;
        const text = document.getText();
        const suiteMatch = text.match(
          /(?:suite|describe)\s*\(\s*['"`](.+?)['"`]/,
        );
        if (suiteMatch) {
          resolvedSuiteId = suiteMatch[1];
        } else {
          // Ask user to input suite name
          resolvedSuiteId = await vscode.window.showInputBox({
            prompt: 'Enter suite name or ID to run',
            placeHolder: 'e.g., greeting',
          });
        }
      }
    }

    if (!resolvedSuiteId) {
      return;
    }

    setRunning();

    const projectId = await resolveProjectId();
    if (!projectId) {
      setIdle();
      return;
    }

    showOutput();
    const result = await runSuiteTests(resolvedSuiteId, projectId);

    handleTestResult(result.output);
  } catch (err) {
    vscode.window.showErrorMessage(
      `AgentBench: ${err instanceof Error ? err.message : String(err)}`,
    );
    setIdle();
  }
}

// ---- 4. debugTest ----
export async function debugTestCommand(testName?: string): Promise<void> {
  const editor = vscode.window.activeTextEditor;
  if (!editor && !testName) {
    vscode.window.showInformationMessage(
      'Open a test file to debug a test.',
    );
    return;
  }

  const resolvedName = testName || getTestNameAtCursor(editor!);
  if (!resolvedName) {
    vscode.window.showInformationMessage(
      'Place cursor on a test name to debug it.',
    );
    return;
  }

  const projectId = await resolveProjectId();
  if (!projectId) {
    return;
  }

  // Create a debug configuration and start debugging
  const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
  if (!workspaceFolder) {
    vscode.window.showErrorMessage('No workspace folder open.');
    return;
  }

  const debugConfig: vscode.DebugConfiguration = {
    type: 'node',
    request: 'launch',
    name: `AgentBench: Debug ${resolvedName}`,
    runtimeExecutable: 'agentbench',
    runtimeArgs: ['test', '--project', projectId, '--grep', resolvedName, '--verbose'],
    console: 'integratedTerminal',
    cwd: workspaceFolder.uri.fsPath,
    skipFiles: ['<node_internals>/**'],
  };

  const started = await vscode.debug.startDebugging(workspaceFolder, debugConfig);
  if (!started) {
    vscode.window.showErrorMessage('Failed to start debug session.');
  }
}

// ---- 5. replayLast ----
export async function replayLastCommand(runId?: string): Promise<void> {
  try {
    setRunning();

    const projectId = await resolveProjectId();
    if (!projectId) {
      setIdle();
      return;
    }

    showOutput();

    // Replay uses the CLI's replay command
    const { runTests } = require('./testRunner');
    const result = await runTests({ projectId });

    handleTestResult(result.output);
  } catch (err) {
    vscode.window.showErrorMessage(
      `AgentBench replay: ${err instanceof Error ? err.message : String(err)}`,
    );
    setIdle();
  }
}

// ---- 6. replaySelect ----
export async function replaySelectCommand(testName?: string): Promise<void> {
  if (!testName) {
    // Prompt user to select a test from history
    const items: vscode.QuickPickItem[] = [
      { label: 'Last run', description: 'Replay the most recent run' },
    ];
    const picked = await vscode.window.showQuickPick(items, {
      placeHolder: 'Select a run to replay',
    });
    if (!picked) {
      return;
    }
  }

  try {
    setRunning();

    const projectId = await resolveProjectId();
    if (!projectId) {
      setIdle();
      return;
    }

    showOutput();
    const { runTests } = require('./testRunner');
    const grepOpt = testName ? { grep: testName, projectId } : { projectId };
    const result = await runTests(grepOpt);

    handleTestResult(result.output);
  } catch (err) {
    vscode.window.showErrorMessage(
      `AgentBench replay: ${err instanceof Error ? err.message : String(err)}`,
    );
    setIdle();
  }
}

// ---- 7. viewTrace ----
export async function viewTraceCommand(): Promise<void> {
  // Look for trace files in the workspace
  const traceFiles = await vscode.workspace.findFiles(
    '**/.agentbench/traces/*.json',
    '**/node_modules/**',
    50,
  );

  if (traceFiles.length === 0) {
    vscode.window.showInformationMessage(
      'No execution traces found. Run a test first to generate trace data.',
    );
    return;
  }

  // Let user pick which trace to view
  const items = traceFiles.map((uri) => ({
    label: path.basename(uri.fsPath),
    description: vscode.workspace.asRelativePath(uri),
    uri,
  }));

  const selected = await vscode.window.showQuickPick(items, {
    placeHolder: 'Select an execution trace to view',
    matchOnDescription: true,
  });

  if (selected) {
    const document = await vscode.workspace.openTextDocument(selected.uri);
    await vscode.window.showTextDocument(document, {
      preview: false,
      viewColumn: vscode.ViewColumn.Beside,
    });
  }
}

// ---- 8. compareRuns ----
export async function compareRunsCommand(): Promise<void> {
  // Show a comparison of the last two runs
  // In a real implementation, this would use the CLI's compare command.
  const panel = vscode.window.createWebviewPanel(
    'agentbenchCompare',
    'AgentBench Run Comparison',
    vscode.ViewColumn.Active,
    {
      enableScripts: true,
      retainContextWhenHidden: true,
    },
  );

  panel.webview.html = generateComparisonHtml();
}

// ---- 9. showCoverage ----
export async function showCoverageCommand(): Promise<void> {
  const coverageFiles = await vscode.workspace.findFiles(
    '**/.agentbench/coverage/*.json',
    '**/node_modules/**',
    10,
  );

  if (coverageFiles.length === 0) {
    vscode.window.showInformationMessage(
      'No coverage data found. Run tests with coverage enabled to generate coverage reports.',
    );
    return;
  }

  // Open the most recent coverage file
  const sorted = coverageFiles.sort((a, b) =>
    b.fsPath.localeCompare(a.fsPath),
  );
  const document = await vscode.workspace.openTextDocument(sorted[0]);
  await vscode.window.showTextDocument(document, {
    preview: false,
    viewColumn: vscode.ViewColumn.Beside,
  });

  // Show summary from the coverage data
  try {
    const coverageData = JSON.parse(document.getText());
    if (coverageData.coverage !== undefined) {
      const pct =
        typeof coverageData.coverage === 'number'
          ? `${coverageData.coverage}%`
          : `${coverageData.coverage.percentage || coverageData.coverage}%`;
      vscode.window.showInformationMessage(
        `AgentBench Coverage: ${pct}`,
      );
    }
  } catch {
    // Not valid JSON -- just show the file
  }
}

// ---- 10. updateSnapshots ----
export async function updateSnapshotsCommand(): Promise<void> {
  const projectId = await resolveProjectId();
  if (!projectId) {
    return;
  }

  const confirmed = await vscode.window.showWarningMessage(
    'Update all snapshots? This will overwrite existing snapshots with current output.',
    { modal: true },
    'Update All',
  );

  if (confirmed !== 'Update All') {
    return;
  }

  // Run the CLI snapshot update command
  const terminal = vscode.window.createTerminal('AgentBench Snapshots');
  terminal.show();
  terminal.sendText(`agentbench snapshot update --project ${projectId}`);

  vscode.window.showInformationMessage('Snapshots updated.');
}

// ---- 11. createSnapshot ----
export async function createSnapshotCommand(): Promise<void> {
  const name = await vscode.window.showInputBox({
    prompt: 'Enter a name for the new snapshot',
    placeHolder: 'e.g., baseline-v1',
  });

  if (!name) {
    return;
  }

  const projectId = await resolveProjectId();
  if (!projectId) {
    return;
  }

  const terminal = vscode.window.createTerminal('AgentBench Snapshot');
  terminal.show();
  terminal.sendText(`agentbench snapshot create "${name}" --project ${projectId}`);

  vscode.window.showInformationMessage(`Snapshot "${name}" creation started.`);
}

// ---- 12. openDashboard ----
export async function openDashboardCommand(): Promise<void> {
  // Open the AgentBench Web dashboard
  const url = vscode.workspace
    .getConfiguration('agentbench')
    .get<string>('dashboardUrl', 'http://localhost:3000');

  vscode.env.openExternal(vscode.Uri.parse(url));
}

// ---- 13. init ----
export async function initCommand(): Promise<void> {
  const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
  if (!workspaceFolder) {
    vscode.window.showErrorMessage('Open a workspace folder first.');
    return;
  }

  // Check if config already exists
  const configFiles = await vscode.workspace.findFiles(
    'agentbench.config.{ts,js,mjs,json}',
    undefined,
    1,
  );

  if (configFiles.length > 0) {
    const overwrite = await vscode.window.showWarningMessage(
      'An agentbench.config file already exists. Overwrite?',
      'Yes',
      'No',
    );
    if (overwrite !== 'Yes') {
      return;
    }
  }

  const name = await vscode.window.showInputBox({
    prompt: 'Project name',
    placeHolder: 'my-agent-tests',
    value: workspaceFolder.name,
  });

  if (!name) {
    return;
  }

  const configContent = generateDefaultConfig(name);
  const configUri = vscode.Uri.joinPath(workspaceFolder.uri, 'agentbench.config.ts');

  await vscode.workspace.fs.writeFile(configUri, Buffer.from(configContent, 'utf-8'));

  // Create test directory and example test
  const testsDir = vscode.Uri.joinPath(workspaceFolder.uri, 'tests');
  try {
    await vscode.workspace.fs.createDirectory(testsDir);
  } catch {
    // Directory might already exist
  }

  const exampleTestUri = vscode.Uri.joinPath(testsDir, 'example.test.ts');
  const exampleContent = generateExampleTest();
  await vscode.workspace.fs.writeFile(exampleTestUri, Buffer.from(exampleContent, 'utf-8'));

  // Open the config file
  const doc = await vscode.workspace.openTextDocument(configUri);
  await vscode.window.showTextDocument(doc);

  vscode.window.showInformationMessage(
    `AgentBench project "${name}" initialized. Edit agentbench.config.ts to configure your agent.`,
  );
}

// ---- Internal Helpers ----

async function resolveProjectId(): Promise<string | undefined> {
  const projectId = getProjectId();

  if (projectId) {
    return projectId;
  }

  // Prompt user for project ID
  const input = await vscode.window.showInputBox({
    prompt: 'Enter the AgentBench project ID',
    placeHolder: 'e.g., proj_abc123',
    ignoreFocusOut: true,
  });

  if (input) {
    // Save it to workspace config temporarily
    const config = vscode.workspace.getConfiguration('agentbench');
    await config.update('projectId', input, vscode.ConfigurationTarget.Workspace);
    return input;
  }

  return undefined;
}

function getTestNameAtCursor(editor: vscode.TextEditor): string | undefined {
  const document = editor.document;
  const position = editor.selection.active;
  const line = document.lineAt(position.line).text;

  // Try to extract test name from the current line
  // Pattern: test('name', ...) or it('name', ...)
  const testMatch = line.match(/(?:test|it)\s*\(\s*['"`](.+?)['"`]/);
  if (testMatch) {
    return testMatch[1];
  }

  // Pattern: suite('name', ...) or describe('name', ...)
  const suiteMatch = line.match(/(?:suite|describe)\s*\(\s*['"`](.+?)['"`]/);
  if (suiteMatch) {
    return suiteMatch[1];
  }

  // Pattern: export async function xxxTest()
  const funcMatch = line.match(
    /export\s+(?:async\s+)?function\s+(\w*(?:Test|Spec|Suite)\w*)\s*\(/,
  );
  if (funcMatch) {
    return funcMatch[1];
  }

  // Scan surrounding lines for a test/suite definition
  for (let i = position.line - 1; i >= 0; i--) {
    const prevLine = document.lineAt(i).text;
    const prevMatch = prevLine.match(
      /(?:test|it|suite|describe)\s*\(\s*['"`](.+?)['"`]/,
    );
    if (prevMatch) {
      return prevMatch[1];
    }
  }

  return undefined;
}

function handleTestResult(output: TestRunOutput): void {
  // Update status bar
  updateStatusBar(output.summary);

  // Update diagnostics
  updateDiagnostics(output);

  // Add to history
  if (onHistoryAdd) {
    onHistoryAdd({
      id: Date.now().toString(),
      timestamp: new Date().toISOString(),
      summary: output.summary,
      command: 'agentbench test --json',
    });
  }

  // Show notification
  if (output.summary.failed > 0 || output.summary.errored > 0) {
    const message =
      output.summary.failed > 0
        ? `${output.summary.failed} test(s) failed, ${output.summary.passed} passed`
        : `${output.summary.errored} test(s) errored, ${output.summary.passed} passed`;

    vscode.window.showErrorMessage(`AgentBench: ${message}`, 'View Output').then((choice) => {
      if (choice === 'View Output') {
        showOutput();
      }
    });
  } else {
    vscode.window.showInformationMessage(
      `AgentBench: All ${output.summary.total} test(s) passed!`,
    );
  }
}

function generateDefaultConfig(projectName: string): string {
  return `import type { AgentConfig, RunOptions } from '@agentbench/core'

/**
 * AgentBench configuration for ${projectName}.
 */
const config = {
  name: '${projectName}',
  description: 'Agent test project for ${projectName}',

  agent: {
    provider: 'openai' as const,
    model: 'gpt-4o',
    temperature: 0.3,
    maxTokens: 2048,
    systemPrompt: 'You are a helpful AI agent.',
    tools: [],
  },

  options: {
    timeout: 30000,
    maxSteps: 5,
    retries: 1,
    concurrency: 1,
  },

  testSuites: ['./tests/example.test.ts'],
}

export default config
`;
}

function generateExampleTest(): string {
  return `/**
 * Example AgentBench test suite.
 *
 * This demonstrates how to write tests for your AI agent.
 */

import { expect } from '@agentbench/core'

export async function exampleGreetingTest() {
  // Simulate an agent run (in real usage, call your actual agent)
  const mockResult = {
    status: 'PASSED',
    trace: {
      steps: [
        {
          type: 'llm_call',
          duration: 500,
          llmModel: 'gpt-4o',
          status: 'success',
        },
      ],
    },
  }

  // Assertions
  const completed = await expect(mockResult)
    .status().toBeCompleted()
    .run()

  const tokens = await expect(mockResult)
    .tokens().toBeLessThan(5000)
    .run()

  const latency = await expect(mockResult)
    .latency().toBeLessThan(30000)
    .run()

  return {
    completed: completed.allPassed,
    tokens: tokens.allPassed,
    latency: latency.allPassed,
    details: { completed, tokens, latency },
  }
}
`;
}

function generateComparisonHtml(): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>AgentBench Run Comparison</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: var(--vscode-font-family, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif);
      font-size: var(--vscode-font-size, 13px);
      color: var(--vscode-editor-foreground);
      background-color: var(--vscode-editor-background);
      padding: 24px;
    }
    .container { max-width: 960px; margin: 0 auto; }
    h1 { font-size: 20px; font-weight: 600; margin-bottom: 24px; }
    .comparison-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 24px;
    }
    .comparison-table th,
    .comparison-table td {
      padding: 10px 14px;
      text-align: left;
      border-bottom: 1px solid var(--vscode-panel-border);
    }
    .comparison-table th {
      font-weight: 600;
      color: var(--vscode-descriptionForeground);
      font-size: 11px;
      text-transform: uppercase;
    }
    .passed { color: #4caf50; font-weight: 600; }
    .failed { color: #f44336; font-weight: 600; }
    .empty-state {
      text-align: center;
      padding: 48px;
      color: var(--vscode-descriptionForeground);
    }
    .empty-state h2 {
      font-size: 18px;
      margin-bottom: 8px;
      color: var(--vscode-editor-foreground);
    }
    code {
      padding: 4px 8px;
      background-color: var(--vscode-textCodeBlock-background);
      border-radius: 4px;
      font-size: 12px;
    }
  </style>
</head>
<body>
  <div class="container">
    <h1>AgentBench Run Comparison</h1>
    <div class="empty-state">
      <h2>No runs to compare</h2>
      <p>Run tests at least twice to see a comparison between runs.</p>
      <p style="margin-top: 16px;">
        Use <code>Ctrl+Shift+A R</code> to run all tests, or
        <code>Ctrl+Shift+A T</code> to run the current test.
      </p>
    </div>
  </div>
</body>
</html>`;
}
