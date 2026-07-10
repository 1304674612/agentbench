'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Plus, Trash2, ChevronRight, TestTube, Loader2, Save } from 'lucide-react'
import { apiGet, apiPost, ApiFetchError } from '@/shared/lib/client-fetch'

interface Project {
  id: string
  name: string
}

interface TestCaseRow {
  id: string
  name: string
  input: string
  expected: string
}

function generateId(): string {
  return crypto.randomUUID()
}

export default function NewTestSuitePage() {
  const router = useRouter()
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [projectsLoading, setProjectsLoading] = useState(true)

  // Form state
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [projectId, setProjectId] = useState('')
  const [cases, setCases] = useState<TestCaseRow[]>([
    { id: generateId(), name: '', input: '', expected: '' },
  ])
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [caseErrors, setCaseErrors] = useState<Record<string, Record<string, string>>>({})

  useEffect(() => {
    async function loadProjects() {
      try {
        const data = await apiGet<{ projects: Project[] }>('/api/v1/projects')
        setProjects(data.projects || [])
        if (data.projects?.length > 0) setProjectId(data.projects[0].id)
      } catch (err) {
        if (err instanceof ApiFetchError) {
          if (err.status === 401) setError('Please sign in to continue')
          else if (err.status === 403) setError('You do not have permission')
          else setError(err.message)
        } else {
          setError('Failed to load projects')
        }
        console.error('[NewTestSuite] API error:', err)
      } finally {
        setProjectsLoading(false)
      }
    }
    loadProjects()
  }, [])

  function addTestCase() {
    setCases((prev) => [
      ...prev,
      { id: generateId(), name: '', input: '', expected: '' },
    ])
  }

  function removeTestCase(id: string) {
    setCases((prev) => prev.filter((c) => c.id !== id))
  }

  function updateTestCase(id: string, field: keyof TestCaseRow, value: string) {
    setCases((prev) =>
      prev.map((c) => (c.id === id ? { ...c, [field]: value } : c)),
    )
  }

  function validate(): boolean {
    const errors: Record<string, string> = {}
    const cErrors: Record<string, Record<string, string>> = {}

    // Suite name: required, 2-100 chars
    const trimmedName = name.trim()
    if (!trimmedName) {
      errors.name = 'Suite name is required.'
    } else if (trimmedName.length < 2) {
      errors.name = 'Suite name must be at least 2 characters.'
    } else if (trimmedName.length > 100) {
      errors.name = 'Suite name must be at most 100 characters.'
    }

    // Project
    if (!projectId) {
      errors.projectId = 'Please select a project.'
    }

    // Validate each test case
    for (const tc of cases) {
      const tcErrors: Record<string, string> = {}

      // If this row has any content, validate it
      const hasContent = tc.name.trim() || tc.input.trim() || tc.expected.trim()
      if (hasContent) {
        // Test case name: required, 1-200 chars
        const tcName = tc.name.trim()
        if (!tcName) {
          tcErrors.name = 'Test case name is required.'
        } else if (tcName.length > 200) {
          tcErrors.name = 'Test case name must be at most 200 characters.'
        }

        // Input: must be valid JSON if non-empty
        if (tc.input.trim()) {
          try {
            JSON.parse(tc.input)
          } catch {
            tcErrors.input = 'Input must be valid JSON.'
          }
        }

        // Expected: plain text keywords (comma-separated), used for contains matching
      }

      if (Object.keys(tcErrors).length > 0) {
        cErrors[tc.id] = tcErrors
      }
    }

    setFieldErrors(errors)
    setCaseErrors(cErrors)
    return Object.keys(errors).length === 0 && Object.keys(cErrors).length === 0
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    if (!validate()) return

    setLoading(true)

    try {
      // 1. Create the test suite
      const suite = await apiPost<{ id: string }>('/api/v1/suites', {
        projectId,
        name: name.trim(),
        description: description.trim() || undefined,
      })

      // 2. Create each test case
      const validCases = cases.filter((c) => c.name.trim())
      for (const tc of validCases) {
        let inputJson: Record<string, unknown> = {}
        if (tc.input.trim()) {
          try { inputJson = JSON.parse(tc.input) } catch {
            inputJson = { input: tc.input }
          }
        }

        try {
          await apiPost(`/api/v1/suites/${suite.id}/cases`, {
            name: tc.name.trim(),
            input: inputJson,
            assertions: tc.expected.trim()
              ? [{ type: 'contains', params: { expected: tc.expected.trim() } }]
              : [],
          })
        } catch (caseErr) {
          console.error('Failed to create test case:', tc.name, caseErr)
        }
      }

      router.push('/tests')
      router.refresh()
    } catch (err) {
      if (err instanceof ApiFetchError) {
        if (err.status === 401) setError('Please sign in to continue')
        else if (err.status === 403) setError('You do not have permission')
        else setError(err.message)
      } else {
        setError(err instanceof Error ? err.message : 'Something went wrong')
      }
      console.error('[NewTestSuite] API error:', err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-1.5 text-sm text-muted-foreground">
        <Link href="/tests" className="hover:text-foreground transition-colors">
          Tests
        </Link>
        <ChevronRight className="h-3.5 w-3.5" />
        <span className="text-foreground font-medium">New Test Suite</span>
      </nav>

      {/* Page Title */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">New Test Suite</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Create a test suite with one or more test cases to evaluate your agents.
        </p>
      </div>

      {error && (
        <div className="rounded-lg border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Suite Details */}
        <div className="rounded-xl border border-border bg-card p-5 space-y-4">
          <h2 className="font-semibold text-sm flex items-center gap-2">
            <TestTube className="h-4 w-4 text-muted-foreground" />
            Suite Details
          </h2>

          {/* Suite Name */}
          <div>
            <label htmlFor="suiteName" className="block text-sm font-medium mb-1.5">
              Suite Name <span className="text-red-400">*</span>
            </label>
            <input
              id="suiteName"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Customer Support Accuracy"
              className={`w-full rounded-lg border bg-background px-3 py-2 text-sm placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-foreground/10 focus:border-foreground/20 transition-colors ${fieldErrors.name ? 'border-red-400' : 'border-border'}`}
            />
            {fieldErrors.name && (
              <p className="text-red-400 text-xs mt-1">{fieldErrors.name}</p>
            )}
          </div>

          {/* Description */}
          <div>
            <label htmlFor="description" className="block text-sm font-medium mb-1.5">
              Description
            </label>
            <textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What does this test suite evaluate?"
              rows={3}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-foreground/10 focus:border-foreground/20 transition-colors resize-none"
            />
          </div>

          {/* Project */}
          <div>
            <label htmlFor="project" className="block text-sm font-medium mb-1.5">
              Project <span className="text-red-400">*</span>
            </label>
            {projectsLoading ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground py-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading projects...
              </div>
            ) : (
              <select
                id="project"
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
            )}
            {fieldErrors.projectId && (
              <p className="text-red-400 text-xs mt-1">{fieldErrors.projectId}</p>
            )}
          </div>
        </div>

        {/* Test Cases */}
        <div className="rounded-xl border border-border bg-card p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-sm flex items-center gap-2">
              <TestTube className="h-4 w-4 text-muted-foreground" />
              Test Cases
            </h2>
            <button
              type="button"
              onClick={addTestCase}
              className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-medium hover:bg-muted/50 transition-colors"
            >
              <Plus className="h-3.5 w-3.5" />
              Add Test Case
            </button>
          </div>

          {cases.length === 0 ? (
            <div className="rounded-lg border border-dashed border-border p-6 text-center">
              <p className="text-sm text-muted-foreground">
                No test cases yet. Click &quot;Add Test Case&quot; to get started.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {cases.map((tc, index) => (
                <div
                  key={tc.id}
                  className="rounded-lg border border-border bg-muted/20 p-4 space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      Test Case {index + 1}
                    </span>
                    {cases.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeTestCase(tc.id)}
                        className="text-muted-foreground hover:text-red-400 transition-colors"
                        title="Remove test case"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>

                  {/* Test case name */}
                  <div>
                    <label className="block text-xs font-medium mb-1 text-muted-foreground">
                      Name
                    </label>
                    <input
                      type="text"
                      value={tc.name}
                      onChange={(e) => updateTestCase(tc.id, 'name', e.target.value)}
                      placeholder="e.g. Greeting response should be friendly"
                      className={`w-full rounded-lg border bg-background px-3 py-2 text-sm placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-foreground/10 focus:border-foreground/20 transition-colors ${caseErrors[tc.id]?.name ? 'border-red-400' : 'border-border'}`}
                    />
                    {caseErrors[tc.id]?.name && (
                      <p className="text-red-400 text-xs mt-1">{caseErrors[tc.id].name}</p>
                    )}
                  </div>

                  {/* Input (JSON) */}
                  <div>
                    <label className="block text-xs font-medium mb-1 text-muted-foreground">
                      Input (JSON)
                    </label>
                    <textarea
                      value={tc.input}
                      onChange={(e) => updateTestCase(tc.id, 'input', e.target.value)}
                      placeholder='{"messages": [{"role": "user", "content": "Hello"}]}'
                      rows={3}
                      className={`w-full rounded-lg border bg-background px-3 py-2 text-sm font-mono placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-foreground/10 focus:border-foreground/20 transition-colors resize-none ${caseErrors[tc.id]?.input ? 'border-red-400' : 'border-border'}`}
                    />
                    {caseErrors[tc.id]?.input && (
                      <p className="text-red-400 text-xs mt-1">{caseErrors[tc.id].input}</p>
                    )}
                  </div>

                  {/* Expected output */}
                  <div>
                    <label className="block text-xs font-medium mb-1 text-muted-foreground">
                      Expected Keywords
                    </label>
                    <textarea
                      value={tc.expected}
                      onChange={(e) => updateTestCase(tc.id, 'expected', e.target.value)}
                      placeholder="Keywords that should appear in the response, e.g. refund, policy"
                      rows={2}
                      className={`w-full rounded-lg border bg-background px-3 py-2 text-sm placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-foreground/10 focus:border-foreground/20 transition-colors resize-none ${caseErrors[tc.id]?.expected ? 'border-red-400' : 'border-border'}`}
                    />
                    {caseErrors[tc.id]?.expected && (
                      <p className="text-red-400 text-xs mt-1">{caseErrors[tc.id].expected}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Submit */}
        <div className="flex items-center gap-3">
          <button
            type="submit"
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-lg bg-foreground px-4 py-2.5 text-sm font-medium text-background hover:bg-foreground/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            {loading ? 'Creating...' : 'Create Test Suite'}
          </button>
          <Link
            href="/tests"
            className="inline-flex items-center gap-2 rounded-lg border border-border px-4 py-2.5 text-sm font-medium hover:bg-muted/30 transition-colors"
          >
            Cancel
          </Link>
        </div>
      </form>
    </div>
  )
}
