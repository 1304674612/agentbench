import type { AgentConfig, RunOptions } from '@agentbench/core'

/**
 * AgentBench configuration for the Customer Support Agent example.
 *
 * This config defines a project named "customer-support" that tests a
 * GPT-4o agent with a customer support system prompt, configured with
 * three tools and a 30-second timeout.
 */

export interface CustomerSupportProjectConfig {
  name: string
  description: string
  agent: AgentConfig
  options: Partial<RunOptions>
  testSuites: string[]
}

const config: CustomerSupportProjectConfig = {
  name: 'customer-support',
  description:
    'Customer support AI agent that handles inquiries, refunds, and escalations for Acme Corp',

  agent: {
    provider: 'openai',
    model: 'gpt-4o',
    temperature: 0.3,
    maxTokens: 2048,
    systemPrompt: `You are a helpful customer support agent for Acme Corp, a SaaS company.
Your responsibilities:
- Greet customers warmly and professionally
- Answer questions about products, pricing, and policies
- Process refund requests according to our 30-day refund policy
- Look up order statuses when customers provide an order ID
- Escalate complex or sensitive issues to a human agent
- Never make up information — if you don't know, escalate

Key policies:
- Refunds are available within 30 days of purchase
- Subscription cancellations take effect at the end of the billing period
- Enterprise customers have dedicated account managers`,
    tools: [
      {
        name: 'search_knowledge_base',
        description:
          'Search the internal knowledge base for policy, product, and pricing information',
        parameters: {
          type: 'object',
          properties: { query: { type: 'string', description: 'The search query' } },
          required: ['query'],
        },
      },
      {
        name: 'escalate_to_human',
        description: 'Escalate the conversation to a human support agent',
        parameters: {
          type: 'object',
          properties: { reason: { type: 'string', description: 'Reason for escalation' } },
          required: ['reason'],
        },
      },
      {
        name: 'check_order_status',
        description: 'Check the status of an order by its ID',
        parameters: {
          type: 'object',
          properties: {
            orderId: {
              type: 'string',
              description: 'The order ID to look up (e.g., ORD-12345)',
            },
          },
          required: ['orderId'],
        },
      },
    ],
  },

  options: {
    timeout: 30000,
    maxSteps: 5,
    retries: 1,
    concurrency: 1,
  },

  testSuites: [
    './tests/greeting.test.ts',
    './tests/refund-policy.test.ts',
    './tests/escalation.test.ts',
    './tests/multi-turn.test.ts',
  ],
}

export default config
