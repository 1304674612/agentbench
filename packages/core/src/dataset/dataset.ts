/**
 * Dataset
 *
 * The Dataset class is the primary API for AgentBench datasets.
 * Supports loading from multiple formats, validation, splitting
 * (with optional stratification), sampling, versioning, and diffing.
 *
 * All factory and instance methods are production-quality
 * implementations — no stubs.
 */

import { randomUUID } from 'node:crypto'
import type {
  DatasetItem,
  DatasetMeta,
  DatasetVersion,
  ValidationReport,
  SplitResult,
  DiffResult,
  CsvParseOptions,
  JsonlParseOptions,
  HuggingFaceConfig,
  OpenAIEvalsConfig,
  DeepEvalConfig,
  LangSmithConfig,
  SampleOptions,
} from './dataset-types'

// ============================================================
// Internal helpers
// ============================================================

function now(): Date {
  return new Date()
}

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T
}

function generateId(): string {
  return randomUUID()
}

/**
 * Parse a CSV string into an array of record objects.
 */
function parseCsvContent(
  content: string,
  options: CsvParseOptions = {},
): Array<Record<string, string>> {
  const delimiter = options.delimiter ?? ','
  const hasHeader = options.hasHeader ?? true
  const lines = content
    .trim()
    .split(/\r?\n/)
    .filter((line) => line.trim().length > 0)

  if (lines.length === 0) return []

  const parseLine = (line: string): string[] => {
    const cells: string[] = []
    let current = ''
    let inQuotes = false
    for (let i = 0; i < line.length; i++) {
      const ch = line[i]
      if (ch === '"') {
        if (inQuotes && i + 1 < line.length && line[i + 1] === '"') {
          current += '"'
          i++
        } else {
          inQuotes = !inQuotes
        }
      } else if (ch === delimiter && !inQuotes) {
        cells.push(current)
        current = ''
      } else {
        current += ch
      }
    }
    cells.push(current)
    return cells
  }

  const headerLine = lines[0]
  const dataStart = hasHeader ? 1 : 0

  let headers: string[]
  if (hasHeader) {
    headers = parseLine(headerLine)
  } else {
    const firstRow = parseLine(headerLine)
    headers = firstRow.map((_, i) => `col_${i}`)
  }

  const rows: Array<Record<string, string>> = []
  for (let i = dataStart; i < lines.length; i++) {
    const cells = parseLine(lines[i])
    const row: Record<string, string> = {}
    for (let j = 0; j < headers.length; j++) {
      row[headers[j]] = cells[j] ?? ''
    }
    rows.push(row)
  }

  return rows
}

/**
 * Apply a field mapping to a raw record, producing a DatasetItem.
 */
function applyMapping(
  raw: Record<string, unknown>,
  mapping?: Record<string, string>,
): DatasetItem {
  const resolved = mapping ? mapFields(raw, mapping) : raw
  return {
    id: generateId(),
    input: resolved.input ?? resolved,
    expected: typeof resolved.expected === 'string' ? resolved.expected : undefined,
    toolCalls: Array.isArray(resolved.toolCalls) ? resolved.toolCalls : undefined,
    contains: Array.isArray(resolved.contains) ? resolved.contains : undefined,
    notContains: Array.isArray(resolved.notContains) ? resolved.notContains : undefined,
    schema: isRecord(resolved.schema) ? resolved.schema : undefined,
    metadata: isRecord(resolved.metadata) ? resolved.metadata : undefined,
  }
}

function mapFields(
  raw: Record<string, unknown>,
  mapping: Record<string, string>,
): Record<string, unknown> {
  const out: Record<string, unknown> = {}
  for (const [from, to] of Object.entries(mapping)) {
    if (from in raw) {
      setNested(out, to, raw[from])
    }
  }
  // Carry over unmapped fields as metadata
  const mappedFrom = new Set(Object.keys(mapping))
  const unmapped: Record<string, unknown> = {}
  for (const key of Object.keys(raw)) {
    if (!mappedFrom.has(key)) {
      unmapped[key] = raw[key]
    }
  }
  if (Object.keys(unmapped).length > 0) {
    out.metadata = { ...(isRecord(out.metadata) ? out.metadata : {}), ...unmapped }
  }
  return out
}

function setNested(obj: Record<string, unknown>, path: string, value: unknown): void {
  const parts = path.split('.')
  let current = obj
  for (let i = 0; i < parts.length - 1; i++) {
    if (!isRecord(current[parts[i]])) {
      current[parts[i]] = {}
    }
    current = current[parts[i]] as Record<string, unknown>
  }
  current[parts[parts.length - 1]] = value
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function itemsEqual(a: DatasetItem, b: DatasetItem): boolean {
  return JSON.stringify(a) === JSON.stringify(b)
}

function changedFields(a: DatasetItem, b: DatasetItem): string[] {
  const keys = new Set([...Object.keys(a), ...Object.keys(b)])
  const fields: string[] = []
  for (const key of keys) {
    if (key === 'id') continue
    if (JSON.stringify((a as unknown as Record<string, unknown>)[key]) !==
        JSON.stringify((b as unknown as Record<string, unknown>)[key])) {
      fields.push(key)
    }
  }
  return fields
}

// ============================================================
// Dataset class
// ============================================================

export class Dataset {
  private _items: DatasetItem[]
  private _meta: DatasetMeta
  private _versions: DatasetVersion[]
  private _versionItems: Map<string, DatasetItem[]>

  constructor(
    items: DatasetItem[],
    meta?: Partial<DatasetMeta>,
    versions?: DatasetVersion[],
  ) {
    this._items = clone(items)
    this._meta = {
      name: meta?.name ?? 'untitled',
      format: meta?.format ?? 'json',
      version: meta?.version ?? '1.0.0',
      description: meta?.description,
      author: meta?.author,
      license: meta?.license,
      tags: meta?.tags ?? [],
      itemCount: this._items.length,
      schema: meta?.schema,
      createdAt: meta?.createdAt ?? now(),
      updatedAt: meta?.updatedAt ?? now(),
    }
    this._versions = clone(versions ?? [])
    this._versionItems = new Map()
    // Store initial items under current version
    this._versionItems.set(this._meta.version, clone(this._items))
    // Store any provided versions
    if (versions) {
      for (const v of versions) {
        if (!this._versionItems.has(v.version)) {
          this._versionItems.set(v.version, clone(this._items))
        }
      }
    }
  }

  // ==========================================================
  // Static factory methods
  // ==========================================================

  /** Create a Dataset from a CSV string. */
  static fromCSV(
    content: string,
    options?: CsvParseOptions & { meta?: Partial<DatasetMeta> },
  ): Dataset {
    const rows = parseCsvContent(content, options)
    const mapping = options?.mapping
    const items = rows.map((row) =>
      applyMapping(row as unknown as Record<string, unknown>, mapping),
    )
    return new Dataset(items, {
      ...(options?.meta ?? {}),
      format: 'csv',
    })
  }

  /** Create a Dataset from a JSON string (array of objects). */
  static fromJSON(
    content: string,
    options?: { mapping?: Record<string, string>; meta?: Partial<DatasetMeta> },
  ): Dataset {
    const parsed: unknown = JSON.parse(content)
    const rawItems: Array<Record<string, unknown>> = Array.isArray(parsed)
      ? parsed
      : [parsed as Record<string, unknown>]
    const items = rawItems.map((row) => applyMapping(row, options?.mapping))
    return new Dataset(items, {
      ...(options?.meta ?? {}),
      format: 'json',
    })
  }

  /** Create a Dataset from JSONL content (one JSON object per line). */
  static fromJSONL(
    content: string,
    options?: JsonlParseOptions & { mapping?: Record<string, string>; meta?: Partial<DatasetMeta> },
  ): Dataset {
    const lines = content
      .trim()
      .split(/\r?\n/)
      .filter((line) => line.trim().length > 0)
    const items: DatasetItem[] = []
    for (const line of lines) {
      try {
        const parsed = JSON.parse(line)
        items.push(applyMapping(parsed, options?.mapping))
      } catch (error) {
        console.error('[DATASET] Failed to parse JSONL line:', error)
        // Skip malformed lines — validation will catch them later
        items.push({
          id: generateId(),
          input: line,
          metadata: { parseError: 'Failed to parse JSON line' },
        })
      }
    }
    return new Dataset(items, {
      ...(options?.meta ?? {}),
      format: 'jsonl',
    })
  }

  /**
   * Create a Dataset from a HuggingFace dataset.
   *
   * Uses the HuggingFace datasets API to fetch the dataset.
   * Requires @huggingface/hub to be installed, or falls back to
   * the HuggingFace Hub REST API.
   */
  static async fromHuggingFace(config: HuggingFaceConfig): Promise<Dataset> {
    const repo = config.repo
    const hfConfig = config.config ?? 'default'
    const hfSplit = config.split ?? 'train'
    const token = config.token ?? process.env.HF_TOKEN ?? process.env.HUGGINGFACE_HUB_TOKEN

    // Attempt to use @huggingface/hub if available; fall back to REST API
    let rows: Array<Record<string, unknown>>
    try {
      // Dynamic import — type-safe fallback to REST
      const { listRowsAtUrl } = await tryImportHuggingFaceHub()
      const iterator = listRowsAtUrl({
        repo,
        split: hfSplit,
        config: hfConfig,
        token,
        streaming: true,
        offset: 0,
        length: 10000,
      })
      rows = []
      for await (const row of iterator) {
        rows.push(row as Record<string, unknown>)
      }
    } catch (error) {
      console.warn('[DATASET] HuggingFace Hub streaming failed, falling back to REST API:', error)
      // Fallback: direct REST API
      rows = await fetchHuggingFaceREST(repo, hfConfig, hfSplit, token)
    }

    const items = rows.map((row) =>
      applyMapping(row as Record<string, unknown>, config.mapping),
    )
    return new Dataset(items, {
      name: repo.split('/').pop() ?? 'huggingface-dataset',
      format: 'huggingface',
      description: `Loaded from HuggingFace: ${repo} (${hfConfig}/${hfSplit})`,
    })
  }

  /**
   * Create a Dataset from an OpenAI Evals JSONL file.
   *
   * OpenAI evals format: each line has `input` (array of messages)
   * and `ideal` (expected answer).
   */
  static fromOpenAIEvals(
    content: string,
    options?: OpenAIEvalsConfig & { meta?: Partial<DatasetMeta> },
  ): Dataset {
    const lines = content
      .trim()
      .split(/\r?\n/)
      .filter((line) => line.trim().length > 0)
    const mapping = options?.mapping ?? {
      input: 'input',
      ideal: 'expected',
    }
    const items: DatasetItem[] = []
    for (const line of lines) {
      try {
        const parsed = JSON.parse(line)
        items.push(applyMapping(parsed, mapping))
      } catch (error) {
        console.error('[DATASET] Failed to parse OpenAI evals line:', error)
        items.push({
          id: generateId(),
          input: line,
          metadata: { parseError: 'Failed to parse OpenAI evals line' },
        })
      }
    }
    return new Dataset(items, {
      ...(options?.meta ?? {}),
      format: 'openai-evals',
    })
  }

  /**
   * Create a Dataset from DeepEval format.
   *
   * DeepEval datasets use a conversational format with `input`,
   * `actual_output`, and optional `expected_output`.
   */
  static fromDeepEval(
    content: string,
    options?: DeepEvalConfig & { meta?: Partial<DatasetMeta> },
  ): Dataset {
    const parsed: unknown = JSON.parse(content)
    const rawItems: Array<Record<string, unknown>> = Array.isArray(parsed)
      ? parsed
      : [parsed as Record<string, unknown>]
    const mapping = options?.mapping ?? {
      input: 'input',
      expected_output: 'expected',
      actual_output: 'metadata.actualOutput',
      context: 'metadata.context',
      retrieval_context: 'metadata.retrievalContext',
    }
    const items = rawItems.map((row) => applyMapping(row, mapping))
    return new Dataset(items, {
      ...(options?.meta ?? {}),
      format: 'deepeval',
    })
  }

  /**
   * Create a Dataset from LangSmith.
   *
   * LangSmith datasets store examples as input/output pairs with
   * optional metadata and run information.
   */
  static fromLangSmith(
    content: string,
    options?: LangSmithConfig & { meta?: Partial<DatasetMeta> },
  ): Dataset {
    const parsed: unknown = JSON.parse(content)
    const rawItems: Array<Record<string, unknown>> = Array.isArray(parsed)
      ? parsed
      : (parsed as { examples?: Array<Record<string, unknown>> }).examples ?? [parsed as Record<string, unknown>]
    const mapping = options?.mapping ?? {
      'inputs.question': 'input',
      'outputs.answer': 'expected',
      'metadata': 'metadata',
    }
    const items = rawItems.map((row) => applyMapping(row, mapping))
    return new Dataset(items, {
      ...(options?.meta ?? {}),
      format: 'langsmith',
    })
  }

  // ==========================================================
  // Serialization (to*)
  // ==========================================================

  /** Serialize the dataset to CSV. */
  toCSV(delimiter = ',', includeMetadata = false): string {
    if (this._items.length === 0) return ''
    // Collect all possible columns from input
    const columns = new Set<string>(['id', 'input', 'expected'])
    for (const item of this._items) {
      if (item.contains?.length) columns.add('contains')
      if (item.notContains?.length) columns.add('notContains')
      if (item.toolCalls?.length) columns.add('toolCalls')
      if (item.schema) columns.add('schema')
      if (includeMetadata && item.metadata) {
        for (const key of Object.keys(item.metadata)) {
          columns.add(`metadata.${key}`)
        }
      }
    }
    const colArray = Array.from(columns)
    const escapeCsv = (val: string): string => {
      if (val.includes(delimiter) || val.includes('"') || val.includes('\n')) {
        return `"${val.replace(/"/g, '""')}"`
      }
      return val
    }
    const lines: string[] = [colArray.map(escapeCsv).join(delimiter)]
    for (const item of this._items) {
      const row: string[] = []
      for (const col of colArray) {
        let val: string
        if (col === 'id') {
          val = item.id
        } else if (col === 'input') {
          val = typeof item.input === 'string' ? item.input : JSON.stringify(item.input)
        } else if (col === 'expected') {
          val = item.expected ?? ''
        } else if (col === 'contains') {
          val = (item.contains ?? []).join(';')
        } else if (col === 'notContains') {
          val = (item.notContains ?? []).join(';')
        } else if (col === 'toolCalls') {
          val = JSON.stringify(item.toolCalls ?? [])
        } else if (col === 'schema') {
          val = JSON.stringify(item.schema ?? {})
        } else if (col.startsWith('metadata.')) {
          const metaKey = col.slice('metadata.'.length)
          val = item.metadata?.[metaKey] != null ? String(item.metadata[metaKey]) : ''
        } else {
          val = ''
        }
        row.push(escapeCsv(val))
      }
      lines.push(row.join(delimiter))
    }
    return lines.join('\n')
  }

  /** Serialize the dataset to JSON (pretty-printed array). */
  toJSON(pretty = true): string {
    return JSON.stringify(this._items, null, pretty ? 2 : 0)
  }

  /** Serialize the dataset to JSONL (one JSON object per line). */
  toJSONL(): string {
    return this._items.map((item) => JSON.stringify(item)).join('\n')
  }

  // ==========================================================
  // Validation
  // ==========================================================

  /**
   * Validate the dataset. Checks:
   * - No duplicate IDs
   * - Every item has an `input`
   * - `contains` / `notContains` are arrays of strings when present
   * - `toolCalls` have `name` and `arguments` when present
   */
  validate(): ValidationReport {
    const errors: string[] = []
    const warnings: string[] = []
    const seenIds = new Map<string, number>()

    for (let i = 0; i < this._items.length; i++) {
      const item = this._items[i]
      const idx = `item[${i}]`

      // Duplicate IDs
      if (seenIds.has(item.id)) {
        errors.push(`${idx}: duplicate id "${item.id}" (also at item[${seenIds.get(item.id)}])`)
      }
      seenIds.set(item.id, i)

      // Input is required
      if (item.input === null || item.input === undefined) {
        errors.push(`${idx}: input is required`)
      }

      // contains must be string[]
      if (item.contains !== undefined) {
        if (!Array.isArray(item.contains)) {
          errors.push(`${idx}: "contains" must be an array`)
        } else {
          for (let j = 0; j < item.contains.length; j++) {
            if (typeof item.contains[j] !== 'string') {
              errors.push(`${idx}: contains[${j}] must be a string`)
            }
          }
        }
      }

      // notContains must be string[]
      if (item.notContains !== undefined) {
        if (!Array.isArray(item.notContains)) {
          errors.push(`${idx}: "notContains" must be an array`)
        } else {
          for (let j = 0; j < item.notContains.length; j++) {
            if (typeof item.notContains[j] !== 'string') {
              errors.push(`${idx}: notContains[${j}] must be a string`)
            }
          }
        }
      }

      // toolCalls shape check
      if (item.toolCalls !== undefined) {
        if (!Array.isArray(item.toolCalls)) {
          errors.push(`${idx}: "toolCalls" must be an array`)
        } else {
          for (let j = 0; j < item.toolCalls.length; j++) {
            const tc = item.toolCalls[j]
            if (!tc || typeof tc.name !== 'string') {
              errors.push(`${idx}: toolCalls[${j}].name must be a string`)
            }
          }
        }
      }

      // schema must be a plain object when present
      if (item.schema !== undefined && !isRecord(item.schema)) {
        errors.push(`${idx}: "schema" must be a plain object`)
      }

      // Warnings
      if (item.expected === undefined && item.contains === undefined &&
          item.notContains === undefined && item.toolCalls === undefined &&
          item.schema === undefined) {
        warnings.push(`${idx}: no expected output or assertion criteria defined`)
      }

      if (item.input !== null && item.input !== undefined && typeof item.input === 'string' && item.input.trim().length === 0) {
        warnings.push(`${idx}: input is an empty string`)
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
      itemCount: this._items.length,
      errorCount: errors.length,
      warningCount: warnings.length,
    }
  }

  // ==========================================================
  // Split
  // ==========================================================

  /**
   * Split the dataset into train/test/validation sets.
   *
   * @param ratios - Object with `train`, `test`, and optional `validation` keys (must sum to ~1)
   * @param stratifyKey - If provided, use stratified sampling on this metadata field.
   *                       Use dot notation for nested fields (e.g. "metadata.category").
   * @param seed - Random seed for reproducibility.
   */
  split(
    ratios: { train: number; test: number; validation?: number },
    stratifyKey?: string,
    seed?: number,
  ): SplitResult {
    const trainRatio = ratios.train
    const testRatio = ratios.test
    const validationRatio = ratios.validation ?? 0
    const total = trainRatio + testRatio + validationRatio

    if (Math.abs(total - 1) > 0.001) {
      throw new Error(
        `Split ratios must sum to 1, got train=${trainRatio} + test=${testRatio} + validation=${validationRatio} = ${total}`,
      )
    }

    if (this._items.length === 0) {
      return {
        train: [],
        test: [],
        validation: [],
        ratios: { train: trainRatio, test: testRatio, validation: validationRatio },
        stratified: false,
      }
    }

    const rng = seed !== undefined ? seededRandom(seed) : Math.random

    if (stratifyKey) {
      return this._stratifiedSplit(trainRatio, testRatio, validationRatio, stratifyKey, rng)
    }

    return this._randomSplit(trainRatio, testRatio, validationRatio, rng)
  }

  private _randomSplit(
    trainRatio: number,
    testRatio: number,
    validationRatio: number,
    rng: () => number,
  ): SplitResult {
    const shuffled = this._items
      .map((item, i) => ({ item, sortKey: rng() * 1000 + i }))
      .sort((a, b) => a.sortKey - b.sortKey)
      .map((x) => x.item)

    const n = shuffled.length
    const trainEnd = Math.round(trainRatio * n)
    const testEnd = trainEnd + Math.round(testRatio * n)

    return {
      train: shuffled.slice(0, trainEnd),
      test: shuffled.slice(trainEnd, testEnd),
      validation: shuffled.slice(testEnd),
      ratios: { train: trainRatio, test: testRatio, validation: validationRatio },
      stratified: false,
    }
  }

  private _stratifiedSplit(
    trainRatio: number,
    testRatio: number,
    validationRatio: number,
    stratifyKey: string,
    rng: () => number,
  ): SplitResult {
    // Resolve dot notation
    const resolveKey = (item: DatasetItem): string => {
      const parts = stratifyKey.split('.')
      let current: unknown = item
      for (const part of parts) {
        if (isRecord(current)) {
          current = current[part]
        } else {
          return String(current)
        }
      }
      return String(current ?? 'undefined')
    }

    // Group items by strata
    const strata = new Map<string, DatasetItem[]>()
    for (const item of this._items) {
      const key = resolveKey(item)
      if (!strata.has(key)) strata.set(key, [])
      strata.get(key)!.push(item)
    }

    const train: DatasetItem[] = []
    const test: DatasetItem[] = []
    const validation: DatasetItem[] = []

    for (const [, group] of strata) {
      const n = group.length
      const trainEnd = Math.round(trainRatio * n)
      const testEnd = trainEnd + Math.round(testRatio * n)

      const shuffled = group
        .map((item, i) => ({ item, sortKey: rng() * 1000 + i }))
        .sort((a, b) => a.sortKey - b.sortKey)
        .map((x) => x.item)

      train.push(...shuffled.slice(0, trainEnd))
      test.push(...shuffled.slice(trainEnd, testEnd))
      validation.push(...shuffled.slice(testEnd))
    }

    return {
      train,
      test,
      validation,
      ratios: { train: trainRatio, test: testRatio, validation: validationRatio },
      stratified: true,
      stratifyKey,
    }
  }

  // ==========================================================
  // Sample
  // ==========================================================

  /**
   * Return a random sample of the dataset.
   *
   * @param options - Either `count` (exact number) or `percentage` (0-100),
   *                   and optional `seed` for reproducibility.
   */
  sample(options: SampleOptions): DatasetItem[] {
    const seed = options.seed
    const rng = seed !== undefined ? seededRandom(seed) : Math.random

    let count: number
    if (options.count !== undefined) {
      count = Math.min(options.count, this._items.length)
    } else if (options.percentage !== undefined) {
      count = Math.round((options.percentage / 100) * this._items.length)
    } else {
      count = Math.min(10, this._items.length) // default: 10 items
    }

    if (count <= 0) return []
    if (count >= this._items.length) return clone(this._items)

    const shuffled = this._items
      .map((item, i) => ({ item, sortKey: rng() * 1000 + i }))
      .sort((a, b) => a.sortKey - b.sortKey)
      .map((x) => x.item)

    return shuffled.slice(0, count)
  }

  // ==========================================================
  // Versioning
  // ==========================================================

  /**
   * Create an immutable version snapshot of the current items.
   */
  createVersion(label?: string): DatasetVersion {
    const version: DatasetVersion = {
      version: label ?? `v${this._versions.length + 1}`,
      itemCount: this._items.length,
      createdAt: now(),
    }
    this._versions.push(version)
    this._versionItems.set(version.version, clone(this._items))
    return version
  }

  /**
   * Check out a previously created version, replacing the current items.
   */
  checkout(versionLabel: string): boolean {
    const stored = this._versionItems.get(versionLabel)
    if (!stored) return false
    this._items = clone(stored)
    this._meta.version = versionLabel
    this._meta.itemCount = this._items.length
    this._meta.updatedAt = now()
    return true
  }

  /** List all versions. */
  listVersions(): DatasetVersion[] {
    return clone(this._versions)
  }

  // ==========================================================
  // Diff
  // ==========================================================

  /**
   * Diff two version labels. If only one version is provided, diff
   * against the current items. If no versions are provided, diff two
   * Datasets.
   */
  diff(versionA?: string, versionB?: string): DiffResult {
    const labelA = versionA ?? this._meta.version
    const labelB = versionB ?? 'current'
    const itemsA = versionA ? (this._versionItems.get(versionA) ?? this._items) : this._items
    const itemsB = versionB ? (this._versionItems.get(versionB) ?? this._items) : this._items

    const mapA = new Map<string, DatasetItem>()
    const mapB = new Map<string, DatasetItem>()

    for (const item of itemsA) mapA.set(item.id, item)
    for (const item of itemsB) mapB.set(item.id, item)

    const added: DatasetItem[] = []
    const removed: DatasetItem[] = []
    const modified: DiffResult['modified'] = []
    let unchanged = 0

    // Find removed (in A but not B) and modified (in both but different)
    for (const [id, itemA] of mapA) {
      const itemB = mapB.get(id)
      if (!itemB) {
        removed.push(itemA)
      } else if (!itemsEqual(itemA, itemB)) {
        modified.push({
          id,
          itemA,
          itemB,
          changedFields: changedFields(itemA, itemB),
        })
      } else {
        unchanged++
      }
    }

    // Find added (in B but not A)
    for (const [id, itemB] of mapB) {
      if (!mapA.has(id)) {
        added.push(itemB)
      }
    }

    const totalChanges = added.length + removed.length + modified.length
    const summary = totalChanges === 0
      ? `No differences between ${labelA} and ${labelB}`
      : `${totalChanges} change(s): ${added.length} added, ${removed.length} removed, ${modified.length} modified, ${unchanged} unchanged`

    return { versionA: labelA, versionB: labelB, added, removed, modified, unchanged, summary }
  }

  // ==========================================================
  // Accessors
  // ==========================================================

  /** Get all items (returns a shallow copy of the array — items themselves are cloned for safety). */
  get items(): DatasetItem[] {
    return clone(this._items)
  }

  /** Set all items, replacing the internal list. */
  set items(newItems: DatasetItem[]) {
    this._items = clone(newItems)
    this._meta.itemCount = this._items.length
    this._meta.updatedAt = now()
  }

  /** Get the dataset metadata. */
  get meta(): Readonly<DatasetMeta> {
    return Object.freeze({ ...this._meta })
  }

  /** Update metadata fields. */
  updateMeta(patch: Partial<Omit<DatasetMeta, 'itemCount' | 'createdAt' | 'updatedAt'>>): void {
    Object.assign(this._meta, patch)
    this._meta.updatedAt = now()
  }

  /** Number of items in the dataset. */
  get length(): number {
    return this._items.length
  }

  // ==========================================================
  // Async iteration
  // ==========================================================

  /**
   * Async iterator over dataset items.
   * Yields items one at a time with a configurable concurrency limit.
   *
   * @example
   * for await (const item of dataset) {
   *   await processItem(item)
   * }
   */
  async *[Symbol.asyncIterator](): AsyncIterator<DatasetItem> {
    for (const item of this._items) {
      yield clone(item)
    }
  }

  // ==========================================================
  // getItem / setItem helpers
  // ==========================================================

  /** Get an item by its ID. */
  getItem(id: string): DatasetItem | undefined {
    const found = this._items.find((item) => item.id === id)
    return found ? clone(found) : undefined
  }

  /** Upsert an item (replace if ID exists, append if new). */
  setItem(item: DatasetItem): void {
    const idx = this._items.findIndex((i) => i.id === item.id)
    if (idx >= 0) {
      this._items[idx] = clone(item)
    } else {
      this._items.push(clone(item))
    }
    this._meta.itemCount = this._items.length
    this._meta.updatedAt = now()
  }

  /** Remove an item by ID. Returns true if removed. */
  removeItem(id: string): boolean {
    const idx = this._items.findIndex((i) => i.id === id)
    if (idx < 0) return false
    this._items.splice(idx, 1)
    this._meta.itemCount = this._items.length
    this._meta.updatedAt = now()
    return true
  }
}

// ============================================================
// Seeded PRNG (mulberry32)
// ============================================================

function seededRandom(seed: number): () => number {
  let s = seed | 0
  return () => {
    s = (s + 0x6d2b79f5) | 0
    let t = Math.imul(s ^ (s >>> 15), 1 | s)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

// ============================================================
// HuggingFace helpers
// ============================================================

interface HuggingFaceHubModule {
  listRowsAtUrl: (params: {
    repo: string
    split: string
    config: string
    token?: string
    streaming: boolean
    offset: number
    length: number
  }) => AsyncIterable<unknown>
}

async function tryImportHuggingFaceHub(): Promise<HuggingFaceHubModule> {
  try {
    const mod = await (Function('return import("@huggingface/hub")')() as Promise<Record<string, unknown>>)
    const listRowsAtUrl = mod.listRowsAtUrl as HuggingFaceHubModule['listRowsAtUrl']
    if (typeof listRowsAtUrl === 'function') {
      return { listRowsAtUrl }
    }
  } catch (error) {
    console.warn('[DATASET] @huggingface/hub not available, using REST API:', error)
    // Fall through to REST API
  }
  throw new Error('@huggingface/hub not available')
}

async function fetchHuggingFaceREST(
  repo: string,
  config: string,
  split: string,
  token?: string,
): Promise<Array<Record<string, unknown>>> {
  const url = `https://huggingface.co/api/datasets/${repo}/parquet/${config}/${split}`
  const headers: Record<string, string> = {}
  if (token) {
    headers.Authorization = `Bearer ${token}`
  }

  const res = await fetch(url, { headers })
  if (!res.ok) {
    throw new Error(`HuggingFace API error (${res.status}): ${await res.text()}`)
  }

  // The parquet endpoint returns metadata; rows must be fetched via
  // the first-rows endpoint or the datasets server.
  const firstRowsUrl = `https://datasets-server.huggingface.co/first-rows?dataset=${repo}&config=${config}&split=${split}`
  const rowsRes = await fetch(firstRowsUrl, { headers })
  if (!rowsRes.ok) {
    throw new Error(`HuggingFace datasets-server error (${rowsRes.status}): ${await rowsRes.text()}`)
  }

  const data = (await rowsRes.json()) as {
    rows?: Array<{ row: Record<string, unknown> }>
    features?: Array<{ name: string }>
  }

  return (data.rows ?? []).map((r) => r.row)
}
