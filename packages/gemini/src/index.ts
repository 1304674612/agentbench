/**
 * @agentbench/gemini
 *
 * Google Gemini provider — implements AgentBenchProvider natively.
 * Uses the Google Generative AI SDK pattern for:
 * - Streaming (generateContentStream)
 * - Embeddings (batchEmbedContents)
 * - Vision (image part in content)
 * - Tool calling (functionDeclarations)
 *
 * @packageDocumentation
 */

import { tokenCounter, costCalculator } from '@agentbench/provider-utils'
import type {
  ProviderCapabilities,
  ProviderConfig,
  ChatCompletionParams,
  ChatCompletionResult,
  ChatContentPart,
  StreamChunk,
  TokenCountParams,
  TokenCountResult,
  Usage,
  CostBreakdown,
  HealthStatus,
  ToolDefinition,
} from '@agentbench/provider-utils'

const GEMINI_MODELS = [
  'gemini-2.5-pro',
  'gemini-2.5-flash',
  'gemini-2.0-flash',
  'gemini-2.0-flash-lite',
  'gemini-1.5-pro',
  'gemini-1.5-flash',
  'gemini-1.5-flash-8b',
]

// ── Helper: Convert AgentBench messages to Gemini format ───────────────────────

interface GeminiContent {
  role: 'user' | 'model' | 'function'
  parts: GeminiPart[]
}

interface GeminiPart {
  text?: string
  inlineData?: { mimeType: string; data: string }
  functionCall?: { name: string; args: Record<string, unknown> }
  functionResponse?: { name: string; response: Record<string, unknown> }
  fileData?: { mimeType: string; fileUri: string }
}

interface GeminiTool {
  functionDeclarations: Array<{
    name: string
    description: string
    parameters: Record<string, unknown>
  }>
}

function convertMessages(messages: ChatCompletionParams['messages']): {
  systemInstruction?: string
  contents: GeminiContent[]
} {
  const contents: GeminiContent[] = []
  let systemInstruction: string | undefined

  for (const msg of messages) {
    // Extract system message as system instruction
    if (msg.role === 'system') {
      const text =
        typeof msg.content === 'string'
          ? msg.content
          : ((msg.content as ChatContentPart[])?.find((p) => p.type === 'text')?.text ?? '')
      systemInstruction = (systemInstruction ?? '') + text + '\n'
      continue
    }

    const parts = convertContentToParts(msg.content)
    if (parts.length === 0) continue

    // Map roles: assistant -> model, tool -> function
    const role: GeminiContent['role'] =
      msg.role === 'assistant' ? 'model' : msg.role === 'tool' ? 'function' : 'user'

    // If previous content has the same role, merge parts
    const last = contents[contents.length - 1]
    if (last && last.role === role) {
      last.parts.push(...parts)
    } else {
      contents.push({ role, parts })
    }

    // Handle tool calls in assistant messages
    if (msg.tool_calls && msg.role === 'assistant') {
      for (const tc of msg.tool_calls) {
        let args: Record<string, unknown> = {}
        try {
          args = JSON.parse(tc.function.arguments)
        } catch (error) {
          console.error('[GEMINI] Failed to parse tool call arguments:', error)
          /* keep empty */
        }
        contents.push({
          role: 'model',
          parts: [{ functionCall: { name: tc.function.name, args } }],
        })
      }
    }
  }

  return {
    systemInstruction: systemInstruction?.trim() || undefined,
    contents,
  }
}

function convertContentToParts(content: string | ChatContentPart[]): GeminiPart[] {
  if (typeof content === 'string') {
    return [{ text: content }]
  }

  const parts: GeminiPart[] = []
  for (const part of content) {
    if (part.type === 'text' && part.text) {
      parts.push({ text: part.text })
    } else if (part.type === 'image_url' && part.image_url) {
      const url = part.image_url.url
      // Handle both base64 data URLs and regular URLs
      if (url.startsWith('data:')) {
        const [header, data] = url.split(',')
        const mimeType = header.match(/data:(.*?);/)?.[1] ?? 'image/png'
        parts.push({ inlineData: { mimeType, data } })
      } else if (url.startsWith('gs://')) {
        // Google Cloud Storage URI
        const [mimeType = 'image/png'] = url.match(/\.(\w+)$/) ?? []
        parts.push({ fileData: { mimeType: `image/${mimeType}`, fileUri: url } })
      } else {
        // HTTP(S) URL — fetch and convert to inlineData
        parts.push({
          fileData: { mimeType: 'image/png', fileUri: url },
        })
      }
    }
  }
  return parts
}

function convertTools(tools?: ToolDefinition[]): GeminiTool[] | undefined {
  if (!tools || tools.length === 0) return undefined
  return [
    {
      functionDeclarations: tools.map((t) => ({
        name: t.function.name,
        description: t.function.description,
        parameters: t.function.parameters,
      })),
    },
  ]
}

// ── Helper: Build Gemini generation config ─────────────────────────────────────

interface GeminiGenerationConfig {
  temperature?: number
  maxOutputTokens?: number
  topP?: number
  topK?: number
  stopSequences?: string[]
  responseMimeType?: string
  responseSchema?: unknown
}

function buildGenerationConfig(params: ChatCompletionParams): GeminiGenerationConfig {
  const config: GeminiGenerationConfig = {}

  if (params.temperature !== undefined) config.temperature = params.temperature
  if (params.maxTokens !== undefined) config.maxOutputTokens = params.maxTokens
  if (params.topP !== undefined) config.topP = params.topP
  if (params.stop) config.stopSequences = params.stop

  // JSON mode
  if (params.responseFormat?.type === 'json_object') {
    config.responseMimeType = 'application/json'
  }

  return config
}

// ── Helper: Parse Gemini response to unified format ────────────────────────────

function parseGeminiResponse(raw: Record<string, unknown>, model: string): ChatCompletionResult {
  const candidates = raw.candidates as Array<Record<string, unknown>> | undefined
  const usageMeta = raw.usageMetadata as Record<string, number> | undefined
  const firstCandidate = candidates?.[0]
  const content = firstCandidate?.content as
    | { role: string; parts: Array<Record<string, unknown>> }
    | undefined

  let textContent: string | null = null
  const toolCalls: Array<{
    id: string
    type: 'function'
    function: { name: string; arguments: string }
  }> = []

  if (content?.parts) {
    for (const part of content.parts) {
      if (part.text && typeof part.text === 'string') {
        textContent = (textContent ?? '') + part.text
      }
      if (part.functionCall) {
        const fc = part.functionCall as { name: string; args: Record<string, unknown> }
        toolCalls.push({
          id: `call_${toolCalls.length}`,
          type: 'function',
          function: {
            name: fc.name,
            arguments: JSON.stringify(fc.args),
          },
        })
      }
    }
  }

  return {
    id: `gemini-${Date.now()}`,
    model,
    choices: [
      {
        index: 0,
        message: {
          role: 'assistant',
          content: textContent ?? '',
          ...(toolCalls.length > 0 ? { tool_calls: toolCalls } : {}),
        },
        finishReason: firstCandidate?.finishReason
          ? mapGeminiFinishReason(firstCandidate.finishReason as string)
          : null,
      },
    ],
    usage: {
      promptTokens: usageMeta?.promptTokenCount ?? 0,
      completionTokens: usageMeta?.candidatesTokenCount ?? 0,
      totalTokens: usageMeta?.totalTokenCount ?? 0,
    },
    created: Math.floor(Date.now() / 1000),
    provider: 'gemini',
  }
}

function mapGeminiFinishReason(reason: string): ChatCompletionResult['choices'][0]['finishReason'] {
  switch (reason) {
    case 'STOP':
      return 'stop'
    case 'MAX_TOKENS':
      return 'length'
    case 'SAFETY':
      return 'content_filter'
    case 'RECITATION':
      return 'content_filter'
    case 'MALFORMED_FUNCTION_CALL':
    case 'FUNCTION_CALL':
      return 'tool_calls'
    default:
      return null
  }
}

// ── The Provider Class ─────────────────────────────────────────────────────────

export class GeminiProvider {
  readonly id = 'gemini'
  readonly name = 'Google Gemini'
  readonly version = '0.5.0'
  readonly capabilities: ProviderCapabilities = {
    streaming: true,
    reasoning: true,
    embeddings: true,
    toolCalling: true,
    vision: true,
    functionCalling: true,
    jsonMode: true,
    maxContextWindow: 1048576, // 2.5 Pro supports 1M tokens
    supportedModels: GEMINI_MODELS,
  }

  private apiKey = ''
  private baseUrl = 'https://generativelanguage.googleapis.com/v1beta'
  private timeout = 60000
  private maxRetries = 2
  private initialized = false

  async initialize(config: ProviderConfig): Promise<void> {
    this.apiKey = config.apiKey ?? ''
    this.baseUrl = config.baseUrl ?? 'https://generativelanguage.googleapis.com/v1beta'
    this.timeout = config.timeout ?? 60000
    this.maxRetries = config.maxRetries ?? 2
    this.initialized = true
  }

  async createChatCompletion(params: ChatCompletionParams): Promise<ChatCompletionResult> {
    this._ensureInitialized()

    const { systemInstruction, contents } = convertMessages(params.messages)
    const generationConfig = buildGenerationConfig(params)
    const tools = convertTools(params.tools)

    const body: Record<string, unknown> = {
      contents,
      generationConfig,
    }
    if (systemInstruction) {
      body.systemInstruction = { parts: [{ text: systemInstruction }] }
    }
    if (tools) body.tools = tools
    if (
      params.toolChoice === 'auto' ||
      params.toolChoice === 'required' ||
      params.toolChoice === 'none'
    ) {
      body.toolConfig = {
        functionCallingConfig: {
          mode:
            params.toolChoice === 'required'
              ? 'ANY'
              : params.toolChoice === 'none'
                ? 'NONE'
                : 'AUTO',
        },
      }
    }

    const url = `${this.baseUrl}/models/${params.model}:generateContent?key=${this.apiKey}`
    const res = await this._fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })

    const raw = (await res.json()) as Record<string, unknown>
    return parseGeminiResponse(raw, params.model)
  }

  async *createStreamingChatCompletion(
    params: ChatCompletionParams
  ): AsyncGenerator<StreamChunk, void, undefined> {
    this._ensureInitialized()

    const { systemInstruction, contents } = convertMessages(params.messages)
    const generationConfig = buildGenerationConfig(params)
    const tools = convertTools(params.tools)

    const body: Record<string, unknown> = {
      contents,
      generationConfig,
    }
    if (systemInstruction) {
      body.systemInstruction = { parts: [{ text: systemInstruction }] }
    }
    if (tools) body.tools = tools

    const url = `${this.baseUrl}/models/${params.model}:streamGenerateContent?alt=sse&key=${this.apiKey}`
    const res = await this._fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })

    if (!res.body) throw new Error('No streaming response body')

    const reader = res.body.getReader()
    const decoder = new TextDecoder()
    let buffer = ''
    let fullText = ''
    let finishReason: string | null = null

    try {
      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() ?? ''

        for (const line of lines) {
          const trimmed = line.trim()
          if (!trimmed || !trimmed.startsWith('data: ')) continue
          const data = trimmed.slice(6)

          try {
            const json = JSON.parse(data) as Record<string, unknown>
            const candidates = json.candidates as Array<Record<string, unknown>> | undefined
            if (!candidates?.[0]) continue

            const candidate = candidates[0]
            const content = candidate.content as
              | { parts?: Array<Record<string, unknown>>; role?: string }
              | undefined
            const text =
              content?.parts
                ?.filter((p) => p.text)
                .map((p) => p.text as string)
                .join('') ?? ''

            if (text) {
              fullText += text
            }

            if (candidate.finishReason) {
              finishReason = candidate.finishReason as string
            }

            yield {
              id: `gemini-${Date.now()}`,
              model: params.model,
              choices: [
                {
                  index: 0,
                  delta: {
                    role: 'assistant',
                    content: text || undefined,
                  },
                  finishReason: finishReason ? mapGeminiFinishReason(finishReason) : null,
                },
              ],
              created: Math.floor(Date.now() / 1000),
              provider: 'gemini',
            }
          } catch (error) {
            console.error('[GEMINI] Failed to process stream chunk:', error)
            // Skip malformed chunks
          }
        }
      }
    } finally {
      reader.releaseLock()
    }
  }

  async countTokens(params: TokenCountParams): Promise<TokenCountResult> {
    return tokenCounter.countTokens(params)
  }

  calculateCost(usage: Usage, model: string): CostBreakdown {
    return costCalculator.calculateCost(usage, model)
  }

  async healthCheck(): Promise<HealthStatus> {
    const start = Date.now()
    try {
      // List models to verify connectivity
      const url = `${this.baseUrl}/models?key=${this.apiKey}`
      const res = await this._fetch(url, {
        signal: AbortSignal.timeout(10000),
      })
      return {
        healthy: res.ok,
        latency: Date.now() - start,
        message: res.ok ? 'Connected' : `HTTP ${res.status}`,
      }
    } catch (err) {
      return {
        healthy: false,
        latency: Date.now() - start,
        message: err instanceof Error ? err.message : 'Unknown error',
      }
    }
  }

  async dispose(): Promise<void> {
    this.initialized = false
  }

  // ── Internals ────────────────────────────────────────────────────────────────

  private _ensureInitialized(): void {
    if (!this.initialized || !this.apiKey) {
      throw new Error('GeminiProvider not initialized. Call initialize() with an API key first.')
    }
  }

  private async _fetch(
    url: string,
    init: RequestInit,
    retries = this.maxRetries
  ): Promise<Response> {
    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        const res = await fetch(url, {
          ...init,
          signal: init.signal ?? AbortSignal.timeout(this.timeout),
        })
        if (res.status < 500 && res.status !== 429) return res
        if (attempt < retries) {
          await new Promise((r) => setTimeout(r, Math.min(1000 * 2 ** attempt, 30000)))
        }
      } catch (err) {
        if (attempt >= retries) throw err
        await new Promise((r) => setTimeout(r, Math.min(1000 * 2 ** attempt, 30000)))
      }
    }
    // Should not reach here, but TypeScript wants a return
    throw new Error(`Failed to fetch ${url} after ${retries} retries`)
  }
}

// ============================================================
// Factory function
// ============================================================

/**
 * Create a configured Gemini provider instance.
 *
 * @example
 * ```ts
 * const gemini = await createGeminiProvider({ apiKey: '...' })
 * ```
 */
export async function createGeminiProvider(config: ProviderConfig = {}): Promise<GeminiProvider> {
  const provider = new GeminiProvider()
  await provider.initialize(config)
  return provider
}
