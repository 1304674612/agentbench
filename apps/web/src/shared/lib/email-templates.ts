/**
 * Email Templates
 *
 * Responsive, clean HTML email templates with AgentBench branding
 * (indigo/purple accent). Each template returns { subject, html, text }.
 */

import type { EmailTemplate } from './email'

// ============================================================
// Branding
// ============================================================

const BRAND_COLOR = '#6C5CE7' // indigo
const BRAND_GRADIENT_START = '#6C5CE7'
const BRAND_GRADIENT_END = '#A855F7'
const APP_NAME = 'AgentBench'
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://agentbench.dev'

// ============================================================
// Layout Wrapper
// ============================================================

function wrapLayout(title: string, content: string): { html: string; text: string } {
  const textContent = content.replace(/<[^>]*>/g, '')
  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin:0;padding:0;background-color:#0A0A0F;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#0A0A0F;padding:24px 0;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">
          <!-- Header -->
          <tr>
            <td style="padding:32px 24px;background:linear-gradient(135deg,${BRAND_GRADIENT_START},${BRAND_GRADIENT_END});border-radius:12px 12px 0 0;text-align:center;">
              <h1 style="margin:0;color:#FFFFFF;font-size:24px;font-weight:700;letter-spacing:-0.5px;">${APP_NAME}</h1>
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="background-color:#1A1A24;padding:32px 24px;border-radius:0 0 12px 12px;">
              <h2 style="margin:0 0 16px 0;color:#FFFFFF;font-size:18px;font-weight:600;">${title}</h2>
              ${content}
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="padding:16px 24px;text-align:center;">
              <p style="margin:0;color:#6B7280;font-size:12px;">
                ${APP_NAME} &mdash; The Regression Testing Framework for AI Agents
              </p>
              <p style="margin:8px 0 0 0;color:#4B5563;font-size:11px;">
                &copy; ${new Date().getFullYear()} ${APP_NAME}. All rights reserved.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`.trim()

  return { html, text: textContent }
}

// ============================================================
// Templates
// ============================================================

function statusBadgeColor(status: string): string {
  switch (status.toUpperCase()) {
    case 'PASSED':
      return '#10B981'
    case 'FAILED':
      return '#EF4444'
    case 'ERROR':
      return '#EF4444'
    case 'TIMEOUT':
      return '#F59E0B'
    case 'RUNNING':
      return '#3B82F6'
    case 'CANCELLED':
      return '#6B7280'
    default:
      return '#6B7280'
  }
}

// ============================================================
// Run Completed
// ============================================================

interface RunCompletedData {
  run: {
    id: string
    name: string
    status: string
    score?: number
    duration?: number
  }
}

export function runCompletedTemplate(data: RunCompletedData) {
  const { run } = data
  const badgeColor = statusBadgeColor(run.status)
  const durationStr = run.duration ? `${(run.duration / 1000).toFixed(1)}s` : 'N/A'
  const scoreStr = run.score != null ? `${run.score}` : 'N/A'
  const runUrl = `${APP_URL}/runs/${run.id}`

  const content = `
<table width="100%" cellpadding="0" cellspacing="0">
  <tr>
    <td style="padding-bottom:16px;">
      <p style="margin:0;color:#D1D5DB;font-size:14px;line-height:1.6;">
        Your run <strong style="color:#FFFFFF;">${escapeHtml(run.name)}</strong> has completed.
      </p>
    </td>
  </tr>
  <tr>
    <td style="padding-bottom:24px;">
      <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #2D2D3A;border-radius:8px;">
        <tr>
          <td style="padding:12px 16px;border-bottom:1px solid #2D2D3A;">
            <span style="color:#6B7280;font-size:12px;">Status</span><br>
            <span style="display:inline-block;margin-top:4px;padding:2px 10px;border-radius:9999px;font-size:12px;font-weight:600;background-color:${badgeColor}20;color:${badgeColor};">${run.status}</span>
          </td>
          <td style="padding:12px 16px;border-bottom:1px solid #2D2D3A;">
            <span style="color:#6B7280;font-size:12px;">Score</span><br>
            <span style="color:#FFFFFF;font-size:14px;font-weight:600;">${scoreStr}</span>
          </td>
          <td style="padding:12px 16px;border-bottom:1px solid #2D2D3A;">
            <span style="color:#6B7280;font-size:12px;">Duration</span><br>
            <span style="color:#FFFFFF;font-size:14px;font-weight:600;">${durationStr}</span>
          </td>
        </tr>
      </table>
    </td>
  </tr>
  <tr>
    <td style="text-align:center;">
      <a href="${runUrl}" style="display:inline-block;padding:10px 24px;background-color:${BRAND_COLOR};color:#FFFFFF;text-decoration:none;border-radius:8px;font-size:14px;font-weight:600;">View Run Details</a>
    </td>
  </tr>
</table>`

  const result = wrapLayout('Run Completed', content)
  return {
    subject: `[${APP_NAME}] Run "${run.name}" ${run.status}`,
    html: result.html,
    text: result.text,
  }
}

// ============================================================
// Regression Detected
// ============================================================

interface RegressionData {
  project: string
  metric: string
  before: number
  after: number
}

export function regressionDetectedTemplate(data: RegressionData) {
  const pctChange =
    data.before === 0
      ? data.after === 0
        ? 0
        : 100
      : Math.round(((data.after - data.before) / data.before) * 100)
  const direction = pctChange > 0 ? '+' : ''
  const isDegradation = pctChange < 0

  const content = `
<table width="100%" cellpadding="0" cellspacing="0">
  <tr>
    <td style="padding-bottom:16px;">
      <div style="background-color:#EF444415;border:1px solid #EF444430;border-radius:8px;padding:12px 16px;">
        <p style="margin:0;color:#EF4444;font-size:14px;font-weight:600;">
          &#9888; Regression detected in ${escapeHtml(data.project)}
        </p>
      </div>
    </td>
  </tr>
  <tr>
    <td style="padding-bottom:16px;">
      <p style="margin:0;color:#D1D5DB;font-size:14px;line-height:1.6;">
        A performance regression was detected in the metric <strong style="color:#FFFFFF;">${escapeHtml(data.metric)}</strong>.
      </p>
    </td>
  </tr>
  <tr>
    <td style="padding-bottom:24px;">
      <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #2D2D3A;border-radius:8px;">
        <tr>
          <td style="padding:12px 16px;border-bottom:1px solid #2D2D3A;">
            <span style="color:#6B7280;font-size:12px;">Before</span><br>
            <span style="color:#10B981;font-size:16px;font-weight:600;">${data.before}</span>
          </td>
          <td style="padding:12px 16px;border-bottom:1px solid #2D2D3A;">
            <span style="color:#6B7280;font-size:12px;">After</span><br>
            <span style="color:#EF4444;font-size:16px;font-weight:600;">${data.after}</span>
          </td>
          <td style="padding:12px 16px;border-bottom:1px solid #2D2D3A;">
            <span style="color:#6B7280;font-size:12px;">Change</span><br>
            <span style="color:${isDegradation ? '#EF4444' : '#10B981'};font-size:16px;font-weight:600;">${direction}${pctChange}%</span>
          </td>
        </tr>
      </table>
    </td>
  </tr>
  <tr>
    <td style="text-align:center;">
      <a href="${APP_URL}/projects" style="display:inline-block;padding:10px 24px;background-color:${BRAND_COLOR};color:#FFFFFF;text-decoration:none;border-radius:8px;font-size:14px;font-weight:600;">Investigate Regression</a>
    </td>
  </tr>
</table>`

  const result = wrapLayout('Regression Detected', content)
  return {
    subject: `[${APP_NAME}] Regression detected in ${data.project}`,
    html: result.html,
    text: result.text,
  }
}

// ============================================================
// Usage Alert
// ============================================================

interface UsageAlertData {
  usage: {
    current: number
    limit: number
    period: string
  }
}

export function usageAlertTemplate(data: UsageAlertData) {
  const pct = Math.round((data.usage.current / data.usage.limit) * 100)
  const isOverLimit = data.usage.current >= data.usage.limit
  const alertColor = pct >= 90 ? '#EF4444' : pct >= 75 ? '#F59E0B' : '#3B82F6'

  const content = `
<table width="100%" cellpadding="0" cellspacing="0">
  <tr>
    <td style="padding-bottom:16px;">
      <div style="background-color:${alertColor}15;border:1px solid ${alertColor}30;border-radius:8px;padding:12px 16px;">
        <p style="margin:0;color:${alertColor};font-size:14px;font-weight:600;">
          ${isOverLimit ? '&#9888; Usage limit reached' : '&#8505; Usage approaching limit'}
        </p>
      </div>
    </td>
  </tr>
  <tr>
    <td style="padding-bottom:16px;">
      <p style="margin:0;color:#D1D5DB;font-size:14px;line-height:1.6;">
        You have used <strong style="color:#FFFFFF;">${data.usage.current.toLocaleString()}</strong>
        out of <strong style="color:#FFFFFF;">${data.usage.limit.toLocaleString()}</strong>
        runs for the ${escapeHtml(data.usage.period)} period.
      </p>
    </td>
  </tr>
  <tr>
    <td style="padding-bottom:16px;">
      <!-- Progress bar -->
      <table width="100%" cellpadding="0" cellspacing="0">
        <tr>
          <td style="background-color:#2D2D3A;border-radius:9999px;height:8px;overflow:hidden;">
            <div style="background:linear-gradient(90deg,${BRAND_GRADIENT_START},${BRAND_GRADIENT_END});height:8px;border-radius:9999px;width:${Math.min(100, pct)}%;"></div>
          </td>
        </tr>
      </table>
    </td>
  </tr>
  <tr>
    <td style="text-align:center;padding-bottom:8px;">
      <span style="color:#6B7280;font-size:13px;">${pct}% of limit</span>
    </td>
  </tr>
  <tr>
    <td style="text-align:center;">
      <a href="${APP_URL}/settings/billing" style="display:inline-block;padding:10px 24px;background-color:${BRAND_COLOR};color:#FFFFFF;text-decoration:none;border-radius:8px;font-size:14px;font-weight:600;">Manage Usage</a>
    </td>
  </tr>
</table>`

  const result = wrapLayout('Usage Alert', content)
  return {
    subject: `[${APP_NAME}] Usage alert: ${pct}% of ${data.usage.period} limit`,
    html: result.html,
    text: result.text,
  }
}

// ============================================================
// Welcome
// ============================================================

interface WelcomeData {
  user: {
    name: string
  }
}

export function welcomeTemplate(data: WelcomeData) {
  const content = `
<table width="100%" cellpadding="0" cellspacing="0">
  <tr>
    <td style="padding-bottom:16px;">
      <p style="margin:0;color:#D1D5DB;font-size:14px;line-height:1.6;">
        Welcome to ${APP_NAME}, <strong style="color:#FFFFFF;">${escapeHtml(data.user.name)}</strong>!
        We are excited to have you on board.
      </p>
    </td>
  </tr>
  <tr>
    <td style="padding-bottom:24px;">
      <p style="margin:0;color:#D1D5DB;font-size:14px;line-height:1.6;">
        ${APP_NAME} helps you ensure your AI agents behave reliably over time.
        Set up your first project, create test cases, and start running evaluations against your agents.
      </p>
    </td>
  </tr>
  <tr>
    <td style="padding-bottom:24px;">
      <table width="100%" cellpadding="0" cellspacing="0">
        <tr>
          <td style="padding-bottom:8px;">
            <span style="color:#6B7280;font-size:12px;">&#10003; Create test suites for your agents</span>
          </td>
        </tr>
        <tr>
          <td style="padding-bottom:8px;">
            <span style="color:#6B7280;font-size:12px;">&#10003; Run evaluations with AI-powered judgment</span>
          </td>
        </tr>
        <tr>
          <td style="padding-bottom:8px;">
            <span style="color:#6B7280;font-size:12px;">&#10003; Detect regressions before they reach production</span>
          </td>
        </tr>
        <tr>
          <td style="padding-bottom:8px;">
            <span style="color:#6B7280;font-size:12px;">&#10003; Compare agent performance across versions</span>
          </td>
        </tr>
      </table>
    </td>
  </tr>
  <tr>
    <td style="text-align:center;">
      <a href="${APP_URL}/dashboard" style="display:inline-block;padding:10px 24px;background-color:${BRAND_COLOR};color:#FFFFFF;text-decoration:none;border-radius:8px;font-size:14px;font-weight:600;">Get Started</a>
    </td>
  </tr>
</table>`

  const result = wrapLayout('Welcome to AgentBench', content)
  return {
    subject: `Welcome to ${APP_NAME}, ${data.user.name}!`,
    html: result.html,
    text: result.text,
  }
}

// ============================================================
// Template Renderer
// ============================================================

/**
 * Render a template by name with the provided data.
 * Returns { subject, html, text } for use by the email service.
 */
export function renderTemplate(
  template: EmailTemplate,
  data: Record<string, unknown>
): { subject: string; html: string; text: string } {
  switch (template) {
    case 'run_completed':
      return runCompletedTemplate(data as unknown as RunCompletedData)
    case 'regression_detected':
      return regressionDetectedTemplate(data as unknown as RegressionData)
    case 'usage_alert':
      return usageAlertTemplate(data as unknown as UsageAlertData)
    case 'welcome':
      return welcomeTemplate(data as unknown as WelcomeData)
    default:
      throw new Error(`Unknown email template: ${template}`)
  }
}

// ============================================================
// Utilities
// ============================================================

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}
