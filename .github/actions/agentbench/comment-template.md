## {status_emoji} AgentBench CI Results

<!--
  This template is used to generate PR comments from the AgentBench composite action
  and the agentbench-ci.yml workflow.

  Template variables are replaced at runtime with actual test results.
  Status emoji: :white_check_mark: (all pass) or :x: (failures present)
-->

{regression_alert}

### :bar_chart: Summary

| Metric | Value | Description |
|--------|-------|-------------|
| :star: **Score** | `{score}` | Overall agent quality score (0-100) |
| :chart_with_upwards_trend: **Pass Rate** | `{pass_rate}` | Percentage of tests that passed |
| :package: **Total Tests** | {total} | Total number of tests executed |
| :white_check_mark: **Passed** | {passed} | Tests that completed successfully |
| :x: **Failed** | {failed} | Tests that did not meet expectations |
| :fast_forward: **Skipped** | {skipped} | Tests skipped due to filters or constraints |
| :stopwatch: **Avg Latency** | `{avg_latency}` ms | Average agent response time per interaction |
| :1234: **Total Tokens** | `{total_tokens}` | Total LLM tokens consumed across all tests |
| :moneybag: **Est. Cost** | `{estimated_cost}` | Estimated API cost for this run |

---

### Regression Detection

<!--
  REGRESSION ALERT — shown when has_regression > 0
  Uses a red GitHub alert block with a warning banner.
-->

> [!CAUTION]
> ### :rotating_light: Regression Detected
>
> One or more tests that **previously passed** are now **failing**. This may indicate
> a breaking change in the agent logic, model behavior, or tool implementation.
>
> | Metric | Before | After | Delta |
> |--------|--------|-------|-------|
> | Pass Rate | {baseline_pass_rate} | {pass_rate} | {pass_rate_delta} |
> | Score | {baseline_score} | {score} | {score_delta} |
> | Failing Tests | {baseline_failed} | {failed} | {failed_delta} |
>
> **Affected tests:**
> {regression_test_list}
>
> ---
> **Recommended actions:**
> 1. Review the [CI run logs]({run_url}) for detailed error traces
> 2. Check if the model or prompt was recently changed
> 3. Run `agentbench test --project {project} --grep "{regression_grep}"` locally to reproduce
> 4. If the change is intentional, update the baseline snapshots:
>    ```bash
>    agentbench snapshot update --project {project}
>    ```

<!--
  NO REGRESSION — shown when has_regression == 0 and all tests pass
-->

> [!NOTE]
> ### :tada: No Regressions Detected
>
> All {total} tests passed successfully with no regressions. The agent's behavior
> is consistent with the established baselines.

<!--
  NO REGRESSION BUT FAILURES — shown when has_regression == 0 but some tests fail
  (new test failures that were not previously passing)
-->

> [!WARNING]
> ### :warning: Test Failures (Non-Regression)
>
> {failed} test(s) failed, but these are **not regressions** (they were not previously
> passing). This may be expected for newly added test cases or environments.
> Review the details below to determine if these failures require action.

---

### :x: Failing Tests

<!--
  FAILING TESTS SECTION — always visible when failures exist.
  Uses an open <details> block so failures are immediately visible.
-->

<details open>
<summary><strong>{failed} failing test(s)</strong></summary>

| Suite | Test | Duration | Status | Error |
|-------|------|----------|--------|-------|
<!--
  Each row: | `suite_name` | `test_name` | `{duration}ms` | :x: | error message |
-->

{failing_test_rows}

</details>

#### Failure Details

<!--
  Per-failure details with error messages, stack traces, and diff snippets.
-->

{failure_details}

---

### :white_check_mark: Passing Tests

<!--
  PASSING TESTS SECTION — collapsed by default to keep the comment focused on failures.
-->

<details>
<summary><strong>{passed} passing test(s)</strong></summary>

{passing_test_list}

</details>

---

### :bar_chart: Coverage

<!--
  OPTIONAL: Coverage section shown when coverage data is available.
-->

{coverage_section}

---

### :link: Links

| Resource | URL |
|----------|-----|
| :arrow_forward: CI Run | [{run_url_title}]({run_url}) |
| :package: Report Artifact | [Download agentbench-report-{run_id}.zip]({artifact_url}) |
| :book: AgentBench Docs | [Documentation](https://github.com/{repo_owner}/{repo_name}#readme) |
| :test_tube: Test Configuration | [`{config_file}`]({config_url}) |

---

### :robot: AgentBench

<p align="right">
  <sub>
    Powered by <a href="https://github.com/{repo_owner}/{repo_name}"><strong>AgentBench</strong></a> —
    The Regression Testing Framework for AI Agents.
    <br>
    Commit <code>{short_sha}</code> · Run <code>#{run_number}</code> · Attempt <code>{run_attempt}</code>
  </sub>
</p>

<!-- agentbench-ci-comment -->
