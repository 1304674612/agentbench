import { describe, it, expect } from 'vitest'
import { Dataset } from './dataset'
import type { DatasetItem } from './dataset-types'

// ============================================================
// Helpers
// ============================================================

function makeItem(overrides?: Partial<DatasetItem>): DatasetItem {
  return {
    id: overrides?.id ?? 'item-1',
    input: overrides?.input ?? 'What is 2+2?',
    expected: overrides?.expected ?? '4',
    ...overrides,
  }
}

function makeItems(n: number, prefix = 'item'): DatasetItem[] {
  return Array.from({ length: n }, (_, i) =>
    makeItem({ id: `${prefix}-${i + 1}`, input: `Question ${i + 1}`, expected: `Answer ${i + 1}` })
  )
}

// ============================================================
// Loading tests
// ============================================================

describe('Dataset', () => {
  describe('fromCSV', () => {
    it('parses a simple CSV with header', () => {
      const csv = `question,answer\nWhat is 2+2?,4\nWhat is the capital of France?,Paris`
      const ds = Dataset.fromCSV(csv)
      expect(ds.length).toBe(2)
      expect(ds.items[0].input).toBeDefined()
      expect(ds.meta.format).toBe('csv')
    })

    it('parses CSV without header', () => {
      const csv = `What is 2+2?,4\nWhat is the capital of France?,Paris`
      const ds = Dataset.fromCSV(csv, { hasHeader: false })
      expect(ds.length).toBe(2)
    })

    it('handles quoted CSV fields', () => {
      const csv = `question,answer\n"What is 2+2?",4\n"Hello, world","Goodbye, world"`
      const ds = Dataset.fromCSV(csv)
      expect(ds.length).toBe(2)
    })

    it('applies field mapping', () => {
      const csv = `q,a\nWhat is 2+2?,4`
      const ds = Dataset.fromCSV(csv, {
        mapping: { q: 'input', a: 'expected' },
      })
      expect(ds.getItem(ds.items[0].id)?.expected).toBe('4')
    })

    it('handles empty CSV', () => {
      const ds = Dataset.fromCSV('question,answer\n')
      expect(ds.length).toBe(0)
    })
  })

  describe('fromJSON', () => {
    it('parses a JSON array of objects', () => {
      const json = JSON.stringify([
        { input: 'What is 2+2?', expected: '4' },
        { input: 'What is the capital?', expected: 'Paris' },
      ])
      const ds = Dataset.fromJSON(json)
      expect(ds.length).toBe(2)
      expect(ds.meta.format).toBe('json')
    })

    it('wraps a single object in an array', () => {
      const json = JSON.stringify({ input: 'Hello', expected: 'World' })
      const ds = Dataset.fromJSON(json)
      expect(ds.length).toBe(1)
    })

    it('applies field mapping for JSON', () => {
      const json = JSON.stringify([{ q: 'What is 2+2?', a: '4' }])
      const ds = Dataset.fromJSON(json, { mapping: { q: 'input', a: 'expected' } })
      expect(ds.getItem(ds.items[0].id)?.expected).toBe('4')
    })
  })

  describe('fromJSONL', () => {
    it('parses JSONL content', () => {
      const jsonl = [
        JSON.stringify({ input: 'Q1', expected: 'A1' }),
        JSON.stringify({ input: 'Q2', expected: 'A2' }),
      ].join('\n')
      const ds = Dataset.fromJSONL(jsonl)
      expect(ds.length).toBe(2)
      expect(ds.meta.format).toBe('jsonl')
    })

    it('handles malformed lines gracefully', () => {
      const jsonl = [
        JSON.stringify({ input: 'Q1', expected: 'A1' }),
        'not valid json {{{',
        JSON.stringify({ input: 'Q3', expected: 'A3' }),
      ].join('\n')
      const ds = Dataset.fromJSONL(jsonl)
      expect(ds.length).toBe(3)
    })

    it('handles empty JSONL', () => {
      const ds = Dataset.fromJSONL('')
      expect(ds.length).toBe(0)
    })
  })

  describe('fromOpenAIEvals', () => {
    it('parses OpenAI evals JSONL format', () => {
      const jsonl = [
        JSON.stringify({ input: [{ role: 'user', content: 'Say hello' }], ideal: 'Hello!' }),
        JSON.stringify({ input: [{ role: 'user', content: 'Say goodbye' }], ideal: 'Goodbye!' }),
      ].join('\n')
      const ds = Dataset.fromOpenAIEvals(jsonl)
      expect(ds.length).toBe(2)
      expect(ds.meta.format).toBe('openai-evals')
    })
  })

  describe('fromDeepEval', () => {
    it('parses DeepEval JSON format', () => {
      const json = JSON.stringify([
        { input: 'What is AI?', expected_output: 'AI is...', actual_output: 'AI stands for...' },
      ])
      const ds = Dataset.fromDeepEval(json)
      expect(ds.length).toBe(1)
      expect(ds.meta.format).toBe('deepeval')
    })
  })

  describe('fromLangSmith', () => {
    it('parses LangSmith JSON format', () => {
      const json = JSON.stringify([
        { inputs: { question: 'What is 2+2?' }, outputs: { answer: '4' } },
        { inputs: { question: 'Capital of France?' }, outputs: { answer: 'Paris' } },
      ])
      const ds = Dataset.fromLangSmith(json)
      expect(ds.length).toBe(2)
      expect(ds.meta.format).toBe('langsmith')
    })
  })

  // ==========================================================
  // Serialization
  // ==========================================================

  describe('toCSV', () => {
    it('serializes dataset to CSV', () => {
      const ds = new Dataset(makeItems(2))
      const csv = ds.toCSV()
      expect(csv).toContain('id')
      expect(csv).toContain('input')
      expect(csv).toContain('expected')
      expect(csv.split('\n').length).toBeGreaterThanOrEqual(2)
    })

    it('returns empty string for empty dataset', () => {
      const ds = new Dataset([])
      expect(ds.toCSV()).toBe('')
    })
  })

  describe('toJSON', () => {
    it('serializes dataset to pretty JSON', () => {
      const ds = new Dataset(makeItems(1))
      const json = ds.toJSON()
      const parsed = JSON.parse(json)
      expect(Array.isArray(parsed)).toBe(true)
      expect(parsed.length).toBe(1)
    })

    it('serializes dataset to compact JSON', () => {
      const ds = new Dataset(makeItems(1))
      const json = ds.toJSON(false)
      expect(json).not.toContain('\n  ')
    })
  })

  describe('toJSONL', () => {
    it('serializes dataset to JSONL', () => {
      const ds = new Dataset(makeItems(3))
      const jsonl = ds.toJSONL()
      const lines = jsonl.split('\n').filter(Boolean)
      expect(lines.length).toBe(3)
      for (const line of lines) {
        expect(() => JSON.parse(line)).not.toThrow()
      }
    })
  })

  // ==========================================================
  // Validation
  // ==========================================================

  describe('validate', () => {
    it('returns valid for a well-formed dataset', () => {
      const ds = new Dataset(makeItems(3))
      const report = ds.validate()
      expect(report.valid).toBe(true)
      expect(report.errors.length).toBe(0)
    })

    it('detects duplicate IDs', () => {
      const ds = new Dataset([makeItem({ id: 'dup-1' }), makeItem({ id: 'dup-1' })])
      const report = ds.validate()
      expect(report.valid).toBe(false)
      expect(report.errors.some((e) => e.includes('duplicate'))).toBe(true)
    })

    it('detects missing input', () => {
      const ds = new Dataset([makeItem({ id: 'no-input-1', input: null as unknown as string })])
      const report = ds.validate()
      expect(report.valid).toBe(false)
      expect(report.errors.some((e) => e.includes('input'))).toBe(true)
    })

    it('validates contains is string array', () => {
      const ds = new Dataset([
        makeItem({ id: 'bad-contains', contains: 'not-an-array' as unknown as string[] }),
      ])
      const report = ds.validate()
      expect(report.valid).toBe(false)
      expect(report.errors.some((e) => e.includes('contains'))).toBe(true)
    })

    it('validates toolCalls shape', () => {
      const ds = new Dataset([
        makeItem({
          id: 'bad-tool',
          toolCalls: [{ name: 123 as unknown as string, arguments: {} }],
        }),
      ])
      const report = ds.validate()
      expect(report.valid).toBe(false)
      expect(report.errors.some((e) => e.includes('toolCalls'))).toBe(true)
    })

    it('warns when no assertion criteria are set', () => {
      const ds = new Dataset([{ id: 'no-criteria', input: 'Hello' }])
      const report = ds.validate()
      expect(report.warnings.length).toBeGreaterThan(0)
      expect(report.warnings.some((w) => w.includes('no expected'))).toBe(true)
    })

    it('warns on empty string input', () => {
      const ds = new Dataset([makeItem({ id: 'empty-input', input: '', expected: 'something' })])
      const report = ds.validate()
      expect(report.warnings.some((w) => w.includes('empty string'))).toBe(true)
    })

    it('reports correct counts', () => {
      const ds = new Dataset([
        makeItem({ id: 'dup' }),
        makeItem({ id: 'dup' }),
        makeItem({ id: 'no-input', input: null as unknown as string }),
      ])
      const report = ds.validate()
      expect(report.itemCount).toBe(3)
      expect(report.errorCount).toBeGreaterThanOrEqual(2)
    })
  })

  // ==========================================================
  // Split
  // ==========================================================

  describe('split', () => {
    it('splits dataset into train and test', () => {
      const ds = new Dataset(makeItems(10))
      const result = ds.split({ train: 0.8, test: 0.2 })
      expect(result.train.length).toBe(8)
      expect(result.test.length).toBe(2)
      expect(result.validation.length).toBe(0)
    })

    it('splits into train, test, and validation', () => {
      const ds = new Dataset(makeItems(10))
      const result = ds.split({ train: 0.7, test: 0.2, validation: 0.1 })
      expect(result.train.length).toBe(7)
      expect(result.test.length).toBe(2)
      expect(result.validation.length).toBe(1)
    })

    it('throws on ratios that do not sum to 1', () => {
      const ds = new Dataset(makeItems(10))
      expect(() => ds.split({ train: 0.5, test: 0.3 })).toThrow()
    })

    it('handles empty datasets', () => {
      const ds = new Dataset([])
      const result = ds.split({ train: 0.8, test: 0.2 })
      expect(result.train.length).toBe(0)
      expect(result.test.length).toBe(0)
    })

    it('supports seed for reproducibility', () => {
      const ds = new Dataset(makeItems(20))
      const a = ds.split({ train: 0.5, test: 0.5 }, undefined, 42)
      const b = ds.split({ train: 0.5, test: 0.5 }, undefined, 42)
      expect(a.train.map((i) => i.id)).toEqual(b.train.map((i) => i.id))
    })

    it('produces different results with different seeds', () => {
      const ds = new Dataset(makeItems(50))
      const a = ds.split({ train: 0.5, test: 0.5 }, undefined, 1)
      const b = ds.split({ train: 0.5, test: 0.5 }, undefined, 999)
      // Extremely unlikely to be identical with 50 items
      const idsA = a.train
        .map((i) => i.id)
        .sort()
        .join(',')
      const idsB = b.train
        .map((i) => i.id)
        .sort()
        .join(',')
      expect(idsA).not.toBe(idsB)
    })
  })

  describe('split with stratification', () => {
    it('stratifies on a metadata field', () => {
      const items: DatasetItem[] = [
        makeItem({ id: 'a-1', metadata: { category: 'A' } }),
        makeItem({ id: 'a-2', metadata: { category: 'A' } }),
        makeItem({ id: 'a-3', metadata: { category: 'A' } }),
        makeItem({ id: 'b-1', metadata: { category: 'B' } }),
        makeItem({ id: 'b-2', metadata: { category: 'B' } }),
      ]
      const ds = new Dataset(items)
      const result = ds.split({ train: 0.6, test: 0.4 }, 'metadata.category', 42)
      expect(result.stratified).toBe(true)
      expect(result.stratifyKey).toBe('metadata.category')
      // Each stratum should appear in splits proportionally
      expect(result.train.length + result.test.length).toBe(5)
    })
  })

  // ==========================================================
  // Sample
  // ==========================================================

  describe('sample', () => {
    it('samples by count', () => {
      const ds = new Dataset(makeItems(100))
      const sampled = ds.sample({ count: 10 })
      expect(sampled.length).toBe(10)
    })

    it('samples by percentage', () => {
      const ds = new Dataset(makeItems(100))
      const sampled = ds.sample({ percentage: 25 })
      expect(sampled.length).toBe(25)
    })

    it('defaults to 10 items', () => {
      const ds = new Dataset(makeItems(100))
      const sampled = ds.sample({})
      expect(sampled.length).toBe(10)
    })

    it('returns all items if count exceeds dataset size', () => {
      const ds = new Dataset(makeItems(5))
      const sampled = ds.sample({ count: 100 })
      expect(sampled.length).toBe(5)
    })

    it('returns empty array for 0 count', () => {
      const ds = new Dataset(makeItems(10))
      expect(ds.sample({ count: 0 }).length).toBe(0)
    })

    it('is reproducible with seed', () => {
      const ds = new Dataset(makeItems(50))
      const a = ds.sample({ count: 10, seed: 42 })
      const b = ds.sample({ count: 10, seed: 42 })
      expect(a.map((i) => i.id)).toEqual(b.map((i) => i.id))
    })
  })

  // ==========================================================
  // Versioning
  // ==========================================================

  describe('versioning', () => {
    it('creates a version snapshot', () => {
      const ds = new Dataset(makeItems(5))
      const v = ds.createVersion('v1')
      expect(v.version).toBe('v1')
      expect(v.itemCount).toBe(5)
      expect(ds.listVersions().length).toBe(1)
    })

    it('auto-generates version label', () => {
      const ds = new Dataset(makeItems(3))
      const v = ds.createVersion()
      expect(v.version).toBe('v1')
    })

    it('checkout restores items', () => {
      const ds = new Dataset(makeItems(10))
      ds.createVersion('snapshot')
      ds.setItem(makeItem({ id: 'new-item', input: 'extra' }))
      expect(ds.length).toBe(11)
      const ok = ds.checkout('snapshot')
      expect(ok).toBe(true)
      expect(ds.length).toBe(10)
    })

    it('checkout returns false for unknown version', () => {
      const ds = new Dataset(makeItems(3))
      expect(ds.checkout('nonexistent')).toBe(false)
    })

    it('lists all versions', () => {
      const ds = new Dataset(makeItems(5))
      ds.createVersion('v1')
      ds.createVersion('v2')
      const versions = ds.listVersions()
      expect(versions.length).toBe(2)
      expect(versions.map((v) => v.version)).toEqual(['v1', 'v2'])
    })
  })

  // ==========================================================
  // Diff
  // ==========================================================

  describe('diff', () => {
    it('reports no changes for identical versions', () => {
      const ds = new Dataset(makeItems(5))
      ds.createVersion('v1')
      const diff = ds.diff('v1', 'v1')
      expect(diff.added.length).toBe(0)
      expect(diff.removed.length).toBe(0)
      expect(diff.modified.length).toBe(0)
      expect(diff.summary).toContain('No differences')
    })

    it('detects added items', () => {
      const ds = new Dataset(makeItems(5))
      ds.createVersion('v1')
      ds.setItem(makeItem({ id: 'new-item', input: 'new' }))
      ds.createVersion('v2')
      const diff = ds.diff('v1', 'v2')
      expect(diff.added.length).toBe(1)
      expect(diff.added[0].id).toBe('new-item')
    })

    it('detects removed items', () => {
      const ds = new Dataset(makeItems(5))
      ds.createVersion('v1')
      ds.removeItem(ds.items[0].id)
      ds.createVersion('v2')
      const diff = ds.diff('v1', 'v2')
      expect(diff.removed.length).toBe(1)
    })

    it('detects modified items', () => {
      const ds = new Dataset(makeItems(5))
      ds.createVersion('v1')
      const item = ds.items[0]
      ds.setItem({ ...item, expected: 'Modified answer' })
      ds.createVersion('v2')
      const diff = ds.diff('v1', 'v2')
      expect(diff.modified.length).toBe(1)
      expect(diff.modified[0].changedFields).toContain('expected')
    })

    it('reports summary with change counts', () => {
      const ds = new Dataset(makeItems(10))
      ds.createVersion('v1')
      ds.removeItem(ds.items[0].id)
      ds.setItem(makeItem({ id: 'added', input: 'new' }))
      ds.createVersion('v2')
      const diff = ds.diff('v1', 'v2')
      expect(diff.summary).toContain('1 added')
      expect(diff.summary).toContain('1 removed')
    })

    it('tracks unchanged count correctly', () => {
      const ds = new Dataset(makeItems(5))
      ds.createVersion('v1')
      ds.setItem(makeItem({ id: 'added', input: 'new' }))
      ds.createVersion('v2')
      const diff = ds.diff('v1', 'v2')
      expect(diff.unchanged).toBe(5)
    })
  })

  // ==========================================================
  // Accessors & mutation
  // ==========================================================

  describe('items accessor', () => {
    it('returns a copy (mutations do not affect origin)', () => {
      const ds = new Dataset(makeItems(3))
      const items = ds.items
      items.pop()
      expect(ds.length).toBe(3)
    })

    it('setter replaces all items', () => {
      const ds = new Dataset(makeItems(3))
      ds.items = makeItems(7, 'new')
      expect(ds.length).toBe(7)
    })
  })

  describe('meta', () => {
    it('returns frozen metadata', () => {
      const ds = new Dataset(makeItems(3), { name: 'test-ds' })
      expect(ds.meta.name).toBe('test-ds')
      expect(Object.isFrozen(ds.meta)).toBe(true)
    })
  })

  describe('updateMeta', () => {
    it('updates metadata fields', () => {
      const ds = new Dataset(makeItems(3))
      ds.updateMeta({ name: 'renamed', description: 'A test' })
      expect(ds.meta.name).toBe('renamed')
      expect(ds.meta.description).toBe('A test')
    })

    it('does not allow changing itemCount via updateMeta', () => {
      const ds = new Dataset(makeItems(3))
      // itemCount is excluded from the patch type
      ds.updateMeta({ name: 'test' })
      expect(ds.meta.itemCount).toBe(3)
    })
  })

  describe('getItem / setItem / removeItem', () => {
    it('gets an item by ID', () => {
      const ds = new Dataset(makeItems(5))
      const item = ds.getItem('item-3')
      expect(item).toBeDefined()
      expect(item!.id).toBe('item-3')
    })

    it('returns undefined for unknown ID', () => {
      const ds = new Dataset(makeItems(3))
      expect(ds.getItem('no-such-id')).toBeUndefined()
    })

    it('sets an item (upsert)', () => {
      const ds = new Dataset(makeItems(3))
      const newItem = makeItem({ id: 'new-id', input: 'fresh' })
      ds.setItem(newItem)
      expect(ds.length).toBe(4)
      expect(ds.getItem('new-id')).toBeDefined()
    })

    it('updates existing item by ID', () => {
      const ds = new Dataset(makeItems(3))
      ds.setItem(makeItem({ id: 'item-1', input: 'updated' }))
      expect(ds.getItem('item-1')?.input).toBe('updated')
      expect(ds.length).toBe(3)
    })

    it('removes an item by ID', () => {
      const ds = new Dataset(makeItems(5))
      const ok = ds.removeItem('item-3')
      expect(ok).toBe(true)
      expect(ds.length).toBe(4)
      expect(ds.getItem('item-3')).toBeUndefined()
    })

    it('returns false when removing unknown ID', () => {
      const ds = new Dataset(makeItems(3))
      expect(ds.removeItem('nope')).toBe(false)
    })
  })

  // ==========================================================
  // Async iteration
  // ==========================================================

  describe('asyncIterator', () => {
    it('yields all items', async () => {
      const ds = new Dataset(makeItems(5))
      const collected: DatasetItem[] = []
      for await (const item of ds) {
        collected.push(item)
      }
      expect(collected.length).toBe(5)
    })

    it('yields clones (mutations do not affect origin)', async () => {
      const ds = new Dataset(makeItems(2))
      for await (const item of ds) {
        item.input = 'mutated'
      }
      expect(ds.getItem(ds.items[0].id)?.input).not.toBe('mutated')
    })
  })
})

// ============================================================
// Edge cases
// ============================================================

describe('Dataset edge cases', () => {
  it('handles very large datasets efficiently', () => {
    const ds = new Dataset(
      Array.from({ length: 5000 }, (_, i) => ({
        id: `item-${i}`,
        input: `test input ${i}`,
        expected: `test expected ${i}`,
      }))
    )
    expect(ds.validate().valid).toBe(true)
    const result = ds.split({ train: 0.8, test: 0.2 })
    expect(result.train.length + result.test.length).toBe(5000)
  })

  it('constructs with custom metadata', () => {
    const ds = new Dataset(makeItems(1), {
      name: 'Custom',
      format: 'jsonl',
      version: '2.0.0',
      author: 'Test Author',
      license: 'MIT',
      tags: ['test', 'example'],
      description: 'A test dataset',
    })
    expect(ds.meta.name).toBe('Custom')
    expect(ds.meta.author).toBe('Test Author')
    expect(ds.meta.license).toBe('MIT')
    expect(ds.meta.tags).toEqual(['test', 'example'])
  })

  it('preserves toolCalls in round-trip', () => {
    const ds = new Dataset([
      {
        id: 'tc-1',
        input: 'Search for cats',
        expected: 'Here are the results',
        toolCalls: [{ name: 'search', arguments: { query: 'cats' } }],
      },
    ])
    const json = ds.toJSON()
    const ds2 = Dataset.fromJSON(json)
    expect(ds2.length).toBe(1)
    const item = ds2.items[0]
    expect(item.toolCalls).toBeDefined()
    expect(item.toolCalls![0].name).toBe('search')
  })

  it('preserves contains/notContains in round-trip', () => {
    const ds = new Dataset([
      {
        id: 'cnc-1',
        input: 'Tell me a joke',
        expected: 'Why did the chicken cross the road?',
        contains: ['chicken', 'road'],
        notContains: ['offensive', 'violence'],
      },
    ])
    const json = ds.toJSON()
    const ds2 = Dataset.fromJSON(json)
    const item = ds2.items[0]
    expect(item.contains).toEqual(['chicken', 'road'])
    expect(item.notContains).toEqual(['offensive', 'violence'])
  })

  it('tracks item count in meta after mutations', () => {
    const ds = new Dataset(makeItems(5))
    expect(ds.meta.itemCount).toBe(5)
    ds.setItem(makeItem({ id: 'extra', input: 'more' }))
    expect(ds.meta.itemCount).toBe(6)
    ds.removeItem('extra')
    expect(ds.meta.itemCount).toBe(5)
  })
})
