export type ProjectPlan = 'community' | 'pro' | 'enterprise'

export interface Project {
  id: string
  name: string
  slug: string
  description?: string
  plan: ProjectPlan
  ownerId: string
  organizationId?: string
  settings: ProjectSettings
  createdAt: Date
  updatedAt: Date
}

export interface ProjectSettings {
  defaultModel?: string
  defaultJudge?: string
  regressionThresholds?: RegressionThresholds
  notifications?: NotificationPreferences
  storage?: StorageSettings
}

export interface RegressionThresholds {
  scoreDrop: number       // e.g. 0.5 (score cannot drop by more than 0.5)
  tokenIncreasePercent: number  // e.g. 20 (tokens cannot increase by more than 20%)
  latencyIncreasePercent: number
  costIncreasePercent: number
}

export interface NotificationPreferences {
  onRunComplete: boolean
  onRegression: boolean
  onError: boolean
  channels: ('email' | 'webhook' | 'in_app')[]
  webhookUrl?: string
}

export interface StorageSettings {
  provider: 'local' | 's3' | 'gcs'
  bucket?: string
  region?: string
  endpoint?: string
}
