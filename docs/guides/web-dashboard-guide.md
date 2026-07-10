# Web Dashboard 使用指南

**目标用户：** 第一次使用 AgentBench 网页端的新手
**阅读时间：** 10 分钟
**前置知识：** 无

---

## 一句话理解 AgentBench

AgentBench 和 Jest 一样，是一个**测试框架**。区别在于：Jest 测代码，AgentBench 测 AI Agent。

它有两个部分：

| 部分 | 作用 | 类比 |
|------|------|------|
| **Web Dashboard** | 管理测试、查看结果 | 像 Jest 的 HTML Report |
| **CLI 命令行** | 执行测试 | 像 `jest` 或 `npx jest` |

**Web 负责「看」，CLI 负责「跑」。** 你刚才在 Dashboard 里创建的 Test Suite（测试套件）只是**定义了要测什么**，还没有真正执行。

---

## Dashboard 每个页面是干什么的

### 首页：Dashboard
项目总览，展示：
- **Pass Rate** — 已完成的测试中，通过的百分比
- **Test Suites** — 你创建了多少个测试套件
- **Total Runs** — 总共执行过多少次测试
- **Avg Cost** — 平均每次测试花多少钱

数字从哪来？从 CLI 执行 `agentbench test` 后的结果中来。

### Tests 页面
**创建测试套件**的地方。一个 Test Suite 包含多个 Test Case：

```
Test Suite: "Customer Support"
  ├── Test Case 1: 问候测试
  │   输入: "Hello, who are you?"
  │   预期: 回复包含 "assistant"
  │
  ├── Test Case 2: 退款测试
  │   输入: "What is your refund policy?"
  │   预期: 回复包含 "refund, policy"
  │
  └── Test Case 3: 升级测试
      输入: "I want to speak to a manager!"
      预期: 回复包含 "escalate, human"
```

**创建 Test Suite = 写好测试用例的定义。** 这时候还没有真正执行。

### Runs 页面
**测试执行历史**。每次 `agentbench test` 执行后，这里就会多一条记录。

Run 的状态：
- **PENDING** — 刚创建，还没执行（你在 Dashboard 里看到的全是这个）
- **RUNNING** — 正在执行中
- **PASSED** — 所有断言通过 ✅
- **FAILED** — 有断言失败 ❌

### Compare 页面
对比两个 Run 的差异。比如：
- 改了 Prompt 后，评分是涨了还是跌了？
- 换了模型后，Token 用量是多了还是少了？

### Datasets 页面
管理测试数据集。可以导入 CSV/JSON/JSONL 文件，批量管理测试输入。

### Experiments 页面
A/B 测试。对比两个 Prompt、两个模型的表现差异。

### Snapshots 页面
快照管理。记录一次 Agent 执行的完整状态，用于零成本的回归测试。

### Coverage 页面
4D 覆盖率分析：Prompt 覆盖率、Workflow 覆盖率、Tool 覆盖率、Edge Case 覆盖率。

---

## 新手上手三步走

### 第一步：在 Web 创建 Test Suite

1. 打开 http://localhost:3000/tests
2. 点 **New Suite**
3. 填写：
   - Suite Name: `My First Test`
   - Project: 选 `E2E Final Test`
   - 添加一个 Test Case:
     - Name: `Greeting`
     - Input: `{"messages": [{"role": "user", "content": "Hello"}]}`
     - Expected Keywords: `hello, assistant`
4. 点 **Create Test Suite**

### 第二步：用 CLI 执行测试

```bash
# 回到项目根目录
cd /你的agentbench项目

# 执行测试（需要有 OpenAI API Key）
agentbench test
```

CLI 会读取你的 Test Suite，调用 LLM，检查断言，然后把结果写入数据库。

### 第三步：回到 Web 看结果

刷新 http://localhost:3000/runs，你会看到一条新的 Run，状态变成 **PASSED** 或 **FAILED**。点进去可以看到：
- 每个断言的结果
- Token 用量和费用
- 执行耗时

---

## 常见困惑解答

### Q: 为什么我创建的 Test Suite 在 Runs 里看不到？
A: 创建 Test Suite ≠ 执行测试。Test Suite 是「定义」，Run 是「执行」。你需要通过 CLI 运行 `agentbench test` 来创建 Run。

### Q: 为什么所有 Run 都显示 PENDING？
A: PENDING 意味着「已创建但未执行」。这些 Run 是种子数据或通过 API 创建的记录，没有真正调用 LLM。

### Q: 为什么数据显示 0 或 Unknown？
A: 因为 Run 是 PENDING 状态，没有实际的执行数据（Token、耗时、评分）。

### Q: Dashboard 和 CLI 必须一起用吗？
A: 是的。Web Dashboard 是管理端（创建测试、查看结果），CLI 是执行端（真正跑测试）。这就像 Jest 的配置文件（jest.config.js）和 `jest` 命令的关系。

### Q: 可以不用 CLI，直接在 Web 里跑测试吗？
A: 目前不行。Web Dashboard 不执行 Agent 代码——这需要你的 Agent 运行环境和 API Key。CLI 在你的机器上执行，调用 LLM，然后把结果写入数据库。
