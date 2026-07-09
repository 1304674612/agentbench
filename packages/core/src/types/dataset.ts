export type DatasetFormat = 'csv' | 'json' | 'jsonl' | 'markdown' | 'conversation' | 'custom'
export type DatasetSplitType = 'train' | 'test' | 'validation'

export interface Dataset {
  id: string
  projectId: string
  name: string
  description?: string
  format: DatasetFormat
  tags?: string[]
  createdAt: Date
  updatedAt: Date
}

export interface DatasetItem {
  id: string
  datasetId: string
  split: DatasetSplitType
  input: DatasetInput
  expected?: DatasetExpected
  labels?: string[]
  metadata?: Record<string, unknown>
  sortOrder: number
  createdAt: Date
}

export interface DatasetInput {
  messages?: Array<{
    role: 'user' | 'assistant'
    content: string
  }>
  variables?: Record<string, string>
  context?: Record<string, unknown>
}

export interface DatasetExpected {
  output?: string
  toolCalls?: Array<{
    name: string
    arguments: Record<string, unknown>
  }>
  score?: Record<string, number>
}

export interface DatasetImportOptions {
  format: DatasetFormat
  delimiter?: string // for CSV
  hasHeader?: boolean
  mapping?: Record<string, string> // column mapping
  encoding?: string
}

export interface DatasetExportOptions {
  format: DatasetFormat
  includeExpected?: boolean
  includeMetadata?: boolean
  split?: DatasetSplitType
}
