---
title: "GitHub Actions Setup"
description: "Deep dive into GitHub Actions integration for AgentBench — auto-generated workflows, the composite action, PR comments, check runs, secret management, matrix testing, artifacts, and troubleshooting."
targetAudience: "Developers using GitHub Actions to run AgentBench tests in CI"
readingTime: "8 min"
prerequisites:
  - "AgentBench project in a GitHub repository"
  - "GitHub Actions enabled on the repository"
  - "LLM provider API keys added as repository secrets"
---

## Overview

AgentBench v0.5.0 ships with first-class GitHub Actions integration. Running `agentbench init --ci` auto-generates a complete `.github/workflows/agentbench.yml` file. There is also a composite action at `.github/actions/agentbench/` and a PR comment template at `.github/actions/agentbench/comment-template.md`.

This guide covers every aspect of the GitHub Actions integration — from the auto-generated workflow to advanced features like matrix testing, PR comments, check runs, and common troubleshooting.

---

## 1. The Auto-Generated Workflow

### Generating the Workflow

```bash
agentbench init --ci
```

This creates `.github/workflows/agentbench.yml` with the following structure:

```yaml
name: AgentBench Tests

on:
  push:
    branches: [main]
    paths: ['src/agent/**', 'tests/**', 'agentbench.config.ts', 'datasets/**']
  pull_request:
    branches: [main]
    paths: ['src/agent/**', 'tests/**', 'agentbench.config.ts', 'datasets/**']
  workflow_dispatch:
    inputs:
      project:
        description: 'Project name to test'
        required: false
      test-pattern:
        description: 'Test file pattern to run'
        required: false
        default: 'tests/**/*.test.ts'

concurrency:
  group: agentbench-${{ github.ref }}
  cancel-in-progress: true
```

### Triggers Explained

| Trigger | When It Fires | Use Case |
|---------|--------------|----------|
| `push` to `main` | After merging a PR | Record baseline results, update snapshots |
| `pull_request` to `main` | When a PR is opened/updated | Block merging if regressions detected |
| `workflow_dispatch` | Manual trigger from Actions tab | Ad-hoc runs with custom parameters |

The `paths` filter ensures the workflow only runs when agent-related files change. This avoids wasting CI minutes on documentation-only PRs.

---

## 2. The Composite Action

AgentBench includes a reusable composite action at `.github/actions/agentbench/action.yml`. This allows you to share CI logic across multiple workflows or repositories.

### Action Inputs

```yaml
inputs:
  mode:
    description: 'Test mode (test, replay, benchmark)'
    required: false
    default: 'test'
  project:
    description: 'Project name to test'
    required: false
    default: ''
  test-pattern:
    description: 'Glob pattern for test files'
    required: false
    default: 'tests/**/*.test.ts'
  fail-on-regression:
    description: 'Fail the run if regressions are detected'
    required: false
    default: 'true'
  comment-on-pr:
    description: 'Post a PR comment with results'
    required: false
    default: 'true'

  # Provider API keys (8 providers supported)
  openai-api-key:
    description: 'OpenAI API key'
    required: false
  anthropic-api-key:
    description: 'Anthropic API key'
    required: false
  gemini-api-key:
    description: 'Google Gemini API key'
    required: false
  deepseek-api-key:
    description: 'DeepSeek API key'
    required: false
  azure-openai-api-key:
    description: 'Azure OpenAI API key'
    required: false
  azure-openai-endpoint:
    description: 'Azure OpenAI endpoint URL'
    required: false
  openrouter-api-key:
    description: 'OpenRouter API key'
    required: false
  groq-api-key:
    description: 'Groq API key'
    required: false

  # Runtime configuration
  concurrency:
    description: 'Number of parallel test executions'
    required: false
    default: '2'
  retries:
    description: 'Number of retries for flaky tests'
    required: false
    default: '2'
  budget:
    description: 'Maximum cost budget in USD'
    required: false
    default: '10.00'
  timeout:
    description: 'Per-test timeout in seconds'
    required: false
    default: '300'

  # Infrastructure
  database-url:
    description: 'PostgreSQL connection string'
    required: false
    default: 'postgresql://agentbench:agentbench@localhost:5432/agentbench'
```

### Action Outputs

```yaml
outputs:
  test-result:
    description: 'Overall test result (pass/fail)'
  score:
    description: 'Average score across all tests (0-10)'
  pass-rate:
    description: 'Pass rate as a percentage'
  total:
    description: 'Total number of tests'
  passed:
    description: 'Number of passed tests'
  failed:
    description: 'Number of failed tests'
  has-regression:
    description: 'Whether any regression was detected (true/false)'
  artifact-url:
    description: 'URL to the uploaded results artifact'
  latency-avg:
    description: 'Average latency in milliseconds'
  tokens-total:
    description: 'Total tokens consumed'
  cost-total:
    description: 'Total cost in USD'
```

### Using the Composite Action

```yaml
jobs:
  agent-test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Run AgentBench
        id: agentbench
        uses: ./.github/actions/agentbench
        with:
          openai-api-key: ${{ secrets.OPENAI_API_KEY }}
          anthropic-api-key: ${{ secrets.ANTHROPIC_API_KEY }}
          fail-on-regression: 'true'
          comment-on-pr: 'true'
          budget: '10.00'

      - name: Check result
        if: steps.agentbench.outputs.has-regression == 'true'
        run: |
          echo "::error::Regression detected! Score: ${{ steps.agentbench.outputs.score }}"
          exit 1
```

---

## 3. PR Comments

When `comment-on-pr: 'true'` is set and the workflow runs on a pull request, AgentBench posts a formatted comment summarizing the results.

### What Gets Posted

The comment template is at `.github/actions/agentbench/comment-template.md` and renders as:

```
## AgentBench Test Results :robot:

### Summary

| Metric | Value |
|--------|-------|
| **Score** | 8.7 / 10 |
| **Pass Rate** | 91.7% |
| **Total Tests** | 12 |
| **Passed** | 11 |
| **Failed** | 1 |
| **Total Cost** | $1.23 |
| **Avg Latency** | 2.34s |
| **Total Tokens** | 4,567 |

### Regression Detection
:white_check_mark: No regressions detected — all scores within range of baseline.

### Failing Tests
<details>
<summary>1 failing test</summary>

| Test | Score | Expected | Actual | Reason |
|------|-------|----------|--------|--------|
| tool_selection | 5.2 | >= 7.0 | 5.2 | Selected wrong tool (search_kb vs lookup_customer) |

</details>

### Passing Tests
<details>
<summary>11 passing tests</summary>

| Test | Score | Tokens | Cost |
|------|-------|--------|------|
| refund_inquiry | 9.2 | 245 | $0.0032 |
| shipping_status | 8.8 | 312 | $0.0041 |
| ... | ... | ... | ... |

</details>

---
*Results from run `#42` on commit `abc1234` — [View full report](https://github.com/...)*
```

### Customizing the PR Comment Template

Edit `.github/actions/agentbench/comment-template.md` to customize what appears in PR comments. The template uses Handlebars-style placeholders:

```
{{summaryTable}}
{{regressionSection}}
{{failingSection}}
{{passingSection}}
{{coverageSection}}
{{linksSection}}
```

### Upserting PR Comments

The composite action uses `actions/github-script@v7` to find and update an existing AgentBench comment, or create a new one. This prevents comment spam — each PR gets **one** AgentBench comment that is updated on subsequent pushes.

```javascript
// Internal logic (handled by the composite action)
const { data: comments } = await github.rest.issues.listComments({
  owner: context.repo.owner,
  repo: context.repo.repo,
  issue_number: context.issue.number,
})

const existingComment = comments.find(c =>
  c.body.includes('AgentBench Test Results')
)

if (existingComment) {
  await github.rest.issues.updateComment({
    owner: context.repo.owner,
    repo: context.repo.repo,
    comment_id: existingComment.id,
    body: commentBody,
  })
} else {
  await github.rest.issues.createComment({
    owner: context.repo.owner,
    repo: context.repo.repo,
    issue_number: context.issue.number,
    body: commentBody,
  })
}
```

---

## 4. Check Runs API Integration

For native GitHub check runs (the green checkmark / red X on PRs), AgentBench can integrate with the GitHub Checks API.

### Enabling Check Runs

```yaml
- name: Create check run
  uses: actions/github-script@v7
  with:
    script: |
      const conclusion = '${{ steps.agentbench.outputs.test-result }}' === 'pass'
        ? 'success' : 'failure'

      await github.rest.checks.create({
        owner: context.repo.owner,
        repo: context.repo.repo,
        name: 'AgentBench',
        head_sha: context.sha,
        status: 'completed',
        conclusion: conclusion,
        output: {
          title: `AgentBench: ${{ steps.agentbench.outputs.score }}/10`,
          summary: `Pass rate: ${{ steps.agentbench.outputs.pass-rate }}%
                    ${{ steps.agentbench.outputs.passed }}/${{ steps.agentbench.outputs.total }} passed
                    Cost: $${${{ steps.agentbench.outputs.cost-total }}}`,
          text: 'Full results available in the [workflow run](${{ github.server_url }}/${{ github.repository }}/actions/runs/${{ github.run_id }})',
        },
      })
```

This creates a native check run visible in the PR's "Checks" tab.

---

## 5. Secret Management

### Setting Up Secrets

In **GitHub repository > Settings > Secrets and variables > Actions > Secrets**:

| Secret Name | Description | Example Value |
|-------------|-------------|---------------|
| `OPENAI_API_KEY` | OpenAI API key | `sk-proj-abc123...` |
| `ANTHROPIC_API_KEY` | Anthropic API key | `sk-ant-api03-xyz...` |
| `GEMINI_API_KEY` | Google Gemini API key | `AIza...` |
| `DEEPSEEK_API_KEY` | DeepSeek API key | `sk-...` |
| `AZURE_OPENAI_API_KEY` | Azure OpenAI key | `...` |
| `AZURE_OPENAI_ENDPOINT` | Azure OpenAI endpoint | `https://my-resource.openai.azure.com/` |
| `OPENROUTER_API_KEY` | OpenRouter API key | `sk-or-...` |
| `GROQ_API_KEY` | Groq API key | `gsk_...` |

### Using Environments for Different Stages

For staging vs. production:

```
GitHub Repository > Settings > Environments

Environment: staging
  Secrets:
    OPENAI_API_KEY = sk-staging-...
    ANTHROPIC_API_KEY = sk-ant-staging-...

Environment: production
  Secrets:
    OPENAI_API_KEY = sk-prod-...
    ANTHROPIC_API_KEY = sk-ant-prod-...
```

In workflow:
```yaml
jobs:
  agent-test-staging:
    environment: staging
    # ...

  agent-test-production:
    environment: production
    needs: agent-test-staging
    # ...
```

---

## 6. Matrix Testing

Test your agent across multiple models/providers in parallel using GitHub Actions matrix strategy.

### Multi-Model Matrix

```yaml
jobs:
  agent-test:
    runs-on: ubuntu-latest
    strategy:
      fail-fast: false  # Don't cancel all if one fails
      matrix:
        model: [gpt-4o, gpt-4o-mini, gpt-4.1, claude-sonnet-4-20250514]
        include:
          - model: gpt-4o
            provider: openai
            api-key-secret: OPENAI_API_KEY
          - model: gpt-4o-mini
            provider: openai
            api-key-secret: OPENAI_API_KEY
          - model: gpt-4.1
            provider: openai
            api-key-secret: OPENAI_API_KEY
          - model: claude-sonnet-4-20250514
            provider: anthropic
            api-key-secret: ANTHROPIC_API_KEY

    steps:
      - uses: actions/checkout@v4

      - name: Run AgentBench
        uses: ./.github/actions/agentbench
        with:
          openai-api-key: ${{ secrets[matrix.api-key-secret] }}
          anthropic-api-key: ${{ secrets.ANTHROPIC_API_KEY }}

      - name: Add model label to results
        run: |
          echo "results-for=${{ matrix.model }}" >> $GITHUB_ENV
```

### Multi-Dataset Matrix

```yaml
strategy:
  matrix:
    dataset: [customer-support, refunds, shipping, technical]
```

### Interpreting Matrix Results

Each matrix job appears as a separate check in the PR. You can require all matrix jobs to pass, or configure `fail-fast: false` to see all results even when some fail.

---

## 7. Artifact Upload for Reports

### Uploading Results

```yaml
- name: Upload test results
  if: always()
  uses: actions/upload-artifact@v4
  with:
    name: agentbench-results-${{ github.run_id }}-${{ matrix.model }}
    path: reports/
    retention-days: 30
```

### Accessing Artifacts

Download from:
- **GitHub Actions run page:** Click "Artifacts" in the run summary
- **GitHub API:** `GET /repos/{owner}/{repo}/actions/artifacts`

### Artifact Contents

```
reports/
├── results.json         # Full results in JSON format
├── junit.xml            # JUnit XML for test reporting tools
├── summary.md           # Markdown summary
├── traces/              # Full execution traces (JSON)
│   ├── run-abc123.json
│   └── run-def456.json
└── snapshots/           # Updated snapshots (if --update-snapshots used)
```

---

## 8. Using the GitHub Actions Summary

The `$GITHUB_STEP_SUMMARY` environment variable writes directly to the workflow run summary page.

### Rich Summary

```yaml
- name: Write summary
  if: always()
  run: |
    cat >> $GITHUB_STEP_SUMMARY << 'EOF'
    ## AgentBench Results

    | Category | Score | Tests | Passed | Failed |
    |----------|-------|-------|--------|--------|
    | Correctness | 8.7 | 4 | 4 | 0 |
    | Tool Usage | 7.2 | 3 | 2 | 1 |
    | Safety | 9.8 | 2 | 2 | 0 |
    | Latency | 9.1 | 3 | 3 | 0 |

    ### Cost Breakdown
    - OpenAI: $2.45
    - Anthropic: $1.78
    - **Total: $4.23**

    [View detailed report](${{ github.server_url }}/${{ github.repository }}/actions/runs/${{ github.run_id }})
    EOF
```

This renders as a formatted markdown section on the workflow run page, visible to anyone viewing the run.

---

## 9. Troubleshooting Actions-Specific Issues

### Timeouts

**Symptom:** "The job was canceled because it exceeded the timeout of 30 minutes."

**Solution:** Increase the `timeout-minutes` or use replay mode for faster execution:

```yaml
jobs:
  agent-test:
    timeout-minutes: 60  # Increase for complex agent tests

    steps:
      - run: agentbench test --ci --replay  # Zero-API-cost, fast
```

### Rate Limits (GitHub)

**Symptom:** "You have exceeded a secondary rate limit."

**Solution:**
```yaml
# Add delays between API calls to GitHub
- name: Wait for rate limit
  run: sleep 10
```

This is mainly relevant when using `actions/github-script` extensively for PR comments and check runs.

### Permissions

**Symptom:** "Resource not accessible by integration" when posting PR comments.

**Solution:** Ensure the workflow has write permissions:

```yaml
permissions:
  contents: read
  pull-requests: write
  checks: write
  actions: read
```

Or set at the job level:

```yaml
jobs:
  agent-test:
    permissions:
      pull-requests: write
      checks: write
```

### Composite Action Path Resolution

**Symptom:** "Can't find 'action.yml'" when using `uses: ./.github/actions/agentbench`.

**Solution:** Ensure the action directory exists and the workflow has `actions/checkout@v4` before referencing local actions:

```yaml
steps:
  - uses: actions/checkout@v4  # This must come first
  - uses: ./.github/actions/agentbench  # Now the checkout has the file
```

### Secret Not Available

**Symptom:** Empty string when accessing a secret.

**Solution:** 
- Verify the secret is set in **Settings > Secrets and variables > Actions**
- Secrets are not available to forks by default (security feature)
- For fork PRs, use `pull_request_target` trigger (carefully — security implications)
- Use environment-scoped secrets correctly

### Database Connection Failure

**Symptom:** `Error: connect ECONNREFUSED 127.0.0.1:5432`

**Solution:** Verify the PostgreSQL service container is healthy:

```yaml
services:
  postgres:
    image: postgres:16-alpine
    env:
      POSTGRES_USER: agentbench
      POSTGRES_PASSWORD: agentbench
      POSTGRES_DB: agentbench
    ports:
      - 5432:5432
    options: >-
      --health-cmd pg_isready
      --health-interval 5s
      --health-timeout 5s
      --health-retries 10
```

---

## Common Pitfalls

### Not using concurrency groups

Without `concurrency: group: agentbench-${{ github.ref }}`, multiple pushes to a PR will start overlapping test runs. With concurrency groups, only the latest push's run survives — saving money and CI minutes.

### Forgetting `if: always()` on result-dependent steps

Use `if: always()` on artifact upload and summary steps. Otherwise, if the test step fails, the upload step is skipped and you lose the debug artifacts.

### Checking secrets into the repository

The workflow YAML references secrets via `${{ secrets.X }}`, not by hardcoding the value. Never commit `.env.agentbench` with real API keys to the repository. Use `.gitignore` to exclude it:

```
# .gitignore
.env.agentbench
.env
```

### Not handling fork PRs

Fork PRs cannot access repository secrets (GitHub security). For internal teams, this is fine. For open-source projects with fork-based contributions, consider using `pull_request_target` with caution, or require maintainers to manually trigger workflows.

---

## Next Steps

- [CI/CD Integration](./ci-cd-integration.md) — Broader CI/CD setup including GitLab CI and CircleCI
- [Testing OpenAI Agents](./testing-openai-agents.md) — Provider-specific patterns
- [Dataset Management Guide](./dataset-management.md) — Managing test data in CI
- [Migration Guide](./migration-guide.md) — Upgrading from v0.5.0

---

> [Back to Documentation Center](../INDEX.md)
