# API 参考手册

完整的 REST API 参考，所有端点均基于 `/api/v1`。

## 通用约定

### 基础 URL
```
http://localhost:3000/api/v1
```

### 请求格式
- `Content-Type: application/json`
- 所有 POST/PATCH 请求体使用 JSON

### 响应格式

**成功响应：**
```json
{ "id": "xxx", "name": "example" }
```

**列表响应：**
```json
{ "projects": [...], "total": 10, "limit": 50, "offset": 0 }
```

**错误响应：**
```json
{ "error": "Validation failed", "details": {...} }
```

### HTTP 状态码

| 状态码 | 说明 |
|:--:|------|
| 200 | 成功 |
| 201 | 创建成功 |
| 400 | 请求参数错误 |
| 401 | 未认证 |
| 403 | 无权限 |
| 404 | 资源不存在 |
| 500 | 服务器内部错误 |

---

## Projects

### `GET /projects`

查询项目列表。

| 参数 | 类型 | 说明 |
|------|------|------|
| `search` | string | 按名称搜索（模糊匹配） |
| `limit` | number | 返回数量（默认 50，最大 100） |
| `offset` | number | 偏移量（默认 0） |

```bash
curl "http://localhost:3000/api/v1/projects?limit=10"
```

### `POST /projects`

创建新项目。

```bash
curl -X POST http://localhost:3000/api/v1/projects \
  -H "Content-Type: application/json" \
  -d '{"name":"客服 Agent","slug":"customer-service","description":"处理客户咨询"}'
```

---

## Test Suites

### `GET /suites`

查询测试套件列表。

| 参数 | 类型 | 说明 |
|------|------|------|
| `projectId` | string | **必填**，项目 ID |

```bash
curl "http://localhost:3000/api/v1/suites?projectId=<project-id>"
```

### `POST /suites`

创建测试套件。

```bash
curl -X POST http://localhost:3000/api/v1/suites \
  -H "Content-Type: application/json" \
  -d '{"projectId":"<project-id>","name":"退款测试套件"}'
```

### `GET/PATCH/DELETE /suites/:id`

获取、更新或删除测试套件。

```bash
curl "http://localhost:3000/api/v1/suites/<suite-id>"
curl -X PATCH "http://localhost:3000/api/v1/suites/<suite-id>" \
  -H "Content-Type: application/json" -d '{"name":"新名称"}'
curl -X DELETE "http://localhost:3000/api/v1/suites/<suite-id>"
```

---

## Test Cases

### `GET/POST /suites/:id/cases`

查询或创建测试用例。

**创建请求体：**

```json
{
  "name": "退款查询",
  "description": "测试退款查询功能",
  "agentConfig": {
    "provider": "openai",
    "model": "gpt-4o",
    "temperature": 0.7,
    "maxTokens": 4096,
    "systemPrompt": "你是一个客服 Agent"
  },
  "input": {
    "messages": [{"role": "user", "content": "如何退款？"}]
  },
  "tags": ["退款", "P0"],
  "assertions": [
    {"type": "tool_called", "params": {"tool": "search_docs"}},
    {"type": "contains", "params": {"substring": "30天"}},
    {"type": "tokens_lt", "params": {"threshold": 4096}}
  ],
  "evaluators": [
    {"type": "RULE_BASED", "config": {"rules": [{"type": "contains", "params": {"substring": "退款"}}]}},
    {"type": "LLM_JUDGE", "config": {"provider": "openai", "model": "gpt-4o", "dimensions": ["correctness", "completeness"]}}
  ]
}
```

### `GET/PATCH/DELETE /cases/:id`

获取、更新或删除测试用例。

---

## Assertions & Evaluators

### `GET/POST/DELETE /cases/:id/assertions`

管理测试用例下的断言。

```bash
curl -X POST "http://localhost:3000/api/v1/cases/<case-id>/assertions" \
  -H "Content-Type: application/json" \
  -d '{"type":"latency_lt","params":{"threshold":5000}}'
```

### `GET/POST/DELETE /cases/:id/evaluators`

管理测试用例下的评估器。

```bash
curl -X POST "http://localhost:3000/api/v1/cases/<case-id>/evaluators" \
  -H "Content-Type: application/json" \
  -d '{"type":"LLM_JUDGE","config":{"provider":"openai","model":"gpt-4o","dimensions":["correctness"]}}'
```

---

## Runs

### `GET /runs`

查询 Run 列表。

| 参数 | 类型 | 说明 |
|------|------|------|
| `projectId` | string | 项目 ID |
| `status` | string | 状态过滤（`PASSED`/`FAILED`/`ERROR`） |
| `search` | string | 按名称搜索 |
| `limit` | number | 返回数量（默认 50） |
| `offset` | number | 偏移量 |
| `orderBy` | string | 排序字段（`createdAt`/`duration`） |
| `orderDir` | string | 排序方向（`asc`/`desc`） |

### `POST /runs`

创建 Run。

```bash
curl -X POST http://localhost:3000/api/v1/runs \
  -H "Content-Type: application/json" \
  -d '{
    "projectId":"<project-id>",
    "testCaseId":"<case-id>",
    "name":"GPT-4o 基线",
    "config":{
      "agent":{"provider":"openai","model":"gpt-4o","temperature":0.7,"maxTokens":4096,"systemPrompt":"你是客服"},
      "input":{"messages":[{"role":"user","content":"退款流程"}]},
      "options":{"timeout":30000,"maxSteps":10,"retries":1,"concurrency":1,"seed":42}
    },
    "tags":["baseline","gpt-4o"]
  }'
```

### `GET/PATCH/DELETE /runs/:id`

获取、更新或删除 Run。

### `POST /runs/:id/evaluate`

评估一个 Run。

```bash
curl -X POST "http://localhost:3000/api/v1/runs/<run-id>/evaluate" \
  -H "Content-Type: application/json" \
  -d '{
    "rules":[
      {"type":"contains","params":{"substring":"退款"}},
      {"type":"tokens_lt","params":{"threshold":4096}},
      {"type":"latency_lt","params":{"threshold":10000}}
    ],
    "dimensions":["correctness"],
    "expected":"用户可以在30天内退款",
    "force":true
  }'
```

### `POST /runs/:id/replay`

回放一个 Run。

```bash
curl -X POST "http://localhost:3000/api/v1/runs/<run-id>/replay" \
  -H "Content-Type: application/json" \
  -d '{"mode":"cross_model","model":"claude-sonnet-5","batchCount":5}'
```

---

## Compare

### `POST /compare`

对比两个 Run。

```bash
curl -X POST http://localhost:3000/api/v1/compare \
  -H "Content-Type: application/json" \
  -d '{"runAId":"<run-a-id>","runBId":"<run-b-id>"}'
```

---

## Snapshots

### `GET/POST /projects/:id/snapshots`

查询或创建快照。

```bash
curl -X POST "http://localhost:3000/api/v1/projects/<project-id>/snapshots" \
  -H "Content-Type: application/json" \
  -d '{
    "name":"基线快照",
    "type":"MANUAL",
    "runId":"<run-id>",
    "data":{...}
  }'
```

### `GET/POST/DELETE /snapshots/:id`

获取、恢复或删除快照。POST 会从快照创建新 Run。

---

## Experiments

### `GET/POST /projects/:id/experiments`

查询或创建实验。

```bash
curl -X POST "http://localhost:3000/api/v1/projects/<project-id>/experiments" \
  -H "Content-Type: application/json" \
  -d '{
    "name":"Prompt A vs B",
    "variantA":{"systemPrompt":"你是一个乐于助人的客服"},
    "variantB":{"systemPrompt":"你是一个专业的客服，语气正式"},
    "runsPerVariant":10
  }'
```

### `GET/POST/DELETE /experiments/:id`

获取、执行或删除实验。POST 会创建实验所需的 Run。

---

## Coverage

### `GET /projects/:id/coverage`

获取覆盖率报告。

```bash
curl "http://localhost:3000/api/v1/projects/<project-id>/coverage"
```

---

## Datasets

### `GET/POST /projects/:id/datasets`

查询数据集或创建/导入数据。

```bash
# 导入 JSONL
curl -X POST "http://localhost:3000/api/v1/projects/<project-id>/datasets" \
  -H "Content-Type: application/json" \
  -d '{"action":"import","format":"JSONL","data":"...","split":{"train":0.8,"test":0.2}}'
```

### `DELETE /projects/:id/datasets?id=<dataset-id>`

删除数据集。

---

## Reports

### `GET /reports`

生成并下载报告。

| 参数 | 类型 | 说明 |
|------|------|------|
| `runId` | string | Run ID（单报告） |
| `projectId` | string | 项目 ID（批量报告） |
| `format` | string | 格式：`json`/`markdown`/`html`/`junit` |

```bash
curl "http://localhost:3000/api/v1/reports?runId=<run-id>&format=markdown" -o report.md
curl "http://localhost:3000/api/v1/reports?runId=<run-id>&format=junit" -o report.xml
```

---

## Webhooks

### `POST /webhooks`

接收 CI/CD Webhook。

```bash
curl -X POST http://localhost:3000/api/v1/webhooks \
  -H "Content-Type: application/json" \
  -H "X-Webhook-Source: github" \
  -H "X-Webhook-Secret: <secret>" \
  -d '{"action":"opened","pull_request":{"number":42},"repository":{"full_name":"my-org/my-agent"}}'
```

---

→ [返回文档中心](INDEX.md)
