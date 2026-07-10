/**
 * Dataset Types
 *
 * Core type definitions for the AgentBench Dataset system.
 * Supports loading, validation, splitting, sampling, versioning, and diffing
 * across multiple formats: CSV, JSON, JSONL, HuggingFace, OpenAI Evals,
 * DeepEval, and LangSmith.
 */

// ============================================================
// Format
// ============================================================

export type DatasetFormat =
  | 'csv'
  | 'json'
  | 'jsonl'
  | 'huggingface'
  | 'openai-evals'
  | 'deepeval'
  | 'langsmith'

// ============================================================
// DatasetItem — a single row/sample
// ============================================================

export interface DatasetItem {
  /** Unique identifier within the dataset */
  id: string

  /** The input payload (messages, text, variables, etc.) */
  input: unknown

  /** Exact expected output text */
  expected?: string

  /** Expected tool calls */
  toolCalls?: Array<{
    name: string
    arguments: Record<string, unknown>
  }>

  /** Substrings that must appear in the output */
  contains?: string[]

  /** Substrings that must NOT appear in the output */
  notContains?: string[]

  /** JSON schema the output must satisfy */
  schema?: Record<string, unknown>

  /** Arbitrary metadata (tags, labels, source info, etc.) */
  metadata?: Record<string, unknown>
}

// ============================================================
// DatasetMeta — top-level dataset descriptor
// ============================================================

export interface DatasetMeta {
  /** Human-readable name */
  name: string

  /** Source format */
  format: DatasetFormat

  /** Semantic version string */
  version: string

  /** Optional description */
  description?: string

  /** Author name/email */
  author?: string

  /** SPDX license identifier */
  license?: string

  /** Free-form tags */
  tags: string[]

  /** Number of items */
  itemCount: number

  /** JSON Schema describing the item shape (optional) */
  schema?: Record<string, unknown>

  /** Creation timestamp */
  createdAt: Date

  /** Last-updated timestamp */
  updatedAt: Date
}

// ============================================================
// DatasetVersion — an immutable point-in-time snapshot
// ============================================================

export interface DatasetVersion {
  /** The version label (e.g. "1.0.0", "v1", "2026-07-10") */
  version: string

  /** Number of items at this version */
  itemCount: number

  /** JSON diff payload against the previous version */
  diff?: Record<string, unknown>

  /** When this version was created */
  createdAt: Date
}

// ============================================================
// ValidationReport — result of running validate()
// ============================================================

export interface ValidationReport {
  /** Whether all items passed validation */
  valid: boolean

  /** Blocking errors (item index -> message) */
  errors: string[]

  /** Non-blocking warnings (item index -> message) */
  warnings: string[]

  /** Total number of items checked */
  itemCount: number

  /** Number of items with errors */
  errorCount: number

  /** Number of items with warnings */
  warningCount: number
}

// ============================================================
// SplitResult — result of running split()
// ============================================================

export interface SplitResult {
  /** Training split */
  train: DatasetItem[]

  /** Test split */
  test: DatasetItem[]

  /** Validation split (optional — may be empty) */
  validation: DatasetItem[]

  /** Split ratios used */
  ratios: {
    train: number
    test: number
    validation: number
  }

  /** Whether stratification was applied */
  stratified: boolean

  /** If stratified, the field used for strata */
  stratifyKey?: string
}

// ============================================================
// DiffResult — result of diff between two versions
// ============================================================

export interface DiffResult {
  /** Version A label */
  versionA: string

  /** Version B label */
  versionB: string

  /** Items added in version B */
  added: DatasetItem[]

  /** Items removed from version A */
  removed: DatasetItem[]

  /** Items present in both but with changed content */
  modified: Array<{
    /** The item identifier */
    id: string
    /** The version-A item */
    itemA: DatasetItem
    /** The version-B item */
    itemB: DatasetItem
    /** List of top-level property names that differ */
    changedFields: string[]
  }>

  /** Items unchanged between versions */
  unchanged: number

  /** High-level summary string */
  summary: string
}

// ============================================================
// Helper: structured input for CSV/JSONL parsing
// ============================================================

export interface CsvParseOptions {
  /** Delimiter character (default: ',') */
  delimiter?: string
  /** Whether the first row is a header */
  hasHeader?: boolean
  /** Column name -> DatasetItem property mapping */
  mapping?: Record<string, string>
  /** File encoding */
  encoding?: BufferEncoding
}

export interface JsonlParseOptions {
  /** File encoding */
  encoding?: BufferEncoding
}

// ============================================================
// HuggingFace, OpenAI Evals, DeepEval, LangSmith configs
// ============================================================

export interface HuggingFaceConfig {
  /** HuggingFace dataset path, e.g. "Anthropic/hh-rlhf" */
  repo: string
  /** Optional config / subset name */
  config?: string
  /** Optional split name (train/test/validation) */
  split?: string
  /** HuggingFace API token */
  token?: string
  /** Field mapping: hf column -> DatasetItem property */
  mapping?: Record<string, string>
}

export interface OpenAIEvalsConfig {
  /** File path to the eval JSONL file */
  filePath: string
  /** Field mapping */
  mapping?: Record<string, string>
}

export interface DeepEvalConfig {
  /** File path or dataset name */
  source: string
  /** Field mapping */
  mapping?: Record<string, string>
}

export interface LangSmithConfig {
  /** LangSmith dataset name or ID */
  datasetName: string
  /** LangSmith API key */
  apiKey?: string
  /** LangSmith API URL (defaults to https://api.smith.langchain.com) */
  apiUrl?: string
  /** Field mapping */
  mapping?: Record<string, string>
}

// ============================================================
// Sampling options
// ============================================================

export interface SampleOptions {
  /** Number of items to sample */
  count?: number
  /** Percentage of items to sample (0-100) */
  percentage?: number
  /** Random seed for reproducibility */
  seed?: number
}
