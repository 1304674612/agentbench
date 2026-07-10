/**
 * Benchmark Marketplace types — the data model for publishing, discovering,
 * downloading, and running standardized agent benchmarks.
 *
 * The Benchmark Marketplace is to AI agent testing what Docker Hub is to
 * containers and PyPI/npm is to packages.
 */

import type { AssertionConfig } from './assertion'

// ── BenchmarkCategory ──────────────────────────────────────────────────

export type BenchmarkCategory =
  | 'customer-support'
  | 'medical'
  | 'finance'
  | 'coding'
  | 'sql'
  | 'writing'
  | 'research'
  | 'rag'
  | 'mcp'
  | 'tool-calling'
  | 'agent-workflow'
  | 'safety'
  | 'multi-agent'
  | 'general'

// ── Named Type Aliases ─────────────────────────────────────────────────

export type BenchmarkDifficulty = 'beginner' | 'intermediate' | 'advanced' | 'expert'

export type BenchmarkStatus = 'draft' | 'pending_review' | 'published' | 'deprecated'

// ── BenchmarkAuthor ────────────────────────────────────────────────────

export interface BenchmarkAuthor {
  name: string
  email?: string
  url?: string
}

// ── Benchmark ──────────────────────────────────────────────────────────

export interface Benchmark {
  /** Unique identifier */
  id: string

  /** Metadata — name, author, category, difficulty, etc. */
  meta: BenchmarkMeta

  /** Test suites that make up this benchmark */
  suites: BenchmarkSuite[]

  /** Required providers (e.g. ['openai', 'anthropic']) */
  providers: string[]

  /** Dataset bundled with or referenced by the benchmark */
  dataset: BenchmarkDatasetRef

  /** Expected results / baseline for comparison */
  baseline?: BenchmarkBaseline

  /** Leaderboard entries submitted by the community */
  leaderboard: LeaderboardEntry[]
}

// ── BenchmarkMeta ──────────────────────────────────────────────────────

export interface BenchmarkMeta {
  /** Human-readable name (e.g. "Customer Support v2") */
  name: string

  /** URL-friendly unique identifier (e.g. "agentbench/customer-support-v2") */
  slug: string

  /** Short description (1-2 sentences) */
  description: string

  /** Full markdown description */
  longDescription?: string

  /** Semantic version */
  version: string

  /** Author information */
  author: BenchmarkAuthor

  /** SPDX license identifier */
  license: 'MIT' | 'Apache-2.0' | 'CC-BY-4.0' | 'custom'

  /** Primary category */
  category: BenchmarkCategory

  /** Search/discovery tags */
  tags: string[]

  /** Difficulty level */
  difficulty: BenchmarkDifficulty

  /** README in markdown — rendered on the benchmark detail page */
  readme?: string

  /** Public homepage URL */
  homepage?: string

  /** Source code repository URL */
  repository?: string

  /** Icon URL or emoji */
  icon?: string

  /** First published date (ISO 8601) */
  createdAt: string

  /** Last updated date (ISO 8601) */
  updatedAt: string

  /** Total download count */
  downloads: number

  /** Average rating (1-5) */
  rating: number

  /** Number of ratings submitted */
  ratingsCount: number

  /** Publication status */
  status: BenchmarkStatus
}

// ── BenchmarkSuite ─────────────────────────────────────────────────────

export interface BenchmarkSuite {
  /** Suite name (e.g. "Refund Policy") */
  name: string

  /** What this suite tests */
  description: string

  /** Number of individual test cases in this suite */
  testCount: number

  /** Relative weight in the overall benchmark score (0-1, all suites sum to 1) */
  weight: number

  /** Assertions that define success for this suite */
  assertions: AssertionConfig[]
}

// ── BenchmarkDatasetRef ────────────────────────────────────────────────

export interface BenchmarkDatasetRef {
  /** Dataset ID if hosted on the platform, or a URI */
  id: string

  /** Human-readable name */
  name: string

  /** Format: csv, json, jsonl, etc. */
  format: string

  /** Number of items */
  itemCount: number

  /** URL to download the dataset (for external datasets) */
  url?: string

  /** Checksum for integrity verification */
  checksum?: string
}

// ── BenchmarkBaseline ──────────────────────────────────────────────────

export interface BenchmarkBaseline {
  /** The agent name or identifier used for the baseline run */
  agent: string

  /** Weighted overall score across all suites */
  overallScore: number

  /** Per-suite scores keyed by suite name */
  suiteScores: Record<string, number>

  /** Average latency in milliseconds */
  latency: number

  /** Total cost in USD */
  cost: number

  /** Total tokens consumed */
  tokens: number
}

// ── LeaderboardEntry ───────────────────────────────────────────────────

export interface LeaderboardEntry {
  /** Position on the leaderboard (1-based) */
  rank: number

  /** Name of the agent/submission */
  agent: string

  /** Who submitted this entry */
  author: string

  /** Weighted overall score across all suites */
  overallScore: number

  /** Per-suite scores keyed by suite name */
  suiteScores: Record<string, number>

  /** Average latency in milliseconds */
  latency: number

  /** Total cost in USD */
  cost: number

  /** Total tokens consumed */
  tokens: number

  /** When the entry was submitted (ISO 8601) */
  submittedAt: string

  /** Version of the agent being tested */
  version: string

  /** Whether the submission passed automated verification */
  verified: boolean
}

// ── Search & Publishing Params ─────────────────────────────────────────

export interface BenchmarkSearchParams {
  /** Free-text search query */
  query?: string

  /** Filter by category */
  category?: BenchmarkCategory

  /** Filter by difficulty */
  difficulty?: BenchmarkDifficulty

  /** Filter by tag */
  tags?: string[]

  /** Filter by license */
  license?: string

  /** Minimum rating (1-5) */
  minRating?: number

  /** Sort order */
  sort?: 'popular' | 'newest' | 'highest-rated' | 'most-downloaded'

  /** Sort order (alias — 'popular' | 'newest' | 'rating' | 'downloads') */
  sortBy?: 'popular' | 'newest' | 'rating' | 'downloads'

  /** Pagination — page number (1-based) */
  page?: number

  /** Pagination — items per page */
  pageSize?: number

  /** Pagination — max results to return */
  limit?: number

  /** Pagination — results offset */
  offset?: number
}

export interface BenchmarkPublishParams {
  /** Benchmark metadata */
  meta: Omit<BenchmarkMeta, 'createdAt' | 'updatedAt' | 'downloads' | 'rating' | 'ratingsCount' | 'status'>

  /** Test suites */
  suites: BenchmarkSuite[]

  /** Path to local benchmark package or URL to remote */
  source: string

  /** Whether this is a new benchmark or an update to an existing one */
  mode: 'create' | 'update'
}
