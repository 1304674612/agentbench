import * as vscode from 'vscode';

/**
 * Extension configuration reader.
 * Reads from agentbench.* settings in VS Code.
 */

const CONFIG_SECTION = 'agentbench';

export function getConfig(): vscode.WorkspaceConfiguration {
  return vscode.workspace.getConfiguration(CONFIG_SECTION);
}

/** Path to the agentbench CLI binary. Defaults to 'agentbench'. */
export function getCliPath(): string {
  return getConfig().get<string>('cliPath', 'agentbench');
}

/** Path to agentbench config file. Defaults to 'agentbench.config.ts'. */
export function getConfigPath(): string {
  const configured = getConfig().get<string>('configPath', '');
  if (configured) {
    return configured;
  }
  // Try to find config file in workspace
  if (vscode.workspace.workspaceFolders) {
    for (const folder of vscode.workspace.workspaceFolders) {
      const patterns = [
        'agentbench.config.ts',
        'agentbench.config.js',
        'agentbench.config.mjs',
        'agentbench.config.json',
      ];
      // Return the default pattern; actual resolution happens elsewhere
    }
  }
  return 'agentbench.config.ts';
}

/** Whether to automatically run tests on file save. */
export function getAutoRun(): boolean {
  return getConfig().get<boolean>('autoRun', false);
}

/** Project ID from workspace config or auto-detection. */
export function getProjectId(): string | undefined {
  return getConfig().get<string>('projectId', undefined);
}

/** Whether to show verbose output. */
export function getVerbose(): boolean {
  return getConfig().get<boolean>('verbose', false);
}

/** Additional arguments to pass to the CLI. */
export function getExtraArgs(): string[] {
  return getConfig().get<string[]>('extraArgs', []);
}

/** Watch for configuration changes. */
export function onConfigChange(
  callback: (e: vscode.ConfigurationChangeEvent) => void,
): vscode.Disposable {
  return vscode.workspace.onDidChangeConfiguration((e) => {
    if (e.affectsConfiguration(CONFIG_SECTION)) {
      callback(e);
    }
  });
}
