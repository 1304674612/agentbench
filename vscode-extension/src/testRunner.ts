import * as cp from 'child_process';
import * as path from 'path';
import * as vscode from 'vscode';
import { getCliPath, getConfigPath, getProjectId, getExtraArgs } from './config';
import type { TestRunOutput, TestCaseResult, TestRunSummary } from './types';

/**
 * Test runner that spawns the `agentbench test --json` CLI command.
 * Parses JSON output and returns typed results.
 */

export interface RunOptions {
  suiteId?: string;
  grep?: string;
  projectId?: string;
  cwd?: string;
  onProgress?: (message: string) => void;
}

export interface RunResult {
  success: boolean;
  output: TestRunOutput;
  rawOutput: string;
  duration: number;
}

const outputChannel = vscode.window.createOutputChannel('AgentBench', { log: true });

/**
 * Execute `agentbench test --json` and return parsed results.
 */
export async function runTests(options: RunOptions = {}): Promise<RunResult> {
  const cliPath = getCliPath();
  const projectId = options.projectId || getProjectId();

  if (!projectId) {
    throw new Error(
      'Project ID is required. Set agentbench.projectId in settings or provide it in the command.',
    );
  }

  const args = ['test', '--project', projectId, '--json'];

  if (options.suiteId) {
    args.push('--suite', options.suiteId);
  }

  if (options.grep) {
    args.push('--grep', options.grep);
  }

  // Add extra args from config
  args.push(...getExtraArgs());

  const cwd = options.cwd || getWorkspaceRoot();

  outputChannel.clear();
  outputChannel.appendLine(`$ ${cliPath} ${args.join(' ')}`);
  outputChannel.appendLine(`cwd: ${cwd}`);

  return new Promise<RunResult>((resolve, reject) => {
    const startTime = Date.now();
    let stdout = '';
    let stderr = '';

    const proc = cp.spawn(cliPath, args, {
      cwd,
      shell: process.platform === 'win32',
      env: { ...process.env, FORCE_COLOR: '0' },
    });

    proc.stdout.on('data', (data: Buffer) => {
      const text = data.toString();
      stdout += text;
      outputChannel.append(text);
      if (options.onProgress) {
        options.onProgress(text);
      }
    });

    proc.stderr.on('data', (data: Buffer) => {
      const text = data.toString();
      stderr += text;
      outputChannel.append(text);
    });

    proc.on('error', (err: Error) => {
      const message = `Failed to spawn agentbench CLI: ${err.message}. Make sure agentbench is installed (\`npm install -g agentbench\`) and agentbench.cliPath is set correctly.`;
      outputChannel.appendLine(message);
      reject(new Error(message));
    });

    proc.on('close', (code: number | null) => {
      const duration = Date.now() - startTime;

      if (stdout.trim().length === 0 && stderr.trim().length > 0) {
        outputChannel.appendLine(`Process exited with code ${code}.`);
        const emptyResult: RunResult = {
          success: false,
          output: {
            results: [],
            summary: { total: 0, passed: 0, failed: 0, errored: 0 },
          },
          rawOutput: stderr,
          duration,
        };
        resolve(emptyResult);
        return;
      }

      try {
        // The JSON output may be interleaved with other log lines from spinner,
        // but with --json, the CLI should only output JSON.
        // Try to find a JSON object in stdout.
        const parsed = extractJsonOutput(stdout);

        const result: RunResult = {
          success: code === 0,
          output: parsed,
          rawOutput: stdout,
          duration,
        };

        resolve(result);
      } catch (parseErr) {
        // If we can't parse JSON, return raw output as error context
        const emptyResult: RunResult = {
          success: false,
          output: {
            results: [],
            summary: { total: 0, passed: 0, failed: 0, errored: 0 },
          },
          rawOutput: stdout || stderr,
          duration,
        };
        resolve(emptyResult);
      }
    });
  });
}

/**
 * Run a single test case.
 */
export async function runSingleTest(
  testName: string,
  projectId: string,
): Promise<RunResult> {
  return runTests({ grep: testName, projectId });
}

/**
 * Run tests for a specific suite.
 */
export async function runSuite(
  suiteId: string,
  projectId: string,
): Promise<RunResult> {
  return runTests({ suiteId, projectId });
}

/**
 * Extracts JSON from raw CLI output. The CLI with --json prints only JSON,
 * but we handle edge cases where other output might be present.
 */
function extractJsonOutput(raw: string): TestRunOutput {
  // Try to parse the whole string as JSON first
  try {
    const trimmed = raw.trim();
    const parsed = JSON.parse(trimmed) as TestRunOutput;
    if (parsed.results && parsed.summary) {
      return parsed;
    }
  } catch {
    // Not valid JSON; try to find JSON block
  }

  // Try to find first { and last } to extract JSON object
  const firstBrace = raw.indexOf('{');
  const lastBrace = raw.lastIndexOf('}');
  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
    try {
      const jsonStr = raw.slice(firstBrace, lastBrace + 1);
      const parsed = JSON.parse(jsonStr) as TestRunOutput;
      if (parsed.results && parsed.summary) {
        return parsed;
      }
    } catch {
      // Could not parse extracted JSON
    }
  }

  // Fallback: return empty
  return {
    results: [],
    summary: { total: 0, passed: 0, failed: 0, errored: 0 },
  };
}

/**
 * Get the workspace root path.
 */
function getWorkspaceRoot(): string {
  const folders = vscode.workspace.workspaceFolders;
  if (folders && folders.length > 0) {
    return folders[0].uri.fsPath;
  }
  return process.cwd();
}

/**
 * Show the AgentBench output channel.
 */
export function showOutput(): void {
  outputChannel.show(true);
}
