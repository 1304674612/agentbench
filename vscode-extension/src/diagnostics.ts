import * as vscode from 'vscode'
import type { TestCaseResult, TestRunOutput } from './types'

/**
 * Diagnostic collection provider.
 * Converts test failures into VS Code Diagnostic objects for inline error display.
 */

let diagnosticCollection: vscode.DiagnosticCollection | undefined

/**
 * Create the diagnostic collection. Call once during activation.
 */
export function createDiagnostics(): vscode.DiagnosticCollection {
  if (!diagnosticCollection) {
    diagnosticCollection = vscode.languages.createDiagnosticCollection('agentbench')
  }
  return diagnosticCollection
}

/**
 * Update diagnostics from test run results.
 * Maps test failures to their locations in test files.
 */
export async function updateDiagnostics(output: TestRunOutput): Promise<void> {
  if (!diagnosticCollection) {
    createDiagnostics()
  }

  diagnosticCollection!.clear()

  if (!output || !output.results || output.results.length === 0) {
    return
  }

  const failedResults = output.results.filter((r) => r.status === 'FAILED' || r.status === 'ERROR')

  if (failedResults.length === 0) {
    return
  }

  // Group failures by file. We need to search for test definitions in workspace files.
  const workspaceFiles = await findTestFiles()

  for (const result of failedResults) {
    const fileUri = findTestLocation(result.name, workspaceFiles)

    if (fileUri) {
      const document = await vscode.workspace.openTextDocument(fileUri)
      const range = findTestRange(document, result.name)

      const diagnostic = createDiagnostic(result, range)
      diagnosticCollection!.set(fileUri, [
        ...(diagnosticCollection!.get(fileUri) || []),
        diagnostic,
      ])
    }
  }
}

/**
 * Create a Diagnostic object from a test failure.
 */
function createDiagnostic(result: TestCaseResult, range: vscode.Range): vscode.Diagnostic {
  const message = buildFailureMessage(result)
  const severity =
    result.status === 'ERROR' ? vscode.DiagnosticSeverity.Error : vscode.DiagnosticSeverity.Warning

  const diagnostic = new vscode.Diagnostic(range, message, severity)
  diagnostic.source = 'AgentBench'
  diagnostic.code = result.status

  return diagnostic
}

/**
 * Build a human-readable failure message.
 */
function buildFailureMessage(result: TestCaseResult): string {
  const parts: string[] = [`Test "${result.name}" ${result.status.toLowerCase()}`]

  if (result.duration) {
    parts.push(`(${result.duration}ms)`)
  }

  if (result.assertions.total > 0) {
    parts.push(`— ${result.assertions.passed}/${result.assertions.total} assertions passed`)
    if (result.assertions.failed > 0) {
      parts.push(`[${result.assertions.failed} failed]`)
    }
  }

  return parts.join(' ')
}

/**
 * Find all test files in the workspace.
 */
async function findTestFiles(): Promise<vscode.Uri[]> {
  if (!vscode.workspace.workspaceFolders) {
    return []
  }

  const files = await vscode.workspace.findFiles(
    '**/*.test.{ts,js,mjs,tsx,jsx}',
    '**/node_modules/**',
    200
  )

  // Also search for agentbench config files
  const configFiles = await vscode.workspace.findFiles(
    '**/agentbench.config.{ts,js,mjs,json}',
    '**/node_modules/**',
    10
  )

  return [...files, ...configFiles]
}

/**
 * Find which file contains a test with the given name.
 */
function findTestLocation(testName: string, files: vscode.Uri[]): vscode.Uri | undefined {
  // Return the first test file as a reasonable default for diagnostics.
  // In a real implementation, we'd parse each file to find the exact match.
  const testFiles = files.filter(
    (f) =>
      f.fsPath.includes('.test.') || f.fsPath.includes('/tests/') || f.fsPath.includes('\\tests\\')
  )

  if (testFiles.length > 0) {
    return testFiles[0]
  }

  // Fallback to any file
  return files.length > 0 ? files[0] : undefined
}

/**
 * Find the range of a test definition in a document.
 * Searches for function declarations and test() / suite() calls.
 */
function findTestRange(document: vscode.TextDocument, testName: string): vscode.Range {
  const text = document.getText()
  const lines = text.split('\n')

  // Search for the test name in function declarations, exports, etc.
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]

    // Match: export async function xxxTest()
    if (line.includes(testName) && (line.includes('function') || line.includes('test('))) {
      return new vscode.Range(i, 0, i, line.length)
    }

    // Match: test('name', ...) or suite('name', ...)
    const quotedPattern = new RegExp(
      `(test|suite|describe|it)\\s*\\(\\s*['"\`]${escapeRegex(testName)}['"\`]`
    )
    if (quotedPattern.test(line)) {
      return new vscode.Range(i, 0, i, line.length)
    }
  }

  // Fallback: first line of file
  return new vscode.Range(0, 0, 0, 0)
}

/**
 * Escape special regex characters in a string.
 */
function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

/**
 * Clear all diagnostics.
 */
export function clearDiagnostics(): void {
  diagnosticCollection?.clear()
}

/**
 * Dispose of the diagnostic collection.
 */
export function disposeDiagnostics(): void {
  diagnosticCollection?.dispose()
  diagnosticCollection = undefined
}
