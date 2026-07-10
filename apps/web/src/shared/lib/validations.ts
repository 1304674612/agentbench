/**
 * Shared Zod Validation Schemas
 *
 * Centralized schemas for all API inputs. Use `validateBody` to apply
 * a schema to a request body, or import individual schemas to compose
 * route-specific validation.
 */

import { z, type ZodSchema } from 'zod'

// ============================================================
// Helper
// ============================================================

/**
 * Validate a request body against a Zod schema.
 * Returns parsed data or throws a ZodError.
 */
export function validateBody<T>(schema: ZodSchema<T>, body: unknown): T {
  return schema.parse(body)
}

// ============================================================
// Pagination
// ============================================================

export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).max(100).optional().default(20),
})

export type PaginationInput = z.infer<typeof paginationSchema>

// ============================================================
// Project
// ============================================================

export const createProjectSchema = z.object({
  name: z.string().min(2).max(100),
  slug: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Slug must be lowercase alphanumeric with hyphens'),
  description: z.string().max(500).optional(),
})

export type CreateProjectInput = z.infer<typeof createProjectSchema>

// ============================================================
// Run
// ============================================================

export const createRunSchema = z.object({
  projectId: z.string(),
  name: z.string().min(1).max(256),
  config: z.record(z.unknown()).optional().default({}),
  testCaseId: z.string().optional(),
  tags: z.array(z.string()).optional().default([]),
})

export type CreateRunInput = z.infer<typeof createRunSchema>

// ============================================================
// Test Suite
// ============================================================

export const createTestSuiteSchema = z.object({
  projectId: z.string(),
  name: z.string().min(1).max(256),
  description: z.string().max(1000).optional(),
})

export type CreateTestSuiteInput = z.infer<typeof createTestSuiteSchema>

// ============================================================
// Test Case
// ============================================================

export const createTestCaseSchema = z.object({
  suiteId: z.string(),
  name: z.string().min(1).max(256),
  description: z.string().max(1000).optional(),
  input: z.record(z.unknown()).default({}),
  agentConfig: z.record(z.unknown()).optional().default({}),
})

export type CreateTestCaseInput = z.infer<typeof createTestCaseSchema>

// ============================================================
// Experiment
// ============================================================

export const createExperimentSchema = z.object({
  projectId: z.string(),
  name: z.string().min(1).max(256),
  description: z.string().max(1000).optional(),
  config: z.object({
    variants: z.array(
      z.object({
        name: z.string().min(1),
        config: z.record(z.unknown()).default({}),
      })
    ).min(2).max(10),
  }),
})

export type CreateExperimentInput = z.infer<typeof createExperimentSchema>

// ============================================================
// Snapshot
// ============================================================

export const createSnapshotSchema = z.object({
  projectId: z.string(),
  runId: z.string().optional(),
  name: z.string().min(1).max(256),
  description: z.string().max(1000).optional(),
})

export type CreateSnapshotInput = z.infer<typeof createSnapshotSchema>

// ============================================================
// Compare
// ============================================================

export const compareSchema = z.object({
  runIdA: z.string(),
  runIdB: z.string(),
})

export type CompareInput = z.infer<typeof compareSchema>
