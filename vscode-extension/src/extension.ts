import * as vscode from 'vscode';
import { AgentBenchCodeLensProvider } from './codeLens';
import { createStatusBar, setIdle } from './statusBar';
import { createDiagnostics } from './diagnostics';
import {
  RunTreeDataProvider,
  HistoryTreeDataProvider,
  SuitesTreeDataProvider,
  CoverageTreeDataProvider,
  SnapshotsTreeDataProvider,
} from './treeView';
import { onConfigChange, getAutoRun } from './config';
import {
  runAllTestsCommand,
  runCurrentTestCommand,
  runSuiteCommand,
  debugTestCommand,
  replayLastCommand,
  replaySelectCommand,
  viewTraceCommand,
  compareRunsCommand,
  showCoverageCommand,
  updateSnapshotsCommand,
  createSnapshotCommand,
  openDashboardCommand,
  initCommand,
  setCommandContext,
  setHistoryCallback,
} from './commands';
import { showOutput } from './testRunner';

/**
 * AgentBench VS Code Extension -- Activation Entry Point.
 *
 * Activates when:
 *   - A workspace contains agentbench.config.* files
 *   - An agentbench.* command is executed
 *   - An agentbench.* view is opened
 */
export function activate(context: vscode.ExtensionContext): void {
  console.log('AgentBench extension activated');

  // Store context for use by command handlers
  setCommandContext(context);

  // ---- Status Bar ----
  const statusBar = createStatusBar();
  setIdle();
  context.subscriptions.push(statusBar);

  // ---- Diagnostics ----
  const diagnostics = createDiagnostics();
  context.subscriptions.push(diagnostics);

  // ---- CodeLens ----
  const codeLensProvider = new AgentBenchCodeLensProvider();
  const codeLensSelector: vscode.DocumentSelector = [
    { scheme: 'file', pattern: '**/*.{ts,js,mjs,tsx,jsx}' },
  ];
  context.subscriptions.push(
    vscode.languages.registerCodeLensProvider(codeLensSelector, codeLensProvider),
  );

  // ---- Tree Views ----

  // Run view
  const runProvider = new RunTreeDataProvider();
  context.subscriptions.push(
    vscode.window.registerTreeDataProvider('agentbench.run', runProvider),
  );

  // History view
  const historyProvider = new HistoryTreeDataProvider();
  context.subscriptions.push(
    vscode.window.registerTreeDataProvider('agentbench.history', historyProvider),
  );

  // Test Suites view
  const suitesProvider = new SuitesTreeDataProvider();
  context.subscriptions.push(
    vscode.window.registerTreeDataProvider('agentbench.testSuites', suitesProvider),
  );

  // Coverage view
  const coverageProvider = new CoverageTreeDataProvider();
  context.subscriptions.push(
    vscode.window.registerTreeDataProvider('agentbench.coverage', coverageProvider),
  );

  // Snapshots view
  const snapshotsProvider = new SnapshotsTreeDataProvider();
  context.subscriptions.push(
    vscode.window.registerTreeDataProvider('agentbench.snapshots', snapshotsProvider),
  );

  // Set up history callback so commands.ts can add entries
  setHistoryCallback((entry) => {
    historyProvider.addEntry(entry);
  });

  // ---- Commands (13 total) ----
  context.subscriptions.push(
    vscode.commands.registerCommand('agentbench.runAllTests', runAllTestsCommand),
  );
  context.subscriptions.push(
    vscode.commands.registerCommand('agentbench.runCurrentTest', runCurrentTestCommand),
  );
  context.subscriptions.push(
    vscode.commands.registerCommand('agentbench.runSuite', runSuiteCommand),
  );
  context.subscriptions.push(
    vscode.commands.registerCommand('agentbench.debugTest', debugTestCommand),
  );
  context.subscriptions.push(
    vscode.commands.registerCommand('agentbench.replayLast', replayLastCommand),
  );
  context.subscriptions.push(
    vscode.commands.registerCommand('agentbench.replaySelect', replaySelectCommand),
  );
  context.subscriptions.push(
    vscode.commands.registerCommand('agentbench.viewTrace', viewTraceCommand),
  );
  context.subscriptions.push(
    vscode.commands.registerCommand('agentbench.compareRuns', compareRunsCommand),
  );
  context.subscriptions.push(
    vscode.commands.registerCommand('agentbench.showCoverage', showCoverageCommand),
  );
  context.subscriptions.push(
    vscode.commands.registerCommand('agentbench.updateSnapshots', updateSnapshotsCommand),
  );
  context.subscriptions.push(
    vscode.commands.registerCommand('agentbench.createSnapshot', createSnapshotCommand),
  );
  context.subscriptions.push(
    vscode.commands.registerCommand('agentbench.openDashboard', openDashboardCommand),
  );
  context.subscriptions.push(
    vscode.commands.registerCommand('agentbench.init', initCommand),
  );

  // ---- Additional utility commands ----
  context.subscriptions.push(
    vscode.commands.registerCommand('agentbench.showOutput', () => {
      showOutput();
    }),
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('agentbench.refreshSuites', () => {
      suitesProvider.refresh();
    }),
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('agentbench.refreshCoverage', () => {
      coverageProvider.refresh();
    }),
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('agentbench.refreshSnapshots', () => {
      snapshotsProvider.refresh();
    }),
  );

  // ---- Config Change Watcher ----
  context.subscriptions.push(
    onConfigChange(() => {
      codeLensProvider.refresh();
    }),
  );

  // ---- File Save Watcher (auto-run if configured) ----
  context.subscriptions.push(
    vscode.workspace.onDidSaveTextDocument((document) => {
      if (
        getAutoRun() &&
        (document.fileName.includes('.test.') ||
          document.fileName.includes('agentbench.config.'))
      ) {
        // Auto-run on save
        runAllTestsCommand();
      }

      // Refresh CodeLens on save for test files
      if (
        document.fileName.includes('.test.') ||
        document.fileName.includes('/tests/') ||
        document.fileName.includes('agentbench.config.')
      ) {
        codeLensProvider.refresh();
      }
    }),
  );

  // ---- Initial Suite Discovery ----
  suitesProvider.refresh();
  snapshotsProvider.refresh();

  // ---- Show activation message ----
  vscode.window.showInformationMessage(
    'AgentBench extension activated. Use Ctrl+Shift+A R to run all tests.',
  );

  vscode.commands.executeCommand('setContext', 'agentbench.activated', true);
}

export function deactivate(): void {
  console.log('AgentBench extension deactivated');
}
