---
title: REST API Reference
description: Complete reference for the AgentBench REST API with all endpoints, request/response schemas, status codes, and curl examples.
targetAudience: Developers integrating AgentBench programmatically
readingTime: 10 min
prerequisites:
  - Running AgentBench server (docker compose up -d && pnpm dev)
  - API available at http://localhost:3000/api/v1
---

# REST API Reference

The AgentBench REST API provides programmatic access to all platform features: project management, test execution, evaluation, snapshots, experiments, datasets, and benchmarks.

## Conventions

### Base URL

```
http://localhost:3000/api/v1
```

### Request Format

- `Content-Type: application/json` for all POST/PATCH/PUT requests
- Request bodies use JSON

### Response Format

**Single resource:**
```json
{ "id": "cuid_abc123", "name": "Example", "...": "..." }
```

**List response:**
```json
{ "projects": [...], "total": 50, "limit": 50, "offset": 0 }
```

**Error response:**
```json
{ "error": "Validation failed", "details": { "field": "name", "message": "Required" } }
```

### HTTP Status Codes

| Code | Meaning |
|---|---|
| 200 | Success |
| 201 | Resource created |
| 400 | Invalid request / validation error |
| 401 | Unauthenticated |
| 403 | Forbidden (insufficient permissions) |
| 404 | Resource not found |
| 500 | Internal server error |

### Authentication

API requests use API keys with the `ab-` prefix. Pass the key as a Bearer token:

```bash
curl -H "Authorization: Bearer ab-xxxxxxxxxxxx" http://localhost:3000/api/v1/projects
```

---

## Projects

### List Projects

```
GET /projects
```

**Query Parameters:**

| Parameter | Type | Default | Description |
|---|---|---|---|
| `search` | `string` | — | Filter by name (fuzzy match) |
| `limit` | `number` | `50` | Results per page (max 100) |
| `offset` | `number` | `0` | Pagination offset |

**Response:**
```json
{
  "projects": [
    {
      "id": "cuid_001",
      "name": "Customer Support Agent",
      "slug": "customer-support",
      "description": "Handles customer inquiries",
      "plan": "COMMUNITY",
      "createdAt": "2026-07-10T12:00:00.000Z"
    }
  ],
  "total": 1,
  "limit": 50,
  "offset": 0
}
```

```bash
curl "http://localhost:3000/api/v1/projects?search=support&limit=10"
```

### Create Project

```
POST /projects
```

**Request Body:**
```json
{
  "name": "Customer Support Agent",
  "slug": "customer-support",
  "description": "Handles customer refunds, returns, and inquiries"
}
```

| Field | Type | Required | Description |
|---|---|---|---|
| `name` | `string` | Yes | Project display name |
| `slug` | `string` | Yes | URL-safe identifier (unique per owner) |
| `description` | `string` | No | Project description |

**Response:** `201 Created`
```json
{
  "id": "cuid_001",
  "name": "Customer Support Agent",
  "slug": "customer-support",
  "description": "Handles customer refunds, returns, and inquiries",
  "plan": "COMMUNITY",
  "ownerId": "user_001",
  "createdAt": "2026-07-10T12:00:00.000Z"
}
```

```bash
curl -X POST http://localhost:3000/api/v1/projects \
  -H "Content-Type: application/json" \
  -d '{"name":"Customer Support Agent","slug":"customer-support"}'
```

### Get, Update, Delete Project

```
GET    /projects/:id
PATCH  /projects/:id
DELETE /projects/:id
```

```bash
curl "http://localhost:3000/api/v1/projects/cuid_001"
curl -X PATCH "http://localhost:3000/api/v1/projects/cuid_001" \
  -H "Content-Type: application/json" \
  -d '{"name":"Updated Name"}'
curl -X DELETE "http://localhost:3000/api/v1/projects/cuid_001"
```

---

## Test Suites

### List Suites

```
GET /suites?projectId=<project-id>
```

**Query Parameters:**

| Parameter | Type | Required | Description |
|---|---|---|---|
| `projectId` | `string` | Yes | Project ID |

**Response:**
```json
{
  "suites": [
    {
      "id": "cuid_suite_001",
      "projectId": "cuid_001",
      "name": "Refund Scenarios",
      "description": "Tests for refund processing flows",
      "sortOrder": 0,
      "createdAt": "2026-07-10T12:00:00.000Z"
    }
  ]
}
```

```bash
curl "http://localhost:3000/api/v1/suites?projectId=cuid_001"
```

### Create Suite

```
POST /suites
```

**Request Body:**
```json
{
  "projectId": "cuid_001",
  "name": "Refund Scenarios",
  "description": "Tests for refund processing flows"
}
```

```bash
curl -X POST http://localhost:3000/api/v1/suites \
  -H "Content-Type: application/json" \
  -d '{"projectId":"cuid_001","name":"Refund Scenarios"}'
```

### Get, Update, Delete Suite

```
GET    /suites/:id
PATCH  /suites/:id
DELETE /suites/:id
```

---

## Test Cases

### List Cases

```
GET /suites/:suiteId/cases
```

**Response:**
```json
{
  "cases": [
    {
      "id": "cuid_case_001",
      "suiteId": "cuid_suite_001",
      "name": "Full Refund Request",
      "description": "Customer requests a full refund within 30 days",
      "status": "ACTIVE",
      "agentConfig": {
        "provider": "openai",
        "model": "gpt-4o",
        "temperature": 0.7,
        "maxTokens": 4096,
        "systemPrompt": "You are a customer support agent."
      },
      "input": {
        "messages": [{"role": "user", "content": "I want to return my order for a full refund."}]
      },
      "tags": ["refund", "P0"],
      "sortOrder": 0
    }
  ]
}
```

```bash
curl "http://localhost:3000/api/v1/suites/cuid_suite_001/cases"
```

### Create Case

```
POST /suites/:suiteId/cases
```

**Request Body:**
```json
{
  "name": "Full Refund Request",
  "description": "Customer requests a full refund within 30 days",
  "agentConfig": {
    "provider": "openai",
    "model": "gpt-4o",
    "temperature": 0.3,
    "maxTokens": 4096,
    "systemPrompt": "You are a helpful customer support agent."
  },
  "input": {
    "messages": [{"role": "user", "content": "I want to return my order for a full refund."}]
  },
  "tags": ["refund", "P0"],
  "assertions": [
    {"type": "tool_called", "params": {"tool": "search_orders"}},
    {"type": "contains", "params": {"substring": "return policy"}}
  ],
  "evaluators": [
    {
      "type": "LLM_JUDGE",
      "config": {
        "provider": "openai",
        "model": "gpt-4o-mini",
        "dimensions": ["correctness", "completeness"]
      }
    }
  ]
}
```

| Field | Type | Required | Description |
|---|---|---|---|
| `name` | `string` | Yes | Test case name |
| `description` | `string` | No | Description |
| `agentConfig` | `object` | No | Agent configuration (provider, model, systemPrompt, temperature, maxTokens) |
| `input` | `object` | No | Input payload (messages array) |
| `tags` | `string[]` | No | Categorization tags |
| `assertions` | `array` | No | Array of `{ type, params }` assertion configs |
| `evaluators` | `array` | No | Array of `{ type, config }` evaluator configs |

### Manage Assertions

```
GET    /cases/:caseId/assertions
POST   /cases/:caseId/assertions
DELETE /cases/:caseId/assertions/:assertionId
```

```bash
curl -X POST "http://localhost:3000/api/v1/cases/cuid_case_001/assertions" \
  -H "Content-Type: application/json" \
  -d '{"type":"latency_lt","params":{"threshold":5000}}'
```

### Manage Evaluators

```
GET    /cases/:caseId/evaluators
POST   /cases/:caseId/evaluators
DELETE /cases/:caseId/evaluators/:evaluatorId
```

```bash
curl -X POST "http://localhost:3000/api/v1/cases/cuid_case_001/evaluators" \
  -H "Content-Type: application/json" \
  -d '{"type":"LLM_JUDGE","config":{"provider":"openai","model":"gpt-4o-mini","dimensions":["correctness"]}}'
```

---

## Runs

### List Runs

```
GET /runs
```

**Query Parameters:**

| Parameter | Type | Default | Description |
|---|---|---|---|
| `projectId` | `string` | — | Filter by project |
| `status` | `string` | — | Filter by status: `PENDING`, `RUNNING`, `PASSED`, `FAILED`, `ERROR`, `TIMEOUT`, `CANCELLED` |
| `search` | `string` | — | Search by name |
| `limit` | `number` | `50` | Results per page |
| `offset` | `number` | `0` | Pagination offset |
| `orderBy` | `string` | `createdAt` | Sort field: `createdAt`, `duration` |
| `orderDir` | `string` | `desc` | Sort direction: `asc`, `desc` |

```bash
curl "http://localhost:3000/api/v1/runs?projectId=cuid_001&status=FAILED&limit=10"
```

### Create Run

```
POST /runs
```

**Request Body:**
```json
{
  "projectId": "cuid_001",
  "testCaseId": "cuid_case_001",
  "name": "GPT-4o Baseline",
  "config": {
    "agent": {
      "provider": "openai",
      "model": "gpt-4o",
      "temperature": 0.3,
      "maxTokens": 4096,
      "systemPrompt": "You are a helpful customer support agent."
    },
    "input": {
      "messages": [{"role": "user", "content": "I want a refund for order #ORD-12345."}]
    },
    "options": {
      "timeout": 30000,
      "maxSteps": 10,
      "retries": 1,
      "concurrency": 1,
      "seed": 42
    }
  },
  "tags": ["baseline", "gpt-4o"]
}
```

**Response:** `201 Created`
```json
{
  "id": "cuid_run_001",
  "projectId": "cuid_001",
  "testCaseId": "cuid_case_001",
  "name": "GPT-4o Baseline",
  "status": "PENDING",
  "config": { "...": "..." },
  "tags": ["baseline", "gpt-4o"],
  "createdAt": "2026-07-10T12:00:00.000Z"
}
```

```bash
curl -X POST http://localhost:3000/api/v1/runs \
  -H "Content-Type: application/json" \
  -d '{"projectId":"cuid_001","testCaseId":"cuid_case_001","name":"GPT-4o Baseline","config":{"agent":{"provider":"openai","model":"gpt-4o"},"input":{"messages":[{"role":"user","content":"How do I get a refund?"}]}}}'
```

### Get Run

```
GET /runs/:id
```

**Response** includes the full run with metrics, trace, scores, and assertion results:

```json
{
  "id": "cuid_run_001",
  "name": "GPT-4o Baseline",
  "status": "PASSED",
  "config": { "...": "..." },
  "metrics": {
    "totalTokens": 2847,
    "promptTokens": 512,
    "completionTokens": 2335,
    "totalCost": 0.0089,
    "totalLatency": 2340,
    "firstTokenLatency": 450,
    "stepCount": 3,
    "llmCallCount": 2,
    "toolCallCount": 1,
    "toolSuccessCount": 1,
    "toolFailureCount": 0
  },
  "startedAt": "2026-07-10T12:00:01.000Z",
  "endedAt": "2026-07-10T12:00:03.340Z",
  "duration": 2340,
  "scores": [
    { "evaluator": "correctness", "score": 8.5, "maxScore": 10.0, "reason": "Accurate response", "judgeModel": "openai/gpt-4o-mini" }
  ],
  "assertionResults": [
    { "type": "contains", "status": "PASSED", "message": "Found \"refund\"" }
  ],
  "tags": ["baseline"]
}
```

### Get Run Trace

```
GET /runs/:id/trace
```

Returns the full execution trace with all `TraceStep` records:

```json
{
  "id": "trace_001",
  "runId": "cuid_run_001",
  "steps": [
    {
      "id": "step_001",
      "sequence": 1,
      "type": "LLM_CALL",
      "startedAt": "2026-07-10T12:00:01.000Z",
      "endedAt": "2026-07-10T12:00:02.500Z",
      "duration": 1500,
      "llmProvider": "openai",
      "llmModel": "gpt-4o",
      "llmRequest": { "messages": ["..."], "temperature": 0.3 },
      "llmResponse": { "content": "I'll help you...", "toolCalls": [{"name": "search_orders", "arguments": {"order_id": "ORD-12345"}}] },
      "promptTokens": 512,
      "completionTokens": 150,
      "totalTokens": 662,
      "cost": 0.0025,
      "status": "SUCCESS"
    },
    {
      "id": "step_002",
      "sequence": 2,
      "type": "TOOL_CALL",
      "startedAt": "2026-07-10T12:00:02.500Z",
      "endedAt": "2026-07-10T12:00:02.800Z",
      "duration": 300,
      "toolName": "search_orders",
      "toolRequest": { "arguments": {"order_id": "ORD-12345"} },
      "toolResponse": { "result": {"status": "delivered", "date": "2026-06-15"} },
      "status": "SUCCESS"
    }
  ]
}
```

### Get Run Scores

```
GET /runs/:id/scores
```

```json
{
  "scores": [
    { "evaluator": "correctness", "score": 8.5, "maxScore": 10.0, "reason": "..." },
    { "evaluator": "safety", "score": 9.5, "maxScore": 10.0, "reason": "..." }
  ]
}
```

### Evaluate Run

```
POST /runs/:id/evaluate
```

**Request Body:**
```json
{
  "rules": [
    {"type": "contains", "params": {"substring": "refund"}},
    {"type": "tokens_lt", "params": {"threshold": 4096}},
    {"type": "latency_lt", "params": {"threshold": 10000}}
  ],
  "dimensions": ["correctness", "completeness"],
  "expected": "The customer can return within 30 days for a full refund.",
  "force": true
}
```

| Field | Type | Required | Description |
|---|---|---|---|
| `rules` | `array` | No | Rule-based assertions to evaluate |
| `dimensions` | `string[]` | No | LLM judge dimensions to score |
| `expected` | `string` | No | Expected output (for rule evaluator) |
| `force` | `boolean` | No | Re-evaluate even if already evaluated |

```bash
curl -X POST "http://localhost:3000/api/v1/runs/cuid_run_001/evaluate" \
  -H "Content-Type: application/json" \
  -d '{"rules":[{"type":"contains","params":{"substring":"refund"}},{"type":"tokens_lt","params":{"threshold":4096}}],"dimensions":["correctness"],"force":true}'
```

### Replay Run

```
POST /runs/:id/replay
```

**Request Body:**
```json
{
  "mode": "cross_model",
  "model": "claude-sonnet-4-20250514",
  "provider": "anthropic",
  "temperature": 0.3,
  "seed": 42,
  "batchCount": 5,
  "parallel": true
}
```

| Field | Type | Required | Description |
|---|---|---|---|
| `mode` | `string` | Yes | `deterministic`, `cross_model`, `batch` |
| `model` | `string` | No | Override model |
| `provider` | `string` | No | Override provider |
| `temperature` | `number` | No | Override temperature |
| `seed` | `number` | No | Seed for deterministic replay |
| `batchCount` | `number` | No | Number of batch runs (default 5) |
| `parallel` | `boolean` | No | Run in parallel (default true) |

**Response:**
```json
{
  "replayRuns": [
    { "id": "cuid_replay_001", "name": "Replay of GPT-4o Baseline (#1)" },
    { "id": "cuid_replay_002", "name": "Replay of GPT-4o Baseline (#2)" }
  ]
}
```

```bash
curl -X POST "http://localhost:3000/api/v1/runs/cuid_run_001/replay" \
  -H "Content-Type: application/json" \
  -d '{"mode":"cross_model","model":"claude-sonnet-4-20250514","provider":"anthropic"}'
```

### Get Run Artifacts

```
GET /runs/:id/artifacts
```

Returns streaming artifacts produced during the run (e.g., intermediate outputs, logs).

### Delete Run

```
DELETE /runs/:id
```

---

## Compare

### Compare Two Runs

```
POST /compare
```

**Request Body:**
```json
{
  "runAId": "cuid_run_001",
  "runBId": "cuid_run_002"
}
```

```bash
curl -X POST http://localhost:3000/api/v1/compare \
  -H "Content-Type: application/json" \
  -d '{"runAId":"cuid_run_001","runBId":"cuid_run_002"}'
```

### Get Comparison

```
GET /compare/:id
```

---

## Snapshots

### List Snapshots

```
GET /projects/:projectId/snapshots
```

```bash
curl "http://localhost:3000/api/v1/projects/cuid_001/snapshots"
```

### Create Snapshot

```
POST /snapshots
```

**Request Body:**
```json
{
  "projectId": "cuid_001",
  "name": "v1.0 Baseline",
  "description": "Production baseline before prompt optimization",
  "type": "MANUAL",
  "runId": "cuid_run_001",
  "data": {
    "agent": { "name": "GPT-4o Baseline", "config": { "provider": "openai", "model": "gpt-4o" } },
    "prompt": { "system": "You are a helpful agent.", "variables": {} },
    "model": { "provider": "openai", "name": "gpt-4o", "temperature": 0.3, "maxTokens": 4096 },
    "tools": [],
    "context": { "messages": [{"role": "user", "content": "How do I get a refund?"}] },
    "input": { "messages": [{"role": "user", "content": "How do I get a refund?"}] }
  },
  "tags": ["baseline", "v1.0"]
}
```

| Field | Type | Required | Description |
|---|---|---|---|
| `projectId` | `string` | Yes | Project ID |
| `name` | `string` | Yes | Snapshot name |
| `description` | `string` | No | Human-readable description |
| `type` | `string` | Yes | `MANUAL`, `AUTO`, `CI` |
| `runId` | `string` | No | Associated run ID |
| `data` | `object` | Yes | Full snapshot payload (agent config, prompt, model, tools, context, input) |
| `tags` | `string[]` | No | Categorization tags |

```bash
curl -X POST http://localhost:3000/api/v1/snapshots \
  -H "Content-Type: application/json" \
  -d '{"projectId":"cuid_001","name":"v1.0 Baseline","type":"MANUAL","runId":"cuid_run_001","data":{"agent":{"config":{"provider":"openai","model":"gpt-4o"}},"prompt":{"system":"You are a helpful agent."}}}'
```

### Get Snapshot

```
GET /snapshots/:id
```

### Restore Snapshot

```
POST /snapshots/:id/restore
```

**Request Body (optional):**
```json
{
  "model": "gpt-5"
}
```

**Response:**
```json
{
  "runId": "cuid_run_003",
  "status": "PENDING"
}
```

```bash
curl -X POST "http://localhost:3000/api/v1/snapshots/cuid_snap_001/restore" \
  -H "Content-Type: application/json" \
  -d '{"model":"gpt-5"}'
```

### Delete Snapshot

```
DELETE /snapshots/:id
```

---

## Experiments

### List Experiments

```
GET /projects/:projectId/experiments
```

```bash
curl "http://localhost:3000/api/v1/projects/cuid_001/experiments"
```

### Create Experiment

```
POST /experiments
```

**Request Body:**
```json
{
  "projectId": "cuid_001",
  "name": "Prompt A vs Prompt B",
  "description": "Testing a more formal tone in system prompt",
  "config": {
    "variants": [
      {
        "name": "A",
        "config": {
          "systemPrompt": "You are a helpful customer support agent.",
          "model": "gpt-4o"
        }
      },
      {
        "name": "B",
        "config": {
          "systemPrompt": "You are a professional customer support agent. Maintain a formal, courteous tone.",
          "model": "gpt-4o"
        }
      }
    ],
    "runsPerVariant": 10,
    "testCaseIds": ["cuid_case_001", "cuid_case_002"]
  }
}
```

### Get Experiment

```
GET /experiments/:id
```

**Response** includes status, conclusion, and per-variant summary:

```json
{
  "id": "cuid_exp_001",
  "name": "Prompt A vs Prompt B",
  "status": "COMPLETED",
  "conclusion": "WINNER_A",
  "results": {
    "statisticalTest": "t-test",
    "pValue": 0.03,
    "effectSize": 0.52,
    "confidenceInterval": [0.1, 2.3]
  },
  "summary": {
    "A": { "runCount": 10, "passedCount": 9, "avgScore": 8.2, "avgDuration": 2340 },
    "B": { "runCount": 10, "passedCount": 7, "avgScore": 7.1, "avgDuration": 2890 }
  }
}
```

### Run Experiment

```
POST /experiments/:id/run
```

Creates all variant runs and starts execution.

```bash
curl -X POST "http://localhost:3000/api/v1/experiments/cuid_exp_001/run"
```

### Get Experiment Results

```
GET /experiments/:id/results
```

### Delete Experiment

```
DELETE /experiments/:id
```

---

## Datasets

### List Datasets

```
GET /projects/:projectId/datasets
```

```bash
curl "http://localhost:3000/api/v1/projects/cuid_001/datasets"
```

### Create Dataset

```
POST /datasets
```

**Request Body:**
```json
{
  "projectId": "cuid_001",
  "name": "Customer Queries v2",
  "description": "Curated set of common customer support queries",
  "format": "JSON",
  "version": "2.0.0",
  "tags": ["customer-support", "english"]
}
```

### Get Dataset

```
GET /datasets/:id
```

### Import Data

```
POST /datasets/:id/import
```

**Request Body:**
```json
{
  "format": "JSONL",
  "data": "{\"input\":{\"messages\":[{\"role\":\"user\",\"content\":\"How do I return?\"}]},\"expected\":{\"contains\":\"30-day\"}}\n{\"input\":{\"messages\":[{\"role\":\"user\",\"content\":\"Where is my order?\"}]},\"expected\":{\"contains\":\"tracking\"}}",
  "split": {
    "train": 0.8,
    "test": 0.2
  }
}
```

| Field | Type | Required | Description |
|---|---|---|---|
| `format` | `string` | Yes | `CSV`, `JSON`, `JSONL`, `MARKDOWN`, `CONVERSATION`, `CUSTOM` |
| `data` | `string` | Yes | Raw dataset content |
| `split` | `object` | No | Train/test/validation split ratios (must sum to 1.0) |

```bash
curl -X POST "http://localhost:3000/api/v1/datasets/cuid_ds_001/import" \
  -H "Content-Type: application/json" \
  -d '{"format":"JSONL","data":"{\"input\":{\"messages\":[{\"role\":\"user\",\"content\":\"test\"}]},\"expected\":{\"contains\":\"result\"}}"}'
```

### Export Data

```
GET /datasets/:id/export
```

**Query Parameters:**

| Parameter | Type | Default | Description |
|---|---|---|---|
| `format` | `string` | `JSONL` | Export format |
| `split` | `string` | — | Filter by split: `TRAIN`, `TEST`, `VALIDATION` |

### Validate Dataset

```
POST /datasets/:id/validate
```

Returns validation issues (missing columns, empty values, duplicates).

### Split Dataset

```
POST /datasets/:id/split
```

**Request Body:**
```json
{
  "train": 0.8,
  "test": 0.1,
  "validation": 0.1
}
```

### Delete Dataset

```
DELETE /datasets/:id
```

---

## Benchmarks

### Search Benchmarks

```
GET /benchmarks
```

**Query Parameters:**

| Parameter | Type | Description |
|---|---|---|
| `q` | `string` | Search query |
| `category` | `string` | Category filter |
| `difficulty` | `string` | `beginner`, `intermediate`, `advanced`, `expert` |
| `tags` | `string` | Comma-separated tags |
| `sort` | `string` | `popular`, `newest`, `highest-rated`, `most-downloaded` |
| `page` | `number` | Page number |
| `pageSize` | `number` | Results per page |

### Get Benchmark

```
GET /benchmarks/:slug
```

Returns benchmark metadata, test suites (with weights and test counts), and leaderboard.

### Install Benchmark

```
POST /benchmarks/:slug/install
```

```bash
curl -X POST "http://localhost:3000/api/v1/benchmarks/agentbench%2Fcustomer-support-v2/install"
```

### Run Benchmark

```
POST /benchmarks/:slug/run
```

```json
{
  "agentConfig": { "provider": "openai", "model": "gpt-4o" },
  "suite": "Refund Scenarios",
  "concurrency": 4,
  "timeout": 30000
}
```

### Get Leaderboard

```
GET /benchmarks/:slug/leaderboard
```

```json
{
  "leaderboard": [
    { "rank": 1, "agent": "SuperAgent v3", "author": "Alice", "overallScore": 9.4 },
    { "rank": 2, "agent": "MegaBot v2", "author": "Bob", "overallScore": 9.1 }
  ]
}
```

### Submit to Leaderboard

```
POST /benchmarks/:slug/leaderboard
```

```json
{
  "runId": "cuid_run_001",
  "agentName": "MyAgent v1",
  "author": "Jane",
  "version": "1.0.0"
}
```

### Publish Benchmark

```
POST /benchmarks
```

Requires a benchmark package (directory with schema and dataset files). Use `--dry-run` to validate first.

---

## Coverage

### Get Coverage

```
GET /projects/:projectId/coverage
```

```json
{
  "dimensions": {
    "prompt": { "covered": 42, "total": 60, "percentage": 70.0 },
    "workflow": { "covered": 8, "total": 10, "percentage": 80.0 },
    "tool": { "covered": 12, "total": 14, "percentage": 85.7 }
  },
  "overall": 78.6
}
```

### Get Coverage Trend

```
GET /projects/:projectId/coverage/trend
```

Returns time-series coverage data for trend visualization.

---

## Reports

### Generate Report

```
GET /reports
```

**Query Parameters:**

| Parameter | Type | Description |
|---|---|---|
| `runId` | `string` | Single-run report |
| `projectId` | `string` | Multi-run project report |
| `format` | `string` | `json`, `markdown`, `html`, `junit` |

```bash
curl "http://localhost:3000/api/v1/reports?runId=cuid_run_001&format=markdown" -o report.md
curl "http://localhost:3000/api/v1/reports?projectId=cuid_001&format=junit" -o report.xml
```

---

## Webhooks

### Receive CI/CD Webhook

```
POST /webhooks
```

**Headers:**

| Header | Description |
|---|---|
| `X-Webhook-Source` | `github`, `gitlab`, `ci` |
| `X-Webhook-Secret` | Shared secret for verification |

```bash
curl -X POST http://localhost:3000/api/v1/webhooks \
  -H "Content-Type: application/json" \
  -H "X-Webhook-Source: github" \
  -H "X-Webhook-Secret: my-secret" \
  -d '{"action":"opened","pull_request":{"number":42},"repository":{"full_name":"my-org/my-agent"}}'
```

---

## Authentication

### Sign Up

```
POST /auth/sign-up
```

```json
{
  "email": "user@example.com",
  "password": "securePassword123",
  "name": "Jane Doe"
}
```

### Sign In

```
POST /auth/sign-in
```

```json
{
  "email": "user@example.com",
  "password": "securePassword123"
}
```

**Response:**
```json
{
  "user": { "id": "user_001", "email": "user@example.com", "name": "Jane Doe" },
  "token": "eyJhbGciOiJIUzI1NiIs..."
}
```

### Sign Out

```
POST /auth/sign-out
```

### Refresh Token

```
POST /auth/refresh
```

---

## API Keys

### List API Keys

```
GET /api-keys
```

### Create API Key

```
POST /api-keys
```

```json
{
  "name": "CI Pipeline",
  "scopes": ["READ", "WRITE"],
  "projectId": "cuid_001"
}
```

**Response:**
```json
{
  "id": "key_001",
  "name": "CI Pipeline",
  "key": "ab-xxxxxxxxxxxxxxxxxxxxxxxx",
  "prefix": "ab-xxxxxx",
  "scopes": ["READ", "WRITE"]
}
```

### Revoke API Key

```
DELETE /api-keys/:id
```

---

## Dashboard

### Get Dashboard Stats

```
GET /dashboard/stats
```

Returns aggregated statistics: total runs, pass rate, average latency, total cost, active projects.

### Get Trends

```
GET /dashboard/trends
```

Returns time-series data for dashboard charts.

### Get Per-Model Stats

```
GET /dashboard/models
```

Returns per-model breakdown of runs, pass rates, and costs.

---

## Common Pitfalls

### Missing projectId on suites endpoint

The `/suites` endpoint **requires** the `projectId` query parameter. Omitting it returns a 400 error.

```bash
# WRONG
curl "http://localhost:3000/api/v1/suites"

# CORRECT
curl "http://localhost:3000/api/v1/suites?projectId=cuid_001"
```

### Run status is PENDING after creation

Creating a run via `POST /runs` returns a `PENDING` status. The run is processed asynchronously. Poll `GET /runs/:id` to check for completion (status changes to `PASSED`, `FAILED`, `ERROR`, or `TIMEOUT`).

### evaluate requires the run to be completed

Calling `POST /runs/:id/evaluate` on a `PENDING` or `RUNNING` run will return an error. Wait for the run to complete first.

### Snapshot data structure

The `data` field in snapshot creation must follow the expected structure with `agent`, `prompt`, `model`, `tools`, `context`, `input`, and `options` keys. Malformed data will be accepted by the API but may cause errors on restore.

### Dataset import size limits

Large dataset imports may timeout. For datasets over 10MB, use chunked uploads via the CLI (`agentbench dataset`) or split the data into multiple API calls.

---

## Next Steps

- [CLI Reference](./cli.md) -- Interactive command-line interface
- [Configuration Reference](./config.md) -- Configure via `agentbench.config.ts`
- [Assertion DSL Reference](./assertion-dsl.md) -- Write assertions in TypeScript
- [Model Migration Testing](../cookbook/model-migration-testing.md) -- Use the replay API for safe model changes
- [A/B Testing AI Agents](../cookbook/agent-ab-testing.md) -- Design experiments with the experiments API
