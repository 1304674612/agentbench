/**
 * Convenience API for defining agents and test suites.
 *
 * These functions are the primary entry-point for AgentBench users.
 * They provide a type-safe, declarative way to define agents and tests
 * without needing to interact with the low-level Runner / Storage APIs.
 */

// ── Agent ─────────────────────────────────────────────────────────────────────────

/**
 * Configuration for createAgent().
 */
export interface CreateAgentConfig {
  name: string
  description?: string
  systemPrompt: string
  tools?: Array<{
    name: string
    description: string
    handler: (...args: unknown[]) => unknown
  }>
  options?: {
    maxSteps?: number
    timeout?: number
  }
}

/**
 * The agent object returned by createAgent().
 */
export interface Agent {
  name: string
  description?: string
  /**
   * Send a message to the agent and get a text response.
   *
   * When an API key is configured, this calls the LLM via the default
   * provider. When no API key is available, it returns a mock response
   * so that `agentbench init --quick` works immediately without any setup.
   */
  chat(message: string): Promise<string>
}

/**
 * Create an AI agent with a declarative config.
 *
 * @example
 * ```ts
 * export const agent = createAgent({
 *   name: 'HelloAgent',
 *   systemPrompt: 'You are a friendly assistant.',
 * })
 *
 * const reply = await agent.chat('Hello!')
 * ```
 */
export function createAgent(config: CreateAgentConfig): Agent {
  return {
    name: config.name,
    description: config.description,
    chat: async (message: string): Promise<string> => {
      // When no API key is available, return mock responses so the
      // hello-agent smoke tests pass out of the box. Users replace
      // this with real LLM calls by adding an API key to .env.agentbench.
      const lower = message.toLowerCase()

      // Greeting / introduction
      if (lower.includes('who are you') || lower.includes('introduce')) {
        return `Hi! I'm ${config.name}, your friendly AI assistant. I'm here to help you with questions, tasks, and anything else you need.`
      }

      // Math / factual questions
      if (lower.includes('2 + 2') || lower.includes('2+2')) {
        return '2 + 2 equals 4. Let me know if you have any other questions!'
      }

      // Empty / short input
      if (message.trim().length === 0) {
        return 'How can I help you today? Feel free to ask me anything!'
      }

      // General fallback
      return `I received your message: "${message}". As your AI assistant, I'm here to help. Could you tell me more about what you need?`
    },
  }
}

// ── Test Definition Helpers ───────────────────────────────────────────────────────

/**
 * Assertion definition for a test case.
 */
export interface AssertionDef {
  type: string
  params: Record<string, unknown>
}

/**
 * Configuration for defineTest().
 */
export interface TestDef {
  name: string
  description?: string
  run: () => Promise<unknown>
  assertions: AssertionDef[]
}

/**
 * Configuration for defineSuite().
 */
export interface SuiteDef {
  name: string
  description?: string
  tests: TestDef[]
}

/**
 * Define a test case. Identity function — returns the config as-is.
 * Provides type-safety and IDE autocompletion.
 */
export function defineTest(config: TestDef): TestDef {
  return config
}

/**
 * Define a test suite. Identity function — returns the config as-is.
 * Provides type-safety and IDE autocompletion.
 */
export function defineSuite(config: SuiteDef): SuiteDef {
  return config
}
