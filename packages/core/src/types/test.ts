/**
 * Test Suite and Test Case domain types.
 */

export type TestCaseStatus = 'active' | 'draft' | 'archived'

export interface TestSuite {
  id: string
  projectId: string
  name: string
  description?: string
  sortOrder: number
  createdAt: Date
  updatedAt: Date
}

export interface TestCase {
  id: string
  suiteId: string
  name: string
  description?: string
  status: TestCaseStatus
  agentConfig: Record<string, unknown>
  input: Record<string, unknown>
  options: Record<string, unknown>
  tags: string[]
  sortOrder: number
  createdAt: Date
  updatedAt: Date
}
