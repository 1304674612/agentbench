'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { FlaskConical, ChevronRight, Loader2, Save, Beaker } from 'lucide-react'
import { apiGet, apiPost, ApiFetchError } from '@/shared/lib/client-fetch'

interface Project {
  id: string
  name: string
}

const MODEL_OPTIONS = [
  { value: 'gpt-4o', label: 'GPT-4o' },
  { value: 'gpt-4o-mini', label: 'GPT-4o Mini' },
  { value: 'gpt-4-turbo', label: 'GPT-4 Turbo' },
  { value: 'claude-sonnet-4-5', label: 'Claude Sonnet' },
  { value: 'claude-haiku-4-5', label: 'Claude Haiku' },
  { value: 'claude-opus-4-8', label: 'Claude Opus' },
  { value: 'gemini-2.5-pro', label: 'Gemini Pro' },
  { value: 'gemini-2.5-flash', label: 'Gemini Flash' },
  { value: 'deepseek-chat', label: 'DeepSeek Chat' },
  { value: 'deepseek-reasoner', label: 'DeepSeek Reasoner' },
]

interface VariantConfig {
  name: string
  model: string
  temperature: number
  systemPrompt: string
  maxTokens: number
}

export default function NewExperimentPage() {
  const router = useRouter()
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [projectsLoading, setProjectsLoading] = useState(true)

  // Form state
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [projectId, setProjectId] = useState('')
  const [runsPerVariant, setRunsPerVariant] = useState(10)

  const [variantA, setVariantA] = useState<VariantConfig>({
    name: 'A',
    model: 'gpt-4o',
    temperature: 0.7,
    systemPrompt: '',
    maxTokens: 4096,
  })

  const [variantB, setVariantB] = useState<VariantConfig>({
    name: 'B',
    model: 'claude-sonnet-4-5',
    temperature: 0.7,
    systemPrompt: '',
    maxTokens: 4096,
  })

  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [variantAErrors, setVariantAErrors] = useState<Record<string, string>>({})
  const [variantBErrors, setVariantBErrors] = useState<Record<string, string>>({})

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
        console.error('[NewExperiment] API error:', err)
      } finally {
        setProjectsLoading(false)
      }
    }
    loadProjects()
  }, [])

  function updateVariant(
    variant: 'A' | 'B',
    field: keyof VariantConfig,
    value: string | number,
  ) {
    const setter = variant === 'A' ? setVariantA : setVariantB
    setter((prev) => ({ ...prev, [field]: value }))
  }

  function validateVariant(
    variant: VariantConfig,
  ): Record<string, string> {
    const errors: Record<string, string> = {}

    // Variant name: required
    if (!variant.name.trim()) {
      errors.name = 'Variant name is required.'
    }

    // System prompt: required, min 10 chars
    const prompt = variant.systemPrompt.trim()
    if (!prompt) {
      errors.systemPrompt = 'System prompt is required.'
    } else if (prompt.length < 10) {
      errors.systemPrompt = 'System prompt must be at least 10 characters.'
    }

    // Temperature: must be between 0 and 2
    if (variant.temperature < 0 || variant.temperature > 2) {
      errors.temperature = 'Temperature must be between 0 and 2.'
    }

    // Max tokens: must be positive integer
    if (!Number.isInteger(variant.maxTokens) || variant.maxTokens <= 0) {
      errors.maxTokens = 'Max tokens must be a positive integer.'
    }

    return errors
  }

  function validate(): boolean {
    const errors: Record<string, string> = {}

    // Experiment name: required, 2-100 chars
    const trimmedName = name.trim()
    if (!trimmedName) {
      errors.name = 'Experiment name is required.'
    } else if (trimmedName.length < 2) {
      errors.name = 'Experiment name must be at least 2 characters.'
    } else if (trimmedName.length > 100) {
      errors.name = 'Experiment name must be at most 100 characters.'
    }

    // Project
    if (!projectId) {
      errors.projectId = 'Please select a project.'
    }

    // Validate variants
    const aErrors = validateVariant(variantA)
    const bErrors = validateVariant(variantB)

    setFieldErrors(errors)
    setVariantAErrors(aErrors)
    setVariantBErrors(bErrors)
    return (
      Object.keys(errors).length === 0 &&
      Object.keys(aErrors).length === 0 &&
      Object.keys(bErrors).length === 0
    )
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    if (!validate()) return

    setLoading(true)

    try {
      await apiPost(`/api/v1/projects/${projectId}/experiments`, {
        name: name.trim(),
        description: description.trim() || undefined,
        variantA: {
          model: variantA.model || undefined,
          temperature: variantA.temperature,
          systemPrompt: variantA.systemPrompt.trim() || undefined,
          maxTokens: variantA.maxTokens,
        },
        variantB: {
          model: variantB.model || undefined,
          temperature: variantB.temperature,
          systemPrompt: variantB.systemPrompt.trim() || undefined,
          maxTokens: variantB.maxTokens,
        },
        runsPerVariant,
      })

      router.push('/experiments')
      router.refresh()
    } catch (err) {
      if (err instanceof ApiFetchError) {
        if (err.status === 401) setError('Please sign in to continue')
        else if (err.status === 403) setError('You do not have permission')
        else setError(err.message)
      } else {
        setError(err instanceof Error ? err.message : 'Something went wrong')
      }
      console.error('[NewExperiment] API error:', err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-1.5 text-sm text-muted-foreground">
        <Link
          href="/experiments"
          className="hover:text-foreground transition-colors"
        >
          Experiments
        </Link>
        <ChevronRight className="h-3.5 w-3.5" />
        <span className="text-foreground font-medium">New Experiment</span>
      </nav>

      {/* Page Title */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">New Experiment</h1>
        <p className="text-sm text-muted-foreground mt-1">
          A/B test prompts, models, and configurations with statistical rigor.
        </p>
      </div>

      {error && (
        <div className="rounded-lg border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Experiment Details */}
        <div className="rounded-xl border border-border bg-card p-5 space-y-4">
          <h2 className="font-semibold text-sm flex items-center gap-2">
            <FlaskConical className="h-4 w-4 text-muted-foreground" />
            Experiment Details
          </h2>

          {/* Experiment Name */}
          <div>
            <label
              htmlFor="expName"
              className="block text-sm font-medium mb-1.5"
            >
              Experiment Name <span className="text-red-400">*</span>
            </label>
            <input
              id="expName"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. GPT-4o vs Claude on Support Tickets"
              className={`w-full rounded-lg border bg-background px-3 py-2 text-sm placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-foreground/10 focus:border-foreground/20 transition-colors ${fieldErrors.name ? 'border-red-400' : 'border-border'}`}
            />
            {fieldErrors.name && (
              <p className="text-red-400 text-xs mt-1">{fieldErrors.name}</p>
            )}
          </div>

          {/* Description */}
          <div>
            <label
              htmlFor="expDesc"
              className="block text-sm font-medium mb-1.5"
            >
              Description
            </label>
            <textarea
              id="expDesc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What are you comparing and why?"
              rows={3}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-foreground/10 focus:border-foreground/20 transition-colors resize-none"
            />
          </div>

          {/* Project */}
          <div>
            <label
              htmlFor="expProject"
              className="block text-sm font-medium mb-1.5"
            >
              Project <span className="text-red-400">*</span>
            </label>
            {projectsLoading ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground py-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading projects...
              </div>
            ) : (
              <select
                id="expProject"
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

          {/* Runs per variant */}
          <div>
            <label
              htmlFor="runsPerVariant"
              className="block text-sm font-medium mb-1.5"
            >
              Runs per Variant
            </label>
            <input
              id="runsPerVariant"
              type="number"
              value={runsPerVariant}
              onChange={(e) =>
                setRunsPerVariant(Math.max(2, Math.min(100, Number(e.target.value))))
              }
              min={2}
              max={100}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-foreground/10 focus:border-foreground/20 transition-colors"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Number of runs per variant (2-100). More runs = higher statistical confidence.
            </p>
          </div>
        </div>

        {/* Variant A */}
        <VariantCard
          label="A"
          variant={variantA}
          errors={variantAErrors}
          onChange={(field, value) => updateVariant('A', field, value)}
          accentClass="border-l-blue-500/30"
        />

        {/* Variant B */}
        <VariantCard
          label="B"
          variant={variantB}
          errors={variantBErrors}
          onChange={(field, value) => updateVariant('B', field, value)}
          accentClass="border-l-emerald-500/30"
        />

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
            {loading ? 'Creating...' : 'Create Experiment'}
          </button>
          <Link
            href="/experiments"
            className="inline-flex items-center gap-2 rounded-lg border border-border px-4 py-2.5 text-sm font-medium hover:bg-muted/30 transition-colors"
          >
            Cancel
          </Link>
        </div>
      </form>
    </div>
  )
}

// ---- Variant Card Component ----

function VariantCard({
  label,
  variant,
  errors,
  onChange,
  accentClass,
}: {
  label: string
  variant: VariantConfig
  errors: Record<string, string>
  onChange: (field: keyof VariantConfig, value: string | number) => void
  accentClass: string
}) {
  return (
    <div
      className={`rounded-xl border border-border bg-card p-5 space-y-4 border-l-2 ${accentClass}`}
    >
      <div className="flex items-center gap-2">
        <span className="inline-flex items-center justify-center rounded-full bg-foreground text-background w-5 h-5 text-[10px] font-bold">
          {label}
        </span>
        <h2 className="font-semibold text-sm">Variant {label}</h2>
      </div>

      {/* Variant Name */}
      <div>
        <label className="block text-sm font-medium mb-1.5">Name</label>
        <input
          type="text"
          value={variant.name}
          onChange={(e) => onChange('name', e.target.value)}
          placeholder="Variant name"
          className={`w-full rounded-lg border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-foreground/10 focus:border-foreground/20 transition-colors ${errors.name ? 'border-red-400' : 'border-border'}`}
        />
        {errors.name && (
          <p className="text-red-400 text-xs mt-1">{errors.name}</p>
        )}
      </div>

      {/* Model */}
      <div>
        <label className="block text-sm font-medium mb-1.5">Model</label>
        <select
          value={variant.model}
          onChange={(e) => onChange('model', e.target.value)}
          className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-foreground/10 focus:border-foreground/20 transition-colors appearance-none"
        >
          {MODEL_OPTIONS.map((m) => (
            <option key={m.value} value={m.value}>
              {m.label}
            </option>
          ))}
        </select>
      </div>

      {/* Temperature */}
      <div>
        <label className="block text-sm font-medium mb-1.5">
          Temperature:{' '}
          <span className="font-mono text-muted-foreground">{variant.temperature.toFixed(1)}</span>
        </label>
        <input
          type="range"
          min={0}
          max={2}
          step={0.1}
          value={variant.temperature}
          onChange={(e) => onChange('temperature', parseFloat(e.target.value))}
          className="w-full h-2 rounded-full appearance-none bg-muted accent-foreground cursor-pointer"
        />
        <div className="flex justify-between text-[10px] text-muted-foreground mt-0.5">
          <span>0 (deterministic)</span>
          <span>2 (creative)</span>
        </div>
        {errors.temperature && (
          <p className="text-red-400 text-xs mt-1">{errors.temperature}</p>
        )}
      </div>

      {/* System Prompt */}
      <div>
        <label className="block text-sm font-medium mb-1.5">
          System Prompt <span className="text-red-400">*</span>
        </label>
        <textarea
          value={variant.systemPrompt}
          onChange={(e) => onChange('systemPrompt', e.target.value)}
          placeholder="You are a helpful assistant..."
          rows={4}
          className={`w-full rounded-lg border bg-background px-3 py-2 text-sm font-mono placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-foreground/10 focus:border-foreground/20 transition-colors resize-none ${errors.systemPrompt ? 'border-red-400' : 'border-border'}`}
        />
        {errors.systemPrompt && (
          <p className="text-red-400 text-xs mt-1">{errors.systemPrompt}</p>
        )}
      </div>

      {/* Max Tokens */}
      <div>
        <label className="block text-sm font-medium mb-1.5">
          Max Tokens
        </label>
        <input
          type="number"
          value={variant.maxTokens}
          onChange={(e) =>
            onChange('maxTokens', Math.max(1, Number(e.target.value)))
          }
          min={1}
          max={128000}
          step={256}
          className={`w-full rounded-lg border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-foreground/10 focus:border-foreground/20 transition-colors ${errors.maxTokens ? 'border-red-400' : 'border-border'}`}
        />
        {errors.maxTokens && (
          <p className="text-red-400 text-xs mt-1">{errors.maxTokens}</p>
        )}
      </div>
    </div>
  )
}
