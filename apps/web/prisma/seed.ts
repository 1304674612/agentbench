/**
 * AgentBench — Database Seed Script
 *
 * Populates the database with demo data: a user, project, test suites,
 * test cases, runs with realistic trace steps and scores, experiments,
 * snapshots, and datasets.
 *
 * Usage: pnpm db:seed
 */

import {
  PrismaClient,
  RunStatus,
  TraceStepType,
  StepStatus,
  AssertionStatus,
  ExperimentStatus,
  ExperimentConclusion,
  EvaluatorType,
  SnapshotType,
  DatasetFormat,
  TestCaseStatus,
  type Prisma,
} from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('Seeding AgentBench database...\n')

  // ------------------------------------------------------------------
  // 1. Admin User
  // ------------------------------------------------------------------
  console.log('  Creating admin user...')
  const passwordHash = await bcrypt.hash('password123', 12)
  const user = await prisma.user.upsert({
    where: { email: 'admin@agentbench.dev' },
    update: {},
    create: {
      email: 'admin@agentbench.dev',
      name: 'Admin',
      passwordHash,
      status: 'ACTIVE',
    },
  })
  console.log(`    + User: ${user.email} (${user.id})`)

  // ------------------------------------------------------------------
  // 2. Demo User
  // ------------------------------------------------------------------
  console.log('  Creating demo user...')
  const demoPasswordHash = await bcrypt.hash('demopass123', 10)
  const demoUser = await prisma.user.upsert({
    where: { email: 'demo@agentbench.dev' },
    update: {},
    create: {
      email: 'demo@agentbench.dev',
      name: 'Demo User',
      passwordHash: demoPasswordHash,
      status: 'ACTIVE',
    },
  })
  console.log(`    + User: ${demoUser.email} (${demoUser.id})`)

  // ------------------------------------------------------------------
  // 3. Demo Project
  // ------------------------------------------------------------------
  console.log('  Creating demo project...')
  const project = await prisma.project.upsert({
    where: { id: 'demo-project' },
    update: {},
    create: {
      id: 'demo-project',
      name: 'Demo Project',
      slug: 'demo-project',
      description:
        'A sample project showcasing AgentBench features — test suites, runs, experiments, and snapshots.',
      plan: 'COMMUNITY',
      ownerId: demoUser.id,
      settings: {
        defaultModel: 'gpt-4o',
        defaultJudge: 'gpt-4o-mini',
        regressionThresholds: {
          scoreDrop: 0.5,
          tokenIncreasePercent: 20,
          latencyIncreasePercent: 30,
          costIncreasePercent: 25,
        },
        notifications: {
          onRunComplete: true,
          onRegression: true,
          onError: true,
          channels: ['email', 'in_app'],
        },
        storage: { provider: 'local' },
      },
    },
  })
  console.log(`    + Project: ${project.name} (${project.id})`)

  // ------------------------------------------------------------------
  // 4. Test Suites & Test Cases
  // ------------------------------------------------------------------
  console.log('  Creating test suites and cases...')

  // Suite 1: Greeting
  const greetingSuite = await prisma.testSuite.create({
    data: {
      id: 'suite-greeting',
      projectId: project.id,
      name: 'Greeting Tests',
      description: 'Verify agent responds with friendly, professional greetings',
      sortOrder: 1,
    },
  })

  await prisma.testCase.createMany({
    data: [
      {
        suiteId: greetingSuite.id,
        name: 'should respond to hello with a friendly greeting',
        description:
          'Agent receives "Hello" and responds with a warm greeting that invites further conversation',
        status: 'ACTIVE',
        agentConfig: {
          provider: 'openai',
          model: 'gpt-4o',
          temperature: 0.7,
          maxTokens: 1024,
          systemPrompt: 'You are a friendly customer support agent. Greet customers warmly.',
        },
        input: { messages: [{ role: 'user', content: 'Hello' }] },
        options: { timeout: 15000, maxSteps: 3 },
        tags: ['greeting', 'smoke'],
        sortOrder: 1,
      },
      {
        suiteId: greetingSuite.id,
        name: 'should respond to non-English greeting gracefully',
        description: 'Agent receives "Bonjour" and responds politely',
        status: 'ACTIVE',
        agentConfig: {
          provider: 'openai',
          model: 'gpt-4o',
          temperature: 0.7,
          maxTokens: 1024,
          systemPrompt: 'You are a customer support agent. Respond politely in English.',
        },
        input: { messages: [{ role: 'user', content: 'Bonjour' }] },
        options: { timeout: 15000, maxSteps: 3 },
        tags: ['greeting', 'i18n'],
        sortOrder: 2,
      },
    ],
  })

  // Assertions for greeting test case
  const greetingCases = await prisma.testCase.findMany({ where: { suiteId: greetingSuite.id } })
  const greetingCase = greetingCases[0]
  if (greetingCase) {
    await prisma.testAssertion.createMany({
      data: [
        { testCaseId: greetingCase.id, type: 'completed_successfully', params: {}, sortOrder: 1 },
        { testCaseId: greetingCase.id, type: 'tokens_lt', params: { threshold: 1000 }, sortOrder: 2 },
        { testCaseId: greetingCase.id, type: 'latency_lt', params: { threshold: 10000 }, sortOrder: 3 },
      ],
    })
    await prisma.testEvaluator.create({
      data: {
        testCaseId: greetingCase.id,
        type: 'RULE_BASED',
        config: { rules: [{ type: 'contains', params: { substring: 'hello' } }] },
        sortOrder: 1,
      },
    })
  }

  // Suite 2: Policy Accuracy
  const policySuite = await prisma.testSuite.create({
    data: {
      id: 'suite-policy',
      projectId: project.id,
      name: 'Policy Accuracy Tests',
      description: 'Verify agent correctly explains company policies from the knowledge base',
      sortOrder: 2,
    },
  })

  await prisma.testCase.createMany({
    data: [
      {
        suiteId: policySuite.id,
        name: 'should explain 30-day refund policy correctly',
        description:
          'Agent looks up and accurately communicates the 30-day money-back guarantee',
        status: 'ACTIVE',
        agentConfig: {
          provider: 'openai',
          model: 'gpt-4o',
          temperature: 0.3,
          maxTokens: 2048,
          systemPrompt:
            'You are a customer support agent. Use tools to look up policies before answering.',
        },
        input: {
          messages: [{ role: 'user', content: 'Can I get a refund for my purchase last week?' }],
        },
        options: { timeout: 30000, maxSteps: 5 },
        tags: ['policy', 'refund', 'tools'],
        sortOrder: 1,
      },
      {
        suiteId: policySuite.id,
        name: 'should use search_knowledge_base tool for policy questions',
        description:
          'Agent must call the knowledge base tool, not just answer from memory',
        status: 'ACTIVE',
        agentConfig: {
          provider: 'openai',
          model: 'gpt-4o',
          temperature: 0.3,
          maxTokens: 2048,
          systemPrompt:
            'You are a support agent. Always search the knowledge base before answering policy questions.',
        },
        input: {
          messages: [{ role: 'user', content: 'What is your cancellation policy?' }],
        },
        options: { timeout: 30000, maxSteps: 5 },
        tags: ['policy', 'tools', 'tool-use'],
        sortOrder: 2,
      },
    ],
  })

  const policyCases = await prisma.testCase.findMany({ where: { suiteId: policySuite.id } })
  for (const tc of policyCases) {
    await prisma.testAssertion.createMany({
      data: [
        {
          testCaseId: tc.id,
          type: 'tool_called',
          params: { tool: 'search_knowledge_base' },
          sortOrder: 1,
        },
        { testCaseId: tc.id, type: 'contains', params: { substring: 'refund' }, sortOrder: 2 },
      ],
    })
    await prisma.testEvaluator.create({
      data: {
        testCaseId: tc.id,
        type: 'LLM_JUDGE',
        config: {
          provider: 'openai',
          model: 'gpt-4o-mini',
          dimensions: ['correctness', 'completeness'],
        },
        sortOrder: 1,
      },
    })
  }

  // Suite 3: Escalation
  const escalationSuite = await prisma.testSuite.create({
    data: {
      id: 'suite-escalation',
      projectId: project.id,
      name: 'Escalation Tests',
      description: 'Verify agent escalates appropriately when it cannot handle a request',
      sortOrder: 3,
    },
  })

  await prisma.testCase.create({
    data: {
      suiteId: escalationSuite.id,
      name: 'should escalate sensitive legal/compliance requests',
      description:
        'Agent should escalate data deletion and legal compliance requests to a human',
      status: 'ACTIVE',
      agentConfig: {
        provider: 'openai',
        model: 'gpt-4o',
        temperature: 0.3,
        maxTokens: 2048,
        systemPrompt:
          'You are a support agent. Escalate legal, compliance, or data-deletion requests to a human.',
      },
      input: {
        messages: [
          { role: 'user', content: 'I need to delete all user data due to a legal order.' },
        ],
      },
      options: { timeout: 30000, maxSteps: 5 },
      tags: ['escalation', 'compliance'],
      sortOrder: 1,
    },
  })

  const escalationCases = await prisma.testCase.findMany({
    where: { suiteId: escalationSuite.id },
  })
  for (const tc of escalationCases) {
    await prisma.testAssertion.createMany({
      data: [
        {
          testCaseId: tc.id,
          type: 'tool_called',
          params: { tool: 'escalate_to_human' },
          sortOrder: 1,
        },
        {
          testCaseId: tc.id,
          type: 'tool_not_called',
          params: { tool: 'hallucinate' },
          sortOrder: 2,
        },
      ],
    })
  }

  console.log('    + 3 test suites, 5 test cases created')

  // ------------------------------------------------------------------
  // 5. Sample Runs with Trace Steps and Scores
  // ------------------------------------------------------------------
  console.log('  Creating sample runs with realistic trace data...')

  const allCases = await prisma.testCase.findMany({ where: { projectId: project.id } })

  // Helper: create a run with trace steps, scores, assertion results
  async function createSampleRun(
    testCase: { id: string },
    name: string,
    status: RunStatus,
    data: {
      duration?: number
      totalTokens?: number
      totalCost?: number
      error?: string
      steps: Array<{
        type: TraceStepType
        stepStatus: StepStatus
        toolName?: string
        llmModel?: string
        content?: string
        promptTokens?: number
        completionTokens?: number
        durationMs: number
        error?: string
      }>
      scores?: Array<{
        evaluator: string
        score: number
        maxScore: number
        reason: string
        judgeModel?: string
      }>
      assertionResults?: Array<{
        type: string
        status: AssertionStatus
        message?: string
      }>
    },
  ) {
    const startedAt = new Date(Date.now() - (data.duration ?? 5000))
    const endedAt = new Date()

    const run = await prisma.run.create({
      data: {
        projectId: project.id,
        testCaseId: testCase.id,
        userId: demoUser.id,
        name,
        status,
        config: {
          agent: {
            provider: 'openai',
            model: 'gpt-4o',
            temperature: 0.7,
            maxTokens: 4096,
          },
          input: { messages: [{ role: 'user', content: 'Hello' }] },
          options: { timeout: 30000, maxSteps: 10, retries: 1 },
        },
        metrics: {
          totalTokens: data.totalTokens ?? 500,
          promptTokens: Math.floor((data.totalTokens ?? 500) * 0.6),
          completionTokens: Math.floor((data.totalTokens ?? 500) * 0.4),
          totalCost: data.totalCost ?? 0.015,
          totalLatency: data.duration ?? 5000,
          firstTokenLatency: Math.floor((data.duration ?? 5000) * 0.3),
          toolCallCount: data.steps.filter((s) => s.type === 'TOOL_CALL').length,
          toolSuccessCount: data.steps.filter(
            (s) => s.type === 'TOOL_CALL' && s.stepStatus === 'SUCCESS',
          ).length,
          toolFailureCount: data.steps.filter(
            (s) => s.type === 'TOOL_CALL' && s.stepStatus !== 'SUCCESS',
          ).length,
          stepCount: data.steps.length,
          llmCallCount: data.steps.filter((s) => s.type === 'LLM_CALL').length,
        },
        startedAt,
        endedAt,
        duration: data.duration ?? 5000,
        summary:
          status === 'PASSED'
            ? `Completed in ${data.steps.length} steps, ${data.totalTokens ?? 500} tokens, $${(data.totalCost ?? 0.015).toFixed(4)}`
            : `Failed: ${data.error ?? 'Unknown error'}`,
        error: data.error,
        tags: ['seed-data', 'demo'],
        metadata: { environment: 'development', seeded: true },
      },
    })

    // Create trace steps
    for (let i = 0; i < data.steps.length; i++) {
      const s = data.steps[i]
      const stepStartedAt = new Date(startedAt.getTime() + i * 500)
      const stepEndedAt = new Date(stepStartedAt.getTime() + s.durationMs)

      await prisma.traceStep.create({
        data: {
          runId: run.id,
          sequence: i + 1,
          type: s.type,
          startedAt: stepStartedAt,
          endedAt: stepEndedAt,
          duration: s.durationMs,
          llmProvider: s.type === 'LLM_CALL' ? 'openai' : undefined,
          llmModel: s.llmModel ?? (s.type === 'LLM_CALL' ? 'gpt-4o' : undefined),
          llmRequest:
            s.type === 'LLM_CALL'
              ? {
                  provider: 'openai',
                  model: 'gpt-4o',
                  messages: [
                    { role: 'system', content: 'You are a helpful assistant.' },
                    { role: 'user', content: 'Hello' },
                  ],
                  temperature: 0.7,
                  maxTokens: 4096,
                }
              : undefined,
          llmResponse:
            s.type === 'LLM_CALL'
              ? {
                  content: s.content ?? null,
                  finishReason: s.stepStatus === 'SUCCESS' ? 'stop' : 'error',
                  usage: {
                    promptTokens: s.promptTokens ?? 300,
                    completionTokens: s.completionTokens ?? 200,
                    totalTokens: (s.promptTokens ?? 300) + (s.completionTokens ?? 200),
                  },
                  model: s.llmModel ?? 'gpt-4o',
                }
              : undefined,
          toolName: s.toolName,
          toolRequest: s.toolName
            ? { name: s.toolName, arguments: { query: 'refund policy' } }
            : undefined,
          toolResponse:
            s.toolName && s.stepStatus === 'SUCCESS'
              ? {
                  result: {
                    results: [
                      {
                        topic: 'Refund Policy',
                        content: '30-day money-back guarantee applies.',
                      },
                    ],
                    count: 1,
                  },
                }
              : undefined,
          promptTokens: s.promptTokens,
          completionTokens: s.completionTokens,
          totalTokens: (s.promptTokens ?? 0) + (s.completionTokens ?? 0),
          cost:
            s.type === 'LLM_CALL'
              ? (s.promptTokens ?? 300) * 0.000005 + (s.completionTokens ?? 200) * 0.000015
              : 0,
          status: s.stepStatus,
          error: s.error,
          metadata: { sequence: i + 1 },
        },
      })
    }

    // Create scores
    if (data.scores) {
      for (const sc of data.scores) {
        await prisma.score.create({
          data: {
            runId: run.id,
            evaluator: sc.evaluator,
            score: sc.score,
            maxScore: sc.maxScore,
            reason: sc.reason,
            judgeModel: sc.judgeModel,
            duration: 450,
          },
        })
      }
    }

    // Create assertion results
    if (data.assertionResults) {
      for (const ar of data.assertionResults) {
        await prisma.assertionResult.create({
          data: {
            runId: run.id,
            type: ar.type,
            status: ar.status,
            expected: { value: 'expected' },
            actual: { value: 'actual' },
            message: ar.message,
          },
        })
      }
    }

    return run
  }

  // Run 1: Successful greeting test
  await createSampleRun(allCases[0], 'Greeting Test — gpt-4o (baseline)', 'PASSED', {
    duration: 2340,
    totalTokens: 412,
    totalCost: 0.0085,
    steps: [
      {
        type: 'LLM_CALL',
        stepStatus: 'SUCCESS',
        llmModel: 'gpt-4o',
        content: 'Hello! Welcome to Acme Corp support. How can I help you today?',
        promptTokens: 247,
        completionTokens: 28,
        durationMs: 1200,
      },
      {
        type: 'RESPONSE',
        stepStatus: 'SUCCESS',
        content: 'Hello! Welcome to Acme Corp support. How can I help you today?',
        durationMs: 5,
      },
    ],
    scores: [
      {
        evaluator: 'correctness',
        score: 9.2,
        maxScore: 10,
        reason: 'Response is appropriate and friendly',
        judgeModel: 'gpt-4o-mini',
      },
      {
        evaluator: 'conciseness',
        score: 8.5,
        maxScore: 10,
        reason: 'Response is brief and to the point',
        judgeModel: 'gpt-4o-mini',
      },
    ],
    assertionResults: [
      { type: 'completed_successfully', status: 'PASSED' },
      { type: 'tokens_lt', status: 'PASSED', message: '412 < 1000' },
      { type: 'latency_lt', status: 'PASSED', message: '2340ms < 10000ms' },
    ],
  })

  // Run 2: Successful policy lookup with tool call
  await createSampleRun(
    allCases[1],
    'Refund Policy Test — gpt-4o (with tool)',
    'PASSED',
    {
      duration: 4850,
      totalTokens: 890,
      totalCost: 0.0182,
      steps: [
        {
          type: 'LLM_CALL',
          stepStatus: 'SUCCESS',
          llmModel: 'gpt-4o',
          content: null,
          promptTokens: 312,
          completionTokens: 45,
          durationMs: 1850,
        },
        {
          type: 'TOOL_CALL',
          stepStatus: 'SUCCESS',
          toolName: 'search_knowledge_base',
          durationMs: 320,
        },
        {
          type: 'LLM_CALL',
          stepStatus: 'SUCCESS',
          llmModel: 'gpt-4o',
          content:
            'Yes, Acme Corp offers a 30-day money-back guarantee on all plans. Since you purchased last week, you are well within the refund window. To proceed, please visit your billing settings or I can escalate to our billing team.',
          promptTokens: 380,
          completionTokens: 65,
          durationMs: 2100,
        },
        {
          type: 'RESPONSE',
          stepStatus: 'SUCCESS',
          durationMs: 3,
        },
      ],
      scores: [
        {
          evaluator: 'correctness',
          score: 9.5,
          maxScore: 10,
          reason: 'Accurately communicated 30-day refund policy with next steps',
          judgeModel: 'gpt-4o-mini',
        },
        {
          evaluator: 'tool_usage',
          score: 9.0,
          maxScore: 10,
          reason: 'Correctly used knowledge base before answering',
          judgeModel: 'gpt-4o-mini',
        },
      ],
      assertionResults: [
        { type: 'tool_called', status: 'PASSED', message: 'search_knowledge_base was called' },
        { type: 'contains', status: 'PASSED', message: 'Output contains "refund"' },
      ],
    },
  )

  // Run 3: Escalation test
  await createSampleRun(
    allCases[2],
    'Escalation Test — Legal Data Deletion Request',
    'PASSED',
    {
      duration: 3800,
      totalTokens: 720,
      totalCost: 0.014,
      steps: [
        {
          type: 'LLM_CALL',
          stepStatus: 'SUCCESS',
          llmModel: 'gpt-4o',
          content: null,
          promptTokens: 310,
          completionTokens: 52,
          durationMs: 2100,
        },
        {
          type: 'TOOL_CALL',
          stepStatus: 'SUCCESS',
          toolName: 'escalate_to_human',
          durationMs: 180,
        },
        {
          type: 'LLM_CALL',
          stepStatus: 'SUCCESS',
          llmModel: 'gpt-4o',
          content:
            'I understand this is a sensitive legal matter. I have escalated your request to our compliance team. A human agent will follow up within 2 business hours. Your ticket ID is TKT-7XK9M2.',
          promptTokens: 362,
          completionTokens: 58,
          durationMs: 1250,
        },
        {
          type: 'RESPONSE',
          stepStatus: 'SUCCESS',
          durationMs: 2,
        },
      ],
      scores: [
        {
          evaluator: 'safety',
          score: 9.8,
          maxScore: 10,
          reason: 'Properly escalated sensitive request without exposing data',
          judgeModel: 'gpt-4o-mini',
        },
      ],
      assertionResults: [
        { type: 'tool_called', status: 'PASSED', message: 'escalate_to_human was called' },
        { type: 'tool_not_called', status: 'PASSED', message: 'hallucinate was not called' },
      ],
    },
  )

  // Run 4: Failed run with timeout
  await createSampleRun(allCases[0], 'Greeting Test — gpt-4o (timeout)', 'TIMEOUT', {
    duration: 30000,
    totalTokens: 350,
    totalCost: 0.002,
    error: 'Execution timed out after 30000ms',
    steps: [
      {
        type: 'LLM_CALL',
        stepStatus: 'SUCCESS',
        llmModel: 'gpt-4o',
        content: 'Hello! How can I assist you today?',
        promptTokens: 200,
        completionTokens: 15,
        durationMs: 28500,
      },
      {
        type: 'ERROR',
        stepStatus: 'ERROR',
        durationMs: 0,
        error: 'TimeoutError: Execution timed out after 30000ms',
      },
    ],
    assertionResults: [
      {
        type: 'completed_successfully',
        status: 'FAILED',
        message: 'Expected completion, got timeout',
      },
    ],
  })

  // Run 5: Failed run with tool error
  await createSampleRun(
    allCases[1],
    'Refund Policy Test — gpt-3.5-turbo (tool error)',
    'ERROR',
    {
      duration: 2150,
      totalTokens: 550,
      totalCost: 0.005,
      error: 'Tool search_knowledge_base returned error: Knowledge base unavailable',
      steps: [
        {
          type: 'LLM_CALL',
          stepStatus: 'SUCCESS',
          llmModel: 'gpt-3.5-turbo',
          content: null,
          promptTokens: 280,
          completionTokens: 35,
          durationMs: 950,
        },
        {
          type: 'TOOL_CALL',
          stepStatus: 'ERROR',
          toolName: 'search_knowledge_base',
          durationMs: 850,
          error: 'Knowledge base service unavailable (503)',
        },
        {
          type: 'ERROR',
          stepStatus: 'ERROR',
          durationMs: 0,
          error: 'Tool search_knowledge_base returned error: Knowledge base unavailable',
        },
      ],
      assertionResults: [
        {
          type: 'tool_called',
          status: 'FAILED',
          message: 'search_knowledge_base was called but returned an error',
        },
      ],
    },
  )

  console.log('    + 5 sample runs created')

  // ------------------------------------------------------------------
  // 6. Sample Experiment (A/B Test)
  // ------------------------------------------------------------------
  console.log('  Creating sample A/B experiment...')

  const experiment = await prisma.experiment.create({
    data: {
      id: 'exp-ab-model-comparison',
      projectId: project.id,
      name: 'GPT-4o vs GPT-4o-mini — Greeting Quality',
      description:
        'Compare greeting quality and cost between GPT-4o and GPT-4o-mini across 20 test cases.',
      status: 'COMPLETED',
      config: {
        testCases: allCases.slice(0, 2).map((tc) => tc.id),
        runsPerVariant: 10,
        shuffle: true,
        metrics: ['correctness', 'conciseness', 'cost', 'latency'],
      },
      conclusion: 'WINNER_A',
      results: {
        variantA: {
          name: 'GPT-4o',
          model: 'gpt-4o',
          avgCorrectness: 9.35,
          avgCost: 0.0135,
          avgLatency: 3595,
          winRate: 0.75,
          runCount: 10,
          passedCount: 10,
        },
        variantB: {
          name: 'GPT-4o-mini',
          model: 'gpt-4o-mini',
          avgCorrectness: 7.8,
          avgCost: 0.0021,
          avgLatency: 1340,
          winRate: 0.25,
          runCount: 10,
          passedCount: 8,
        },
        summary:
          'GPT-4o wins on correctness (9.35 vs 7.8) but gpt-4o-mini is 6.4x cheaper. Recommended for production: use gpt-4o-mini for simple greetings, escalate to gpt-4o for complex queries.',
      },
      startedAt: new Date(Date.now() - 86400000),
      endedAt: new Date(Date.now() - 82800000),
    },
  })

  // Create variants
  const variantA = await prisma.experimentVariant.create({
    data: {
      experimentId: experiment.id,
      name: 'A',
      config: { model: 'gpt-4o', temperature: 0.7, maxTokens: 1024 },
    },
  })

  const variantB = await prisma.experimentVariant.create({
    data: {
      experimentId: experiment.id,
      name: 'B',
      config: { model: 'gpt-4o-mini', temperature: 0.7, maxTokens: 1024 },
    },
  })

  // Link existing runs to experiment
  const expRuns = await prisma.run.findMany({
    where: { projectId: project.id },
    take: 4,
  })

  if (expRuns.length >= 2) {
    await prisma.experimentRun.createMany({
      data: [
        { experimentId: experiment.id, variantId: variantA.id, runId: expRuns[0].id },
        { experimentId: experiment.id, variantId: variantA.id, runId: expRuns[1].id },
        { experimentId: experiment.id, variantId: variantB.id, runId: expRuns[3]?.id ?? expRuns[0].id },
      ],
    })
  }

  console.log(`    + Experiment: ${experiment.name} (${experiment.conclusion})`)

  // ------------------------------------------------------------------
  // 7. Sample Snapshots
  // ------------------------------------------------------------------
  console.log('  Creating sample snapshots...')

  await prisma.snapshot.create({
    data: {
      projectId: project.id,
      runId: expRuns[0]?.id,
      name: 'Baseline — GPT-4o Greeting',
      description: 'Baseline snapshot of greeting behavior with GPT-4o at temperature 0.7',
      type: 'MANUAL',
      data: {
        agent: {
          name: 'Customer Support — GPT-4o',
          config: { provider: 'openai', model: 'gpt-4o', temperature: 0.7, maxTokens: 1024 },
        },
        prompt: {
          system: 'You are a friendly customer support agent. Greet customers warmly.',
          variables: {},
        },
        model: { provider: 'openai', name: 'gpt-4o', temperature: 0.7, maxTokens: 1024 },
        tools: [],
        context: { messages: [{ role: 'user', content: 'Hello' }] },
        metrics: { totalTokens: 412, totalCost: 0.0085, totalLatency: 2340 },
        scores: [
          { evaluator: 'correctness', score: 9.2, maxScore: 10 },
          { evaluator: 'conciseness', score: 8.5, maxScore: 10 },
        ],
      },
      tags: ['baseline', 'greeting', 'gpt-4o'],
    },
  })

  await prisma.snapshot.create({
    data: {
      projectId: project.id,
      name: 'v1.1 — Greeting Prompt Update',
      description: 'Snapshot after updating the greeting system prompt to be more concise',
      type: 'AUTO',
      data: {
        agent: {
          name: 'Customer Support — GPT-4o v1.1',
          config: { provider: 'openai', model: 'gpt-4o', temperature: 0.5, maxTokens: 512 },
        },
        prompt: {
          system: 'You are a customer support agent. Be concise and professional.',
          variables: {},
        },
        model: { provider: 'openai', name: 'gpt-4o', temperature: 0.5, maxTokens: 512 },
        tools: [],
        context: { messages: [{ role: 'user', content: 'Hello' }] },
        metrics: { totalTokens: 298, totalCost: 0.0059, totalLatency: 1780 },
        scores: [
          { evaluator: 'correctness', score: 9.0, maxScore: 10 },
          { evaluator: 'conciseness', score: 9.2, maxScore: 10 },
        ],
      },
      tags: ['v1.1', 'greeting', 'prompt-update'],
    },
  })

  console.log('    + 2 snapshots created')

  // ------------------------------------------------------------------
  // 8. Sample Datasets
  // ------------------------------------------------------------------
  console.log('  Creating sample datasets...')

  const dataset = await prisma.dataset.create({
    data: {
      projectId: project.id,
      name: 'Customer Support Evaluation Set',
      description:
        'A curated set of 20 customer support interactions for regression testing. Covers greetings, refunds, escalations, and multi-turn conversations.',
      format: 'JSON',
      tags: ['evaluation', 'customer-support', 'regression'],
    },
  })

  const datasetItems = [
    {
      split: 'TEST' as const,
      input: { messages: [{ role: 'user', content: 'Hello, I need help with my account.' }] },
      expected: { shouldGreet: true, shouldOfferHelp: true },
      labels: ['greeting', 'account-help'],
      metadata: { difficulty: 'easy', category: 'greeting' },
      sortOrder: 1,
    },
    {
      split: 'TEST' as const,
      input: {
        messages: [{ role: 'user', content: 'I want a refund for my annual subscription.' }],
      },
      expected: { shouldLookupPolicy: true, shouldMentionRefundWindow: true },
      labels: ['refund', 'policy'],
      metadata: { difficulty: 'medium', category: 'refund' },
      sortOrder: 2,
    },
    {
      split: 'TRAIN' as const,
      input: {
        messages: [{ role: 'user', content: 'What is the pricing for the Enterprise plan?' }],
      },
      expected: { shouldSearchKB: true, shouldMentionCustomPricing: true },
      labels: ['pricing', 'enterprise'],
      metadata: { difficulty: 'easy', category: 'pricing' },
      sortOrder: 3,
    },
    {
      split: 'TEST' as const,
      input: {
        messages: [
          { role: 'user', content: 'Can you check my order ORD-12347?' },
          { role: 'assistant', content: 'Let me look that up for you.' },
          { role: 'user', content: 'Also, when will it ship?' },
        ],
      },
      expected: { shouldCheckOrder: true, shouldHandleMultiTurn: true },
      labels: ['order-status', 'multi-turn'],
      metadata: { difficulty: 'hard', category: 'multi-turn' },
      sortOrder: 4,
    },
    {
      split: 'VALIDATION' as const,
      input: {
        messages: [
          {
            role: 'user',
            content: 'I need to escalate a security vulnerability I found.',
          },
        ],
      },
      expected: { shouldEscalate: true, shouldNotSpeculate: true },
      labels: ['escalation', 'security'],
      metadata: { difficulty: 'hard', category: 'escalation' },
      sortOrder: 5,
    },
    {
      split: 'TEST' as const,
      input: {
        messages: [{ role: 'user', content: 'How do I cancel my subscription?' }],
      },
      expected: { shouldSearchKB: true, shouldExplainCancellation: true },
      labels: ['cancellation', 'policy'],
      metadata: { difficulty: 'easy', category: 'policy' },
      sortOrder: 6,
    },
    {
      split: 'TRAIN' as const,
      input: {
        messages: [
          { role: 'user', content: 'Is my data encrypted? I need SOC 2 compliance info.' },
        ],
      },
      expected: { shouldSearchKB: true, shouldMentionSOC2: true },
      labels: ['security', 'compliance'],
      metadata: { difficulty: 'medium', category: 'security' },
      sortOrder: 7,
    },
    {
      split: 'TEST' as const,
      input: {
        messages: [{ role: 'user', content: 'I forgot my password and cannot log in.' }],
      },
      expected: { shouldBeHelpful: true, shouldProvideResetInstructions: true },
      labels: ['account-help', 'password-reset'],
      metadata: { difficulty: 'easy', category: 'account' },
      sortOrder: 8,
    },
  ]

  for (const item of datasetItems) {
    await prisma.datasetItem.create({
      data: {
        datasetId: dataset.id,
        split: item.split,
        input: item.input,
        expected: item.expected,
        labels: item.labels,
        metadata: item.metadata,
        sortOrder: item.sortOrder,
      },
    })
  }

  console.log(`    + Dataset: ${dataset.name} (${datasetItems.length} items)`)

  // ------------------------------------------------------------------
  // Done
  // ------------------------------------------------------------------
  console.log('\nSeed complete.\n')
  console.log('   Admin User:   admin@agentbench.dev / password123')
  console.log('   Demo User:    demo@agentbench.dev / demopass123')
  console.log('   Project:      Demo Project (demo-project)')
  console.log('   Test Suites:  3')
  console.log('   Test Cases:   5')
  console.log('   Runs:         5')
  console.log('   Experiments:  1')
  console.log('   Snapshots:    2')
  console.log('   Datasets:     1 (8 items)')
  console.log('')
}

main()
  .catch((e) => {
    console.error('Seed failed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
