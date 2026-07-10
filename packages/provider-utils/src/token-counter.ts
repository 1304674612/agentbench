/**
 * Token Counter — tiktoken-based token counting with fallback heuristics.
 *
 * Attempts to use tiktoken (via js-tiktoken or tiktoken-node) for
 * accurate token counting. Falls back to character-based heuristics
 * when tiktoken is unavailable.
 *
 * Supports model-specific tokenizers for OpenAI, Anthropic, Gemini,
 * and generic fallback estimation.
 *
 * @packageDocumentation
 */

import type { TokenCountParams, TokenCountResult } from './types'

// ── Character-per-token ratios by model family ─────────────────────────────────

const CHARS_PER_TOKEN: Record<string, number> = {
  openai: 4.0,
  anthropic: 4.0,
  gemini: 4.2,
  deepseek: 3.5,
  mistral: 4.0,
  llama: 3.8,
  default: 4.0,
}

// Per-message overhead in tokens
const MESSAGE_OVERHEAD = 4
// Per-role overhead for formatting
const ROLE_OVERHEAD: Record<string, number> = {
  system: 4,
  user: 4,
  assistant: 4,
  tool: 7, // tool messages have more overhead
}

// ── Model Family Detection ─────────────────────────────────────────────────────

function detectModelFamily(model: string): string {
  const lower = model.toLowerCase()
  if (lower.includes('gpt') || lower.includes('o1') || lower.includes('o3') || lower.includes('o4') || lower.includes('davinci')) return 'openai'
  if (lower.includes('claude')) return 'anthropic'
  if (lower.includes('gemini')) return 'gemini'
  if (lower.includes('deepseek')) return 'deepseek'
  if (lower.includes('mistral') || lower.includes('codestral') || lower.includes('ministral')) return 'mistral'
  if (lower.includes('llama')) return 'llama'
  if (lower.includes('groq')) return 'openai' // Groq serves OpenAI-compatible models
  return 'default'
}

// ── Tiktoken Detection ─────────────────────────────────────────────────────────

let tiktokenModule: unknown = null
let tiktokenLoadAttempted = false

async function tryLoadTiktoken(): Promise<boolean> {
  if (tiktokenLoadAttempted) return tiktokenModule !== null
  tiktokenLoadAttempted = true
  try {
    // Try js-tiktoken first (lighter, WASM-free)
    tiktokenModule = await import('js-tiktoken').catch(() => null)
    if (!tiktokenModule) {
      // Fall back to tiktoken-node
      tiktokenModule = await import('tiktoken').catch(() => null)
    }
    return tiktokenModule !== null
  } catch (error) {
    console.warn('[TOKEN-COUNTER] tiktoken not available:', error)
    return false
  }
}

// Model name to tiktoken encoding mapping
const MODEL_ENCODING_MAP: Record<string, string> = {
  'gpt-4o': 'o200k_base',
  'gpt-4o-mini': 'o200k_base',
  'gpt-4.1': 'o200k_base',
  'gpt-4.1-mini': 'o200k_base',
  'gpt-4.1-nano': 'o200k_base',
  'gpt-4-turbo': 'cl100k_base',
  'gpt-4': 'cl100k_base',
  'gpt-3.5-turbo': 'cl100k_base',
  'o1': 'o200k_base',
  'o1-mini': 'o200k_base',
  'o1-pro': 'o200k_base',
  'o3': 'o200k_base',
  'o3-mini': 'o200k_base',
  'o4-mini': 'o200k_base',
}

function getEncodingForModel(model: string): string {
  // Try exact match
  if (MODEL_ENCODING_MAP[model]) return MODEL_ENCODING_MAP[model]
  // Try prefix match (strip date suffixes like gpt-4o-2024-08-06)
  for (const [key, encoding] of Object.entries(MODEL_ENCODING_MAP)) {
    if (model.startsWith(key)) return encoding
  }
  // Default to o200k_base for newer models, cl100k_base for older
  return model.includes('gpt-4') || model.includes('o1') || model.includes('o3') || model.includes('o4')
    ? 'o200k_base'
    : 'cl100k_base'
}

// ── Heuristic Token Estimation ─────────────────────────────────────────────────

function estimateTokensHeuristic(text: string, family: string): number {
  if (!text || text.length === 0) return 0
  const ratio = CHARS_PER_TOKEN[family] ?? CHARS_PER_TOKEN.default
  return Math.ceil(text.length / ratio)
}

/**
 * Count tokens in a ChatMessage's content, handling both string and content-part arrays.
 */
function countMessageContentTokens(content: unknown, family: string): number {
  if (typeof content === 'string') return estimateTokensHeuristic(content, family)
  if (Array.isArray(content)) {
    let total = 0
    for (const part of content) {
      if (typeof part === 'object' && part !== null) {
        const p = part as Record<string, unknown>
        if (p.type === 'text' && typeof p.text === 'string') {
          total += estimateTokensHeuristic(p.text, family)
        } else if (p.type === 'image_url') {
          // Images cost differently by provider; use a conservative estimate
          total += 85 // ~85 tokens for a low-res image
        } else if (typeof p.text === 'string') {
          total += estimateTokensHeuristic(p.text, family)
        }
      }
    }
    return total
  }
  return 0
}

// ── Main Token Counter Class ───────────────────────────────────────────────────

export class TokenCounter {
  private tiktokenAvailable = false

  /**
   * Count tokens for text or messages.
   * Uses tiktoken if available, otherwise falls back to heuristics.
   */
  async countTokens(params: TokenCountParams): Promise<TokenCountResult> {
    const family = detectModelFamily(params.model)
    const encoding = getEncodingForModel(params.model)

    if (params.text) {
      const tokens = await this._countText(params.text, encoding, family)
      return { tokens, model: params.model, method: this.tiktokenAvailable ? 'tiktoken' : 'heuristic' }
    }

    if (params.messages) {
      let total = 3 // ~3 tokens for overall formatting
      for (const msg of params.messages) {
        const roleOverhead = ROLE_OVERHEAD[msg.role] ?? 4
        const contentTokens = countMessageContentTokens(msg.content, family)
        total += roleOverhead + MESSAGE_OVERHEAD + contentTokens

        // Tool calls in assistant messages
        if (msg.tool_calls) {
          for (const tc of msg.tool_calls) {
            total += estimateTokensHeuristic(tc.function.name, family)
            total += estimateTokensHeuristic(tc.function.arguments, family)
            total += 10 // overhead per tool call
          }
        }
      }
      return { tokens: total, model: params.model, method: 'heuristic' }
    }

    return { tokens: 0, model: params.model, method: 'heuristic' }
  }

  /**
   * Count tokens for a list of messages (synchronous, always heuristic).
   */
  estimateMessagesTokens(
    messages: Array<{ role: string; content: string | unknown }>,
    model = 'gpt-4o'
  ): number {
    const family = detectModelFamily(model)
    let total = 3
    for (const msg of messages) {
      const roleOverhead = ROLE_OVERHEAD[msg.role] ?? 4
      const contentTokens = countMessageContentTokens(msg.content, family)
      total += roleOverhead + MESSAGE_OVERHEAD + contentTokens
    }
    return total
  }

  /**
   * Count tokens for a single text string (synchronous, always heuristic).
   */
  estimateTextTokens(text: string, model = 'gpt-4o'): number {
    if (!text) return 0
    const family = detectModelFamily(model)
    return estimateTokensHeuristic(text, family)
  }

  private async _countText(
    text: string,
    _encoding: string,
    family: string
  ): Promise<number> {
    // Try tiktoken if available
    this.tiktokenAvailable = await tryLoadTiktoken()
    if (this.tiktokenAvailable && tiktokenModule) {
      try {
        const mod = tiktokenModule as {
          encodingForModel?: (model: string) => { encode: (text: string) => { length: number }; free: () => void }
          getEncoding?: (name: string) => { encode: (text: string) => { length: number }; free: () => void }
        }
        let encoder: { encode: (t: string) => { length: number }; free: () => void } | null = null
        if (mod.encodingForModel) {
          encoder = mod.encodingForModel(_encoding)
        } else if (mod.getEncoding) {
          encoder = mod.getEncoding(_encoding)
        }
        if (encoder) {
          const count = encoder.encode(text).length
          encoder.free()
          return count
        }
      } catch (error) {
        console.warn('[TOKEN-COUNTER] tiktoken encode failed, falling back to heuristic:', error)
        // tiktoken failed, fall back to heuristic
      }
    }
    return estimateTokensHeuristic(text, family)
  }
}

// ── Singleton ──────────────────────────────────────────────────────────────────

export const tokenCounter = new TokenCounter()
