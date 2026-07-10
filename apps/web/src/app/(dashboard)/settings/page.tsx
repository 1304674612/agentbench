'use client'

import { useState, useEffect, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import {
  User,
  Key,
  Plus,
  Trash2,
  Loader2,
  Copy,
  Check,
  Settings2,
  Building2,
  Clock,
  Eye,
  EyeOff,
} from 'lucide-react'
import Link from 'next/link'

interface ApiKeyRecord {
  id: string
  name: string
  prefix: string
  scopes: string[]
  lastUsedAt: string | null
  expiresAt: string | null
  isRevoked: boolean
  createdAt: string
}

interface Project {
  id: string
  name: string
  slug: string
  settings?: Record<string, unknown>
  plan: string
  createdAt: string
}

export default function SettingsPage() {
  const { data: session } = useSession()
  const [activeTab, setActiveTab] = useState<'profile' | 'api-keys' | 'project'>('profile')

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Manage your account, API keys, and project settings.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 rounded-lg bg-muted p-1 w-fit">
        {(
          [
            { key: 'profile', label: 'Profile', icon: User },
            { key: 'api-keys', label: 'API Keys', icon: Key },
            { key: 'project', label: 'Project', icon: Building2 },
          ] as const
        ).map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
              activeTab === tab.key
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <tab.icon className="h-3.5 w-3.5" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === 'profile' && <ProfileSection session={session} />}
      {activeTab === 'api-keys' && <ApiKeysSection />}
      {activeTab === 'project' && <ProjectSettingsSection />}
    </div>
  )
}

// ================================================================
// Profile Section
// ================================================================

function ProfileSection({ session }: { session: ReturnType<typeof useSession>['data'] }) {
  return (
    <div className="rounded-xl border border-border bg-card p-5 space-y-4">
      <h2 className="font-semibold text-sm flex items-center gap-2">
        <User className="h-4 w-4 text-muted-foreground" />
        Profile
      </h2>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="block text-xs font-medium text-muted-foreground mb-1">
            Name
          </label>
          <p className="text-sm font-medium">
            {session?.user?.name || 'Not set'}
          </p>
        </div>
        <div>
          <label className="block text-xs font-medium text-muted-foreground mb-1">
            Email
          </label>
          <p className="text-sm font-medium">
            {session?.user?.email || 'Not set'}
          </p>
        </div>
      </div>

      {!session && (
        <div className="flex items-center justify-center py-4">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      )}
    </div>
  )
}

// ================================================================
// API Keys Section
// ================================================================

function ApiKeysSection() {
  const [keys, setKeys] = useState<ApiKeyRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [generating, setGenerating] = useState(false)
  const [newKey, setNewKey] = useState<{ raw: string; name: string } | null>(null)
  const [copied, setCopied] = useState(false)
  const [keyName, setKeyName] = useState('')
  const [showNewKeyInput, setShowNewKeyInput] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [visibleKeys, setVisibleKeys] = useState<Set<string>>(new Set())

  const fetchKeys = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/v1/api-keys')
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || 'Failed to load API keys')
      }
      const data = await res.json()
      setKeys(data.apiKeys || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load API keys')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchKeys()
  }, [fetchKeys])

  async function handleGenerate() {
    if (!keyName.trim()) return
    setGenerating(true)
    setError(null)
    try {
      const res = await fetch('/api/v1/api-keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: keyName.trim() }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || 'Failed to generate API key')
      }
      const data = await res.json()
      setNewKey({ raw: data.raw, name: keyName.trim() })
      setKeyName('')
      setShowNewKeyInput(false)
      fetchKeys()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Generation failed')
    } finally {
      setGenerating(false)
    }
  }

  async function handleDelete(keyId: string) {
    setDeletingId(keyId)
    setError(null)
    try {
      const res = await fetch(`/api/v1/api-keys/${keyId}`, {
        method: 'DELETE',
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || 'Failed to revoke key')
      }
      setKeys((prev) => prev.filter((k) => k.id !== keyId))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to revoke key')
    } finally {
      setDeletingId(null)
    }
  }

  function copyToClipboard(text: string) {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  function toggleVisibility(keyId: string) {
    setVisibleKeys((prev) => {
      const next = new Set(prev)
      if (next.has(keyId)) {
        next.delete(keyId)
      } else {
        next.add(keyId)
      }
      return next
    })
  }

  return (
    <div className="rounded-xl border border-border bg-card p-5 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold text-sm flex items-center gap-2">
          <Key className="h-4 w-4 text-muted-foreground" />
          API Keys
        </h2>
        <button
          onClick={() => setShowNewKeyInput(true)}
          className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-medium hover:bg-muted/30 transition-colors"
        >
          <Plus className="h-3.5 w-3.5" />
          Generate Key
        </button>
      </div>

      {error && (
        <div className="rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-2 text-sm text-red-400">
          {error}
        </div>
      )}

      {/* New Key Display */}
      {newKey && (
        <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 space-y-2">
          <p className="text-sm font-medium text-emerald-400">
            New API key created: {newKey.name}
          </p>
          <p className="text-xs text-emerald-400/80">
            Copy this key now. You will not be able to see it again.
          </p>
          <div className="flex items-center gap-2">
            <code className="flex-1 rounded-md bg-background px-3 py-2 text-sm font-mono break-all">
              {newKey.raw}
            </code>
            <button
              onClick={() => copyToClipboard(newKey.raw)}
              className="shrink-0 rounded-lg p-2 text-emerald-400 hover:bg-emerald-500/10 transition-colors"
              title="Copy to clipboard"
            >
              {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            </button>
          </div>
        </div>
      )}

      {/* Generate Key Input */}
      {showNewKeyInput && (
        <div className="rounded-lg border border-border bg-muted/20 p-4 space-y-3">
          <div>
            <label className="block text-sm font-medium mb-1.5">Key Name</label>
            <input
              type="text"
              value={keyName}
              onChange={(e) => setKeyName(e.target.value)}
              placeholder="e.g. Production API Key"
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-foreground/10 focus:border-foreground/20 transition-colors"
            />
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleGenerate}
              disabled={generating || !keyName.trim()}
              className="inline-flex items-center gap-1.5 rounded-lg bg-foreground px-3 py-1.5 text-xs font-medium text-background hover:bg-foreground/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {generating ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Key className="h-3.5 w-3.5" />
              )}
              Generate
            </button>
            <button
              onClick={() => setShowNewKeyInput(false)}
              className="text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Keys List */}
      {loading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      ) : keys.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border p-8 text-center">
          <Key className="h-6 w-6 text-muted-foreground/50 mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">No API keys yet</p>
          <p className="text-xs text-muted-foreground/70 mt-0.5">
            Generate an API key to access AgentBench programmatically.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {keys.map((key) => (
            <div
              key={key.id}
              className="flex items-center justify-between rounded-lg border border-border bg-muted/20 px-4 py-3"
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">{key.name}</span>
                  {key.isRevoked && (
                    <span className="text-[10px] rounded-full bg-red-500/10 text-red-400 border border-red-500/20 px-2 py-0.5">
                      Revoked
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                  <code className="font-mono">
                    {visibleKeys.has(key.id)
                      ? key.prefix + '••••••••••••••••'
                      : key.prefix + '••••••••'}
                  </code>
                  <button
                    onClick={() => toggleVisibility(key.id)}
                    className="text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {visibleKeys.has(key.id) ? (
                      <EyeOff className="h-3 w-3" />
                    ) : (
                      <Eye className="h-3 w-3" />
                    )}
                  </button>
                </div>
                <div className="flex items-center gap-3 mt-1 text-[10px] text-muted-foreground/70">
                  {key.lastUsedAt && (
                    <span className="flex items-center gap-1">
                      <Clock className="h-2.5 w-2.5" />
                      Last used: {new Date(key.lastUsedAt).toLocaleDateString()}
                    </span>
                  )}
                  <span>
                    Created: {new Date(key.createdAt).toLocaleDateString()}
                  </span>
                  <span className="flex items-center gap-1">
                    {key.scopes.map((s) => (
                      <span
                        key={s}
                        className="rounded-full bg-muted px-1.5 py-0.5 text-[9px] uppercase"
                      >
                        {s}
                      </span>
                    ))}
                  </span>
                </div>
              </div>
              <button
                onClick={() => handleDelete(key.id)}
                disabled={deletingId === key.id}
                className="shrink-0 ml-3 rounded-lg p-2 text-muted-foreground hover:bg-red-500/10 hover:text-red-400 transition-colors disabled:opacity-50"
                title="Revoke key"
              >
                {deletingId === key.id ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Trash2 className="h-4 w-4" />
                )}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ================================================================
// Project Settings Section
// ================================================================

function ProjectSettingsSection() {
  const [projects, setProjects] = useState<Project[]>([])
  const [selectedProjectId, setSelectedProjectId] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  // Editable settings
  const [projectName, setProjectName] = useState('')
  const [defaultModel, setDefaultModel] = useState('gpt-4o')
  const [timeout, setTimeoutVal] = useState(60000)
  const [maxRetries, setMaxRetries] = useState(3)

  useEffect(() => {
    fetch('/api/v1/projects')
      .then((res) => res.json())
      .then((data) => {
        const projs = data.projects || []
        setProjects(projs)
        if (projs.length > 0) {
          setSelectedProjectId(projs[0].id)
        }
      })
      .catch(() => setError('Failed to load projects'))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    if (!selectedProjectId || projects.length === 0) return
    const proj = projects.find((p) => p.id === selectedProjectId)
    if (proj) {
      setProjectName(proj.name || '')
      const s = (proj.settings || {}) as Record<string, unknown>
      setDefaultModel((s.defaultModel as string) || 'gpt-4o')
      setTimeoutVal((s.timeout as number) || 60000)
      setMaxRetries((s.maxRetries as number) || 3)
    }
  }, [selectedProjectId, projects])

  async function handleSave() {
    setSaving(true)
    setError(null)
    setSuccess(false)
    try {
      const res = await fetch('/api/v1/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId: selectedProjectId,
          projectName: projectName.trim(),
          projectSettings: {
            defaultModel,
            timeout,
            maxRetries,
          },
        }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || 'Failed to save settings')
      }
      setSuccess(true)
      setTimeout(() => setSuccess(false), 3000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="rounded-xl border border-border bg-card p-5">
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      </div>
    )
  }

  return (
    <div className="rounded-xl border border-border bg-card p-5 space-y-4">
      <h2 className="font-semibold text-sm flex items-center gap-2">
        <Settings2 className="h-4 w-4 text-muted-foreground" />
        Project Settings
      </h2>

      {error && (
        <div className="rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-2 text-sm text-red-400">
          {error}
        </div>
      )}

      {success && (
        <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-400">
          Settings saved successfully.
        </div>
      )}

      {/* Project Selector */}
      <div>
        <label className="block text-sm font-medium mb-1.5">
          Project
        </label>
        <select
          value={selectedProjectId}
          onChange={(e) => setSelectedProjectId(e.target.value)}
          className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-foreground/10 focus:border-foreground/20 transition-colors appearance-none"
        >
          {projects.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
      </div>

      {/* Project Name */}
      <div>
        <label className="block text-sm font-medium mb-1.5">
          Project Name
        </label>
        <input
          type="text"
          value={projectName}
          onChange={(e) => setProjectName(e.target.value)}
          className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-foreground/10 focus:border-foreground/20 transition-colors"
        />
      </div>

      {/* Default Model */}
      <div>
        <label className="block text-sm font-medium mb-1.5">
          Default Model
        </label>
        <select
          value={defaultModel}
          onChange={(e) => setDefaultModel(e.target.value)}
          className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-foreground/10 focus:border-foreground/20 transition-colors appearance-none"
        >
          <option value="gpt-4o">GPT-4o</option>
          <option value="gpt-4o-mini">GPT-4o Mini</option>
          <option value="gpt-4-turbo">GPT-4 Turbo</option>
          <option value="claude-sonnet-4-5">Claude Sonnet 4.5</option>
          <option value="claude-haiku-4-5">Claude Haiku 4.5</option>
          <option value="claude-opus-4-5">Claude Opus 4.5</option>
          <option value="gemini-2.5-pro">Gemini 2.5 Pro</option>
          <option value="gemini-2.5-flash">Gemini 2.5 Flash</option>
        </select>
      </div>

      {/* Timeout */}
      <div>
        <label className="block text-sm font-medium mb-1.5">
          Timeout (ms)
        </label>
        <input
          type="number"
          value={timeout}
          onChange={(e) => setTimeoutVal(Math.max(1000, Number(e.target.value)))}
          min={1000}
          step={1000}
          className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-foreground/10 focus:border-foreground/20 transition-colors"
        />
        <p className="text-xs text-muted-foreground mt-1">
          Maximum execution time per run in milliseconds.
        </p>
      </div>

      {/* Max Retries */}
      <div>
        <label className="block text-sm font-medium mb-1.5">
          Max Retries
        </label>
        <input
          type="number"
          value={maxRetries}
          onChange={(e) => setMaxRetries(Math.max(0, Math.min(10, Number(e.target.value))))}
          min={0}
          max={10}
          className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-foreground/10 focus:border-foreground/20 transition-colors"
        />
      </div>

      {/* Save Button */}
      <div className="pt-2">
        <button
          onClick={handleSave}
          disabled={saving}
          className="inline-flex items-center gap-2 rounded-lg bg-foreground px-4 py-2.5 text-sm font-medium text-background hover:bg-foreground/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {saving ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Check className="h-4 w-4" />
          )}
          {saving ? 'Saving...' : 'Save Settings'}
        </button>
      </div>
    </div>
  )
}
