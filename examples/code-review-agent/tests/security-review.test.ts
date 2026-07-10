/**
 * Test Suite: Security Review
 *
 * Verifies the code review agent catches critical security issues:
 * SQL injection vulnerabilities, hardcoded secrets, and missing
 * input validation.
 */

import { expect } from '@agentbench/core'
import { runCodeReviewAgent } from '../agent'

const API_KEY = process.env.ANTHROPIC_API_KEY ?? 'sk-ant-test-key'

const CODE_WITH_SECURITY_ISSUES = `
import bcrypt from 'bcrypt'
import jwt from 'jsonwebtoken'

const SECRET = 'my-hardcoded-secret-key-12345'
const API_KEY = 'sk-live-abc123def456ghi789'

export async function login(username: string, password: string) {
  const query = "SELECT * FROM users WHERE username = '" + username + "' AND password = '" + password + "'"
  const user = await db.query(query)
  if (!user) throw new Error('Invalid credentials')
  const token = jwt.sign({ id: user.id, role: user.role }, SECRET)
  return { token, user }
}

export function getUserData(userId: string) {
  const query = \`SELECT * FROM user_data WHERE user_id = \${userId}\`
  return db.query(query)
}

app.post('/api/upload', async (req, res) => {
  const { file, userId } = req.body
  // No file type validation
  await storage.upload(file.path, file.name)
  res.json({ success: true })
})

// Exposed internal endpoint
app.get('/admin/debug/users', (req, res) => {
  const users = db.users.getAll()
  res.json(users)
})
`.trim()

export async function securityReviewTest() {
  const result = await runCodeReviewAgent({
    code: CODE_WITH_SECURITY_ISSUES,
    language: 'typescript',
    apiKey: API_KEY,
  })

  // Assertion 1: Agent used check_best_practices tool (security category)
  const usedBestPractices = await expect(result)
    .tool('check_best_practices').toBeCalled()
    .run()

  // Assertion 2: Output mentions SQL injection or injection vulnerability
  const catchesSQLInjection = await expect(result)
    .output().toMatchRegex(/sql.?injection|injection.?attack|parameterized|prepared statement/i)
    .run()

  // Assertion 3: Output mentions hardcoded secrets or credentials
  const catchesHardcodedSecrets = await expect(result)
    .any([
      (b) => b.output().toMatchRegex(/hardcoded.?secret|hard.?coded.?credential|hardcoded.?key/i),
      (b) => b.output().toMatchRegex(/environment.?variable|env.?var|secret.?manager/i),
      (b) => b.output().toContain('SECRET'),
      (b) => b.output().toContain('API_KEY'),
    ])
    .run()

  // Assertion 4: Output mentions security concerns
  const mentionsSecurity = await expect(result)
    .output().toMatchRegex(/security|vulnerab|exposed|unsafe|risk/i)
    .run()

  // Assertion 5: Agent also suggests improvements (not just identifies issues)
  const suggestsFixes = await expect(result)
    .any([
      (b) => b.tool('suggest_improvements').toBeCalled(),
      (b) => b.output().toMatchRegex(/fix|resolve|replace|instead|should|recommend|consider/i),
    ])
    .run()

  return {
    usedBestPractices: usedBestPractices.allPassed,
    catchesSQLInjection: catchesSQLInjection.allPassed,
    catchesHardcodedSecrets: catchesHardcodedSecrets.allPassed,
    mentionsSecurity: mentionsSecurity.allPassed,
    suggestsFixes: suggestsFixes.allPassed,
    details: { usedBestPractices, catchesSQLInjection, catchesHardcodedSecrets, mentionsSecurity, suggestsFixes },
  }
}
