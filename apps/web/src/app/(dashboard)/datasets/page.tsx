'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import Link from 'next/link'
import {
  Database,
  Upload,
  X,
  Loader2,
  FileJson,
  FileText,
  Table2,
  Plus,
  Clock,
  Layers,
} from 'lucide-react'
import { apiGet, apiPost, ApiFetchError } from '@/shared/lib/client-fetch'

interface Project {
  id: string
  name: string
}

interface Dataset {
  id: string
  name: string
  description?: string | null
  format: string
  version: string
  itemCount: number
  tags: string[]
  createdAt: string
  updatedAt: string
  projectId: string
  project?: { name: string }
}

const FORMAT_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  JSON: FileJson,
  JSONL: FileText,
  CSV: Table2,
  MARKDOWN: FileText,
}

export default function DatasetsPage() {
  const [datasets, setDatasets] = useState<Dataset[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showImport, setShowImport] = useState(false)

  const fetchDatasets = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      // Fetch all projects first
      const projData = await apiGet<{ projects: Project[] }>('/api/v1/projects')
      const allProjects: Project[] = projData.projects || []
      setProjects(allProjects)

      if (allProjects.length === 0) {
        setDatasets([])
        setLoading(false)
        return
      }

      // Fetch datasets for each project
      const datasetResults: Dataset[] = []
      for (const p of allProjects) {
        try {
          const data = await apiGet<{ datasets: Dataset[] }>(`/api/v1/projects/${p.id}/datasets`)
          if (data.datasets) {
            for (const ds of data.datasets) {
              datasetResults.push({
                ...ds,
                project: { name: p.name },
              })
            }
          }
        } catch {
          // Skip projects that fail to load
        }
      }

      setDatasets(datasetResults)
    } catch (err) {
      if (err instanceof ApiFetchError) {
        if (err.status === 401) setError('Please sign in to continue')
        else if (err.status === 403) setError('You do not have permission')
        else setError(err.message)
      } else {
        setError('Failed to load datasets')
      }
      console.error('[DatasetsPage] API error:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchDatasets()
  }, [fetchDatasets])

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Datasets</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage test datasets for your AI agent evaluation workflows.
          </p>
        </div>
        <button
          onClick={() => setShowImport(true)}
          className="inline-flex items-center gap-2 rounded-lg bg-foreground px-4 py-2 text-sm font-medium text-background hover:bg-foreground/90 transition-colors"
        >
          <Upload className="h-4 w-4" />
          Import Dataset
        </button>
      </div>

      {error && (
        <div className="rounded-lg border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400">
          {error}
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      )}

      {/* Empty State */}
      {!loading && datasets.length === 0 && (
        <div className="rounded-xl border border-dashed border-border p-12 text-center">
          <div className="flex justify-center mb-3">
            <Database className="h-8 w-8 text-muted-foreground/50" />
          </div>
          <p className="text-sm text-muted-foreground mb-1">No datasets yet</p>
          <p className="text-xs text-muted-foreground/70 mb-4">
            Import a CSV, JSON, or JSONL file to create your first dataset.
          </p>
          <button
            onClick={() => setShowImport(true)}
            className="inline-flex items-center gap-2 rounded-lg border border-border px-4 py-2 text-sm font-medium hover:bg-muted/30 transition-colors"
          >
            <Upload className="h-4 w-4" />
            Import Dataset
          </button>
        </div>
      )}

      {/* Datasets List */}
      {!loading && datasets.length > 0 && (
        <div className="space-y-3">
          {datasets.map((ds) => {
            const FormatIcon = FORMAT_ICONS[ds.format] ?? FileJson
            return (
              <div
                key={ds.id}
                className="rounded-xl border border-border bg-card overflow-hidden hover:border-foreground/10 transition-colors"
              >
                <div className="flex items-center justify-between px-4 py-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="rounded-lg bg-muted p-2 shrink-0">
                      <FormatIcon className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-sm truncate">{ds.name}</h3>
                        <span className="text-[10px] text-muted-foreground bg-muted rounded-full px-2 py-0.5 shrink-0">
                          {ds.format}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5">
                        {ds.project && (
                          <span className="flex items-center gap-1">
                            <Layers className="h-3 w-3" />
                            {ds.project.name}
                          </span>
                        )}
                        <span className="flex items-center gap-1">
                          <Database className="h-3 w-3" />
                          {ds.itemCount} item{ds.itemCount !== 1 ? 's' : ''}
                        </span>
                        <span>v{ds.version}</span>
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {new Date(ds.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0 ml-3">
                    {ds.tags.map((tag) => (
                      <span
                        key={tag}
                        className="text-[10px] text-muted-foreground bg-muted rounded-full px-2 py-0.5"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Import Modal */}
      {showImport && (
        <ImportModal
          projects={projects}
          onClose={() => setShowImport(false)}
          onSuccess={() => {
            setShowImport(false)
            fetchDatasets()
          }}
        />
      )}
    </div>
  )
}

// ---- Import Modal ----

function ImportModal({
  projects,
  onClose,
  onSuccess,
}: {
  projects: Project[]
  onClose: () => void
  onSuccess: () => void
}) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [name, setName] = useState('')
  const [projectId, setProjectId] = useState(projects.length > 0 ? projects[0].id : '')
  const [file, setFile] = useState<File | null>(null)
  const [fileContent, setFileContent] = useState<string>('')
  const [format, setFormat] = useState<'CSV' | 'JSON' | 'JSONL'>('JSON')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]
    if (!f) return
    setFile(f)

    // Detect format from extension
    const ext = f.name.split('.').pop()?.toLowerCase()
    if (ext === 'csv') setFormat('CSV')
    else if (ext === 'jsonl') setFormat('JSONL')
    else setFormat('JSON')

    // Read file content
    const reader = new FileReader()
    reader.onload = (ev) => {
      setFileContent((ev.target?.result as string) ?? '')
    }
    reader.readAsText(f)
  }

  function validate(): boolean {
    const errors: Record<string, string> = {}

    // Dataset name: required, 2-100 chars
    const trimmedName = name.trim()
    if (!trimmedName) {
      errors.name = 'Dataset name is required.'
    } else if (trimmedName.length < 2) {
      errors.name = 'Dataset name must be at least 2 characters.'
    } else if (trimmedName.length > 100) {
      errors.name = 'Dataset name must be at most 100 characters.'
    }

    // Project
    if (!projectId) {
      errors.projectId = 'Please select a project.'
    }

    // File: must be selected and have valid extension
    if (!file) {
      errors.file = 'Please select a file to import.'
    } else {
      const ext = file.name.split('.').pop()?.toLowerCase()
      if (!ext || !['csv', 'json', 'jsonl'].includes(ext)) {
        errors.file = 'File must be a .csv, .json, or .jsonl file.'
      }
    }

    setFieldErrors(errors)
    return Object.keys(errors).length === 0
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    if (!validate()) return

    setLoading(true)

    try {
      let data: unknown

      if (format === 'JSON') {
        data = JSON.parse(fileContent)
      } else if (format === 'JSONL') {
        data = fileContent
      } else {
        data = fileContent
      }

      // Create the dataset with import action (API handles both creation + data import)
      await apiPost(`/api/v1/projects/${projectId}/datasets`, {
        action: 'import',
        format,
        data,
      })

      onSuccess()
    } catch (err) {
      if (err instanceof ApiFetchError) {
        if (err.status === 401) setError('Please sign in to continue')
        else if (err.status === 403) setError('You do not have permission')
        else setError(err.message)
      } else {
        setError(err instanceof Error ? err.message : 'Import failed')
      }
      console.error('[ImportModal] API error:', err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="relative w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto rounded-xl border border-border bg-card shadow-2xl">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <div className="flex items-center gap-2">
            <Upload className="h-4 w-4 text-muted-foreground" />
            <h2 className="font-semibold text-sm">Import Dataset</h2>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {error && (
            <div className="rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-2 text-sm text-red-400">
              {error}
            </div>
          )}

          {/* Dataset Name */}
          <div>
            <label className="block text-sm font-medium mb-1.5">
              Dataset Name <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Customer Support Q&A"
              className={`w-full rounded-lg border bg-background px-3 py-2 text-sm placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-foreground/10 focus:border-foreground/20 transition-colors ${fieldErrors.name ? 'border-red-400' : 'border-border'}`}
            />
            {fieldErrors.name && <p className="text-red-400 text-xs mt-1">{fieldErrors.name}</p>}
          </div>

          {/* Project */}
          <div>
            <label className="block text-sm font-medium mb-1.5">
              Project <span className="text-red-400">*</span>
            </label>
            <select
              value={projectId}
              onChange={(e) => setProjectId(e.target.value)}
              className={`w-full rounded-lg border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-foreground/10 focus:border-foreground/20 transition-colors appearance-none ${fieldErrors.projectId ? 'border-red-400' : 'border-border'}`}
            >
              <option value="" disabled>
                Select a project
              </option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
            {fieldErrors.projectId && (
              <p className="text-red-400 text-xs mt-1">{fieldErrors.projectId}</p>
            )}
          </div>

          {/* File Upload */}
          <div>
            <label className="block text-sm font-medium mb-1.5">File (CSV, JSON, JSONL)</label>
            <div
              onClick={() => fileInputRef.current?.click()}
              className={`cursor-pointer rounded-lg border border-dashed p-6 text-center hover:border-foreground/20 hover:bg-muted/20 transition-colors ${fieldErrors.file ? 'border-red-400' : 'border-border'}`}
            >
              {file ? (
                <div className="space-y-1">
                  <FileJson className="h-6 w-6 text-muted-foreground mx-auto mb-1" />
                  <p className="text-sm font-medium">{file.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {(file.size / 1024).toFixed(1)} KB
                    {fileContent && ` · ${fileContent.split('\n').length} lines`}
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  <Plus className="h-6 w-6 text-muted-foreground mx-auto" />
                  <p className="text-sm text-muted-foreground">Click to select a file</p>
                  <p className="text-xs text-muted-foreground/70">
                    Supports CSV, JSON, and JSONL formats
                  </p>
                </div>
              )}
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,.json,.jsonl"
              onChange={handleFileChange}
              className="hidden"
            />
            {fieldErrors.file && <p className="text-red-400 text-xs mt-1">{fieldErrors.file}</p>}
          </div>

          {/* Format indicator */}
          {file && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span>Detected format:</span>
              <span className="rounded-full bg-muted px-2 py-0.5 font-medium text-foreground">
                {format}
              </span>
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center gap-3 pt-2">
            <button
              type="submit"
              disabled={loading}
              className="inline-flex items-center gap-2 rounded-lg bg-foreground px-4 py-2.5 text-sm font-medium text-background hover:bg-foreground/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Upload className="h-4 w-4" />
              )}
              {loading ? 'Importing...' : 'Import Dataset'}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="inline-flex items-center gap-2 rounded-lg border border-border px-4 py-2.5 text-sm font-medium hover:bg-muted/30 transition-colors"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
