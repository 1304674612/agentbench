/**
 * Email Service
 *
 * Sends transactional emails via nodemailer (SMTP) in production,
 * with a "console" transport fallback for development when SMTP_HOST is unset.
 */

import type { Transporter } from 'nodemailer'
import nodemailer from 'nodemailer'

// ============================================================
// Types
// ============================================================

export interface EmailOptions {
  to: string
  subject: string
  html: string
  text?: string
}

export type EmailTemplate = 'run_completed' | 'regression_detected' | 'usage_alert' | 'welcome'

// ============================================================
// Transporter — lazy singleton
// ============================================================

let _transporter: Transporter | null = null

function getTransporter(): Transporter {
  if (_transporter) return _transporter

  const host = process.env.SMTP_HOST
  if (!host) {
    // Development mode — log emails to console
    _transporter = nodemailer.createTransport({
      streamTransport: true,
      buffer: true,
      newline: 'unix',
    })
    return _transporter
  }

  _transporter = nodemailer.createTransport({
    host,
    port: parseInt(process.env.SMTP_PORT || '587', 10),
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
      user: process.env.SMTP_USER || '',
      pass: process.env.SMTP_PASS || '',
    },
  })

  return _transporter
}

// ============================================================
// Send Email
// ============================================================

/**
 * Send an email with HTML content.
 *
 * Falls back to console logging in development (when SMTP_HOST is unset).
 * Uses EMAIL_FROM env var as the sender; falls back to 'noreply@agentbench.dev'.
 */
export async function sendEmail(options: EmailOptions): Promise<void> {
  const from = process.env.EMAIL_FROM || 'AgentBench <noreply@agentbench.dev>'

  try {
    const transporter = getTransporter()
    const isConsoleMode = !process.env.SMTP_HOST

    if (isConsoleMode) {
      console.log('========================================')
      console.log('[EMAIL] DEV MODE — no SMTP_HOST configured')
      console.log(`[EMAIL] From: ${from}`)
      console.log(`[EMAIL] To: ${options.to}`)
      console.log(`[EMAIL] Subject: ${options.subject}`)
      console.log(`[EMAIL] Body (text): ${options.text ?? '(no plain text)'}`)
      console.log(`[EMAIL] Body (HTML): ${options.html.slice(0, 500)}...`)
      console.log('========================================')
    }

    await transporter.sendMail({
      from,
      to: options.to,
      subject: options.subject,
      text: options.text,
      html: options.html,
    })
  } catch (error) {
    console.error('[EMAIL] Failed to send email:', error)
    // Swallow — don't let email failures break the app
  }
}

/**
 * Send a transactional email using a predefined template.
 *
 * Templates are loaded from `email-templates.ts`.
 */
export async function sendTransactionalEmail(
  to: string,
  template: EmailTemplate,
  data: Record<string, unknown>
): Promise<void> {
  // Dynamically import templates to avoid circular dependency at module level
  const { renderTemplate } = await import('./email-templates')

  const { subject, html, text } = renderTemplate(template, data)

  await sendEmail({
    to,
    subject,
    html,
    text,
  })
}
