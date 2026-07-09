# 术语表（Glossary）

## A

**Agent（智能体）**
使用 LLM 作为核心推理引擎，能够调用工具、自主决策、执行多步任务的 AI 程序。

**AgentConfig（Agent 配置）**
定义 Agent 运行参数的配置对象，包括 provider、model、temperature、maxTokens、systemPrompt、tools。

**Assertion（断言）**
对 Agent Run 结果的条件判断。例如：某个工具被调用、输出包含特定文本、Token 用量低于阈值。

**Assertion DSL（断言领域特定语言）**
AgentBench 提供的链式断言 API：`expect(run).tool("search").toBeCalled().run()`。

**AssertionResult（断言结果）**
断言执行后的结果，包含 status（passed/failed）、expected、actual 和 message。

---

## C

**Coverage（覆盖率）**
衡量 Agent 测试覆盖程度的指标，包含 4 个维度：Prompt 变量覆盖、Workflow 路径覆盖、Tool 调用覆盖、Edge Case 覆盖。

**CostCalculator（费用计算器）**
根据模型定价和 Token 用量计算 USD 费用的工具。内置 15+ 模型定价表。

---

## D

**Dataset（数据集）**
一组结构化的输入/期望输出对，用于批量测试 Agent。支持 CSV、JSON、JSONL 格式导入。

**Diff Engine（对比引擎）**
对比两个 Run 的差异，包括 Text Diff（Prompt/Output）、Metric Diff（Tokens/Cost/Latency）、Trace Diff（执行路径）和 Score Diff。

**Deterministic Replay（确定性回放）**
使用相同 seed 和配置回放 Agent Run，验证结果是否可复现。

---

## E

**Evaluator（评估器）**
对 Agent Run 结果打分的组件。分为 Rule-Based Evaluator（规则评估器）和 LLM Judge（LLM 评判者）。

**Experiment（实验）**
A/B 对比测试，对比两个 Variant（不同 Prompt/Model/Config）的表现，使用统计方法（t-test、bootstrap）判断是否显著。

**Execution Trace（执行 Trace）**
Agent 执行过程的完整记录，包含每一步（LLM 调用、工具调用、响应）的详细信息、耗时和 Token 用量。

---

## H

**Hybrid Judge（混合评判者）**
组合规则评估器和 LLM Judge，支持 rule_first、llm_first 和 parallel 三种策略。

---

## J

**JudgePool（评判者池）**
多个评判者组成的池，对同一 Run 独立打分后投票，获得更可靠的评估结果。支持 majority、unanimous 和 weighted 投票策略。

**JUnit XML**
CI/CD 集成常用的测试报告格式。AgentBench 支持将评估结果导出为 JUnit XML。

---

## L

**LLM Judge（LLM 评判者）**
使用一个 LLM（如 GPT-4o）来评判另一个 Agent 的输出质量。支持 8 个维度：correctness、faithfulness、safety、relevance、completeness、reasoning、conciseness、tool_usage。

---

## M

**MCP（Model Context Protocol）**
Anthropic 提出的模型上下文协议，定义了 LLM 与外部工具/资源的交互标准。

**Metrics（指标）**
Run 的量化指标，包括 totalTokens、promptTokens、completionTokens、totalCost、totalLatency、stepCount、llmCallCount、toolCallCount。

---

## P

**Project（项目）**
AgentBench 的顶级组织单元，对应你要测试的一个 Agent。

---

## R

**Regression（回归）**
Agent 行为在变更后变差的现象。AgentBench 自动检测 Score 下降、Token 增加、延迟增加、费用增加等回归。

**Replay（回放）**
重现历史 Run，支持三种模式：确定性回放（同 seed）、跨模型回放（不同模型）、批量回放（N 次统计）。

**Rule Evaluator（规则评估器）**
基于确定规则的评估器，包括 exact_match、contains、regex_match、json_schema、tool_called 等 14 种类型。

**Run（运行）**
Agent 按给定配置执行一次的结果记录，包含配置、Trace、Metrics、Scores 和 AssertionResults。

**Runner（执行器）**
核心引擎中负责执行 Agent 并捕获 Trace 的组件。

---

## S

**Score（评分）**
评估器对 Run 结果的评分，包含 evaluator（评估维度）、score（分数）、maxScore（满分）、reasoning（理由）。

**Snapshot（快照）**
Agent 完整状态的副本，包括 Prompt、Model、Tools、Context、Options。可用于回放和对比。

**Storage Adapter（存储适配器）**
抽象存储层接口，支持 PostgreSQL（生产）和 Memory（测试）两种实现。

---

## T

**TestCase（测试用例）**
定义一个 Agent 的配置、输入、断言和评估器的最小测试单元。

**TestSuite（测试套件）**
一组相关 TestCase 的集合。

**TokenCounter（Token 计数器）**
估算文本 Token 数量的工具。基于字符/Token 比率的启发式算法，按模型系列区分。

**TraceStep（Trace 步骤）**
Trace 中的单个步骤，包含 type（llm_call/tool_call/response/error）、timing、request/response 数据和 cost。

**Tracer（追踪器）**
核心引擎中负责拦截 LLM SDK 调用并生成 TraceStep 的组件。

---

## V

**Variant（变体）**
A/B 实验中的一组配置（如 Prompt A vs Prompt B）。每个 Variant 独立运行 N 次。

---

→ [返回文档中心](INDEX.md)
