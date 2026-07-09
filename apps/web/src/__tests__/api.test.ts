/**
 * API Integration Tests
 *
 * These tests require:
 * - DATABASE_URL set to a test PostgreSQL instance
 * - Server running on localhost:3000
 *
 * Run with: pnpm test:api
 */

const BASE = process.env.TEST_API_URL ?? 'http://localhost:3000/api/v1'

async function apiFetch(path: string, options?: RequestInit) {
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'Content-Type': 'application/json', ...options?.headers },
    ...options,
  })
  const body = await res.json().catch(() => ({}))
  return { status: res.status, body }
}

// Test state — shared across test cases
const state: Record<string, string> = {}

export function runAPITests() {
  console.log(`\n🧪 API Integration Tests — ${BASE}\n`)

  let passed = 0
  let failed = 0

  async function test(name: string, fn: () => Promise<void>) {
    try {
      await fn()
      console.log(`  ✅ ${name}`)
      passed++
    } catch (err) {
      console.log(`  ❌ ${name}`)
      console.log(`     ${err instanceof Error ? err.message : String(err)}`)
      failed++
    }
  }

  async function run() {
    // === Project CRUD ===
    await test('Create Project', async () => {
      const { status, body } = await apiFetch('/projects', {
        method: 'POST',
        body: JSON.stringify({ name: 'Test Project', slug: 'test-project-' + Date.now() }),
      })
      if (status !== 201) throw new Error(`Expected 201, got ${status}: ${JSON.stringify(body)}`)
      if (!body.id) throw new Error('Missing project id')
      state.projectId = body.id
    })

    await test('List Projects', async () => {
      const { body } = await apiFetch('/projects')
      if (!Array.isArray(body.projects)) throw new Error('Missing projects array')
    })

    // === Test Suite ===
    await test('Create Test Suite', async () => {
      const { status, body } = await apiFetch('/suites', {
        method: 'POST',
        body: JSON.stringify({ projectId: state.projectId, name: 'API Test Suite' }),
      })
      if (status !== 201) throw new Error(`Expected 201, got ${status}`)
      state.suiteId = body.id
    })

    // === Test Case ===
    await test('Create Test Case with assertions', async () => {
      const { status, body } = await apiFetch(`/suites/${state.suiteId}/cases`, {
        method: 'POST',
        body: JSON.stringify({
          name: 'API Test Case',
          agentConfig: { provider: 'openai', model: 'gpt-4o', temperature: 0.7, maxTokens: 4096, systemPrompt: 'Test' },
          input: { messages: [{ role: 'user', content: 'Hello' }] },
          tags: ['test'],
          assertions: [{ type: 'contains', params: { substring: 'hello' } }],
          evaluators: [{ type: 'RULE_BASED', config: {} }],
        }),
      })
      if (status !== 201) throw new Error(`Expected 201, got ${status}: ${JSON.stringify(body)}`)
      state.caseId = body.id
    })

    // === Run ===
    await test('Create Run', async () => {
      const { status, body } = await apiFetch('/runs', {
        method: 'POST',
        body: JSON.stringify({
          projectId: state.projectId,
          testCaseId: state.caseId,
          name: 'API Test Run',
          config: {
            agent: { provider: 'openai', model: 'gpt-4o', temperature: 0.7, maxTokens: 4096, systemPrompt: 'Test' },
            input: { messages: [{ role: 'user', content: 'Hello' }] },
            options: { timeout: 30000, maxSteps: 5, retries: 1, concurrency: 1 },
          },
          tags: ['test'],
        }),
      })
      if (status !== 201) throw new Error(`Expected 201, got ${status}`)
      state.runId = body.id
    })

    await test('Update Run (simulate completion)', async () => {
      const { status } = await apiFetch(`/runs/${state.runId}`, {
        method: 'PATCH',
        body: JSON.stringify({
          status: 'PASSED',
          metrics: {
            totalTokens: 1500, promptTokens: 600, completionTokens: 900,
            totalCost: 0.002, totalLatency: 1500, stepCount: 2,
            llmCallCount: 1, toolCallCount: 1, toolSuccessCount: 1, toolFailureCount: 0,
          },
          duration: 1500,
        }),
      })
      if (status !== 200) throw new Error(`Expected 200, got ${status}`)
    })

    // === Evaluate ===
    await test('Evaluate Run', async () => {
      const { status, body } = await apiFetch(`/runs/${state.runId}/evaluate`, {
        method: 'POST',
        body: JSON.stringify({
          rules: [
            { type: 'contains', params: { substring: 't' } },
            { type: 'tokens_lt', params: { threshold: 3000 } },
            { type: 'latency_lt', params: { threshold: 10000 } },
          ],
          force: true,
        }),
      })
      if (status !== 200) throw new Error(`Expected 200, got ${status}: ${JSON.stringify(body)}`)
      if (!body.summary) throw new Error('Missing evaluation summary')
    })

    // === Snapshot ===
    await test('Create Snapshot', async () => {
      const { status, body } = await apiFetch(`/projects/${state.projectId}/snapshots`, {
        method: 'POST',
        body: JSON.stringify({
          name: 'API Test Snapshot',
          type: 'MANUAL',
          runId: state.runId,
          data: {
            agent: { name: 'Test', config: {} },
            prompt: { system: '', variables: {} },
            model: { provider: 'openai', name: 'gpt-4o', temperature: 0.7, maxTokens: 4096 },
            tools: [],
            context: { messages: [] },
            input: { messages: [] },
            options: { timeout: 30000, maxSteps: 5, retries: 1, concurrency: 1 },
            environment: { os: 'test', runtime: 'test', dependencies: {} },
          },
        }),
      })
      if (status !== 201) throw new Error(`Expected 201, got ${status}`)
      state.snapId = body.id
    })

    // === Replay ===
    await test('Replay Run', async () => {
      const { status, body } = await apiFetch(`/runs/${state.runId}/replay`, {
        method: 'POST',
        body: JSON.stringify({ mode: 'cross_model', model: 'claude-sonnet-5' }),
      })
      if (status !== 201) throw new Error(`Expected 201, got ${status}: ${JSON.stringify(body)}`)
    })

    // === Compare ===
    await test('Compare Runs', async () => {
      const { body } = await apiFetch('/compare', {
        method: 'POST',
        body: JSON.stringify({ runAId: state.runId, runBId: state.runId }),
      })
      if (!body.runA) throw new Error('Missing runA in comparison')
    })

    // === Reports ===
    for (const format of ['json', 'markdown', 'html', 'junit']) {
      await test(`Report — ${format}`, async () => {
        const res = await fetch(`${BASE}/reports?runId=${state.runId}&format=${format}`)
        if (res.status !== 200) throw new Error(`Expected 200, got ${res.status}`)
      })
    }

    // === Coverage ===
    await test('Coverage Report', async () => {
      const { body } = await apiFetch(`/projects/${state.projectId}/coverage`)
      if (body.overall === undefined) throw new Error('Missing overall coverage')
    })

    // === Edge Cases ===
    await test('400 on missing fields', async () => {
      const { status } = await apiFetch('/runs', { method: 'POST', body: '{}' })
      if (status !== 400) throw new Error(`Expected 400, got ${status}`)
    })

    await test('404 on not found', async () => {
      const res = await fetch(`${BASE}/runs/does-not-exist`)
      if (res.status !== 404) throw new Error(`Expected 404, got ${res.status}`)
    })

    await test('Webhook trigger', async () => {
      const { status, body } = await apiFetch('/webhooks', {
        method: 'POST',
        headers: { 'X-Webhook-Source': 'ci' },
        body: JSON.stringify({ projectId: state.projectId, trigger: 'test' }),
      })
      if (status !== 200) throw new Error(`Expected 200, got ${status}: ${JSON.stringify(body)}`)
    })

    await test('Dataset list', async () => {
      const { body } = await apiFetch(`/projects/${state.projectId}/datasets`)
      if (!body.datasets) throw new Error('Missing datasets')
    })

    console.log(`\n  ${passed} passed, ${failed} failed (${Math.round(passed / (passed + failed) * 100)}%)\n`)
  }

  return run()
}

// Auto-run when executed directly
runAPITests()
