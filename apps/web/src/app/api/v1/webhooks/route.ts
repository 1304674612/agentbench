import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/shared/lib/db'

/**
 * Webhook endpoint for CI/CD integration.
 *
 * Supports:
 * - GitHub Actions
 * - GitLab CI
 * - Generic CI webhooks
 *
 * Headers:
 * - X-Webhook-Source: "github" | "gitlab" | "ci"
 * - X-Webhook-Secret: shared secret for verification
 */

export async function POST(req: NextRequest) {
  try {
    const source = req.headers.get('x-webhook-source') ?? 'ci'
    const secret = req.headers.get('x-webhook-secret')

    // Verify secret if configured
    const webhookSecret = process.env.WEBHOOK_SECRET
    if (webhookSecret && secret !== webhookSecret) {
      return NextResponse.json({ error: 'Invalid webhook secret' }, { status: 401 })
    }

    const body = await req.json() as Record<string, unknown>

    switch (source) {
      case 'github': {
        const result = await handleGitHubWebhook(body)
        return NextResponse.json(result)
      }
      case 'gitlab': {
        const result = await handleGitLabWebhook(body)
        return NextResponse.json(result)
      }
      default: {
        const result = await handleGenericWebhook(body)
        return NextResponse.json(result)
      }
    }
  } catch (error) {
    console.error('Webhook error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

async function handleGitHubWebhook(body: Record<string, unknown>): Promise<Record<string, unknown>> {
  const action = body.action as string
  const pullRequest = body.pull_request as Record<string, unknown> | undefined

  if (action === 'opened' || action === 'synchronize') {
    // Trigger test run for PR
    if (pullRequest) {
      // Find project by name/repo
      const repoName = (body.repository as Record<string, unknown>)?.full_name as string
      const project = await db.project.findFirst({ where: { name: repoName } })

      if (project) {
        // Create a CI-triggered run
        const run = await db.run.create({
          data: {
            projectId: project.id,
            name: `CI: PR #${pullRequest.number ?? '?'} — ${pullRequest.title ?? ''}`,
            config: {},
            tags: ['ci', 'github', `pr:${pullRequest.number ?? '?'}`],
          },
        })

        return { triggered: true, runId: run.id, message: `CI run created for PR #${pullRequest.number ?? '?'}` }
      }

      return { triggered: false, message: `No project found for repo: ${repoName}` }
    }
  }

  return { received: true, action }
}

async function handleGitLabWebhook(body: Record<string, unknown>): Promise<Record<string, unknown>> {
  const objectKind = body.object_kind as string
  const projectInfo = body.project as Record<string, unknown> | undefined
  const projectName = projectInfo?.name as string

  if (objectKind === 'merge_request' || objectKind === 'push') {
    if (projectName) {
      const project = await db.project.findFirst({ where: { name: projectName } })

      if (project) {
        const run = await db.run.create({
          data: {
            projectId: project.id,
            name: `CI: ${objectKind === 'merge_request' ? 'MR' : 'Push'} on ${projectName}`,
            config: {},
            tags: ['ci', 'gitlab'],
          },
        })

        return { triggered: true, runId: run.id }
      }
    }
  }

  return { received: true, object_kind: objectKind }
}

async function handleGenericWebhook(body: Record<string, unknown>): Promise<Record<string, unknown>> {
  const projectId = body.projectId as string
  const trigger = (body.trigger ?? 'manual') as string

  if (projectId) {
    const run = await db.run.create({
      data: {
        projectId,
        name: `CI: ${trigger}`,
        config: body.config ?? {},
        tags: ['ci', trigger],
      },
    })

    return { triggered: true, runId: run.id }
  }

  return { triggered: false, message: 'projectId required in body' }
}
