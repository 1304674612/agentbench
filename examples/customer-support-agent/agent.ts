/**
 * Customer Support Agent — Example implementation using @agentbench/openai.
 *
 * This agent handles customer inquiries for Acme Corp, a fictional SaaS company.
 * It demonstrates the runWithOpenAI() pattern for wrapping OpenAI calls with tracing.
 *
 * Tools implemented:
 *   - search_knowledge_base: searches internal docs for policy/product info
 *   - escalate_to_human: transfers the conversation to a human agent
 *   - check_order_status: looks up an order by ID
 */

import { createOpenAIClient, runWithOpenAI } from '@agentbench/openai'

// ---------------------------------------------------------------------------
// Tool implementations with realistic mock data
// ---------------------------------------------------------------------------

interface KnowledgeBaseEntry {
  topic: string
  content: string
  keywords: string[]
}

const knowledgeBase: KnowledgeBaseEntry[] = [
  {
    topic: 'Refund Policy',
    content:
      'Acme Corp offers a 30-day money-back guarantee on all plans. Refunds are processed within 5-10 business days. To request a refund, contact support or visit your billing settings. Annual plans are refundable on a pro-rata basis after 30 days.',
    keywords: ['refund', 'money back', 'return', 'cancel', 'billing'],
  },
  {
    topic: 'Pricing',
    content:
      'Acme Corp offers three plans: Starter ($29/mo), Professional ($99/mo), and Enterprise (custom pricing). All plans include a 14-day free trial. Enterprise plans include dedicated support, SSO, and custom integrations.',
    keywords: ['pricing', 'cost', 'plan', 'subscription', 'trial', 'enterprise'],
  },
  {
    topic: 'Data Security',
    content:
      'Acme Corp is SOC 2 Type II certified. All data is encrypted at rest (AES-256) and in transit (TLS 1.3). We offer data residency options in the US, EU, and APAC regions. GDPR and CCPA compliant.',
    keywords: ['security', 'encryption', 'gdpr', 'soc2', 'data', 'privacy', 'compliance'],
  },
  {
    topic: 'API Access',
    content:
      'API access is available on Professional and Enterprise plans. Rate limits: Starter (100 req/min), Professional (1000 req/min), Enterprise (custom). API keys can be generated from the dashboard under Settings > API.',
    keywords: ['api', 'integration', 'key', 'rate limit', 'developer'],
  },
  {
    topic: 'Cancellation',
    content:
      'You can cancel your subscription at any time from Billing Settings. Cancellation takes effect at the end of your current billing period. No partial refunds are provided for mid-cycle cancellations, except within the 30-day refund window.',
    keywords: ['cancel', 'stop', 'end subscription', 'close account'],
  },
]

const orders: Record<string, { status: string; plan: string; date: string; amount: string }> = {
  'ORD-12345': { status: 'Active', plan: 'Professional', date: '2026-06-15', amount: '$99.00' },
  'ORD-12346': { status: 'Cancelled', plan: 'Starter', date: '2026-05-20', amount: '$29.00' },
  'ORD-12347': { status: 'Pending', plan: 'Enterprise', date: '2026-07-01', amount: '$499.00' },
  'ORD-12348': { status: 'Active', plan: 'Professional', date: '2026-06-28', amount: '$99.00' },
}

// ---------------------------------------------------------------------------
// Tool handler
// ---------------------------------------------------------------------------

export async function executeTool(
  name: string,
  args: Record<string, unknown>,
): Promise<Record<string, unknown>> {
  switch (name) {
    case 'search_knowledge_base': {
      const query = String(args.query ?? '').toLowerCase()
      if (!query) return { results: [], message: 'No query provided' }

      const matches = knowledgeBase.filter(
        (entry) =>
          entry.keywords.some((kw) => query.includes(kw)) ||
          entry.content.toLowerCase().includes(query) ||
          entry.topic.toLowerCase().includes(query),
      )

      return {
        results: matches.map((m) => ({ topic: m.topic, content: m.content })),
        count: matches.length,
        query,
      }
    }

    case 'escalate_to_human': {
      return {
        escalated: true,
        ticketId: `TKT-${Date.now().toString(36).toUpperCase()}`,
        priority: (args.reason as string)?.includes('urgent') ? 'high' : 'normal',
        message: 'Your request has been escalated. A human agent will respond within 2 hours during business hours.',
      }
    }

    case 'check_order_status': {
      const orderId = String(args.orderId ?? '')
      const order = orders[orderId]
      if (!order) {
        return { found: false, orderId, message: `Order ${orderId} not found in our system.` }
      }
      return { found: true, orderId, ...order }
    }

    default:
      return { error: `Unknown tool: ${name}` }
  }
}

// ---------------------------------------------------------------------------
// Agent runner — wraps OpenAI with tracing and tool handling
// ---------------------------------------------------------------------------

export interface RunAgentParams {
  messages: Array<{ role: 'user' | 'assistant'; content: string }>
  apiKey: string
  model?: string
  maxSteps?: number
}

export async function runCustomerSupportAgent(params: RunAgentParams) {
  const { messages, apiKey, model = 'gpt-4o', maxSteps = 5 } = params

  const client = createOpenAIClient({
    apiKey,
    tracing: true,
    timeout: 30000,
  })

  const tools = [
    {
      type: 'function' as const,
      function: {
        name: 'search_knowledge_base',
        description: 'Search the internal knowledge base for policy, product, and pricing information',
        parameters: {
          type: 'object',
          properties: {
            query: { type: 'string', description: 'The search query' },
          },
          required: ['query'],
        },
      },
    },
    {
      type: 'function' as const,
      function: {
        name: 'escalate_to_human',
        description: 'Escalate the conversation to a human support agent',
        parameters: {
          type: 'object',
          properties: {
            reason: { type: 'string', description: 'Reason for escalation' },
          },
          required: ['reason'],
        },
      },
    },
    {
      type: 'function' as const,
      function: {
        name: 'check_order_status',
        description: 'Check the status of an order by its ID',
        parameters: {
          type: 'object',
          properties: {
            orderId: { type: 'string', description: 'The order ID to look up (e.g., ORD-12345)' },
          },
          required: ['orderId'],
        },
      },
    },
  ]

  const result = await runWithOpenAI({
    client,
    agent: {
      provider: 'openai',
      model,
      temperature: 0.3,
      maxTokens: 2048,
      systemPrompt: `You are a helpful customer support agent for Acme Corp, a SaaS company.
Your responsibilities:
- Greet customers warmly and professionally
- Answer questions about products, pricing, and policies using the search_knowledge_base tool
- Process refund requests according to our 30-day refund policy
- Look up order statuses when customers provide an order ID using check_order_status
- Escalate complex or sensitive issues to a human agent using escalate_to_human
- Never make up information — if you don't know, escalate

Key policies:
- Refunds are available within 30 days of purchase
- Subscription cancellations take effect at the end of the billing period
- Enterprise customers have dedicated account managers`,
      tools: [
        { name: 'search_knowledge_base', description: 'Search knowledge base', parameters: { query: 'string' } },
        { name: 'escalate_to_human', description: 'Escalate to human', parameters: { reason: 'string' } },
        { name: 'check_order_status', description: 'Check order status', parameters: { orderId: 'string' } },
      ],
    },
    messages,
    tools,
    maxSteps,
  })

  return result
}
