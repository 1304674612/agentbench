import * as vscode from 'vscode';
import type { ExecutionTrace, TraceStep } from './types';

/**
 * Webview Panel provider for trace visualization.
 * Displays an interactive timeline of agent execution steps:
 * LLM calls, tool calls, responses, and errors.
 */

export class TraceViewerPanel {
  public static currentPanel: TraceViewerPanel | undefined;
  private readonly _panel: vscode.WebviewPanel;
  private readonly _extensionUri: vscode.Uri;
  private _disposables: vscode.Disposable[] = [];

  private constructor(panel: vscode.WebviewPanel, extensionUri: vscode.Uri) {
    this._panel = panel;
    this._extensionUri = extensionUri;

    this._panel.onDidDispose(() => this.dispose(), null, this._disposables);
    this._panel.webview.onDidReceiveMessage(
      this._handleMessage,
      this,
      this._disposables,
    );
  }

  /**
   * Create or reveal the Trace Viewer panel.
   */
  public static createOrShow(
    extensionUri: vscode.Uri,
    trace?: ExecutionTrace,
  ): void {
    const column = vscode.ViewColumn.Beside;

    if (TraceViewerPanel.currentPanel) {
      TraceViewerPanel.currentPanel._panel.reveal(column);
      if (trace) {
        TraceViewerPanel.currentPanel.setTrace(trace);
      }
      return;
    }

    const panel = vscode.window.createWebviewPanel(
      'agentbenchTrace',
      'AgentBench Trace Viewer',
      column,
      {
        enableScripts: true,
        retainContextWhenHidden: true,
        localResourceRoots: [extensionUri],
      },
    );

    TraceViewerPanel.currentPanel = new TraceViewerPanel(panel, extensionUri);
    if (trace) {
      TraceViewerPanel.currentPanel.setTrace(trace);
    } else {
      TraceViewerPanel.currentPanel.setEmpty();
    }
  }

  /**
   * Set trace data and render the visualization.
   */
  public setTrace(trace: ExecutionTrace): void {
    this._panel.title = `Trace: ${trace.metadata.agentName || trace.id}`;
    this._panel.webview.html = this._generateHtml(trace);
  }

  /**
   * Show empty state.
   */
  public setEmpty(): void {
    this._panel.title = 'AgentBench Trace Viewer';
    this._panel.webview.html = this._generateEmptyHtml();
  }

  private _handleMessage(message: { command: string; stepId?: string }): void {
    switch (message.command) {
      case 'selectStep':
        if (message.stepId) {
          // Could navigate to step details
        }
        break;
      case 'refresh':
        break;
    }
  }

  public dispose(): void {
    TraceViewerPanel.currentPanel = undefined;
    this._panel.dispose();
    while (this._disposables.length) {
      const d = this._disposables.pop();
      d?.dispose();
    }
  }

  // ---- HTML Generation ----

  private _generateHtml(trace: ExecutionTrace): string {
    const steps = trace.steps || [];
    const totalDuration = steps.reduce(
      (sum, s) => sum + (s.duration || 0),
      0,
    );
    const totalTokens = steps.reduce(
      (sum, s) => sum + (s.totalTokens || 0),
      0,
    );
    const totalCost = steps.reduce(
      (sum, s) => sum + (s.cost || 0),
      0,
    );

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Trace: ${this._escapeHtml(trace.metadata.agentName || trace.id)}</title>
  ${this._getStyles()}
</head>
<body>
  <div class="trace-container">
    <header class="trace-header">
      <h1>${this._escapeHtml(trace.metadata.agentName || 'Execution Trace')}</h1>
      <div class="trace-meta">
        <span class="badge badge-env">${this._escapeHtml(trace.metadata.environment)}</span>
        <span class="badge badge-steps">${steps.length} steps</span>
        <span class="badge badge-duration">${this._formatDuration(totalDuration)}</span>
        <span class="badge badge-tokens">${totalTokens.toLocaleString()} tokens</span>
        <span class="badge badge-cost">$${totalCost.toFixed(4)}</span>
      </div>
    </header>

    <div class="trace-summary">
      <div class="summary-card">
        <div class="summary-label">Steps</div>
        <div class="summary-value">${steps.length}</div>
      </div>
      <div class="summary-card">
        <div class="summary-label">Duration</div>
        <div class="summary-value">${this._formatDuration(totalDuration)}</div>
      </div>
      <div class="summary-card">
        <div class="summary-label">Total Tokens</div>
        <div class="summary-value">${totalTokens.toLocaleString()}</div>
      </div>
      <div class="summary-card">
        <div class="summary-label">Total Cost</div>
        <div class="summary-value">$${totalCost.toFixed(4)}</div>
      </div>
    </div>

    <div class="timeline">
      ${steps
        .map((step, index) => this._renderStep(step, index, totalDuration))
        .join('\n')}
    </div>
  </div>
  ${this._getScript()}
</body>
</html>`;
  }

  private _renderStep(
    step: TraceStep,
    index: number,
    totalDuration: number,
  ): string {
    const duration = step.duration || 0;
    const widthPercent =
      totalDuration > 0
        ? Math.max((duration / totalDuration) * 100, 2)
        : 10;
    const statusClass = step.status === 'error' ? 'error' : step.status === 'timeout' ? 'timeout' : 'success';
    const stepIcon = this._getStepIcon(step.type);
    const stepTypeLabel = this._getStepTypeLabel(step);

    return `
      <div class="step step-${step.status}" data-step-id="${this._escapeHtml(step.id)}">
        <div class="step-header" onclick="toggleStep(this)">
          <div class="step-index">${index + 1}</div>
          <div class="step-main">
            <div class="step-type">
              <span class="step-icon">${stepIcon}</span>
              <span class="step-label">${stepTypeLabel}</span>
              <span class="step-status-badge ${statusClass}">${step.status}</span>
            </div>
            <div class="step-bar-track">
              <div class="step-bar-fill ${statusClass}" style="width: ${widthPercent}%"></div>
            </div>
            <div class="step-meta">
              <span class="step-duration">${this._formatDuration(duration)}</span>
              ${step.totalTokens ? `<span class="step-tokens">${step.totalTokens} tokens</span>` : ''}
              ${step.cost ? `<span class="step-cost">$${step.cost.toFixed(4)}</span>` : ''}
            </div>
          </div>
          <div class="step-expand">&#9660;</div>
        </div>
        <div class="step-details" style="display: none;">
          ${this._renderStepDetails(step)}
        </div>
      </div>`;
  }

  private _renderStepDetails(step: TraceStep): string {
    let details = '';

    if (step.error) {
      details += `
        <div class="detail-section error-section">
          <h4>Error</h4>
          <div class="error-badge">${this._escapeHtml(step.error.type)}</div>
          <pre class="error-message">${this._escapeHtml(step.error.message)}</pre>
          ${step.error.statusCode ? `<div class="error-code">Status: ${step.error.statusCode}</div>` : ''}
        </div>`;
    }

    if (step.llmRequest) {
      details += `
        <div class="detail-section">
          <h4>LLM Request</h4>
          <div class="field">
            <span class="field-label">Provider:</span>
            <span class="field-value">${this._escapeHtml(step.llmRequest.provider)}</span>
          </div>
          <div class="field">
            <span class="field-label">Model:</span>
            <span class="field-value">${this._escapeHtml(step.llmRequest.model)}</span>
          </div>
          <div class="field">
            <span class="field-label">Temperature:</span>
            <span class="field-value">${step.llmRequest.temperature}</span>
          </div>
          <div class="field">
            <span class="field-label">Max Tokens:</span>
            <span class="field-value">${step.llmRequest.maxTokens}</span>
          </div>
          <details class="messages-details">
            <summary>Messages (${step.llmRequest.messages.length})</summary>
            <div class="messages-list">
              ${step.llmRequest.messages
                .map(
                  (msg) => `
                <div class="message message-${msg.role}">
                  <span class="message-role">${msg.role}</span>
                  <pre class="message-content">${this._escapeHtml(msg.content || '(empty)')}</pre>
                </div>`,
                )
                .join('')}
            </div>
          </details>
        </div>`;
    }

    if (step.llmResponse) {
      details += `
        <div class="detail-section">
          <h4>LLM Response</h4>
          <div class="field">
            <span class="field-label">Finish Reason:</span>
            <span class="field-value">${this._escapeHtml(step.llmResponse.finishReason)}</span>
          </div>
          <div class="field">
            <span class="field-label">Model:</span>
            <span class="field-value">${this._escapeHtml(step.llmResponse.model)}</span>
          </div>
          <pre class="response-content">${this._escapeHtml(step.llmResponse.content || '(tool calls only)')}</pre>
          ${step.llmResponse.toolCalls && step.llmResponse.toolCalls.length > 0
            ? `
          <div class="tool-calls-list">
            ${step.llmResponse.toolCalls
              .map(
                (tc) => `
              <div class="tool-call">
                <span class="tool-call-name">${this._escapeHtml(tc.function.name)}</span>
                <pre class="tool-call-args">${this._escapeHtml(tc.function.arguments)}</pre>
              </div>`,
              )
              .join('')}
          </div>`
            : ''}
        </div>`;
    }

    if (step.toolRequest) {
      details += `
        <div class="detail-section">
          <h4>Tool Call</h4>
          <div class="field">
            <span class="field-label">Tool:</span>
            <span class="field-value">${this._escapeHtml(step.toolName || step.toolRequest.name)}</span>
          </div>
          <pre class="tool-args">${this._escapeHtml(JSON.stringify(step.toolRequest.arguments, null, 2))}</pre>
        </div>`;
    }

    if (step.toolResponse) {
      details += `
        <div class="detail-section">
          <h4>Tool Response</h4>
          <pre class="tool-result">${this._escapeHtml(JSON.stringify(step.toolResponse.result, null, 2))}</pre>
          ${step.toolResponse.error
            ? `<div class="error-message">Error: ${this._escapeHtml(step.toolResponse.error)}</div>`
            : ''}
        </div>`;
    }

    return details;
  }

  private _generateEmptyHtml(): string {
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>AgentBench Trace Viewer</title>
  ${this._getStyles()}
</head>
<body>
  <div class="empty-state">
    <div class="empty-icon">&#128269;</div>
    <h2>No Trace Selected</h2>
    <p>Run a test to view its execution trace, or use the <strong>AgentBench: View Trace</strong> command to select one.</p>
    <div class="empty-commands">
      <code>Cmd+Shift+P &rarr; AgentBench: View Trace</code>
      <code>agentbench test --project &lt;id&gt;</code>
    </div>
  </div>
</body>
</html>`;
  }

  // ---- Helpers ----

  private _getStepIcon(type: string): string {
    switch (type) {
      case 'llm_call':
        return '&#129302;'; // robot face
      case 'tool_call':
        return '&#128736;'; // wrench
      case 'response':
        return '&#128172;'; // speech bubble
      case 'error':
        return '&#9888;'; // warning
      default:
        return '&#9679;'; // circle
    }
  }

  private _getStepTypeLabel(step: TraceStep): string {
    switch (step.type) {
      case 'llm_call':
        return `LLM Call${step.llmModel ? ` (${step.llmModel})` : ''}`;
      case 'tool_call':
        return `Tool: ${step.toolName || 'unknown'}`;
      case 'response':
        return 'Response';
      case 'error':
        return 'Error';
      default:
        return step.type;
    }
  }

  private _formatDuration(ms: number): string {
    if (ms < 1000) {
      return `${ms}ms`;
    }
    if (ms < 60000) {
      return `${(ms / 1000).toFixed(1)}s`;
    }
    const minutes = Math.floor(ms / 60000);
    const seconds = ((ms % 60000) / 1000).toFixed(0);
    return `${minutes}m ${seconds}s`;
  }

  private _escapeHtml(str: string): string {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  // ---- Styles ----

  private _getStyles(): string {
    return `<style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }

    body {
      font-family: var(--vscode-font-family, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif);
      font-size: var(--vscode-font-size, 13px);
      color: var(--vscode-editor-foreground);
      background-color: var(--vscode-editor-background);
      padding: 0;
      line-height: 1.5;
    }

    .trace-container {
      max-width: 960px;
      margin: 0 auto;
      padding: 24px;
    }

    .trace-header {
      margin-bottom: 24px;
      padding-bottom: 16px;
      border-bottom: 1px solid var(--vscode-panel-border);
    }

    .trace-header h1 {
      font-size: 20px;
      font-weight: 600;
      margin-bottom: 8px;
    }

    .trace-meta {
      display: flex;
      gap: 8px;
      flex-wrap: wrap;
    }

    .badge {
      display: inline-flex;
      align-items: center;
      padding: 2px 8px;
      border-radius: 4px;
      font-size: 11px;
      font-weight: 500;
    }

    .badge-env {
      background-color: var(--vscode-badge-background);
      color: var(--vscode-badge-foreground);
    }

    .badge-steps {
      background-color: var(--vscode-textBlockQuote-background);
      color: var(--vscode-textBlockQuote-border);
    }

    .badge-duration {
      background-color: #e8f5e9;
      color: #2e7d32;
    }

    .badge-tokens {
      background-color: #e3f2fd;
      color: #1565c0;
    }

    .badge-cost {
      background-color: #fff3e0;
      color: #e65100;
    }

    .trace-summary {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
      gap: 12px;
      margin-bottom: 24px;
    }

    .summary-card {
      background-color: var(--vscode-editor-inactiveSelectionBackground);
      border: 1px solid var(--vscode-panel-border);
      border-radius: 6px;
      padding: 12px;
      text-align: center;
    }

    .summary-label {
      font-size: 11px;
      color: var(--vscode-descriptionForeground);
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-bottom: 4px;
    }

    .summary-value {
      font-size: 18px;
      font-weight: 600;
    }

    .timeline {
      display: flex;
      flex-direction: column;
      gap: 1px;
    }

    .step {
      border: 1px solid var(--vscode-panel-border);
      border-radius: 6px;
      overflow: hidden;
      background-color: var(--vscode-editor-background);
      transition: background-color 0.15s;
    }

    .step:hover {
      background-color: var(--vscode-list-hoverBackground);
    }

    .step-header {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 10px 14px;
      cursor: pointer;
      user-select: none;
    }

    .step-index {
      width: 28px;
      height: 28px;
      border-radius: 50%;
      background-color: var(--vscode-badge-background);
      color: var(--vscode-badge-foreground);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 12px;
      font-weight: 600;
      flex-shrink: 0;
    }

    .step-main {
      flex: 1;
      min-width: 0;
    }

    .step-type {
      display: flex;
      align-items: center;
      gap: 6px;
      margin-bottom: 4px;
    }

    .step-icon {
      font-size: 14px;
    }

    .step-label {
      font-weight: 500;
      font-size: 13px;
    }

    .step-status-badge {
      padding: 1px 6px;
      border-radius: 3px;
      font-size: 10px;
      font-weight: 600;
      text-transform: uppercase;
    }

    .step-status-badge.success {
      background-color: #e8f5e9;
      color: #2e7d32;
    }

    .step-status-badge.error {
      background-color: #ffebee;
      color: #c62828;
    }

    .step-status-badge.timeout {
      background-color: #fff3e0;
      color: #e65100;
    }

    .step-bar-track {
      height: 4px;
      background-color: var(--vscode-editor-inactiveSelectionBackground);
      border-radius: 2px;
      margin-bottom: 4px;
      overflow: hidden;
    }

    .step-bar-fill {
      height: 100%;
      border-radius: 2px;
      transition: width 0.3s ease;
    }

    .step-bar-fill.success {
      background-color: #4caf50;
    }

    .step-bar-fill.error {
      background-color: #f44336;
    }

    .step-bar-fill.timeout {
      background-color: #ff9800;
    }

    .step-meta {
      display: flex;
      gap: 12px;
      font-size: 11px;
      color: var(--vscode-descriptionForeground);
    }

    .step-expand {
      flex-shrink: 0;
      font-size: 10px;
      color: var(--vscode-descriptionForeground);
      transition: transform 0.2s;
    }

    .step-details {
      padding: 0 14px 14px 54px;
      border-top: 1px solid var(--vscode-panel-border);
    }

    .detail-section {
      margin-top: 12px;
      padding: 10px;
      background-color: var(--vscode-editor-inactiveSelectionBackground);
      border-radius: 4px;
    }

    .detail-section h4 {
      font-size: 12px;
      font-weight: 600;
      margin-bottom: 8px;
      color: var(--vscode-textLink-foreground);
    }

    .error-section {
      border-left: 3px solid #f44336;
    }

    .error-badge {
      display: inline-block;
      padding: 2px 8px;
      background-color: #ffebee;
      color: #c62828;
      border-radius: 3px;
      font-size: 11px;
      font-weight: 500;
      margin-bottom: 8px;
    }

    .error-message {
      padding: 8px;
      background-color: var(--vscode-inputValidation-errorBackground);
      color: var(--vscode-inputValidation-errorForeground);
      border: 1px solid var(--vscode-inputValidation-errorBorder);
      border-radius: 4px;
      font-size: 12px;
      white-space: pre-wrap;
      word-break: break-word;
    }

    .field {
      display: flex;
      gap: 8px;
      margin-bottom: 4px;
      font-size: 12px;
    }

    .field-label {
      color: var(--vscode-descriptionForeground);
      min-width: 100px;
    }

    .field-value {
      font-weight: 500;
    }

    .messages-details {
      margin-top: 8px;
    }

    .messages-details summary {
      cursor: pointer;
      font-size: 12px;
      color: var(--vscode-textLink-foreground);
    }

    .messages-list {
      margin-top: 8px;
      display: flex;
      flex-direction: column;
      gap: 6px;
      max-height: 300px;
      overflow-y: auto;
    }

    .message {
      padding: 8px;
      border-radius: 4px;
      border: 1px solid var(--vscode-panel-border);
    }

    .message-system {
      border-left: 3px solid #9e9e9e;
    }

    .message-user {
      border-left: 3px solid #42a5f5;
    }

    .message-assistant {
      border-left: 3px solid #66bb6a;
    }

    .message-tool {
      border-left: 3px solid #ffa726;
    }

    .message-role {
      font-size: 10px;
      font-weight: 600;
      text-transform: uppercase;
      color: var(--vscode-descriptionForeground);
      margin-bottom: 4px;
      display: block;
    }

    .message-content,
    .response-content,
    .tool-args,
    .tool-result {
      font-size: 12px;
      white-space: pre-wrap;
      word-break: break-word;
      font-family: var(--vscode-editor-font-family, monospace);
      background-color: var(--vscode-textCodeBlock-background);
      padding: 8px;
      border-radius: 4px;
      max-height: 200px;
      overflow-y: auto;
    }

    .tool-calls-list {
      margin-top: 8px;
      display: flex;
      flex-direction: column;
      gap: 6px;
    }

    .tool-call {
      padding: 8px;
      border: 1px solid var(--vscode-panel-border);
      border-radius: 4px;
      border-left: 3px solid #ffa726;
    }

    .tool-call-name {
      font-weight: 600;
      font-size: 12px;
    }

    .tool-call-args {
      margin-top: 4px;
      font-size: 11px;
    }

    .empty-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      padding: 40px;
      text-align: center;
    }

    .empty-icon {
      font-size: 48px;
      margin-bottom: 16px;
      opacity: 0.5;
    }

    .empty-state h2 {
      font-size: 18px;
      font-weight: 600;
      margin-bottom: 8px;
    }

    .empty-state p {
      font-size: 13px;
      color: var(--vscode-descriptionForeground);
      max-width: 400px;
      margin-bottom: 16px;
    }

    .empty-commands {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .empty-commands code {
      padding: 6px 12px;
      background-color: var(--vscode-textCodeBlock-background);
      border-radius: 4px;
      font-size: 12px;
    }
    </style>`;
  }

  // ---- Script ----

  private _getScript(): string {
    return `<script>
    function toggleStep(header) {
      const details = header.nextElementSibling;
      const expand = header.querySelector('.step-expand');
      if (details.style.display === 'none' || !details.style.display) {
        details.style.display = 'block';
        if (expand) expand.style.transform = 'rotate(180deg)';
      } else {
        details.style.display = 'none';
        if (expand) expand.style.transform = 'rotate(0deg)';
      }

      const stepId = header.parentElement.dataset.stepId;
      vscode.postMessage({ command: 'selectStep', stepId });
    }
    </script>`;
  }
}
