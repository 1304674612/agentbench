import * as vscode from 'vscode';

/**
 * CodeLens provider that adds Run | Debug | Replay actions above each
 * test function and test suite definition in test files.
 *
 * Detects the following patterns:
 *   - test('name', ...)
 *   - suite('name', ...)
 *   - describe('name', ...)
 *   - it('name', ...)
 *   - export async function xxxTest()
 */

interface TestMatch {
  name: string;
  range: vscode.Range;
  type: 'test' | 'suite';
}

export class AgentBenchCodeLensProvider implements vscode.CodeLensProvider {
  private _onDidChangeCodeLenses = new vscode.EventEmitter<void>();
  public readonly onDidChangeCodeLenses = this._onDidChangeCodeLenses.event;

  /**
   * Provide CodeLens objects for the given document.
   */
  public provideCodeLenses(
    document: vscode.TextDocument,
    _token: vscode.CancellationToken,
  ): vscode.CodeLens[] | Thenable<vscode.CodeLens[]> {
    const matches = findTestMatches(document);

    if (matches.length === 0) {
      return [];
    }

    const lenses: vscode.CodeLens[] = [];

    for (const match of matches) {
      // Run CodeLens
      const runLens = new vscode.CodeLens(match.range, {
        title: '$(play) Run',
        command: 'agentbench.runCurrentTest',
        tooltip: `Run test: ${match.name}`,
        arguments: [match.name],
      });
      lenses.push(runLens);

      // Debug CodeLens
      const debugLens = new vscode.CodeLens(match.range, {
        title: '$(debug-alt) Debug',
        command: 'agentbench.debugTest',
        tooltip: `Debug test: ${match.name}`,
        arguments: [match.name],
      });
      lenses.push(debugLens);

      // Replay CodeLens
      const replayLens = new vscode.CodeLens(match.range, {
        title: '$(history) Replay',
        command: 'agentbench.replaySelect',
        tooltip: `Replay last run of: ${match.name}`,
        arguments: [match.name],
      });
      lenses.push(replayLens);
    }

    return lenses;
  }

  /**
   * Resolve a single CodeLens (no async resolution needed).
   */
  public resolveCodeLens(
    codeLens: vscode.CodeLens,
    _token: vscode.CancellationToken,
  ): vscode.CodeLens {
    return codeLens;
  }

  /**
   * Force refresh of all CodeLenses.
   */
  public refresh(): void {
    this._onDidChangeCodeLenses.fire();
  }
}

/**
 * Parse the document for test and suite definitions.
 */
function findTestMatches(document: vscode.TextDocument): TestMatch[] {
  const text = document.getText();
  const lines = text.split('\n');
  const matches: TestMatch[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const lineNumber = i;

    // Match: test('name', ...) or test("name", ...) or test(`name`, ...)
    const testCallMatch = line.match(
      /(?:test|it)\s*\(\s*['"`](.+?)['"`]\s*,/,
    );
    if (testCallMatch) {
      const name = testCallMatch[1];
      const range = new vscode.Range(lineNumber, 0, lineNumber, line.length);
      matches.push({ name, range, type: 'test' });
      continue;
    }

    // Match: suite('name', ...) or describe('name', ...)
    const suiteCallMatch = line.match(
      /(?:suite|describe)\s*\(\s*['"`](.+?)['"`]\s*,/,
    );
    if (suiteCallMatch) {
      const name = suiteCallMatch[1];
      const range = new vscode.Range(lineNumber, 0, lineNumber, line.length);
      matches.push({ name, range, type: 'suite' });
      continue;
    }

    // Match: export async function xxxTest()
    const funcMatch = line.match(
      /export\s+(?:async\s+)?function\s+(\w*(?:Test|Spec|Suite|Scenario)\w*)\s*\(/,
    );
    if (funcMatch) {
      const name = funcMatch[1];
      const range = new vscode.Range(lineNumber, 0, lineNumber, line.length);
      matches.push({ name, range, type: 'test' });
    }
  }

  return matches;
}
